// Captura cada página do PDF no HTML (frame + passo correspondente), a 144 dpi (907x510 px).
// uso: node capturar.js index.html apresentacao.nav pasta_saida [paginas...]
// (as referências do PDF: pdftoppm -png -r 144 apresentacao.pdf ref/p)
const path = require('path');
const { abrir, paginas, framePasso, mostrar } = require('./comum');
const [,, index, nav, out, ...want] = process.argv;
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const { browser, page, erros } = await abrir(index);
  await page.addStyleTag({ content: 'html,body{background:#fff !important}' });
  const pags = paginas(nav);
  const todas = []; pags.forEach(([a, z]) => { for (let p = a; p <= z; p++) todas.push(p); });
  for (const pg of (want.length ? want.map(Number) : todas)) {
    const [f, st] = framePasso(pags, pg);
    await mostrar(page, f, st);
    await page.screenshot({ path: path.join(out, `h-${String(pg).padStart(3, '0')}.png`) });
  }
  console.log('erros:', erros.length ? erros : 'nenhum');
  await browser.close();
})();
