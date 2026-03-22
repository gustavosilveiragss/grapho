import { state } from './state.js';

const SYSTEM_FONTS = {
    'Times New Roman': 'serif',
    'Arial': 'sans-serif',
    'Helvetica': 'sans-serif',
    'Georgia': 'serif',
    'Verdana': 'sans-serif',
    'Courier New': 'monospace',
    'Trebuchet MS': 'sans-serif',
    'Impact': 'sans-serif',
    'Comic Sans MS': 'cursive',
};

const FALLBACK_FONTS = [
    ...Object.keys(SYSTEM_FONTS),
    'Comic Neue', 'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Nunito',
    'Raleway', 'Ubuntu', 'Oswald', 'Rubik', 'Work Sans', 'Quicksand', 'Comfortaa',
    'Bebas Neue', 'DM Sans', 'Space Grotesk', 'Outfit', 'Plus Jakarta Sans',
    'Playfair Display', 'Merriweather', 'Lora', 'PT Serif', 'Libre Baskerville',
    'EB Garamond', 'Cormorant Garamond', 'Bitter', 'Crimson Text', 'Source Serif 4',
    'Fira Code', 'JetBrains Mono', 'Source Code Pro', 'IBM Plex Mono', 'Space Mono',
    'Roboto Mono', 'Courier Prime', 'Pacifico', 'Dancing Script', 'Caveat', 'Satisfy',
    'Great Vibes', 'Sacramento', 'Kalam', 'Indie Flower', 'Permanent Marker',
    'Shadows Into Light', 'Patrick Hand', 'Amatic SC', 'Lobster', 'Righteous',
    'Bangers', 'Bungee', 'Press Start 2P', 'VT323', 'Silkscreen', 'Special Elite',
    'Abril Fatface', 'Alfa Slab One', 'Anton', 'Black Ops One', 'Creepster',
    'Fredoka', 'Titan One', 'Archivo', 'Barlow', 'Cabin', 'Dosis', 'Exo 2',
    'Fira Sans', 'Heebo', 'Inconsolata', 'Josefin Sans', 'Kanit', 'Lexend',
    'Manrope', 'Noto Sans', 'Overpass', 'PT Sans', 'Questrial', 'Red Hat Display',
    'Sora', 'Titillium Web', 'Urbanist', 'Varela Round', 'Wix Madefor Display',
    'Yanone Kaffeesatz', 'Zilla Slab', 'Abel', 'Asap', 'Baloo 2', 'Catamaran',
    'Domine', 'Encode Sans', 'Figtree', 'Geologica', 'Hind', 'Inter Tight',
    'Jost', 'Karla', 'Libre Franklin', 'Mulish', 'Nanum Gothic', 'Oxygen',
    'Prompt', 'Saira', 'Teko', 'Vollkorn', 'Signika', 'Arimo', 'Alegreya',
    'Cormorant', 'Cardo', 'Spectral', 'Neuton', 'Amiri', 'Noto Serif',
    'Bodoni Moda', 'DM Serif Display', 'Yeseva One', 'Pridi', 'Philosopher',
    'Rokkitt', 'Taviraj', 'Trirong', 'Arvo', 'Crete Round', 'Faustina',
    'Gelasio', 'Literata', 'Newsreader', 'Podkova', 'Roboto Slab',
    'Comic Neue', 'Gochi Hand', 'Handlee', 'Mali', 'Neucha', 'Reenie Beanie',
    'Rock Salt', 'Sue Ellen Francisco', 'Architects Daughter', 'Covered By Your Grace',
    'Gloria Hallelujah', 'Just Another Hand', 'Schoolbell', 'Coming Soon',
    'Pangolin', 'Sriracha', 'Itim', 'Charm', 'Sedgwick Ave Display',
    'Monoton', 'Bungee Shade', 'Bungee Outline', 'Rubik Moonrocks',
    'Rubik Glitch', 'Rubik Wet Paint', 'Rubik Vinyl', 'Rubik Burned',
    'Rubik Dirt', 'Rubik Distressed', 'Rubik Maze', 'Rubik Microbe',
    'Rubik Puddles', 'Rubik Spray Paint', 'Rubik Storm',
    'Nabla', 'Climate Crisis', 'Foldit', 'Tourney', 'Syne',
    'Unbounded', 'Big Shoulders Display', 'Orbitron', 'Audiowide',
    'Rajdhani', 'Quantico', 'Electrolize', 'Share Tech Mono',
    'Major Mono Display', 'Nova Mono', 'Cutive Mono', 'Anonymous Pro',
    'Noto Sans Mono', 'Red Hat Mono', 'Azeret Mono', 'Martian Mono',
    'Chivo Mono', 'Spline Sans Mono', 'Fragment Mono',
];

class FontsModule {
    constructor() {
        this.fonts = FALLBACK_FONTS.map((f) => ({
            family: f,
            category: SYSTEM_FONTS[f] || 'sans-serif',
        }));
        this.loadedFonts = new Set();
        this.observer = null;
    }

    setup() {
        this.ensureFontLoaded(state.tool.fontFamily);

        const searchInput = document.getElementById('font-search');
        const dropdown = document.getElementById('font-dropdown');
        if (!searchInput || !dropdown) return;

        searchInput.value = state.tool.fontFamily;

        searchInput.addEventListener('focus', () => {
            this.renderDropdown(this.fonts);
            dropdown.classList.add('open');
        });

        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase();
            const filtered = this.fonts.filter((f) =>
                f.family.toLowerCase().includes(query),
            );
            this.renderDropdown(filtered.slice(0, 100));
            dropdown.classList.add('open');
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.font-selector')) {
                dropdown.classList.remove('open');
            }
        });
    }

    renderDropdown(fonts) {
        const dropdown = document.getElementById('font-dropdown');
        dropdown.innerHTML = '';

        if (this.observer) this.observer.disconnect();
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        this.ensureFontLoaded(entry.target.dataset.family);
                        this.observer.unobserve(entry.target);
                    }
                });
            },
            { root: dropdown, threshold: 0 },
        );

        fonts.forEach((font) => {
            const div = document.createElement('div');
            div.className = 'font-option';
            if (font.family === state.tool.fontFamily) div.className += ' active';
            div.textContent = font.family;
            div.dataset.family = font.family;
            div.style.fontFamily = `"${font.family}", ${font.category || 'sans-serif'}`;

            div.addEventListener('click', () => this.selectFont(font.family));
            dropdown.appendChild(div);
            this.observer.observe(div);
        });
    }

    selectFont(family) {
        this.loadFont(family);
        document.getElementById('font-dropdown').classList.remove('open');
        document.getElementById('font-search').value = family;
    }

    loadFont(family) {
        this.ensureFontLoaded(family);
        document.fonts.ready.then(() => {
            state.tool.fontFamily = family;
            this.loadedFonts.add(family);
            window.persistenceModule?.scheduleSave();
        });
    }

    ensureFontLoaded(family) {
        if (this.loadedFonts.has(family)) return;

        if (family in SYSTEM_FONTS) {
            this.loadedFonts.add(family);
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700&display=swap`;
        document.head.appendChild(link);
        this.loadedFonts.add(family);
    }
}

export const fontsModule = new FontsModule();
