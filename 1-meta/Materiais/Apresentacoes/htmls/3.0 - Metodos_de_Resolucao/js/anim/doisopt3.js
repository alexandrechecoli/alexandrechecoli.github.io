/* O 2-OPT (aula 3, frame 64; figura img/2-OPT do Ipe em camadas, dados/opt.js, quadro 240.4 × 128.4).
 * Ideias e estilo do doisopt.js da aula Lab3 (arcos que piscam e somem, novos arcos traçados, trecho invertido).
 *
 * Uso: <span class="anim pl" data-anim="doisopt3" data-from="vazio" data-state="f,demo"><img …></span>; o section
 * ganha data-steps="2".
 *   vazio → f   (passo 1) rota original: nós brotam, uma ficha percorre 1→2→5→4→3→6→1 traçando os arcos, o
 *               cruzamento pisca; "Substituindo os arcos": os arcos que se cruzam ficam vermelhos (pulso) e os
 *               novos (2–3, 6–5) se traçam; "Nova rota": a ficha percorre 1→2→3→4→5→6→1 e o trecho invertido
 *               (3→4→5) pisca; à esquerda, o comprimento das duas rotas (289,5 → 249,8, −14%: fica)
 *   f → demo    (passo 2, novo) no lugar da figura: 9 cidades numa rota aleatória cheia de cruzamentos; o 2-OPT
 *               (melhor troca) é aplicado movimento a movimento até nenhum melhorar ("ótimo local"). Botões:
 *               "2-OPT" (um movimento) e "nova rota".
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease, lerp = Anim.lerp;
  const FD = Anim.figData || {};
  const NAVY = '#00008b', DRED = '#8b0000', MYBLUE = '#0061a5', GOLD = '#e0a400', GREEN = '#169b3a', ORANGE = '#d9822b';
  const CAP = '"LM Sans 8", "LM Sans", sans-serif';
  // nós de cada painel (número da cidade -> item do ponto) e arcos (de, para, linha, ponta)
  const P1 = { 1: 4, 2: 0, 3: 2, 4: 5, 5: 3, 6: 1 }, P2 = { 1: 22, 2: 18, 3: 20, 4: 23, 5: 21, 6: 19 }, P3 = { 1: 42, 2: 38, 3: 40, 4: 43, 5: 41, 6: 39 };
  const ARC1 = [[1, 2, 6, 7], [2, 5, 8, 9], [5, 4, 10, 11], [4, 3, 12, 13], [3, 6, 14, 15], [6, 1, 16, 17]];
  const ARC3 = [[1, 2, 44, 45], [2, 3, 48, 49], [3, 4, 50, 51], [4, 5, 52, 53], [5, 6, 54, 55], [6, 1, 46, 47]];
  const PT = { 1: [8.2, 28.2], 2: [40.2, 4.2], 3: [88.2, 4.2], 4: [116.2, 28.2], 5: [88.2, 52.2], 6: [40.2, 52.2] };
  const len = function (r) { let s = 0; for (let k = 0; k < r.length; k++) { const a = PT[r[k]], b = PT[r[(k + 1) % r.length]]; s += Math.hypot(b[0] - a[0], b[1] - a[1]); } return s; };
  const L0 = len([1, 2, 5, 4, 3, 6]), L1 = len([1, 2, 3, 4, 5, 6]);
  const fmt = function (v) { return v.toFixed(1).replace('.', ','); };
  const range = function (a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };

  function mk(it, parent) {
    if (it.t === 'x') {
      const t = S('text', { x: it.x, y: it.y, 'font-size': it.fs, 'font-family': it.ff, fill: it.c }, parent);
      t.textContent = it.tx;
      return t;
    }
    const p = S('path', { d: it.d, fill: it.f || 'none' }, parent);
    if (it.s) { p.setAttribute('stroke', it.s); p.setAttribute('stroke-width', it.w); if (it.da) p.setAttribute('stroke-dasharray', it.da); }
    return p;
  }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  Anim.define('doisopt3', function (host) {
    const D = FD.opt;
    if (!D) { console.warn('doisopt3: faltam os dados (dados/opt.js)'); return { snap: function () {}, play: null }; }
    const IT = D.items;
    const svg = S('svg', { viewBox: '0 0 ' + D.W + ' ' + D.H });
    host.appendChild(svg);
    const gIt = S('g', null, svg), gFx = S('g', null, svg), gNote = S('g', null, svg), gDemo = S('g', null, svg);
    const els = IT.map(function (it) { return mk(it, gIt); });
    const ALL = range(0, IT.length - 1);

    function reset(i) { const e = els[i]; e.style.opacity = ''; e.removeAttribute('transform'); e.style.strokeDasharray = ''; e.style.strokeDashoffset = ''; e.style.stroke = ''; e.style.fill = ''; e.style.strokeWidth = ''; }
    function show(ids, on) { ids.forEach(function (i) { els[i].style.display = on === false ? 'none' : ''; }); }
    function showSet(ids) { const s = new Set(ids); els.forEach(function (e, i) { reset(i); e.style.display = s.has(i) ? '' : 'none'; }); }
    const ctr = function (i) { const b = IT[i].b; return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; };
    function fade(h, ids, to, dur) {
      show(ids); const from = to ? 0 : 1;
      ids.forEach(function (i) { els[i].style.opacity = from; });
      return h.tween(dur || 280, function (e) { ids.forEach(function (i) { els[i].style.opacity = lerp(from, to, e); }); })
        .then(function () { ids.forEach(function (i) { els[i].style.opacity = ''; }); if (!to) show(ids, false); });
    }
    function pop(h, ids, c, dur) {
      show(ids);
      return h.tween(dur || 260, function (e, t) {
        ids.forEach(function (i) { els[i].style.opacity = Math.min(1, t * 3); els[i].setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ') scale(' + Math.max(0.001, ease.back(t)) + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')'); });
      }, ease.linear).then(function () { ids.forEach(reset); });
    }
    function trace(h, i, dur) {
      const el = els[i]; show([i]); reset(i);
      const L = el.getTotalLength(), da = IT[i].da;
      el.style.strokeDasharray = L + ' ' + (L + 1); el.style.strokeDashoffset = L;
      return h.tween(dur || 380, function (e) { el.style.strokeDashoffset = L * (1 - e); }, ease.inOut).then(function () { reset(i); });
    }
    // ficha que percorre os arcos (o arco cresce atrás dela e a ponta brota na chegada)
    async function tour(h, panel, arcs, off, dur) {
      const tok = S('circle', { r: 2.4, fill: GOLD, stroke: '#8a6500', 'stroke-width': 0.3 }, gFx);
      for (const a of arcs) {
        const A = ctr(panel[a[0]]), B = ctr(panel[a[1]]);
        const el = els[a[2]], L = el.getTotalLength();
        show([a[2]]); el.style.strokeDasharray = L + ' ' + (L + 1);
        // os caminhos do Ipe podem ir de b para a: o recorte segue a ficha pelo sentido do arco
        const rev = Math.hypot(el.getPointAtLength(0).x - A[0], el.getPointAtLength(0).y - A[1]) > 1;
        await h.tween(dur || 360, function (e) {
          el.style.strokeDashoffset = rev ? -L * (1 - e) : L * (1 - e);
          tok.setAttribute('cx', lerp(A[0], B[0], e)); tok.setAttribute('cy', lerp(A[1], B[1], e));
        }, ease.inOut);
        reset(a[2]);
        await pop(h, [a[3]], B, 160);
      }
      await h.tween(250, function (e) { tok.setAttribute('opacity', 1 - e); });
      tok.remove();
    }
    function ring(h, p, col, dur) {
      const c = S('circle', { cx: p[0], cy: p[1], r: 1, fill: 'none', stroke: col, 'stroke-width': 0.8 }, gFx);
      return h.tween(dur || 650, function (e) { c.setAttribute('r', 1 + 10 * e); c.setAttribute('opacity', 1 - e); }, ease.out).then(function () { c.remove(); });
    }
    function caption(txt, x, y, col, anchor, size) {
      const t = S('text', { x: x, y: y, 'font-size': size || 5.4, 'font-family': CAP, fill: col || DRED, 'text-anchor': anchor || 'middle' }, gFx);
      t.textContent = txt; return t;
    }
    function note(on) {   // comprimentos (ficam no estado f), no canto livre à esquerda da "Nova rota"
      while (gNote.firstChild) gNote.removeChild(gNote.firstChild);
      if (!on) return [];
      const a = S('text', { x: 4, y: 84, 'font-size': 5.4, 'font-family': CAP, fill: '#555' }, gNote); a.textContent = 'comprimento:';
      const b = S('text', { x: 4, y: 93, 'font-size': 5.4, 'font-family': CAP, fill: DRED }, gNote); b.textContent = 'original ' + fmt(L0);
      const c = S('text', { x: 4, y: 102, 'font-size': 5.4, 'font-family': CAP, fill: GREEN }, gNote); c.textContent = 'nova ' + fmt(L1) + ' (−' + Math.round(100 * (1 - L1 / L0)) + '%)';
      return [a, b, c];
    }

    async function playFig(h) {
      showSet([]); note(false);
      // rota original
      await fade(h, [56], 1, 250);
      for (const k of [1, 2, 3, 4, 5, 6]) { await pop(h, [P1[k]], ctr(P1[k]), 150); show([63 + k]); }
      await tour(h, P1, ARC1, 0, 340);
      await fade(h, [59, 60], 1, 250);
      const X = [64.2, 28.2];
      const t = caption('cruzamento', 64.2, 22, DRED); t.setAttribute('opacity', 0);
      await h.all([ring(h, X, DRED, 800), h.tween(250, function (e) { t.setAttribute('opacity', e); })]);
      // substituindo os arcos
      await fade(h, [57], 1, 250);
      show(range(18, 23)); show(range(70, 75));
      await fade(h, [24, 25, 28, 29, 30, 31, 34, 35], 1, 300);
      await fade(h, [26, 27, 32, 33], 1, 250);
      await h.tween(700, function (e, s) { [26, 27, 32, 33].forEach(function (i) { els[i].style.strokeWidth = 0.4 + 1.2 * Math.sin(Math.PI * s); }); }, ease.linear);
      [26, 27, 32, 33].forEach(reset);
      await h.all([trace(h, 36, 450), trace(h, 37, 450)]);
      await fade(h, [61, 62, 63], 1, 250);
      t.remove();
      // nova rota
      await fade(h, [58], 1, 250);
      show(range(38, 43)); show(range(76, 81));
      await tour(h, P3, ARC3, 0, 340);
      await h.tween(700, function (e, s) { [50, 51, 52, 53].forEach(function (i) { els[i].style.stroke = Anim.mix('#000000', ORANGE, Math.sin(Math.PI * s)); els[i].style.fill = IT[i].f ? els[i].style.stroke : ''; }); }, ease.linear);
      [50, 51, 52, 53].forEach(reset);
      const inv = caption('trecho invertido: 5→4→3 vira 3→4→5', 120, 106, ORANGE); inv.setAttribute('opacity', 0);
      await h.tween(250, function (e) { inv.setAttribute('opacity', e); });
      await fade(h, [82, 83], 1, 250);
      const ns = note(true); ns.forEach(function (n) { n.setAttribute('opacity', 0); });
      for (const n of ns) await h.tween(220, function (e) { n.setAttribute('opacity', e); });
      await h.wait(1600);
      await h.tween(300, function (e) { inv.setAttribute('opacity', 1 - e); });
      inv.remove();
    }

    // ---------------- demo (passo 2) ----------------
    const N = 9, BOX = [8, 8, 232, 108];
    let seed = 7, pts = [], route = [], busy = false, gen = 0, moves = 0;
    const dist = function (a, b) { return Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]); };
    const tlen = function (r) { let s = 0; for (let k = 0; k < r.length; k++) s += dist(r[k], r[(k + 1) % r.length]); return s; };
    function newInstance() {
      const R = rng(seed++);
      pts = [];
      while (pts.length < N) {
        const p = [lerp(BOX[0] + 6, BOX[2] - 6, R()), lerp(BOX[1] + 6, BOX[3] - 6, R())];
        if (pts.every(function (q) { return Math.hypot(p[0] - q[0], p[1] - q[1]) > 24; })) pts.push(p);
      }
      route = range(0, N - 1);
      for (let i = N - 1; i > 1; i--) { const j = 1 + Math.floor(R() * i); const t = route[i]; route[i] = route[j]; route[j] = t; }
      moves = 0;
    }
    function bestMove() {
      let best = null;
      for (let i = 0; i < N - 1; i++) for (let j = i + 2; j < N; j++) {
        if (i === 0 && j === N - 1) continue;
        const a = route[i], b = route[i + 1], c = route[j], d = route[(j + 1) % N];
        const dl = dist(a, c) + dist(b, d) - dist(a, b) - dist(c, d);
        if (dl < -1e-6 && (!best || dl < best.dl)) best = { i: i, j: j, dl: dl };
      }
      return best;
    }
    let gArcs, gNodes, lenTxt, msg;
    function arrowPath(a, b) {
      const A = pts[a], B = pts[b], L = Math.hypot(B[0] - A[0], B[1] - A[1]), ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L;
      const x0 = A[0] + ux * 2, y0 = A[1] + uy * 2, x1 = B[0] - ux * 2.2, y1 = B[1] - uy * 2.2;
      return { line: 'M' + x0 + ' ' + y0 + 'L' + x1 + ' ' + y1, head: 'M' + x1 + ' ' + y1 + 'l' + (-ux * 3 - uy * 1.2) + ' ' + (-uy * 3 + ux * 1.2) + 'l' + (uy * 2.4) + ' ' + (-ux * 2.4) + 'Z' };
    }
    function drawArc(a, b, col, parent) {
      const p = arrowPath(a, b), g = S('g', null, parent || gArcs);
      S('path', { d: p.line, stroke: col || '#000', 'stroke-width': 0.5, fill: 'none' }, g);
      S('path', { d: p.head, fill: col || '#000' }, g);
      return g;
    }
    function drawDemo() {
      while (gDemo.firstChild) gDemo.removeChild(gDemo.firstChild);
      S('rect', { x: 0.2, y: 0.2, width: 240, height: 128, fill: '#fff', stroke: '#000', 'stroke-width': 0.4 }, gDemo);
      gArcs = S('g', null, gDemo); gNodes = S('g', null, gDemo);
      redraw();
      pts.forEach(function (p) { S('circle', { cx: p[0], cy: p[1], r: 1.8, fill: NAVY }, gNodes); });
      lenTxt = S('text', { x: 6, y: 120, 'font-size': 6.2, 'font-family': CAP, fill: '#333' }, gDemo);
      msg = S('text', { x: 6, y: 126.2, 'font-size': 5, 'font-family': CAP, fill: GREEN }, gDemo);
      const btn = function (x, w, label, fn) {
        const g = S('g', { 'data-interactive': '', style: 'cursor:pointer' }, gDemo);
        S('rect', { x: x, y: 113.5, width: w, height: 10, rx: 1.5, fill: '#fff', stroke: '#b7cde0', 'stroke-width': 0.6 }, g);
        const t = S('text', { x: x + w / 2, y: 120.4, 'font-size': 5.8, 'font-family': CAP, fill: MYBLUE, 'text-anchor': 'middle' }, g);
        t.textContent = label;
        g.addEventListener('click', function (e) { e.stopPropagation(); fn(); });
      };
      btn(141, 48, '2-OPT (1 troca)', function () { if (!busy) clickMove(); });
      btn(192, 40, '↺ nova rota', function () { gen++; busy = false; newInstance(); drawDemo(); });
      upd();
    }
    function redraw() { while (gArcs.firstChild) gArcs.removeChild(gArcs.firstChild); for (let k = 0; k < N; k++) drawArc(route[k], route[(k + 1) % N]); }
    function upd() {
      lenTxt.textContent = 'comprimento: ' + fmt(tlen(route)) + '   ·   movimentos 2-OPT: ' + moves;
      msg.textContent = bestMove() ? '' : 'nenhum 2-OPT melhora: ótimo local';
    }
    async function doMove(m, tw) {
      const a = route[m.i], b = route[m.i + 1], c = route[m.j], d = route[(m.j + 1) % N];
      const rem = [drawArc(a, b, '#d0281a', gDemo), drawArc(c, d, '#d0281a', gDemo)];
      await tw(500, function (e, t) { rem.forEach(function (g) { g.setAttribute('stroke-width', 1); g.firstChild.setAttribute('stroke-width', 0.5 + 1.1 * Math.sin(Math.PI * t)); }); });
      // tira os dois arcos, inverte o trecho b..c e traça os novos (a→c, b→d)
      const seg = route.slice(m.i + 1, m.j + 1).reverse();
      route = route.slice(0, m.i + 1).concat(seg, route.slice(m.j + 1));
      moves++;
      redraw(); rem.forEach(function (g) { g.remove(); });
      const kids = Array.prototype.slice.call(gArcs.childNodes);
      const novo = [kids[m.i], kids[m.j]];
      const segArcs = kids.slice(m.i + 1, m.j);
      novo.forEach(function (g) { g.firstChild.setAttribute('stroke', MYBLUE); g.lastChild.setAttribute('fill', MYBLUE); g.firstChild.setAttribute('stroke-width', 0.8); });
      segArcs.forEach(function (g) { g.firstChild.setAttribute('stroke', ORANGE); g.lastChild.setAttribute('fill', ORANGE); });
      const L = novo.map(function (g) { return g.firstChild.getTotalLength(); });
      await tw(450, function (e) { novo.forEach(function (g, k) { g.firstChild.style.strokeDasharray = L[k] + ' ' + (L[k] + 1); g.firstChild.style.strokeDashoffset = L[k] * (1 - e); }); });
      upd();
      await tw(350, function () {});
      redraw();
    }
    function tw(dur, fn) {
      const g = gen;
      return new Promise(function (res, rej) {
        const t0 = performance.now();
        (function fr(now) { if (g !== gen) { rej('cancel'); return; } const t = Math.min(1, (now - t0) / dur); fn(ease.inOut(t), t); if (t < 1) requestAnimationFrame(fr); else res(); })(t0);
      });
    }
    function clickMove() {
      const m = bestMove(); if (!m) return;
      busy = true;
      doMove(m, tw).catch(function () {}).then(function () { busy = false; });
    }

    function snap(st) {
      gen++; busy = false;
      while (gFx.firstChild) gFx.removeChild(gFx.firstChild);
      if (st === 'demo') {
        showSet([]); note(false);
        if (!pts.length) newInstance();
        drawDemo(); gDemo.style.display = '';
        return;
      }
      while (gDemo.firstChild) gDemo.removeChild(gDemo.firstChild);
      showSet(st === 'f' ? ALL : []); note(st === 'f');
    }
    async function play(a, b, h) {
      if (b === 'f') { snap('vazio'); await playFig(h); snap('f'); return; }
      if (b === 'demo') {
        snap('f');
        await h.tween(350, function (e) { gIt.setAttribute('opacity', 1 - e); gNote.setAttribute('opacity', 1 - e); });
        gIt.removeAttribute('opacity'); gNote.removeAttribute('opacity');
        seed = 7; newInstance(); snap('demo');
        gDemo.setAttribute('opacity', 0);
        await h.tween(350, function (e) { gDemo.setAttribute('opacity', e); });
        gDemo.removeAttribute('opacity');
        busy = true;
        try {
          await h.wait(500);
          for (let m = bestMove(); m; m = bestMove()) await doMove(m, h.tween);
        } finally { busy = false; }
        return;
      }
      snap(b);
    }
    return { snap: snap, play: play };
  });
})();
