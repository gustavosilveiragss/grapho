import { state } from './state.js';
import { layersModule } from './layers.js';

const MAX_SNAPSHOTS = 20;

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

        document.getElementById('undo-btn')?.addEventListener('click', () => this.undo());
        document.getElementById('clear-btn')?.addEventListener('click', () => this.clear());
    }

    captureState() {
        return {
            layers: state.layers.items.map(layer => ({
                id: layer.id,
                name: layer.name,
                image: layer.buffer.get(),
                visible: layer.visible,
                opacity: layer.opacity ?? 1.0,
            })),
            tool: { ...state.tool },
            bgColor: state.canvas.bgColor,
            charIndex: state.painting.charIndex,
        };
    }

    restoreState(snapshot) {
        snapshot.layers.forEach((layerData, index) => {
            const layer = state.layers.items[index];
            if (layer && layer.buffer) {
                layer.buffer.clear();
                layer.buffer.image(layerData.image, 0, 0);
                layer.visible = layerData.visible;
                layer.name = layerData.name;
                layer.opacity = layerData.opacity ?? 1.0;
            }
        });

        Object.assign(state.tool, snapshot.tool);
        state.canvas.bgColor = snapshot.bgColor;
        state.painting.charIndex = snapshot.charIndex;
        this.syncUI();
        layersModule.updateDock();
        window.redraw();
        window.persistenceModule?.scheduleSave();
    }

    saveSnapshot() {
        if (!state.layers.items.length) return;

        this.undoStack.push(this.captureState());
        this.redoStack = [];

        if (this.undoStack.length > MAX_SNAPSHOTS) {
            this.undoStack.shift();
        }
    }

    undo() {
        if (!this.undoStack.length || !state.layers.items.length) return;
        this.redoStack.push(this.captureState());
        this.restoreState(this.undoStack.pop());
    }

    redo() {
        if (!this.redoStack.length || !state.layers.items.length) return;
        this.undoStack.push(this.captureState());
        this.restoreState(this.redoStack.pop());
    }

    clear() {
        const buf = layersModule.getActiveBuffer();
        if (!buf) return;
        this.saveSnapshot();
        buf.clear();
        state.painting.charIndex = 0;
        layersModule.updateDock();
        window.redraw();
        window.persistenceModule?.scheduleSave();
    }

    syncUI() {
        window.persistenceModule?.syncUI();
    }
}

export const historyModule = new HistoryModule();
