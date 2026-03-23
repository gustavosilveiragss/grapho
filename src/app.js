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
import { symbolPickerModule } from './modules/symbolPicker.js';
import { dialogModule } from './modules/dialog.js';
import { persistenceModule } from './modules/persistence.js';
import { sliderInputModule } from './modules/sliderInput.js';
import { mobileDrawerModule } from './modules/mobileDrawer.js';

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
        sliderInputModule,
        i18nModule: i18n,
        colorPickerModule,
        symbolPickerModule,
    });

    const sketch = (p) => {
        p.setup = async () => {
            canvasModule.setup(p);
            persistenceModule.setup(p);

            const savedData = persistenceModule.load();
            layersModule.setup(p);
            if (savedData) {
                persistenceModule.restoreSettingsOnly(savedData);
            }

            controlsModule.setup();
            sliderInputModule.setup();
            fontsModule.setup();
            historyModule.setup();
            exportModule.setup(p);
            colorPickerModule.setup();
            symbolPickerModule.setup();
            dialogModule.setup();
            mobileDrawerModule.setup();

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
