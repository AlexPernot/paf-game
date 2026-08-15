const ENRICHED_COLUMNS = ['popularity', 'poster', 'overview', 'release_date', 'original_title'];
const ENRICH_CONCURRENCY = 8;

export function buildGameRows(playerData) {
    const players = [...playerData.keys()];

    const ratingsByPlayer = new Map();
    const yearsByName = new Map();

    for (const player of players) {
        const { watched, ratings } = playerData.get(player);

        const ratingMap = new Map();
        for (const r of ratings) {
            ratingMap.set(r.Name, r.Rating);
        }
        ratingsByPlayer.set(player, ratingMap);

        for (const w of watched) {
            if (!yearsByName.has(w.Name)) {
                yearsByName.set(w.Name, w.Year);
            }
        }
    }

    const header = ['name', 'year', ...players.map((player) => `rating-${player}`)];
    const rows = [...yearsByName.entries()].map(([name, year]) => [
        name,
        year || '',
        ...players.map((player) => ratingsByPlayer.get(player).get(name) || ''),
    ]);

    return { header, rows };
}

function ensureColumn(header, rows, name) {
    let idx = header.indexOf(name);
    if (idx === -1) {
        header.push(name);
        idx = header.length - 1;
        for (const row of rows) row.push('');
    }
    return idx;
}

async function enrichRow(row, columnIdx, tmdbClient, signal) {
    if (row[columnIdx.popularity] && row[columnIdx.poster] && row[columnIdx.overview]) return;

    const name = row[columnIdx.name];
    const year = columnIdx.year !== -1 ? row[columnIdx.year] : undefined;
    const movie = await tmdbClient.fetchMovieByName(name, year, { signal });
    if (!movie) return;

    row[columnIdx.popularity] = movie.popularity;
    row[columnIdx.poster] = movie.poster_path || '';
    row[columnIdx.overview] = movie.overview || '';
    row[columnIdx.release_date] = movie.release_date || '';
    row[columnIdx.original_title] = movie.original_title || '';
}

export async function enrichRows(header, rows, tmdbClient, onProgress, signal) {
    const columnIdx = { name: header.indexOf('name'), year: header.indexOf('year') };
    for (const column of ENRICHED_COLUMNS) {
        columnIdx[column] = ensureColumn(header, rows, column);
    }

    for (let i = 0; i < rows.length; i += ENRICH_CONCURRENCY) {
        if (signal?.aborted) break;
        const batch = rows.slice(i, i + ENRICH_CONCURRENCY);
        await Promise.all(batch.map((row) => enrichRow(row, columnIdx, tmdbClient, signal)));
        await onProgress?.(Math.min(i + batch.length, rows.length), rows.length);
    }

    return { header, rows };
}

export function sortByPopularity(header, rows) {
    const popularityIdx = header.indexOf('popularity');
    const kept = rows.filter((row) => row[popularityIdx]);
    kept.sort((a, b) => parseFloat(b[popularityIdx]) - parseFloat(a[popularityIdx]));
    return { header, rows: kept };
}
