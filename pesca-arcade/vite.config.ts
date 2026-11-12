import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Build de arquivo único: dist/index.html abre direto no navegador (até por file://)
// e também funciona hospedado em qualquer subpasta (base relativa).
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { assetsInlineLimit: 100_000_000, target: 'es2019', cssCodeSplit: false },
  server: { host: true, port: 5173 },
});
