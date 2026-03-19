import { state } from './state.js';
import { i18n } from './i18n.js';

class ControlsModule {
    setup() {
        this.setupTextInput();
        this.setupNumberInputs();
        this.setupColorPickers();
    }

    setupTextInput() {
        const input = document.getElementById('paint-text');
        if (!input) return;

        input.addEventListener('input', (e) => {
            const newText = e.target.value;
            if (state.painting.charIndex >= newText.length) {
                state.painting.charIndex = 0;
            }
            state.tool.text = newText;
        });
    }

    setupNumberInputs() {
        const inputs = [
            { id: 'font-size', update: (val) => { state.tool.fontSize = parseInt(val) || 32; } },
            { id: 'spacing', update: (val) => { state.tool.spacing = parseFloat(val) || 1.0; } },
            { id: 'stroke-weight', update: (val) => { state.tool.strokeWeight = parseFloat(val) || 0; } },
            { id: 'eraser-radius', update: (val) => { state.tool.eraserRadius = parseInt(val) || 20; } },
        ];

        inputs.forEach(({ id, update }) => {
            const el = document.getElementById(id);
            if (!el) return;

            el.addEventListener('input', (e) => {
                update(e.target.value);
            });
        });
    }

    setupColorPickers() {
    }

    toggleContinue() {
        state.tool.continueFromLast = !state.tool.continueFromLast;
        const btn = document.getElementById('continue-btn');
        if (!btn) return;

        btn.classList.toggle('active', state.tool.continueFromLast);
        const span = btn.querySelector('[data-i18n]');
        if (span) {
            const key = state.tool.continueFromLast ? 'toolbar.continue' : 'toolbar.restart';
            span.setAttribute('data-i18n', key);
            span.textContent = i18n.t(key);
        }

        if (typeof lucide !== 'undefined') {
            const icon = btn.querySelector('[data-lucide]');
            if (icon) {
                icon.setAttribute('data-lucide', state.tool.continueFromLast ? 'repeat' : 'rotate-ccw');
                lucide.createIcons({ nodes: [icon] });
            }
        }
    }

    toggleEraser() {
        const isEraser = state.tool.mode === 'eraser';
        state.tool.mode = isEraser ? 'paint' : 'eraser';

        const btn = document.getElementById('eraser-btn');
        const options = document.getElementById('eraser-options');
        const container = document.getElementById('canvas-container');

        if (btn) {
            btn.classList.toggle('active', !isEraser);
        }

        if (options) {
            options.style.display = isEraser ? 'none' : 'flex';
        }

        if (container) {
            container.classList.toggle('eraser-mode', !isEraser);
        }

        window.redraw();
    }
}

export const controlsModule = new ControlsModule();
