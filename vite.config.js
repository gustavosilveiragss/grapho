import { defineConfig } from 'vite';

export default defineConfig({
    base: '/ascii-paint/',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        rollupOptions: {
            input: {
                main: './index.html',
            },
        },
    },
    server: {
        open: true,
    },
    publicDir: 'public',
});
