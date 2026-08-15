import fs from "node:fs";
import {parseCsv} from "../assets/js/csv.js";

export function csvEscape(value) {
    if (value == null) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

export function readCsvAsObjects(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const rows = parseCsv(content);
    if (rows.length === 0) return [];
    const header = rows[0];
    return rows.slice(1).map((row) => {
        const obj = {};
        header.forEach((key, idx) => {
            obj[key] = row[idx];
        });
        return obj;
    });
}