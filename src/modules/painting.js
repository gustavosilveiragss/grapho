import { state } from './state.js';
import { mathUtils } from './mathUtils.js';
import { drawingModule } from './drawing.js';
import { historyModule } from './history.js';
import { layersModule } from './layers.js';
import { persistenceModule } from './persistence.js';

const PATH_HISTORY = 12;
const ANGLE_BLEND = 0.5;

function getGraphemeClusters(text) {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
        return [...segmenter.segment(text)].map(s => s.segment);
    }
    return Array.from(text);
}

class PaintingModule {
    constructor() {
        this.throttleFrame = null;
        this.eraserPos = null;
        this.erasedThisStroke = false;
        this.savedSnapshotThisStroke = false;
        this.currentPressure = 0.5;
    }

    setup() {
        const canvas = document.querySelector('#canvas-container canvas');
        if (!canvas) return;

        canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
        canvas.addEventListener('pointerup', (e) => this.onPointerEnd(e));
        canvas.addEventListener('pointerleave', (e) => this.onPointerLeave(e));
        canvas.style.touchAction = 'none';
    }

    onPointerLeave(e) {
        this.eraserPos = null;
        this.onPointerEnd(e);
    }

    onPointerDown(e) {
        if (state.canvas.spaceHeld || state.canvas.pinching) return;
        if (e.target !== document.querySelector('#canvas-container canvas')) return;

        if (e.pointerType === 'pen' && !state.pressure.penDetected) {
            state.pressure.penDetected = true;
            window.dispatchEvent(new CustomEvent('penDetected'));
        }
        this.currentPressure = e.pressure || 0.5;

        const { x, y } = this.getPos(e);
        state.painting.isActive = true;
        state.painting.pathPoints = [{ x, y }];
        state.painting.lastPlacedPos = { x, y };
        state.painting.smoothedAngle = null;

        this.savedSnapshotThisStroke = false;

        if (state.tool.mode === 'eraser') {
            this.eraserPos = { x, y };
            this.erasedThisStroke = false;
            this.erase(x, y);
        } else if (!state.tool.continueFromLast) {
            state.painting.charIndex = 0;
        }

        document.activeElement?.blur();
        e.preventDefault();
    }

    onPointerMove(e) {
        const canvas = document.querySelector('#canvas-container canvas');
        if (e.target !== canvas) return;

        const { x, y } = this.getPos(e);

        if (state.tool.mode === 'eraser') {
            this.eraserPos = { x, y };
            window.redraw();
        }

        if (!state.painting.isActive || state.canvas.pinching) return;
        e.preventDefault();

        const pressure = e.pressure || 0.5;

        if (this.throttleFrame) return;
        this.throttleFrame = requestAnimationFrame(() => {
            this.throttleFrame = null;
            this.currentPressure = pressure;
            const pos = this.getPos(e);
            this.continueStroke(pos.x, pos.y);
        });
    }

    onPointerEnd(e) {
        if (!state.painting.isActive) return;
        state.painting.isActive = false;

        if (this.throttleFrame) {
            cancelAnimationFrame(this.throttleFrame);
            this.throttleFrame = null;
        }

        if (state.tool.mode === 'eraser') {
            this.erasedThisStroke = false;
            layersModule.refreshThumbnails();
            window.redraw();
            persistenceModule.scheduleSave();
            return;
        }

        if (state.liveChars.length > 0) {
            state.liveChars = [];
            layersModule.refreshThumbnails();
            window.redraw();
            persistenceModule.scheduleSave();
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
        if (!state.painting.isActive) return;

        const { painting, tool } = state;
        const current = { x, y };

        if (tool.mode === 'eraser') {
            this.eraserPos = { x, y };
            this.erase(x, y);
            return;
        }

        painting.pathPoints.push(current);
        if (painting.pathPoints.length > PATH_HISTORY) {
            painting.pathPoints.shift();
        }

        if (!painting.lastPlacedPos) return;

        const textChars = getGraphemeClusters(tool.text);
        if (!textChars.length) return;

        let placed = false;

        while (true) {
            const nextChar = textChars[painting.charIndex % textChars.length];
            const effectiveSize = this.calculatePressureSize(tool.fontSize);
            const maxCharWidth = drawingModule.measureCharWidth('M', tool.fontFamily, effectiveSize);
            const stepSize = tool.spacing > 0 ? maxCharWidth * tool.spacing : 1;

            const dist = mathUtils.distance(painting.lastPlacedPos, current);
            if (dist < stepSize) break;

            const moveAngle = Math.atan2(
                current.y - painting.lastPlacedPos.y,
                current.x - painting.lastPlacedPos.x
            );

            const cx = painting.lastPlacedPos.x + Math.cos(moveAngle) * stepSize;
            const cy = painting.lastPlacedPos.y + Math.sin(moveAngle) * stepSize;

            const rawAngle = mathUtils.angleFromLastSegments(painting.pathPoints, PATH_HISTORY);
            if (painting.smoothedAngle === null) {
                painting.smoothedAngle = rawAngle;
            }
            const finalAngle = mathUtils.lerpAngle(painting.smoothedAngle, rawAngle, ANGLE_BLEND);
            painting.smoothedAngle = finalAngle;

            if (!this.savedSnapshotThisStroke) {
                historyModule.saveSnapshot();
                this.savedSnapshotThisStroke = true;
            }

            const charObj = {
                char: nextChar,
                x: cx,
                y: cy,
                angle: finalAngle,
                font: tool.fontFamily,
                size: this.calculatePressureSize(tool.fontSize),
                color: tool.color,
                strokeWeight: tool.strokeWeight,
            };

            state.liveChars.push(charObj);
            drawingModule.drawCharToBuffer(charObj);

            painting.charIndex = (painting.charIndex + 1) % textChars.length;
            painting.lastPlacedPos = { x: cx, y: cy };
            placed = true;
        }

        if (placed) {
            window.redraw();
        }
    }

    erase(x, y) {
        const buf = layersModule.getActiveBuffer();
        if (!buf) return;

        if (!this.savedSnapshotThisStroke) {
            historyModule.saveSnapshot();
            this.savedSnapshotThisStroke = true;
        }

        const radius = state.tool.eraserRadius;

        buf.push();
        buf.erase();
        buf.noStroke();
        buf.fill(255);
        buf.ellipse(x, y, radius * 2, radius * 2);
        buf.noErase();
        buf.pop();

        this.erasedThisStroke = true;
        window.redraw();
    }

    calculatePressureSize(baseSize) {
        if (!state.pressure.enabled || !state.pressure.penDetected) {
            return baseSize;
        }
        const { minMultiplier, maxMultiplier } = state.pressure;
        const multiplier = minMultiplier + this.currentPressure * (maxMultiplier - minMultiplier);
        return Math.round(baseSize * multiplier);
    }
}

export const paintingModule = new PaintingModule();
