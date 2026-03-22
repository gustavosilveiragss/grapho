import { state } from './state.js';
import { i18n } from './i18n.js';
import { layersModule } from './layers.js';
import { persistenceModule } from './persistence.js';

const STORAGE_KEY = 'ascii-paint-color-history';

class ColorPickerModule {
    constructor() {
        this.activeType = null;
        this.canvasSamplingActive = false;
        this.samplingType = null;
        this.debounceTimer = null;
    }

    setup() {
        this.loadColorHistory();
        this.setupToolbarSwatches();
        this.setupDockControls();
        this.setupClickOutside();
        this.renderColorHistory();
        this.updateToolbarSwatches();
    }

    loadColorHistory() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                state.colorHistory.colors = JSON.parse(stored);
            }
        } catch (e) {
            state.colorHistory.colors = [];
        }
    }

    saveColorHistory() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.colorHistory.colors));
        } catch (e) {}
    }

    addToHistory(color) {
        const normalized = color.toLowerCase();
        const colors = state.colorHistory.colors;

        const existingIndex = colors.indexOf(normalized);
        if (existingIndex !== -1) {
            colors.splice(existingIndex, 1);
        }

        colors.unshift(normalized);

        if (colors.length > state.colorHistory.maxColors) {
            colors.pop();
        }

        this.saveColorHistory();
        this.renderColorHistory();
    }

    setupToolbarSwatches() {
        const textSwatch = document.getElementById('text-color-swatch');
        const bgSwatch = document.getElementById('bg-color-swatch');

        if (textSwatch) {
            textSwatch.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openDock('text');
            });
        }

        if (bgSwatch) {
            bgSwatch.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openDock('bg');
            });
        }
    }

    setupDockControls() {
        const nativePicker = document.getElementById('native-color-picker');
        const dockSwatch = document.getElementById('dock-color-swatch');
        const hexInput = document.getElementById('active-color-input');
        const eyedropper = document.getElementById('active-eyedropper');

        if (dockSwatch && nativePicker) {
            dockSwatch.addEventListener('click', () => {
                nativePicker.click();
            });
        }

        if (nativePicker) {
            nativePicker.addEventListener('input', (e) => {
                this.updatePreview(e.target.value);
                this.debouncedApply(e.target.value);
            });
        }

        if (hexInput) {
            hexInput.addEventListener('input', (e) => {
                let value = e.target.value.trim();
                if (!value.startsWith('#')) {
                    value = '#' + value;
                }
                if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                    this.updatePreview(value);
                    this.debouncedApply(value);
                }
            });
        }

        if (eyedropper) {
            eyedropper.addEventListener('click', () => this.activateEyedropper());
        }

        const dock = document.getElementById('color-dock');
        if (dock) {
            dock.addEventListener('click', (e) => e.stopPropagation());
        }
    }

    debouncedApply(color) {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.applyColor(color);
        }, 400);
    }

    updatePreview(color) {
        const hexInput = document.getElementById('active-color-input');
        const nativePicker = document.getElementById('native-color-picker');
        const dockSwatch = document.getElementById('dock-color-swatch');

        if (hexInput && hexInput.value !== color) hexInput.value = color;
        if (nativePicker && nativePicker.value !== color) nativePicker.value = color;
        if (dockSwatch) dockSwatch.style.backgroundColor = color;
    }

    setupClickOutside() {
        document.addEventListener('click', () => {
            const dock = document.getElementById('color-dock');
            if (dock && !dock.classList.contains('hidden')) {
                this.closeDock();
            }
        });
    }

    openDock(type) {
        if (window.innerWidth <= 768) {
            layersModule.collapseDock();
        }

        this.activeType = type;
        const dock = document.getElementById('color-dock');
        const label = document.getElementById('color-dock-label');
        const hexInput = document.getElementById('active-color-input');
        const nativePicker = document.getElementById('native-color-picker');
        const dockSwatch = document.getElementById('dock-color-swatch');
        const textSwatch = document.getElementById('text-color-swatch');
        const bgSwatch = document.getElementById('bg-color-swatch');

        const color = type === 'text' ? state.tool.color : state.canvas.bgColor;

        if (label) label.textContent = i18n.t(type === 'text' ? 'colorDock.textColor' : 'colorDock.bgColor');
        if (hexInput) hexInput.value = color;
        if (nativePicker) nativePicker.value = color;
        if (dockSwatch) dockSwatch.style.backgroundColor = color;

        if (type === 'text') {
            textSwatch?.classList.add('active');
            bgSwatch?.classList.remove('active');
        } else {
            bgSwatch?.classList.add('active');
            textSwatch?.classList.remove('active');
        }

        if (dock) {
            dock.classList.remove('hidden');
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({ nodes: dock.querySelectorAll('[data-lucide]') });
            }
        }
    }

    closeDock() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }

        const dock = document.getElementById('color-dock');
        const textSwatch = document.getElementById('text-color-swatch');
        const bgSwatch = document.getElementById('bg-color-swatch');

        if (dock) {
            dock.classList.add('hidden');
        }

        textSwatch?.classList.remove('active');
        bgSwatch?.classList.remove('active');
        this.activeType = null;
    }

    async activateEyedropper() {
        if (!this.activeType) return;
        const savedType = this.activeType;

        if ('EyeDropper' in window) {
            try {
                const eyeDropper = new EyeDropper();
                const result = await eyeDropper.open();
                this.activeType = savedType;
                this.applyColor(result.sRGBHex);
                this.closeDock();
            } catch (e) {}
        } else {
            this.enableCanvasSamplingMode();
        }
    }

    enableCanvasSamplingMode() {
        this.canvasSamplingActive = true;
        const savedType = this.activeType;
        this.samplingType = savedType;
        this.closeDock();

        const container = document.getElementById('canvas-container');
        if (container) {
            container.classList.add('eyedropper-mode');
            container.addEventListener('click', this.handleCanvasSample, { once: true });
        }
    }

    handleCanvasSample = (e) => {
        if (!this.canvasSamplingActive || !this.samplingType) return;

        const container = document.getElementById('canvas-container');
        const canvas = container?.querySelector('canvas');

        if (canvas && state.buffer) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            const x = Math.floor((e.clientX - rect.left) * scaleX);
            const y = Math.floor((e.clientY - rect.top) * scaleY);

            const color = this.sampleCanvasColor(x, y);
            if (color) {
                this.activeType = this.samplingType;
                this.applyColor(color);
            }
        }

        this.disableCanvasSamplingMode();
    }

    sampleCanvasColor(x, y) {
        const buf = state.buffer;
        if (!buf) return null;

        buf.loadPixels();
        const d = buf.pixelDensity();
        const idx = 4 * (y * d * buf.width * d + x * d);

        const r = buf.pixels[idx];
        const g = buf.pixels[idx + 1];
        const b = buf.pixels[idx + 2];

        if (r === undefined) return null;

        return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    }

    disableCanvasSamplingMode() {
        this.canvasSamplingActive = false;
        const container = document.getElementById('canvas-container');
        if (container) {
            container.classList.remove('eyedropper-mode');
            container.removeEventListener('click', this.handleCanvasSample);
        }
    }

    applyColor(color) {
        if (this.activeType === 'text') {
            state.tool.color = color;
        } else if (this.activeType === 'bg') {
            state.canvas.bgColor = color;
            layersModule.refreshThumbnails();
            window.redraw?.();
        }

        this.addToHistory(color);
        this.updateToolbarSwatches();
        persistenceModule.scheduleSave();
    }

    updateToolbarSwatches() {
        const textSwatch = document.getElementById('text-color-swatch');
        const bgSwatch = document.getElementById('bg-color-swatch');

        if (textSwatch) {
            textSwatch.style.backgroundColor = state.tool.color;
            this.updateSwatchIconColor(textSwatch, state.tool.color);
        }

        if (bgSwatch) {
            bgSwatch.style.backgroundColor = state.canvas.bgColor;
            this.updateSwatchIconColor(bgSwatch, state.canvas.bgColor);
        }
    }

    updateSwatchIconColor(swatch, bgColor) {
        const icon = swatch.querySelector('.lucide, svg');
        if (!icon) return;

        const isLight = this.isColorLight(bgColor);
        icon.style.stroke = isLight ? '#000000' : '#ffffff';
    }

    isColorLight(hex) {
        const color = hex.replace('#', '');
        const r = parseInt(color.substring(0, 2), 16);
        const g = parseInt(color.substring(2, 4), 16);
        const b = parseInt(color.substring(4, 6), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5;
    }

    renderColorHistory() {
        const container = document.getElementById('color-history');
        if (!container) return;

        container.innerHTML = '';

        state.colorHistory.colors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'history-swatch';
            swatch.style.backgroundColor = color;
            swatch.title = color;
            swatch.addEventListener('click', () => {
                this.applyColor(color);
                this.closeDock();
            });
            container.appendChild(swatch);
        });
    }
}

export const colorPickerModule = new ColorPickerModule();
