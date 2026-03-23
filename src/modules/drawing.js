import { state } from './state.js';
import { paintingModule } from './painting.js';
import { layersModule } from './layers.js';

class DrawingModule {
    constructor() {
        this.measureCanvas = document.createElement('canvas');
        this.measureCtx = this.measureCanvas.getContext('2d');
    }

    draw(p) {
        p.background(state.canvas.bgColor);

        for (const layer of state.layers.items) {
            if (layer.visible && layer.buffer) {
                const opacity = layer.opacity ?? 1.0;
                if (opacity < 1.0) {
                    p.push();
                    p.tint(255, opacity * 255);
                    p.image(layer.buffer, 0, 0);
                    p.pop();
                } else {
                    p.image(layer.buffer, 0, 0);
                }
            }
        }

        if (state.tool.mode === 'eraser' && paintingModule.eraserPos) {
            this.drawEraserCursor(p, paintingModule.eraserPos);
        }
    }

    drawEraserCursor(p, pos) {
        const radius = state.tool.eraserRadius;
        p.push();
        p.noFill();
        p.stroke(100);
        p.strokeWeight(1);
        p.ellipse(pos.x, pos.y, radius * 2, radius * 2);
        p.pop();
    }

    drawCharToBuffer(ch) {
        const buf = layersModule.getActiveBuffer();
        if (!buf) return;

        buf.push();
        buf.translate(ch.x, ch.y);
        buf.rotate(ch.angle);
        buf.textFont(ch.font);
        buf.textSize(ch.size);
        buf.textAlign(buf.CENTER, buf.CENTER);

        if (ch.strokeWeight > 0) {
            buf.stroke(ch.color);
            buf.strokeWeight(ch.strokeWeight);
        } else {
            buf.noStroke();
        }

        buf.fill(ch.color);
        buf.text(ch.char, 0, 0);
        buf.pop();
    }

    measureCharWidth(char, font, size) {
        this.measureCtx.font = `${size}px "${font}"`;
        const metrics = this.measureCtx.measureText(char);
        return metrics.width || size * 0.6;
    }

}

export const drawingModule = new DrawingModule();
