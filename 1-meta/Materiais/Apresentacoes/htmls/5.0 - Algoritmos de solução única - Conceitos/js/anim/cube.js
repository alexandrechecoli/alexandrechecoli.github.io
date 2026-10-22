/* Cubo das soluções binárias de 3 bits com o operador flip (slides "Exemplo mochila").
 *
 * Geometria copiada das figuras originais (img/cubo*.pdf, feitas no Ipe), em pt:
 *   vértice (b1,b2,b3) em x = 20.2 + 48·b2 + 28·b3,  y = 84.2 − 48·b1 − 24·b3
 * Estados (data-state / data-from):
 *   s0   vazio (só para a entrada)
 *   s1   só (0,0,0)                         s2   + vizinhos de (0,0,0)
 *   s3   + vizinhos de (0,0,1)              s4   cubo completo
 *   s41  + "Você" e a carta em (1,1,1)      s42  + caminho (0,0,0)→(0,1,0)→(0,1,1)→(1,1,1)
 *   s5   ε = 2: arestas extras a partir de (0,0,0)
 *   s5p  s5 + caminho com 2 movimentos (0,0,0)→(0,1,1)→(1,1,1)
 * Interação: clicar num vértice mostra sua vizinhança (ε = 1, ou ε = 2 nos estados s5*).
 */
