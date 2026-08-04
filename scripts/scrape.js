// Seletores testados contra o HTML real do APWin (ver README.md).
// O site é Laravel/Livewire renderizado no servidor: todas as abas
// (Table, Stats, Corners, Cards, Matches) já vêm prontas no HTML inicial,
// só ficam escondidas no cliente via Alpine (x-show). Não precisa de
// Playwright/Puppeteer — fetch + cheerio é suficiente.
//
// npm install cheerio

const cheerio = require('cheerio');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
};

// Slugs confirmados contra o site real (ver README.md).
const LEAGUES = {
  brasileirao: { slug: 'brazil/serie-a', name: 'Brasileirão' },
  epl:         { slug: 'england/premier-league', name: 'Premier League' },
  la_liga:     { slug: 'spain/la-liga', name: 'La Liga' },
  serie_a:     { slug: 'italy/serie-a', name: 'Serie A (Itália)' },
  bundesliga:  { slug: 'germany/bundesliga', name: 'Bundesliga' },
  ligue_1:     { slug: 'france/ligue-1', name: 'Ligue 1' }
};

// Standings, Cards e Matches vêm todos da mesma página de liga — cache evita
// buscar a mesma URL 3x por liga.
const htmlCache = new Map();
async function fetchHtml(url) {
  if (htmlCache.has(url)) return htmlCache.get(url);
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Falha ao buscar ${url}: ${res.status}`);
  const html = await res.text();
  htmlCache.set(url, html);
  return html;
}

// O nome do time fica num <span> dentro da célula (ao lado do escudo).
function teamName($cell) {
  const span = $cell.find('span').first();
  return (span.length ? span.text() : $cell.text()).trim();
}

// Retorna { 'Palmeiras': { name, j, gp, gc, pct }, ... }
// Tabela "Table" > aba "Overall", dentro da seção #summary.
// Colunas reais: # | Team | MP | W | D | L | GF | GA | GD | Pts | PPG | Last 5
async function scrapeStandings(slug) {
  const html = await fetchHtml(`https://www.apwin.com/league/${slug}/`);
  const $ = cheerio.load(html);

  const teams = {};
  $('#summary [x-show="selectedTab === \'Overall\'"] table tbody tr').each((i, row) => {
    const cells = $(row).find('td');
    const name = teamName($(cells[1]));
    if (!name) return;
    const j = parseInt($(cells[2]).text().trim(), 10);
    const gp = parseInt($(cells[6]).text().trim(), 10);
    const gc = parseInt($(cells[7]).text().trim(), 10);
    const pts = parseInt($(cells[9]).text().trim(), 10);
    const pct = Math.round((pts / (j * 3)) * 100);
    teams[name] = { name, j, gp, gc, pct };
  });
  return teams;
}

// Retorna { 'Palmeiras': { cf, ca }, ... }  (escanteios a favor/contra por jogo)
// Página /corners/, abas "Corners For" e "Corners Against" > "Overall".
// Última coluna de cada tabela já é a média (cf / ca) por jogo.
async function scrapeCorners(slug) {
  const html = await fetchHtml(`https://www.apwin.com/league/${slug}/corners/`);
  const $ = cheerio.load(html);

  const cf = {};
  $('[x-show*="Corners For"] [x-show="selectedTab === \'Overall\'"] table tbody tr').each((i, row) => {
    const cells = $(row).find('td');
    const name = teamName($(cells[1]));
    if (!name) return;
    cf[name] = parseFloat(cells.last().text().trim());
  });

  const ca = {};
  $('[x-show*="Corners Against"] [x-show="selectedTab === \'Overall\'"] table tbody tr').each((i, row) => {
    const cells = $(row).find('td');
    const name = teamName($(cells[1]));
    if (!name) return;
    ca[name] = parseFloat(cells.last().text().trim());
  });

  const teams = {};
  for (const name of new Set([...Object.keys(cf), ...Object.keys(ca)])) {
    teams[name] = { cf: cf[name], ca: ca[name] };
  }
  return teams;
}

// Retorna { 'Palmeiras': 76, ... }  (% de jogos do time com mais de 3.5 cartões, total)
// Seção #cards da própria página da liga, aba "Cards Overall", coluna "Over 3.5".
async function scrapeCards(slug) {
  const html = await fetchHtml(`https://www.apwin.com/league/${slug}/`);
  const $ = cheerio.load(html);

  const teams = {};
  $('#cards [x-show="selectedTab === \'Cards Overall\'"] table tbody tr').each((i, row) => {
    const cells = $(row).find('td');
    const name = teamName($(cells[1]));
    if (!name) return;
    teams[name] = parseInt($(cells[3]).text().replace('%', '').trim(), 10);
  });
  return teams;
}

// Retorna [{ home, away, time }, ...] só dos jogos que ainda vão acontecer.
// A seção #matches da página da liga lista rodada atual + rodadas passadas
// juntas (mais recentes primeiro), então filtramos por data >= agora.
// Formato da data no site: "DD/MM/YYYY - HH:mm".
async function scrapeFixtures(slug) {
  const html = await fetchHtml(`https://www.apwin.com/league/${slug}/`);
  const $ = cheerio.load(html);

  const now = new Date();
  const fixtures = [];
  $('#matches .py-2 > div.columns').each((i, row) => {
    const children = $(row).children();
    if (children.length < 4) return;
    const time = $(children[0]).text().trim();
    const home = $(children[1]).find('p').text().trim();
    const away = $(children[3]).find('p').text().trim();
    if (!home || !away) return;

    const m = time.match(/(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2}):(\d{2})/);
    if (!m) return;
    const [, day, month, year, hour, minute] = m.map(Number);
    const kickoff = new Date(year, month - 1, day, hour, minute);
    if (kickoff < now) return;

    fixtures.push({ home, away, time, kickoff });
  });

  fixtures.sort((a, b) => a.kickoff - b.kickoff);
  return fixtures.map(({ home, away, time }) => ({ home, away, time }));
}

module.exports = { LEAGUES, scrapeStandings, scrapeCorners, scrapeCards, scrapeFixtures };
