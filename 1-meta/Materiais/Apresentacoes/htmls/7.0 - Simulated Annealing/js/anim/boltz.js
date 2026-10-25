/* Distribuição de Boltzmann (aula 7, slides 57–61; img/LatexPlot/plot1, 3, 4, 5, 6).
 *
 * Camadas do PDF em js/anim/dados/boltz.js (ferramentas/figura_camadas.py) — o estado final é a figura.
 * Curvas do plot.tex: P = e^(−kΔE), k = 0.03 (T0), 0.06 (T1), 0.18 (T2); tracejadas em ΔE = 25, 50, 100.
 *
 *   vazio → plot1  eixos se montam, a curva se desenha; um ponto percorre a curva mostrando ΔE e P
 *   plot1 → plot3  a tracejada em ΔE = 50 sobe; o ponto marca a curva e uma guia leva ao eixo: P ≈ 0,22
 *   plot3 → plot4  a tracejada desliza de 50 até 100 e P cai junto (0,05)
 *   plot4 → plot5  a temperatura cai: T1 e T2 "descascam" da curva T0, cada vez mais íngremes
 *   plot5 → plot6  as tracejadas sobem; em cada uma, os pontos das três curvas mostram P (maior T, maior P)
 *
 * Interação: com o mouse sobre o gráfico, uma linha segue o cursor e mostra P de cada curva visível.
 */
