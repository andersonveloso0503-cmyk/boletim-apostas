// Junta os dados raspados (scrape.js) com a lógica de cálculo (tips.js) e
// gera o index.html final a partir do template.
//
// node scripts/build.js

const fs = require('fs');
const path = require('path');
const { LEAGUES, scrapeStandings, scrapeCorners, scrapeCards, scrapeFixtures } = require('./scrape');
const { pickInfo, goalsInfo, cornersInfo, cardsInfo } = require('./tips');

// Times com 0 jogos disputados (temporada ainda não começou, ex: ligas
// europeias em agosto) deixariam a heurística dividir por zero. Nesse caso
// marcamos o jogo como sem dados em vez de propagar NaN/Infinity pro HTML.
function hasEnoughData(standings, home, away) {
  const h = standings[home], a = standings[away];
  return !!h && !!a && h.j > 0 && a.j > 0;
}

async function buildLeagueData(slug) {
  const standings = await scrapeStandings(slug);
  const corners = await scrapeCorners(slug);
  const cards = await scrapeCards(slug);
  const fixtures = await scrapeFixtures(slug);

  return fixtures.map(f => {
    if (!hasEnoughData(standings, f.home, f.away)) {
      return { ...f, noData: true };
    }
    const pick = pickInfo(standings, f.home, f.away);
    const goals = goalsInfo(standings, f.home, f.away);
    const cornersTip = cornersInfo(corners, f.home, f.away);
    const cardsTip = cardsInfo(cards, f.home, f.away);
    return { ...f, pick, goals, cornersTip, cardsTip };
  });
}

async function main() {
  const leagues = {};
  for (const [key, league] of Object.entries(LEAGUES)) {
    try {
      const games = await buildLeagueData(league.slug);
      leagues[key] = { name: league.name, games };
      console.log(`OK: ${league.name} — ${games.length} jogos`);
    } catch (err) {
      console.error(`FALHOU: ${league.name} —`, err.message);
      // Não derruba o build inteiro se uma liga falhar (ex: temporada não começou)
    }
  }

  const generatedAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const payload = { leagues, generatedAt };

  const template = fs.readFileSync(path.join(__dirname, '..', 'templates', 'boletim-template.html'), 'utf8');
  const output = template.replace('/*__DATA__*/{}', JSON.stringify(payload));

  fs.writeFileSync(path.join(__dirname, '..', 'index.html'), output);
  console.log('index.html gerado.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
