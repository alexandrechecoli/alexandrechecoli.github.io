/* Ótimo local: curva de custo z(s_i) com a "bola" de vizinhança (slides 95–103).
 *
 * Geometria copiada das figuras originais (img/otimo_local*.pdf), em pt.
 * Estados (data-state / data-from):
 *   e0   vazio (só para a animação de entrada: eixos e curva se desenham)
 *   l1   curva com os rótulos s1..s15 e três soluções marcadas
 *   l2   bola de vizinhança (raio ε) em uma solução na encosta
 *   l3   + uma solução vizinha melhor
 *   l31  + seta "É melhor"
 *   l4   bola no fundo do vale: "ótimo local"
 *   l5   os 4 ótimos locais (um deles é o global)
 * Interação (estados com bola): arrastar a bola pela curva mostra, em tempo real, a melhor
 * solução dentro da vizinhança; a roda do mouse sobre a bola muda o raio ε.
 */
(function () {
  'use strict';
  const A = window.Anim;
  const W = 248.72, H = 144.4, SCALE = 0.95;
  const NAVY = '#00008b', BLACK = '#000000', HIL = '#d0281a';

  const CURVE = 'M28.89 85.68 C36.89 53.68 40.89 49.68 44.23 49.02 C47.56 48.35 50.23 51.02 52.89 57.68 ' +
    'C55.56 64.35 58.23 75.02 60.89 84.35 C63.56 93.68 66.23 101.68 68.89 107.02 C71.56 112.35 74.23 115.02 76.89 113.68 ' +
    'C79.56 112.35 82.23 107.02 84.89 100.35 C87.56 93.68 90.23 85.68 92.89 80.35 C95.56 75.02 98.23 72.35 100.89 72.35 ' +
    'C103.56 72.35 106.23 75.02 108.89 79.02 C111.56 83.02 114.23 88.35 116.89 92.35 C119.56 96.35 122.23 99.02 126.23 101.68 ' +
    'C130.23 104.35 135.56 107.02 140.89 107.02 C146.23 107.02 151.56 104.35 155.56 101.68 C159.56 99.02 162.23 96.35 166.23 85.68 ' +
    'C170.23 75.02 175.56 56.35 180.89 44.35 C186.23 32.35 191.56 27.02 196.89 27.02 C202.23 27.02 207.56 32.35 210.23 39.02 ' +
    'C212.89 45.68 212.89 53.68 220.89 69.68';
  const X0 = 28.89, X1 = 220.89;
  const R = 7.155;                       // raio da bola na figura
  const RLINE = [6.4, 3.2];              // segmento do raio (centro -> borda)
  const EPS_OFF = [3.23, 0.87];          // posição do "ϵ" em relação ao centro

  const BALL2 = [56.26, 67.84], BALL4 = [75.57, 114.02];
  const OPT5 = [
    { c: [29.23, 84.54], t: [['ótimo', 40.92, 87.29], ['local', 42.49, 91.97]] },
    { c: [75.57, 114.02], t: [['ótimo', 92.24, 114.29], ['local e global', 84.78, 119.14]], global: true },
    { c: [141.55, 107.00], t: [['ótimo', 153.24, 109.76], ['local', 154.81, 114.43]] },
    { c: [220.90, 69.68], t: [['ótimo', 199.93, 81.79], ['local', 201.5, 86.47]] }
  ];
  const STATES = {
    e0: { empty: true },
    l1: { ticks: true, dots: true },
    l2: { ball: BALL2, radius: true },
    l3: { ball: BALL2, radius: true, better: true },
    l31: { ball: BALL2, radius: true, better: true, arrow: true },
    l4: { ball: BALL4, radius: true, opt4: true },
    l5: { opt5: true }
  };

  A.define('localopt', function (host) {
    const root = A.svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img',
      'aria-label': 'Curva de custo com a vizinhança de uma solução e ótimos locais' });
    root.style.width = (W * SCALE) + 'pt'; root.style.height = (H * SCALE) + 'pt';
    host.appendChild(root);
    const math = { 'font-family': 'KaTeX_Math, serif', 'font-style': 'italic' };
    const main = { 'font-family': 'KaTeX_Main, serif' };
    function text(parent, str, x, y, size, attrs, extra) {
      const t = A.svg('text', Object.assign({ x: x, y: y, 'font-size': size }, attrs, extra || {}), parent);
      t.textContent = str; return t;
    }

    // ----- eixos -----
    const gAxes = A.svg('g', {}, root);
    const yAxis = A.svg('line', { x1: X0, y1: 125.68, x2: X0, y2: 5.68, stroke: BLACK, 'stroke-width': 0.8 }, gAxes);
    const yHead = A.svg('path', { d: 'M28.89 5.68 L27.23 10.68 L30.56 10.68 Z', fill: BLACK, stroke: BLACK, 'stroke-width': 0.8, 'stroke-linejoin': 'miter' }, gAxes);
    const xAxis = A.svg('line', { x1: X0, y1: 125.68, x2: 244.89, y2: 125.68, stroke: BLACK, 'stroke-width': 0.8 }, gAxes);
    const xHead = A.svg('path', { d: 'M244.89 125.68 L239.89 124.02 L239.89 127.35 Z', fill: BLACK, stroke: BLACK, 'stroke-width': 0.8 }, gAxes);
    const gAxLab = A.svg('g', {}, root);
    text(gAxLab, 'z', 1.0, 20.41, 12.91, math); text(gAxLab, '(', 7.45, 20.41, 12.91, main);
    text(gAxLab, 's', 12.36, 20.41, 12.91, math); text(gAxLab, 'i', 18.32, 22.35, 8.97, math);
    text(gAxLab, ')', 21.86, 20.41, 12.91, main);
    text(gAxLab, 's', 226.63, 136.84, 12.91, math); text(gAxLab, 'i', 232.59, 138.78, 8.97, math);
    const vline = A.svg('line', { x1: X1, y1: 125.68, x2: X1, y2: 29.68, stroke: BLACK, 'stroke-width': 0.4, 'stroke-dasharray': '1 3' }, root);

    // ----- rótulos s1..s15 (verticais) -----
    const gTicks = A.svg('g', {}, root);
    const ticks = [];
    for (let k = 1; k <= 15; k++) {
      const two = k >= 10, x = 38.62 + 12 * (k - 1), y = two ? 141.88 : 137.88;
      const g = A.svg('g', { transform: 'translate(' + x + ' ' + y + ') rotate(-90)' }, gTicks);
      text(g, 's', 0, 0, 10.33, math);
      text(g, String(k), 4.77, 1.55, 7.17, main);
      ticks.push(g);
    }

    // ----- curva -----
    const curve = A.svg('path', { d: CURVE, fill: 'none', stroke: NAVY, 'stroke-width': 0.8 }, root);
    const hiArc = A.svg('polyline', { fill: 'none', stroke: HIL, 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0 }, root);

    // ----- três soluções marcadas (figura 1) -----
    const gDots = A.svg('g', {}, root);
    const dots = [[75.48, 113.83], [141.23, 107.17], [220.83, 68.57]].map(function (p) {
      return A.svg('circle', { cx: p[0], cy: p[1], r: 1.5, fill: '#fff', stroke: BLACK, 'stroke-width': 0.6 }, gDots);
    });

    // ----- bolas -----
    function makeBall(parent) {
      const g = A.svg('g', {}, parent);
      g._disk = A.svg('circle', { r: R, fill: NAVY, 'fill-opacity': 0.3, stroke: BLACK, 'stroke-width': 0.4 }, g);
      g._rad = A.svg('line', { x1: 0, y1: 0, x2: RLINE[0], y2: RLINE[1], stroke: BLACK, 'stroke-width': 0.4 }, g);
      g._eps = text(g, 'ϵ', EPS_OFF[0], EPS_OFF[1], 3.99, math);
      g._c = A.svg('circle', { r: 0.93, fill: '#fff', stroke: NAVY, 'stroke-width': 0.54 }, g);
      return g;
    }
    function placeBall(g, c, s, r) {
      r = r || R;
      g.setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ')' + (s != null && s !== 1 ? ' scale(' + Math.max(0.001, s) + ')' : ''));
      g._disk.setAttribute('r', r);
      g._rad.setAttribute('x2', RLINE[0] * r / R); g._rad.setAttribute('y2', RLINE[1] * r / R);
      g._eps.setAttribute('x', EPS_OFF[0] * r / R); g._eps.setAttribute('y', EPS_OFF[1] * r / R);
    }
    const gBalls = A.svg('g', {}, root);
    const ball = makeBall(gBalls);
    ball.setAttribute('class', 'lo-ball'); ball.setAttribute('data-interactive', '');
    const optBalls = OPT5.map(function (o) {
      const b = makeBall(gBalls); show(b._rad, false); show(b._eps, false); placeBall(b, o.c); return b;
    });
    const scanner = makeBall(gBalls); show(scanner._rad, false); show(scanner._eps, false);
    scanner._disk.setAttribute('fill-opacity', 0.12); scanner._disk.setAttribute('stroke-dasharray', '1 1');

    // vizinho melhor, seta "É melhor", rótulos de ótimo
    const better = A.svg('circle', { cx: 58.15, cy: 74.74, r: 0.93, fill: '#fff', stroke: NAVY, 'stroke-width': 0.54 }, root);
    const gArrow = A.svg('g', {}, root);
    const arrowPath = A.svg('path', { d: 'M79.61 60.71 C76.10 68.49 70.41 72.19 62.06 74.08', fill: 'none', stroke: NAVY, 'stroke-width': 0.4 }, gArrow);
    const arrowHead = A.svg('path', { d: 'M62.06 74.08 L65.21 74.39 L64.76 72.45 Z', fill: NAVY, stroke: NAVY, 'stroke-width': 0.4 }, gArrow);
    const arrowText = text(gArrow, 'É melhor', 74.99, 59.59, 5.18, main);
    const gOpt4 = A.svg('g', {}, root);
    text(gOpt4, 'ótimo', 87.36, 114.24, 5.65, main); text(gOpt4, 'local', 88.94, 118.91, 5.65, main);
    const opt5Labels = OPT5.map(function (o) {
      const g = A.svg('g', {}, root);
      o.t.forEach(function (t) { text(g, t[0], t[1], t[2], 5.65, main); });
      return g;
    });
    // rótulo dinâmico da interação
    const live = text(root, '', 0, 0, 5.18, main, { fill: NAVY, 'text-anchor': 'middle' });

    // ----- amostragem da curva (para deslizar a bola e para a interação) -----
    let SAMPLES = null, LEN = 0;
    function samples() {
      if (SAMPLES) return SAMPLES;
      LEN = curve.getTotalLength();
      if (!LEN) return [[X0, 85.68, 0]];   // curva ainda oculta: não guarda o cache
      SAMPLES = [];
      for (let i = 0; i <= 800; i++) { const p = curve.getPointAtLength(LEN * i / 800); SAMPLES.push([p.x, p.y, LEN * i / 800]); }
      return SAMPLES;
    }
    function atX(x) { // ponto da curva com abscissa x
      const S = samples();
      if (x <= S[0][0]) return [S[0][0], S[0][1], 0];
      for (let i = 1; i < S.length; i++) if (S[i][0] >= x) {
        const a = S[i - 1], b = S[i], t = (x - a[0]) / ((b[0] - a[0]) || 1);
        return [x, A.lerp(a[1], b[1], t), A.lerp(a[2], b[2], t)];
      }
      const z = S[S.length - 1]; return [z[0], z[1], LEN];
    }

    function show(el, on) { el.style.display = on ? '' : 'none'; }
    function op(el, v) { el.style.opacity = v; }

    let state = null, cur = null, r = R; // centro e raio atuais da bola principal

    // ----- estado final -----
    function snap(name) {
      const S = STATES[name]; state = name;
      const empty = !!S.empty;
      // zera opacidades deixadas por uma animação interrompida
      root.querySelectorAll('*').forEach(function (el) { if (el.style && el.style.opacity !== '') el.style.opacity = ''; });
      [gAxes, gAxLab, vline, curve].forEach(function (el) { show(el, !empty); op(el, ''); });
      curve.removeAttribute('stroke-dasharray'); curve.removeAttribute('stroke-dashoffset');
      [yAxis, xAxis].forEach(function (l) { l.removeAttribute('stroke-dasharray'); l.removeAttribute('stroke-dashoffset'); });
      yHead.style.opacity = ''; xHead.style.opacity = '';
      vline.setAttribute('y2', 29.68);
      show(gTicks, !!S.ticks); ticks.forEach(function (t) { op(t, ''); });
      show(gDots, !!S.dots); dots.forEach(function (d) { d.setAttribute('r', 1.5); });
      r = R; cur = S.ball ? S.ball.slice() : null;
      show(ball, !!S.ball); op(ball, '');
      if (S.ball) { placeBall(ball, S.ball); show(ball._rad, !!S.radius); show(ball._eps, !!S.radius); op(ball._rad, ''); op(ball._eps, ''); }
      show(better, !!S.better); better.setAttribute('r', 0.93);
      show(gArrow, !!S.arrow); op(gArrow, ''); arrowPath.removeAttribute('stroke-dasharray'); arrowPath.removeAttribute('stroke-dashoffset');
      show(gOpt4, !!S.opt4); op(gOpt4, '');
      optBalls.forEach(function (b, i) { show(b, !!S.opt5); op(b, ''); placeBall(b, OPT5[i].c); });
      opt5Labels.forEach(function (g) { show(g, !!S.opt5); op(g, ''); });
      show(scanner, false);
      hiArc.setAttribute('opacity', 0); show(live, false);
    }

    // ----- animações -----
    function drawLine(h, el, dur) {
      const len = Math.hypot(el.getAttribute('x2') - el.getAttribute('x1'), el.getAttribute('y2') - el.getAttribute('y1'));
      el.setAttribute('stroke-dasharray', len + ' ' + len);
      return h.tween(dur, function (e) { el.setAttribute('stroke-dashoffset', len * (1 - e)); })
        .then(function () { el.removeAttribute('stroke-dasharray'); el.removeAttribute('stroke-dashoffset'); });
    }
    function drawPath(h, el, dur, ez) {
      const len = el.getTotalLength();
      el.setAttribute('stroke-dasharray', len + ' ' + len); el.setAttribute('stroke-dashoffset', len);
      return h.tween(dur, function (e) { el.setAttribute('stroke-dashoffset', len * (1 - e)); }, ez)
        .then(function () { el.removeAttribute('stroke-dasharray'); el.removeAttribute('stroke-dashoffset'); });
    }
    function fade(h, els, to, dur) {
      els = [].concat(els);
      els.forEach(function (el) { if (to > 0) { show(el, true); op(el, 0); } });
      return h.tween(dur || 350, function (e) { els.forEach(function (el) { op(el, to > 0 ? e : 1 - e); }); })
        .then(function () { els.forEach(function (el) { if (to > 0) op(el, ''); else { show(el, false); op(el, ''); } }); });
    }
    function slide(h, b, x0, x1, dur, end) { // desliza a bola pela curva de x0 a x1
      const p0 = atX(x0), p1 = atX(x1);
      return h.tween(dur, function (e) {
        const L = A.lerp(p0[2], p1[2], e), p = curve.getPointAtLength(L);
        let c = [p.x, p.y];
        if (end && e > 0.85) { const k = (e - 0.85) / 0.15; c = [A.lerp(p.x, end[0], k), A.lerp(p.y, end[1], k)]; }
        placeBall(b, c); if (b === ball) cur = c;
      });
    }
    function pop(h, el, attr, rr, dur) {
      show(el, true);
      return h.tween(dur || 380, function (e) { el.setAttribute(attr, Math.max(0.001, rr * e)); }, A.ease.back);
    }
    function arcInside(c, rr) {
      const S = samples(); const pts = [];
      S.forEach(function (s) { if (Math.hypot(s[0] - c[0], s[1] - c[1]) <= rr) pts.push(s); });
      return pts;
    }

    async function play(from, to, h) {
      const B = STATES[to], F = STATES[from];
      if (F.empty && !B.empty) {
        // eixos crescem, curva se desenha da esquerda para a direita
        [gAxes, gAxLab, vline, curve].forEach(function (el) { show(el, true); });
        op(gAxLab, 0); yHead.style.opacity = 0; xHead.style.opacity = 0; op(curve, 1);
        curve.setAttribute('stroke-dasharray', '9999'); curve.setAttribute('stroke-dashoffset', '9999');
        vline.setAttribute('y2', 125.68);
        await h.all([drawLine(h, yAxis, 450), drawLine(h, xAxis, 450)]);
        await h.all([fade(h, [yHead, xHead], 1, 200), fade(h, gAxLab, 1, 400)]);
        await drawPath(h, curve, 1400, A.ease.inOut);
        await h.tween(300, function (e) { vline.setAttribute('y2', A.lerp(125.68, 29.68, e)); });
        if (B.ticks) {
          show(gTicks, true); ticks.forEach(function (t) { op(t, 0); });
          for (const t of ticks) { h.tween(250, function (e) { op(t, e); }).catch(function () {}); await h.wait(45); }
          await h.wait(200);
        }
        if (B.dots) { show(gDots, true); for (const d of dots) { await pop(h, d, 'r', 1.5, 300); } }
        return;
      }
      // o que sai
      const outs = [];
      if (F.ticks && !B.ticks) outs.push(fade(h, gTicks, 0));
      if (F.dots && !B.dots) outs.push(fade(h, gDots, 0));
      if (F.arrow && !B.arrow) outs.push(fade(h, gArrow, 0));
      if (F.better && !B.better) outs.push(fade(h, better, 0));
      if (F.opt4 && !B.opt4) outs.push(fade(h, gOpt4, 0));
      if (F.radius && (!B.radius || (B.ball && F.ball && B.ball[0] !== F.ball[0]))) outs.push(fade(h, [ball._rad, ball._eps], 0, 250));
      if (outs.length) await h.all(outs);

      // bola entra ou desliza pela curva
      if (B.ball && !F.ball) {
        show(ball, true); show(ball._rad, false); show(ball._eps, false);
        const s = atX(X0); placeBall(ball, [s[0], s[1]], 0.001);
        await h.tween(300, function (e) { placeBall(ball, [s[0], s[1]], e); }, A.ease.back);
        await slide(h, ball, X0, B.ball[0], 1000, B.ball);
      } else if (B.ball && F.ball && B.ball[0] !== F.ball[0]) {
        await h.wait(150);
        await slide(h, ball, F.ball[0], B.ball[0], 1400, B.ball);   // desce a encosta até o vale
      }
      if (B.ball) placeBall(ball, B.ball);
      if (B.radius && (!F.radius || (F.ball && B.ball[0] !== F.ball[0]))) await fade(h, [ball._rad, ball._eps], 1, 300);

      // vizinhança: acende o trecho da curva dentro da bola e mostra o vizinho melhor
      if (B.better && !F.better) {
        const pts = arcInside(B.ball, R);
        hiArc.setAttribute('points', pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' '));
        await h.tween(350, function (e) { hiArc.setAttribute('opacity', e); });
        await pop(h, better, 'r', 0.93, 400);
        await h.wait(500);
        await h.tween(500, function (e) { hiArc.setAttribute('opacity', 1 - e); });
      }
      if (B.arrow && !F.arrow) {
        show(gArrow, true); op(arrowText, 0); op(arrowHead, 0);
        await drawPath(h, arrowPath, 500);
        await h.all([fade(h, arrowHead, 1, 150), fade(h, arrowText, 1, 350)]);
      }
      if (B.opt4 && !F.opt4) await fade(h, gOpt4, 1, 450);

      // ótimos locais: uma bola "varre" a curva e marca cada vale
      if (B.opt5 && !F.opt5) {
        if (F.ball) { // a bola atual vira a do ótimo global
          optBalls.forEach(function (b, i) { show(b, OPT5[i].global); });
          show(ball, false);
        }
        show(scanner, true); op(scanner, 1);
        let x = X0;
        for (let i = 0; i < OPT5.length; i++) {
          const o = OPT5[i];
          const dur = Math.max(250, (o.c[0] - x) * 9);
          if (o.c[0] > x) await slide(h, scanner, x, o.c[0], dur);
          placeBall(scanner, o.c);
          x = o.c[0];
          if (!o.global || !F.ball) {
            show(optBalls[i], true);
            await h.tween(350, function (e) { placeBall(optBalls[i], o.c, e); }, A.ease.back);
          } else {
            await h.tween(400, function (e) { placeBall(optBalls[i], o.c, 1 + 0.25 * Math.sin(Math.PI * e)); });
          }
          await fade(h, opt5Labels[i], 1, 300);
          await h.wait(150);
        }
        await fade(h, scanner, 0, 300);
      }
    }

    // ----- interação: arrastar a bola e mudar ε -----
    function svgPoint(evt) {
      const pt = root.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
      return pt.matrixTransform(root.getScreenCTM().inverse());
    }
    function evaluate() {
      if (!cur) return;
      // esconde a anotação estática e mostra a avaliação ao vivo
      show(better, false); show(gArrow, false); show(gOpt4, false);
      placeBall(ball, cur, 1, r);
      const pts = arcInside(cur, r);
      hiArc.setAttribute('points', pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' '));
      hiArc.setAttribute('opacity', 0.9);
      // melhor vizinho = menor z = maior y na tela
      let best = null; pts.forEach(function (p) { if (!best || p[1] > best[1]) best = p; });
      const isOpt = !best || best[1] <= cur[1] + 0.25;
      show(live, true);
      live.textContent = isOpt ? 'ótimo local' : 'há vizinho melhor';
      live.setAttribute('x', Math.max(X0 + 14, Math.min(232, cur[0])));
      live.setAttribute('y', cur[1] - r - 2);
      show(better, !isOpt);
      if (!isOpt) { better.setAttribute('cx', best[0]); better.setAttribute('cy', best[1]); }
    }
    let drag = false;
    ball.addEventListener('pointerdown', function (e) {
      if (!cur) return;
      drag = true; ball.setPointerCapture(e.pointerId); e.preventDefault(); e.stopPropagation();
    });
    ball.addEventListener('pointermove', function (e) {
      if (!drag) return;
      const p = svgPoint(e), x = Math.max(X0, Math.min(X1, p.x)), c = atX(x);
      cur = [c[0], c[1]]; evaluate();
    });
    ball.addEventListener('pointerup', function () { drag = false; });
    ball.addEventListener('click', function (e) { e.stopPropagation(); });
    root.addEventListener('wheel', function (e) {
      if (!cur) return;
      e.preventDefault();
      r = Math.max(3, Math.min(40, r * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
      evaluate();
    }, { passive: false });

    return { snap: snap, play: play };
  });
})();
