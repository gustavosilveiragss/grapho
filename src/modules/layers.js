import { state } from './state.js';
import { i18n } from './i18n.js';

class LayersModule {
    constructor() {
        this.p = null;
    }

    setup(p) {
        this.p = p;
        this.setupEventListeners();
        this.updateDock();
    }

    createLayer() {
        if (!this.p) return null;

        const { width, height } = state.canvas;
        const density = Math.min(5, Math.max(3, window.devicePixelRatio));

        const buffer = this.p.createGraphics(width, height);
        buffer.pixelDensity(density);

        const layer = {
            id: state.layers.nextId++,
            name: `${i18n.t('layers.layer')} ${state.layers.items.length}`,
            buffer,
            visible: true,
        };

        return layer;
    }

    initializeLayers(p) {
        this.p = p;

        const layer0 = this.createLayer();
        const layer1 = this.createLayer();

        state.layers.items = [layer0, layer1];
        state.layers.activeIndex = 0;
    }

    addLayer() {
        if (state.layers.items.length >= state.layers.maxLayers) return;

        const layer = this.createLayer();
        if (!layer) return;

        state.layers.items.push(layer);
        state.layers.activeIndex = state.layers.items.length - 1;

        this.updateDock();
        window.redraw();
    }

    removeLayer(index) {
        if (index === 0) return;
        if (index < 0 || index >= state.layers.items.length) return;

        const confirmed = window.confirm(i18n.t('layers.confirmDelete'));
        if (!confirmed) return;

        const layer = state.layers.items[index];
        if (layer.buffer) {
            layer.buffer.remove();
        }

        state.layers.items.splice(index, 1);

        if (state.layers.activeIndex >= state.layers.items.length) {
            state.layers.activeIndex = state.layers.items.length - 1;
        } else if (state.layers.activeIndex > index) {
            state.layers.activeIndex--;
        }

        this.updateDock();
        window.redraw();
    }

    setActive(index) {
        if (index < 0 || index >= state.layers.items.length) return;

        state.layers.activeIndex = index;
        this.updateDock();
    }

    toggleVisibility(index) {
        if (index < 0 || index >= state.layers.items.length) return;

        state.layers.items[index].visible = !state.layers.items[index].visible;
        this.updateDock();
        window.redraw();
    }

    moveUp(index) {
        if (index < 0 || index >= state.layers.items.length - 1) return;

        const temp = state.layers.items[index];
        state.layers.items[index] = state.layers.items[index + 1];
        state.layers.items[index + 1] = temp;

        if (state.layers.activeIndex === index) {
            state.layers.activeIndex = index + 1;
        } else if (state.layers.activeIndex === index + 1) {
            state.layers.activeIndex = index;
        }

        this.updateDock();
        window.redraw();
    }

    moveDown(index) {
        if (index <= 0 || index >= state.layers.items.length) return;

        const temp = state.layers.items[index];
        state.layers.items[index] = state.layers.items[index - 1];
        state.layers.items[index - 1] = temp;

        if (state.layers.activeIndex === index) {
            state.layers.activeIndex = index - 1;
        } else if (state.layers.activeIndex === index - 1) {
            state.layers.activeIndex = index;
        }

        this.updateDock();
        window.redraw();
    }

    getActiveBuffer() {
        const layer = state.layers.items[state.layers.activeIndex];
        return layer?.buffer || null;
    }

    collapseDock() {
        const dock = document.getElementById('layer-dock');
        if (dock) {
            dock.classList.add('hidden');
        }
    }

    expandDock() {
        const dock = document.getElementById('layer-dock');
        if (dock) {
            dock.classList.remove('hidden');
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({ nodes: [dock] });
            }
        }
    }

    toggleDock() {
        const dock = document.getElementById('layer-dock');
        if (dock?.classList.contains('hidden')) {
            this.expandDock();
        } else {
            this.collapseDock();
        }
    }

    isCollapsed() {
        const dock = document.getElementById('layer-dock');
        return dock?.classList.contains('hidden') ?? false;
    }

    isMobile() {
        return window.innerWidth <= 768;
    }

    setupEventListeners() {
        const addBtn = document.getElementById('layer-add-btn');
        const removeBtn = document.getElementById('layer-remove-btn');
        const upBtn = document.getElementById('layer-up-btn');
        const downBtn = document.getElementById('layer-down-btn');

        addBtn?.addEventListener('click', () => this.addLayer());
        removeBtn?.addEventListener('click', () => this.removeLayer(state.layers.activeIndex));
        upBtn?.addEventListener('click', () => this.moveUp(state.layers.activeIndex));
        downBtn?.addEventListener('click', () => this.moveDown(state.layers.activeIndex));

        const toggleBtn = document.getElementById('layer-dock-toggle');
        toggleBtn?.addEventListener('click', () => this.toggleDock());
    }

    updateDock() {
        const list = document.getElementById('layer-list');
        if (!list) return;

        list.innerHTML = '';

        for (let i = state.layers.items.length - 1; i >= 0; i--) {
            const layer = state.layers.items[i];
            const isActive = i === state.layers.activeIndex;

            const item = document.createElement('div');
            item.className = `layer-item${isActive ? ' active' : ''}`;
            item.dataset.index = i;

            const visBtn = document.createElement('button');
            visBtn.className = 'layer-visibility';
            visBtn.dataset.visible = layer.visible;
            visBtn.innerHTML = layer.visible
                ? '<i data-lucide="eye"></i>'
                : '<i data-lucide="eye-off"></i>';
            visBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleVisibility(i);
            });

            const thumb = document.createElement('div');
            thumb.className = 'layer-thumbnail';
            this.renderThumbnail(layer, thumb);

            const num = document.createElement('span');
            num.className = 'layer-number';
            num.textContent = i;

            item.appendChild(visBtn);
            item.appendChild(thumb);
            item.appendChild(num);

            item.addEventListener('click', () => this.setActive(i));

            list.appendChild(item);
        }

        if (state.layers.items.length > 6) {
            list.classList.add('scrollable');
        } else {
            list.classList.remove('scrollable');
        }

        this.updateButtons();

        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ nodes: [list] });
        }
    }

    updateButtons() {
        const addBtn = document.getElementById('layer-add-btn');
        const removeBtn = document.getElementById('layer-remove-btn');
        const upBtn = document.getElementById('layer-up-btn');
        const downBtn = document.getElementById('layer-down-btn');

        const activeIndex = state.layers.activeIndex;
        const count = state.layers.items.length;

        if (addBtn) {
            addBtn.disabled = count >= state.layers.maxLayers;
        }

        if (removeBtn) {
            removeBtn.disabled = activeIndex === 0;
        }

        if (upBtn) {
            upBtn.disabled = activeIndex === count - 1;
        }

        if (downBtn) {
            downBtn.disabled = activeIndex === 0;
        }
    }

    renderThumbnail(layer, container) {
        if (!layer.buffer) return;

        const aspect = state.canvas.width / state.canvas.height;
        const thumbWidth = 96;
        const thumbHeight = Math.round(thumbWidth / aspect);

        const canvas = document.createElement('canvas');
        canvas.width = thumbWidth;
        canvas.height = thumbHeight;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = state.canvas.bgColor;
        ctx.fillRect(0, 0, thumbWidth, thumbHeight);

        const srcCanvas = layer.buffer.elt || layer.buffer.canvas;
        if (srcCanvas) {
            ctx.drawImage(srcCanvas, 0, 0, thumbWidth, thumbHeight);
        }

        container.appendChild(canvas);
    }

    refreshThumbnails() {
        this.updateDock();
    }
}

export const layersModule = new LayersModule();
