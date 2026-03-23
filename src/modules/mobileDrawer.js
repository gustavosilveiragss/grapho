import { i18n } from './i18n.js';
import { state } from './state.js';

class MobileDrawerModule {
    constructor() {
        this.drawer = null;
        this.backdrop = null;
        this.isOpen = false;
        this.currentType = null;
        this.startY = 0;
        this.currentY = 0;
        this.isDragging = false;
    }

    setup() {
        this.drawer = document.getElementById('mobile-drawer');
        this.backdrop = document.getElementById('drawer-backdrop');
        this.contentEl = document.getElementById('drawer-content');
        this.titleEl = this.drawer?.querySelector('.drawer-title');

        this.setupGestures();
        this.setupBackdrop();
        this.setupCloseButton();
        this.setupFABs();
        this.setupVH();
    }

    setupVH() {
        const setVH = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        window.addEventListener('resize', setVH);
        window.addEventListener('orientationchange', setVH);
        setVH();
    }

    setupGestures() {
        const handle = this.drawer?.querySelector('.drawer-handle');

        handle?.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: true });
        handle?.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        handle?.addEventListener('touchend', () => this.onTouchEnd());
    }

    onTouchStart(e) {
        this.isDragging = true;
        this.startY = e.touches[0].clientY;
        this.drawer.style.transition = 'none';
    }

    onTouchMove(e) {
        if (!this.isDragging) return;

        const deltaY = e.touches[0].clientY - this.startY;
        if (deltaY > 0) {
            e.preventDefault();
            this.currentY = deltaY;
            this.drawer.style.transform = `translateY(${deltaY}px)`;
        }
    }

    onTouchEnd() {
        if (!this.isDragging) return;

        this.drawer.style.transition = '';
        this.isDragging = false;

        if (this.currentY > 100) {
            this.close();
        } else {
            this.drawer.style.transform = 'translateY(0)';
        }

        this.currentY = 0;
    }

    setupBackdrop() {
        this.backdrop?.addEventListener('click', () => this.close());
    }

    setupCloseButton() {
        const closeBtn = document.getElementById('drawer-close');
        closeBtn?.addEventListener('click', () => this.close());
    }

    setupFABs() {
        const fabColor = document.getElementById('fab-color');
        const fabSymbols = document.getElementById('fab-symbols');
        const fabLayers = document.getElementById('fab-layers');

        fabColor?.addEventListener('click', () => this.open('color'));
        fabSymbols?.addEventListener('click', () => this.open('symbol'));
        fabLayers?.addEventListener('click', () => this.open('layer'));

        this.updateFabSwatch();
    }

    updateFabSwatch() {
        const fabSwatch = document.getElementById('fab-color-swatch');
        if (fabSwatch) {
            fabSwatch.style.background = state.tool.color || '#ffffff';
        }
    }

    isMobile() {
        return window.innerWidth <= 768;
    }

    open(dockType) {
        if (!this.isMobile()) return;

        this.currentType = dockType;

        const titles = {
            color: i18n.t('colorDock.title') || 'Cores',
            symbol: i18n.t('symbolDock.title') || 'Símbolos',
            layer: i18n.t('layers.title') || 'Camadas'
        };

        if (this.titleEl) {
            this.titleEl.textContent = titles[dockType] || '';
        }

        const dock = document.getElementById(`${dockType}-dock`);
        if (dock && this.contentEl) {
            this.contentEl.innerHTML = '';
            const clone = dock.cloneNode(true);
            clone.id = `drawer-${dockType}-content`;
            clone.classList.remove('hidden');
            clone.style.cssText = 'position: static; transform: none; display: block;';
            this.contentEl.appendChild(clone);

            this.rebindEvents(dockType, clone);
        }

        this.drawer?.classList.add('open');
        this.backdrop?.classList.add('visible');
        this.isOpen = true;
        document.body.style.overflow = 'hidden';

        if (typeof lucide !== 'undefined' && this.contentEl) {
            lucide.createIcons({ nodes: this.contentEl.querySelectorAll('[data-lucide]') });
        }
    }

    rebindEvents(dockType, container) {
        if (dockType === 'color') {
            this.rebindColorEvents(container);
        } else if (dockType === 'symbol') {
            this.rebindSymbolEvents(container);
        } else if (dockType === 'layer') {
            this.rebindLayerEvents(container);
        }
    }

    rebindColorEvents(container) {
        if (window.colorPickerModule) {
            window.colorPickerModule.activeType = 'text';
        }

        const picker = container.querySelector('input[type="color"]');
        const eyedropper = container.querySelector('.eyedropper-btn');
        const colorInput = container.querySelector('input[type="text"]');
        const swatches = container.querySelectorAll('.history-swatch');

        picker?.addEventListener('input', (e) => {
            window.colorPickerModule?.applyColor(e.target.value);
            this.updateFabSwatch();
        });

        eyedropper?.addEventListener('click', () => {
            window.colorPickerModule?.activateEyedropper();
            this.close();
        });

        colorInput?.addEventListener('change', (e) => {
            window.colorPickerModule?.applyColor(e.target.value);
            this.updateFabSwatch();
        });

        swatches.forEach(swatch => {
            swatch.addEventListener('click', () => {
                const color = swatch.dataset.color;
                if (color) {
                    window.colorPickerModule?.applyColor(color);
                    this.updateFabSwatch();
                }
            });
        });
    }

    rebindSymbolEvents(container) {
        const search = container.querySelector('#symbol-search, input[type="text"]');
        const cells = container.querySelectorAll('.item-cell');

        search?.addEventListener('input', (e) => {
            window.symbolPickerModule?.search(e.target.value);
            this.refreshDrawerContent('symbol');
        });

        cells.forEach(cell => {
            cell.addEventListener('click', () => {
                const symbol = cell.dataset.char || cell.textContent;
                window.symbolPickerModule?.selectItem(symbol);
            });
        });
    }

    rebindLayerEvents(container) {
        const addBtn = container.querySelector('#layer-add-btn, [id*="add"]');
        const removeBtn = container.querySelector('#layer-remove-btn, [id*="remove"]');
        const upBtn = container.querySelector('#layer-up-btn, [id*="up"]');
        const downBtn = container.querySelector('#layer-down-btn, [id*="down"]');
        const opacitySlider = container.querySelector('#layer-opacity, input[type="range"]');
        const layerItems = container.querySelectorAll('.layer-item');

        addBtn?.addEventListener('click', () => {
            window.layersModule?.addLayer();
            this.refreshDrawerContent('layer');
        });

        removeBtn?.addEventListener('click', () => {
            window.layersModule?.removeLayer(state.layers.activeIndex);
            this.refreshDrawerContent('layer');
        });

        upBtn?.addEventListener('click', () => {
            window.layersModule?.moveUp(state.layers.activeIndex);
            this.refreshDrawerContent('layer');
        });

        downBtn?.addEventListener('click', () => {
            window.layersModule?.moveDown(state.layers.activeIndex);
            this.refreshDrawerContent('layer');
        });

        opacitySlider?.addEventListener('input', (e) => {
            const opacity = parseInt(e.target.value) / 100;
            window.layersModule?.setOpacity(state.layers.activeIndex, opacity);
        });

        layerItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                window.layersModule?.setActive(index);
                this.refreshDrawerContent('layer');
            });
        });
    }

    refreshDrawerContent(dockType) {
        setTimeout(() => {
            const dock = document.getElementById(`${dockType}-dock`);
            if (dock && this.contentEl) {
                this.contentEl.innerHTML = '';
                const clone = dock.cloneNode(true);
                clone.id = `drawer-${dockType}-content`;
                clone.classList.remove('hidden');
                clone.style.cssText = 'position: static; transform: none; display: block;';
                this.contentEl.appendChild(clone);
                this.rebindEvents(dockType, clone);

                if (typeof lucide !== 'undefined' && this.contentEl) {
                    lucide.createIcons({ nodes: this.contentEl.querySelectorAll('[data-lucide]') });
                }
            }
        }, 50);
    }

    close() {
        this.drawer?.classList.remove('open');
        this.backdrop?.classList.remove('visible');
        this.isOpen = false;
        this.currentType = null;
        document.body.style.overflow = '';
    }
}

export const mobileDrawerModule = new MobileDrawerModule();
