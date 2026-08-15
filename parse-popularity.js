import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import {parseCsv, csvEscape} from "./csv.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const TMDB_FILE = path.join(DATA_DIR, 'tmdb-movies.json');
const CSV_FILE = path.join(__dirname, 'data', 'game.csv');

console.log('Loading TMDB movies...');
const tmdbContent = fs.readFileSync(TMDB_FILE, 'utf8');
const popularityByTitle = new Map(); // original_title -> popularity

for (const line of tmdbContent.split('\n')) {
    if (!line.trim()) continue;
    const movie = JSON.parse(line);
    const existing = popularityByTitle.get(movie.original_title);
    if (existing === undefined || movie.popularity > existing) {
        popularityByTitle.set(movie.original_title, movie.popularity);
    }
}
console.log(`Loaded ${popularityByTitle.size} unique titles from TMDB.`);

const csvContent = fs.readFileSync(CSV_FILE, 'utf8');
const rows = parseCsv(csvContent);
const header = rows[0];
const nameIdx = header.indexOf('name');

let found = 0;
let missing = 0;

const outLines = [[...header, 'popularity'].join(',')];

for (const row of rows.slice(1)) {
    const name = row[nameIdx];
    const popularity = popularityByTitle.get(name);

    if (popularity !== undefined) {
        found++;
    } else {
        missing++;
    }

    outLines.push(
        [...row, popularity !== undefined ? popularity : '']
            .map(csvEscape)
            .join(',')
    );
}

fs.writeFileSync(CSV_FILE, outLines.join('\n') + '\n', 'utf8');

console.log(`Found: ${found}`);
console.log(`Missing: ${missing}`);
