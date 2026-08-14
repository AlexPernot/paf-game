import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import {parseCsv, csvEscape} from "./csv.js";

const apiKey = process.env.TMDB_API_KEY;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_FILE = path.join(__dirname, 'collected.csv');

// Real limit is around 40 req/s but let's be good citizens.
const RATE_LIMIT_PER_SECOND = 30;
const MIN_INTERVAL_MS = 1000 / RATE_LIMIT_PER_SECOND;
let lastRequestTime = 0;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttle() {
    const elapsed = Date.now() - lastRequestTime;
    if (elapsed < MIN_INTERVAL_MS) {
        await sleep(MIN_INTERVAL_MS - elapsed);
    }
    lastRequestTime = Date.now();
}

function sanitizeName(name) {
    return name.normalize('NFD').replace(/\p{Diacritic}/gu, "");
}

async function query(name) {
    await throttle();
    const sanitized = sanitizeName(name);
    const encoded = encodeURIComponent(sanitized);
    const url = `https://api.themoviedb.org/3/search/movie?query=${encoded}&include_adult=false&language=en-US&page=1`;
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            Authorization: 'Bearer '+apiKey
        }
    };

    try {
        const response = await fetch(url, options);
        const data = await response.json();

        if (data?.total_results === undefined) {
            throw new Error(`Could not parse data for query "${sanitized}" (${encoded}):\n${JSON.stringify(data)}`);
        }

        if (data.total_results === 0) {
            console.log(`Could not find any movie for query "${sanitized}"`)
            return undefined;
        }

        return data.results[0].popularity
    }
    catch (error) {
        console.log(error);
    }
}

function writeCsv(rows) {
    const outLines = rows.map((row) => row.map(csvEscape).join(','));
    fs.writeFileSync(CSV_FILE, outLines.join('\n') + '\n', 'utf8');
}

const csvContent = fs.readFileSync(CSV_FILE, 'utf8');
const rows = parseCsv(csvContent);
const header = rows[0];
const nameIdx = header.indexOf('name');
const popularityIdx = header.indexOf('popularity');

let found = 0;
let missing = 0;
const notFound = [];

for (const row of rows.slice(1)) {
    if (row[popularityIdx]) continue;

    const name = row[nameIdx];
    const popularity = await query(name);

    if (!popularity) {
        notFound.push(name);
        missing++;
        continue;
    }

    row[popularityIdx] = popularity;
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
