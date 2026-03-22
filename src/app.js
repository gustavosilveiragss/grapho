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
import { colorPickerModule } from './modules/colorPicker.js';
import { layersModule } from './modules/layers.js';
import { dialogModule } from './modules/dialog.js';
import { persistenceModule } from './modules/persistence.js';

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
        layersModule,
        dialogModule,
        persistenceModule,
        i18nModule: i18n,
    });

    const showLoading = (show) => {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    };

    const sketch = (p) => {
        p.setup = async () => {
            canvasModule.setup(p);
            persistenceModule.setup(p);

            const savedData = persistenceModule.load();
            // TODO: fix layer restore pixelDensity scaling
            // const hasValidSave = savedData?.layers?.items?.length > 0;
            // if (hasValidSave) {
            //     showLoading(true);
            //     i18n.updateDOM();
            //     await persistenceModule.restoreState(savedData);
            //     layersModule.setup(p, true);
            // } else {
            //     layersModule.setup(p);
            // }
            layersModule.setup(p);
            if (savedData) {
                persistenceModule.restoreSettingsOnly(savedData);
            }
            // if (hasValidSave) {
            //     showLoading(false);
            // }

            controlsModule.setup();
            fontsModule.setup();
            historyModule.setup();
            exportModule.setup(p);
            colorPickerModule.setup();

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
