import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import {csvEscape, readCsvAsObjects} from "./csv.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const PLAYERS = fs.readdirSync(DATA_DIR, {withFileTypes: true})
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
const OUTPUT_FILE = path.join(__dirname, 'data', 'game.csv');

const allMovies = new Map(); // name -> { name, ratings: { paf, bryvan, beranger } }
const ratingsByPlayer = {};

for (const player of PLAYERS) {
    const watchedPath = path.join(DATA_DIR, player, 'watched.csv');
    const ratingsPath = path.join(DATA_DIR, player, 'ratings.csv');

    const watched = readCsvAsObjects(watchedPath);
    const ratings = readCsvAsObjects(ratingsPath);

    const ratingMap = new Map();
    for (const r of ratings) {
        ratingMap.set(r.Name, r.Rating);
    }
    ratingsByPlayer[player] = ratingMap;

    for (const w of watched) {
        if (!allMovies.has(w.Name)) {
            allMovies.set(w.Name, {name: w.Name});
        }
    }
}

const header = ['name', ...PLAYERS.map(player => `rating-${player}`)];
const lines = [header.join(',')];

for (const movie of allMovies.values()) {
    const ratings = PLAYERS.map(player => ratingsByPlayer[player].get(movie.name) || '');

    lines.push(
        [movie.name, ...ratings]
            .map(csvEscape)
            .join(',')
    );
}

fs.writeFileSync(OUTPUT_FILE, lines.join('\n') + '\n', 'utf8');
console.log(`Wrote ${allMovies.size} movies to ${OUTPUT_FILE}`);
