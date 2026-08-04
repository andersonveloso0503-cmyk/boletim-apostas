// Lógica de cálculo dos mercados — portada e validada a partir do boletim
// HTML atual. Não depende de nenhuma API paga; funciona com os dados que
// scrape.js extrai (tabela: pontos, jogos, gols marcados/sofridos; APWin:
// escanteios a favor/contra, % de cartões por time).
//
// Uso: const { pickInfo, goalsInfo, cornersInfo, cardsInfo } = require('./tips');

const HOME_ADV = 8; // bônus de mando de campo, em pontos de aproveitamento (%)

function tierLabel(t) {
  return t === 'alta' ? 'Alta confiança' : t === 'media' ? 'Confiança média' : 'Jogo equilibrado';
}

// stats = { PAL: { name, j, gp, gc, pct }, ... }  (pct = aproveitamento em %)
function pickInfo(stats, home, away) {
  const h = stats[home], a = stats[away];
  const gap = (h.pct + HOME_ADV) - a.pct;
  let side, label, tier;
  if (gap >= 25) { side = 'home'; label = h.name; tier = 'alta'; }
  else if (gap <= -25) { side = 'away'; label = a.name; tier = 'alta'; }
  else if (gap >= 10) { side = 'home'; label = h.name; tier = 'media'; }
  else if (gap <= -10) { side = 'away'; label = a.name; tier = 'media'; }
  else { side = 'equilibrado'; label = gap >= 0 ? h.name : a.name; tier = 'baixa'; }
  return { side, label, gap, tier, homePct: h.pct, awayPct: a.pct };
}

function goalsInfo(stats, home, away) {
  const h = stats[home], a = stats[away];
  const hAtk = h.gp / h.j, hDef = h.gc / h.j;
  const aAtk = a.gp / a.j, aDef = a.gc / a.j;
  const expHome = (hAtk + aDef) / 2;
  const expAway = (aAtk + hDef) / 2;
  const total = expHome + expAway;
  let market, tier;
  if (total >= 2.6) { market = 'Mais de 2.5 gols'; tier = 'media'; }
  else if (total <= 2.25) { market = 'Menos de 2.5 gols'; tier = 'media'; }
  else { market = 'Linha de 2.5 gols equilibrada'; tier = 'baixa'; }
  return { total, market, tier, hAtk, hDef, aAtk, aDef };
}

// cornerStats = { PAL: { cf, ca }, ... }  (cf = escanteios a favor/jogo, ca = contra/jogo)
function cornersInfo(cornerStats, home, away) {
  const h = cornerStats[home], a = cornerStats[away];
  const expHome = (h.cf + a.ca) / 2;
  const expAway = (a.cf + h.ca) / 2;
  const total = expHome + expAway;
  let market, tier;
  if (total >= 10.3) { market = 'Mais de 9.5 escanteios'; tier = 'media'; }
  else if (total <= 9.3) { market = 'Menos de 9.5 escanteios'; tier = 'media'; }
  else { market = 'Linha de 9.5 escanteios equilibrada'; tier = 'baixa'; }
  return { total, market, tier, hCf: h.cf, hCa: h.ca, aCf: a.cf, aCa: a.ca };
}

// cardStats = { PAL: 76, ... }  (% de jogos do time com mais de 3.5 cartões, total)
function cardsInfo(cardStats, home, away) {
  const hPct = cardStats[home], aPct = cardStats[away];
  const avg = (hPct + aPct) / 2;
  let market, tier;
  if (avg >= 72) { market = 'Mais de 3.5 cartões'; tier = 'media'; }
  else if (avg <= 55) { market = 'Menos de 3.5 cartões'; tier = 'media'; }
  else { market = 'Linha de 3.5 cartões equilibrada'; tier = 'baixa'; }
  return { avg, market, tier, hPct, aPct };
}

module.exports = { tierLabel, pickInfo, goalsInfo, cornersInfo, cardsInfo, HOME_ADV };
