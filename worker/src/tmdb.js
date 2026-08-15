function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeName(name) {
    return name.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function isTitleMatch(movie, name) {
    return movie.title.toLowerCase() === name.toLowerCase();
}

export function createTmdbClient({ apiKey, rateLimitPerSecond = 30 }) {
    const minIntervalMs = 1000 / rateLimitPerSecond;
    let lastRequestTime = 0;

    async function throttle() {
        const elapsed = Date.now() - lastRequestTime;
        if (elapsed < minIntervalMs) {
            await sleep(minIntervalMs - elapsed);
        }
        lastRequestTime = Date.now();
    }

    async function fetchMovieSearchPage({ name, year, page = 1, signal }) {
        await throttle();
        const encoded = encodeURIComponent(name);
        const url = `https://api.themoviedb.org/3/search/movie?query=${encoded}&include_adult=false&language=en-US&year=${year}&page=${page}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                accept: 'application/json',
                Authorization: 'Bearer ' + apiKey,
            },
            signal,
        });
        const data = await response.json();

        if (data?.total_results === undefined) {
            throw new Error(`Could not parse data for query "${name}":\n${JSON.stringify(data)}`);
        }

        return data;
    }

    async function fetchMovieByName(name, year, { signal } = {}) {
        const sanitized = sanitizeName(name);

        try {
            const firstPage = await fetchMovieSearchPage({ name: sanitized, year, signal });

            if (firstPage.total_results === 0) {
                return undefined;
            }

            const titleMatches = firstPage.results.filter((movie) => isTitleMatch(movie, name));

            for (let page = 2; page <= firstPage.total_pages; page++) {
                if (signal?.aborted) break;
                const data = await fetchMovieSearchPage({ name: sanitized, year, page, signal });
                titleMatches.push(...data.results.filter((movie) => isTitleMatch(movie, name)));
            }

            if (titleMatches.length === 0) {
                return undefined;
            }

            return titleMatches[0];
        } catch (error) {
            console.log(error);
            return undefined;
        }
    }

    return { fetchMovieByName };
}
