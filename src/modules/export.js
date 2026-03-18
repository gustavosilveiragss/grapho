import { state } from './state.js';

class ExportModule {
    setup(p) {
        this.p = p;
    }

    savePNG() {
        if (!state.buffer) return;

        this.p.background(state.canvas.bgColor);
        this.p.image(state.buffer, 0, 0);
        this.p.saveCanvas('ascii-paint', 'png');
        this.p.redraw();
    }
}

export const exportModule = new ExportModule();
