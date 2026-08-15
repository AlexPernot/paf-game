import { BACKEND_URL } from './config.js';

function createRow() {
    const row = document.createElement('div');
    row.className = 'upload-row';
    row.innerHTML = `
        <input type="text" class="upload-name" placeholder="Nom du joueur" maxlength="10" required>
        <input type="file" class="upload-archive" accept=".zip" required>
        <button type="button" class="btn-remove-row" aria-label="Retirer">×</button>
    `;
    return row;
}

function setStatus(text, kind) {
    const status = document.getElementById('upload-status');
    status.textContent = text;
    status.className = `upload-status${kind ? ` is-${kind}` : ''}`;
}

// Le backend traite la requête en streamant des events SSE (data: {...}\n\n) et termine
// par un event `done` ou `error`. Les events intermédiaires sont de simples `progress`.
async function consumeProgressStream(response, onProgress) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalEvent = null;

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sepIndex;
        while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
            const rawEvent = buffer.slice(0, sepIndex);
            buffer = buffer.slice(sepIndex + 2);

            const dataLine = rawEvent.split('\n').find((line) => line.startsWith('data:'));
            if (!dataLine) continue;

            const event = JSON.parse(dataLine.slice(5).trim());
            if (event.type === 'done' || event.type === 'error') {
                finalEvent = event;
            } else {
                onProgress(event);
            }
        }
    }

    return finalEvent ?? { type: 'error', error: 'Connexion interrompue' };
}

// Le backend attend un FormData avec des clés indexées player-<i>-name / player-<i>-archive.
// Chaque ligne doit avoir un pseudo et un fichier, il faut au moins 2 joueurs, et les pseudos
// doivent être uniques.
function buildFormData(rows) {
    const players = rows.map((row) => ({
        name: row.querySelector('.upload-name').value.trim(),
        archive: row.querySelector('.upload-archive').files[0],
    }));

    if (players.some((player) => !player.name || !player.archive)) {
        return { error: 'Chaque ligne doit avoir un pseudo et une archive .zip.' };
    }

    if (players.length < 2) {
        return { error: 'Il faut au moins 2 joueurs.' };
    }

    const lowerNames = players.map((player) => player.name.toLowerCase());
    if (new Set(lowerNames).size !== lowerNames.length) {
        return { error: 'Les pseudos doivent être différents.' };
    }

    const formData = new FormData();
    players.forEach((player, index) => {
        formData.append(`player-${index}-name`, player.name);
        formData.append(`player-${index}-archive`, player.archive);
    });

    return { formData };
}

export function initUpload({ onUploaded } = {}) {
    const dialog = document.getElementById('upload-dialog');
    const form = document.getElementById('upload-form');
    const rowsContainer = document.getElementById('upload-rows');
    const submitButton = document.getElementById('upload-submit');

    rowsContainer.appendChild(createRow());
    rowsContainer.appendChild(createRow());

    let activeUpload = null;

    document.getElementById('header-upload').addEventListener('click', () => {
        setStatus('');
        dialog.showModal();
    });

    document.getElementById('upload-cancel').addEventListener('click', () => {
        if (activeUpload) {
            setStatus('Annulation...', 'pending');
            activeUpload.abort();
            return;
        }
        dialog.close();
    });

    document.getElementById('upload-add-row').addEventListener('click', () => {
        rowsContainer.appendChild(createRow());
    });

    rowsContainer.addEventListener('click', (event) => {
        if (!event.target.classList.contains('btn-remove-row')) return;
        if (rowsContainer.children.length > 2) {
            event.target.closest('.upload-row').remove();
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const { formData, error } = buildFormData([...rowsContainer.children]);
        if (error) {
            setStatus(error, 'error');
            return;
        }

        submitButton.disabled = true;
        setStatus('Envoi en cours...', 'pending');

        const controller = new AbortController();
        activeUpload = controller;

        try {
            const response = await fetch(BACKEND_URL, { method: 'POST', body: formData, signal: controller.signal });
            if (!response.ok) {
                const errorBody = await response.json().catch(() => null);
                throw new Error(errorBody?.error || `HTTP ${response.status}`);
            }

            const finalEvent = await consumeProgressStream(response, (event) => {
                setStatus(event.message ?? 'Traitement en cours...', 'pending');
            });

            if (finalEvent.type === 'error') {
                throw new Error(finalEvent.error || 'Échec du traitement');
            }

            setStatus('Envoyé !', 'success');
            onUploaded?.();
            setTimeout(() => dialog.close(), 1000);
        } catch (error) {
            if (error.name === 'AbortError') {
                setStatus('Envoi annulé.', '');
                dialog.close();
            } else {
                setStatus(`Échec de l'envoi : ${error.message}`, 'error');
            }
        } finally {
            submitButton.disabled = false;
            activeUpload = null;
        }
    });
}
