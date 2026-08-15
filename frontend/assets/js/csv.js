import { BACKEND_URL } from './config.js';

export function parseCsv(content) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    content = content.replace(/^﻿/, '').replace(/\r\n/g, '\n');

    for (let i = 0; i < content.length; i++) {
        const char = content[i];

        if (inQuotes) {
            if (char === '"') {
                if (content[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
        } else if (char === '"') {
            inQuotes = true;
        } else if (char === ',') {
            row.push(field);
            field = '';
        } else if (char === '\n') {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        } else {
            field += char;
        }
    }

    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows.filter((r) => r.length > 1 || r[0] !== '');
}

export async function loadMovies(url = BACKEND_URL) {
    const res = await fetch(url);
    const text = await res.text();
    const rows = parseCsv(text);

    const header = rows[0];
    const popularityIdx = header.indexOf('popularity');
    const posterIdx = header.indexOf('poster');
    const overviewIdx = header.indexOf('overview');
    const releaseDateIdx = header.indexOf('release_date');
    const originalTitleIdx = header.indexOf('original_title');
    const pseudonyms = header
        .filter((h) => h.startsWith('rating-'))
        .map((h) => h.replace(/^rating-/, ''));

    const movies = rows.slice(1).map((r) => {
        const ratings = {};
        pseudonyms.forEach((p) => {
            const raw = r[header.indexOf(`rating-${p}`)];
            ratings[p] = raw === '' || raw == null ? null : Number(raw);
        });
        return {
            name: r[header.indexOf('name')],
            ratings,
            popularity: Number(r[popularityIdx]),
            poster: r[posterIdx] || null,
            overview: r[overviewIdx] || null,
            releaseDate: r[releaseDateIdx] || null,
            originalTitle: r[originalTitleIdx] || null,
        };
    });

    return { pseudonyms, movies };
}
