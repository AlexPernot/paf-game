import { state } from './state.js';

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

function isEligibleForNotes(movie, pseudonyms) {
    const required = Math.ceil(pseudonyms.length / 2);
    return pseudonyms.filter((p) => movie.ratings[p] != null).length >= required;
}

export function filterByMode(movies, mode, pseudonyms) {
    return mode === 'notes'
        ? movies.filter((m) => isEligibleForNotes(m, pseudonyms))
        : movies;
}

export function firstTen(movies) {
    return movies.slice(0, 10);
}

export function randomTen(movies) {
    const pool = movies.slice();
    const picked = [];
    const count = Math.min(10, pool.length);
    for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        picked.push(pool.splice(idx, 1)[0]);
    }
    return picked;
}

let onSelectMovie = null;

export function initPicker({ onSelect }) {
    onSelectMovie = onSelect;

    document.querySelectorAll('.btn-random').forEach((btn) => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            state.mode = mode;
            state.displayedMovies = randomTen(filterByMode(state.allMovies, mode, state.pseudonyms));
            render();
        });
    });
}

export function render() {
    const grid = document.getElementById('card-grid');
    grid.innerHTML = '';

    if (state.displayedMovies.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-message';
        empty.textContent = 'Aucun film disponible pour ce mode.';
        grid.appendChild(empty);
        return;
    }

    state.displayedMovies.forEach((movie) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'card';
        card.textContent = movie.name;
        if (movie.poster) {
            card.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), url("${IMAGE_BASE_URL}${movie.poster}")`;
        }
        card.addEventListener('click', () => {
            state.selectedMovie = movie;
            onSelectMovie?.(movie);
        });
        grid.appendChild(card);
    });
}
