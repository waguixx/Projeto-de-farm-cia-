// Robô jogador: joga o jogo REAL (mesmo código de update, colisão, geração de peixes e loja)
// com o tempo acelerado, para medir o ritmo da economia.
// Uso: npm run build && npm run sim [-- --perfil=casual|bom] [--dias=12] [--anuncios]
import { serve, open } from './lib.mjs';
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k)); return a ? (a.includes('=') ? a.split('=')[1] : true) : d; };
const PERFIS = { casual: { lat: 260, erro: 26, toques: 5.5, pausa: 5 }, medio: { lat: 340, erro: 16, toques: 6.5, pausa: 4 }, bom: { lat: 460, erro: 8, toques: 8, pausa: 3 } };
const perfil = arg('perfil', 'medio'), dias = +arg('dias', 14), ads = !!arg('anuncios', false), seeds = +arg('seeds', 3);
const custos = arg('custos', '') ? String(arg('custos')).split(',').map(Number) : null, offEff = +arg('off', -1), quiet = !!arg('quiet', false);
const srv = await serve('dist');

async function jogar(seed, start = null, opt = {}) {
  const { browser, page, errors } = await open(srv.url, { storage: start || '' , dsf: 1 });
  const res = await page.evaluate(({ cfg, seed, dias, ads, opt, custos, offEff }) => {
    const p = __pesca, G = p.G; window.__simMode = true;
    if (custos) custos.forEach((c, i) => { p.SCENES[i + 1].cost = c; });
    const OFF = offEff >= 0 ? offEff : (p.ECO ? p.ECO.offEff : 1), OFFH = p.ECO ? p.ECO.offHours : 4;
    let sd = seed >>> 0; const rnd = () => { sd = sd + 0x6D2B79F5 | 0; let t = Math.imul(sd ^ sd >>> 15, 1 | sd); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    Math.random = rnd; // sorteios do jogo passam a ser reproduzíveis
    document.getElementById('splash').style.display = 'none';
    p.S.mute = true; if (ads) p.S.noads = true;
    const DT = 1 / 60; let T = 0, activeT = 0; const log = [], marks = {};
    const idle = sec => { p.S.coins += p.rate() * sec; p.S.earned += p.rate() * sec; T += sec; activeT += sec; };
    const closeUi = () => { p.closeResult(); p.closePanel(); };
    let noise = 0, noiseT = 0;
    function cast() {
      closeUi(); p.startCast(); if (G.phase === 'idle') return 0; let steps = 0, tapAcc = 0;
      while (G.phase !== 'idle' && steps < 60 * 400) {
        steps++;
        if (G.rev > 0) { if (ads) document.getElementById('revyes').click(); else document.getElementById('revno').click(); continue; }
        if (G.duel) { tapAcc += DT * cfg.toques * (0.85 + rnd() * 0.3); while (tapAcc >= 1 && G.duel) { tapAcc--; p.duelTap(); } p.update(DT); continue; }
        // decide para onde levar o anzol
        const dir = G.phase === 'down' ? 1 : -1, full = G.caught.length >= p.cap(); let best = null, bs = -1e9, dodge = 0;
        for (const e of G.ents) {
          if (e.dead) continue; const dy = (e.y - G.hy) * dir, dx = e.x - G.hx;
          if (e.kind === 'cut' && !(e.cool > 0) && dy > -30 && dy < 95 && Math.abs(dx) < 52) dodge = dx >= 0 ? -1 : 1;
          else if (e.kind === 'steal' && !e.fed && G.caught.length && dy > -30 && dy < 70 && Math.abs(dx) < 60) dodge = dodge || (dx >= 0 ? -1 : 1);
          else if (e.kind === 'fish' && !full && dy > 8 && dy < 260) { const sc = (e.val || 1) / (1 + dy / 60) / (1 + Math.abs(dx) / 90) * (e.legend ? 0.6 : 1); if (sc > bs) { bs = sc; best = e; } }
        }
        noiseT -= DT; if (noiseT <= 0) { noiseT = 0.35 + rnd() * 0.4; noise = (rnd() - 0.5) * 2 * cfg.erro; }
        let tx = G.hx; if (dodge) tx = G.hx + dodge * 80; else if (best) tx = best.x + noise;
        if (G.tutPause) tx = G.hx + 90;
        if (G.stun <= 0) { const d = tx - G.hx, m = cfg.lat * DT; G.hx += Math.max(-m, Math.min(m, d)); G.hx = Math.max(26, Math.min(p.W - 26, G.hx)); }
        p.update(DT);
      }
      T += steps * DT; activeT += steps * DT;
      const d = document.getElementById('resdbl'); if (ads && p.resOn && d && d.style.display !== 'none') { d.click(); idle(20); }
      closeUi(); return steps * DT;
    }
    function shop() {
      const S = p.S; let bought = 0;
      for (let guard = 0; guard < 200; guard++) {
        const nx = S.unlocked.indexOf(false);
        if (nx > 0 && S.coins >= p.SCENES[nx].cost) { S.coins -= p.SCENES[nx].cost; S.unlocked[nx] = true; S.scene = nx; G.mode = null; p.genEnts(); marks[p.SCENES[nx].id] = { min: activeT / 60, dia: day, casts: S.casts }; bought++; continue; }
        const seaCost = nx > 0 ? p.SCENES[nx].cost : Infinity, saving = S.coins >= seaCost * 0.4;
        let pick = null, pc = Infinity;
        for (const u of p.UPS) { const l = S.up[u.k]; if (l >= u.max) continue; if (u.k === 'motor' && !S.up.boat) continue; const c = p.cost(u); if (c > S.coins) continue; if (saving && c > S.coins * 0.06) continue; if (c > seaCost * 0.12) continue; // quem vê a meta do próximo mar para de gastar em melhoria cara
          // jogador comum: compra o mais barato, com leve preferência pelo que rende mais (anzol e vara)
          const w = c * (u.k === 'hook' ? 0.5 : u.k === 'rod' ? 0.7 : u.k === 'boat' ? 0.8 : 1); if (w < pc) { pc = w; pick = u; } }
        if (!pick) break; S.coins -= p.cost(pick); S.up[pick.k]++; bought++;
      }
      if (bought) { if (G.phase === 'idle') p.genEnts(); idle(1.2 * Math.min(bought, 4)); }
    }
    let day = 1; const perDay = [];
    const sessao = min => { const end = activeT + min * 60; while (activeT < end) { const c0 = p.S.coins; cast(); idle(cfg.pausa); shop(); if (opt.stopAt && marks[opt.stopAt]) return true; } return false; };
    const snap = tag => log.push({ tag, min: +(activeT / 60).toFixed(1), dia: day, moedas: p.fmt(p.S.coins), rate: +p.rate().toFixed(1), up: Object.values(p.S.up).join('/'), mar: p.SCENES[p.S.scene].id, melhor: p.fmt(p.S.best.cast), ganho: p.fmt(p.S.earned), perolas: p.pearlGain() });
    // Dia 1: sessão longa de 60 min. Dias seguintes: 3 sessões de 8 min, com ganho offline (máx. 4 h), baú e bônus diário.
    let stop = false;
    for (const m of [5, 10, 15, 20, 30, 45, 60]) { stop = sessao(m - activeT / 60); snap(m + ' min'); if (stop) break; }
    for (day = 2; day <= dias && !stop; day++) {
      p.S.missions = null; p.ensureMissions();
      p.S.coins += p.dailyAmt(((day - 1) % 7) + 1);
      for (let s = 0; s < 3 && !stop; s++) { const off = p.rate() * OFFH * 3600 * OFF; p.S.coins += off + p.chestAmt(); p.S.earned += off; shop(); stop = sessao(8); }
      snap('dia ' + day);
    }
    return { marks, log, casts: p.S.casts, final: JSON.parse(JSON.stringify(p.S)), activeMin: activeT / 60 };
  }, { cfg: PERFIS[perfil], seed, dias, ads, opt, custos, offEff });
  await browser.close();
  if (errors.length) console.log('ERROS:', errors.slice(0, 3));
  return res;
}

const runs = []; for (let i = 0; i < seeds; i++) runs.push(await jogar(1234 + i * 77));
const med = k => { const v = runs.map(r => r.marks[k]).filter(Boolean); if (!v.length) return 'não liberou em ' + dias + ' dias'; const a = v.map(x => x.min).sort((a, b) => a - b), d = v.map(x => x.dia).sort((a, b) => a - b); return `${a[Math.floor(a.length / 2)].toFixed(1)} min de jogo ativo (dia ${d[Math.floor(d.length / 2)]})  [${a.map(x => x.toFixed(0)).join(', ')}]`; };
console.log(`\nPerfil "${perfil}"${ads ? ' + vê anúncios' : ''}, ${seeds} partidas, até ${dias} dias`);
console.log('  Mar   :', med('mar')); console.log('  Gelo  :', med('gelo')); console.log('  Abismo:', med('abismo'));
if (!quiet) console.table(runs[0].log);
// Prestígio: recomeça com as pérolas ganhas ao liberar o Abismo/fim e mede o tempo até o Gelo de novo
const f = runs[0].final, g = Math.floor(Math.sqrt((f.earned || 0) / (globalThis.PEARL_DIV || 40000)));
const pg = await (async () => { const { browser, page } = await open(srv.url, { storage: f, dsf: 1 }); const v = await page.evaluate(() => __pesca.pearlGain()); await browser.close(); return v; })();
if (pg > 0) {
  const st = { ...f, coins: 0, scene: 0, unlocked: [true, false, false, false], up: { rod: 0, sink: 0, reel: 0, hook: 0, line: 0, boat: 0, motor: 0 }, piggy: 0, earned: 0, pearls: (f.pearls || 0) + pg, last: Date.now(), maxT: Date.now() };
  const r2 = await jogar(999, st, { stopAt: 'gelo' });
  const a = runs[0].marks.gelo, b = r2.marks.gelo;
  console.log(`\nPrestígio ao fim da 1ª partida: +${pg} pérolas (+${pg * 10}%).`);
  console.log(`  2ª volta: Mar em ${r2.marks.mar ? r2.marks.mar.min.toFixed(1) : '?'} min, Gelo em ${b ? b.min.toFixed(1) : '?'} min (1ª volta: Gelo em ${a ? a.min.toFixed(1) : '?'} min)`);
}
srv.close();
