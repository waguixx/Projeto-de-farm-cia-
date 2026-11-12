// Tira prints de cada mar, menu e situação em 390x780 e verifica erros de console e fps.
// Uso: npm run build && npm run shots
import { mkdir } from 'node:fs/promises';
import { serve, open } from './lib.mjs';

const OUT = process.argv[2] || 'shots';
await mkdir(OUT, { recursive: true });
const srv = await serve('dist');
const rich = { coins: 5.2e7, scene: 0, unlocked: [true, true, true, true], up: { rod: 14, sink: 8, reel: 7, hook: 6, line: 7, boat: 4, motor: 5 }, casts: 240, tut: true, tut2: true, starterSeen: true,
  album: { lambari: { n: 80, g: 2 }, tilapia: { n: 40, g: 0 }, pacu: { n: 22, g: 1 }, sardinha: { n: 30, g: 0 }, atum: { n: 9, g: 0 }, jau: { n: 1, g: 0 }, chinelo: { n: 2, g: 0 } },
  best: { cast: 182000, depth: 212, fish: 1730, combo: 9, legend: 1 }, earned: 9.1e7, pearls: 2, rank: 4, last: Date.now(), streak: { day: '', n: 0 }, mute: true };
const { browser, page, errors } = await open(srv.url, { storage: rich });
const shot = async n => { await page.screenshot({ path: `${OUT}/${n}.png` }); console.log('print', n); };
const wait = ms => page.waitForTimeout(ms);
const ev = (f, a) => page.evaluate(f, a);

await wait(400); await shot('00-splash');
await ev(() => document.getElementById('play').click()); await wait(500);
await shot('01-presentes');
await ev(() => __pesca.closePanel());
const seas = ['rio', 'mar', 'gelo', 'abismo'];
for (let i = 0; i < 4; i++) {
  await ev(i => { const p = __pesca; p.S.scene = i; p.G.mode = null; p.genEnts(); p.updateHud(); }, i);
  await wait(700); await shot(`1${i}-${seas[i]}-superficie`);
  await ev(() => __pesca.startCast()); await wait(1700); await shot(`2${i}-${seas[i]}-descida`);
  await wait(2600); await shot(`3${i}-${seas[i]}-fundo`);
  if (i === 0) { await ev(() => { const p = __pesca, G = p.G; const e = G.ents.find(e => e.kind === 'cut' && !e.dead) || {}; e.x = G.hx; e.y = G.hy; p.shock(e); }); await wait(120); await shot('40-choque'); }
  { await ev(() => { const p = __pesca, G = p.G, s = p.SCENES[p.S.scene]; const e = { kind: 'fish', def: s.leg, legend: true, gold: false, val: s.leg.val, x: G.hx, y: G.hy + 30, vx: 0, base: 110, r: 30, ph: 0, z: 1, face: 1 }; G.ents.push(e); p.startDuel(e); });
    await wait(i === 3 ? 500 : 1100); await shot(`41-chefao-${seas[i]}`); await ev(() => { __pesca.G.duel && (__pesca.G.duel.t = 0); }); await wait(300); }
  await ev(() => __pesca.goUp()); await wait(900); await shot(`5${i}-${seas[i]}-subida`);
  await page.waitForFunction(() => __pesca.G.phase === 'idle', null, { timeout: 60000 });
  await wait(900); if (i === 0) await shot('60-resultado');
  await ev(() => { __pesca.closeResult(); __pesca.closeResult(); __pesca.closePanel(); const d = document.getElementById('dbl'); if (d) d.style.display = 'none'; });
  await wait(300);
}
await ev(() => { __pesca.S.scene = 0; __pesca.genEnts(); });
for (const p of ['shop', 'album', 'missions', 'scenes', 'coins', 'gift', 'desafio', 'conquistas', 'config']) {
  const ok = await ev(p => { try { document.getElementById('mbody').innerHTML = ''; __pesca.openPanel(p); return document.getElementById('mbody').innerHTML.length > 20; } catch (e) { return false; } }, p);
  if (!ok) { await ev(() => __pesca.closePanel()); continue; }
  await wait(350); await shot(`7-menu-${p}`);
  if (p === 'album' || p === 'shop') { await ev(() => { const b = document.getElementById('mbody'); b.scrollTop = b.scrollHeight; }); await wait(250); await shot(`7-menu-${p}-fim`); }
  await ev(() => __pesca.closePanel());
}
// cartão de compartilhamento (imagem 1080x1350 gerada em canvas)
{ const { writeFile } = await import('node:fs/promises');
  for (const k of ['record', 'daily']) { const d = await ev(k => __pesca.buildCard(k).cvs.toDataURL('image/png'), k); await writeFile(`${OUT}/80-cartao-${k}.png`, Buffer.from(d.split(',')[1], 'base64')); console.log('print', '80-cartao-' + k); } }
// desempenho: quadros por segundo do laço real do jogo e custo de CPU do desenho, numa descida no Mar
await ev(() => { __pesca.S.scene = 1; __pesca.genEnts(); __pesca.startCast(); });
const medir = () => ev(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; const a = performance.now(); if (a - t0 < 3000) requestAnimationFrame(f); else { const p = __pesca; const b = performance.now(); for (let i = 0; i < 120; i++) { p.update(1 / 600); p.draw(); } res({ fps: +(n / ((a - t0) / 1000)).toFixed(1), cpuMsPorQuadro: +((performance.now() - b) / 120).toFixed(2) }); } }; requestAnimationFrame(f); }));
console.log('desempenho (PC de teste):', JSON.stringify(await medir()));
const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await ev(() => { __pesca.closeResult(); __pesca.closeResult(); if (__pesca.G.phase === 'idle') { __pesca.genEnts(); __pesca.startCast(); } });
console.log('desempenho (CPU 4x mais lenta e SEM GPU: pior caso do renderizador por software, não equivale a um celular real):', JSON.stringify(await medir()));
console.log(errors.length ? 'ERROS DE CONSOLE:\n' + errors.join('\n') : 'console: sem erros');
await browser.close(); srv.close();
process.exit(errors.length ? 1 : 0);
