import { state } from './state.js';
import { layersModule } from './layers.js';

class CanvasModule {
    constructor() {
        this.pinchStartDist = 0;
        this.pinchStartZoom = 1;
        this.pinchStartPanX = 0;
        this.pinchStartPanY = 0;
        this.pinchStartMid = null;
        this.pinchStartAngle = 0;
        this.pinchStartRotation = 0;
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

        p.noLoop();

        this.tx = (container.clientWidth - w) / 2;
        this.ty = (container.clientHeight - h) / 2;

        this.setupZoom();
        this.setupPan();
        this.setupRotationReset();
        this.applyTransform();
    }

    setupZoom() {
        const container = document.getElementById('canvas-container');

        container.addEventListener('wheel', (e) => {
            if (e.altKey) {
                e.preventDefault();
                const step = e.deltaY > 0 ? 0.05 : -0.05;

                const rect = container.getBoundingClientRect();
                const cx = rect.width / 2;
                const cy = rect.height / 2;
                const canvasPoint = this.screenToCanvas(cx, cy);

                state.canvas.rotation += step;

                const cos = Math.cos(state.canvas.rotation);
                const sin = Math.sin(state.canvas.rotation);
                const zoom = state.canvas.zoom;
                this.tx = cx - (canvasPoint.x * zoom * cos - canvasPoint.y * zoom * sin);
                this.ty = cy - (canvasPoint.x * zoom * sin + canvasPoint.y * zoom * cos);

                this.applyTransform();
                return;
            }

            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();

            const rect = container.getBoundingClientRect();
            const cursorX = e.clientX - rect.left;
            const cursorY = e.clientY - rect.top;

            const canvasPoint = this.screenToCanvas(cursorX, cursorY);

            const factor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.min(5, Math.max(0.1, state.canvas.zoom * factor));
            state.canvas.zoom = newZoom;

            const cos = Math.cos(state.canvas.rotation);
            const sin = Math.sin(state.canvas.rotation);
            this.tx = cursorX - (canvasPoint.x * newZoom * cos - canvasPoint.y * newZoom * sin);
            this.ty = cursorY - (canvasPoint.x * newZoom * sin + canvasPoint.y * newZoom * cos);

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
                this.pinchStartAngle = this.touchAngle(e.touches);
                this.pinchStartRotation = state.canvas.rotation;
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
                const rect = container.getBoundingClientRect();

                const midX = mid.x - rect.left;
                const midY = mid.y - rect.top;
                const startMidX = this.pinchStartMid.x - rect.left;
                const startMidY = this.pinchStartMid.y - rect.top;

                const angleDelta = this.touchAngle(e.touches) - this.pinchStartAngle;
                const newRotation = this.pinchStartRotation + angleDelta;
                const newZoom = Math.min(5, Math.max(0.1, this.pinchStartZoom * (dist / this.pinchStartDist)));

                const cosStart = Math.cos(-this.pinchStartRotation);
                const sinStart = Math.sin(-this.pinchStartRotation);
                const dx = startMidX - this.pinchStartPanX;
                const dy = startMidY - this.pinchStartPanY;
                const canvasPointX = (dx * cosStart - dy * sinStart) / this.pinchStartZoom;
                const canvasPointY = (dx * sinStart + dy * cosStart) / this.pinchStartZoom;

                const cosNew = Math.cos(newRotation);
                const sinNew = Math.sin(newRotation);
                this.tx = midX - (canvasPointX * newZoom * cosNew - canvasPointY * newZoom * sinNew);
                this.ty = midY - (canvasPointX * newZoom * sinNew + canvasPointY * newZoom * cosNew);

                state.canvas.zoom = newZoom;
                state.canvas.rotation = newRotation;

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

    setupRotationReset() {
        document.addEventListener('keydown', (e) => {
            if (e.key === '0' && !this.isInputFocused()) {
                state.canvas.rotation = 0;
                this.applyTransform();
            }
        });

        const resetBtn = document.getElementById('rotation-indicator');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                state.canvas.rotation = 0;
                this.applyTransform();
            });
        }
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

    touchAngle(touches) {
        return Math.atan2(
            touches[1].clientY - touches[0].clientY,
            touches[1].clientX - touches[0].clientX
        );
    }

    screenToCanvas(sx, sy) {
        const dx = sx - this.tx;
        const dy = sy - this.ty;
        const angle = -state.canvas.rotation;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: (dx * cos - dy * sin) / state.canvas.zoom,
            y: (dx * sin + dy * cos) / state.canvas.zoom,
        };
    }

    canvasToScreen(cx, cy) {
        const zoom = state.canvas.zoom;
        const cos = Math.cos(state.canvas.rotation);
        const sin = Math.sin(state.canvas.rotation);
        return {
            x: (cx * zoom * cos - cy * zoom * sin) + this.tx,
            y: (cx * zoom * sin + cy * zoom * cos) + this.ty,
        };
    }

    applyTransform() {
        const canvas = document.querySelector('#canvas-container canvas');
        if (canvas) {
            const deg = state.canvas.rotation * (180 / Math.PI);
            canvas.style.transformOrigin = '0 0';
            canvas.style.transform = `translate(${this.tx}px, ${this.ty}px) rotate(${deg}deg) scale(${state.canvas.zoom})`;
        }
        this.updateRotationIndicator();
        window.persistenceModule?.scheduleSave();
    }

    updateRotationIndicator() {
        const el = document.getElementById('rotation-value');
        if (!el) return;
        let deg = (state.canvas.rotation * (180 / Math.PI)) % 360;
        if (deg > 180) deg -= 360;
        if (deg < -180) deg += 360;
        el.textContent = `${Math.round(deg * 10) / 10}°`;
    }

    handleResize() {
        this.applyTransform();
    }
}

export const canvasModule = new CanvasModule();
