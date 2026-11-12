// Gera os ícones do app (PWA e loja) com a própria arte do jogo. Uso: npm run build && node tools/icons.mjs
import { writeFile, mkdir } from 'node:fs/promises';
import { serve, open } from './lib.mjs';
const srv = await serve('dist');
const { browser, page } = await open(srv.url, { storage: '', dsf: 1 });
await mkdir('public/icons', { recursive: true });
for (const [name, size, pad] of [['icon-512', 512, 0], ['icon-192', 192, 0], ['maskable-512', 512, .12], ['play-store-1024', 1024, 0]]) {
  const url = await page.evaluate(({ size, pad }) => {
    const p = __pesca, cv = document.createElement('canvas'); cv.width = cv.height = size; const c = cv.getContext('2d'), S = size / 512; c.scale(S, S);
    const rr = (x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
    if (!pad) { rr(0, 0, 512, 512, 112); c.clip(); }
    const g = c.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#5fe0f0'); g.addColorStop(.45, '#1a9fd0'); g.addColorStop(1, '#06305a'); c.fillStyle = g; c.fillRect(0, 0, 512, 512);
    c.save(); c.globalAlpha = .13; c.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { const x = i * 130 - 40; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 70, 0); c.lineTo(x - 120, 512); c.lineTo(x - 250, 512); c.closePath(); c.fill(); } c.restore();
    const k = 1 - pad * 2; c.translate(256, 256); c.scale(k, k); c.translate(-256, -256);
    const halo = c.createRadialGradient(256, 290, 20, 256, 290, 250); halo.addColorStop(0, 'rgba(255,240,170,.75)'); halo.addColorStop(1, 'rgba(255,240,170,0)'); c.fillStyle = halo; c.fillRect(0, 0, 512, 512);
    // linha e anzol
    c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(372, -20); c.lineTo(372, 150); c.stroke();
    c.strokeStyle = '#0b3a4a'; c.lineWidth = 30; c.beginPath(); c.moveTo(372, 150); c.lineTo(372, 205); c.arc(340, 205, 32, 0, Math.PI * .95); c.stroke();
    c.strokeStyle = '#eef3f6'; c.lineWidth = 16; c.beginPath(); c.moveTo(372, 150); c.lineTo(372, 205); c.arc(340, 205, 32, 0, Math.PI * .95); c.stroke();
    c.fillStyle = '#e53935'; c.strokeStyle = '#0b3a4a'; c.lineWidth = 6; c.beginPath(); c.arc(372, 146, 17, 0, 7); c.fill(); c.stroke();
    // peixe dourado do jogo
    const def = p.SCENES[0].fish.find(f => f.id === 'tucunare'); c.save(); c.translate(236, 322); c.rotate(-.32); c.scale(7.4, 7.4); p.drawFish(c, def, true, .35, false); c.restore();
    c.fillStyle = 'rgba(255,255,255,.5)'; for (const [x, y, r] of [[86, 150, 16], [120, 104, 9], [430, 380, 13], [405, 430, 7], [70, 420, 10]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
    return cv.toDataURL('image/png');
  }, { size, pad });
  await writeFile(`public/icons/${name}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log('ícone', name, size);
}
await browser.close(); srv.close();
