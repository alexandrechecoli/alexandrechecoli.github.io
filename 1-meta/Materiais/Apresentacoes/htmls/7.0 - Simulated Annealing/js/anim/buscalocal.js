/* Busca local (aula 6): três componentes.
 *
 *  busca  (slides 6–15, 20–21) — landscape das figuras img/ls1…ls10 e ls_type1–2, redesenhado a partir
 *         da geometria do PDF. Estados: vazio, ls1…ls10, t1 (= ls_type1), t2 (= ls_type2).
 *         A solução atual ganha um halo; para achar o melhor vizinho, um marcador percorre a curva dentro
 *         do círculo (rastro vermelho = pior que s, verde = melhor) e o melhor vizinho brota; depois o halo
 *         desliza até ele e a nova vizinhança cresce. No fim, nenhum vizinho é melhor: ótimo local.
 *  arvore (slides 22–26) — detalhe da vizinhança e tipos de seleção (img/ls_type3–6). Cada caixa é o mesmo
 *         landscape, na mesma escala, transladado e recortado. Estados: t2 (vista ampla, só como ponto de
 *         partida do zoom), z (= ls_type3), zw / zb (= z, com destaque passageiro dos vizinhos piores /
 *         melhores), f, fb, fbr (= ls_type4, 5, 6).
 *  tabela (slides 27–30) — exemplo binário com o operador flip (img/type1–4; dados em
 *         js/anim/dados/tabela.js, gerados por ferramentas/figura_camadas.py). Estados: vazio, type1…type4.
 *
 * Em todos, o estado final de cada passo é igual à figura do PDF; os destaques são passageiros.
 */
