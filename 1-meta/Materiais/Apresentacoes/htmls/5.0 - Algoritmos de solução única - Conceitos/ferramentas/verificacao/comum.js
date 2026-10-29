// Utilidades comuns dos scripts de verificação (Node + puppeteer-core + Chrome/Edge instalado).
const fs = require('fs'), url = require('url');
const puppeteer = require('puppeteer-core');

function chromePath() {
  if (process.env.CHROME) return process.env.CHROME;
  const c = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  const f = c.find(p => fs.existsSync(p));
  if (!f) throw new Error('Chrome/Edge não encontrado: defina a variável CHROME');
  return f;
}

// abre o index.html e espera fontes + quebras de linha de todos os frames
async function abrir(index, viewport) {
  const browser = await puppeteer.launch({ executablePath: chromePath(), headless: true });
  const page = await browser.newPage();
  await page.setViewport(viewport || { width: 907, height: 510 });
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  await page.goto(url.pathToFileURL(index).href, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.Deck && Deck.frames.every(f => f._fitted), { timeout: 120000 });
  return { browser, page, erros };
}

// páginas do PDF por frame, lidas do .nav gerado pelo LaTeX
function paginas(nav) {
  return [...fs.readFileSync(nav, 'utf8').matchAll(/framepages \{(\d+)\}\{(\d+)\}/g)].map(m => [+m[1], +m[2]]);
}
// página do PDF -> [frame (1..), passo (1..)]
function framePasso(pags, pg) {
  const f = pags.findIndex(([a, z]) => pg >= a && pg <= z) + 1;
  return [f, pg - pags[f - 1][0] + 1];
}
// mostra o frame/passo já no estado final (completa animações)
async function mostrar(page, f, st) {
  await page.evaluate((f, st) => { Deck.show(f - 1, st, true); const fr = Deck.frames[f - 1]; if (fr._finish) fr._finish(); }, f, st);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
}

module.exports = { abrir, paginas, framePasso, mostrar };
