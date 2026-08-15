import { unzipSync } from 'fflate';

function findEntry(entries, fileName) {
    const matches = Object.keys(entries).filter((key) => {
        const lower = key.toLowerCase();
        return lower === fileName || lower.endsWith(`/${fileName}`);
    });

    if (matches.length === 0) {
        throw new Error(`${fileName} not found in archive`);
    }
    if (matches.length > 1) {
        throw new Error(`Multiple ${fileName} entries found in archive`);
    }

    return matches[0];
}

export function extractPlayerCsvs(zipBytes) {
    let entries;
    try {
        entries = unzipSync(zipBytes);
    } catch {
        throw new Error('Could not read zip archive');
    }

    const decoder = new TextDecoder('utf-8');
    const watchedKey = findEntry(entries, 'watched.csv');
    const ratingsKey = findEntry(entries, 'ratings.csv');

    return {
        watchedCsv: decoder.decode(entries[watchedKey]),
        ratingsCsv: decoder.decode(entries[ratingsKey]),
    };
}
