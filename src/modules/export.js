import { state } from './state.js';

class ExportModule {
    setup(p) {
        this.p = p;
        document.getElementById('save-btn')?.addEventListener('click', () => this.savePNG());
    }

    savePNG() {
        if (!state.layers.items.length) return;

        const ind = document.getElementById('saving-indicator');
        if (ind) ind.style.display = '';

        requestAnimationFrame(() => {
            this.p.background(state.canvas.bgColor);

            for (const layer of state.layers.items) {
                if (layer.visible && layer.buffer) {
                    this.p.image(layer.buffer, 0, 0);
                }
            }

            this.p.saveCanvas('grapho', 'png');
            this.p.redraw();

            setTimeout(() => {
                if (ind) ind.style.display = 'none';
            }, 500);
        });
    }
}

export const exportModule = new ExportModule();
