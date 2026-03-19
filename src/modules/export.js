import { state } from './state.js';

class ExportModule {
    setup(p) {
        this.p = p;
    }

    savePNG() {
        if (!state.layers.items.length) return;

        this.p.background(state.canvas.bgColor);

        for (const layer of state.layers.items) {
            if (layer.visible && layer.buffer) {
                this.p.image(layer.buffer, 0, 0);
            }
        }

        this.p.saveCanvas('ascii-paint', 'png');
        this.p.redraw();
    }
}

export const exportModule = new ExportModule();
