import { state } from './state.js';
import { loadMovies } from './csv.js';
import * as screenPicker from './screen-picker.js';
import * as screenReveal from './screen-reveal.js';
import { filterByMode, firstTen } from './screen-picker.js';

function showScreen(name) {
    document.querySelectorAll('.screen').forEach((s) => {
        s.classList.toggle('is-active', s.dataset.screen === name);
    });
    state.currentScreen = name;
}

function goToPicker(mode) {
    state.mode = mode;
    state.displayedMovies = firstTen(filterByMode(state.allMovies, mode, state.pseudonyms));
    screenPicker.render();
    showScreen('picker');
}

function goToReveal(movie) {
    state.selectedMovie = movie;
    screenReveal.render();
    showScreen('reveal');
}

async function boot() {
    const { pseudonyms, movies } = await loadMovies();
    state.pseudonyms = pseudonyms;
    state.allMovies = movies;

    document.querySelectorAll('.btn-mode').forEach((btn) => {
        btn.addEventListener('click', () => goToPicker(btn.dataset.mode));
    });

    document.getElementById('picker-back').addEventListener('click', () => showScreen('title'));
    document.getElementById('reveal-back').addEventListener('click', () => showScreen('picker'));

    screenPicker.initPicker({ onSelect: goToReveal });
    screenReveal.initReveal();

    showScreen('title');
}

boot();
