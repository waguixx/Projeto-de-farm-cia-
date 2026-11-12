// Verifica: (1) dist/index.html abre direto do disco (file://); (2) o PWA instala o service worker e abre sem internet.
import { resolve } from 'node:path';
import { serve, open } from './lib.mjs';
let fail = 0; const check = (n, ok, x = '') => { console.log((ok ? 'ok   ' : 'FALHA') + ' ' + n + (x ? ' -> ' + x : '')); if (!ok) fail++; };
{ const { browser, page, errors } = await open('file://' + resolve('dist/index.html'), { storage: '' });
  await page.evaluate(() => { document.getElementById('play').click(); __pesca.closePanel(); __pesca.startCast(); }); await page.waitForTimeout(1200);
  check('file://: o jogo abre e dá para pescar', await page.evaluate(() => __pesca.G.hy > 20));
  const serios = errors.filter(e => !/manifest/i.test(e));
  check('file://: sem erros de console (fora o aviso do manifest, que só vale hospedado)', serios.length === 0, serios.join(' | '));
  await browser.close(); }
{ const srv = await serve('dist'); const { browser, ctx, page, errors } = await open(srv.url, { storage: '', sw: true });
  await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForFunction(() => !!navigator.serviceWorker.controller || true); await page.waitForTimeout(800);
  await page.reload(); await page.waitForFunction(() => !!window.__pesca && !!navigator.serviceWorker.controller);
  const man = await page.evaluate(async () => { const r = await fetch('./manifest.webmanifest'); const j = await r.json(); return j.icons.length + ' ícones, display ' + j.display; });
  check('manifest válido', /3 ícones, display standalone/.test(man), man);
  await ctx.setOffline(true); srv.close();
  await page.reload(); await page.waitForFunction(() => !!window.__pesca, null, { timeout: 8000 }).catch(() => {});
  check('offline: o jogo abre sem internet e sem servidor', await page.evaluate(() => !!window.__pesca).catch(() => false));
  const icon = await page.evaluate(() => fetch('./icons/icon-192.png').then(r => r.ok).catch(() => false));
  check('offline: ícones no cache', icon);
  check('PWA: sem erros de console', errors.length === 0, errors.join(' | '));
  await browser.close(); }
console.log(fail ? `\n${fail} FALHA(S)` : '\nPWA e arquivo local: tudo certo.'); process.exit(fail ? 1 : 0);
