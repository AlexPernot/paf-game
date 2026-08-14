import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import {parseCsv, csvEscape} from "./csv.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_FILE = path.join(__dirname, 'collected.csv');

const csvContent = fs.readFileSync(CSV_FILE, 'utf8');
const rows = parseCsv(csvContent);
const header = rows[0];
const popularityIdx = header.indexOf('popularity');

const kept = rows.slice(1).filter((row) => row[popularityIdx]);
const removed = rows.length - 1 - kept.length;

kept.sort((a, b) => parseFloat(b[popularityIdx]) - parseFloat(a[popularityIdx]));

const outLines = [header, ...kept].map((row) => row.map(csvEscape).join(','));
fs.writeFileSync(CSV_FILE, outLines.join('\n') + '\n', 'utf8');

console.log(`Sorted ${kept.length} movies by popularity.`);
console.log(`Removed ${removed} movies without a popularity score.`);
