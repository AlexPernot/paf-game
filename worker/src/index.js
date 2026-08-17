import { parseCsv, csvEscape, rowsToObjects } from './csv.js';
import { extractPlayerCsvs } from './zip.js';
import { createTmdbClient } from './tmdb.js';
import { buildGameRows, enrichRows, sortByPopularity } from './pipeline.js';

function allowedOrigins(env) {
    return (env.ALLOWED_ORIGIN || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
}

function corsHeaders(env, request) {
    const origins = allowedOrigins(env);
    const requestOrigin = request?.headers.get('Origin');
    const allowOrigin = origins.length === 0
        ? '*'
        : (requestOrigin && origins.includes(requestOrigin) ? requestOrigin : origins[0]);

    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        Vary: 'Origin',
    };
}

async function serveGameCsv(env, request) {
    const object = await env.GAME_BUCKET.get('game.csv');
    if (!object) {
        return jsonResponse({ error: 'game.csv not found' }, 404, env, request);
    }

    return new Response(object.body, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            ...corsHeaders(env, request),
        },
    });
}

function jsonResponse(body, status, env, request) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
    });
}

function readPlayerSubmissions(formData) {
    const players = [];
    const errors = [];

    for (let i = 0; formData.has(`player-${i}-name`) || formData.has(`player-${i}-archive`); i++) {
        const name = formData.get(`player-${i}-name`);
        const archive = formData.get(`player-${i}-archive`);

        if (typeof name !== 'string' || !name.trim()) {
            errors.push(`player-${i}: missing name`);
            continue;
        }
        if (!(archive instanceof File) || archive.size === 0) {
            errors.push(`player-${i}: missing or empty archive`);
            continue;
        }

        players.push({ name: name.trim().slice(0, 10), archive });
    }

    return { players, errors };
}

function intersectWatchedMovies(playerData) {
    let commonNames = null;
    for (const { watched } of playerData.values()) {
        const names = new Set(watched.map((w) => w.Name));
        commonNames = commonNames === null ? names : new Set([...commonNames].filter((name) => names.has(name)));
    }
    commonNames ??= new Set();

    for (const data of playerData.values()) {
        data.watched = data.watched.filter((w) => commonNames.has(w.Name));
        data.ratings = data.ratings.filter((r) => commonNames.has(r.Name));
    }
}

async function buildPlayerData(players) {
    const playerData = new Map();
    const errors = [];

    for (const { name, archive } of players) {
        try {
            const bytes = new Uint8Array(await archive.arrayBuffer());
            const { watchedCsv, ratingsCsv } = extractPlayerCsvs(bytes);
            playerData.set(name, {
                watched: rowsToObjects(parseCsv(watchedCsv)),
                ratings: rowsToObjects(parseCsv(ratingsCsv)),
            });
        } catch (error) {
            errors.push(`${name}: ${error.message}`);
        }
    }

    // On ne garde que les films vus par tous les joueurs le plus tôt possible,
    // pour éviter d'enrichir/traiter des films qui ne seront jamais utilisés.
    if (errors.length === 0) {
        intersectWatchedMovies(playerData);
    }

    return { playerData, errors };
}

function toCsvText(header, rows) {
    return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n') + '\n';
}

function streamGameGeneration({ playerData, env, ctx, signal, request }) {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    async function send(event) {
        try {
            await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
            // Le client a coupé la connexion (ex: annulation) : plus personne pour lire ces events.
        }
    }

    async function run() {
        try {
            const collected = buildGameRows(playerData);
            const tmdbClient = createTmdbClient({ apiKey: env.TMDB_API_KEY });
            const progressMessage = 'Récupération des informations sur les films'

            await send({
                type: 'progress',
                stage: 'enrich',
                done: 0,
                total: collected.rows.length,
                message: `${progressMessage} (0/${collected.rows.length})...`,
            });

            const enriched = await enrichRows(collected.header, collected.rows, tmdbClient, (done, total) => send({
                type: 'progress',
                stage: 'enrich',
                done,
                total,
                message: `${progressMessage} (${done}/${total})...`,
            }), signal);

            if (signal.aborted) return;

            const { header, rows } = sortByPopularity(enriched.header, enriched.rows);
            const csvText = toCsvText(header, rows);

            await send({ type: 'progress', stage: 'store', message: 'Sauvegarde du résultat...' });

            try {
                await env.GAME_BUCKET.put('game.csv', csvText, {
                    httpMetadata: { contentType: 'text/csv; charset=utf-8' },
                });
            } catch {
                await send({ type: 'error', error: 'Failed to store result' });
                return;
            }

            await send({ type: 'done', movieCount: rows.length });
        } catch (error) {
            console.log(error);
            await send({ type: 'error', error: 'Internal error' });
        } finally {
            await writer.close().catch(() => {});
        }
    }

    ctx.waitUntil(run());

    return new Response(readable, {
        status: 200,
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            ...corsHeaders(env, request),
        },
    });
}

export default {
    async fetch(request, env, ctx) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders(env, request) });
        }
        if (request.method === 'GET') {
            return serveGameCsv(env, request);
        }
        if (request.method !== 'POST') {
            return jsonResponse({ error: 'Method not allowed' }, 405, env, request);
        }

        try {
            let formData;
            try {
                formData = await request.formData();
            } catch {
                return jsonResponse({ error: 'Invalid form data' }, 400, env, request);
            }

            const { players, errors: validationErrors } = readPlayerSubmissions(formData);
            if (validationErrors.length > 0) {
                return jsonResponse({ error: 'Validation failed', details: validationErrors }, 400, env, request);
            }
            if (players.length === 0) {
                return jsonResponse({ error: 'No valid players submitted' }, 400, env, request);
            }

            const { playerData, errors: archiveErrors } = await buildPlayerData(players);
            if (archiveErrors.length > 0) {
                return jsonResponse({ error: 'Invalid archives', details: archiveErrors }, 400, env, request);
            }

            if (!env.TMDB_API_KEY) {
                return jsonResponse({ error: 'Server misconfigured: missing TMDB_API_KEY' }, 500, env, request);
            }

            return streamGameGeneration({ playerData, env, ctx, signal: request.signal, request });
        } catch (error) {
            console.log(error);
            return jsonResponse({ error: 'Internal error' }, 500, env, request);
        }
    },
};
