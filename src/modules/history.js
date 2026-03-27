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
            const key = e.key.toLowerCase();
            const mod = e.ctrlKey || e.metaKey;
            if (!mod) return;

            if (key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    this.redo();
                } else {
                    this.undo();
                }
            } else if (key === 'y') {
                e.preventDefault();
                this.redo();
            }
        });

        document.getElementById('undo-btn')?.addEventListener('click', () => this.undo());
        document.getElementById('clear-btn')?.addEventListener('click', () => this.clear());
    }

    cloneCanvas(buffer) {
        const src = buffer.elt || buffer.canvas;
        const clone = document.createElement('canvas');
        clone.width = src.width;
        clone.height = src.height;
        clone.getContext('2d').drawImage(src, 0, 0);
        return clone;
    }

    captureState() {
        return {
            layers: state.layers.items.map(layer => ({
                id: layer.id,
                name: layer.name,
                image: this.cloneCanvas(layer.buffer),
                visible: layer.visible,
                opacity: layer.opacity ?? 1.0,
            })),
            activeIndex: state.layers.activeIndex,
            nextId: state.layers.nextId,
            tool: { ...state.tool },
            bgColor: state.canvas.bgColor,
            charIndex: state.painting.charIndex,
        };
    }

    restoreState(snapshot) {
        const currentLayers = state.layers.items;
        const snapshotLayers = snapshot.layers;

        while (currentLayers.length > snapshotLayers.length) {
            const removed = currentLayers.pop();
            if (removed.buffer) removed.buffer.remove();
        }

        while (currentLayers.length < snapshotLayers.length) {
            const newLayer = layersModule.createLayer();
            if (newLayer) currentLayers.push(newLayer);
        }

        snapshotLayers.forEach((layerData, index) => {
            const layer = currentLayers[index];
            if (!layer || !layer.buffer) return;

            const canvas = layer.buffer.elt || layer.buffer.canvas;
            const ctx = canvas.getContext('2d');
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(layerData.image, 0, 0);
            ctx.restore();

            layer.id = layerData.id;
            layer.name = layerData.name;
            layer.visible = layerData.visible;
            layer.opacity = layerData.opacity ?? 1.0;
        });

        state.layers.activeIndex = snapshot.activeIndex ?? 0;
        state.layers.nextId = snapshot.nextId ?? state.layers.nextId;

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