(function () {
  'use strict';
  const A = window.Anim, S = A.svg, E = A.ease, lerp = A.lerp;
  if (!A) return;
  const MAIN = 'KaTeX_Main, serif', MATH = 'KaTeX_Math, serif';
  const X = function (de) { return 45.22 + 0.98122 * de; };
  const Y = function (p) { return 163.59 - 146.73 * p; };
  const XI = function (x) { return (x - 45.22) / 0.98122; };
  const BOX = [45.22, 2.19, 239.5, 163.59];
  const CURV = [{ k: 0.03, c: '#ff0000', id: 3, lab: '0' }, { k: 0.06, c: '#bf0040', id: 4, lab: '1' }, { k: 0.18, c: '#800080', id: 5, lab: '2' }];
  const DASH = { 25: 6, 100: 7, 50: 8 };
  const AXES = [0, 1, 2], TICKS = range(15, 32), AXLAB = range(33, 41).concat([9]);
  const LEG1 = [11, 12, 42, 43], LEG3 = [10, 12, 13, 14, 42, 43, 44, 45, 46, 47];
  function range(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; }
  const fmt = function (v, d) { return v.toFixed(d == null ? 2 : d).replace('.', ','); };
  function curveD(k, x1) {
    let d = '';
    const n = 72, top = x1 == null ? 180 : x1;
    for (let i = 0; i <= n; i++) { const de = top * i / n; d += (i ? 'L' : 'M') + X(de).toFixed(2) + ' ' + Y(Math.exp(-k * de)).toFixed(2); }
    return d;
  }

  A.define('boltz', function (host) {
    const D = A.figData && A.figData.boltz;
    if (!D) { console.warn('boltz: sem dados'); return { snap: function () {} }; }
    const SC = 0.8, W = D.W, H = D.H;
    const root = S('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Distribuição de Boltzmann' });
    root.style.width = (W * SC) + 'pt'; root.style.height = (H * SC) + 'pt';
    host.appendChild(root);
    host.setAttribute('data-interactive', '');
    const cid = 'bzc' + Math.random().toString(36).slice(2);
    const clip = S('clipPath', { id: cid }, root);
    S('rect', { x: BOX[0], y: BOX[1], width: BOX[2] - BOX[0], height: BOX[3] - BOX[1] }, clip);
    const gI = S('g', {}, root), items = D.items, els = A.figBuild(gI, items);
    Object.keys(DASH).forEach(function (k) { els[DASH[k]].setAttribute('clip-path', 'url(#' + cid + ')'); });
    const gFx = S('g', {}, root), gHover = S('g', { 'pointer-events': 'none' }, root);
    let state = null;

    const show = function (i, on) { els[i].style.display = on ? '' : 'none'; };
    function reset(i) {
      const e = els[i], it = items[i];
      e.style.opacity = ''; e.style.strokeDasharray = ''; e.style.strokeDashoffset = '';
      if (it.r) e.setAttribute('transform', 'rotate(' + it.r + ' ' + it.x + ' ' + it.y + ')');   // texto girado do PDF
      else e.removeAttribute('transform');
    }
    function snap(st) {
      state = st; gFx.textContent = '';
      const on = {}; (D.states[st] || []).forEach(function (i) { on[i] = true; });
      items.forEach(function (_, i) { reset(i); show(i, !!on[i]); });
      els[10].removeAttribute('transform');
    }
    const has = function (st, i) { return (D.states[st] || []).indexOf(i) >= 0; };

    // ---------- utilidades ----------
    function fade(h, ids, a, b, dur) {
      ids.forEach(function (i) { show(i, true); els[i].style.opacity = a; });
      return h.tween(dur, function (e) { ids.forEach(function (i) { els[i].style.opacity = lerp(a, b, e); }); })
        .then(function () { ids.forEach(function (i) { if (b === 0) show(i, false); reset(i); }); });
    }
    function fadeEl(h, list, a, b, dur) {
      list.forEach(function (x) { x.style.opacity = a; });
      return h.tween(dur, function (e) { list.forEach(function (x) { x.style.opacity = lerp(a, b, e); }); });
    }
    function trace(h, i, dur, len) {
      const el = els[i]; show(i, true); reset(i);
      const L = len || el.getTotalLength();
      el.style.strokeDasharray = L + ' ' + (L + 1); el.style.strokeDashoffset = L;
      return h.tween(dur, function (e) { el.style.strokeDashoffset = L * (1 - e); }).then(function () { reset(i); });
    }
    function riseDash(h, i, dur) {   // tracejada sobe do eixo até o topo do gráfico (mantém o tracejado)
      const el = els[i]; show(i, true); reset(i);
      const x = items[i].b[0];
      return h.tween(dur, function (e) {
        el.setAttribute('d', 'M' + x + ' 163.59L' + x + ' ' + lerp(163.59, BOX[1], e).toFixed(2));
      }, E.out).then(function () { el.setAttribute('d', items[i].d); });
    }
    function text(x, y, parts, color, size, anchor) {
      const t = S('text', { x: x, y: y, 'font-size': size || 7, fill: color || '#000' }, gFx);
      if (anchor) t.setAttribute('text-anchor', anchor);
      parts.forEach(function (p) {
        const s = S('tspan', { 'font-family': p[1] ? MATH : MAIN }, t);
        if (p[1]) s.setAttribute('font-style', 'italic');
        if (p[2]) { s.setAttribute('font-size', (size || 7) * 0.7); s.setAttribute('dy', p[2]); }
        s.textContent = p[0];
      });
      return t;
    }
    // marcador: ponto na curva + guia horizontal até o eixo + rótulo de P
    function marker(color) {
      const g = S('g', {}, gFx);
      const guide = S('line', { stroke: color, 'stroke-width': 0.5, 'stroke-dasharray': '1.5 1.2', opacity: 0.8 }, g);
      const dot = S('circle', { r: 2, fill: color, stroke: '#fff', 'stroke-width': 0.6 }, g);
      const lab = S('text', { 'font-size': 7.5, 'font-family': MAIN, fill: color, 'font-weight': 'bold' }, g);
      g.set = function (de, k, opts) {
        opts = opts || {};
        const p = Math.exp(-k * de), x = X(de), y = Y(p);
        dot.setAttribute('cx', x); dot.setAttribute('cy', y);
        guide.style.display = opts.guide === false ? 'none' : '';
        guide.setAttribute('x1', BOX[0]); guide.setAttribute('x2', x); guide.setAttribute('y1', y); guide.setAttribute('y2', y);
        lab.textContent = (opts.prefix != null ? opts.prefix : 'P ≈ ') + (p < 0.00005 ? '≈ 0' : fmt(p, opts.dig != null ? opts.dig : (p < 0.01 ? 4 : 2)));
        lab.setAttribute('x', opts.lx != null ? opts.lx : x + 3.5); lab.setAttribute('y', (opts.ly != null ? opts.ly : y - 3));
      };
      return g;
    }

    // ---------- passos ----------
    async function entry(h) {
      await trace(h, 2, 900);
      await h.all([fade(h, [0, 1], 0, 1, 350), fade(h, TICKS, 0, 1, 450)]);
      await fade(h, AXLAB, 0, 1, 400);
      await trace(h, 3, 1200);
      await fade(h, LEG1, 0, 1, 350);
      // um ponto percorre a curva: ΔE cresce, P cai
      const m = marker('#ff0000'), info = text(150, 60, [], '#333', 7.5);
      await h.tween(2200, function (e) {
        const de = 180 * e, p = Math.exp(-0.03 * de);
        m.set(de, 0.03, { guide: true, prefix: '' }); m.lastChild.textContent = '';
        info.textContent = '';
        [['Δ', 0], ['E', 1], [' = ' + fmt(de, 0), 0]].forEach(function (q) { const s = S('tspan', { 'font-family': q[1] ? MATH : MAIN }, info); if (q[1]) s.setAttribute('font-style', 'italic'); s.textContent = q[0]; });
        const s2 = S('tspan', { x: 150, dy: 9.5, 'font-family': MATH, 'font-style': 'italic' }, info); s2.textContent = 'P';
        const s3 = S('tspan', { 'font-family': MAIN }, info); s3.textContent = ' = ' + fmt(p, p < 0.01 ? 4 : 2);
      }, E.inOut);
      await h.wait(500);
      await fadeEl(h, [m, info], 1, 0, 400); m.remove(); info.remove();
    }
    async function dashAt(h, de, k) {    // tracejada em ΔE = de sobe e marca P na curva
      await riseDash(h, DASH[de], 700);
      const m = marker('#c00000'); m.style.opacity = 0;
      m.set(de, k);
      await h.tween(450, function (e) { m.style.opacity = e; }, E.out);
      return m;
    }

    async function play(a, b, h) {
      gHover.textContent = '';
      if (!D.states[a]) {
        items.forEach(function (_, i) { show(i, false); });
        await entry(h);
      } else if (a === 'plot1' && b === 'plot3') {
        const m = await dashAt(h, 50, 0.03);
        await h.wait(1600); await fadeEl(h, [m], 1, 0, 400); m.remove();
      } else if (a === 'plot3' && b === 'plot4') {
        const m = marker('#c00000'); m.set(50, 0.03);
        const el = els[8];
        await h.tween(1500, function (e) {
          const de = lerp(50, 100, e);
          el.setAttribute('transform', 'translate(' + (X(de) - X(50)).toFixed(3) + ' 0)');
          m.set(de, 0.03);
        }, E.inOut);
        reset(8); show(8, false); show(7, true);
        await h.wait(1600); await fadeEl(h, [m], 1, 0, 400); m.remove();
      } else if (a === 'plot4' && b === 'plot5') {
        await fade(h, [7], 1, 0, 350);
        // legenda cresce para três entradas
        show(11, false); show(10, true);
        const h0 = 18.66 - 2.39, h1 = 43.24 - 2.39;
        await h.tween(350, function (e) { els[10].setAttribute('transform', 'translate(0 2.39) scale(1 ' + (lerp(h0, h1, e) / h1).toFixed(4) + ') translate(0 -2.39)'); });
        els[10].removeAttribute('transform');
        // T1 e T2 descascam da curva T0
        for (let c = 1; c <= 2; c++) {
          const k0 = CURV[c - 1].k, k1 = CURV[c].k, col0 = CURV[c - 1].c, col1 = CURV[c].c;
          const p = S('path', { fill: 'none', 'stroke-width': 0.797, d: curveD(k0) }, gFx);
          const tl = text(150, 75 + c * 12, [], col1, 8);
          [['T', 1, 0], [String(c), 0, 1.5], [' < ', 0, -1.5], ['T', 1, 0], [String(c - 1), 0, 1.5]].forEach(function (q) {
            const s = S('tspan', { 'font-family': q[1] ? MATH : MAIN }, tl);
            if (q[1]) s.setAttribute('font-style', 'italic');
            if (q[2] > 0) s.setAttribute('font-size', 5.6);
            if (q[2]) s.setAttribute('dy', q[2]);
            s.textContent = q[0];
          });
          tl.style.opacity = 0;
          await h.tween(1300, function (e) {
            const k = k0 * Math.pow(k1 / k0, e);
            p.setAttribute('d', curveD(k)); p.setAttribute('stroke', A.mix(col0, col1, e));
            tl.style.opacity = Math.min(1, e * 2);
          }, E.inOut);
          p.remove();
          show(CURV[c].id, true);
          await fade(h, c === 1 ? [13, 44, 45] : [14, 46, 47], 0, 1, 300);
          await fadeEl(h, [tl], 1, 0, 300); tl.remove();
        }
      } else if (a === 'plot5' && b === 'plot6') {
        const ms = [];
        for (const de of [25, 50, 100]) {
          await riseDash(h, DASH[de], 600);
          // rótulos empilhados de baixo para cima, sem sobrepor
          const ly = [0, 1, 2].map(function (c) { return Y(Math.exp(-CURV[c].k * de)) - 3; });
          for (let c = 1; c >= 0; c--) ly[c] = Math.min(ly[c], ly[c + 1] - 7.5);
          for (let c = 0; c < 3; c++) {
            const m = marker(CURV[c].c); m.style.opacity = 0;
            m.set(de, CURV[c].k, { guide: false, prefix: '', lx: X(de) + 2.5, ly: ly[c] });
            ms.push(m);
            await h.tween(220, function (e) { m.style.opacity = e; });
          }
          await h.wait(500);
          if (de !== 100) await fadeEl(h, ms.splice(0), 1, 0.0, 300);
        }
        await h.wait(1500); await fadeEl(h, ms, 1, 0, 400);
      }
      // garante o estado final
      const on = D.states[b] || [];
      items.forEach(function (_, i) { if (on.indexOf(i) >= 0 && els[i].style.display === 'none') show(i, true); });
    }

    // ---------- interação: P de cada curva no ΔE do cursor ----------
    function curvesOn() { return CURV.filter(function (c) { return has(state, c.id); }); }
    root.addEventListener('pointermove', function (ev) {
      const m = root.getScreenCTM(); if (!m) return;
      const pt = root.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
      const q = pt.matrixTransform(m.inverse());
      const de = XI(q.x);
      gHover.textContent = '';
      if (de < 0 || de > 180 || q.y < BOX[1] || q.y > BOX[3]) return;
      S('line', { x1: X(de), x2: X(de), y1: BOX[1], y2: BOX[3], stroke: '#555', 'stroke-width': 0.4, 'stroke-dasharray': '1.2 1' }, gHover);
      const lab = S('text', { x: X(de), y: BOX[3] - 2, 'font-size': 6, 'text-anchor': 'middle', fill: '#333', 'font-family': MAIN }, gHover);
      lab.textContent = 'ΔE = ' + fmt(de, 0);
      curvesOn().forEach(function (c, i) {
        const p = Math.exp(-c.k * de);
        S('circle', { cx: X(de), cy: Y(p), r: 1.6, fill: c.c, stroke: '#fff', 'stroke-width': 0.5 }, gHover);
        const t = S('text', { x: X(de) + (de > 120 ? -3 : 3), y: Y(p) - 2.5 - i * 0.5, 'font-size': 6.5, 'font-weight': 'bold', fill: c.c, 'font-family': MAIN }, gHover);
        if (de > 120) t.setAttribute('text-anchor', 'end');
        t.textContent = fmt(p, p < 0.01 ? 4 : 2);
      });
    });
    root.addEventListener('pointerleave', function () { gHover.textContent = ''; });

    return { snap: snap, play: play };
  });
})();
