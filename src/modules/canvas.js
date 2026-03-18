import { state } from './state.js';

class CanvasModule {
    constructor() {
        this.pinchStartDist = 0;
        this.pinchStartZoom = 1;
        this.pinchStartPanX = 0;
        this.pinchStartPanY = 0;
        this.pinchStartMid = null;
        this.isPanning = false;
        this.panLastX = 0;
        this.panLastY = 0;
        this.tx = 0;
        this.ty = 0;
    }

    setup(p) {
        this.p = p;

        const container = document.getElementById('canvas-container');
        const w = container.clientWidth;
        const h = container.clientHeight;
        const density = Math.min(5, Math.max(3, window.devicePixelRatio));

        state.canvas.width = w;
        state.canvas.height = h;

        p.pixelDensity(density);
        const canvas = p.createCanvas(w, h);
        canvas.parent('canvas-container');

        state.buffer = p.createGraphics(w, h);
        state.buffer.pixelDensity(density);

        p.noLoop();

        this.tx = (container.clientWidth - w) / 2;
        this.ty = (container.clientHeight - h) / 2;

        this.setupZoom();
        this.setupPan();
        this.applyTransform();
    }

    setupZoom() {
        const container = document.getElementById('canvas-container');

        container.addEventListener('wheel', (e) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();

            const rect = container.getBoundingClientRect();
            const cursorX = e.clientX - rect.left;
            const cursorY = e.clientY - rect.top;

            const canvasPointX = (cursorX - this.tx) / state.canvas.zoom;
            const canvasPointY = (cursorY - this.ty) / state.canvas.zoom;

            const factor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.min(5, Math.max(0.1, state.canvas.zoom * factor));

            this.tx = cursorX - canvasPointX * newZoom;
            this.ty = cursorY - canvasPointY * newZoom;
            state.canvas.zoom = newZoom;

            this.applyTransform();
        }, { passive: false });

        container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                state.canvas.pinching = true;
                state.painting.isActive = false;
                this.pinchStartDist = this.touchDist(e.touches);
                this.pinchStartZoom = state.canvas.zoom;
                this.pinchStartPanX = this.tx;
                this.pinchStartPanY = this.ty;
                this.pinchStartMid = this.touchMid(e.touches);
            }
        }, { passive: false });

        container.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) {
                state.canvas.pinching = false;
            }
        });

        container.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const dist = this.touchDist(e.touches);
                const mid = this.touchMid(e.touches);
                const container = document.getElementById('canvas-container');
                const rect = container.getBoundingClientRect();

                const midX = mid.x - rect.left;
                const midY = mid.y - rect.top;
                const startMidX = this.pinchStartMid.x - rect.left;
                const startMidY = this.pinchStartMid.y - rect.top;

                const canvasPointX = (startMidX - this.pinchStartPanX) / this.pinchStartZoom;
                const canvasPointY = (startMidY - this.pinchStartPanY) / this.pinchStartZoom;

                const newZoom = Math.min(5, Math.max(0.1, this.pinchStartZoom * (dist / this.pinchStartDist)));

                this.tx = midX - canvasPointX * newZoom;
                this.ty = midY - canvasPointY * newZoom;
                state.canvas.zoom = newZoom;

                this.applyTransform();
            }
        }, { passive: false });
    }

    setupPan() {
        const container = document.getElementById('canvas-container');

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.repeat && !this.isInputFocused()) {
                e.preventDefault();
                state.canvas.spaceHeld = true;
                container.style.cursor = 'grab';
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                state.canvas.spaceHeld = false;
                this.isPanning = false;
                container.style.cursor = 'crosshair';
            }
        });

        container.addEventListener('pointerdown', (e) => {
            if (!state.canvas.spaceHeld) return;
            e.preventDefault();
            e.stopPropagation();
            this.isPanning = true;
            this.panLastX = e.clientX;
            this.panLastY = e.clientY;
            container.style.cursor = 'grabbing';
            container.setPointerCapture(e.pointerId);
        }, true);

        container.addEventListener('pointermove', (e) => {
            if (!this.isPanning) return;
            e.preventDefault();
            e.stopPropagation();
            this.tx += e.clientX - this.panLastX;
            this.ty += e.clientY - this.panLastY;
            this.panLastX = e.clientX;
            this.panLastY = e.clientY;
            this.applyTransform();
        }, true);

        container.addEventListener('pointerup', (e) => {
            if (!this.isPanning) return;
            this.isPanning = false;
            container.style.cursor = state.canvas.spaceHeld ? 'grab' : 'crosshair';
        }, true);
    }

    isInputFocused() {
        const tag = document.activeElement?.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA';
    }

    touchDist(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    touchMid(touches) {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2,
        };
    }

    applyTransform() {
        const canvas = document.querySelector('#canvas-container canvas');
        if (canvas) {
            canvas.style.transformOrigin = '0 0';
            canvas.style.transform = `translate(${this.tx}px, ${this.ty}px) scale(${state.canvas.zoom})`;
        }
    }

    handleResize() {
        this.applyTransform();
    }
}

export const canvasModule = new CanvasModule();
