/* Resfriamento geométrico T(i+1) = α·T(i) (aula 7, slide 64).
 *
 * O slide não tem figura: o frame ganha um 2º passo (data-steps="2"). Passo 1 = PDF. No passo 2 a caixa
 * de texto do topo some (o espaço continua reservado, nada se mexe) e no lugar dela surge um gráfico da
 * temperatura ao longo das iterações: escadas para α = 0,5 / 0,8 / 0,95 / 0,99, cada degrau sendo um
 * patamar de "equilíbrio" (L iterações na mesma temperatura), de T0 = 100 até Tmin = 1. A legenda diz
 * quantas temperaturas e iterações cada α leva. Um controle deslizante desenha a curva para qualquer α.
 *
 * Uso: <span class="anim" data-anim="resfria" data-state="texto,grafico"> dentro do .fc, depois da caixa.
 */
(function () {
  'use strict';
  const A = window.Anim, S = A.svg, E = A.ease, lerp = A.lerp;
  if (!A) return;
  const MAIN = 'KaTeX_Main, serif', MATH = 'KaTeX_Math, serif', MYBLUE = '#0061a5';
  const T0 = 100, TMIN = 1, L = 5, XMAX = 400;
  const SERIES = [{ a: 0.5, c: '#d0281a' }, { a: 0.8, c: '#d98200' }, { a: 0.95, c: '#169b3a' }, { a: 0.99, c: '#7b3fa0' }];
  const fmt = function (v, d) { return v.toFixed(d == null ? 2 : d).replace('.', ','); };
  const ntemp = function (a) { return Math.ceil(Math.log(TMIN / T0) / Math.log(a)); };   // temperaturas até T < Tmin

  A.define('resfria', function (host) {
    const frame = host.closest('section'), fc = host.closest('.fc'), box = fc.querySelector('.tcb');
    host.setAttribute('data-interactive', '');
    host.style.cssText = 'position:absolute;left:0;top:0;line-height:0';
    const W = 403.7;
    let H = 84, top = 4;      // reajustados pela posição real da caixa
    const root = S('svg', { role: 'img', 'aria-label': 'Resfriamento geométrico: temperatura por iteração para vários α' });
    host.appendChild(root);
    // área do gráfico
    const P = { x0: 24, x1: 262, y0: 6, y1: 0 };
    let gAxes, gSeries, gLeg, gLive, liveA = 0.9;

    function layout() {   // posiciona o gráfico sobre a caixa (mais a folga acima dela)
      const k = frame.getBoundingClientRect().width / 453.543;
      if (k > 0 && box.offsetParent) {
        const rb = box.getBoundingClientRect(), rf = fc.getBoundingClientRect();
        const bt = (rb.top - rf.top) / k, bb = (rb.bottom - rf.top) / k;
        top = Math.max(-10, bt - 12); H = bb - top;
      }
      host.style.top = top + 'pt';
      root.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      root.style.width = W + 'pt'; root.style.height = H + 'pt';
      P.y1 = H - 16;
      build();
    }
    const X = function (it) { return P.x0 + (P.x1 - P.x0) * Math.min(it, XMAX) / XMAX; };
    const Y = function (t) { return P.y1 - (P.y1 - P.y0) * t / T0; };
    function stairD(a, upto) {   // escada até a iteração "upto" (para desenhar aos poucos)
      const n = ntemp(a);
      let d = 'M' + X(0) + ' ' + Y(T0), T = T0;
      for (let j = 0; j < n; j++) {
        const xa = j * L, xb = (j + 1) * L;
        if (upto != null && xa >= upto) break;
        d += 'L' + X(Math.min(xb, upto == null ? xb : upto)).toFixed(2) + ' ' + Y(T).toFixed(2);
        if (xb > XMAX) break;
        if (upto != null && xb > upto) break;
        T *= a;
        if (j < n - 1) d += 'L' + X(xb).toFixed(2) + ' ' + Y(T).toFixed(2);
      }
      return d;
    }
    function text(parent, x, y, s, opt) {
      opt = opt || {};
      const t = S('text', { x: x, y: y, 'font-size': opt.fs || 6.5, 'font-family': opt.math ? MATH : MAIN, fill: opt.c || '#222' }, parent);
      if (opt.math) t.setAttribute('font-style', 'italic');
      if (opt.anchor) t.setAttribute('text-anchor', opt.anchor);
      if (opt.bold) t.setAttribute('font-weight', 'bold');
      t.textContent = s; return t;
    }
    function legendRow(parent, i, a, c, live) {
      const y = P.y0 + 5 + i * 10.5, x = 270, g = S('g', {}, parent);
      S('line', { x1: x, x2: x + 10, y1: y - 2, y2: y - 2, stroke: c, 'stroke-width': live ? 1.3 : 1, 'stroke-dasharray': live ? '2 1' : null }, g);
      const t = S('text', { x: x + 13, y: y, 'font-size': 7, 'font-family': MAIN, fill: '#222' }, g);
      const s1 = S('tspan', { 'font-family': MATH, 'font-style': 'italic' }, t); s1.textContent = 'α';
      const s2 = S('tspan', {}, t);
      const n = ntemp(a);
      s2.textContent = ' = ' + fmt(a, a === 0.5 || a === 0.8 ? 1 : 2) + ':  ' + n + ' temperaturas (' + (n * L) + ' it.)';
      g.t = s2;
      return g;
    }
    function build() {
      root.textContent = '';
      const cid = 'rfc' + Math.random().toString(36).slice(2);
      const clip = S('clipPath', { id: cid }, root); S('rect', { x: P.x0, y: P.y0 - 2, width: P.x1 - P.x0, height: P.y1 - P.y0 + 4 }, clip);
      gAxes = S('g', {}, root);
      S('path', { d: 'M' + P.x0 + ' ' + P.y0 + 'V' + P.y1 + 'H' + (P.x1 + 4), fill: 'none', stroke: '#000', 'stroke-width': 0.5 }, gAxes);
      [0, 100, 200, 300, 400].forEach(function (v) {
        S('line', { x1: X(v), x2: X(v), y1: P.y1, y2: P.y1 + 1.6, stroke: '#000', 'stroke-width': 0.4 }, gAxes);
        text(gAxes, X(v), P.y1 + 7.5, String(v), { anchor: 'middle', fs: 6.3 });
      });
      [0, 50, 100].forEach(function (v) {
        S('line', { x1: P.x0 - 1.6, x2: P.x0, y1: Y(v), y2: Y(v), stroke: '#000', 'stroke-width': 0.4 }, gAxes);
        text(gAxes, P.x0 - 2.8, Y(v) + 2, String(v), { anchor: 'end', fs: 6.3 });
      });
      S('line', { x1: P.x0, x2: P.x1, y1: Y(TMIN), y2: Y(TMIN), stroke: '#888', 'stroke-width': 0.35, 'stroke-dasharray': '1.2 1' }, gAxes);
      text(gAxes, P.x1 + 2, Y(TMIN) + 1.8, 'Tmin', { fs: 5.5, c: '#777' });
      text(gAxes, (P.x0 + P.x1) / 2, H - 0.8, 'iterações', { anchor: 'middle', fs: 6.3 });
      text(gAxes, 2, P.y0 + 4, 'T', { math: true, fs: 8 });
      gSeries = S('g', { 'clip-path': 'url(#' + cid + ')' }, root);
      SERIES.forEach(function (s) { s.el = S('path', { d: stairD(s.a), fill: 'none', stroke: s.c, 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, gSeries); });
      gLive = S('path', { d: stairD(liveA), fill: 'none', stroke: MYBLUE, 'stroke-width': 1.3, 'stroke-dasharray': '2.2 1.2' }, gSeries);
      gLeg = S('g', {}, root);
      SERIES.forEach(function (s, i) { s.leg = legendRow(gLeg, i, s.a, s.c); });
      const live = legendRow(gLeg, 4.25, liveA, MYBLUE, true); gLive.leg = live;
      // seta para a 0,99 que passa do eixo
      const ar = S('g', {}, gLeg);
      text(ar, P.x1 - 2, Y(T0 * Math.pow(0.99, XMAX / L)) + 7.5, 'α = 0,99 continua até a iteração ' + (ntemp(0.99) * L) + ' →', { anchor: 'end', fs: 5.8, c: '#7b3fa0' });
      SERIES[3].more = ar;
      // controle deslizante de α
      const sy = Math.min(P.y0 + 5 + 5.5 * 10.5, H - 9), sx0 = 300, sx1 = 396;
      const sl = S('g', { style: 'cursor:pointer' }, gLeg); gLive.slider = sl;
      S('rect', { x: sx0 - 4, y: sy - 6, width: sx1 - sx0 + 8, height: 12, fill: 'transparent' }, sl);
      S('line', { x1: sx0, x2: sx1, y1: sy, y2: sy, stroke: '#9bb7d4', 'stroke-width': 1.2, 'stroke-linecap': 'round' }, sl);
      text(sl, sx0, sy + 7.5, '0,5', { anchor: 'middle', fs: 5, c: '#777' });
      text(sl, sx1, sy + 7.5, '0,99', { anchor: 'middle', fs: 5, c: '#777' });
      const knob = S('circle', { cy: sy, r: 2.6, fill: MYBLUE, stroke: '#fff', 'stroke-width': 0.6 }, sl);
      const toX = function (a) { return sx0 + (sx1 - sx0) * (a - 0.5) / 0.49; };
      function setA(a) {
        liveA = Math.max(0.5, Math.min(0.99, Math.round(a * 100) / 100));
        knob.setAttribute('cx', toX(liveA));
        gLive.setAttribute('d', stairD(liveA));
        const n = ntemp(liveA);
        live.t.textContent = ' = ' + fmt(liveA) + ':  ' + n + ' temperaturas (' + (n * L) + ' it.)';
      }
      setA(liveA);
      function fromEv(ev) {
        const m = root.getScreenCTM(); if (!m) return;
        const pt = root.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
        const q = pt.matrixTransform(m.inverse());
        setA(0.5 + 0.49 * (q.x - sx0) / (sx1 - sx0));
      }
      let drag = false;
      sl.addEventListener('pointerdown', function (ev) { drag = true; sl.setPointerCapture(ev.pointerId); fromEv(ev); ev.preventDefault(); ev.stopPropagation(); });
      sl.addEventListener('pointermove', function (ev) { if (drag) fromEv(ev); });
      sl.addEventListener('pointerup', function () { drag = false; });
      // roda do mouse sobre o controle muda α (sem trocar de slide)
      sl.addEventListener('wheel', function (ev) { setA(liveA + (ev.deltaY < 0 ? 0.01 : -0.01)); ev.preventDefault(); ev.stopPropagation(); }, { passive: false });
      text(gLeg, sx0 - 12, sy + 2, 'α', { math: true, fs: 7, c: MYBLUE });
    }

    function snap(st) {
      const g = st === 'grafico';
      if (g) layout();
      host.style.display = g ? '' : 'none'; root.style.opacity = '';
      box.style.visibility = g ? 'hidden' : ''; box.style.opacity = '';
      if (g) [gAxes, gLeg].concat(SERIES.map(function (s) { return s.el; }), [gLive]).forEach(function (e) { e.style.opacity = ''; });
      if (g) SERIES.forEach(function (s) { s.el.style.strokeDasharray = ''; s.el.setAttribute('d', stairD(s.a)); s.leg.style.opacity = ''; });
    }

    async function play(a, b, h) {
      if (b !== 'grafico') return;
      layout();
      // o gráfico fica invisível até a caixa terminar de sair (antes ele aparecia inteiro por cima dela)
      const parts = [gLeg].concat(SERIES.map(function (s) { return s.el; }), [gLive]);
      parts.forEach(function (e) { e.style.opacity = 0; });
      gAxes.style.opacity = 0;
      host.style.display = '';
      // a caixa some; o gráfico entra no lugar
      box.style.visibility = '';
      await h.tween(600, function (e) { box.style.opacity = 1 - e; });
      box.style.visibility = 'hidden'; box.style.opacity = '';
      await h.wait(150);
      await h.tween(400, function (e) { gAxes.style.opacity = e; });
      gLeg.style.opacity = 1;
      Array.prototype.forEach.call(gLeg.children, function (c) { c.style.opacity = 0; });
      // cada α: a escada se desenha patamar por patamar; a legenda diz quantas temperaturas foram
      for (const s of SERIES) {
        s.el.style.opacity = 1;
        const n = ntemp(s.a), last = Math.min(n * L, XMAX);
        await h.tween(s.a < 0.9 ? 900 : 1500, function (e) { s.el.setAttribute('d', stairD(s.a, last * e)); }, E.inOut);
        s.el.setAttribute('d', stairD(s.a));
        await h.tween(250, function (e) { s.leg.style.opacity = e; if (s.more) s.more.style.opacity = e; });
      }
      await h.tween(400, function (e) {
        gLive.style.opacity = e;
        Array.prototype.forEach.call(gLeg.children, function (c) { if (c !== SERIES[3].more && SERIES.every(function (s) { return s.leg !== c; })) c.style.opacity = e; });
      });
      Array.prototype.forEach.call(gLeg.children, function (c) { c.style.opacity = ''; });
    }

    return { snap: snap, play: play };
  });
})();
