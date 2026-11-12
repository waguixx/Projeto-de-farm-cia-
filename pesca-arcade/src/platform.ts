// Ponto único de integração com anúncios recompensados (AdMob) e compras (Google Play Billing).
//
// HOJE: tudo em MODO TESTE. O jogo mostra o "anúncio de teste" de 3 s e a tela de compra de teste,
// sem cobrar nada. Na web/PWA continua sempre assim.
//
// PARA LIGAR NO APK (ver docs/APK.md):
//   1. preencha os IDs abaixo;   2. mude LIVE.ads e/ou LIVE.iap para true;   3. gere o app com Capacitor.
// O código nativo usa os plugins @capacitor-community/admob e cordova-plugin-purchase, acessados
// pelos objetos globais que eles criam; se o plugin não estiver presente, o jogo volta ao modo teste.
// ATENÇÃO: os caminhos nativos foram escritos conforme a documentação dos plugins, mas só podem ser
// validados em um aparelho com as contas configuradas.
export const LIVE = { ads: false, iap: false };

export const ADMOB = {
  // ID de teste oficial do Google para vídeo recompensado. Troque pelo seu bloco de anúncios.
  rewardedId: 'ca-app-pub-3940256099942544/5224354917',
  testing: true, // deixe true até o app ser aprovado, para não arriscar a conta do AdMob
};

/** Produtos do jogo -> IDs cadastrados no Google Play Console. */
export const SKUS: Record<string, { sku: string; consumable: boolean; sub?: boolean }> = {
  p1: { sku: 'moedas_punhado', consumable: true },
  p2: { sku: 'moedas_balde', consumable: true },
  p3: { sku: 'moedas_bau', consumable: true },
  starter: { sku: 'oferta_inicial', consumable: false },
  piggy: { sku: 'cofrinho', consumable: true },
  noads: { sku: 'sem_anuncios', consumable: false },
  x2: { sku: 'peixes_em_dobro', consumable: false },
  pass: { sku: 'passe_mensal', consumable: true }, // comprado de novo a cada mês
};

const w = window as any;
const cap = () => w.Capacitor;
export const isNative = (): boolean => !!(cap() && cap().isNativePlatform && cap().isNativePlatform());
const admob = () => (cap() && cap().Plugins && cap().Plugins.AdMob) || null;
const store = () => (w.CdvPurchase && w.CdvPurchase.store) || null;

export const adsLive = () => LIVE.ads && isNative() && !!admob();
export const iapLive = () => LIVE.iap && isNative() && !!store();

let adsReady = false, iapReady = false;
const pending: Record<string, (ok: boolean) => void> = {};

export async function initPlatform(): Promise<void> {
  if (adsLive() && !adsReady) {
    try { await admob().initialize({ initializeForTesting: ADMOB.testing }); adsReady = true; preload(); } catch { adsReady = false; }
  }
  if (iapLive() && !iapReady) {
    try {
      const C = w.CdvPurchase, s = C.store;
      s.register(Object.values(SKUS).map(p => ({ id: p.sku, platform: C.Platform.GOOGLE_PLAY, type: p.consumable ? C.ProductType.CONSUMABLE : C.ProductType.NON_CONSUMABLE })));
      s.when().approved((tx: any) => tx.verify()).verified((rc: any) => rc.finish()).finished((tx: any) => {
        for (const pr of tx.products || []) { const cb = pending[pr.id]; if (cb) { delete pending[pr.id]; cb(true); } }
      });
      await s.initialize([C.Platform.GOOGLE_PLAY]);
      iapReady = true;
    } catch { iapReady = false; }
  }
}

let loaded = false;
async function preload() { try { await admob().prepareRewardVideoAd({ adId: ADMOB.rewardedId, isTesting: ADMOB.testing }); loaded = true; } catch { loaded = false; } }

/** Mostra um vídeo recompensado de verdade. Resolve true só se a pessoa assistiu até ganhar a recompensa. */
export async function showRewarded(): Promise<boolean> {
  if (!adsLive() || !adsReady) return false;
  try {
    if (!loaded) await preload();
    if (!loaded) return false;
    loaded = false;
    const reward = await admob().showRewardVideoAd();
    preload();
    return !!reward;
  } catch { preload(); return false; }
}

/** Preço local vindo da loja (ex.: "R$ 4,90"), ou null para usar o texto padrão do jogo. */
export function priceOf(id: string): string | null {
  if (!iapLive() || !iapReady) return null;
  try { const p = store().get(SKUS[id].sku), o = p && p.getOffer(); return (o && o.pricingPhases && o.pricingPhases[0] && o.pricingPhases[0].price) || null; } catch { return null; }
}

/** Abre a compra na Google Play. Resolve true quando a compra foi aprovada e finalizada. */
export function purchase(id: string): Promise<boolean> {
  return new Promise(resolve => {
    if (!iapLive() || !iapReady || !SKUS[id]) { resolve(false); return; }
    try {
      const sku = SKUS[id].sku, offer = store().get(sku) && store().get(sku).getOffer();
      if (!offer) { resolve(false); return; }
      const t = setTimeout(() => { if (pending[sku]) { delete pending[sku]; resolve(false); } }, 120000);
      pending[sku] = ok => { clearTimeout(t); resolve(ok); };
      store().order(offer).then((err: any) => { if (err && pending[sku]) { clearTimeout(t); delete pending[sku]; resolve(false); } });
    } catch { resolve(false); }
  });
}

/** Itens permanentes que a conta já possui (para "Restaurar compras"). */
export async function restore(): Promise<string[]> {
  if (!iapLive() || !iapReady) return [];
  try { await store().restorePurchases(); return Object.keys(SKUS).filter(id => !SKUS[id].consumable && store().owned(SKUS[id].sku)); } catch { return []; }
}
