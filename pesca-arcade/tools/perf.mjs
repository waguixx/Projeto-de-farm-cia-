// Mede o fps do laço real do jogo com e sem o shader de água, e informa qual renderizador WebGL o navegador de teste usa.
import { serve, open } from './lib.mjs';
const srv = await serve('dist');
for (const lowfx of [false, true]) {
  const { browser, page, errors } = await open(srv.url, { storage: { coins: 1e6, scene: 1, unlocked: [true, true, false, false], up: { rod: 10, sink: 6, reel: 6, hook: 5, line: 6, boat: 3, motor: 3 }, casts: 50, tut: true, tut2: true, mute: true, cfg: { music: true, sfx: true, vib: true, lowfx } } });
  const r = await page.evaluate(() => new Promise(res => { document.getElementById('splash').style.display = 'none'; __pesca.closePanel(); __pesca.startCast();
    const gl = document.createElement('canvas').getContext('webgl'); const ext = gl && gl.getExtension('WEBGL_debug_renderer_info'); const rend = gl ? (ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'webgl') : 'sem webgl';
    let n = 0, worst = 0, last = performance.now(); const t0 = last; const f = () => { const a = performance.now(); worst = Math.max(worst, a - last); last = a; n++; if (a - t0 < 4000) requestAnimationFrame(f); else res({ fps: +(n / ((a - t0) / 1000)).toFixed(1), piorQuadroMs: +worst.toFixed(1), renderizador: rend }); }; requestAnimationFrame(f); }));
  console.log(lowfx ? 'gráficos leves (sem shader):' : 'com shader de água:      ', JSON.stringify(r), errors.length ? errors : '');
  await browser.close();
}
srv.close();
