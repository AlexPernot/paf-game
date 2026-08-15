import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {csvEscape} from "./csv.js";
import {parseCsv} from "../assets/js/csv.js";
import {fetchMovieByName} from "../assets/js/tmdb.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_FILE = path.join(__dirname, '..', 'data', 'game.csv');


function writeCsv(rows) {
    const outLines = rows.map((row) => row.map(csvEscape).join(','));
    fs.writeFileSync(CSV_FILE, outLines.join('\n') + '\n', 'utf8');
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

const csvContent = fs.readFileSync(CSV_FILE, 'utf8');
const rows = parseCsv(csvContent);
const header = rows[0];
const dataRows = rows.slice(1);
const nameIdx = header.indexOf('name');
const popularityIdx = ensureColumn(header, dataRows, 'popularity');
const posterIdx = ensureColumn(header, dataRows, 'poster');
const overviewIdx = ensureColumn(header, dataRows, 'overview');
const releaseDateIdx = ensureColumn(header, dataRows, 'release_date');
const originalTitleIdx = ensureColumn(header, dataRows, 'original_title');

let found = 0;
let missing = 0;
const notFound = [];

for (const row of dataRows) {
    if (row[popularityIdx] && row[posterIdx] && row[overviewIdx]) continue;

    const name = row[nameIdx];
    const movie = await fetchMovieByName(name);

    if (!movie) {
        notFound.push(name);
        missing++;
        continue;
    }

    row[popularityIdx] = movie.popularity;
    row[posterIdx] = movie.poster_path ? movie.poster_path : '';
    row[overviewIdx] = movie.overview ? movie.overview : '';
    row[releaseDateIdx] = movie.release_date ? movie.release_date : '';
    row[originalTitleIdx] = movie.original_title ? movie.original_title : '';
    found++;

    // We write after each query to ensure no data is lost
    writeCsv(rows);
}

console.log(`Found: ${found}`);
console.log(`Still missing: ${missing}`);

if (notFound.length) {
    console.log('Movies not found:');
    for (const name of notFound) {
        console.log(`- ${name}`);
    }
}
