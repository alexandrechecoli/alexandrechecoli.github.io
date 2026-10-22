/* Formas de landscape com busca local (img/search_space2, slide 120).
 *
 * A figura vem de js/anim/dados/landscape.js (ferramentas/figura_camadas.py). Em cada um dos 4 painéis,
 * uma bolinha faz busca local (melhor vizinho dentro de um raio fixo ao longo da curva, minimizando:
 * quanto mais baixo na figura, melhor) até não haver vizinho melhor — um ótimo local.
 *   Chato/plano: quase não sai do lugar · Vale: desce até o fundo · Plano rugoso: para logo ·
 *   Vale rugoso: fica preso longe do fundo.
 * Estados: e0 (figura original) e run (com as bolinhas nos ótimos locais e o rastro).
 * Interação: clicar em qualquer ponto de um painel solta uma bolinha ali e roda a busca local.
 */
(function () {
  'use strict';
  const A = window.Anim;
  const MYBLUE = '#0061a5', BRICK = '#d0281a';
  // painéis: [retângulo, traços da curva, início da busca (fração do comprimento)]
  const PANELS = [[0, [4], 0.16], [1, [5], 0.03], [2, [6, 7], 0.46], [3, [8], 0.03]];
  // amostragem e raio da vizinhança (comprimento ao longo da curva); com 10, o Vale chega ao fundo e
  // os rugosos ficam presos (com raios menores, até o pequeno ombro do Vale vira ótimo local)
  const STEP = 0.5, RADIUS = 10;

  A.define('landscape', function (host) {
    const D = A.figData.landscape, SC = +(host.dataset.scale || 1.1);
    const root = A.svg('svg', { viewBox: '0 0 ' + D.W + ' ' + D.H, role: 'img',
      'aria-label': 'Formas de landscape e onde a busca local para em cada uma' });
    root.style.width = (D.W * SC) + 'pt'; root.style.height = (D.H * SC) + 'pt';
    host.appendChild(root);
    const els = A.figBuild(root, D.items);
    const gT = A.svg('g', {}, root), gB = A.svg('g', {}, root);   // rastros, bolinhas
    let curves = null, state = 'e0';

    // amostras de cada curva, na ordem do traço (os pedaços de uma curva são concatenados por x)
    function sample() {
      if (curves) return curves;
      if (!els[PANELS[0][1][0]].getTotalLength()) return null;   // frame oculto: ainda não dá para medir
      curves = PANELS.map(function (P) {
        const parts = P[1].map(function (i) {
          const p = els[i], L = p.getTotalLength(), pts = [];
          for (let s = 0; s <= L; s += STEP) { const q = p.getPointAtLength(s); pts.push([q.x, q.y]); }
          if (pts[0][0] > pts[pts.length - 1][0]) pts.reverse();
          return pts;
        }).sort(function (a, b) { return a[0][0] - b[0][0]; });
        return [].concat.apply([], parts);
      });
      return curves;
    }
    // busca local: índice inicial -> lista de índices visitados (até um ótimo local)
    function search(pts, k) {
      const R = Math.round(RADIUS / STEP), path = [k];
      for (let it = 0; it < 400; it++) {
        let best = k;
        for (let j = Math.max(0, k - R); j <= Math.min(pts.length - 1, k + R); j++) if (pts[j][1] > pts[best][1] + 1e-6) best = j;
        if (best === k) break;
        k = best; path.push(k);
      }
      return path;
    }
    function ball(x, y) {
      const g = A.svg('g', { transform: 'translate(' + x + ' ' + y + ')' }, gB);
      g._c = A.svg('circle', { r: 1.9, fill: MYBLUE, stroke: '#fff', 'stroke-width': 0.5 }, g);
      return g;
    }
    function trail(pts, idx) {
      return A.svg('polyline', { points: idx.map(function (k) { return pts[k][0].toFixed(2) + ',' + pts[k][1].toFixed(2); }).join(' '),
        fill: 'none', stroke: MYBLUE, 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.3 }, gT);
    }
    function clear() { while (gT.firstChild) gT.removeChild(gT.firstChild); while (gB.firstChild) gB.removeChild(gB.firstChild); }
    // ponto da curva exatamente sob a bolinha, entre duas amostras visitadas (caminha pelas amostras)
    function along(pts, a, b, t) {
      const k = a + (b - a) * t, i = Math.floor(k), f = k - i, p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)];
      return [A.lerp(p[0], q[0], f), A.lerp(p[1], q[1], f)];
    }

    function snap(st) {
      state = st; clear();
      if (st !== 'run' || !sample()) return;
      sample().forEach(function (pts, n) {
        const idx = search(pts, Math.round(PANELS[n][2] * (pts.length - 1))), end = pts[idx[idx.length - 1]];
        if (idx.length > 1) trail(pts, idx);
        const b = ball(end[0], end[1]); b._c.setAttribute('fill', BRICK);
      });
    }

    // anima uma busca (com h do motor, ou com requestAnimationFrame na interação)
    function runOne(pts, k0, tween, wait) {
      const idx = search(pts, k0), p0 = pts[k0], b = ball(p0[0], p0[1]);
      const tr = trail(pts, [k0]);
      let done = [k0];
      return tween(300, function (e) { b.setAttribute('transform', 'translate(' + p0[0] + ' ' + (p0[1] - 6 * (1 - e)) + ') scale(' + Math.max(0.01, e) + ')'); })
        .then(async function () {
          for (let s = 1; s < idx.length; s++) {
            const a = idx[s - 1], c = idx[s];
            await tween(60 + 9 * Math.abs(c - a), function (e) {
              const q = along(pts, a, c, e);
              b.setAttribute('transform', 'translate(' + q[0] + ' ' + q[1] + ')');
            });
            done.push(c); tr.setAttribute('points', done.map(function (k) { return pts[k][0].toFixed(2) + ',' + pts[k][1].toFixed(2); }).join(' '));
          }
          // ótimo local: a bolinha pulsa e fica vermelha
          const e1 = pts[idx[idx.length - 1]];
          await tween(500, function (e, t) {
            b.setAttribute('transform', 'translate(' + e1[0] + ' ' + e1[1] + ') scale(' + (1 + 0.6 * Math.sin(Math.PI * t)) + ')');
            b._c.setAttribute('fill', A.mix(MYBLUE, BRICK, Math.min(1, t * 2)));
          });
          if (idx.length < 2) tr.remove();
          await wait(0);
        });
    }

    async function play(from, to, h) {
      snap('e0');
      if (to !== 'run') return;
      const cs = sample();
      if (!cs) return;
      await h.wait(300);
      await h.all(cs.map(function (pts, n) {
        return h.wait(n * 450).then(function () {
          return runOne(pts, Math.round(PANELS[n][2] * (pts.length - 1)), h.tween, h.wait);
        });
      }));
      state = 'run';
    }

    // ----- interação: soltar uma bolinha num painel -----
    const raf = {
      tween: function (ms, fn) {
        return new Promise(function (res) {
          const t0 = performance.now();
          (function fr(now) { const t = Math.min(1, (now - t0) / ms); fn(A.ease.inOut(t), t); if (t < 1) requestAnimationFrame(fr); else res(); })(t0);
        });
      },
      wait: function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    };
    // curvas, rótulos e bolinhas deixam o clique passar para o painel
    els.forEach(function (e, i) { if (D.items[i].t === 'x' || !D.items[i].f) e.style.pointerEvents = 'none'; });
    gT.style.pointerEvents = gB.style.pointerEvents = 'none';
    PANELS.forEach(function (P, n) {
      const r = els[P[0]];
      r.setAttribute('data-interactive', ''); r.style.cursor = 'crosshair';
      r.addEventListener('click', function (ev) {
        ev.stopPropagation();
        const cs = sample(), m = root.getScreenCTM();
        if (!cs || !m) return;
        const pts = cs[n];
        const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
        let k = 0;
        pts.forEach(function (q, j) { if (Math.abs(q[0] - p.x) < Math.abs(pts[k][0] - p.x)) k = j; });
        runOne(pts, k, raf.tween, raf.wait);
      });
    });

    return { snap: snap, play: play };
  });
})();
