import { state } from './state.js';
import { SYMBOL_CATEGORIES } from '../data/symbols.js';
import { EMOJI_GROUPS, buildSearchIndex } from '../data/emojis.js';
import { persistenceModule } from './persistence.js';
import { layersModule } from './layers.js';
import { i18n } from './i18n.js';

const STORAGE_KEY = 'grapho-symbol-history';

class SymbolPickerModule {
    constructor() {
        this.activeTab = 'symbols';
        this.activeSymbolCategory = 'geometric';
        this.activeEmojiGroup = 'smileys';
        this.searchIndex = null;
        this.intersectionObserver = null;
        this.debounceTimer = null;
    }

    setup() {
        this.loadHistory();
        this.setupTextareaClick();
        this.setupTabSwitching();
        this.setupSearch();
        this.setupClickOutside();
        this.setupToggleButtons();
        this.setupHistoryListener();
        this.renderCurrentView();
        this.renderHistory();
    }

    setupToggleButtons() {
        const toggle = document.getElementById('symbol-dock-toggle');
        toggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDock();
        });

        const collapse = document.getElementById('symbol-dock-collapse');
        collapse?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeDock();
        });
    }

    toggleDock() {
        const dock = document.getElementById('symbol-dock');
        if (dock?.classList.contains('hidden')) {
            this.openDock();
        } else {
            this.closeDock();
        }
    }

    loadHistory() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                state.symbolHistory.symbols = JSON.parse(stored);
            }
        } catch (e) {
            state.symbolHistory.symbols = [];
        }
    }

    saveHistory() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.symbolHistory.symbols));
        } catch (e) {}
    }

    addToHistory(symbol) {
        const symbols = state.symbolHistory.symbols;
        const existingIndex = symbols.indexOf(symbol);
        if (existingIndex !== -1) {
            symbols.splice(existingIndex, 1);
        }
        symbols.unshift(symbol);
        if (symbols.length > state.symbolHistory.maxSymbols) {
            symbols.pop();
        }
        this.saveHistory();
        this.renderHistory();
    }

    setupTextareaClick() {
        const textarea = document.getElementById('paint-text');
        if (!textarea) return;

        textarea.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openDock();
        });
    }

    setupTabSwitching() {
        const tabsContainer = document.getElementById('symbol-tabs');
        if (!tabsContainer) return;

        tabsContainer.addEventListener('click', (e) => {
            const tab = e.target.closest('.symbol-dock-tab');
            if (!tab) return;

            const tabType = tab.dataset.tab;
            if (tabType === this.activeTab) return;

            this.activeTab = tabType;
            tabsContainer.querySelectorAll('.symbol-dock-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.tab === tabType);
            });

            if (tabType === 'emojis' && !this.searchIndex) {
                this.searchIndex = buildSearchIndex(EMOJI_GROUPS);
            }

            this.renderCurrentView();
        });
    }

    setupSearch() {
        const input = document.getElementById('symbol-search');
        if (!input) return;

        input.addEventListener('input', (e) => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.search(e.target.value.trim());
            }, 150);
        });
    }

    setupClickOutside() {
        document.addEventListener('click', (e) => {
            const dock = document.getElementById('symbol-dock');
            const textarea = document.getElementById('paint-text');
            if (!dock || dock.classList.contains('hidden')) return;

            const toggle = document.getElementById('symbol-dock-toggle');
            if (toggle && (e.target === toggle || toggle.contains(e.target))) return;

            if (!dock.contains(e.target) && e.target !== textarea && !textarea.contains(e.target)) {
                this.closeDock();
            }
        });
    }

    openDock() {
        const dock = document.getElementById('symbol-dock');
        if (!dock) return;

        if (window.innerWidth <= 768) {
            layersModule.collapseDock();
            window.colorPickerModule?.closeDock();
        } else {
            window.colorPickerModule?.closeDock();
        }

        dock.classList.remove('hidden');

        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ nodes: dock.querySelectorAll('[data-lucide]') });
        }

        const toggle = document.getElementById('symbol-dock-toggle');
        if (toggle) toggle.classList.add('active');

        this.setupLazyLoading();
    }

    closeDock() {
        const dock = document.getElementById('symbol-dock');
        if (dock) {
            dock.classList.add('hidden');
        }
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }

        const toggle = document.getElementById('symbol-dock-toggle');
        if (toggle) toggle.classList.remove('active');
    }

    setupLazyLoading() {
        const content = document.getElementById('symbol-content');
        if (!content) return;

        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }

        this.intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                });
            },
            { root: content, rootMargin: '50px' }
        );

        content.querySelectorAll('.category-section').forEach(el => {
            this.intersectionObserver.observe(el);
        });
    }

    renderCurrentView() {
        const content = document.getElementById('symbol-content');
        if (!content) return;

        if (this.activeTab === 'symbols') {
            this.renderSymbolCategories(content);
        } else {
            this.renderEmojiGroups(content);
        }

        this.setupLazyLoading();
    }

    renderSymbolCategories(container) {
        const locale = state.settings.locale;
        let html = '';

        Object.entries(SYMBOL_CATEGORIES).forEach(([key, category]) => {
            const label = category.label[locale] || category.label['en-US'];
            html += `
                <div class="category-section" data-category="${key}">
                    <div class="category-label">${label}</div>
                    <div class="item-grid">
                        ${[...category.symbols].map(s =>
                            `<button class="item-cell" data-char="${s}">${s}</button>`
                        ).join('')}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        this.attachItemListeners(container);
    }

    renderEmojiGroups(container) {
        const locale = state.settings.locale;
        let html = '';

        Object.entries(EMOJI_GROUPS).forEach(([key, group]) => {
            const label = group.label[locale] || group.label['en-US'];
            html += `
                <div class="category-section" data-group="${key}">
                    <div class="category-label">${label}</div>
                    <div class="item-grid">
                        ${group.emojis.map(({ e }) =>
                            `<button class="item-cell" data-char="${e}">${e}</button>`
                        ).join('')}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        this.attachItemListeners(container);
    }

    attachItemListeners(container) {
        container.addEventListener('click', (e) => {
            const cell = e.target.closest('.item-cell');
            if (!cell) return;
            const char = cell.dataset.char;
            if (char) {
                this.selectItem(char);
            }
        });
    }

    search(query) {
        const content = document.getElementById('symbol-content');
        if (!content) return;

        if (!query) {
            this.renderCurrentView();
            return;
        }

        const q = query.toLowerCase();
        const results = new Set();

        Object.values(SYMBOL_CATEGORIES).forEach(cat => {
            [...cat.symbols].forEach(s => {
                if (s === query) results.add(s);
            });
        });

        if (!this.searchIndex) {
            this.searchIndex = buildSearchIndex(EMOJI_GROUPS);
        }

        Object.entries(this.searchIndex).forEach(([keyword, emojis]) => {
            if (keyword.includes(q)) {
                emojis.forEach(e => results.add(e));
            }
        });

        this.renderSearchResults(content, [...results]);
    }

    renderSearchResults(container, results) {
        if (results.length === 0) {
            container.innerHTML = `<div class="no-results">${i18n.t('symbolDock.noResults')}</div>`;
            return;
        }

        container.innerHTML = `
            <div class="category-section visible">
                <div class="item-grid">
                    ${results.map(char =>
                        `<button class="item-cell" data-char="${char}">${char}</button>`
                    ).join('')}
                </div>
            </div>
        `;
        this.attachItemListeners(container);
    }

    selectItem(char) {
        const textarea = document.getElementById('paint-text');
        if (!textarea) return;

        textarea.value += char;
        state.tool.text = textarea.value;

        this.addToHistory(char);
        persistenceModule.scheduleSave();
    }

    setupHistoryListener() {
        const container = document.getElementById('symbol-history');
        if (!container) return;

        container.addEventListener('click', (e) => {
            const item = e.target.closest('.history-item');
            if (!item) return;
            const char = item.dataset.char;
            if (char) {
                this.selectItem(char);
            }
        });
    }

    renderHistory() {
        const container = document.getElementById('symbol-history');
        if (!container) return;

        const symbols = state.symbolHistory.symbols;
        if (symbols.length === 0) {
            container.innerHTML = '<span class="no-history">-</span>';
            return;
        }

        container.innerHTML = symbols.map(s =>
            `<button class="history-item" data-char="${s}">${s}</button>`
        ).join('');
    }

    syncUI() {
        this.renderHistory();
    }
}

export const symbolPickerModule = new SymbolPickerModule();
