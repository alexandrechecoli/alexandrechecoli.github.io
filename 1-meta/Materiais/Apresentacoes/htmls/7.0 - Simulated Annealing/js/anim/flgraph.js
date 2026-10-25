/* Do espaço de busca ao fitness landscape (slides 108–111, figuras img/FL1..FL4).
 *
 * Geometria copiada das figuras originais, em pt. O grafo do piso é o grafo de cima
 * "deitado": x' = 1.7857·x − 80.16 e y' = 0.4·y + 58.52.
 * Estados (data-state / data-from):
 *   e0   vazio (só para a entrada)
 *   f1   grafo G do espaço de busca
 *   f2   + eixos e o grafo "achatado" no piso (com a seta)
 *   f3   só o piso, com o custo de cada solução (linhas pontilhadas)
 *   f4   + as soluções elevadas à altura do custo
 */
(function () {
  'use strict';
  const A = window.Anim;
  const W = 140.4, H = 80.4, SCALE = 2.0;
  const NAVY = '#00008b', BLACK = '#000000';

  // nós do grafo de cima; o piso é obtido pela transformação afim
  const TOP = [[64.2, 40.2], [72.2, 28.2], [64.2, 12.2], [80.2, 16.2], [104.2, 8.2], [80.2, 4.2],
    [56.2, 24.2], [112.2, 24.2], [96.2, 32.2], [80.2, 40.2], [96.2, 44.2]];
  const floorOf = function (p) { return [1.785714 * p[0] - 80.157, 0.4 * p[1] + 58.52]; };
  const FLOOR = TOP.map(floorOf);
  const EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 2], [2, 6], [6, 7], [7, 4], [4, 8], [8, 9], [9, 10], [10, 3], [0, 6], [1, 9]];
  // custo de cada solução: topo da linha pontilhada e, quando existe, o nó elevado (figura FL4)
  const COST = [
    { n: 0, top: 51.26, up: 56.2 }, { n: 1, top: 40.66, up: 40.66 }, { n: 2, top: 27.72, up: 30.15 },
    { n: 3, top: 51.38 }, { n: 4, top: 40.91, up: 40.91 }, { n: 5, top: 35.61, up: 35.61 },
    { n: 6, top: 32.2, up: 35.58 }, { n: 7, top: 52.86, up: 56.2 }, { n: 8, top: 50.52, up: 50.52 },
    { n: 9, top: 55.94 }, { n: 10, top: 61.98, up: 64.48 }
  ];
  const STATES = {
    e0: {},
    f1: { top: true },
    f2: { top: true, axes: true, floor: true, arrow: true },
    f3: { axes: true, floor: true, lines: true },
    f4: { axes: true, floor: true, lines: true, up: true }
  };

  A.define('flgraph', function (host) {
    const root = A.svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img',
      'aria-label': 'Grafo do espaço de busca levado ao piso e elevado à altura do custo' });
    root.style.width = (W * SCALE) + 'pt'; root.style.height = (H * SCALE) + 'pt';
    host.appendChild(root);
    const math = { 'font-family': 'KaTeX_Math, serif', 'font-style': 'italic' };
    const main = { 'font-family': 'KaTeX_Main, serif' };
    function text(parent, s, x, y, size, attrs) {
      const t = A.svg('text', Object.assign({ x: x, y: y, 'font-size': size }, attrs), parent); t.textContent = s; return t;
    }
    function show(el, on) { el.style.display = on ? '' : 'none'; }
    function op(el, v) { el.style.opacity = v; }

    // ----- eixos -----
    const gAxes = A.svg('g', {}, root);
    const ax = [
      A.svg('line', { x1: 24.2, y1: 56.2, x2: 136.2, y2: 56.2, stroke: BLACK, 'stroke-width': 0.8 }, gAxes),
      A.svg('line', { x1: 24.2, y1: 56.2, x2: 4.2, y2: 76.2, stroke: BLACK, 'stroke-width': 0.8 }, gAxes),
      A.svg('line', { x1: 24.2, y1: 56.2, x2: 24.2, y2: 4.2, stroke: BLACK, 'stroke-width': 0.8 }, gAxes)
    ];
    const heads = A.svg('g', {}, gAxes);
    ['M136.2 56.2 L133.2 55.2 L133.2 57.2 Z', 'M4.2 76.2 L7.03 74.79 L5.61 73.37 Z', 'M24.2 4.2 L23.2 7.2 L25.2 7.2 Z'].forEach(function (d) {
      A.svg('path', { d: d, fill: BLACK, stroke: BLACK, 'stroke-width': 0.8 }, heads);
    });
    const gLab = A.svg('g', {}, gAxes);
    text(gLab, 'z', 11.58, 11.88, 5.04, math); text(gLab, '(', 14.1, 11.88, 5.04, main);
    text(gLab, 's', 16.02, 11.88, 5.04, math); text(gLab, 'i', 18.34, 12.64, 3.5, math);
    text(gLab, ')', 19.72, 11.88, 5.04, main);

    // ----- linhas de custo (pontilhadas) -----
    const gLines = A.svg('g', {}, root);
    const lines = COST.map(function (c) {
      const p = FLOOR[c.n];
      return A.svg('line', { x1: p[0], y1: p[1], x2: p[0], y2: c.top, stroke: BLACK, 'stroke-width': 0.4, 'stroke-dasharray': '1 3' }, gLines);
    });

    // ----- grafos -----
    function makeGraph(pts, parent) {
      const g = A.svg('g', {}, parent);
      g._e = EDGES.map(function (e) {
        return A.svg('line', { x1: pts[e[0]][0], y1: pts[e[0]][1], x2: pts[e[1]][0], y2: pts[e[1]][1], stroke: NAVY, 'stroke-width': 0.4 }, g);
      });
      g._n = pts.map(function (p) {
        return A.svg('circle', { cx: p[0], cy: p[1], r: 0.93, fill: '#fff', stroke: NAVY, 'stroke-width': 0.54 }, g);
      });
      return g;
    }
    function setGraph(g, pts) {
      EDGES.forEach(function (e, i) {
        g._e[i].setAttribute('x1', pts[e[0]][0]); g._e[i].setAttribute('y1', pts[e[0]][1]);
        g._e[i].setAttribute('x2', pts[e[1]][0]); g._e[i].setAttribute('y2', pts[e[1]][1]);
      });
      pts.forEach(function (p, i) { g._n[i].setAttribute('cx', p[0]); g._n[i].setAttribute('cy', p[1]); });
    }
    const gFloor = makeGraph(FLOOR, root);
    const gTop = makeGraph(TOP, root);

    // seta do grafo de cima para o piso
    const gArrow = A.svg('g', {}, root);
    const arrowPath = A.svg('path', { d: 'M52.2 24.2 L40.2 24.2 C38 24.2 36.2 26 36.2 28.2 L36.2 52.2', fill: 'none', stroke: NAVY, 'stroke-width': 0.4 }, gArrow);
    const arrowHead = A.svg('path', { d: 'M36.2 52.2 L37.2 49.2 L35.2 49.2 Z', fill: NAVY, stroke: NAVY, 'stroke-width': 0.4 }, gArrow);

    // soluções elevadas (anéis pretos)
    const gUp = A.svg('g', {}, root);
    const ups = COST.map(function (c) {
      if (c.up == null) return null;
      const p = FLOOR[c.n];
      return A.svg('circle', { cx: p[0], cy: c.up, r: 0.93, fill: '#fff', stroke: BLACK, 'stroke-width': 0.54 }, gUp);
    });

    // ----- estado final -----
    function snap(name) {
      const S = STATES[name];
      root.querySelectorAll('*').forEach(function (el) { if (el.style && el.style.opacity !== '') el.style.opacity = ''; });
      show(gTop, !!S.top); setGraph(gTop, TOP);
      show(gFloor, !!S.floor); setGraph(gFloor, FLOOR);
      show(gAxes, !!S.axes);
      ax.forEach(function (l) { l.removeAttribute('stroke-dasharray'); l.removeAttribute('stroke-dashoffset'); });
      show(gArrow, !!S.arrow); arrowPath.removeAttribute('stroke-dasharray'); arrowPath.removeAttribute('stroke-dashoffset');
      show(gLines, !!S.lines);
      lines.forEach(function (l, i) { l.setAttribute('y2', COST[i].top); });
      show(gUp, !!S.up);
      ups.forEach(function (u, i) { if (u) { u.setAttribute('cy', COST[i].up); u.setAttribute('r', 0.93); } });
    }

    // ----- animações -----
    function drawStroke(h, el, dur) {
      const len = el.getTotalLength();
      el.setAttribute('stroke-dasharray', len + ' ' + len); el.setAttribute('stroke-dashoffset', len);
      return h.tween(dur, function (e) { el.setAttribute('stroke-dashoffset', len * (1 - e)); })
        .then(function () { el.removeAttribute('stroke-dasharray'); el.removeAttribute('stroke-dashoffset'); });
    }
    function fade(h, els, on, dur) {
      els = [].concat(els);
      els.forEach(function (el) { if (on) { show(el, true); op(el, 0); } });
      return h.tween(dur || 400, function (e) { els.forEach(function (el) { op(el, on ? e : 1 - e); }); })
        .then(function () { els.forEach(function (el) { op(el, ''); if (!on) show(el, false); }); });
    }

    async function play(from, to, h) {
      const F = STATES[from], B = STATES[to];
      // entrada: o grafo surge (arestas se desenham, nós aparecem)
      if (B.top && !F.top) {
        show(gTop, true); setGraph(gTop, TOP);
        gTop._n.forEach(function (n) { n.setAttribute('r', 0.001); });
        gTop._e.forEach(function (l) { op(l, 0); });
        for (let i = 0; i < gTop._n.length; i++) {
          h.tween(300, function (e) { gTop._n[i].setAttribute('r', Math.max(0.001, 0.93 * e)); }, A.ease.back).catch(function () {});
          await h.wait(60);
        }
        await h.tween(600, function (e) { gTop._e.forEach(function (l) { op(l, e); }); });
      }
      // eixos + o grafo "deita" no piso
      if (B.axes && !F.axes) {
        show(gAxes, true); op(gLab, 0); op(heads, 0);
        await h.all(ax.map(function (l) { return drawStroke(h, l, 500); }));
        await h.all([fade(h, heads, true, 200), fade(h, gLab, true, 300)]);
      }
      if (B.floor && !F.floor) {
        show(gFloor, true); setGraph(gFloor, TOP); op(gFloor, 0.0);
        if (B.arrow) { show(gArrow, true); op(arrowHead, 0); drawStroke(h, arrowPath, 900).then(function () { return fade(h, arrowHead, true, 150); }).catch(function () {}); }
        await h.tween(1300, function (e) {
          // cópia do grafo desce e se achata (escala vertical 1 -> 0.4)
          setGraph(gFloor, TOP.map(function (p, i) { return [A.lerp(p[0], FLOOR[i][0], e), A.lerp(p[1], FLOOR[i][1], e)]; }));
          op(gFloor, Math.min(1, 0.35 + e));
        }, A.ease.inOut);
        op(gFloor, '');
      }
      // some o grafo de cima e a seta
      const outs = [];
      if (F.top && !B.top) outs.push(fade(h, gTop, false, 450));
      if (F.arrow && !B.arrow) outs.push(fade(h, gArrow, false, 450));
      if (outs.length) await h.all(outs);
      // custo de cada solução: as linhas crescem a partir do piso
      if (B.lines && !F.lines) {
        show(gLines, true);
        lines.forEach(function (l, i) { l.setAttribute('y2', FLOOR[COST[i].n][1]); });
        for (let i = 0; i < lines.length; i++) {
          const c = COST[i], y0 = FLOOR[c.n][1];
          h.tween(550, function (e) { lines[i].setAttribute('y2', A.lerp(y0, c.top, e)); }, A.ease.out).catch(function () {});
          await h.wait(90);
        }
        await h.wait(500);
      }
      // as soluções sobem até a "altitude"
      if (B.up && !F.up) {
        show(gUp, true);
        ups.forEach(function (u, i) { if (u) u.setAttribute('cy', FLOOR[COST[i].n][1]); });
        await h.tween(1200, function (e) {
          ups.forEach(function (u, i) { if (u) u.setAttribute('cy', A.lerp(FLOOR[COST[i].n][1], COST[i].up, e)); });
        }, A.ease.inOut);
      }
    }

    return { snap: snap, play: play };
  });
})();
