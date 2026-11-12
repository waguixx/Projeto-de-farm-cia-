# Transformar em APK (Android) com anúncios e compras

O jogo já está preparado: `capacitor.config.json` aponta para `dist/` e todo o código de
anúncios e compras está em `src/platform.ts`, desligado por padrão (modo teste).

> Importante: os caminhos nativos de AdMob e Play Billing foram escritos seguindo a documentação
> dos plugins, mas **não foram testados em aparelho**, porque isso exige as suas contas.
> Trate o primeiro teste no celular como parte da integração.

## 1. Gerar o projeto Android

Precisa de Node 20+, Android Studio e JDK 17 no seu computador.

```bash
cd pesca-arcade
npm install
npm run android:init     # instala o Capacitor e os plugins e cria a pasta android/
npm run android:sync     # build do jogo + copia para o projeto Android
npm run android:open     # abre no Android Studio
```

No Android Studio: **Build > Generate Signed App Bundle / APK**. Para a Play Store, gere um
**AAB** assinado. Guarde bem o arquivo da chave (keystore) e a senha: sem eles não dá para atualizar o app.

Antes de publicar, troque o `appId` em `capacitor.config.json` (`com.pescaarcade.app`) por um seu,
por exemplo `br.com.seunome.pescaarcade`. Ele não pode mudar depois da primeira publicação.

Ícone: use `public/icons/play-store-1024.png` na ficha da loja e, no Android Studio,
**New > Image Asset** com `public/icons/maskable-512.png` para o ícone do app.

## 2. Anúncios recompensados (AdMob)

1. Crie a conta em admob.google.com, cadastre o app e crie um bloco **Premiado**.
2. Em `android/app/src/main/AndroidManifest.xml`, dentro de `<application>`:
   ```xml
   <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-XXXXXXXX~YYYYYYYY"/>
   ```
3. Em `src/platform.ts`:
   - `ADMOB.rewardedId`: o ID do seu bloco premiado;
   - `LIVE.ads = true`;
   - deixe `ADMOB.testing = true` enquanto testa e mude para `false` só na versão que vai para a loja.
4. `npm run android:sync` e teste no celular: baú, dobrar a pescaria, salvar a linha e item grátis.

Enquanto `LIVE.ads` for `false` (ou na versão web), o jogo mostra o anúncio de teste de 3 segundos.

## 3. Compras (Google Play Billing)

1. Na Play Console, crie o app, envie um AAB para **teste interno** (a loja só libera produtos depois disso).
2. Em **Monetização > Produtos > Produtos no app**, crie os produtos com exatamente estes IDs:

   | ID na Play Console | Item no jogo | Tipo |
   |---|---|---|
   | `moedas_punhado` | Punhado de moedas | consumível |
   | `moedas_balde` | Balde de moedas | consumível |
   | `moedas_bau` | Baú de moedas | consumível |
   | `cofrinho` | Cofrinho | consumível |
   | `passe_mensal` | Passe premium do mês | consumível |
   | `oferta_inicial` | Oferta inicial | permanente |
   | `sem_anuncios` | Sem anúncios | permanente |
   | `peixes_em_dobro` | Peixes em dobro | permanente |

   Para mudar os IDs, edite a tabela `SKUS` em `src/platform.ts`.
3. Em `src/platform.ts`, mude `LIVE.iap = true` e rode `npm run android:sync`.
4. Cadastre seu e-mail como **testador de licença** na Play Console para comprar sem ser cobrado.

Com `LIVE.iap = true`, o botão de preço abre a compra da Google Play; os itens permanentes voltam
em **Ajustes > Restaurar compras**. O aviso "Modo teste" some sozinho.

### Dois pontos de atenção antes de cobrar de verdade

- **Preços na tela**: os valores em reais ainda são os textos fixos do jogo. A função `priceOf()` já
  busca o preço real da loja, mas ainda não está ligada aos botões. Ligue antes de vender em outros países.
- **Validação de compra**: hoje a compra é confirmada só no aparelho. Para um jogo offline pequeno isso
  é aceitável, mas pode ser burlado em aparelho com root. Se a receita crescer, valide o recibo em um servidor.

## 4. Exigências da Play Store

- **Política de privacidade**: obrigatória para app com anúncios. Publique uma página e coloque o endereço
  na ficha da loja e em `PRIVACY_URL` (em `src/game.js`), que faz o link aparecer em Ajustes.
- **Classificação indicativa** e **Segurança dos dados**: preencha os formulários (o AdMob coleta ID de publicidade).
- **Público-alvo**: se marcar crianças, as regras de anúncios ficam bem mais rígidas. O mais simples é 13+.
- **Consentimento (LGPD/GDPR)**: o AdMob oferece a tela de consentimento (UMP); ative no painel do AdMob.
- Contas pessoais novas na Play Console precisam de teste fechado com 12 testadores por 14 dias antes de publicar.
