import p5 from 'p5';
import './styles/main.css';
import { i18n } from './modules/i18n.js';
import { state } from './modules/state.js';
import { canvasModule } from './modules/canvas.js';
import { drawingModule } from './modules/drawing.js';
import { paintingModule } from './modules/painting.js';
import { controlsModule } from './modules/controls.js';
import { fontsModule } from './modules/fonts.js';
import { historyModule } from './modules/history.js';
import { exportModule } from './modules/export.js';

async function initializeApp() {
    if (document.readyState === 'loading') {
        await new Promise((resolve) => {
            document.addEventListener('DOMContentLoaded', resolve);
        });
    }

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    await i18n.init();

    Object.assign(window, {
        state,
        canvasModule,
        controlsModule,
        historyModule,
        exportModule,
        fontsModule,
        i18nModule: i18n,
    });

    const sketch = (p) => {
        p.setup = () => {
            canvasModule.setup(p);
            controlsModule.setup();
            fontsModule.setup();
            historyModule.setup();
            exportModule.setup(p);

            setTimeout(() => paintingModule.setup(), 50);
        };

        p.draw = () => {
            drawingModule.draw(p);
        };

        window.redraw = () => p.redraw();
    };

    const container = document.getElementById('canvas-container');
    if (container) {
        new p5(sketch, container);
    }

    window.addEventListener('resize', () => canvasModule.handleResize());
}

initializeApp();
