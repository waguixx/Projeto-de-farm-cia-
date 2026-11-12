import './fonts.css';
import './style.css';
import './game.js';

// PWA: registra o service worker (só quando servido por http/https e fora do app nativo)
const w = window as any;
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !(w.Capacitor && w.Capacitor.isNativePlatform && w.Capacitor.isNativePlatform())) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => { /* sem service worker: o jogo funciona igual, só não fica offline */ }); });
}
