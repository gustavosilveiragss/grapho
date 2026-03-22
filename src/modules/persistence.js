import { state } from './state.js';
import { canvasModule } from './canvas.js';
import { layersModule } from './layers.js';
import { colorPickerModule } from './colorPicker.js';
import { i18n } from './i18n.js';

const STORAGE_KEY = 'grapho-state';
const VERSION = 1;

class PersistenceModule {
    constructor() {
        this.p = null;
        this.saveDebounceTimer = null;
        this.SAVE_DEBOUNCE_MS = 500;
    }

    setup(p) {
        this.p = p;
    }

    serializeBuffer(buffer) {
        if (!buffer) return null;
        try {
            const canvas = buffer.elt || buffer.canvas;
            return canvas.toDataURL('image/png');
        } catch (e) {
            return null;
        }
    }

    async deserializeBuffer(dataURL, width, height, savedLogicalWidth, savedLogicalHeight) {
        if (!dataURL || !this.p) return null;

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const currentDensity = Math.min(5, Math.max(3, window.devicePixelRatio));
                const buffer = this.p.createGraphics(width, height);
                buffer.pixelDensity(currentDensity);

                const canvas = buffer.elt || buffer.canvas;
                const ctx = canvas.getContext('2d');

                const destWidth = savedLogicalWidth * currentDensity;
                const destHeight = savedLogicalHeight * currentDensity;

                ctx.drawImage(img, 0, 0, destWidth, destHeight);

                resolve(buffer);
            };
            img.onerror = () => resolve(null);
            img.src = dataURL;
        });
    }

    captureState() {
        const density = Math.min(5, Math.max(3, window.devicePixelRatio));
        return {
            version: VERSION,
            canvas: {
                width: state.canvas.width,
                height: state.canvas.height,
                density: density,
                bgColor: state.canvas.bgColor,
                zoom: state.canvas.zoom,
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
            layers: {
                items: state.layers.items.map(layer => ({
                    id: layer.id,
                    name: layer.name,
                    visible: layer.visible,
                    opacity: layer.opacity ?? 1.0,
                    dataURL: this.serializeBuffer(layer.buffer),
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

    saveNow() {
        try {
            const data = this.captureState();
            const json = JSON.stringify(data);
            localStorage.setItem(STORAGE_KEY, json);
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                console.warn('localStorage quota exceeded');
            }
        }
    }

    load() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return null;

            const data = JSON.parse(stored);
            if (!data || data.version !== VERSION) return null;

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
            canvasModule.tx = data.canvas.panX ?? canvasModule.tx;
            canvasModule.ty = data.canvas.panY ?? canvasModule.ty;
        }

        if (data.tool) {
            Object.assign(state.tool, data.tool);
        }

        if (data.pressure) {
            Object.assign(state.pressure, data.pressure);
        }

        if (data.ui?.layerDockCollapsed) {
            layersModule.collapseDock();
        }

        this.syncUI();
        return true;
    }

    // TODO: fix pixelDensity scaling
    async restoreState(data) {
        if (!data || !this.p) return false;

        state.canvas.bgColor = data.canvas.bgColor;
        state.canvas.zoom = data.canvas.zoom;
        canvasModule.tx = data.canvas.panX;
        canvasModule.ty = data.canvas.panY;

        Object.assign(state.tool, data.tool);
        Object.assign(state.pressure, data.pressure);

        const currentWidth = state.canvas.width;
        const currentHeight = state.canvas.height;
        const savedLogicalWidth = data.canvas.width || currentWidth;
        const savedLogicalHeight = data.canvas.height || currentHeight;

        const restoredLayers = [];

        for (const layerData of data.layers.items) {
            const buffer = await this.deserializeBuffer(
                layerData.dataURL,
                currentWidth,
                currentHeight,
                savedLogicalWidth,
                savedLogicalHeight
            );
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
        }

        if (data.ui?.layerDockCollapsed) {
            layersModule.collapseDock();
        }

        return true;
    }

    syncUI() {
        const paintText = document.getElementById('paint-text');
        if (paintText) paintText.value = state.tool.text;

        const fontSearch = document.getElementById('font-search');
        if (fontSearch) fontSearch.value = state.tool.fontFamily;

        const fontSize = document.getElementById('font-size');
        if (fontSize) fontSize.value = state.tool.fontSize;

        const spacing = document.getElementById('spacing');
        if (spacing) spacing.value = state.tool.spacing;

        const strokeWeight = document.getElementById('stroke-weight');
        if (strokeWeight) strokeWeight.value = state.tool.strokeWeight;

        const eraserRadius = document.getElementById('eraser-radius');
        if (eraserRadius) eraserRadius.value = state.tool.eraserRadius;

        const pressureMin = document.getElementById('pressure-min');
        if (pressureMin) pressureMin.value = state.pressure.minMultiplier;

        const pressureMax = document.getElementById('pressure-max');
        if (pressureMax) pressureMax.value = state.pressure.maxMultiplier;

        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.classList.toggle('active', state.tool.continueFromLast);
            const span = continueBtn.querySelector('[data-i18n]');
            if (span) {
                const key = state.tool.continueFromLast ? 'toolbar.continue' : 'toolbar.restart';
                span.setAttribute('data-i18n', key);
                span.textContent = i18n.t(key);
            }
            const icon = continueBtn.querySelector('[data-lucide]');
            if (icon && typeof lucide !== 'undefined') {
                icon.setAttribute('data-lucide', state.tool.continueFromLast ? 'repeat' : 'rotate-ccw');
                lucide.createIcons({ nodes: [icon] });
            }
        }

        const eraserBtn = document.getElementById('eraser-btn');
        const eraserOptions = document.getElementById('eraser-options');
        const container = document.getElementById('canvas-container');
        const isEraser = state.tool.mode === 'eraser';

        if (eraserBtn) eraserBtn.classList.toggle('active', isEraser);
        if (eraserOptions) eraserOptions.style.display = isEraser ? 'flex' : 'none';
        if (container) container.classList.toggle('eraser-mode', isEraser);

        const pressureBtn = document.getElementById('pressure-btn');
        if (pressureBtn) pressureBtn.classList.toggle('active', state.pressure.enabled);

        colorPickerModule.updateToolbarSwatches();

        canvasModule.applyTransform();
        layersModule.updateDock();
    }

    clear() {
        localStorage.removeItem(STORAGE_KEY);
    }
}

export const persistenceModule = new PersistenceModule();
