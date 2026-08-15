const apiKey = process.env.TMDB_API_KEY;

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

async function fetchMovieSearchPage(name, page) {
    await throttle();
    const encoded = encodeURIComponent(name);
    const url = `https://api.themoviedb.org/3/search/movie?query=${encoded}&include_adult=false&language=en-US&page=${page}`;
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            Authorization: 'Bearer ' + apiKey
        }
    };

    const response = await fetch(url, options);
    const data = await response.json();

    if (data?.total_results === undefined) {
        throw new Error(`Could not parse data for query "${name}":\n${JSON.stringify(data)}`);
    }

    return data;
}

export async function fetchMovieByName(name) {
    const sanitized = sanitizeName(name);

    try {
        const firstPage = await fetchMovieSearchPage(sanitized, 1);

        if (firstPage.total_results === 0) {
            console.log(`Could not find any movie for query "${sanitized}"`)
            return undefined;
        }

        let exactMatch = firstPage.results.find(movie => movie.title.toLowerCase() === name.toLowerCase());
        if (exactMatch) {
            return exactMatch;
        }

        for (let page = 2; page <= firstPage.total_pages; page++) {
            const data = await fetchMovieSearchPage(sanitized, page);
            exactMatch = data.results.find(movie => movie.title.toLowerCase() === name.toLowerCase());
            if (exactMatch) {
                return exactMatch;
            }
        }

        console.log(`Could not find an exact title match for query "${sanitized}"`)
        return undefined;
    } catch (error) {
        console.log(error);
    }
}
