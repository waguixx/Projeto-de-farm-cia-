// Imagem de recorde gerada em canvas (1080x1350, formato de feed/status) e compartilhamento.
// No celular abre a folha nativa de compartilhar (WhatsApp, Instagram...) com a imagem anexada;
// onde isso não existe, baixa o PNG e copia o texto.
export interface CardOpts {
  title: string; big: string; bigLabel: string; stats: [string, string][]; footer: string; url: string;
  sky: string; water: [string, string]; gold?: boolean;
  hero: (c: CanvasRenderingContext2D) => void; // desenha o peixe centrado em (0,0)
}
const F = '"Lilita One",Fredoka,system-ui,sans-serif';
function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function txt(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, fill: string, stroke = '#06283a', sw = 0) {
  c.font = `${size}px ${F}`; c.lineJoin = 'round';
  if (stroke) { c.lineWidth = sw || Math.max(6, size / 5); c.strokeStyle = stroke; c.strokeText(s, x, y); }
  c.fillStyle = fill; c.fillText(s, x, y);
}
function fit(c: CanvasRenderingContext2D, s: string, size: number, max: number) { c.font = `${size}px ${F}`; const w = c.measureText(s).width; return w > max ? Math.floor(size * max / w) : size; }

export function drawCard(o: CardOpts): HTMLCanvasElement {
  const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d')!; c.textAlign = 'center';
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, o.water[0]); g.addColorStop(1, o.water[1]); c.fillStyle = g; c.fillRect(0, 0, W, H);
  // raios de luz
  c.save(); c.globalAlpha = .1; c.fillStyle = '#fff';
  for (let i = 0; i < 6; i++) { const x = i * 230 - 120; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 110, 0); c.lineTo(x - 260, H); c.lineTo(x - 470, H); c.closePath(); c.fill(); }
  c.restore();
  // bolhas
  c.fillStyle = 'rgba(255,255,255,.22)';
  for (let i = 0; i < 26; i++) { const r = 5 + ((i * 37) % 17); c.beginPath(); c.arc((i * 211 + 60) % W, (i * 389 + 120) % H, r, 0, 7); c.fill(); }
  // logo
  txt(c, 'PESCA', W / 2, 150, 104, '#fff', '#06283a', 18); txt(c, 'ARCADE', W / 2, 252, 118, '#ffd23f', '#6a3500', 18);
  // faixa de título
  const ts = fit(c, o.title, 58, 800); c.font = `${ts}px ${F}`; const tw = Math.max(420, c.measureText(o.title).width + 110);
  rr(c, W / 2 - tw / 2, 300, tw, 96, 48); c.fillStyle = o.gold ? '#ff9800' : '#0b84aa'; c.fill(); c.lineWidth = 8; c.strokeStyle = '#fff'; c.stroke();
  txt(c, o.title, W / 2, 368, ts, '#fff', o.gold ? '#7a3f00' : '#06283a', 10);
  // peixe em destaque
  const hy = 610; const halo = c.createRadialGradient(W / 2, hy, 40, W / 2, hy, 400); halo.addColorStop(0, o.gold ? 'rgba(255,214,70,.75)' : 'rgba(255,255,255,.55)'); halo.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = halo; c.beginPath(); c.arc(W / 2, hy, 400, 0, 7); c.fill();
  c.save(); c.translate(W / 2, hy); c.fillStyle = o.gold ? 'rgba(255,214,70,.16)' : 'rgba(255,255,255,.1)'; for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(-52, -520); c.lineTo(52, -520); c.closePath(); c.fill(); } c.restore();
  c.save(); c.translate(W / 2, hy); o.hero(c); c.restore(); c.textAlign = 'center';
  // número grande
  const bs = fit(c, o.big, 190, 940); txt(c, o.big, W / 2, 905, bs, '#ffd23f', '#6a3500', 22);
  txt(c, o.bigLabel, W / 2, 968, fit(c, o.bigLabel, 46, 940), '#fff', '#06283a', 10);
  // estatísticas
  const n = o.stats.length, gw = 232, gap = 20, x0 = W / 2 - (n * gw + (n - 1) * gap) / 2;
  o.stats.forEach((s, i) => { const x = x0 + i * (gw + gap); rr(c, x, 1010, gw, 150, 30); c.fillStyle = 'rgba(255,255,255,.94)'; c.fill();
    txt(c, s[0], x + gw / 2, 1082, fit(c, s[0], 60, gw - 24), '#0b3a4a', ''); c.font = `600 28px Fredoka,system-ui,sans-serif`; c.fillStyle = '#5f7d8a'; c.fillText(s[1], x + gw / 2, 1128); });
  // rodapé
  txt(c, o.footer, W / 2, 1245, fit(c, o.footer, 64, 980), '#fff', '#06283a', 12);
  if (o.url) { c.font = `600 34px Fredoka,system-ui,sans-serif`; c.fillStyle = 'rgba(255,255,255,.85)'; c.fillText(o.url.replace(/^https?:\/\//, ''), W / 2, 1305); }
  return cv;
}

export type ShareResult = 'shared' | 'saved' | 'cancelled' | 'failed';
export async function shareCanvas(cv: HTMLCanvasElement, text: string, name = 'pesca-arcade.png'): Promise<ShareResult> {
  try {
    const blob: Blob | null = await new Promise(r => cv.toBlob(r, 'image/png'));
    if (!blob) return 'failed';
    const nav: any = navigator;
    try {
      const file = new File([blob], name, { type: 'image/png' });
      if (nav.canShare && nav.canShare({ files: [file] })) { await nav.share({ files: [file], text, title: 'Pesca Arcade' }); return 'shared'; }
    } catch (e: any) { if (e && e.name === 'AbortError') return 'cancelled'; }
    try { await navigator.clipboard.writeText(text); } catch { /* sem permissão: segue só com a imagem */ }
    const a = document.createElement('a'), u = URL.createObjectURL(blob); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
    return 'saved';
  } catch { return 'failed'; }
}