(function () {
  'use strict';
  const A = window.Anim, S = A.svg, E = A.ease, lerp = A.lerp;
  const NAVY = '#00008b', MYBLUE = '#0061a5', GREEN = '#169b3a', RED = '#d0281a';
  const MAIN = 'KaTeX_Main, serif', MATH = 'KaTeX_Math, serif';
  const R = 7.155;                       // raio da vizinhança (ε)
  const clamp01 = function (t) { return Math.max(0, Math.min(1, t)); };
  const quiet = function () {};          // para tweens em paralelo (cancelamento não é erro)

  // ---------- curva do landscape (coordenadas de img/ls*.pdf, em pt) ----------
  const CURVE = 'M28.89 85.68C36.9 53.68 40.9 49.68 44.23 49.02C47.56 48.35 50.23 51.02 52.9 57.68C55.56 64.35 58.23 75.02 60.9 84.35C63.56 93.68 66.23 101.68 68.9 107.02C71.56 112.35 74.23 115.02 76.9 113.68C79.56 112.35 82.23 107.02 84.9 100.35C87.56 93.68 90.23 85.68 92.9 80.35C95.56 75.02 98.23 72.35 100.9 72.35C103.56 72.35 106.23 75.02 108.9 79.02C111.56 83.02 114.23 88.35 116.9 92.35C119.56 96.35 122.23 99.02 126.23 101.68C130.23 104.35 135.56 107.02 140.9 107.02C146.23 107.02 151.56 104.35 155.56 101.68C159.56 99.02 162.23 96.35 166.23 85.68C170.23 75.02 175.56 56.35 180.9 44.35C186.23 32.35 191.56 27.02 196.89 27.02C202.23 27.02 207.56 32.35 210.23 39.02C212.89 45.68 212.89 53.68 220.89 69.68';
  // amostras da curva (para mover marcadores ao longo dela sem depender do SVG estar visível)
  const PTS = [], LEN = [0];
  (function () {
    const n = CURVE.match(/-?\d+(\.\d+)?/g).map(Number);
    PTS.push([n[0], n[1]]);
    for (let i = 2; i + 5 < n.length; i += 6) {
      const p0 = PTS[PTS.length - 1];
      for (let k = 1; k <= 40; k++) {
        const t = k / 40, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
        PTS.push([a * p0[0] + b * n[i] + c * n[i + 2] + d * n[i + 4], a * p0[1] + b * n[i + 1] + c * n[i + 3] + d * n[i + 5]]);
      }
    }
    for (let i = 1; i < PTS.length; i++) LEN.push(LEN[i - 1] + Math.hypot(PTS[i][0] - PTS[i - 1][0], PTS[i][1] - PTS[i - 1][1]));
  })();
  const LTOT = LEN[LEN.length - 1];
  function idxAt(s) {
    let lo = 0, hi = LEN.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (LEN[m] <= s) lo = m; else hi = m; }
    return lo;
  }
  function at(s) {   // ponto da curva no comprimento s
    s = Math.max(0, Math.min(LTOT, s));
    const i = idxAt(s), j = Math.min(i + 1, PTS.length - 1), f = LEN[j] > LEN[i] ? (s - LEN[i]) / (LEN[j] - LEN[i]) : 0;
    return [lerp(PTS[i][0], PTS[j][0], f), lerp(PTS[i][1], PTS[j][1], f)];
  }
  function nearest(p) {   // comprimento do ponto da curva mais próximo de p
    let bi = 0, bd = Infinity;
    PTS.forEach(function (q, i) { const d = (q[0] - p[0]) * (q[0] - p[0]) + (q[1] - p[1]) * (q[1] - p[1]); if (d < bd) { bd = d; bi = i; } });
    return LEN[bi];
  }
  function within(c, r) {  // trecho [sa, sb] da curva dentro do círculo (centro c, raio r)
    const i0 = idxAt(nearest(c)), inside = function (i) { return Math.hypot(PTS[i][0] - c[0], PTS[i][1] - c[1]) <= r; };
    let a = i0, b = i0;
    while (a > 0 && inside(a - 1)) a--;
    while (b < PTS.length - 1 && inside(b + 1)) b++;
    return [LEN[a], LEN[b]];
  }
  const f2 = function (p) { return p[0].toFixed(2) + ' ' + p[1].toFixed(2); };
  function trailD(s0, s1, keep) {  // caminho do trecho [s0, s1] da curva, só onde keep(y)
    if (s1 < s0) { const t = s0; s0 = s1; s1 = t; }
    const pts = [at(s0)];
    for (let i = idxAt(s0) + 1; i < PTS.length && LEN[i] < s1; i++) pts.push(PTS[i]);
    pts.push(at(s1));
    let d = '', on = false;
    for (let i = 1; i < pts.length; i++) {
      const ok = !keep || keep((pts[i - 1][1] + pts[i][1]) / 2);
      if (ok) { if (!on) d += 'M' + f2(pts[i - 1]); d += 'L' + f2(pts[i]); }
      on = ok;
    }
    return d;
  }
  function polyD(pts, e) {  // polilinha percorrida até a fração e
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const goal = L[L.length - 1] * e;
    let d = 'M' + f2(pts[0]);
    for (let i = 1; i < pts.length; i++) {
      if (L[i] <= goal) { d += 'L' + f2(pts[i]); continue; }
      const f = (goal - L[i - 1]) / (L[i] - L[i - 1]);
      d += 'L' + f2([lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]);
      break;
    }
    return d;
  }

  // centros das vizinhanças (círculos) e soluções (pontos) da figura ls10, na ordem da busca
  const C = [[55.05, 63.83], [56.82, 70.77], [59.01, 77.58], [60.99, 84.48], [63.04, 91.34], [65.40, 98.21], [67.96, 104.86], [71.44, 111.01], [75.75, 113.88]];
  const P = [[55.05, 63.83], [57.06, 70.69], [59.11, 77.67], [60.96, 84.57], [63.01, 91.43], [65.37, 98.29], [67.93, 104.96], [71.42, 111.10], [75.72, 113.97]];
  // trecho sólido da curva (no PDF: curva cheia sob máscaras brancas): de y = 56.93 até o fundo do último círculo
  const YEND = [56.93, 71.74, 77.58, 84.83, 91.45, 98.5, 105.37, 112.02, 118.17, 130];
  // à direita: não passa do último círculo (senão aparece a subida depois do vale)
  const XEND = function (n) { return n >= 9 ? 80.84 : n >= 5 ? C[n - 1][0] + R : 84.2; };
  const BOX_LS = 'M36.52 48.2H64.52V72.2H36.52Z';   // retângulo do detalhe (ls_type2)

  // ---------- utilidades de desenho ----------
  let uid = 0;
  function vis(e, on) { if (e) e.style.display = on ? '' : 'none'; }
  function txt(parent, s, x, y, fs, italic) {
    const e = S('text', { x: x, y: y, 'font-size': fs, 'font-family': italic ? MATH : MAIN, fill: '#000' }, parent);
    if (italic) e.setAttribute('font-style', 'italic');
    e.textContent = s;
    return e;
  }
  function line(parent, d, w, extra) {
    const e = S('path', { d: d, fill: 'none', stroke: '#000', 'stroke-width': w, 'stroke-linejoin': 'round' }, parent);
    if (extra) for (const k in extra) e.setAttribute(k, extra[k]);
    return e;
  }
  function head(parent, d, w) { return S('path', { d: d, fill: '#000', stroke: '#000', 'stroke-width': w, 'stroke-linejoin': 'round' }, parent); }
  function dot(parent, p, before) {
    const g = S('g', {});
    if (before) parent.insertBefore(g, before); else parent.appendChild(g);
    g._o = S('circle', { cx: p[0], cy: p[1], r: 1.2, fill: NAVY }, g);
    g._i = S('circle', { cx: p[0], cy: p[1], r: 0.66, fill: '#fff' }, g);
    return g;
  }
  function dotScale(d, s) { s = Math.max(0, s); d._o.setAttribute('r', 1.2 * s); d._i.setAttribute('r', 0.66 * s); }
  function place(e, p) { e.setAttribute('cx', p[0]); e.setAttribute('cy', p[1]); }
  function clearStyle(root) {
    root.querySelectorAll('path,circle,text,g,rect').forEach(function (e) {
      e.style.opacity = ''; e.style.strokeDasharray = ''; e.style.strokeDashoffset = '';
    });
  }

  // ---------- animações básicas ----------
  function trace(h, el, dur, ez) {   // traço sólido desenhado do início ao fim
    vis(el, true);
    const L = el.getTotalLength();
    el.style.strokeDasharray = L + ' ' + (L + 1); el.style.strokeDashoffset = L;
    return h.tween(dur, function (e) { el.style.strokeDashoffset = L * (1 - e); }, ez || E.inOut)
      .then(function () { el.style.strokeDasharray = ''; el.style.strokeDashoffset = ''; });
  }
  function fade(h, els, a, b, dur) {
    els.forEach(function (e) { vis(e, true); e.style.opacity = a; });
    return h.tween(dur, function (e) { els.forEach(function (x) { x.style.opacity = lerp(a, b, e); }); })
      .then(function () { els.forEach(function (x) { x.style.opacity = b === 1 ? '' : b; if (b === 0) vis(x, false); }); });
  }
  function textIn(h, el, dur) {
    vis(el, true); el.style.opacity = 0;
    return h.tween(dur || 300, function (e) {
      el.style.opacity = e; el.setAttribute('transform', 'translate(0 ' + (1.2 * (1 - e)) + ')');
    }, E.out).then(function () { el.style.opacity = ''; el.removeAttribute('transform'); });
  }
  async function wordsIn(h, list, dur) { for (const w of list) await textIn(h, w, dur); }
  function fadeRemove(h, els, dur) {   // some e é removido, sem segurar a sequência
    h.tween(dur, function (e) { els.forEach(function (x) { x.style.opacity = 1 - e; }); })
      .then(function () { els.forEach(function (x) { x.remove(); }); }).catch(quiet);
  }
  function ring(h, parent, p, color, r0, r1, dur) {   // anel que se expande e some
    const c = S('circle', { cx: p[0], cy: p[1], r: r0, fill: 'none', stroke: color, 'stroke-width': 0.45 }, parent);
    h.tween(dur, function (e) { c.setAttribute('r', lerp(r0, r1, e)); c.setAttribute('opacity', 1 - e); }, E.out)
      .then(function () { c.remove(); }).catch(quiet);
  }
  function cross(parent, p, color, sz) {   // pequeno "x"
    const g = S('g', { stroke: color, 'stroke-width': 0.5, 'stroke-linecap': 'round' }, parent);
    S('path', { d: 'M' + (p[0] - sz) + ' ' + (p[1] - sz) + 'L' + (p[0] + sz) + ' ' + (p[1] + sz) + 'M' + (p[0] - sz) + ' ' + (p[1] + sz) + 'L' + (p[0] + sz) + ' ' + (p[1] - sz) }, g);
    return g;
  }
  function trail(parent, color) {
    return S('path', { fill: 'none', stroke: color, 'stroke-width': 1.25, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.85 }, parent);
  }
  function probe(parent) { return S('circle', { r: 0.95, fill: '#fff', stroke: '#222', 'stroke-width': 0.35 }, parent); }

  // ---------- o landscape ----------
  // opt.axes: eixos e rótulos; opt.nC: quantos círculos/pontos criar
  function land(parent, opt) {
    const id = 'bl' + (++uid), L = {};
    const g = L.g = S('g', {}, parent);
    const defs = S('defs', {}, g);
    L.clipS = S('rect', { x: 38.86, y: 56.93, width: 45.34, height: 0 }, S('clipPath', { id: id + 's' }, defs));
    L.clipD = S('rect', { x: 0, y: 0, width: 260, height: 160 }, S('clipPath', { id: id + 'd' }, defs));
    const cs = { fill: 'none', stroke: NAVY, 'stroke-width': 0.8, 'stroke-linejoin': 'round' };
    L.solid = S('path', Object.assign({ d: CURVE, 'clip-path': 'url(#' + id + 's)' }, cs), g);
    L.dotted = S('path', Object.assign({ d: CURVE, 'stroke-dasharray': '1 3', 'clip-path': 'url(#' + id + 'd)' }, cs), g);
    if (opt.axes) {
      L.yAxis = line(g, 'M28.89 125.68L28.89 5.68', 0.8);
      L.yHead = head(g, 'M28.89 5.68L27.23 10.68L30.56 10.68Z', 0.8);
      const xe = opt.xEnd || 244.89;   // xEnd: eixo x mais curto (figura recortada)
      L.xAxis = line(g, 'M28.89 125.68L' + xe + ' 125.68', 0.8);
      L.xHead = head(g, 'M' + xe + ' 125.68L' + (xe - 5) + ' 124.02L' + (xe - 5) + ' 127.35Z', 0.8);
      if (!opt.xEnd) L.vline = line(g, 'M220.89 125.68L220.89 29.68', 0.4, { 'stroke-dasharray': '1 3' });
    }
    L.radius = line(g, 'M55.05 63.83L61.45 67.03', 0.4);
    // ordem de desenho do PDF: C0, D0, D1, C1, D2, C2, ...
    L.circ = []; L.dots = [];
    for (let k = 0; k < (opt.nC || 9); k++) {
      if (k > 0) L.dots[k] = dot(g, P[k]);
      L.circ[k] = S('circle', { cx: C[k][0], cy: C[k][1], r: R, fill: NAVY, 'fill-opacity': 0.3, stroke: '#000', 'stroke-width': 0.4 }, g);
      if (k === 0) L.dots[0] = dot(g, P[0]);
    }
    L.eps = txt(g, 'ϵ', 58.28, 64.71, 3.99, true);
    if (opt.axes) {
      L.lab = S('g', {}, g);
      txt(L.lab, 'f', 1.0, 20.41, 12.91, true); txt(L.lab, '(', 8.61, 20.41, 12.91, false);
      txt(L.lab, 's', 13.53, 20.41, 12.91, true); txt(L.lab, 'i', 19.48, 22.35, 8.97, true);
      txt(L.lab, ')', 23.02, 20.41, 12.91, false);
      const sx = opt.xEnd ? opt.xEnd - 18.26 : 226.63;
      txt(L.lab, 's', sx, 136.84, 12.91, true); txt(L.lab, 'i', sx + 5.96, 138.78, 8.97, true);
    }
    L.fx = S('g', {}, g);   // elementos passageiros
    return L;
  }
  function setClip(L, n) {
    L.clipS.setAttribute('height', YEND[n] - 56.93);
    L.clipS.setAttribute('width', XEND(n) - 38.86);
  }
  function clearFx(L) { while (L.fx.firstChild) L.fx.removeChild(L.fx.firstChild); L.halo = null; }
  function halo(L, p) {
    if (!L.halo) {
      L.halo = S('circle', { r: 2.4, fill: 'none', stroke: MYBLUE, 'stroke-width': 0.6 }, L.fx);
      if (p) place(L.halo, p);
      L.halo.style.opacity = 0;
      return { el: L.halo, fresh: true };
    }
    return { el: L.halo, fresh: false };
  }
  async function haloAt(h, L, p) {
    const o = halo(L, p);
    if (o.fresh) await h.tween(250, function (e) { o.el.style.opacity = e; });
  }
  function popDot(h, L, k, dur) {
    const d = L.dots[k];
    vis(d, true); dotScale(d, 0);
    ring(h, L.fx, P[k], MYBLUE, 1.2, 4.2, 700);
    return h.tween(dur, function (e) { dotScale(d, e); }, E.back).then(function () { dotScale(d, 1); });
  }
  function growCircle(h, L, k, dur) {
    const c = L.circ[k];
    vis(c, true); c.setAttribute('r', 0);
    const y0 = YEND[k], y1 = YEND[k + 1], x0 = XEND(k), x1 = XEND(k + 1);
    return h.tween(dur, function (e) {
      e = Math.max(0, e);   // o 1º quadro pode vir com tempo levemente negativo
      c.setAttribute('r', R * e);
      L.clipS.setAttribute('height', lerp(y0, y1, e) - 56.93);
      L.clipS.setAttribute('width', lerp(x0, x1, e) - 38.86);
    }, E.out).then(function () { c.setAttribute('r', R); });
  }
  async function moveHalo(h, L, from, to, dur) {
    await haloAt(h, L, P[from]);
    const s0 = nearest(P[from]), s1 = nearest(P[to]);
    await h.tween(dur, function (e) { place(L.halo, at(lerp(s0, s1, e))); }, E.inOut);
    place(L.halo, P[to]);
  }
  // procura o melhor vizinho dentro do círculo k: marcador percorre a curva; vermelho = pior que s, verde = melhor
  async function scan(h, L, k, dur, final, popDur) {
    const iv = within(C[k], R), py = P[k][1];
    const better = function (y) { return y > py + 0.6; };
    const red = trail(L.fx, RED), grn = trail(L.fx, GREEN), pr = probe(L.fx);
    await h.tween(dur, function (e) {
      const s = lerp(iv[0], iv[1], e), q = at(s);
      red.setAttribute('d', trailD(iv[0], s, function (y) { return !better(y); }));
      grn.setAttribute('d', trailD(iv[0], s, better));
      place(pr, q); pr.setAttribute('fill', better(q[1]) ? GREEN : RED);
    }, E.inOut);
    await h.tween(Math.min(180, dur / 4), function (e) { pr.style.opacity = 1 - e; });
    pr.remove();
    if (!final) await popDot(h, L, k + 1, popDur || 380);
    fadeRemove(h, [red, grn], 500);
  }

  // ================= busca (slides 6–15, 20–21) =================
  const ANN = {
    ini: { arrow: 'M72.99 39.33C63.13 41.06 55.88 49.55 55.7 59.56', head: 'M55.7 59.56L56.75 56.58L54.76 56.55Z', y: 40.43,
      words: [['Solução', 74.71], ['inicial', 100.28], ['s', 120.81, 1]] },
    viz: { arrow: 'M72.97 39.33C63.05 40.77 55.76 47.82 55.58 56.13', head: 'M55.58 56.13L56.64 53.15L54.64 53.11Z', y: 40.43,
      words: [['Vizinhança', 74.71], ['de', 110.94], ['s', 120.23, 1]] },
    mel: { arrow: 'M93.84 41.83C95.07 54.44 81.94 65.98 61.8 69.97', head: 'M61.8 69.97L64.94 70.37L64.55 68.41Z', y: 40.44,
      words: [['Melhor', 74.71], ['vizinho', 98.56], ['de', 122.79], ['s', 132.07, 1]] }
  };
  // c: curva e eixos; n: círculos; d: pontos; rad: raio e ε; ann: anotação; ot: "ótimo local"; box: retângulo
  const ST = {
    vazio: {},
    ls1: { c: 1 }, ls2: { c: 1, d: 1, ann: 'ini' }, ls3: { c: 1, n: 1, d: 1, rad: 1, ann: 'viz' },
    ls4: { c: 1, n: 1, d: 2, rad: 1, ann: 'mel' }, ls5: { c: 1, n: 2, d: 2 }, ls6: { c: 1, n: 2, d: 3 },
    ls7: { c: 1, n: 3, d: 3 }, ls8: { c: 1, n: 3, d: 4 }, ls9: { c: 1, n: 4, d: 4 }, ls10: { c: 1, n: 9, d: 9, ot: 1 },
    t1: { c: 1, n: 1, d: 1, rad: 1 }, t2: { c: 1, n: 1, d: 1, rad: 1, box: 1 }
  };

  A.define('busca', function (host) {
    const W = 248.722, H = 144.4, SC = 1.1;
    const root = S('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Busca local no fitness landscape' });
    root.style.width = (W * SC) + 'pt'; root.style.height = (H * SC) + 'pt';
    host.appendChild(root);
    const L = land(root, { axes: true });
    const ann = {};
    Object.keys(ANN).forEach(function (k) {
      const a = ANN[k], g = S('g', {}, root);
      g._arrow = line(g, a.arrow, 0.4); g._head = head(g, a.head, 0.4);
      g._words = a.words.map(function (w) { return txt(g, w[0], w[1], a.y, 6.97, !!w[2]); });
      ann[k] = g;
    });
    const ot = S('g', {}, root);
    ot._words = [txt(ot, 'ótimo', 87.94, 110.88, 5.65), txt(ot, 'local', 89.51, 115.55, 5.65)];
    const box = line(root, BOX_LS, 0.4);
    const axesEls = [L.dotted, L.yAxis, L.yHead, L.xAxis, L.xHead, L.vline, L.lab];

    function snap(name) {
      const s = ST[name] || {};
      clearFx(L); clearStyle(root);
      root.querySelectorAll('text').forEach(function (t) { t.removeAttribute('transform'); });
      axesEls.forEach(function (e) { vis(e, !!s.c); });
      vis(L.solid, !!s.c);
      L.clipD.setAttribute('width', 260);
      setClip(L, s.n || 0);
      L.circ.forEach(function (e, k) { vis(e, k < (s.n || 0)); e.setAttribute('r', R); });
      L.dots.forEach(function (e, k) { vis(e, k < (s.d || 0)); dotScale(e, 1); });
      vis(L.radius, !!s.rad); vis(L.eps, !!s.rad);
      Object.keys(ann).forEach(function (k) {
        vis(ann[k], s.ann === k); vis(ann[k]._head, true); vis(ann[k]._arrow, true);
        ann[k]._words.forEach(function (w) { vis(w, true); });
      });
      vis(ot, !!s.ot); vis(box, !!s.box);
    }

    async function entry(h) {   // eixos crescem, a curva se desenha da esquerda para a direita
      [L.yHead, L.xHead, L.vline, L.lab].forEach(function (e) { vis(e, true); e.style.opacity = 0; });
      vis(L.dotted, true); vis(L.solid, true); L.clipD.setAttribute('width', 0);
      await h.all([trace(h, L.yAxis, 650), trace(h, L.xAxis, 750)]);
      await h.all([fade(h, [L.yHead, L.xHead], 0, 1, 200), fade(h, [L.lab], 0, 1, 400)]);
      await h.tween(1300, function (e) { L.clipD.setAttribute('width', 28.5 + 193 * e); }, E.inOut);
      L.clipD.setAttribute('width', 260);
      await fade(h, [L.vline], 0, 1, 300);
    }
    async function radIn(h) {
      await trace(h, L.radius, 300);
      await textIn(h, L.eps, 250);
    }
    async function annIn(h, k) {
      const g = ann[k];
      vis(g, true); vis(g._head, false); vis(g._arrow, false); g._words.forEach(function (w) { vis(w, false); });
      await wordsIn(h, g._words, 200);
      await trace(h, g._arrow, 550);
      await fade(h, [g._head], 0, 1, 150);
    }

    async function play(a, b, h) {
      const s0 = ST[a] || {}, s1 = ST[b] || {};
      const steps = (s1.n || 0) - (s0.n || 0) + (s1.d || 0) - (s0.d || 0);
      const sp = steps > 2 ? 0.32 : 1;     // muitos passos (ls9 -> ls10): mais rápido
      // o que sai
      const outs = [];
      if (s0.ann && s0.ann !== s1.ann) outs.push(ann[s0.ann]);
      if (s0.rad && !s1.rad) outs.push(L.radius, L.eps);
      if (outs.length) await fade(h, outs, 1, 0, 320);
      if (!s0.c && s1.c) await entry(h);
      let n = s0.n || 0, d = s0.d || 0, rad = !!s0.rad;
      const N = s1.n || 0, Dn = s1.d || 0;
      if (d === 0 && Dn > 0) { await popDot(h, L, 0, 420); d = 1; }
      for (let guard = 0; guard < 40 && (n < N || d < Dn); guard++) {
        if (n < d && n < N) {             // nova vizinhança em volta da solução atual
          if (n > 0) await moveHalo(h, L, n - 1, n, 600 * sp);
          await growCircle(h, L, n, 650 * sp); n++;
          if (n === 1 && s1.rad && !rad) { await radIn(h); rad = true; }
        } else if (d < Dn) {              // procura o melhor vizinho
          await haloAt(h, L, P[d - 1]);
          await scan(h, L, d - 1, 1100 * sp, false, Math.max(260, 380 * sp)); d++;
        } else break;
      }
      if (s1.rad && !rad) await radIn(h);
      if (s1.ot && !s0.ot) {              // nenhum vizinho é melhor: ótimo local
        await haloAt(h, L, P[8]);
        await scan(h, L, 8, 1000, true);
        const hl = L.halo;
        await h.tween(700, function (e, t) {
          hl.setAttribute('stroke', A.mix(MYBLUE, RED, Math.sin(Math.PI * t)));
          hl.setAttribute('r', 2.4 + 1.3 * Math.sin(Math.PI * t));
        }, E.linear);
        await wordsIn(h, ot._words, 280);
      }
      if (s1.ann && s1.ann !== s0.ann) await annIn(h, s1.ann);
      if (s1.box && !s0.box) await trace(h, box, 800);
      if (L.halo) { const hl = L.halo; await h.tween(350, function (e) { hl.style.opacity = 1 - e; }); }
    }
    return { snap: snap, play: play };
  });

  // ================= arvore (slides 22–26) =================
  const CHILD = [   // caixa (x), seta, ponta, rótulos e vizinho escolhido (coordenadas do landscape)
    { x: 4.71, arrow: [[36.71, 16.4], [16.71, 16.4], [16.71, 28.4]], head: 'M16.71 28.4L17.71 25.4L15.71 25.4Z',
      words: [['First', 15.61, 56.67], ['improvement', 9.08, 60.54]], pick: [55.71, 65.95] },
    { x: 36.71, arrow: [[52.71, 24.4], [52.71, 28.4]], head: 'M52.71 28.4L53.71 25.4L51.71 25.4Z',
      words: [['Best', 47.61, 56.67], ['improvement', 41.08, 60.54]], pick: [57.15, 70.81] },
    { x: 68.71, arrow: [[64.71, 16.4], [84.71, 16.4], [84.71, 28.4]], head: 'M84.71 28.4L85.71 25.4L83.71 25.4Z',
      words: [['Random', 77.08, 56.54], ['selection', 77.08, 60.54]], pick: [56.35, 67.95] }
  ];
  const TREE_WH = { t2: [96.913, 61.829], z: [96.913, 61.829], zw: [96.913, 61.829], zb: [96.913, 61.829],
    f: [96.913, 62.31], fb: [96.913, 62.31], fbr: [97.113, 62.31] };
  const NCH = { f: 1, fb: 2, fbr: 3 };
  // vista do slide anterior (ls_type2 a 1.1) nas coordenadas desta figura (a 2.2): x' = 0.5x - 13.724, y' = 0.5y
  const ZC = [50.52, 60.2], Z0 = [0.5 * 50.52 - 13.724, 0.5 * 60.2], Z1 = [50.52 + 0.19, 60.2 - 47.8];

  A.define('arvore', function (host) {
    const states = (host.dataset.state || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    const WH = TREE_WH[states[states.length - 1]] || TREE_WH.z, SC = 2.2;
    const root = S('svg', { viewBox: '0 0 ' + WH[0] + ' ' + WH[1], role: 'img', 'aria-label': 'Vizinhança de s e os tipos de seleção do vizinho' });
    root.style.width = (WH[0] * SC) + 'pt'; root.style.height = (WH[1] * SC) + 'pt';
    host.appendChild(root);

    // vista ampla (só no início do zoom), sem o miolo do retângulo (que é desenhado pela caixa de cima)
    const wide = S('g', {}, root);
    const hid = 'bh' + (++uid);
    S('path', { d: 'M-60 -60H320V220H-60Z' + 'M36.52 48.2V72.2H64.52V48.2Z', 'clip-rule': 'evenodd' },
      S('clipPath', { id: hid }, S('defs', {}, wide)));
    const LW = land(S('g', { 'clip-path': 'url(#' + hid + ')' }, wide), { axes: true, nC: 1 });
    setClip(LW, 1);

    function inst(tx, ty, pick) {   // uma caixa: landscape transladado e recortado
      const g = S('g', {}, root), id = 'bc' + (++uid);
      S('rect', { x: 36.52, y: 48.2, width: 28, height: 24 }, S('clipPath', { id: id }, S('defs', {}, g)));
      const inner = S('g', { 'clip-path': 'url(#' + id + ')' }, g);
      const L = land(inner, { axes: false, nC: 1 });
      setClip(L, 1);
      const pd = pick ? dot(L.g, pick, L.eps) : null;
      const frame = line(g, BOX_LS, 0.4);
      return { g: g, inner: inner, L: L, pick: pd, frame: frame, tr: 'translate(' + tx + ' ' + ty + ')' };
    }
    const top = inst(0.19, -47.8, null);
    const kids = CHILD.map(function (c) {
      const arrow = line(root, polyD(c.arrow, 1), 0.4), hd = head(root, c.head, 0.4);
      const k = inst(c.x - 36.52, -19.8, c.pick);
      k.arrow = arrow; k.head = hd; k.c = c;
      k.words = c.words.map(function (w) { return txt(root, w[0], w[1], w[2], 3.99, false); });
      return k;
    });
    const all = [top].concat(kids);

    function snap(name) {
      all.forEach(function (k) { clearFx(k.L); k.g.setAttribute('transform', k.tr); });
      clearFx(LW); clearStyle(root);
      root.querySelectorAll('text').forEach(function (t) { t.removeAttribute('transform'); });
      vis(wide, name === 't2');
      wide.setAttribute('transform', 'translate(' + (Z0[0] - 0.5 * ZC[0]) + ' ' + (Z0[1] - 0.5 * ZC[1]) + ') scale(0.5)');
      if (name === 't2') top.g.setAttribute('transform', wide.getAttribute('transform'));
      vis(top.g, !!TREE_WH[name]);
      const n = NCH[name] || 0;
      kids.forEach(function (k, i) {
        const on = i < n;
        vis(k.g, on); vis(k.arrow, on); vis(k.head, on);
        k.words.forEach(function (w) { vis(w, on); });
        k.arrow.setAttribute('d', polyD(k.c.arrow, 1));
        vis(k.pick, true); dotScale(k.pick, 1);
      });
    }

    async function zoom(h) {
      vis(wide, true); vis(top.g, true);
      await h.wait(150);
      await h.tween(1600, function (e) {
        const s = Math.exp(lerp(Math.log(0.5), 0, e)), px = lerp(Z0[0], Z1[0], e), py = lerp(Z0[1], Z1[1], e);
        const tr = 'translate(' + (px - s * ZC[0]) + ' ' + (py - s * ZC[1]) + ') scale(' + s + ')';
        wide.setAttribute('transform', tr); top.g.setAttribute('transform', tr);
        wide.style.opacity = clamp01(1 - (e - 0.1) / 0.55);
      }, E.inOut);
      vis(wide, false); top.g.setAttribute('transform', top.tr);
    }
    // nunca aceita vizinhos piores: o trecho acima de s fica vermelho e é recusado
    async function worse(h) {
      const L = top.L, s0 = nearest(P[0]), iv = within(C[0], R);
      const red = trail(L.fx, RED), pr = probe(L.fx);
      pr.setAttribute('fill', RED);
      await h.tween(900, function (e) { const s = lerp(s0, iv[0], e); red.setAttribute('d', trailD(s, s0)); place(pr, at(s)); }, E.inOut);
      const q = at(iv[0]), x = cross(L.fx, [q[0] - 2.6, q[1] + 0.4], RED, 0.9);
      x.style.opacity = 0;
      await h.tween(260, function (e) { x.style.opacity = e; }, E.out);
      await h.wait(1100);
      fadeRemove(h, [red, pr, x], 500);
    }
    // vários vizinhos melhores: o trecho abaixo de s fica verde, com alguns vizinhos marcados
    async function better(h) {
      const L = top.L, s0 = nearest(P[0]), iv = within(C[0], R);
      const grn = trail(L.fx, GREEN), pr = probe(L.fx), marks = [];
      pr.setAttribute('fill', GREEN);
      const fr = [0.3, 0.6, 0.92];
      await h.tween(1000, function (e) {
        const s = lerp(s0, iv[1], e);
        grn.setAttribute('d', trailD(s0, s)); place(pr, at(s));
        while (marks.length < fr.length && e >= fr[marks.length]) {
          const m = S('circle', { r: 0.85, fill: GREEN, stroke: '#fff', 'stroke-width': 0.25 }, L.fx);
          place(m, at(lerp(s0, iv[1], fr[marks.length]))); marks.push(m);
          ring(h, L.fx, at(lerp(s0, iv[1], fr[marks.length - 1])), GREEN, 0.9, 2.6, 500);
        }
      }, E.inOut);
      await h.wait(1300);
      fadeRemove(h, [grn, pr].concat(marks), 500);
    }

    // seleção em cada caixa
    function popPick(h, k) {
      vis(k.pick, true); dotScale(k.pick, 0);
      ring(h, k.L.fx, k.c.pick, MYBLUE, 1.2, 4, 650);
      return h.tween(380, function (e) { dotScale(k.pick, e); }, E.back).then(function () { dotScale(k.pick, 1); });
    }
    async function selFirst(h, k) {   // gera vizinhos um a um: o primeiro é pior, o segundo é melhor -> aceito
      const L = k.L, s0 = nearest(P[0]), pr = probe(L.fx);
      const w = at(s0 - 3.3);
      place(pr, P[0]); pr.style.opacity = 0;
      await h.tween(200, function (e) { pr.style.opacity = e; });
      await h.tween(380, function (e) { place(pr, at(s0 - 3.3 * e)); }, E.inOut);
      pr.setAttribute('fill', RED);
      const x = cross(L.fx, [w[0] - 2.3, w[1] + 0.3], RED, 0.8);
      ring(h, L.fx, w, RED, 0.9, 2.8, 500);
      await h.wait(450);
      pr.setAttribute('fill', '#fff');
      const s1 = nearest(k.c.pick);
      await h.tween(420, function (e) { place(pr, at(lerp(s0 - 3.3, s1, e))); }, E.inOut);
      pr.setAttribute('fill', GREEN);
      ring(h, L.fx, k.c.pick, GREEN, 0.9, 2.8, 500);
      await h.wait(250);
      fadeRemove(h, [pr, x], 300);
      await popPick(h, k);
    }
    async function selBest(h, k) {   // gera toda a vizinhança e fica com o melhor
      const L = k.L, iv = within(C[0], R), py = P[0][1];
      const better = function (y) { return y > py + 0.6; };
      const red = trail(L.fx, RED), grn = trail(L.fx, GREEN), pr = probe(L.fx);
      const best = S('circle', { r: 1.6, fill: 'none', stroke: GREEN, 'stroke-width': 0.45 }, L.fx);
      best.style.display = 'none';
      let by = -Infinity;
      await h.tween(1300, function (e) {
        const s = lerp(iv[0], iv[1], e), q = at(s);
        red.setAttribute('d', trailD(iv[0], s, function (y) { return !better(y); }));
        grn.setAttribute('d', trailD(iv[0], s, better));
        place(pr, q); pr.setAttribute('fill', better(q[1]) ? GREEN : RED);
        if (better(q[1]) && q[1] > by) { by = q[1]; best.style.display = ''; place(best, q); }
      }, E.inOut);
      place(best, k.c.pick);
      await h.wait(250);
      fadeRemove(h, [red, grn, pr, best], 400);
      await popPick(h, k);
    }
    async function selRandom(h, k) {   // dentre os melhores, sorteia um
      const L = k.L, s0 = nearest(P[0]), iv = within(C[0], R);
      const grn = trail(L.fx, GREEN), pr = probe(L.fx);
      pr.setAttribute('fill', GREEN);
      await h.tween(650, function (e) { const s = lerp(s0, iv[1], e); grn.setAttribute('d', trailD(s0, s)); place(pr, at(s)); }, E.inOut);
      const a = s0 + 0.9, b = iv[1], hops = [0.75, 0.2, 0.55, 0.05, 0.9, 0.35, 0.65];
      for (const f of hops) { place(pr, at(lerp(a, b, f))); await h.wait(130); }
      place(pr, k.c.pick);
      ring(h, L.fx, k.c.pick, GREEN, 0.9, 2.8, 500);
      await h.wait(300);
      fadeRemove(h, [grn, pr], 400);
      await popPick(h, k);
    }
    const SEL = [selFirst, selBest, selRandom];

    async function kidIn(h, i) {
      const k = kids[i];
      vis(k.arrow, true); vis(k.head, false); vis(k.g, false);
      k.words.forEach(function (w) { vis(w, false); });
      await h.tween(450, function (e) { k.arrow.setAttribute('d', polyD(k.c.arrow, e)); }, E.inOut);
      k.arrow.setAttribute('d', polyD(k.c.arrow, 1));
      await fade(h, [k.head], 0, 1, 120);
      vis(k.g, true); vis(k.pick, false);
      await h.all([trace(h, k.frame, 500), fade(h, [k.inner], 0, 1, 500)]);
      await wordsIn(h, k.words, 220);
      await SEL[i](h, k);
    }

    async function play(a, b, h) {
      if (a === 't2') await zoom(h);
      if (b === 'zw') await worse(h);
      if (b === 'zb') await better(h);
      const n0 = NCH[a] || 0, n1 = NCH[b] || 0;
      for (let i = n0; i < n1; i++) await kidIn(h, i);
    }
    return { snap: snap, play: play };
  });

  // ================= pseudo (slide 17) =================
  // Passo 1: algoritmo no tamanho original (igual ao PDF). No passo 2 ele encolhe para a esquerda e o
  // landscape (recortado na região da busca) aparece à direita; cada passo executa uma linha: a linha
  // atual fica destacada e a figura mostra o que ela faz. As iterações do meio rodam num passo só.
  // Linhas: 0 s = GeraSolInicial, 1 while, 2 GeraVizinhos, 3 Seleciona, 4 if, 5 s = s', 6 else, 7 Pare,
  //         8 end if, 9 end while, 10 return.
  const ALG_SC = 0.62;
  // big: algoritmo no tamanho original; line: linha destacada; n/d: círculos/pontos; s: solução atual;
  // sp: vizinho s' (índice em P); cand: s' da última vizinhança (pior que s); cmp: comparação do if
  const PS = {
    p: { big: 1 },
    i0: { line: 0, d: 1, s: 0 },
    w0: { line: 1, d: 1, s: 0 },
    g0: { line: 2, n: 1, d: 1, s: 0 },
    sel0: { line: 3, n: 1, d: 2, s: 0, sp: 1 },
    if0: { line: 4, n: 1, d: 2, s: 0, sp: 1, cmp: 1 },
    mv0: { line: 5, n: 1, d: 2, s: 1 },
    run: { line: 2, n: 9, d: 9, s: 8 },
    sel8: { line: 3, n: 9, d: 9, s: 8, cand: 1 },
    if8: { line: 6, n: 9, d: 9, s: 8, cand: 1, cmp: 1 },
    pare: { line: 7, n: 9, d: 9, s: 8, ot: 1 },
    ret: { line: 10, n: 9, d: 9, s: 8, ot: 1 }
  };
  const CAND = at(nearest(P[8]) + 6);   // um vizinho do ótimo local, na subida (pior que s)

  A.define('pseudo', function (host) {
    const frame = host.closest('section'), alg = frame.querySelector('.algorithm');
    const lines = Array.prototype.slice.call(alg.querySelectorAll('.alg-body > div'));
    alg.style.transformOrigin = '0 0';
    const W = 126, H = 144.4, SC = 1.16;
    const root = S('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Execução do pseudocódigo da busca local no landscape' });
    root.style.width = (W * SC) + 'pt'; root.style.height = (H * SC) + 'pt';
    host.appendChild(root);
    const L = land(root, { axes: true, xEnd: 124 });
    const marks = S('g', {}, root);   // comparação do if, vizinho s' da última vizinhança
    const cur = S('circle', { r: 2.4, fill: 'none', stroke: MYBLUE, 'stroke-width': 0.6 }, root);
    const sLab = txt(root, 's', 0, 0, 9, true), spLab = txt(root, 's′', 0, 0, 9, true);
    sLab.setAttribute('fill', MYBLUE); spLab.setAttribute('fill', MYBLUE);
    const ot = S('g', {}, root);
    ot._words = [txt(ot, 'ótimo', 87.94, 110.88, 5.65), txt(ot, 'local', 89.51, 115.55, 5.65)];

    function hl(i) { lines.forEach(function (l, k) { l.classList.toggle('alg-on', k === i); }); }
    function placeS(p) { place(cur, p); sLab.setAttribute('x', p[0] - 8.4); sLab.setAttribute('y', p[1] + 2.8); }
    function placeSp(q) { spLab.setAttribute('x', q[0] + 2.8); spLab.setAttribute('y', q[1] + 4.2); }
    function candDot() { const g = dot(marks, CAND); g._o.setAttribute('fill', RED); return g; }
    function check(parent, p) {
      return S('path', { d: 'M' + (p[0] - 1.9) + ' ' + p[1] + 'L' + (p[0] - 0.5) + ' ' + (p[1] + 1.6) + 'L' + (p[0] + 2.3) + ' ' + (p[1] - 2),
        fill: 'none', stroke: GREEN, 'stroke-width': 0.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, parent);
    }
    // if: linha tracejada no nível de s; s' abaixo dela = melhor (minimização)
    function cmpEls(s) {
      const p = P[s.s], q = s.cand ? CAND : P[s.sp], better = q[1] > p[1];
      const lv = line(marks, 'M' + (p[0] + 2.6) + ' ' + p[1] + 'L' + (p[0] + 19) + ' ' + p[1], 0.4, { stroke: '#555', 'stroke-dasharray': '1 1' });
      const mp = [q[0] + 13, q[1] - 0.4];
      const mk = better ? check(marks, mp) : cross(marks, mp, RED, 1.5);
      return [lv, mk];
    }

    function snap(name) {
      const s = PS[name] || PS.p;
      clearFx(L); clearStyle(root); root.style.opacity = '';
      while (marks.firstChild) marks.removeChild(marks.firstChild);
      root.querySelectorAll('text').forEach(function (t) { t.removeAttribute('transform'); });
      alg.style.transform = s.big ? '' : 'scale(' + ALG_SC + ')';
      vis(root, !s.big);
      hl(s.line);
      L.clipD.setAttribute('width', 260); setClip(L, s.n || 0);
      L.circ.forEach(function (e, k) { vis(e, k < (s.n || 0)); e.setAttribute('r', R); });
      L.dots.forEach(function (e, k) { vis(e, k < (s.d || 0)); dotScale(e, 1); });
      vis(L.radius, false); vis(L.eps, false);
      const hasS = s.s != null;
      vis(cur, hasS); vis(sLab, hasS);
      cur.setAttribute('stroke', MYBLUE); cur.setAttribute('r', 2.4);
      if (hasS) placeS(P[s.s]);
      vis(spLab, !!(s.sp || s.cand));
      if (s.sp) placeSp(P[s.sp]);
      if (s.cand) { placeSp(CAND); candDot(); }
      if (s.cmp) cmpEls(s);
      vis(ot, !!s.ot);
    }

    async function sIn(h, k) {
      placeS(P[k]); vis(cur, true); cur.style.opacity = 0;
      await h.all([h.tween(300, function (e) { cur.style.opacity = e; }), textIn(h, sLab, 300)]);
      cur.style.opacity = '';
    }
    async function moveS(h, i, j, dur, fades) {   // s = s': o halo e o rótulo s deslizam até s'
      const s0 = nearest(P[i]), s1 = nearest(P[j]);
      const ms = Array.prototype.slice.call(marks.childNodes).concat(fades || []);
      await h.tween(dur, function (e) {
        placeS(at(lerp(s0, s1, e)));
        ms.forEach(function (m) { m.style.opacity = 1 - e; });
      }, E.inOut);
      ms.forEach(function (m) { if (m.parentNode === marks) m.remove(); else { vis(m, false); m.style.opacity = ''; } });
      placeS(P[j]);
    }
    async function cmpIn(h, s) {
      const els = cmpEls(s);
      els.forEach(function (e) { e.style.opacity = 0; });
      await h.tween(350, function (e) { els[0].style.opacity = e; });
      const b = els[1].getBBox(), cx = b.x + b.width / 2, cy = b.y + b.height / 2;
      await h.tween(380, function (e, t) {
        els[1].style.opacity = Math.min(1, t * 2.5);
        els[1].setAttribute('transform', 'translate(' + cx + ' ' + cy + ') scale(' + Math.max(0.001, e) + ') translate(' + (-cx) + ' ' + (-cy) + ')');
      }, E.back);
      els.forEach(function (e) { e.style.opacity = ''; e.removeAttribute('transform'); });
    }
    async function run(h) {   // iterações 2 a 8 seguidas, com a linha acompanhando
      for (let k = 1; k <= 7; k++) {
        hl(1); await h.wait(100);
        hl(2); await growCircle(h, L, k, 230);
        hl(3); await scan(h, L, k, 320, false, 190);
        hl(4); await h.wait(110);
        hl(5); await moveS(h, k, k + 1, 230);
      }
      hl(1); await h.wait(150);
      hl(2); await growCircle(h, L, 8, 350);
    }

    async function play(a, b, h) {
      const s0 = PS[a] || PS.p, s1 = PS[b] || PS.p;
      if (s0.big && !s1.big) {   // o algoritmo encolhe para a esquerda e a figura aparece
        vis(root, true); root.style.opacity = 0;
        await h.tween(800, function (e) {
          alg.style.transform = 'scale(' + lerp(1, ALG_SC, e) + ')';
          root.style.opacity = clamp01(e * 1.4 - 0.4);
        }, E.inOut);
        root.style.opacity = '';
        await h.wait(150);
      }
      if (b === 'i0') { hl(0); await popDot(h, L, 0, 420); await sIn(h, 0); }
      else if (b === 'w0') { hl(1); await h.wait(250); }
      else if (b === 'g0') { hl(2); await growCircle(h, L, 0, 750); }
      else if (b === 'sel0') { hl(3); await scan(h, L, 0, 1100); placeSp(P[1]); await textIn(h, spLab, 260); }
      else if (b === 'if0') { hl(4); await cmpIn(h, PS.if0); }
      else if (b === 'mv0') { hl(5); await moveS(h, 0, 1, 750, [spLab]); }
      else if (b === 'run') { await run(h); }
      else if (b === 'sel8') {
        hl(3); await scan(h, L, 8, 1000, true);
        const g = candDot();
        ring(h, L.fx, CAND, RED, 1.2, 4, 650);
        await h.tween(380, function (e) { dotScale(g, e); }, E.back);
        dotScale(g, 1);
        placeSp(CAND); await textIn(h, spLab, 260);
      }
      else if (b === 'if8') { hl(4); await cmpIn(h, PS.if8); await h.wait(650); hl(6); }
      else if (b === 'pare') {
        hl(7);
        const ms = Array.prototype.slice.call(marks.childNodes).concat([spLab]);
        await h.tween(300, function (e) { ms.forEach(function (m) { m.style.opacity = 1 - e; }); });
        while (marks.firstChild) marks.removeChild(marks.firstChild);
        vis(spLab, false); spLab.style.opacity = '';
        await h.tween(700, function (e, t) {
          cur.setAttribute('stroke', A.mix(MYBLUE, RED, Math.sin(Math.PI * t)));
          cur.setAttribute('r', 2.4 + 1.3 * Math.sin(Math.PI * t));
        }, E.linear);
        cur.setAttribute('stroke', MYBLUE); cur.setAttribute('r', 2.4);
        await wordsIn(h, ot._words, 280);
      }
      else if (b === 'ret') { hl(10); ring(h, L.fx, P[8], MYBLUE, 2.4, 6.5, 900); await h.wait(600); }
    }
    return { snap: snap, play: play };
  });

  // ================= tabela (slides 27–30) =================
  const CUR = [22, 23, 24], CDASH = 26, CVAL = 27;          // solução atual "1 0 1 - 15"
  const ROWS = [                                            // vizinhos; flip = bit trocado
    { d: [30, 31, 32], dash: 33, val: 34, flip: 1, y: 25.73 },
    { d: [35, 36, 37], dash: 38, val: 39, flip: 2, y: 41.73 },
    { d: [40, 41, 42], dash: 43, val: 44, flip: 0, y: 57.73 }
  ];
  const SELS = [{ lines: [[10, 11]], lab: [69, 70] }, { lines: [[8, 9]], lab: [71, 72] }, { lines: [[12, 13], [14, 15]], lab: [73, 74] }];
  const OUTS = { 4: [50, 51, 52, 53, 54], 5: [55, 56, 57, 58, 59], 6: [60, 61, 62, 63, 64], 7: [75, 76, 77, 78, 79] };

  A.define('tabela', function (host) {
    const D = A.figData && A.figData.tabela;
    if (!D) { console.warn('tabela: dados ausentes'); return { snap: function () {}, play: null }; }
    const SC = 1.3, items = D.items;
    const root = S('svg', { viewBox: '0 0 ' + D.W + ' ' + D.H, role: 'img', 'aria-label': 'Exemplo: vizinhos de 101 pelo flip e a seleção' });
    root.style.width = (D.W * SC) + 'pt'; root.style.height = (D.H * SC) + 'pt';
    host.appendChild(root);
    const els = A.figBuild(root, items);
    const hl = S('g', {}); root.insertBefore(hl, els[22]);   // destaques das linhas (sob os textos)
    const fx = S('g', {}, root);
    const STATES = { vazio: [] };
    Object.keys(D.states).forEach(function (k) { STATES[k] = D.states[k].map(function (i) { return i === 25 ? 24 : i; }); });
    const box = function (i) { return items[i].b; };

    function reset(i) {
      const e = els[i], it = items[i];
      e.style.opacity = ''; e.removeAttribute('transform');
      if (it.t === 'x') e.setAttribute('fill', it.c); else e.setAttribute('d', it.d);
    }
    function snap(name) {
      while (fx.firstChild) fx.removeChild(fx.firstChild);
      while (hl.firstChild) hl.removeChild(hl.firstChild);
      const on = {}; (STATES[name] || []).forEach(function (i) { on[i] = true; });
      items.forEach(function (_, i) { reset(i); vis(els[i], !!on[i]); });
    }
    function show(ids, on) { ids.forEach(function (i) { vis(els[i], on); }); }

    async function traceLine(h, i, dur, rev) {   // linha reta (sólida ou pontilhada) desenhada aos poucos
      const n = items[i].d.match(/-?\d+(\.\d+)?/g).map(Number);
      let p = [n[0], n[1]], q = [n[n.length - 2], n[n.length - 1]];
      if (rev) { const t = p; p = q; q = t; }
      vis(els[i], true);
      await h.tween(dur, function (e) {
        els[i].setAttribute('d', 'M' + f2(p) + 'L' + f2([lerp(p[0], q[0], e), lerp(p[1], q[1], e)]));
      }, E.inOut);
      els[i].setAttribute('d', items[i].d);
    }
    function popBox(h, i, dur) {
      const b = box(i), cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, e0 = els[i];
      vis(e0, true); e0.style.opacity = 0;
      return h.tween(dur || 380, function (e, t) {
        const s = Math.max(0.001, e);
        e0.setAttribute('transform', 'translate(' + cx + ' ' + cy + ') scale(' + s + ') translate(' + (-cx) + ' ' + (-cy) + ')');
        e0.style.opacity = Math.min(1, t * 2.5);
      }, E.back).then(function () { reset(i); });
    }
    const tIn = function (h, i, dur) { return textIn(h, els[i], dur); };
    async function arrowIn(h, ln, hd, dur, rev) { await traceLine(h, ln, dur, rev); await fade(h, [els[hd]], 0, 1, 150); }
    function clone(i) {
      const c = els[i].cloneNode(true);
      c.style.display = ''; c.style.opacity = ''; c.removeAttribute('transform');
      fx.appendChild(c);
      return c;
    }
    function band(r, color) {   // destaque de uma linha da vizinhança
      const y = ROWS[r].y;
      const b = S('rect', { x: 111.2, y: y - 8.8, width: 54.4, height: 11.9, rx: 0.8, fill: color }, hl);
      b.style.opacity = 0;
      return b;
    }
    const to = function (h, b, v, dur) { const a = +b.style.opacity || 0; return h.tween(dur || 250, function (e) { b.style.opacity = lerp(a, v, e); }); };
    function flash(h, i, color, dur) {
      return h.tween(dur, function (e, t) { els[i].setAttribute('fill', A.mix(color, '#000000', t)); }, E.linear)
        .then(function () { els[i].setAttribute('fill', items[i].c); });
    }

    async function type1In(h) {
      await popBox(h, 0);
      for (const i of CUR.concat([CDASH, CVAL])) await tIn(h, i, 160);
      await h.all([tIn(h, 28, 250), tIn(h, 29, 250)]);
      await arrowIn(h, 18, 19, 380);
      await h.all([tIn(h, 46, 250), tIn(h, 47, 250)]);
      await arrowIn(h, 20, 21, 450, true);
    }
    async function genRow(h, r) {   // vizinho r: cópia de s desliza até a linha e um bit é trocado
      const row = ROWS[r], dx = 108, dy = row.y - 41.73;
      const cl = CUR.map(clone);
      await h.tween(520, function (e) { cl.forEach(function (c) { c.setAttribute('transform', 'translate(' + (dx * e) + ' ' + (dy * e) + ')'); }); }, E.inOut);
      const j = row.flip, nu = row.d[j];
      row.d.forEach(function (i, k) { if (k !== j) vis(els[i], true); });
      cl.forEach(function (c, k) { if (k !== j) c.remove(); });
      vis(els[nu], true); els[nu].setAttribute('fill', MYBLUE); els[nu].style.opacity = 0;
      await h.tween(420, function (e) {
        cl[j].style.opacity = 1 - e; cl[j].setAttribute('transform', 'translate(' + dx + ' ' + (dy - 4.5 * e) + ')');
        els[nu].style.opacity = e; els[nu].setAttribute('transform', 'translate(0 ' + (4.5 * (1 - e)) + ')');
      }, E.inOut);
      cl[j].remove(); els[nu].style.opacity = ''; els[nu].removeAttribute('transform');
      h.tween(900, function (e) { els[nu].setAttribute('fill', A.mix(MYBLUE, '#000000', e)); })
        .then(function () { els[nu].setAttribute('fill', items[nu].c); }).catch(quiet);
      await tIn(h, row.dash, 150);
      await tIn(h, row.val, 260);
      await h.wait(120);
    }
    async function type2In(h) {
      await arrowIn(h, 16, 17, 550);
      await popBox(h, 1);
      await tIn(h, 45, 250);
      await arrowIn(h, 2, 3, 450);
      for (const i of [66, 67, 68]) await tIn(h, i, 180);
      for (let r = 0; r < 3; r++) await genRow(h, r);
      await tIn(h, 48, 300);
    }
    async function type3In(h) {
      for (const s of SELS) {
        for (const ln of s.lines) await arrowIn(h, ln[0], ln[1], 320);
        await h.all(s.lab.map(function (i) { return tIn(h, i, 260); }));
      }
      await tIn(h, 49, 300);
    }
    async function fly(h, r, bx, dx, dy) {   // linha r da vizinhança vai para a caixa de resultado
      const row = ROWS[r], src = row.d.concat([row.dash, row.val]), cl = src.map(clone);
      const p = popBox(h, bx, 380);
      await h.tween(650, function (e) { cl.forEach(function (c) { c.setAttribute('transform', 'translate(' + (dx * e) + ' ' + (dy * e) + ')'); }); }, E.inOut);
      await p;
      show(OUTS[bx], true);
      cl.forEach(function (c) { c.remove(); });
    }
    async function type4In(h) {
      // First improvement: o primeiro vizinho gerado já é melhor que 15
      await flash(h, CVAL, MYBLUE, 700);
      const a0 = band(0, GREEN);
      await to(h, a0, 0.3); await h.wait(350);
      await fly(h, 0, 4, 72, -4);
      to(h, a0, 0, 350).catch(quiet);
      await h.wait(400);
      // Best improvement: avalia todos e fica com o melhor (9)
      const b0 = band(0, GREEN), b1 = band(1, RED), b2 = band(2, GREEN);
      await to(h, b0, 0.3); await h.wait(250);
      await to(h, b1, 0.3); await h.wait(250);
      await h.all([to(h, b2, 0.3), to(h, b0, 0.08)]); await h.wait(350);
      await fly(h, 2, 5, 72, -20);
      h.all([to(h, b0, 0, 350), to(h, b1, 0, 350), to(h, b2, 0, 350)]).catch(quiet);
      await h.wait(400);
      // Random selection: sorteia entre os melhores (12 ou 9)
      const c0 = band(0, GREEN), c1 = band(1, RED), c2 = band(2, GREEN);
      await h.all([to(h, c0, 0.3), to(h, c1, 0.3), to(h, c2, 0.3)]);
      await to(h, c1, 0.06, 300);
      for (let k = 0; k < 5; k++) {
        await h.all([to(h, c0, k % 2 ? 0.12 : 0.45, 150), to(h, c2, k % 2 ? 0.45 : 0.12, 150)]);
      }
      await h.all([to(h, c0, 0.3, 150), to(h, c2, 0.3, 150)]);
      await h.all([fly(h, 0, 6, 72, 28), fly(h, 2, 7, 72, 16)]);
      await tIn(h, 65, 300);
      h.all([to(h, c0, 0, 400), to(h, c1, 0, 400), to(h, c2, 0, 400)]).catch(quiet);
      await h.wait(400);
    }

    async function play(a, b, h) {
      const order = ['vazio', 'type1', 'type2', 'type3', 'type4'], ia = order.indexOf(a), ib = order.indexOf(b);
      const steps = [type1In, type2In, type3In, type4In];
      for (let i = Math.max(0, ia); i < ib; i++) await steps[i](h);
    }
    return { snap: snap, play: play };
  });
})();
