import { state } from './state.js';

class DrawingModule {
    draw(p) {
        p.background(state.canvas.bgColor);

        if (state.buffer) {
            p.image(state.buffer, 0, 0);
        }

        for (const ch of state.liveChars) {
            this.drawChar(p, ch);
        }
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
