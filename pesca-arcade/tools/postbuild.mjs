// Pós-build: nada obrigatório ainda (o service worker e o manifest vêm de public/).
import { statSync } from 'node:fs';
const kb = (statSync('dist/index.html').size / 1024).toFixed(0);
console.log(`dist/index.html: ${kb} KB (arquivo único)`);
