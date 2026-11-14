/* Exato × aproximativo (aula 3, frames 39 e 40; figura solucao_exata_aproximada do Ipe em camadas, dados/sea.js,
 * quadro 477 × 148.3: dois gráficos com a mesma curva, o da direita deslocado 224 pt). Estilo do lsprob.js (aula 7).
 * Uso: <span class="anim pl" data-anim="exapx" data-from=".." data-state="f|f2"><img …></span>
 *   vazio → f   (frame 39) esquerda: eixos e curva se desenham; o EXATO varre todo o espaço (anel verde = melhor até
 *               agora) e termina em s4: "ótimo global garantido ✓"; ponto, seta e "solução exata" entram.
 *               direita: eixos e curva; o APROXIMATIVO (bolinha, busca local) desce de s12 até o vale de s10; ponto,
 *               seta e "solução aproximada" entram; cota Δ entre o nível dela e o do ótimo global ("não é o ótimo")
 *   f → f2      (frame 40) direita: uma 2ª bolinha parte do morro da esquerda e cai no vale de s4: "pode achar o ótimo,
 *               mas sem garantia"
 * Ficam no estado final: a cota Δ (f, f2) e a 2ª solução com a legenda (f2); o resto é a figura do PDF.
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease, lerp = Anim.lerp;
  const FD = Anim.figData || {};
  const NAVY = '#00008b', GREEN = '#169b3a', RED = '#d0281a';
  const CAP = '"LM Sans 8", "LM Sans", sans-serif';
  const OFF = 224, GX = 79.16, GY = 113.83, AX = 368.91, AY = 107.17;   // ótimo global (esq.), solução aproximada (dir.)
  const range = function (a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
  const LT = range(20, 56), RT = range(57, 93);                         // rótulos de cada gráfico

  function sampleD(d) {
    const n = d.match(/-?\d+(\.\d+)?/g).map(Number), pts = [[n[0], n[1]]];
    for (let i = 2; i + 5 < n.length; i += 6) {
      const p0 = pts[pts.length - 1];
      for (let k = 1; k <= 24; k++) {
        const t = k / 24, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, e = t * t * t;
        pts.push([a * p0[0] + b * n[i] + c * n[i + 2] + e * n[i + 4], a * p0[1] + b * n[i + 1] + c * n[i + 3] + e * n[i + 5]]);
      }
    }
    pts.sort(function (p, q) { return p[0] - q[0]; });
    return function (x) {
      x = Math.max(pts[0][0], Math.min(pts[pts.length - 1][0], x));
      let lo = 0, hi = pts.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m][0] <= x) lo = m; else hi = m; }
      const f = pts[hi][0] > pts[lo][0] ? (x - pts[lo][0]) / (pts[hi][0] - pts[lo][0]) : 0;
      return lerp(pts[lo][1], pts[hi][1], f);
    };
  }
  function mk(it, parent) {
    if (it.t === 'x') {
      const t = S('text', { x: it.x, y: it.y, 'font-size': it.fs, 'font-family': it.ff, fill: it.c }, parent);
      if (it.st) t.setAttribute('font-style', it.st);
      if (it.r) t.setAttribute('transform', 'rotate(' + it.r + ' ' + it.x + ' ' + it.y + ')');
      t.textContent = it.tx;
      return t;
    }
    const p = S('path', { d: it.d, fill: it.f || 'none' }, parent);
    if (it.s) { p.setAttribute('stroke', it.s); p.setAttribute('stroke-width', it.w); if (it.da) p.setAttribute('stroke-dasharray', it.da); }
    return p;
  }

  Anim.define('exapx', function (host) {
    const D = FD.sea;
    if (!D) { console.warn('exapx: faltam os dados (dados/sea.js)'); return { snap: function () {}, play: null }; }
    const IT = D.items;
    const svg = S('svg', { viewBox: '0 0 ' + D.W + ' ' + D.H });
    host.appendChild(svg);
    const gIt = S('g', null, svg), gNote = S('g', null, svg), gFx = S('g', null, svg);
    const els = IT.map(function (it) { return mk(it, gIt); });
    const base = els.map(function (e) { return e.getAttribute('transform') || ''; });
    const YL = sampleD(IT[0].d), YR = sampleD(IT[8].d);
    const ALL = range(0, IT.length - 1);

    function setT(i, s) { const t = ((s || '') + ' ' + base[i]).trim(); if (t) els[i].setAttribute('transform', t); else els[i].removeAttribute('transform'); }
    function reset(i) { const e = els[i]; e.style.opacity = ''; setT(i, null); e.style.strokeDasharray = ''; e.style.strokeDashoffset = ''; }
    function show(ids, on) { ids.forEach(function (i) { els[i].style.display = on === false ? 'none' : ''; }); }
    function showSet(ids) { const s = new Set(ids); els.forEach(function (e, i) { reset(i); e.style.display = s.has(i) ? '' : 'none'; }); }
    function fade(h, ids, dur) {
      show(ids); ids.forEach(function (i) { els[i].style.opacity = 0; });
      return h.tween(dur || 300, function (e) { ids.forEach(function (i) { els[i].style.opacity = e; }); }).then(function () { ids.forEach(reset); });
    }
    function trace(h, i, dur) {
      const el = els[i]; show([i]); reset(i);
      const L = el.getTotalLength();
      el.style.strokeDasharray = L + ' ' + (L + 1); el.style.strokeDashoffset = L;
      return h.tween(dur || 450, function (e) { el.style.strokeDashoffset = L * (1 - e); }, ease.inOut).then(function () { reset(i); });
    }
    function pop(h, ids, c, dur) {
      show(ids);
      return h.tween(dur || 280, function (e, t) {
        ids.forEach(function (i) { els[i].style.opacity = Math.min(1, t * 3); setT(i, 'translate(' + c[0] + ' ' + c[1] + ') scale(' + Math.max(0.001, ease.back(t)) + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')'); });
      }, ease.linear).then(function () { ids.forEach(reset); });
    }
    function ring(h, p, col, dur) {
      const c = S('circle', { cx: p[0], cy: p[1], r: 1, fill: 'none', stroke: col, 'stroke-width': 0.8 }, gFx);
      return h.tween(dur || 650, function (e) { c.setAttribute('r', 1 + 10 * e); c.setAttribute('opacity', 1 - e); }, ease.out).then(function () { c.remove(); });
    }
    function ball(parent) {
      const g = S('g', null, parent || gFx);
      S('circle', { r: 2, fill: NAVY }, g); S('circle', { r: 1.05, fill: '#fff' }, g);
      g.at = function (x, y) { g.setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ')'); };
      return g;
    }
    function text(parent, txt, x, y, col, anchor, size) {
      const t = S('text', { x: x, y: y, 'font-size': size || 6.4, 'font-family': CAP, fill: col, 'text-anchor': anchor || 'start' }, parent);
      t.textContent = txt; return t;
    }
    async function words(h, ids) { for (const i of ids) await fade(h, [i], 180); }

    // notas que ficam: a cota Δ (f, f2) e a 2ª solução do aproximativo (f2)
    function notes(st) {
      while (gNote.firstChild) gNote.removeChild(gNote.firstChild);
      if (st !== 'f' && st !== 'f2') return {};
      const g = S('g', null, gNote);
      const lv = S('path', { d: 'M' + (GX + OFF) + ' ' + GY + 'H' + (AX + 10), stroke: RED, 'stroke-width': 0.5, 'stroke-dasharray': '2 1.2', fill: 'none' }, g);
      const dl = S('path', { d: 'M' + (AX + 8) + ' ' + (AY + 0.6) + 'V' + (GY - 0.6) + 'M' + (AX + 6.5) + ' ' + AY + 'h3M' + (AX + 6.5) + ' ' + GY + 'h3', stroke: RED, 'stroke-width': 0.6, fill: 'none' }, g);
      const tx = text(g, 'Δ: não é o ótimo', AX + 11, GY + 1, RED, 'start', 5.6);
      const out = { g: g, parts: [lv, dl, tx] };
      if (st === 'f2') {
        const g2 = S('g', null, gNote);
        const b = ball(g2); b.at(GX + OFF, GY);
        S('circle', { cx: GX + OFF, cy: GY, r: 3.4, fill: 'none', stroke: GREEN, 'stroke-width': 0.7 }, g2);
        // legenda no espaço livre acima do vale (entre o morro da esquerda e o de s6), seta até o ponto
        text(g2, 'pode achar o ótimo,', GX + OFF, 26, GREEN, 'middle', 5.6);
        text(g2, 'mas sem garantia', GX + OFF, 32.5, GREEN, 'middle', 5.6);
        S('path', { d: 'M' + (GX + OFF) + ' 35V' + (GY - 5), stroke: GREEN, 'stroke-width': 0.5, 'stroke-dasharray': '1.5 1', fill: 'none' }, g2);
        S('path', { d: 'M' + (GX + OFF) + ' ' + (GY - 3.6) + 'l-1.2 -2.6h2.4Z', fill: GREEN }, g2);
        out.g2 = g2;
      }
      return out;
    }

    async function left(h) {
      await h.all([trace(h, 1, 400), trace(h, 3, 500)]);
      await h.all([pop(h, [2], [32.57, 7], 200), pop(h, [4], [247, 125.68], 200), fade(h, LT, 350)]);
      await fade(h, [5], 250);
      await trace(h, 0, 900);
      // exato: varre o espaço inteiro guardando o melhor
      const scan = S('path', { stroke: '#8899bb', 'stroke-width': 0.5, 'stroke-dasharray': '1 1', fill: 'none' }, gFx);
      const best = S('circle', { r: 3, fill: 'none', stroke: GREEN, 'stroke-width': 0.8, opacity: 0 }, gFx);
      let by = -1;
      await h.tween(1500, function (e) {
        const x = lerp(32.57, 224.57, e), y = YL(x);
        scan.setAttribute('d', 'M' + x + ' 125.68V' + y);
        if (y > by) { by = y; best.setAttribute('cx', x); best.setAttribute('cy', y); best.setAttribute('opacity', 1); }
      }, ease.inOut);
      scan.remove();
      await ring(h, [GX, GY], GREEN, 600);
      const g = text(gFx, 'ótimo global garantido ✓', GX + 6, GY + 9, GREEN, 'start', 5.8);
      await pop(h, [6, 7], [GX, GY], 280); best.remove();
      await trace(h, 16, 400); await pop(h, [17], [76.2, 104.2], 160);
      await words(h, [94, 95]);
      await h.wait(900);
      await h.tween(350, function (e) { g.setAttribute('opacity', 1 - e); }); g.remove();
    }
    async function right(h) {
      await h.all([trace(h, 9, 400), trace(h, 11, 500)]);
      await h.all([pop(h, [10], [256.57, 7], 200), pop(h, [12], [471, 125.68], 200), fade(h, RT, 350)]);
      await fade(h, [13], 250);
      await trace(h, 8, 900);
      // aproximativo: busca local desce de s12 até o vale mais próximo
      const b = ball(), x0 = 404;
      b.at(x0, YR(x0));
      await ring(h, [x0, YR(x0)], NAVY, 400);
      await h.tween(1300, function (e) { const x = lerp(x0, AX, e); b.at(x, YR(x)); }, ease.out);
      await pop(h, [14, 15], [AX, AY], 280); b.remove();
      await trace(h, 18, 400); await pop(h, [19], [366.76, 101.96], 160);
      await words(h, [96, 97]);
      const n = notes('f'); n.parts.forEach(function (p) { p.setAttribute('opacity', 0); });
      for (const p of n.parts) await h.tween(300, function (e) { p.setAttribute('opacity', e); });
    }
    async function second(h) {   // f → f2
      const b = ball(), x0 = 270;
      b.at(x0, YR(x0));
      await ring(h, [x0, YR(x0)], NAVY, 400);
      await h.tween(1300, function (e) { const x = lerp(x0, GX + OFF, e); b.at(x, YR(x)); }, ease.out);
      await ring(h, [GX + OFF, GY], GREEN, 700);
      b.remove();
      const n = notes('f2'); n.g2.setAttribute('opacity', 0);
      await h.tween(400, function (e) { n.g2.setAttribute('opacity', e); });
    }

    function snap(st) {
      while (gFx.firstChild) gFx.removeChild(gFx.firstChild);
      showSet(st === 'f' || st === 'f2' ? ALL : []); notes(st);
    }
    async function play(a, b, h) {
      if (a === 'vazio' && b === 'f') { snap('vazio'); await left(h); await right(h); }
      else if (a === 'f' && b === 'f2') { snap('f'); await second(h); }
      snap(b);
    }
    return { snap: snap, play: play };
  });
})();