(function () {
  'use strict';
  const A = window.Anim;
  const W = 112.4, H = 96.4, SCALE = 1.4;
  const BLACK = '#000000', NAVY = '#00008b', DARKRED = '#8b0000', BRICK = '#d0281a', MYBLUE = '#0061a5';

  const pos = function (v) { return [20.2 + 48 * +v[1] + 28 * +v[2], 84.2 - 48 * +v[0] - 24 * +v[2]]; };
  // posição (linha de base, à esquerda) de cada rótulo, igual à figura original
  const LABEL = { '000': [8.4, 92.9], '100': [2.7, 37.2], '101': [40.8, 7.2], '111': [91.0, 6.5],
    '001': [30.3, 59.6], '010': [63.8, 91.6], '011': [95.8, 67.9], '110': [53.9, 30.5] };
  const DOTTED = { '001-011': 1, '001-101': 1 };
  const ALLV = ['000', '100', '010', '001', '110', '101', '011', '111'];
  const hamming = function (a, b) { let d = 0; for (let i = 0; i < 3; i++) if (a[i] !== b[i]) d++; return d; };
  const key = function (a, b) { return a < b ? a + '-' + b : b + '-' + a; };

  // ordem das arestas = ordem em que aparecem na animação
  const E2 = ['000-100', '000-010', '000-001'];
  const E3 = E2.concat(['001-101', '001-011', '100-101']);
  const E4 = E3.concat(['100-110', '010-110', '010-011', '101-111', '011-111', '110-111']);
  const STATES = {
    s0: { V: [], E: [] },
    s1: { V: ['000'], E: [] },
    s2: { V: ['000', '100', '010', '001'], E: E2 },
    s3: { V: ['000', '100', '010', '001', '101', '011'], E: E3 },
    s4: { V: ALLV, E: E4 },
    s41: { V: ALLV, E: E4, you: true, letter: true },
    s42: { V: ALLV, E: E4, you: true, letter: true, path: ['000', '010', '011', '111'] },
    s5: { V: ALLV, E: E4, red: ['000-011', '000-101', '000-110'], eps: 2 },
    s5p: { V: ALLV, E: E4, red: ['000-011', '000-101', '000-110'], eps: 2, path: ['000', '011', '111'] }
  };

  A.define('cube', function (host) {
    const root = A.svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'cube-svg', role: 'img',
      'aria-label': 'Cubo das soluções binárias com o operador flip' });
    root.style.width = (W * SCALE) + 'pt'; root.style.height = (H * SCALE) + 'pt';
    host.appendChild(root);
    const gHi = A.svg('g', {}, root);       // destaques da interação (atrás de tudo)
    const gE = A.svg('g', {}, root);        // arestas
    const gR = A.svg('g', {}, root);        // arestas ε = 2 (vermelhas)
    const gP = A.svg('g', {}, root);        // caminho (azul)
    const gV = A.svg('g', {}, root);        // vértices
    const gL = A.svg('g', { 'font-family': 'KaTeX_Main, serif', 'font-size': '4.98' }, root);
    const gX = A.svg('g', {}, root);        // carta, "Você", ficha que percorre o caminho

    // ----- elementos (criados uma vez, mostrados/ocultados por estado) -----
    const edges = {}, reds = {}, paths = {}, verts = {}, labels = {};
    E4.forEach(function (k) {
      const ab = k.split('-'), p = pos(ab[0]), q = pos(ab[1]);
      edges[k] = A.svg('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: BLACK, 'stroke-width': 0.8,
        'stroke-dasharray': DOTTED[k] ? '1 3' : 'none' }, gE);
    });
    ['000-011', '000-101', '000-110'].forEach(function (k) {
      const ab = k.split('-'), p = pos(ab[0]), q = pos(ab[1]);
      reds[k] = A.svg('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: DARKRED, 'stroke-width': 0.4 }, gR);
    });
    ALLV.forEach(function (v) {
      const p = pos(v);
      const g = A.svg('g', { transform: 'translate(' + p[0] + ' ' + p[1] + ')', class: 'cube-v', 'data-interactive': '' }, gV);
      A.svg('circle', { r: 4.5, fill: 'transparent' }, g); // área de clique maior
      g._ring = A.svg('circle', { r: 2.4, fill: '#fff', stroke: BLACK, 'stroke-width': 1.2 }, g);
      g.addEventListener('click', function (e) { e.stopPropagation(); toggleFocus(v); });
      verts[v] = g;
      const L = LABEL[v];
      const t = A.svg('text', { x: L[0], y: L[1] }, gL);
      const parts = ['(', v[0], ',', v[1], ',', v[2], ')'];
      t._d = [];
      parts.forEach(function (s, i) {
        const ts = A.svg('tspan', {}, t); ts.textContent = s;
        if (i === 1 || i === 3 || i === 5) t._d.push(ts);
      });
      labels[v] = t;
    });
    const you = A.svg('text', { x: 23.2, y: 93.6, fill: NAVY, 'font-family': 'KaTeX_Main, serif', 'font-size': '4.73' }, gX);
    you.textContent = 'Você';
    const letter = A.svg('g', {}, gX);       // envelope (como na figura: laranja com papel branco)
    A.svg('path', { d: 'M82.5 1.6 L90.3 1.6 L90.3 5.5 L82.5 5.5 Z', fill: '#ffa500' }, letter);
    A.svg('path', { d: 'M83.8 1.9 L89.3 1.9 L89.3 5.5 L83.8 5.5 Z', fill: '#fff', stroke: BLACK, 'stroke-width': 0.4 }, letter);
    [2.4, 2.9, 3.5, 4.1, 4.7].forEach(function (y) {
      A.svg('line', { x1: 84.5, y1: y, x2: 88.5, y2: y, stroke: BLACK, 'stroke-width': 0.3 }, letter);
    });
    A.svg('path', { d: 'M82.5 3.6 L86.4 5.6 L90.3 3.6 L90.3 7.5 L82.5 7.5 Z', fill: '#ffa500', stroke: BLACK, 'stroke-width': 0.4 }, letter);
    A.svg('path', { d: 'M82.5 7.5 L86.4 5.5 L90.3 7.5', fill: 'none', stroke: BLACK, 'stroke-width': 0.4 }, letter);
    const token = A.svg('circle', { r: 1.7, fill: MYBLUE, opacity: 0 }, gX);

    let state = null, focus = null;

    function show(el, on) { el.style.display = on ? '' : 'none'; }
    function setLine(el, k, t) {
      const ab = k.split('-'), p = pos(ab[0]), q = pos(ab[1]);
      el.setAttribute('x1', p[0]); el.setAttribute('y1', p[1]);
      el.setAttribute('x2', A.lerp(p[0], q[0], t)); el.setAttribute('y2', A.lerp(p[1], q[1], t));
    }
    function pathKeys(path) {
      const ks = [];
      for (let i = 1; i < path.length; i++) ks.push([path[i - 1], path[i]]);
      return ks;
    }
    function drawPath(path, upto) { // upto = número de segmentos completos (pode ser fracionário)
      while (gP.firstChild) gP.removeChild(gP.firstChild);
      if (!path) return;
      pathKeys(path).forEach(function (ab, i) {
        const t = Math.max(0, Math.min(1, upto - i));
        if (t <= 0) return;
        const p = pos(ab[0]), q = pos(ab[1]);
        A.svg('line', { x1: p[0], y1: p[1], x2: A.lerp(p[0], q[0], t), y2: A.lerp(p[1], q[1], t),
          stroke: NAVY, 'stroke-width': 1.2 }, gP);
      });
    }
    function resetDigits() {
      ALLV.forEach(function (v) { labels[v]._d.forEach(function (d) { d.removeAttribute('fill'); d.removeAttribute('font-weight'); }); });
    }

    // ----- estado final, sem animação -----
    function snap(name) {
      const S = STATES[name]; state = name;
      clearFocus();
      E4.forEach(function (k) {
        const on = S.E.indexOf(k) >= 0; show(edges[k], on); setLine(edges[k], k, 1);
        edges[k].style.opacity = '';
      });
      Object.keys(reds).forEach(function (k) {
        const on = !!(S.red && S.red.indexOf(k) >= 0); show(reds[k], on); setLine(reds[k], k, 1);
      });
      ALLV.forEach(function (v) {
        const on = S.V.indexOf(v) >= 0;
        show(verts[v], on); show(labels[v], on);
        const p = pos(v); verts[v].setAttribute('transform', 'translate(' + p[0] + ' ' + p[1] + ')');
        labels[v].style.opacity = '';
      });
      resetDigits();
      show(you, !!S.you); you.style.opacity = '';
      show(letter, !!S.letter); letter.removeAttribute('transform'); letter.style.opacity = '';
      drawPath(S.path, 99); gP.style.opacity = '';
      token.setAttribute('opacity', 0);
    }

    // ----- animações -----
    function popVertex(h, v) {
      const p = pos(v);
      show(verts[v], true); show(labels[v], true);
      labels[v].style.opacity = 0;
      return h.tween(380, function (e, t) {
        verts[v].setAttribute('transform', 'translate(' + p[0] + ' ' + p[1] + ') scale(' + Math.max(0.001, e) + ')');
        labels[v].style.opacity = Math.min(1, t * 1.6);
      }, A.ease.back);
    }
    function flashDigits(h, v, from, color) {
      // destaca os bits que mudaram de "from" para "v" e volta ao preto
      const ds = [];
      for (let i = 0; i < 3; i++) if (from && from[i] !== v[i]) ds.push(labels[v]._d[i]);
      ds.forEach(function (d) { d.setAttribute('fill', color); d.setAttribute('font-weight', 'bold'); });
      return h.wait(1100).then(function () {
        ds.forEach(function (d) { d.removeAttribute('font-weight'); });
        return h.tween(600, function (e) { ds.forEach(function (d) { d.setAttribute('fill', A.mix(color, BLACK, e)); }); });
      }).then(function () { ds.forEach(function (d) { d.removeAttribute('fill'); }); });
    }
    function growEdge(h, el, k, fromV, dur) {
      const ab = k.split('-');
      const a = fromV || ab[0], b = ab[0] === a ? ab[1] : ab[0];
      const p = pos(a), q = pos(b);
      el.setAttribute('x1', p[0]); el.setAttribute('y1', p[1]);
      el.setAttribute('x2', p[0]); el.setAttribute('y2', p[1]);
      show(el, true);
      return h.tween(dur || 420, function (e) {
        el.setAttribute('x2', A.lerp(p[0], q[0], e)); el.setAttribute('y2', A.lerp(p[1], q[1], e));
      });
    }
    async function moveToken(h, path, keepLine) {
      token.setAttribute('opacity', 1);
      const ks = pathKeys(path);
      for (let i = 0; i < ks.length; i++) {
        const p = pos(ks[i][0]), q = pos(ks[i][1]);
        await h.tween(520, function (e) {
          token.setAttribute('cx', A.lerp(p[0], q[0], e)); token.setAttribute('cy', A.lerp(p[1], q[1], e));
          if (keepLine) drawPath(path, i + e);
        });
        flashDigits(h, ks[i][1], ks[i][0], MYBLUE).catch(function () {});
        await h.wait(160);
      }
      await h.tween(250, function (e) { token.setAttribute('opacity', 1 - e); });
    }

    async function play(from, to, h) {
      const A0 = STATES[from], B = STATES[to];
      // 1) o que sai: caminho, "Você", carta (some em fade)
      const outs = [];
      if (A0.path && !B.path) outs.push(h.tween(400, function (e) { gP.style.opacity = 1 - e; }));
      if (A0.you && !B.you) outs.push(h.tween(400, function (e) { you.style.opacity = 1 - e; }));
      if (A0.letter && !B.letter) outs.push(h.tween(400, function (e) { letter.style.opacity = 1 - e; }));
      if (outs.length) { await h.all(outs); drawPath(null); gP.style.opacity = ''; show(you, !!B.you); show(letter, !!B.letter); }

      // 2) novas arestas e vértices, na ordem da definição; o vértice novo "brota" no fim da aresta
      const have = {}; A0.V.forEach(function (v) { have[v] = true; });
      for (const k of B.E) {
        if (A0.E.indexOf(k) >= 0) continue;
        const ab = k.split('-');
        const origin = have[ab[0]] ? ab[0] : ab[1], target = origin === ab[0] ? ab[1] : ab[0];
        await growEdge(h, edges[k], k, origin);
        if (!have[target]) {
          have[target] = true;
          await popVertex(h, target);
          flashDigits(h, target, origin, BRICK).catch(function () {});
          await h.wait(120);
        }
      }
      for (const v of B.V) if (!have[v]) { have[v] = true; await popVertex(h, v); }
      // 3) arestas de ε = 2
      if (B.red) for (const k of B.red) {
        if (A0.red && A0.red.indexOf(k) >= 0) continue;
        const target = k.split('-')[1];
        await growEdge(h, reds[k], k, '000', 520);
        flashDigits(h, target, '000', BRICK).catch(function () {});
        await h.wait(200);
      }
      // 4) "Você" e a carta
      if (B.you && !A0.you) {
        show(you, true);
        await h.tween(450, function (e) { you.style.opacity = e; });
      }
      if (B.letter && !A0.letter) {
        show(letter, true);
        await h.tween(600, function (e, t) {
          letter.setAttribute('transform', 'translate(0 ' + (-8 * (1 - e)) + ')');
          letter.style.opacity = Math.min(1, t * 2);
        }, A.ease.back);
      }
      // 5) caminho percorrido pela ficha
      if (B.path && !A0.path) {
        await h.wait(200);
        await moveToken(h, B.path, true);
        await h.tween(260, function (e) { letter.setAttribute('transform', 'translate(0 ' + (-2 * Math.sin(Math.PI * e)) + ')'); });
      }
    }

    // ----- interação: vizinhança de um vértice -----
    function clearFocus() {
      focus = null;
      while (gHi.firstChild) gHi.removeChild(gHi.firstChild);
      ALLV.forEach(function (v) { verts[v]._ring.setAttribute('fill', '#fff'); });
      resetDigits();
    }
    function toggleFocus(v) {
      if (focus === v) { clearFocus(); return; }
      clearFocus(); focus = v;
      const S = STATES[state], eps = S.eps || 1;
      verts[v]._ring.setAttribute('fill', MYBLUE);
      const p = pos(v);
      S.V.forEach(function (u) {
        const d = hamming(u, v);
        if (u === v || d > eps) return;
        const q = pos(u);
        A.svg('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: MYBLUE, 'stroke-width': 2.6,
          'stroke-linecap': 'round', opacity: 0.35 }, gHi);
        A.svg('circle', { cx: q[0], cy: q[1], r: 4.2, fill: MYBLUE, opacity: 0.25 }, gHi);
        for (let i = 0; i < 3; i++) if (u[i] !== v[i]) labels[u]._d[i].setAttribute('fill', BRICK);
      });
    }
    root.addEventListener('click', function () { if (focus) clearFocus(); });

    return { snap: snap, play: play };
  });
})();
