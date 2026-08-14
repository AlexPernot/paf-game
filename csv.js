import fs from "fs";

export function parseCsv(content) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    // Normalize line endings and strip BOM
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