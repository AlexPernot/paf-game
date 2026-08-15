import { state } from './state.js';
import { loadMovies } from './csv.js';
import * as screenPicker from './screen-picker.js';
import * as screenReveal from './screen-reveal.js';
import { filterByMode, firstTen } from './screen-picker.js';

const SCREEN_TRANSITION_MS = 200;

const BACK_TARGET = { picker: 'title', reveal: 'picker' };

function showScreen(name) {
    const current = document.querySelector('.screen.is-active');
    const next = document.querySelector(`.screen[data-screen="${name}"]`);
    state.currentScreen = name;

    document.getElementById('app-header').classList.toggle('is-visible', name in BACK_TARGET);

    if (current && current !== next) {
        current.classList.remove('is-active');
        setTimeout(() => next.classList.add('is-active'), SCREEN_TRANSITION_MS);
    } else {
        next.classList.add('is-active');
    }
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

    document.getElementById('header-back').addEventListener('click', () => {
        showScreen(BACK_TARGET[state.currentScreen] ?? 'title');
    });

    screenPicker.initPicker({ onSelect: goToReveal });
    screenReveal.initReveal();

    showScreen('title');
}

boot();
