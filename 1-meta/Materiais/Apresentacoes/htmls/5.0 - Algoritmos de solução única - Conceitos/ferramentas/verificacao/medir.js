// Mede, para cada página do PDF, as palavras visíveis no HTML (texto, x, linha de base) em pt,
// e as figuras (<img>). Saída: JSON usado por alinhar.py e verificar_linhas.py.
// uso: node medir.js index.html apresentacao.nav saida.json [paginas...]
const fs = require('fs');
const { abrir, paginas, framePasso, mostrar } = require('./comum');
const [,, index, nav, out, ...want] = process.argv;
(async () => {
  const { browser, page, erros } = await abrir(index, { width: 1814, height: 1020 });
  const pags = paginas(nav);
  const todas = []; pags.forEach(([a, z]) => { for (let p = a; p <= z; p++) todas.push(p); });
  const res = {};
  for (const pg of (want.length ? want.map(Number) : todas)) {
    const [f, st] = framePasso(pags, pg);
    await mostrar(page, f, st);
    res[pg] = await page.evaluate(() => {
      const fr = document.querySelector('.frame.active');
      const R = fr.getBoundingClientRect(); const k = R.width / 453.543;
      const cache = {};
      function asc(el) { // distância topo do retângulo do texto -> linha de base
        const cs = getComputedStyle(el); const key = cs.font;
        if (cache[key] != null) return cache[key];
        const s = document.createElement('span'); s.style.cssText = 'position:absolute;white-space:nowrap;line-height:normal';
        s.style.font = cs.font; s.textContent = 'Hg';
        const m = document.createElement('span'); m.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
        s.appendChild(m); fr.appendChild(s);
        const rg = document.createRange(); rg.selectNodeContents(s.firstChild);
        const v = m.getBoundingClientRect().top - rg.getBoundingClientRect().top; s.remove(); return (cache[key] = v);
      }
      const words = [];
      const tw = document.createTreeWalker(fr, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = tw.nextNode())) {
        const el = n.parentElement;
        if (el.closest('.katex-mathml,footer,svg,.ov-hidden,.ov-gone')) continue;
        const a = asc(el), t = n.textContent, re = /\S+/g; let m;
        while ((m = re.exec(t))) {
          const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
          const rs = Array.from(rg.getClientRects()).filter(r => r.width > 0);
          rs.forEach((r, qi) => words.push({ t: rs.length > 1 ? m[0].split('­')[qi] || '' : m[0],
            x: (r.left - R.left) / k, y: (r.top + a - R.top) / k, kat: !!el.closest('.katex') }));
        }
      }
      const imgs = Array.from(fr.querySelectorAll('.fc img')).filter(im => im.offsetParent).map(im => {
        const r = im.getBoundingClientRect();
        return { src: im.getAttribute('src'), x0: (r.left - R.left) / k, x1: (r.right - R.left) / k, y0: (r.top - R.top) / k, y1: (r.bottom - R.top) / k };
      });
      return { words, imgs };
    });
  }
  fs.writeFileSync(out, JSON.stringify(res));
  console.log('páginas medidas:', Object.keys(res).length, '| erros:', erros.length ? erros : 'nenhum');
  await browser.close();
})();
