import { state } from './state.js';

class I18n {
    constructor() {
        this.currentLocale = state.settings.locale;
        this.translations = {};
    }

    async init() {
        await this.loadLocale(this.currentLocale);
        this.updateDOM();
    }

    async switchLanguage(locale) {
        this.currentLocale = locale;
        state.settings.locale = locale;
        localStorage.setItem('ascii-paint-locale', locale);

        await this.loadLocale(locale);
        this.updateDOM();
    }

    async loadLocale(locale) {
        try {
            const base = import.meta.env.BASE_URL || '/';
            const response = await fetch(`${base}locales/${locale}.json`);
            this.translations = await response.json();
        } catch {
        }
    }

    t(key) {
        const keys = key.split('.');
        let value = this.translations;

        for (const k of keys) {
            value = value?.[k];
            if (!value) return key;
        }

        return value;
    }

    updateDOM() {
        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            el.textContent = this.t(key);
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = this.t(key);
        });

        const title = document.querySelector('title[data-i18n]');
        if (title) {
            title.textContent = this.t(title.getAttribute('data-i18n'));
        }

        document.querySelectorAll('.flag-button').forEach((btn) => {
            const locale = btn.getAttribute('data-locale');
            btn.classList.toggle('active', locale === this.currentLocale);
        });

        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            const span = continueBtn.querySelector('[data-i18n]');
            if (span) {
                const key = state.tool.continueFromLast ? 'toolbar.continue' : 'toolbar.restart';
                span.textContent = this.t(key);
                span.setAttribute('data-i18n', key);
            }
        }
    }
}

export const i18n = new I18n();
