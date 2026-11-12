// Pós-build: carimba o service worker com um identificador do conteúdo (cache novo a cada versão).
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
const html = readFileSync('dist/index.html');
const id = createHash('sha1').update(html).digest('hex').slice(0, 10);
writeFileSync('dist/sw.js', readFileSync('dist/sw.js', 'utf8').replace('__BUILD__', id));
console.log(`dist/index.html: ${(statSync('dist/index.html').size / 1024).toFixed(0)} KB (arquivo único) · cache ${id}`);
