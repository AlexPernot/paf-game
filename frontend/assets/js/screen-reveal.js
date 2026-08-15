import { state } from './state.js';

const STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
const TICK_MS = 130;
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

let timers = {};
let stoppedOrder = [];
let reelIndex = {};
let itemHeight = 0;

function stripEl(pseudo) {
    return document.querySelector(`.rating-reel-strip[data-pseudo="${pseudo}"]`);
}

// Slides the reel down by one item: append the next value at the bottom of
// the strip and shift the whole strip up by one item height. The CSS
// transition on the strip does the actual scrolling animation, so the same
// full strip keeps scrolling through every step in order instead of
// swapping two items back and forth.
function advance(pseudo, text) {
    const strip = stripEl(pseudo);
    if (!strip) return;

    const item = document.createElement('div');
    item.className = 'rating-reel-item';
    item.textContent = text;
    strip.appendChild(item);

    const idx = (reelIndex[pseudo] ?? 0) + 1;
    reelIndex[pseudo] = idx;
    strip.style.transform = `translateY(-${idx * itemHeight}px)`;
}

function updateDisplay(pseudo, idx) {
    advance(pseudo, STEPS[idx % STEPS.length].toFixed(1));
}

function randomStep() {
    return STEPS[Math.floor(Math.random() * STEPS.length)];
}

function clearAllTimers() {
    Object.values(timers).forEach((id) => clearInterval(id));
    timers = {};
}

function startAll(pseudonyms) {
    clearAllTimers();
    stoppedOrder = [];
    reelIndex = {};

    itemHeight = document.querySelector('.rating-reel-item')?.getBoundingClientRect().height || 0;

    pseudonyms.forEach((p) => {
        let idx = Math.floor(Math.random() * STEPS.length);
        timers[p] = setInterval(() => {
            updateDisplay(p, idx);
            idx += 1;
        }, TICK_MS);
        const card = document.querySelector(`.rating-card[data-pseudo="${p}"]`);
        card?.classList.remove('is-stopped');
    });
}

function stopNext(pseudonyms) {
    const next = pseudonyms.find((p) => !stoppedOrder.includes(p));
    if (!next) return;

    // Stop the rolling
    clearInterval(timers[next]);
    delete timers[next];
    stoppedOrder.push(next);

    // Land on a random step so the stop can't be timed to the tick order.
    advance(next, randomStep().toFixed(1));

    const card = document.querySelector(`.rating-card[data-pseudo="${next}"]`);
    card?.classList.add('is-stopped');

    if (stoppedOrder.length === pseudonyms.length) {
        document.getElementById('reveal-container').style.visibility = "visible";
    }
}

function reveal(movie, pseudonyms) {
    pseudonyms.forEach((p) => {
        const real = movie.ratings[p];
        advance(p, real == null ? '???' : real.toFixed(1));

        const card = document.querySelector(`.rating-card[data-pseudo="${p}"]`);
        card?.classList.add('is-revealed');
    });
}

export function initReveal() {
    document.getElementById('big-red-button').addEventListener('click', () => {
        stopNext(state.pseudonyms);
    });

    document.getElementById('reveal-button').addEventListener('click', (event) => {
        event.target.disabled = true;
        reveal(state.selectedMovie, state.pseudonyms);
    });
}

export function render() {
    const movie = state.selectedMovie;
    document.getElementById('movie-title').textContent = movie.name;

    const poster = document.getElementById('movie-poster');
    if (movie.poster) {
        poster.src = IMAGE_BASE_URL + movie.poster;
        poster.alt = movie.name;
        poster.style.display = '';
    } else {
        poster.style.display = 'none';
    }

    document.getElementById('movie-overview').textContent = movie.overview || '';

    const metaParts = [];
    if (movie.releaseDate) metaParts.push(movie.releaseDate.substring(0, 4));
    if (movie.originalTitle && movie.originalTitle !== movie.name) metaParts.push(movie.originalTitle);
    document.getElementById('movie-meta').textContent = metaParts.join(' · ');

    const row = document.getElementById('ratings-row');
    row.innerHTML = '';

    state.pseudonyms.forEach((p) => {
        const card = document.createElement('div');
        card.className = 'rating-card';
        card.dataset.pseudo = p;

        const label = document.createElement('div');
        label.className = 'rating-label';
        label.textContent = p;

        const reel = document.createElement('div');
        reel.className = 'rating-reel';

        const strip = document.createElement('div');
        strip.className = 'rating-reel-strip';
        strip.dataset.pseudo = p;
        strip.style.transition = `transform ${TICK_MS}ms linear`;

        const item = document.createElement('div');
        item.className = 'rating-reel-item';
        item.textContent = '0.5';

        strip.appendChild(item);
        reel.appendChild(strip);
        card.appendChild(label);
        card.appendChild(reel);
        row.appendChild(card);
    });

    document.getElementById('reveal-container').style.visibility = "hidden";
    document.getElementById('reveal-button').disabled = false;

    startAll(state.pseudonyms);
}
