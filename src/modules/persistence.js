import { state } from './state.js';
import { canvasModule, getPixelDensity } from './canvas.js';
import { layersModule } from './layers.js';
import { colorPickerModule } from './colorPicker.js';

const DB_NAME = 'grapho-db';
const DB_VERSION = 1;
const STORE_NAME = 'session';
const OLD_STORAGE_KEY = 'grapho-state';
const VERSION = 1;

class PersistenceModule {
    constructor() {
        this.p = null;
        this.db = null;
        this.saveDebounceTimer = null;
        this.SAVE_DEBOUNCE_MS = 500;
        this.saving = false;
        this.pendingSave = false;
    }

    async setup(p) {
        this.p = p;
        this.db = await this.openDB();
    }

    openDB() {
        return new Promise((resolve) => {
            try {
                const req = indexedDB.open(DB_NAME, DB_VERSION);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME);
                    }
                };
                req.onsuccess = (e) => resolve(e.target.result);
                req.onerror = () => resolve(null);
            } catch (e) {
                resolve(null);
            }
        });
    }

    dbGet(key) {
        if (!this.db) return Promise.resolve(null);
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result ?? null);
                req.onerror = () => resolve(null);
            } catch (e) {
                resolve(null);
            }
        });
    }

    serializeBuffer(buffer) {
        if (!buffer) return Promise.resolve(null);
        try {
            const canvas = buffer.elt || buffer.canvas;
            return new Promise(resolve => {
                canvas.toBlob(blob => resolve(blob), 'image/png');
            });
        } catch (e) {
            return Promise.resolve(null);
        }
    }

    async deserializeBuffer(source, width, height) {
        if (!source || !this.p) return null;

        let url;
        let needsRevoke = false;

        if (source instanceof Blob) {
            url = URL.createObjectURL(source);
            needsRevoke = true;
        } else if (typeof source === 'string') {
            url = source;
        } else {
            return null;
        }

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                if (needsRevoke) URL.revokeObjectURL(url);
                const density = getPixelDensity();
                const buffer = this.p.createGraphics(width, height);
                buffer.pixelDensity(density);
                const canvas = buffer.elt || buffer.canvas;
                const ctx = canvas.getContext('2d');
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.drawImage(img, 0, 0, width * density, height * density);
                ctx.restore();
                resolve(buffer);
            };
            img.onerror = () => {
                if (needsRevoke) URL.revokeObjectURL(url);
                resolve(null);
            };
            img.src = url;
        });
    }

    captureSettings() {
        return {
            version: VERSION,
            canvas: {
                width: state.canvas.width,
                height: state.canvas.height,
                density: getPixelDensity(),
                bgColor: state.canvas.bgColor,
                zoom: state.canvas.zoom,
                rotation: state.canvas.rotation,
                panX: canvasModule.tx,
                panY: canvasModule.ty,
            },
            tool: {
                text: state.tool.text,
                fontFamily: state.tool.fontFamily,
                fontSize: state.tool.fontSize,
                color: state.tool.color,
                strokeWeight: state.tool.strokeWeight,
                spacing: state.tool.spacing,
                continueFromLast: state.tool.continueFromLast,
                mode: state.tool.mode,
                eraserRadius: state.tool.eraserRadius,
            },
            pressure: {
                enabled: state.pressure.enabled,
                minMultiplier: state.pressure.minMultiplier,
                maxMultiplier: state.pressure.maxMultiplier,
            },
            painting: {
                charIndex: state.painting.charIndex,
            },
            layers: {
                items: state.layers.items.map(layer => ({
                    id: layer.id,
                    name: layer.name,
                    visible: layer.visible,
                    opacity: layer.opacity ?? 1.0,
                })),
                activeIndex: state.layers.activeIndex,
                nextId: state.layers.nextId,
            },
            ui: {
                layerDockCollapsed: layersModule.isCollapsed(),
            },
        };
    }

    scheduleSave() {
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
        }
        this.saveDebounceTimer = setTimeout(() => {
            this.saveNow();
        }, this.SAVE_DEBOUNCE_MS);
    }

    async saveNow() {
        if (!this.db || this.saving) {
            if (this.saving) this.pendingSave = true;
            return;
        }
        this.saving = true;
        const ind = document.getElementById('saving-indicator');
        if (ind) ind.style.display = '';
        try {
            const layers = [...state.layers.items];
            const settings = this.captureSettings();
            const blobs = await Promise.all(
                layers.map(layer => this.serializeBuffer(layer.buffer))
            );

            const tx = this.db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);

            store.put(settings, 'settings');
            for (let i = 0; i < blobs.length; i++) {
                if (blobs[i]) {
                    store.put(blobs[i], `layer-${i}`);
                } else {
                    store.delete(`layer-${i}`);
                }
            }
            for (let i = blobs.length; i < state.layers.maxLayers; i++) {
                store.delete(`layer-${i}`);
            }

            await new Promise((resolve) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch (e) {
        } finally {
            this.saving = false;
            if (this.pendingSave) {
                this.pendingSave = false;
                this.saveNow();
            } else if (ind) {
                ind.style.display = 'none';
            }
        }
    }

    async load() {
        if (this.db) {
            const settings = await this.dbGet('settings');
            if (settings && settings.version === VERSION) {
                return settings;
            }
        }

        return this.migrateFromLocalStorage();
    }

    migrateFromLocalStorage() {
        try {
            const stored = localStorage.getItem(OLD_STORAGE_KEY);
            if (!stored) return null;

            const data = JSON.parse(stored);
            if (!data || data.version !== VERSION) return null;

            data._legacy = true;
            return data;
        } catch (e) {
            return null;
        }
    }

    restoreSettingsOnly(data) {
        if (!data) return false;

        if (data.canvas) {
            state.canvas.bgColor = data.canvas.bgColor || state.canvas.bgColor;
            state.canvas.zoom = data.canvas.zoom ?? state.canvas.zoom;
            state.canvas.rotation = data.canvas.rotation ?? 0;
            canvasModule.tx = data.canvas.panX ?? canvasModule.tx;
            canvasModule.ty = data.canvas.panY ?? canvasModule.ty;
        }

        if (data.tool) {
            Object.assign(state.tool, data.tool);
        }

        if (data.pressure) {
            Object.assign(state.pressure, data.pressure);
        }

        if (data.painting) {
            state.painting.charIndex = data.painting.charIndex ?? 0;
        }

        if (data.ui?.layerDockCollapsed !== undefined) {
            if (data.ui.layerDockCollapsed) {
                layersModule.collapseDock();
            } else {
                layersModule.expandDock();
            }
        } else {
            layersModule.autoCollapseIfSmallScreen();
        }

        this.syncUI();
        return true;
    }

    async restoreState(data) {
        if (!data || !this.p) return false;

        if (data.canvas) {
            state.canvas.bgColor = data.canvas.bgColor || state.canvas.bgColor;
            state.canvas.zoom = data.canvas.zoom ?? state.canvas.zoom;
            state.canvas.rotation = data.canvas.rotation ?? 0;
            canvasModule.tx = data.canvas.panX ?? canvasModule.tx;
            canvasModule.ty = data.canvas.panY ?? canvasModule.ty;
        }

        if (data.tool) {
            Object.assign(state.tool, data.tool);
        }

        if (data.pressure) {
            Object.assign(state.pressure, data.pressure);
        }

        if (data.painting) {
            state.painting.charIndex = data.painting.charIndex ?? 0;
        }

        const currentWidth = state.canvas.width;
        const currentHeight = state.canvas.height;
        const restoredLayers = [];

        for (let i = 0; i < data.layers.items.length; i++) {
            const layerData = data.layers.items[i];
            const source = data._legacy
                ? layerData.dataURL
                : await this.dbGet(`layer-${i}`);

            const buffer = await this.deserializeBuffer(source, currentWidth, currentHeight);
            if (buffer) {
                restoredLayers.push({
                    id: layerData.id,
                    name: layerData.name,
                    visible: layerData.visible,
                    opacity: layerData.opacity ?? 1.0,
                    buffer,
                });
            }
        }

        if (restoredLayers.length > 0) {
            state.layers.items = restoredLayers;
            state.layers.activeIndex = Math.min(data.layers.activeIndex, restoredLayers.length - 1);
            state.layers.nextId = data.layers.nextId;
        } else {
            layersModule.initializeLayers(this.p);
        }

        if (data.ui?.layerDockCollapsed !== undefined) {
            if (data.ui.layerDockCollapsed) {
                layersModule.collapseDock();
            } else {
                layersModule.expandDock();
            }
        } else {
            layersModule.autoCollapseIfSmallScreen();
        }

        this.syncUI();
        layersModule.updateDock();

        if (data._legacy) {
            await this.saveNow();
            localStorage.removeItem(OLD_STORAGE_KEY);
        }

        return true;
    }

    syncUI() {
        const paintText = document.getElementById('paint-text');
        if (paintText) paintText.value = state.tool.text;

        const fontSearch = document.getElementById('font-search');
        if (fontSearch) fontSearch.value = state.tool.fontFamily;

        window.controlsModule?.syncContinueButton();

        const eraserBtn = document.getElementById('eraser-btn');
        const eraserOptions = document.getElementById('eraser-options');
        const container = document.getElementById('canvas-container');
        const isEraser = state.tool.mode === 'eraser';

        if (eraserBtn) eraserBtn.classList.toggle('active', isEraser);
        if (eraserOptions) eraserOptions.style.display = isEraser ? 'flex' : 'none';
        if (container) container.classList.toggle('eraser-mode', isEraser);

        const pressureBtn = document.getElementById('pressure-btn');
        if (pressureBtn) pressureBtn.classList.toggle('active', state.pressure.enabled);

        window.sliderInputModule?.syncFromState();

        colorPickerModule.updateToolbarSwatches();

        canvasModule.applyTransform();
        layersModule.updateDock();
    }

    async clear() {
        if (this.db) {
            const tx = this.db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).clear();
            await new Promise((resolve) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        }
        localStorage.removeItem(OLD_STORAGE_KEY);
    }
}

export const persistenceModule = new PersistenceModule();
