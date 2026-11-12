// Testa a robustez do save: formato antigo, JSON corrompido, valores inválidos, relógio alterado e telas extremas.
import { serve, open } from './lib.mjs';
const srv = await serve('dist');
let fail = 0;
const check = (name, ok, extra = '') => { console.log((ok ? 'ok   ' : 'FALHA') + ' ' + name + (extra ? ' -> ' + extra : '')); if (!ok) fail++; };
async function run(name, storage, fn, opts = {}) {
  const { browser, page, errors } = await open(srv.url, { storage, ...opts });
  try { await fn(page); } catch (e) { check(name + ' (exceção)', false, e.message); }
  check(name + ': sem erros de console', errors.length === 0, errors.join(' | '));
  await browser.close();
}
const S = p => p.evaluate(() => JSON.parse(JSON.stringify(__pesca.S)));
// save exatamente no formato do jogo original (v1), sem nenhum campo novo
const v1 = { coins: 12345.6, scene: 1, unlocked: [true, true, false, false], up: { rod: 6, sink: 3, reel: 2, hook: 2, line: 3, boat: 1, motor: 0 }, album: { lambari: { n: 30, g: 1 }, sardinha: { n: 4, g: 0 } }, casts: 57,
  missions: null, last: Date.now() - 30 * 60000, mute: true, best: { cast: 900, depth: 88, fish: 160, combo: 5, legend: 0 }, x2: false, chestAt: 0, streak: { day: '2020-1-1', n: 3 }, skin: 1, skins: [true, true, false, false, false, false],
  tut: true, tut2: true, starter: false, starterSeen: true, piggy: 300, rank: 2, pearls: 1, earned: 50000, lastDbl: 50, noads: false, pass: null, daily: null };
await run('save v1', v1, async p => {
  const s = await S(p);
  check('v1: moedas mantidas (+ ganho offline e conquistas)', s.coins >= 12345 && s.coins < 12345 + 60000, String(s.coins));
  check('v1: mar, melhorias, álbum, pérolas e visual mantidos', s.scene === 1 && s.up.rod === 6 && s.album.lambari.n === 30 && s.pearls === 1 && s.skin === 1 && s.best.fish === 160);
  check('v1: campos novos criados', s.v === 2 && typeof s.stats === 'object' && s.cfg.music === true && s.items.isca === 0);
  check('v1: conquistas antigas reconhecidas na primeira abertura', Object.keys(s.ach).length >= 5, Object.keys(s.ach).join(','));
});
await run('json corrompido sem cópia', '{"coins":12,"up":{"rod":', async p => {
  const s = await S(p); check('corrompido: começa jogo novo sem travar', s.coins === 0 && s.casts === 0);
});
await run('valores inválidos', { coins: 'abc', scene: 9, unlocked: 'sim', up: { rod: -5, hook: 9999, sink: null }, album: [1, 2], best: null, skins: null, skin: 4, pearls: -3, missions: { day: 1 }, pass: 7, daily: 'x', streak: 5, earned: null, chestAt: 'amanhã' }, async p => {
  const s = await S(p);
  check('inválidos: tudo saneado', s.coins === 0 && s.scene === 0 && s.up.rod === 0 && s.up.hook === 10 && s.skin === 0 && s.pearls === 0 && s.unlocked[0] === true && s.unlocked[1] === false, JSON.stringify({ c: s.coins, sc: s.scene, up: s.up, sk: s.skin }));
  await p.evaluate(() => { document.getElementById('play').click(); __pesca.closePanel(); for (const k of ['shop', 'album', 'missions', 'scenes', 'coins', 'gift', 'desafio']) __pesca.openPanel(k); __pesca.closePanel(); __pesca.startCast(); });
  await p.waitForTimeout(1500);
  check('inválidos: dá para pescar', await p.evaluate(() => __pesca.G.phase !== 'idle'));
});
await run('cópia de segurança', v1, async p => {
  await p.evaluate(() => { __pesca.S.coins = 777777; localStorage.setItem('pesca-arcade-v1-bak', JSON.stringify(__pesca.S)); });
  await p.addInitScript(() => { if (!sessionStorage.getItem('__c')) { sessionStorage.setItem('__c', '1'); localStorage.setItem('pesca-arcade-v1', '{{{lixo'); } });
  await p.reload(); await p.waitForFunction(() => !!window.__pesca);
  const s = await S(p); check('principal corrompido: recupera a cópia', Math.floor(s.coins) >= 777777 && s.up.rod === 6, String(s.coins));
});
const semConquistas = Object.fromEntries('f100 f1k f10k d50 d150 d300 c5 c10 g1 g50 b1 b4 j1 jall full20 clean25 mar gelo abismo alb1 alball p1 st7 boats share'.split(' ').map(k => [k, 1])); // já premiadas, para medir só o relógio
await run('relógio para trás', { ...v1, ach: semConquistas, last: Date.now() + 5 * 864e5, maxT: Date.now() + 5 * 864e5, chestAt: 0 }, async p => {
  const s = await S(p);
  check('relógio alterado: sem ganho offline', Math.abs(s.coins - 12345.6) < 5, String(s.coins));
  check('relógio alterado: baú e bônus diário pausados', await p.evaluate(() => { __pesca.openPanel('gift'); const h = document.getElementById('mbody').innerHTML; return /Relógio do aparelho alterado/.test(h) && /Volte amanhã/.test(h); }));
});
await run('relógio muito para frente', { ...v1, ach: semConquistas, last: Date.now() - 400 * 864e5 }, async p => {
  const s = await S(p); const r = await p.evaluate(() => __pesca.rate());
  check('ausência longa: ganho offline limitado a 4 h', s.coins - 12345.6 <= r * 4 * 3600 * 0.35 + 5, (s.coins - 12345.6).toFixed(0) + ' de no máx. ' + (r * 4 * 3600 * 0.35).toFixed(0));
});
for (const [w, h] of [[320, 480], [360, 640], [412, 915], [768, 1024], [915, 412], [1280, 720]]) {
  await run(`tela ${w}x${h}`, v1, async p => {
    const g = await p.evaluate(() => { const r = document.getElementById('app').getBoundingClientRect(); return { w: r.width, h: r.height, H: __pesca.H }; });
    check(`tela ${w}x${h}: área de jogo em retrato e dentro da tela`, g.w <= w + 1 && g.H >= 480 && g.w <= 561, JSON.stringify(g));
    await p.screenshot({ path: `shots/tmp/tela-${w}x${h}.png` });
  }, { width: w, height: h, dsf: 1 });
}
await run('pausa ao sair do app', v1, async p => {
  await p.evaluate(() => { document.getElementById('play').click(); __pesca.closePanel(); __pesca.startCast(); });
  await p.waitForTimeout(600);
  const y0 = await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); return __pesca.G.hy; });
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.waitForTimeout(700);
  const y1 = await p.evaluate(() => __pesca.G.hy);
  check('pausa: a pescaria fica parada até tocar em Continuar', Math.abs(y1 - y0) < 1 && await p.evaluate(() => document.getElementById('pause').style.display === 'flex'), `${y0} -> ${y1}`);
  await p.evaluate(() => document.getElementById('pause').click()); await p.waitForTimeout(500);
  check('pausa: continua depois do toque', await p.evaluate(y => __pesca.G.hy > y + 5, y1));
});
srv.close();
console.log(fail ? `\n${fail} FALHA(S)` : '\nTodos os testes de robustez passaram.');
process.exit(fail ? 1 : 0);
