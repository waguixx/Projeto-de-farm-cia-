# Pesca Arcade

Jogo arcade de pesca para celular, em português do Brasil. Canvas 2D com água em shader WebGL,
áudio gerado por código, instalável como PWA e preparado para virar APK.

O jogo original (um único `index.html`) está preservado em `legacy/index.html`.
Os saves antigos continuam funcionando: a chave do `localStorage` é a mesma (`pesca-arcade-v1`).

## Jogar agora

- **Sem instalar nada:** abra `dist/index.html` no navegador. É um arquivo único, funciona até por `file://`.
- **Desenvolvimento:** `npm install` e `npm run dev` (abre em http://localhost:5173).

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | confere os tipos e gera `dist/` |
| `npm test` | testes de save, relógio, telas, PWA offline e `file://` |
| `npm run shots` | prints em 390x780 de cada mar, menu e situação + erros de console + desempenho |
| `npm run sim` | robô jogador que mede o ritmo da economia |
| `npm run perf` | fps com e sem o shader de água |
| `npm run icons` | gera os ícones de novo |

Os scripts de teste usam Playwright (`npm i -D playwright && npx playwright install chromium`, se ainda não tiver).

## Publicar de graça

O conteúdo de `dist/` é tudo o que precisa ir para o ar: `index.html`, `manifest.webmanifest`, `sw.js` e `icons/`.

### Netlify (mais simples)

1. Entre em https://app.netlify.com/drop.
2. Arraste a pasta `dist` para a página. Em segundos sai um endereço `https://nome.netlify.app`.
3. Em **Site configuration > Change site name**, escolha o nome.

Para atualizar sozinho a cada commit: **Add new site > Import an existing project**, escolha o repositório
e informe **Base directory** `pesca-arcade`. O `netlify.toml` já tem o comando de build e a pasta.

### GitHub Pages

O ideal é o jogo ter um repositório só dele (este aqui é o da Farmácia Clara).

1. Crie um repositório, por exemplo `pesca-arcade`, e envie o conteúdo desta pasta.
2. Copie `docs/github-pages.yml` para `.github/workflows/pesca-arcade.yml` (ajuste os dois caminhos comentados).
3. Em **Settings > Pages**, escolha **Source: GitHub Actions**.
4. A cada push na `main` o jogo é publicado em `https://seu-usuario.github.io/pesca-arcade/`.

Sem Actions: envie só o conteúdo de `dist/` para a raiz de um repositório e, em **Settings > Pages**,
escolha **Deploy from a branch**.

### Depois de publicar

- Coloque o endereço do jogo em `GAME_URL` (em `src/game.js`): ele passa a aparecer nas imagens e textos compartilhados.
- Abra o endereço no Chrome do celular: aparece **Instalar app** no menu, e também em **Ajustes** dentro do jogo.
- O PWA só instala em `https`. Netlify e GitHub Pages já são `https`.

## APK, anúncios e compras

Veja `docs/APK.md`. Anúncios e compras estão em **modo teste** até você configurar as contas.

## Estrutura

```
legacy/index.html      jogo original, intocado
index.html             página do jogo (HUD, menus, telas)
src/game.js            jogo: dados, regras, desenho, menus
src/save.ts            save validado, cópia de segurança, relógio
src/water.ts           água em shader WebGL
src/audio.ts           música por mar e efeitos (Web Audio)
src/share.ts           imagem de recorde e compartilhamento
src/platform.ts        AdMob e Play Billing (modo teste por padrão)
public/                manifest, service worker, ícones
tools/                 prints, robô de economia, testes
shots/                 prints finais
dist/                  build pronto para publicar
```

`src/game.js` continua em JavaScript, sem checagem de tipos: é o código original reorganizado em módulo.
Os módulos novos são TypeScript em modo estrito.

## Ritmo da economia (medido pelo robô)

`tools/sim.mjs` joga o jogo de verdade (mesmo código de colisão, geração de peixes e loja) com o tempo
acelerado. Dia 1: 60 min seguidos. Dias seguintes: 3 sessões de 8 min com renda offline, baú e bônus diário.
Três partidas por perfil, sem evento semanal ativo.

| Perfil de jogador | Mar | Gelo | Abismo | 2ª volta após aposentar (Gelo) |
|---|---|---|---|---|
| Casual | 16 min | 54 min | dia 4 | 24 min |
| Médio | 15 min | 51 min | dia 4 | 21 min |
| Bom | 12 min | 47 min | dia 4 | 19 min |
| Médio vendo anúncios | 16 min | 51 min | dia 4 | 22 min |

Metas: Mar em 12–15 min, Gelo em 45–60 min, Abismo em vários dias. O perfil casual passa 1 min da meta do Mar.

O que mudou em relação ao original, e por quê:

- **Mar: 3.000 → 14.000 moedas.** No original o robô liberava o Mar em 3 min.
- **Gelo: 450.000 → 280.000.** Com o custo antigo o Gelo só saía no segundo dia.
- **Renda offline: 100% → 35% (por até 4 h).** Era ela que liberava tudo: o Abismo saía no dia 3 quase sem jogar.
- **Pérolas: raiz quadrada → potência 0,42.** A fórmula antiga dava +2100% no primeiro prestígio; agora fica perto de +200% aposentando por volta do dia 8.
- **Aposentar cedo não compensa** (1 ou 2 pérolas logo ao liberar o Gelo): o jogo agora avisa isso na tela.

Limites da simulação: o robô não pega chefões (o anzol enche antes dos 200 m, como acontece com quem não desvia
dos peixes de propósito) e joga de forma mais regular que uma pessoa. Os duelos foram medidos à parte, com
40 tentativas por chefão: casual vence 100% / 95% / 80% / 70% (Rio, Mar, Gelo, Abismo), médio 100% / 100% / 100% / 88%.

## Onde mexer nos números

Tudo em `src/game.js`:

- `SCENES`: custo e multiplicador de cada mar, peixes e chefões. `NOVOS`: peixes adicionados.
- `UPS`: preço e crescimento de cada melhoria.
- `ECO`: renda offline (35% por até 4 h) e fórmula das pérolas.
- `EVENTS`, `WEEK_GOAL`, `ACH`, `ITEMS`: eventos semanais, meta da semana, conquistas e itens.

Depois de mexer, rode `npm run build && npm run sim` para ver o efeito no ritmo.
