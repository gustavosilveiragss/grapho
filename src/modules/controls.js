import { state } from './state.js';
import { i18n } from './i18n.js';
import { dialogModule } from './dialog.js';
import { persistenceModule } from './persistence.js';

class ControlsModule {
    setup() {
        this.setupTextInput();
        this.setupNumberInputs();
        this.setupColorPickers();
        window.addEventListener('penDetected', () => this.showPressureUI());
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
            persistenceModule.scheduleSave();
        });
    }

    setupNumberInputs() {
        const inputs = [
            { id: 'font-size', update: (val) => { state.tool.fontSize = parseInt(val) || 32; } },
            { id: 'spacing', update: (val) => { state.tool.spacing = parseFloat(val) || 1.0; } },
            { id: 'stroke-weight', update: (val) => { state.tool.strokeWeight = parseFloat(val) || 0; } },
            { id: 'eraser-radius', update: (val) => { state.tool.eraserRadius = parseInt(val) || 20; } },
            { id: 'pressure-min', update: (val) => { state.pressure.minMultiplier = parseFloat(val) || 0.5; } },
            { id: 'pressure-max', update: (val) => { state.pressure.maxMultiplier = parseFloat(val) || 2.0; } },
        ];

        inputs.forEach(({ id, update }) => {
            const el = document.getElementById(id);
            if (!el) return;

            el.addEventListener('input', (e) => {
                update(e.target.value);
                persistenceModule.scheduleSave();
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

        persistenceModule.scheduleSave();
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
        persistenceModule.scheduleSave();
    }

    showPressureUI() {
        const controls = document.getElementById('pressure-controls');
        if (controls) {
            controls.style.display = 'flex';
        }
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        i18n.updateDOM();
    }

    showPressureDialog() {
        const contentHtml = `
            <strong data-i18n="pressure.firefoxTitle"></strong>
            <ol>
                <li data-i18n="pressure.step1"></li>
                <li data-i18n="pressure.step2"></li>
                <li data-i18n="pressure.step3"></li>
                <li data-i18n="pressure.step4"></li>
            </ol>
        `;
        dialogModule.alert('pressure.title', 'pressure.message', contentHtml);
    }

    togglePressure() {
        const hasSeenDialog = localStorage.getItem('ascii-paint-pressure-dialog-seen');
        if (!hasSeenDialog) {
            localStorage.setItem('ascii-paint-pressure-dialog-seen', 'true');
            this.showPressureDialog();
        }

        state.pressure.enabled = !state.pressure.enabled;
        const btn = document.getElementById('pressure-btn');
        if (btn) {
            btn.classList.toggle('active', state.pressure.enabled);
        }

        persistenceModule.scheduleSave();
    }
}

export const controlsModule = new ControlsModule();
