import { state } from './state.js';
import { paintingModule } from './painting.js';

class DrawingModule {
    constructor() {
        this.measureCanvas = document.createElement('canvas');
        this.measureCtx = this.measureCanvas.getContext('2d');
    }

    draw(p) {
        p.background(state.canvas.bgColor);

        if (state.buffer) {
            p.image(state.buffer, 0, 0);
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
        const buf = state.buffer;
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

    drawChar(p, ch) {
        p.push();
        p.translate(ch.x, ch.y);
        p.rotate(ch.angle);
        p.textFont(ch.font);
        p.textSize(ch.size);
        p.textAlign(p.CENTER, p.CENTER);

        if (ch.strokeWeight > 0) {
            p.stroke(ch.color);
            p.strokeWeight(ch.strokeWeight);
        } else {
            p.noStroke();
        }

        p.fill(ch.color);
        p.text(ch.char, 0, 0);
        p.pop();
    }

    measureCharWidth(char, font, size) {
        this.measureCtx.font = `${size}px "${font}"`;
        const metrics = this.measureCtx.measureText(char);
        return metrics.width || size * 0.6;
    }

    commitToBuffer(chars) {
        const buf = state.buffer;
        if (!buf) return;

        for (const ch of chars) {
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
    }
}

export const drawingModule = new DrawingModule();
