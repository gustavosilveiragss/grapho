import { state } from './state.js';
import { mathUtils } from './mathUtils.js';
import { drawingModule } from './drawing.js';
import { historyModule } from './history.js';

const PATH_HISTORY = 6;
const ANGLE_BLEND = 0.5;

class PaintingModule {
    constructor() {
        this.throttleFrame = null;
    }

    setup() {
        const canvas = document.querySelector('#canvas-container canvas');
        if (!canvas) return;

        canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
        canvas.addEventListener('pointerup', (e) => this.onPointerEnd(e));
        canvas.addEventListener('pointerleave', (e) => this.onPointerEnd(e));
        canvas.style.touchAction = 'none';
    }

    onPointerDown(e) {
        if (state.canvas.spaceHeld || state.canvas.pinching) return;
        if (e.target !== document.querySelector('#canvas-container canvas')) return;

        const { x, y } = this.getPos(e);
        state.painting.isActive = true;
        state.painting.pathPoints = [{ x, y }];
        state.painting.lastPlacedPos = { x, y };
        state.painting.smoothedAngle = 0;

        if (!state.tool.continueFromLast) {
            state.painting.charIndex = 0;
        }

        document.activeElement?.blur();
        e.preventDefault();
    }

    onPointerMove(e) {
        if (!state.painting.isActive || state.canvas.pinching) return;
        e.preventDefault();

        if (this.throttleFrame) return;
        this.throttleFrame = requestAnimationFrame(() => {
            this.throttleFrame = null;
            const { x, y } = this.getPos(e);
            this.continueStroke(x, y);
        });
    }

    onPointerEnd(e) {
        if (!state.painting.isActive) return;
        state.painting.isActive = false;

        if (state.liveChars.length > 0) {
            drawingModule.commitToBuffer(state.liveChars);
            historyModule.saveSnapshot();
            state.liveChars = [];
            window.redraw();
        }
    }

    getPos(e) {
        const rect = e.target.getBoundingClientRect();
        const scaleX = state.canvas.width / rect.width;
        const scaleY = state.canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    }

    continueStroke(x, y) {
        const { painting, tool } = state;
        const current = { x, y };

        painting.pathPoints.push(current);
        if (painting.pathPoints.length > PATH_HISTORY) {
            painting.pathPoints.shift();
        }

        if (!painting.lastPlacedPos) return;

        const dist = mathUtils.distance(painting.lastPlacedPos, current);
        const minSpacing = tool.fontSize * tool.spacing;

        if (dist < minSpacing) return;

        const text = tool.text;
        if (!text.length) return;

        const numChars = Math.floor(dist / minSpacing);

        for (let i = 1; i <= numChars; i++) {
            const t = i / numChars;
            const cx = mathUtils.lerp(painting.lastPlacedPos.x, x, t);
            const cy = mathUtils.lerp(painting.lastPlacedPos.y, y, t);

            const rawAngle = mathUtils.angleFromLastSegments(painting.pathPoints, PATH_HISTORY);
            const readableAngle = mathUtils.makeReadable(rawAngle);
            const finalAngle = mathUtils.lerpAngle(painting.smoothedAngle, readableAngle, ANGLE_BLEND);
            painting.smoothedAngle = finalAngle;

            const char = text[painting.charIndex % text.length];
            painting.charIndex = (painting.charIndex + 1) % text.length;

            state.liveChars.push({
                char,
                x: cx,
                y: cy,
                angle: finalAngle,
                font: tool.fontFamily,
                size: tool.fontSize,
                color: tool.color,
                strokeWeight: tool.strokeWeight,
            });

            painting.lastPlacedPos = { x: cx, y: cy };
        }

        window.redraw();
    }
}

export const paintingModule = new PaintingModule();
