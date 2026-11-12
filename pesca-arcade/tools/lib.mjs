// Utilitários de teste: servidor estático do dist/ + página Playwright em tamanho de celular.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
export async function serve(dir = 'dist', port = 0) {
  const root = resolve(dir);
  const srv = http.createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    try { const buf = await readFile(join(root, p)); res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); res.end(buf); }
    catch { res.writeHead(404); res.end('404'); }
  });
  await new Promise(r => srv.listen(port, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${srv.address().port}/`, close: () => srv.close() };
}
export async function open(url, { width = 390, height = 780, dsf = 2, storage = null, sw = false } = {}) {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dsf, hasTouch: true, isMobile: true, serviceWorkers: sw ? 'allow' : 'block', locale: 'pt-BR' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  if (storage !== null) await page.addInitScript(s => { try { if (!sessionStorage.getItem('__seeded')) { sessionStorage.setItem('__seeded', '1'); if (s) localStorage.setItem('pesca-arcade-v1', s); } } catch {} }, typeof storage === 'string' ? storage : JSON.stringify(storage));
  await page.goto(url);
  await page.waitForFunction(() => !!window.__pesca);
  await page.evaluate(() => document.fonts.ready);
  return { browser, ctx, page, errors };
}
