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
  if (i === 1) { await ev(() => { const p = __pesca, G = p.G, s = p.SCENES[p.S.scene]; const e = { kind: 'fish', def: s.leg, legend: true, gold: false, val: s.leg.val, x: G.hx, y: G.hy + 30, vx: 0, base: 110, r: 30, ph: 0, z: 1, face: 1 }; G.ents.push(e); p.startDuel(e); }); await wait(900); await shot('41-chefao'); await ev(() => { __pesca.G.duel && (__pesca.G.duel.t = 0); }); await wait(300); }
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
// fps e custo por quadro durante uma descida
await ev(() => { __pesca.S.scene = 1; __pesca.genEnts(); __pesca.startCast(); });
const perf = await ev(() => new Promise(res => { let n = 0, t0 = performance.now(), worst = 0, last = t0; const p = __pesca; let cpu = 0;
  const f = ts => { const a = performance.now(); p.draw(); cpu += performance.now() - a; worst = Math.max(worst, a - last); last = a; n++; if (a - t0 < 3000) requestAnimationFrame(f); else res({ fps: +(n / ((a - t0) / 1000)).toFixed(1), drawMs: +(cpu / n).toFixed(2), worstGapMs: +worst.toFixed(1) }); };
  requestAnimationFrame(f); }));
console.log('desempenho (descida no Mar):', JSON.stringify(perf));
console.log(errors.length ? 'ERROS DE CONSOLE:\n' + errors.join('\n') : 'console: sem erros');
await browser.close(); srv.close();
process.exit(errors.length ? 1 : 0);
