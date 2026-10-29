// Grava quadros de uma animação: abre o frame, aperta as teclas e tira N capturas a cada T ms.
// uso: node filmar.js index.html frame teclas(ex.: ArrowRight,ArrowRight) intervalo_ms n pasta_saida [x,y,w,h]
// Depois: python tira.py pasta_saida tira.png 4   (monta uma tira com os quadros)
const path = require('path');
const { abrir } = require('./comum');
const [,, index, frame, keys, interval, count, out, clip] = process.argv;
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const { browser, page, erros } = await abrir(index);
  await page.evaluate((f) => Deck.show(f - 1, 1, true), +frame);
  await new Promise(r => setTimeout(r, 300));
  for (const k of keys.split(',').filter(Boolean)) await page.keyboard.press(k);
  const c = clip ? clip.split(',').map(Number) : null;
  for (let i = 0; i < +count; i++) {
    await page.screenshot({ path: path.join(out, `f${String(i).padStart(2, '0')}.png`),
      clip: c ? { x: c[0], y: c[1], width: c[2], height: c[3] } : undefined });
    await new Promise(r => setTimeout(r, +interval));
  }
  console.log('erros:', erros.length ? erros : 'nenhum');
  await browser.close();
})();
