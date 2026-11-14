/* TSP com 4 pontos e a matriz de distâncias D (aula 3, frame 21, passo 2 — acrescentado).
 *
 * Uso: <span class="anim md" data-anim="matrizd" data-from="vazio" data-state="vazio,demo"></span> como 1º filho do
 * div.bkarr da matriz (o recorte img/matriz_d.svg do PDF); o section ganha data-steps="2". O passo 1 é o PDF.
 * Coordenadas em pt a partir do canto do div.bkarr (= margem esquerda do texto, topo do recorte em y = 84 do PDF).
 *
 * Passo 2: à esquerda, o grafo dos 4 pontos com as distâncias; à direita, as 6 rotas do espaço de busca 𝕊; abaixo
 * da matriz, a conta f(s). Ao entrar, a força bruta percorre as 6 rotas: a ficha anda no grafo, a célula d_ij usada
 * acende na matriz e o termo entra na soma; cada rota ganha o seu f. No fim as rotas ótimas (f = 8) ficam verdes.
 * Clicar numa rota refaz a conta dela.
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease, lerp = Anim.lerp;
  const MYBLUE = '#0061a5', GREEN = '#169b3a', GOLD = '#e0a400', GRAY = '#9aa7b5';
  const CAP = '"LM Sans 8", "LM Sans", sans-serif', MAIN = 'KaTeX_Main, serif', MATH = 'KaTeX_Math, serif';
  const Dm = [[0, 1, 3, 2], [1, 0, 4, 1], [3, 4, 0, 3], [2, 1, 3, 0]];
  const ROUTES = [[1, 2, 3, 4], [1, 2, 4, 3], [1, 3, 2, 4], [1, 3, 4, 2], [1, 4, 2, 3], [1, 4, 3, 2]];
  const fOf = function (r) { let s = 0; for (let k = 0; k < 4; k++) s += Dm[r[k] - 1][r[(k + 1) % 4] - 1]; return s; };
  const BEST = Math.min.apply(null, ROUTES.map(fOf));
  // células da matriz (centros, medidos no PDF: colunas x 199.3…265.9, linhas de base 106.7…147.3)
  const CX = [169.44, 191.62, 213.8, 235.97], CY = [19.3, 32.8, 46.4, 59.9];
  // grafo à esquerda
  const P = { 1: [22, 12], 2: [100, 12], 3: [100, 60], 4: [22, 60] };
  const ROWY = function (k) { return 9 + 10.4 * k; }, RX = 278;

  Anim.define('matrizd', function (host) {
    const svg = S('svg', { width: '1pt', height: '1pt', viewBox: '0 0 1 1' });
    svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none';
    host.appendChild(svg);
    const root = S('g', { opacity: 0 }, svg);
    const gCell = S('g', null, root), gGraph = S('g', null, root), gRoute = S('g', null, root), gList = S('g', null, root), gCalc = S('g', null, root);
    let busy = false, gen = 0, shownF = {}, cur = -1;

    // ---------- grafo ----------
    const edge = function (a, b) {
      S('path', { d: 'M' + P[a][0] + ' ' + P[a][1] + 'L' + P[b][0] + ' ' + P[b][1], stroke: GRAY, 'stroke-width': 0.4, 'stroke-dasharray': '1.2 1', fill: 'none' }, gGraph);
      const t = a === 1 && b === 3 ? 0.27 : a === 2 && b === 4 ? 0.27 : 0.5;
      let x = lerp(P[a][0], P[b][0], t), y = lerp(P[a][1], P[b][1], t);
      if (y === P[a][1] && P[a][1] === P[b][1]) y += a === 1 ? -2.2 : 5.6; else if (x === P[a][0] && P[a][0] === P[b][0]) x += a === 2 ? 2.5 : -5; else y -= 1.5;
      const tx = S('text', { x: x, y: y, 'font-size': 6, 'font-family': MAIN, fill: '#6b7785', 'text-anchor': 'middle' }, gGraph);
      tx.textContent = Dm[a - 1][b - 1];
    };
    [[1, 2], [2, 3], [3, 4], [4, 1], [1, 3], [2, 4]].forEach(function (e) { edge(e[0], e[1]); });
    const nodes = {};
    [1, 2, 3, 4].forEach(function (i) {
      const g = S('g', null, gGraph);
      S('circle', { cx: P[i][0], cy: P[i][1], r: 2.3, fill: '#00008b' }, g);
      const t = S('text', { x: P[i][0] + (i === 2 || i === 3 ? 4 : -11), y: P[i][1] + 2.5, 'font-size': 7.5, 'font-family': MATH, 'font-style': 'italic' }, g);
      t.textContent = 'p'; const sb = S('tspan', { 'font-size': 5.2, dy: 1.6, 'font-style': 'normal', 'font-family': MAIN }, t); sb.textContent = i;
      nodes[i] = g;
    });

    // ---------- lista de rotas ----------
    const head = S('text', { x: RX, y: 1, 'font-size': 5.4, 'font-family': CAP, fill: '#666' }, gList);
    head.textContent = 'rotas de 𝕊 (clique numa):';
    const rows = ROUTES.map(function (r, k) {
      const g = S('g', { 'data-interactive': '', style: 'cursor:pointer;pointer-events:all' }, gList);
      const bg = S('rect', { x: RX - 1.5, y: ROWY(k) - 0.4, width: 66, height: 9, rx: 1.5, fill: '#fff', stroke: '#b7cde0', 'stroke-width': 0.5 }, g);
      const t = S('text', { x: RX + 2, y: ROWY(k) + 6.6, 'font-size': 6.6, 'font-family': MAIN, fill: '#222' }, g);
      t.textContent = '[ ' + r.join('  ') + ' ]';
      const v = S('text', { x: RX + 39, y: ROWY(k) + 6.6, 'font-size': 6.6, 'font-family': MAIN, fill: MYBLUE }, g);
      g.addEventListener('click', function (e) { e.stopPropagation(); if (!busy) clickRoute(k); });
      return { g: g, bg: bg, v: v };
    });
    function setVal(k, on) {
      const f = fOf(ROUTES[k]), ok = f === BEST && on === 'best';
      rows[k].v.textContent = on ? 'f = ' + f + (ok ? '  ✓' : '') : '';
      rows[k].v.setAttribute('fill', ok ? GREEN : MYBLUE);
      rows[k].bg.setAttribute('fill', ok ? '#e6f4ea' : '#fff');
      rows[k].bg.setAttribute('stroke', ok ? GREEN : '#b7cde0');
    }
    function select(k) { rows.forEach(function (r, i) { r.bg.setAttribute('stroke-width', i === k ? 1 : 0.5); }); }

    // ---------- desenho de uma rota (estático ou animado) ----------
    function clearRoute() { [gCell, gRoute, gCalc].forEach(function (g) { while (g.firstChild) g.removeChild(g.firstChild); }); }
    function cell(i, j) {
      return S('rect', { x: CX[j - 1] - 6.5, y: CY[i - 1] - 6.4, width: 13, height: 12, rx: 1.5, fill: MYBLUE, 'fill-opacity': 0.22, stroke: MYBLUE, 'stroke-width': 0.5 }, gCell);
    }
    function arrow(a, b, frac) {   // seta de a para b, até a fração frac do caminho (sem entrar no ponto)
      const x0 = P[a][0], y0 = P[a][1], x1 = P[b][0], y1 = P[b][1], L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
      const xe = x0 + ux * (L - 3) * frac, ye = y0 + uy * (L - 3) * frac;
      const g = S('g', null, gRoute);
      S('path', { d: 'M' + (x0 + ux * 2.5) + ' ' + (y0 + uy * 2.5) + 'L' + xe + ' ' + ye, stroke: MYBLUE, 'stroke-width': 0.9, fill: 'none' }, g);
      if (frac >= 1) S('path', { d: 'M' + xe + ' ' + ye + 'l' + (-ux * 3 - uy * 1.4) + ' ' + (-uy * 3 + ux * 1.4) + 'l' + (uy * 2.8) + ' ' + (-ux * 2.8) + 'Z', fill: MYBLUE }, g);
      return g;
    }
    function calcText(r, terms, total) {
      while (gCalc.firstChild) gCalc.removeChild(gCalc.firstChild);
      const t = S('text', { x: 202, y: 80, 'font-size': 7.4, 'font-family': MAIN, 'text-anchor': 'middle' }, gCalc);
      const a = S('tspan', { 'font-family': MATH, 'font-style': 'italic' }, t); a.textContent = 'f';
      const b = S('tspan', null, t); b.textContent = '([' + r.join(' ') + ']) = ' + terms.join(' + ');
      if (total !== undefined) {
        const c = S('tspan', { 'font-weight': 'bold', fill: total === BEST ? GREEN : MYBLUE }, t);
        c.textContent = ' = ' + total + (total === BEST ? '  (mínimo)' : '');
      }
    }
    function drawStatic(k) {
      clearRoute(); const r = ROUTES[k], terms = [];
      for (let s = 0; s < 4; s++) { const a = r[s], b = r[(s + 1) % 4]; arrow(a, b, 1); cell(a, b); terms.push(Dm[a - 1][b - 1]); }
      calcText(r, terms, fOf(r)); select(k); cur = k;
    }
    async function animate(k, tw, fast) {
      clearRoute(); select(k); cur = k;
      const r = ROUTES[k], terms = [];
      const tok = S('circle', { r: 2.4, fill: GOLD, stroke: '#8a6500', 'stroke-width': 0.3, cx: P[1][0], cy: P[1][1] }, gRoute);
      calcText(r, terms);
      for (let s = 0; s < 4; s++) {
        const a = r[s], b = r[(s + 1) % 4];
        let ar = null;
        await tw(fast ? 170 : 420, function (e) {
          if (ar) ar.remove(); ar = arrow(a, b, e);
          tok.setAttribute('cx', lerp(P[a][0], P[b][0], e)); tok.setAttribute('cy', lerp(P[a][1], P[b][1], e));
        });
        const c = cell(a, b); terms.push(Dm[a - 1][b - 1]); calcText(r, terms);
        await tw(fast ? 120 : 260, function (e, t) { c.setAttribute('fill-opacity', 0.22 + 0.5 * Math.sin(Math.PI * t)); });
      }
      tok.remove();
      calcText(r, terms, fOf(r));
      shownF[k] = true; setVal(k, true);
      await tw(fast ? 200 : 420, function () {});
    }
    function finish() { ROUTES.forEach(function (_, k) { setVal(k, 'best'); }); }

    // cliques: animação própria (cancelável por outro clique)
    function tw(dur, fn) {
      const g = gen;
      return new Promise(function (res, rej) {
        const t0 = performance.now();
        (function fr(now) {
          if (g !== gen) { rej('cancel'); return; }
          const t = Math.min(1, (now - t0) / dur); fn(ease.inOut(t), t);
          if (t < 1) requestAnimationFrame(fr); else res();
        })(t0);
      });
    }
    function clickRoute(k) {
      gen++;
      animate(k, tw, false).then(finish).catch(function () {});
    }

    function snap(st) {
      gen++; busy = false;
      if (st !== 'demo') { root.setAttribute('opacity', 0); root.style.display = 'none'; return; }
      root.style.display = ''; root.setAttribute('opacity', 1);
      finish(); drawStatic(1);   // [1 2 4 3], uma das ótimas
    }
    async function play(a, b, h) {
      snap('vazio');
      if (b !== 'demo') return;
      busy = true;
      root.style.display = ''; ROUTES.forEach(function (_, k) { setVal(k, false); }); clearRoute(); select(-1);
      await h.tween(450, function (e) { root.setAttribute('opacity', e); });
      try {
        for (let k = 0; k < ROUTES.length; k++) await animate(k, h.tween, k > 0);
        finish();
        const best = ROUTES.map(function (r, k) { return fOf(r) === BEST ? k : -1; }).filter(function (k) { return k >= 0; });
        await h.tween(600, function (e, t) { best.forEach(function (k) { rows[k].bg.setAttribute('stroke-width', 0.5 + 1.2 * Math.sin(Math.PI * t)); }); });
        drawStatic(best[0]);
      } finally { busy = false; }
    }
    return { snap: snap, play: play };
  });
})();
