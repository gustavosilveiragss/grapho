import { state } from './state.js';
import { persistenceModule } from './persistence.js';

class SliderInputModule {
    constructor() {
        this.activeEdit = null;
        this.configs = [
            { id: 'font-size', statePath: 'tool.fontSize', parse: parseInt, default: 32 },
            { id: 'spacing', statePath: 'tool.spacing', parse: parseFloat, default: 1.0 },
            { id: 'stroke-weight', statePath: 'tool.strokeWeight', parse: parseFloat, default: 0 },
            { id: 'eraser-radius', statePath: 'tool.eraserRadius', parse: parseInt, default: 20 },
            { id: 'pressure-min', statePath: 'pressure.minMultiplier', parse: parseFloat, default: 0.5 },
            { id: 'pressure-max', statePath: 'pressure.maxMultiplier', parse: parseFloat, default: 2.0 },
        ];
    }

    setup() {
        this.configs.forEach(config => this.initSlider(config));
        document.addEventListener('click', (e) => this.handleClickOutside(e));
    }

    initSlider({ id, statePath, parse, default: defaultVal }) {
        const slider = document.getElementById(id);
        const valueBtn = document.getElementById(`${id}-value`);
        const editInput = document.getElementById(`${id}-edit`);

        if (!slider) return;

        slider.addEventListener('input', (e) => {
            const val = parse(e.target.value);
            this.setStateValue(statePath, val);
            this.updateDisplay(id, e.target.value);
            persistenceModule.scheduleSave();
        });

        valueBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.enterEditMode(id);
        });

        editInput?.addEventListener('blur', () => this.exitEditMode(id));
        editInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.exitEditMode(id);
            }
            if (e.key === 'Escape') {
                this.cancelEdit(id);
            }
        });

        const currentVal = this.getStateValue(statePath) ?? defaultVal;
        slider.value = currentVal;
        this.updateDisplay(id, currentVal);
    }

    setStateValue(path, value) {
        const parts = path.split('.');
        let obj = state;
        for (let i = 0; i < parts.length - 1; i++) {
            obj = obj[parts[i]];
        }
        obj[parts[parts.length - 1]] = value;
    }

    getStateValue(path) {
        const parts = path.split('.');
        let obj = state;
        for (const part of parts) {
            obj = obj?.[part];
        }
        return obj;
    }

    updateDisplay(id, value) {
        const valueBtn = document.getElementById(`${id}-value`);
        if (valueBtn) {
            const num = parseFloat(value);
            valueBtn.textContent = Number.isInteger(num) ? num : num.toFixed(1);
        }
    }

    enterEditMode(id) {
        if (this.activeEdit) {
            this.cancelEdit(this.activeEdit);
        }

        const slider = document.getElementById(id);
        const valueBtn = document.getElementById(`${id}-value`);
        const editInput = document.getElementById(`${id}-edit`);

        if (!valueBtn || !editInput) return;

        valueBtn.style.display = 'none';
        editInput.style.display = 'block';
        editInput.value = slider?.value || valueBtn.textContent;
        editInput.select();
        this.activeEdit = id;
    }

    exitEditMode(id) {
        const slider = document.getElementById(id);
        const valueBtn = document.getElementById(`${id}-value`);
        const editInput = document.getElementById(`${id}-edit`);

        if (!valueBtn || !editInput) return;

        const val = editInput.value;
        if (slider) {
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            const clamped = Math.min(max, Math.max(min, parseFloat(val) || min));
            slider.value = clamped;
            slider.dispatchEvent(new Event('input'));
        }

        valueBtn.style.display = '';
        editInput.style.display = 'none';
        this.activeEdit = null;
    }

    cancelEdit(id) {
        const valueBtn = document.getElementById(`${id}-value`);
        const editInput = document.getElementById(`${id}-edit`);

        if (!valueBtn || !editInput) return;

        valueBtn.style.display = '';
        editInput.style.display = 'none';
        this.activeEdit = null;
    }

    handleClickOutside(e) {
        if (!this.activeEdit) return;

        const editInput = document.getElementById(`${this.activeEdit}-edit`);
        if (editInput && !editInput.contains(e.target)) {
            this.exitEditMode(this.activeEdit);
        }
    }

    syncFromState() {
        this.configs.forEach(({ id, statePath }) => {
            const slider = document.getElementById(id);
            const val = this.getStateValue(statePath);
            if (slider && val !== undefined) {
                slider.value = val;
                this.updateDisplay(id, val);
            }
        });
    }
}

export const sliderInputModule = new SliderInputModule();
