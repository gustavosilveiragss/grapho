import { state } from './state.js';
import { i18n } from './i18n.js';
import { dialogModule } from './dialog.js';
import { persistenceModule } from './persistence.js';
import { getGraphemeClusters } from './painting.js';

class ControlsModule {
    setup() {
        this.setupTextInput();
        this.setupToolbarCollapse();
        this.setupButtons();
        window.addEventListener('penDetected', () => this.showPressureUI());
    }

    setupButtons() {
        document.getElementById('continue-btn')?.addEventListener('click', () => this.toggleContinue());
        document.getElementById('eraser-btn')?.addEventListener('click', () => this.toggleEraser());
        document.getElementById('pressure-btn')?.addEventListener('click', () => this.togglePressure());
    }

    setupToolbarCollapse() {
        const collapseBtn = document.getElementById('toolbar-collapse');
        const expandBtn = document.getElementById('toolbar-expand');

        collapseBtn?.addEventListener('click', () => this.collapseToolbar());
        expandBtn?.addEventListener('click', () => this.expandToolbar());
    }

    collapseToolbar() {
        const toolbar = document.getElementById('toolbar');
        const expandBtn = document.getElementById('toolbar-expand');
        if (toolbar) toolbar.classList.add('collapsed');
        if (expandBtn) expandBtn.style.display = 'flex';
    }

    expandToolbar() {
        const toolbar = document.getElementById('toolbar');
        const expandBtn = document.getElementById('toolbar-expand');
        if (toolbar) toolbar.classList.remove('collapsed');
        if (expandBtn) expandBtn.style.display = 'none';
    }

    setupTextInput() {
        const input = document.getElementById('paint-text');
        if (!input) return;

        input.addEventListener('input', (e) => {
            const newText = e.target.value;
            const charCount = getGraphemeClusters(newText).length;
            if (state.painting.charIndex >= charCount) {
                state.painting.charIndex = 0;
            }
            state.tool.text = newText;
            persistenceModule.scheduleSave();
        });
    }

    syncContinueButton() {
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

    toggleContinue() {
        state.tool.continueFromLast = !state.tool.continueFromLast;
        this.syncContinueButton();
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
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({ nodes: controls.querySelectorAll('[data-lucide]') });
            }
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
        const hasSeenDialog = localStorage.getItem('grapho-pressure-dialog-seen');
        if (!hasSeenDialog) {
            localStorage.setItem('grapho-pressure-dialog-seen', 'true');
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
