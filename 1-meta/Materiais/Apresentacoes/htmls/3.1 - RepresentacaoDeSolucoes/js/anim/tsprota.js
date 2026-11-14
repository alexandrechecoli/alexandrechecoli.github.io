/* Uma rota, várias codificações (aula 3.1, frames 30 e 31): TSP com 7 pontos (0–6) no espaço vazio à direita das
 * chaves com x₁…x₄. Nenhuma figura do PDF: tudo é acrescentado (o texto e as chaves não mudam).
 *
 * <span class="anim sb" data-anim="tsprota" data-fig="30|31" data-state=".."> filho do <section> (fora do .fc), svg do
 * tamanho do frame em pt (como o espbusca.js).
 * Frame 30 (data-from="vazio", estado "rota" nos dois passos): os pontos brotam; para cada xᵢ a linha acende (faixa
 *   azul atrás, mix-blend multiply), uma ficha percorre a rota na ordem de xᵢ e a ordem de visita aparece ao lado de
 *   cada ponto; em x₁ as arestas se traçam. x₂ e x₃ são rotações (começam em 3 e em 2), x₄ é o mesmo ciclo ao contrário.
 *   No fim: "1 rota, 4 codificações" e "(cada rota de 7 pontos tem 2·7 = 14)".
 * Frame 31 (data-from="vazio", estados mapa, zero, canon):
 *   mapa  (passo 1) o mesmo ciclo.
 *   zero  (passo 2, convenção (a)) ao lado de cada linha: "começa em 0 ✓" / "começa em 3 ✗"…; o ponto 0 acende e
 *         saem as duas setas possíveis a partir dele: para 3 (x₁) e para 6 (x₄).
 *   canon (passo 3, convenção (b)) "· 2º < último: 3 < 6 ✓" em x₁ e "6 < 3 ✗" em x₄; a seta para 6 some e fica a
 *         forma canônica [0,3,2,1,4,5,6].
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease, lerp = Anim.lerp;
  const BLUE = '#0061a5', RED = '#b6321d', GREEN = '#1a7f37', GRAY = '#777';
  const FONT = '"LM Sans 8", "LM Sans", sans-serif';
  const CYCLE = [0, 3, 2, 1, 4, 5, 6];                      // x₁: a ordem dos pontos no ciclo
  const X = [[0, 3, 2, 1, 4, 5, 6], [3, 2, 1, 4, 5, 6, 0], [2, 1, 4, 5, 6, 0, 3], [0, 6, 5, 4, 1, 2, 3]];
  // pontos numa elipse, na ordem do ciclo (com um pouco de irregularidade para não parecer um polígono regular)
  const JIT = [[0, 0], [4, -3], [-3, 4], [5, 2], [-2, -4], [3, 3], [-4, -1]];
  function cities(cx, cy, rx, ry) {
    const P = [];
    CYCLE.forEach(function (c, k) {
      const a = -Math.PI / 2 + k * 2 * Math.PI / 7 + 0.25;
      P[c] = [cx + rx * Math.cos(a) + JIT[k][0], cy + ry * Math.sin(a) + JIT[k][1] * 0.6];
    });
    return P;
  }
  const CFG = {
    '30': { cx: 330, cy: 120, rx: 76, ry: 30, rows: [96.39, 112.65, 128.91, 145.17], cap: [150, 101] },
    '31': { cx: 340, cy: 158, rx: 70, ry: 34, rows: [121.37, 137.63, 153.89, 170.15], cap: [340, 212], ann: 142 }
  };

  Anim.define('tsprota', function (host) {
    const fig = host.dataset.fig, C = CFG[fig];
    const svg = S('svg', { viewBox: '0 0 453.543 255.118' });
    host.appendChild(svg);
    const P = cities(C.cx, C.cy, C.rx, C.ry);
    const root = S('g', null, svg);
    const gBand = S('g', { style: 'mix-blend-mode: multiply' }, root);
    const gEdge = S('g', null, root), gArr = S('g', null, root), gNode = S('g', null, root), gTop = S('g', null, root), gAnn = S('g', null, root);
    const txt = function (x, y, s, a, parent) {
      const t = S('text', Object.assign({ x: x, y: y, 'font-size': 6.4, 'font-family': FONT, fill: GRAY }, a || {}), parent || gTop);
      t.textContent = s; return t;
    };
    // arestas do ciclo
    const edges = CYCLE.map(function (a, i) {
      const b = CYCLE[(i + 1) % 7];
      return S('line', { x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1], stroke: '#555', 'stroke-width': 0.8, 'stroke-linecap': 'round' }, gEdge);
    });
    const edgeOf = function (a, b) { const i = CYCLE.indexOf(a), j = CYCLE.indexOf(b); return edges[(j === (i + 1) % 7) ? i : j]; };
    // pontos
    const nodes = [], order = [];
    for (let c = 0; c < 7; c++) {
      const g = S('g', { transform: 'translate(' + P[c][0] + ' ' + P[c][1] + ')' }, gNode);
      S('circle', { r: 4.3, fill: '#fff', stroke: '#333', 'stroke-width': 0.6 }, g);
      const t = S('text', { y: 2.2, 'text-anchor': 'middle', 'font-size': 6.4, 'font-family': 'KaTeX_Main' }, g); t.textContent = c;
      nodes[c] = g;
      // ordem de visita: fora da elipse
      const dx = P[c][0] - C.cx, dy = P[c][1] - C.cy, d = Math.hypot(dx / C.rx, dy / C.ry) || 1;
      order[c] = txt(P[c][0] + dx / d / C.rx * 9 * 1.1, P[c][1] + dy / d / C.ry * 9 * 0.9 + 2.2, '', { 'text-anchor': 'middle', fill: BLUE, 'font-size': 5.6, 'font-weight': 700 });
    }
    const ficha = S('circle', { r: 2.4, fill: BLUE, stroke: '#fff', 'stroke-width': 0.6 }, gTop);
    const hideAll = function () { root.style.display = 'none'; };
    function base() {
      root.style.display = '';
      [gBand, gArr, gAnn].forEach(function (g) { while (g.firstChild) g.removeChild(g.firstChild); });
      while (gTop.childNodes.length > 8) gTop.removeChild(gTop.lastChild);   // ficha + 7 rótulos de ordem ficam
      edges.forEach(function (e) { e.style.display = ''; e.removeAttribute('stroke-dasharray'); e.removeAttribute('stroke-dashoffset'); e.setAttribute('stroke', '#555'); e.setAttribute('stroke-width', 0.8); });
      nodes.forEach(function (n) { n.style.display = ''; n.style.opacity = ''; n.querySelector('circle').setAttribute('stroke', '#333'); n.querySelector('circle').setAttribute('stroke-width', 0.6); });
      order.forEach(function (o) { o.textContent = ''; });
      ficha.style.display = 'none';
    }
    function band(y) { return S('rect', { x: 36, y: y - 10.5, width: 100, height: 14, rx: 1.5, fill: '#bdd4e6' }, gBand); }

    // ---------- frame 30 ----------
    function caption30() {
      txt(C.cap[0], C.cap[1], '1 rota, 4 codificações', { fill: BLUE, 'font-size': 7, 'font-weight': 700 });
      txt(C.cap[0], C.cap[1] + 7.5, 'cada rota de 7 pontos tem', { 'font-size': 5.6 });
      txt(C.cap[0], C.cap[1] + 14, '2·7 = 14 codificações', { 'font-size': 5.6 });
    }
    async function tour(h, xi, draw, per) {
      ficha.style.display = '';
      const seq = X[xi].concat([X[xi][0]]);
      ficha.setAttribute('cx', P[seq[0]][0]); ficha.setAttribute('cy', P[seq[0]][1]);
      order[seq[0]].textContent = 1;
      for (let k = 0; k < 7; k++) {
        const a = seq[k], b = seq[k + 1], e = edgeOf(a, b);
        const L = Math.hypot(P[b][0] - P[a][0], P[b][1] - P[a][1]);
        if (draw) {   // a aresta é traçada no sentido do percurso
          e.setAttribute('x1', P[a][0]); e.setAttribute('y1', P[a][1]); e.setAttribute('x2', P[b][0]); e.setAttribute('y2', P[b][1]);
          e.style.display = ''; e.setAttribute('stroke-dasharray', L);
        }
        e.setAttribute('stroke', BLUE); e.setAttribute('stroke-width', 1.2);
        await h.tween(per, function (t) {
          ficha.setAttribute('cx', lerp(P[a][0], P[b][0], t)); ficha.setAttribute('cy', lerp(P[a][1], P[b][1], t));
          if (draw) e.setAttribute('stroke-dashoffset', L * (1 - t));
        }, ease.inOut);
        if (draw) { e.removeAttribute('stroke-dasharray'); e.removeAttribute('stroke-dashoffset'); }
        if (k < 6) order[b].textContent = k + 2;
      }
      edges.forEach(function (e) { e.setAttribute('stroke', '#555'); e.setAttribute('stroke-width', 0.8); });
    }
    async function play30(h) {
      base();
      edges.forEach(function (e) { e.style.display = 'none'; });
      nodes.forEach(function (n) { n.style.opacity = 0; });
      for (let c = 0; c < 7; c++) {
        const n = nodes[CYCLE[c]];
        h.tween(220, function (e) { n.style.opacity = e; }).catch(function () {});
        await h.wait(60);
      }
      await h.wait(250);
      for (let i = 0; i < 4; i++) {
        const b = band(C.rows[i]);
        b.style.opacity = 0;
        await h.tween(200, function (e) { b.style.opacity = e; });
        order.forEach(function (o) { o.textContent = ''; });
        await tour(h, i, i === 0, i === 0 ? 330 : 190);
        await h.wait(350);
        await h.tween(200, function (e) { b.style.opacity = 1 - e; });
        b.remove();
      }
      ficha.style.display = 'none';
      await h.tween(250, function (e) { order.forEach(function (o) { o.style.opacity = 1 - e; }); });
      order.forEach(function (o) { o.textContent = ''; o.style.opacity = ''; });
      caption30();
      const cap = Array.prototype.slice.call(gTop.childNodes, 8);
      await h.tween(350, function (e) { cap.forEach(function (c) { c.style.opacity = e; }); });
    }

    // ---------- frame 31 ----------
    const first = [0, 3, 2, 0];
    function arrow(to, col, lab) {
      const a = P[0], b = P[to];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
      const s = [a[0] + ux * 5.2, a[1] + uy * 5.2], e = [b[0] - ux * 5.6, b[1] - uy * 5.6];
      const g = S('g', null, gArr);
      g.line = S('line', { x1: s[0], y1: s[1], x2: e[0], y2: e[1], stroke: col, 'stroke-width': 1.6, 'stroke-linecap': 'round' }, g);
      g.head = S('path', { d: 'M0 0L-4 -1.9L-4 1.9Z', fill: col, transform: 'translate(' + e[0] + ' ' + e[1] + ') rotate(' + Math.atan2(uy, ux) * 180 / Math.PI + ')' }, g);
      const t = S('text', { x: (s[0] + e[0]) / 2 - uy * 6, y: (s[1] + e[1]) / 2 + ux * 6 + 2, 'text-anchor': 'middle', 'font-size': 7, 'font-family': 'KaTeX_Math', fill: col }, g);
      t.textContent = 'x';
      const sub = S('tspan', { 'font-family': 'KaTeX_Main', 'font-size': 5, dy: 1.6 }, t); sub.textContent = lab;
      g.len = L - 10.8; g.s = s; g.e = e;
      return g;
    }
    function ann(i, html, cls) {
      const t = S('text', { x: C.ann, y: C.rows[i] - 0.6, 'font-size': 6.6, 'font-family': FONT }, gAnn);
      html.forEach(function (p) { const sp = S('tspan', { fill: p[1] }, t); sp.textContent = p[0]; });
      return t;
    }
    function zeroAnn() {
      return X.map(function (x, i) {
        const ok = x[0] === 0;
        return ann(i, [['começa em ' + x[0] + ' ', '#444'], [ok ? '✓' : '✗', ok ? GREEN : RED]]);
      });
    }
    function canonAnn(tx) {
      [[0, '3 < 6 ', true], [3, '6 < 3 ', false]].forEach(function (q) {
        const t = tx[q[0]];
        const a = S('tspan', { fill: '#444' }, t); a.textContent = ' · 2º < último: ' + q[1];
        const b = S('tspan', { fill: q[2] ? GREEN : RED }, t); b.textContent = q[2] ? '✓' : '✗';
      });
      tx[1].setAttribute('opacity', 0.5); tx[2].setAttribute('opacity', 0.5);
    }
    function ring0(on) { const c = nodes[0].querySelector('circle'); c.setAttribute('stroke', on ? BLUE : '#333'); c.setAttribute('stroke-width', on ? 1.4 : 0.6); }
    function capt31(s) { return txt(C.cap[0], C.cap[1], s, { 'text-anchor': 'middle', fill: BLUE, 'font-size': 7, 'font-weight': 700 }); }
    function snap31(st) {
      base();
      if (st === 'mapa') return;
      ring0(true);
      const tx = zeroAnn();
      const a3 = arrow(3, BLUE, '1'), a6 = arrow(6, RED, '4');
      if (st === 'canon') {
        canonAnn(tx); a6.remove();
        capt31('forma canônica: [0, 3, 2, 1, 4, 5, 6]');
      } else capt31('duas formas de sair do 0');
    }
    async function play31(a, b, h) {
      if (b === 'mapa') {
        base();
        const all = [gEdge, gNode];
        all.forEach(function (g) { g.style.opacity = 0; });
        await h.tween(450, function (e) { all.forEach(function (g) { g.style.opacity = e; }); });
        all.forEach(function (g) { g.style.opacity = ''; });
        return;
      }
      if (b === 'zero') {
        base();
        const tx = zeroAnn();
        tx.forEach(function (t) { t.style.opacity = 0; });
        for (const t of tx) { await h.tween(220, function (e) { t.style.opacity = e; }); await h.wait(80); }
        ring0(true);
        const ar = [arrow(3, BLUE, '1'), arrow(6, RED, '4')];
        for (const g of ar) {
          g.line.setAttribute('stroke-dasharray', g.len); g.head.style.opacity = 0; g.lastChild.style.opacity = 0;
          await h.tween(450, function (e) { g.line.setAttribute('stroke-dashoffset', g.len * (1 - e)); });
          g.line.removeAttribute('stroke-dasharray'); g.line.removeAttribute('stroke-dashoffset');
          await h.tween(200, function (e) { g.head.style.opacity = e; g.lastChild.style.opacity = e; });
        }
        const c = capt31('duas formas de sair do 0'); c.style.opacity = 0;
        await h.tween(300, function (e) { c.style.opacity = e; });
        return;
      }
      // canon
      snap31('zero');
      const tx = Array.prototype.slice.call(gAnn.childNodes);
      canonAnn(tx);
      const add = [tx[0], tx[3]].map(function (t) { return Array.prototype.slice.call(t.childNodes, 2); });
      add.forEach(function (l) { l.forEach(function (s) { s.style.opacity = 0; }); });
      tx[1].setAttribute('opacity', 1); tx[2].setAttribute('opacity', 1);
      for (const l of add) await h.tween(300, function (e) { l.forEach(function (s) { s.style.opacity = e; }); });
      await h.tween(250, function (e) { tx[1].setAttribute('opacity', 1 - 0.5 * e); tx[2].setAttribute('opacity', 1 - 0.5 * e); });
      const a6 = gArr.childNodes[1], cap = gTop.lastChild;
      await h.tween(500, function (e) { a6.style.opacity = 1 - e; cap.style.opacity = 1 - e; });
      a6.remove(); cap.remove();
      // a ficha percorre a forma canônica
      ficha.style.display = '';
      await tour(h, 0, false, 200);
      ficha.style.display = 'none';
      order.forEach(function (o) { o.textContent = ''; });
      const c = capt31('forma canônica: [0, 3, 2, 1, 4, 5, 6]'); c.style.opacity = 0;
      await h.tween(350, function (e) { c.style.opacity = e; });
    }

    function snap(st) {
      if (st === 'vazio') { hideAll(); return; }
      if (fig === '30') { base(); caption30(); return; }
      snap31(st);
    }
    async function play(a, b, h) {
      if (b === 'vazio') { snap(b); return; }
      if (fig === '30') { if (a === 'vazio') await play30(h); else snap(b); return; }
      await play31(a, b, h);
    }
    return { snap: snap, play: play };
  });
})();
