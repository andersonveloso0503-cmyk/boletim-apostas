# Boletim da Rodada — roteiro para automação (Claude Code)

Este é o pacote inicial pra você abrir no Claude Code e transformar o boletim
de apostas num site que se atualiza sozinho, toda rodada, sem precisar voltar
no chat.

**Não tente rodar isso direto — os seletores do scraper ainda não foram
testados contra o HTML real do APWin.** Este pacote é o ponto de partida:
estrutura pronta, lógica de cálculo já validada (portada do boletim que já
funciona), e os pontos exatos que precisam de teste real marcados com `// TODO`.

---

## O que já está pronto e confiável

- `scripts/tips.js` — toda a lógica de cálculo (favorito por tabela, estimativa
  de gols, escanteios, cartões). Isso é matemática pura, portada linha a linha
  do boletim HTML que já geramos e validamos nesta conversa. **Não precisa
  mexer.**
- `templates/boletim-template.html` — o layout e CSS do boletim, já pronto.
- `.github/workflows/update.yml` — o agendamento automático (roda toda
  quinta-feira às 09:00 e também permite rodar manualmente).

## O que precisa ser testado e ajustado no Claude Code

- `scripts/scrape.js` — busca os dados no APWin. Os seletores CSS aqui são
  **meu melhor palpite**, baseado na versão em texto que eu vi das páginas, não
  no HTML real. No Claude Code, você (ou eu, lá) consegue:
  1. Abrir a página real (`view` / navegador) e inspecionar o HTML de verdade.
  2. Ver se os dados vêm prontos no HTML ou se são carregados depois por
     JavaScript (nesse caso precisaríamos trocar `fetch` por Playwright/Puppeteer
     pra renderizar a página antes de extrair).
  3. Checar se existe uma API interna do APWin (aba Network do navegador) —
     se existir, é mais rápido e mais estável que raspar HTML.
  4. Ajustar os seletores até bater com os números reais.
  5. Testar contra bloqueio de bot — o footystats.org me bloqueou; o APWin não
     bloqueou minha busca via texto, mas isso não garante que um scraper
     automatizado não seja bloqueado depois. Vale colocar um User-Agent
     realista e não rodar com muita frequência (1x por semana é suficiente).

## Mudança importante de metodologia: mercado de "Resultado"

No boletim atual, o resultado das ligas europeias vem de um modelo de
probabilidade (Sportradar) que só eu tenho acesso por uma ferramenta interna
do chat — **não é uma API pública que um script seu consiga chamar**. Pra
automação funcionar sem mim, troquei esse mercado pela mesma heurística de
tabela que já uso no Brasileirão (aproveitamento de pontos + bônus de mando de
campo). É uma fonte pública, funciona igual pras 6 ligas, e deixa tudo
consistente. Está assim em `scripts/tips.js`.

## Ligas — slugs do APWin

Confirmado (testei nesta conversa):
- Brasileirão: `brazil/serie-a`

**Não confirmados** — são o padrão mais provável da URL do APWin, mas
precisam ser checados um por um no Claude Code antes de confiar:
- Premier League: `england/premier-league`
- La Liga: `spain/la-liga`
- Serie A (Itália): `italy/serie-a`
- Bundesliga: `germany/bundesliga`
- Ligue 1: `france/ligue-1`

## Estrutura do projeto

```
boletim-apostas/
├── scripts/
│   ├── scrape.js       # busca os dados (precisa de teste real — ver acima)
│   ├── tips.js          # lógica de cálculo (pronta, portada do boletim atual)
│   └── build.js          # junta scrape.js + tips.js + template, gera index.html
├── templates/
│   └── boletim-template.html   # já com manifest/service worker ligados
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
├── manifest.json           # PWA — nome, ícone, cores do app
├── sw.js                     # PWA — cache offline
├── .github/workflows/
│   └── update.yml        # roda scripts/build.js todo dia e publica
├── index.html             # saída gerada (não editar manualmente)
├── package.json
└── README.md
```

## Passo a passo no Claude Code

1. Crie um repositório novo no GitHub (ex: `boletim-apostas`), do mesmo jeito
   que fez com o `volei-tche`.
2. Copie esta pasta pra dentro do repo.
3. Abra o Claude Code na pasta e peça: "testa o scrape.js contra o APWin de
   verdade e corrige os seletores até os números baterem com o site".
4. Depois que o Brasileirão estiver funcionando, peça pra confirmar os slugs
   das ligas europeias e testar de novo quando a temporada 2026/27 começar
   (a partir de meados de agosto).
5. Ative o GitHub Pages no repositório (Settings → Pages → branch `main`,
   pasta raiz) — mesma configuração do `volei-tche`.
6. O workflow em `.github/workflows/update.yml` já commita o `index.html`
   atualizado toda quinta — depois do primeiro push, o site atualiza sozinho.

## PWA — instalável como app

O boletim agora é um PWA (Progressive Web App), no mesmo padrão do Volei Tche
e do Invictos FC: dá pra "instalar" no celular (ganha ícone na tela inicial,
abre em tela cheia, funciona offline mostrando o último boletim baixado).
Sem push notification por enquanto — só o app instalável mesmo, como você
pediu.

Arquivos adicionados pra isso:
- `manifest.json` — nome, ícone e cores do app.
- `sw.js` — service worker, cacheia o `index.html` pra funcionar offline.
- `icons/icon-192.png` e `icons/icon-512.png` — ícones gerados no tema do
  boletim (verde do campo + detalhe âmbar). Se quiser um ícone diferente
  (logo, escudo, etc.), é só substituir esses dois arquivos mantendo o nome.

**Importante:** isso só funciona instalado via HTTPS de verdade (GitHub
Pages, por exemplo) — não funciona abrindo o `index.html` direto no
navegador pelo computador (`file://`), porque service worker exige HTTPS ou
localhost. Depois que estiver no GitHub Pages, é só abrir o link pelo celular
e usar "Adicionar à tela inicial" (Android/Chrome) ou "Adicionar à Tela de
Início" (iPhone/Safari).



## Frequência de atualização

O workflow está configurado pra rodar **todos os dias às 08:00** (horário de
Brasília). Faz sentido porque com 6 ligas ao mesmo tempo (5 europeias +
Brasileirão) sempre tem jogo em algum dia da semana, então diário garante que
o boletim nunca fica com tabela desatualizada. Se quiser mudar a frequência
depois, é só editar o `cron` em `.github/workflows/update.yml`.

Um detalhe pra ter em mente: rodar todo dia significa também que, se o APWin
mudar alguma coisa no site (layout, bloqueio de bot), o GitHub Actions vai
falhar todo dia até alguém corrigir — vale configurar notificação de falha do
workflow (GitHub avisa por e-mail automaticamente quando uma Action falha, já
vem ativado por padrão).
