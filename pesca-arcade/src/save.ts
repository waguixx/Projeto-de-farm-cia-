// Persistência robusta do progresso.
// - Mesma chave do jogo original ("pesca-arcade-v1"): saves antigos continuam valendo.
// - Tudo o que vem do disco é validado campo a campo (nada de NaN, negativos ou tipos errados).
// - Cópia de segurança em outra chave: se o save principal corromper, o jogo recupera a cópia.
export const KEY = 'pesca-arcade-v1';
export const BAK = 'pesca-arcade-v1-bak';
export const SAVE_VERSION = 2;

type Obj = Record<string, any>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, d = 0, min = 0, max = 1e300): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};
const int = (v: unknown, d = 0, min = 0, max = 1e15) => Math.floor(num(v, d, min, max));
const bool = (v: unknown, d = false) => (typeof v === 'boolean' ? v : d);
const str = (v: unknown, d = '') => (typeof v === 'string' && v.length < 64 ? v : d);
const boolArr = (v: unknown, len: number, first = true): boolean[] => {
  const out: boolean[] = [];
  for (let i = 0; i < len; i++) out.push(Array.isArray(v) ? v[i] === true : false);
  if (first) out[0] = true;
  return out;
};

export interface Limits { scenes: number; skins: number; upMax: Record<string, number>; fishIds: string[]; missionTypes: string[] }
export interface LoadResult { state: Obj; status: 'novo' | 'ok' | 'recuperado' | 'reiniciado' }

function readKey(k: string): Obj | null {
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return null;
    const j = JSON.parse(raw);
    return isObj(j) ? j : null;
  } catch { return null; }
}

/** Devolve um estado completo e válido a partir de qualquer coisa que esteja salva. */
export function sanitize(j: Obj, def: Obj, lim: Limits): Obj {
  const S: Obj = { ...def };
  S.v = SAVE_VERSION;
  S.coins = num(j.coins); S.earned = num(j.earned); S.piggy = num(j.piggy);
  S.pearls = int(j.pearls, 0, 0, 1e9); S.casts = int(j.casts);
  S.scene = int(j.scene, 0, 0, lim.scenes - 1);
  S.unlocked = boolArr(j.unlocked, lim.scenes);
  // um mar só pode estar liberado se o anterior também estiver
  for (let i = 1; i < lim.scenes; i++) if (!S.unlocked[i - 1]) S.unlocked[i] = false;
  if (!S.unlocked[S.scene]) S.scene = 0;
  S.up = {};
  for (const k of Object.keys(lim.upMax)) S.up[k] = int(isObj(j.up) ? j.up[k] : 0, 0, 0, Math.min(lim.upMax[k], 400));
  S.album = {};
  if (isObj(j.album)) for (const id of lim.fishIds) { const a = j.album[id]; if (isObj(a) && int(a.n) > 0) S.album[id] = { n: int(a.n), g: int(a.g) }; }
  const b = isObj(j.best) ? j.best : {};
  S.best = { cast: num(b.cast), depth: int(b.depth, 0, 0, 1e6), fish: int(b.fish), combo: int(b.combo, 0, 0, 999), legend: int(b.legend) };
  const st = isObj(j.streak) ? j.streak : {};
  S.streak = { day: str(st.day), n: int(st.n, 0, 0, 7) };
  S.skins = boolArr(j.skins, lim.skins);
  S.skin = int(j.skin, 0, 0, lim.skins - 1); if (!S.skins[S.skin]) S.skin = 0;
  S.mute = bool(j.mute); S.x2 = bool(j.x2); S.noads = bool(j.noads); S.starter = bool(j.starter); S.starterSeen = bool(j.starterSeen);
  const played = S.casts > 0;
  S.tut = bool(j.tut, played); S.tut2 = bool(j.tut2, played);
  S.chestAt = num(j.chestAt); S.last = num(j.last, Date.now()); S.maxT = num(j.maxT, S.last);
  S.lastDbl = Number.isFinite(j.lastDbl) ? j.lastDbl : -9;
  S.rank = j.rank === undefined ? -1 : int(j.rank, 0, 0, 99); // -1: o jogo recalcula
  // missões: só aceita se a forma estiver certa; senão o jogo gera de novo
  S.missions = null;
  if (isObj(j.missions) && typeof j.missions.day === 'string' && Array.isArray(j.missions.list)) {
    const list = j.missions.list.filter((m: any) => isObj(m) && lim.missionTypes.includes(m.t) && (m.t !== 'fish' || lim.fishIds.includes(m.id)))
      .map((m: any) => ({ t: m.t, id: m.id, n: int(m.n, 1, 1), p: int(m.p), r: num(m.r), done: bool(m.done) }));
    if (list.length) S.missions = { day: str(j.missions.day), list };
  }
  S.pass = null;
  if (isObj(j.pass) && typeof j.pass.m === 'string') S.pass = { m: str(j.pass.m), xp: int(j.pass.xp), got: int(j.pass.got, 0, 0, 10), pgot: int(j.pass.pgot, 0, 0, 10), prem: bool(j.pass.prem) };
  S.daily = null;
  if (isObj(j.daily) && typeof j.daily.day === 'string') S.daily = { day: str(j.daily.day), tries: int(j.daily.tries, 0, 0, 99), best: num(j.daily.best) };
  // campos novos (v2): mantidos como vierem, se forem objetos simples e válidos
  S.ach = {}; if (isObj(j.ach)) for (const k of Object.keys(j.ach).slice(0, 200)) if (j.ach[k] === true || j.ach[k] === 1) S.ach[k] = 1;
  const stt = isObj(j.stats) ? j.stats : {};
  S.stats = {}; for (const k of Object.keys(def.stats || {})) S.stats[k] = num(stt[k]);
  const cf = isObj(j.cfg) ? j.cfg : {};
  S.cfg = { music: bool(cf.music, true), sfx: bool(cf.sfx, true), vib: bool(cf.vib, true), lowfx: bool(cf.lowfx, false) };
  S.week = null; if (isObj(j.week) && typeof j.week.k === 'string') S.week = { k: str(j.week.k), p: int(j.week.p), got: bool(j.week.got) };
  S.prestiges = int(j.prestiges);
  const it = isObj(j.items) ? j.items : {};
  S.items = { isca: int(it.isca, 0, 0, 999), ima: int(it.ima, 0, 0, 999), escudo: int(it.escudo, 0, 0, 999) };
  return S;
}

export function loadState(def: Obj, lim: Limits): LoadResult {
  const main = readKey(KEY);
  if (main) return { state: sanitize(main, def, lim), status: 'ok' };
  let hadSomething = false;
  try { hadSomething = localStorage.getItem(KEY) !== null; } catch { /* sem acesso ao armazenamento */ }
  const bak = readKey(BAK);
  if (bak) return { state: sanitize(bak, def, lim), status: 'recuperado' };
  return { state: sanitize({}, def, lim), status: hadSomething ? 'reiniciado' : 'novo' };
}

let lastBak = 0;
export function saveState(S: Obj): boolean {
  const now = Date.now();
  S.last = now; S.maxT = Math.max(num(S.maxT), now); S.v = SAVE_VERSION;
  try {
    const txt = JSON.stringify(S);
    localStorage.setItem(KEY, txt);
    if (now - lastBak > 60000 || lastBak > now) { lastBak = now; localStorage.setItem(BAK, txt); }
    return true;
  } catch { return false; }
}

/** O relógio do aparelho voltou no tempo em relação ao maior horário já visto? */
export const clockRolledBack = (S: Obj, tolMs = 5 * 60000) => Date.now() + tolMs < num(S.maxT);
