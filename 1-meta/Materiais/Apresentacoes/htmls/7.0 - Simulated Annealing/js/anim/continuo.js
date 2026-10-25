/* Vizinhança contínua de raio ε (img/viz_continuo e viz_continuo1, slides 47–48).
 *
 * A figura vem de js/anim/dados/continuo.js (ferramentas/figura_camadas.py).
 *   c0 → c1   a figura se monta: eixos, s1 e as projeções tracejadas
 *   c1 → c2   surgem pontos (soluções) no plano; o raio ε cresce a partir de s1 e dá uma volta,
 *             desenhando o disco, e os pontos dentro dele ficam azuis (vizinhos); depois os pontos somem
 * Interação (c2): arrastar a ponta do raio muda ε; os pontos reaparecem e mudam de cor ao vivo.
 */
(function () {
  'use strict';
  const A = window.Anim;
  const MYBLUE = '#0061a5', GRAY = '#9a9a9a';
  const LINE = 0, DISK = 1, AXES = [[2, 3], [4, 5]], DASH = 6, S = [7, 8], LAB_AX = [9, 10, 11, 12], LAB_S = [13, 14], EPS = 15;
  const C = [36.48, 36.2], R0 = 8.95, ANG0 = Math.atan2(4, 8);   // centro de s1, raio ε e ângulo do raio na figura

  // pontos (soluções) espalhados de forma determinística no quadrante, longe dos eixos e rótulos
  const PTS = (function () {
    let x = 7, out = [];
    const rnd = function () { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; };
    while (out.length < 46) {
      const p = [12 + rnd() * 58, 4 + rnd() * 56];
      if (Math.hypot(p[0] - C[0], p[1] - C[1]) < 2.6) continue;            // não cobre s1
      if (p[0] > 47 && p[0] < 55 && p[1] > 32 && p[1] < 40) continue;      // nem o rótulo s1
      out.push(p);
    }
    // alguns pontos garantidamente dentro do disco
    [[31, 33], [40, 31], [33, 41], [41, 39.5], [30, 38.5]].forEach(function (p) { out.push(p); });
    return out;
  })();

  A.define('continuo', function (host) {
    const D = A.figData.continuo, SC = +(host.dataset.scale || 1.8);
    const root = A.svg('svg', { viewBox: '0 0 ' + D.W + ' ' + D.H, role: 'img',
      'aria-label': 'Vizinhança de raio épsilon em torno da solução s1 no plano' });
    root.style.width = (D.W * SC) + 'pt'; root.style.height = (D.H * SC) + 'pt';
    host.appendChild(root);
    const gP = A.svg('g', {}, root);              // pontos (por baixo da figura)
    const els = A.figBuild(root, D.items);
    root.insertBefore(gP, els[DISK].nextSibling); // pontos acima do disco, abaixo do resto
    const ALL = D.items.map(function (_, i) { return i; });
    const dots = PTS.map(function (p) { return A.svg('circle', { cx: p[0], cy: p[1], r: 0.9, fill: GRAY, opacity: 0 }, gP); });
    // alça de arraste na ponta do raio (só no slide 48)
    const handle = A.svg('circle', { r: 2.6, fill: 'transparent', 'data-interactive': '', class: 'cont-h' }, root);
    let state = 'c1', R = R0, ang = ANG0;

    function geom(r, a) {   // desenha disco, raio e rótulo ε para raio r e ângulo a
      const ex = C[0] + r * Math.cos(a), ey = C[1] + r * Math.sin(a);
      els[DISK].setAttribute('d', 'M' + (C[0] + r) + ' ' + C[1] + 'A' + r + ' ' + r + ' 0 1 1 ' + (C[0] - r) + ' ' + C[1] + 'A' + r + ' ' + r + ' 0 1 1 ' + (C[0] + r) + ' ' + C[1] + 'Z');
      els[LINE].setAttribute('d', 'M' + C[0] + ' ' + C[1] + 'L' + ex.toFixed(3) + ' ' + ey.toFixed(3));
      // rótulo ε acompanha o meio do raio (na figura, o meio do raio está em 40.48, 38.2)
      els[EPS].setAttribute('transform', 'translate(' + (C[0] + r / 2 * Math.cos(a) - 40.48).toFixed(3) + ' ' + (C[1] + r / 2 * Math.sin(a) - 38.2).toFixed(3) + ')');
      handle.setAttribute('cx', ex); handle.setAttribute('cy', ey);
    }
    function color(r) { dots.forEach(function (d, i) { const p = PTS[i]; d.setAttribute('fill', Math.hypot(p[0] - C[0], p[1] - C[1]) <= r ? MYBLUE : GRAY); }); }
    function reset(i) {
      const e = els[i], it = D.items[i];
      e.style.opacity = ''; e.style.display = ''; e.removeAttribute('transform');
      e.style.strokeDasharray = ''; e.style.strokeDashoffset = '';
      if (it.d) e.setAttribute('d', it.d);
    }
    function snap(st) {
      state = st; R = R0; ang = ANG0;
      ALL.forEach(reset);
      dots.forEach(function (d) { d.setAttribute('opacity', 0); d.setAttribute('r', 0.9); });
      const on = D.states[st === 'c2' ? 'viz_continuo1' : 'viz_continuo'];
      ALL.forEach(function (i) { els[i].style.display = (st !== 'c0' && on.indexOf(i) >= 0) ? '' : 'none'; });
      handle.style.display = st === 'c2' ? '' : 'none';
      if (st === 'c2') geom(R0, ANG0);
    }

    const scaleAt = function (c, s) { return 'translate(' + c[0] + ' ' + c[1] + ') scale(' + Math.max(0.001, s) + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')'; };
    function fade(h, ids, ms) {
      ids.forEach(function (i) { els[i].style.display = ''; els[i].style.opacity = 0; });
      return h.tween(ms || 350, function (e) { ids.forEach(function (i) { els[i].style.opacity = e; }); })
        .then(function () { ids.forEach(function (i) { els[i].style.opacity = ''; }); });
    }
    function trace(h, line, head) {
      const p = els[line], L = p.getTotalLength();
      p.style.display = ''; p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
      return h.tween(600, function (e) { p.style.strokeDashoffset = L * (1 - e); })
        .then(function () { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; return fade(h, [head], 150); });
    }

    async function build(h) {
      ALL.forEach(function (i) { els[i].style.display = 'none'; });
      await h.all([trace(h, AXES[0][0], AXES[0][1]), trace(h, AXES[1][0], AXES[1][1])]);
      await fade(h, LAB_AX, 300);
      S.forEach(function (i) { els[i].style.display = ''; });
      await h.tween(380, function (e) { S.forEach(function (i) { els[i].setAttribute('transform', scaleAt(C, e)); }); }, A.ease.back);
      S.forEach(reset);
      await h.all([fade(h, [DASH], 500), fade(h, LAB_S, 400)]);
    }
    async function neighborhood(h) {
      // 1) soluções espalhadas pelo plano
      await h.tween(700, function (e, t) { dots.forEach(function (d, i) { d.setAttribute('opacity', Math.max(0, Math.min(1, t * 3 - i / dots.length * 2))); }); });
      dots.forEach(function (d) { d.setAttribute('opacity', 1); });
      // 2) o raio cresce a partir de s1
      els[LINE].style.display = ''; els[EPS].style.display = '';
      els[EPS].style.opacity = 0;
      await h.tween(500, function (e) {
        els[LINE].setAttribute('d', 'M' + C[0] + ' ' + C[1] + 'L' + (C[0] + R0 * e * Math.cos(ANG0)) + ' ' + (C[1] + R0 * e * Math.sin(ANG0)));
      });
      await h.tween(250, function (e) { els[EPS].style.opacity = e; });
      // 3) e dá uma volta, desenhando o disco; os pontos alcançados ficam azuis
      els[DISK].style.display = '';
      const reached = {};
      await h.tween(1600, function (e) {
        const a = ANG0 + 2 * Math.PI * e, large = e > 0.5 ? 1 : 0;
        const x0 = C[0] + R0 * Math.cos(ANG0), y0 = C[1] + R0 * Math.sin(ANG0), x1 = C[0] + R0 * Math.cos(a), y1 = C[1] + R0 * Math.sin(a);
        els[DISK].setAttribute('d', e >= 0.999 ? D.items[DISK].d :
          'M' + C[0] + ' ' + C[1] + 'L' + x0 + ' ' + y0 + 'A' + R0 + ' ' + R0 + ' 0 ' + large + ' 1 ' + x1 + ' ' + y1 + 'Z');
        els[LINE].setAttribute('d', 'M' + C[0] + ' ' + C[1] + 'L' + x1 + ' ' + y1);
        dots.forEach(function (d, i) {
          const p = PTS[i], r = Math.hypot(p[0] - C[0], p[1] - C[1]);
          if (r > R0 || reached[i]) return;
          let pa = Math.atan2(p[1] - C[1], p[0] - C[0]) - ANG0; while (pa < 0) pa += 2 * Math.PI;
          if (pa <= 2 * Math.PI * e) { reached[i] = true; d.setAttribute('fill', MYBLUE); d.setAttribute('r', 1.2); }
        });
      }, A.ease.inOut);
      reset(DISK); reset(LINE);
      await h.wait(1500);
      // 4) os pontos somem; fica a figura
      await h.tween(600, function (e) { dots.forEach(function (d) { d.setAttribute('opacity', 1 - e); }); });
      dots.forEach(function (d) { d.setAttribute('fill', GRAY); d.setAttribute('r', 0.9); });
    }

    async function play(from, to, h) {
      snap(from);
      if (to === 'c1' && from === 'c0') await build(h);
      if (to === 'c2') { handle.style.display = 'none'; await neighborhood(h); }
    }

    // ----- interação: arrastar a ponta do raio -----
    let drag = false, hideT = null;
    function at(ev) { const m = root.getScreenCTM(); return new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse()); }
    handle.addEventListener('pointerdown', function (ev) {
      if (state !== 'c2') return;
      ev.preventDefault(); ev.stopPropagation(); drag = true; handle.setPointerCapture(ev.pointerId);
      clearTimeout(hideT);
      dots.forEach(function (d) { d.setAttribute('opacity', 1); }); color(R);
    });
    handle.addEventListener('pointermove', function (ev) {
      if (!drag) return;
      const p = at(ev);
      R = Math.max(2.5, Math.min(30, Math.hypot(p.x - C[0], p.y - C[1]))); ang = Math.atan2(p.y - C[1], p.x - C[0]);
      geom(R, ang); color(R);
    });
    const end = function () {
      if (!drag) return;
      drag = false;
      hideT = setTimeout(function () { dots.forEach(function (d) { d.setAttribute('opacity', 0); }); }, 2500);
    };
    handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
    handle.addEventListener('click', function (ev) { ev.stopPropagation(); });

    return { snap: snap, play: play };
  });
})();
