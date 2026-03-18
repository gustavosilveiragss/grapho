import { state } from './state.js';
import { i18n } from './i18n.js';

const MAX_SNAPSHOTS = 30;

class HistoryModule {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
    }

    setup() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    this.redo();
                } else {
                    this.undo();
                }
            }
        });
    }

    captureState() {
        return {
            image: state.buffer.get(),
            tool: { ...state.tool },
            bgColor: state.canvas.bgColor,
            charIndex: state.painting.charIndex,
        };
    }

    restoreState(snapshot) {
        state.buffer.clear();
        state.buffer.image(snapshot.image, 0, 0);
        Object.assign(state.tool, snapshot.tool);
        state.canvas.bgColor = snapshot.bgColor;
        state.painting.charIndex = snapshot.charIndex;
        this.syncUI();
        window.redraw();
    }

    saveSnapshot() {
        if (!state.buffer) return;

        this.undoStack.push(this.captureState());
        this.redoStack = [];

        if (this.undoStack.length > MAX_SNAPSHOTS) {
            this.undoStack.shift();
        }
    }

    undo() {
        if (!this.undoStack.length || !state.buffer) return;
        this.redoStack.push(this.captureState());
        this.restoreState(this.undoStack.pop());
    }

    redo() {
        if (!this.redoStack.length || !state.buffer) return;
        this.undoStack.push(this.captureState());
        this.restoreState(this.redoStack.pop());
    }

    clear() {
        if (!state.buffer) return;
        this.saveSnapshot();
        state.buffer.clear();
        state.painting.charIndex = 0;
        window.redraw();
    }

    syncUI() {
        const el = (id) => document.getElementById(id);

        const paintText = el('paint-text');
        if (paintText) paintText.value = state.tool.text;

        const colorPicker = el('color-picker');
        if (colorPicker) colorPicker.value = state.tool.color;

        const bgPicker = el('bg-color-picker');
        if (bgPicker) bgPicker.value = state.canvas.bgColor;

        const fontSize = el('font-size');
        if (fontSize) fontSize.value = state.tool.fontSize;

        const spacing = el('spacing');
        if (spacing) spacing.value = state.tool.spacing;

        const strokeWeight = el('stroke-weight');
        if (strokeWeight) strokeWeight.value = state.tool.strokeWeight;

        const fontSearch = el('font-search');
        if (fontSearch) fontSearch.value = state.tool.fontFamily;

        const continueBtn = el('continue-btn');
        if (continueBtn) {
            continueBtn.classList.toggle('active', state.tool.continueFromLast);
            const span = continueBtn.querySelector('[data-i18n]');
            if (span) {
                const key = state.tool.continueFromLast ? 'toolbar.continue' : 'toolbar.restart';
                span.setAttribute('data-i18n', key);
                span.textContent = i18n.t(key);
            }
            if (typeof lucide !== 'undefined') {
                const icon = continueBtn.querySelector('[data-lucide]');
                if (icon) {
                    icon.setAttribute('data-lucide', state.tool.continueFromLast ? 'repeat' : 'rotate-ccw');
                    lucide.createIcons({ nodes: [icon] });
                }
            }
        }
    }
}

export const historyModule = new HistoryModule();
