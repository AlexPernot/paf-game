import {execFileSync} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const steps = ['collect-movies.js', 'fetch-missing-data.js', 'order-by-popularity.js'];

for (const step of steps) {
    console.log(`\n> Running ${step}`);
    execFileSync('node', [path.join(__dirname, step)], {stdio: 'inherit'});
}
