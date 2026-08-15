import { state } from './state.js';

const STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
const TICK_MS = 80;

let timers = {};
let stoppedOrder = [];

function randomStep() {
    return STEPS[Math.floor(Math.random() * STEPS.length)];
}

function valueEl(pseudo) {
    return document.querySelector(`.rating-value[data-pseudo="${pseudo}"]`);
}

function updateDisplay(pseudo, value) {
    const el = valueEl(pseudo);
    if (el) el.textContent = value.toFixed(1);
}

function clearAllTimers() {
    Object.values(timers).forEach((id) => clearInterval(id));
    timers = {};
}

function startAll(pseudonyms) {
    clearAllTimers();
    stoppedOrder = [];
    pseudonyms.forEach((p) => {
        timers[p] = setInterval(() => updateDisplay(p, randomStep()), TICK_MS);
        const card = document.querySelector(`.rating-card[data-pseudo="${p}"]`);
        card?.classList.remove('is-stopped');
    });
}

function stopNext(pseudonyms) {
    const next = pseudonyms.find((p) => !stoppedOrder.includes(p));
    if (!next) return;

    clearInterval(timers[next]);
    delete timers[next];
    stoppedOrder.push(next);

    const card = document.querySelector(`.rating-card[data-pseudo="${next}"]`);
    card?.classList.add('is-stopped');

    if (stoppedOrder.length === pseudonyms.length) {
        document.getElementById('reveal-button').hidden = false;
    }
}

function reveal(movie, pseudonyms) {
    pseudonyms.forEach((p) => {
        const real = movie.ratings[p];
        const el = valueEl(p);
        if (el) el.textContent = real == null ? '???' : real.toFixed(1);
    });
}

export function initReveal() {
    document.getElementById('big-red-button').addEventListener('click', () => {
        stopNext(state.pseudonyms);
    });

    document.getElementById('reveal-button').addEventListener('click', () => {
        reveal(state.selectedMovie, state.pseudonyms);
    });
}

export function render() {
    const movie = state.selectedMovie;
    document.getElementById('movie-title').textContent = movie.name;

    const row = document.getElementById('ratings-row');
    row.innerHTML = '';

    state.pseudonyms.forEach((p) => {
        const card = document.createElement('div');
        card.className = 'rating-card';
        card.dataset.pseudo = p;

        const label = document.createElement('div');
        label.className = 'rating-label';
        label.textContent = p;

        const value = document.createElement('div');
        value.className = 'rating-value';
        value.dataset.pseudo = p;
        value.textContent = '0.5';

        card.appendChild(label);
        card.appendChild(value);
        row.appendChild(card);
    });

    document.getElementById('reveal-button').hidden = true;

    startAll(state.pseudonyms);
}
