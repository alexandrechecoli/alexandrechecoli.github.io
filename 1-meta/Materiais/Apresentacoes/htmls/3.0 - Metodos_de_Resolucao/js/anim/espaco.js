/* Espaço de busca (aula 3): força bruta × métodos de resolução. Mesmo estilo do lsprob.js da aula 7.
 *
 * Duas cenas (figura_camadas.py; quadro 248.72 × 144.4):
 *   data-fig="eb"  — espaco_busca1…3 (frames 25–27; dados/eb.js)
 *   data-fig="ebm" — espaco_busca6…9 (frames 33–36; dados/ebm.js). A curva sólida do Ipe fica escondida por
 *                    máscaras brancas; cada figura troca as máscaras e mostra mais um trecho.
 * Uso: <span class="anim pl" data-anim="espaco" data-fig="eb|ebm" data-from=".." data-state="espaco_buscaN"><img …></span>
 *
 *   eb:  vazio → 1   eixos se traçam, os rótulos s1…s15 entram um a um ("escrevemos todo o espaço no eixo x")
 *        1 → 2       FORÇA BRUTA: um varredor avalia s1, s2, …, s15 (haste até f(si), ponto, contador "k de 15");
 *                    o anel verde marca a melhor até agora; a curva é revelada junto; no fim, os pontos do PDF brotam
 *        2 → 3       s4 fica vermelho e pulsa; "ótimo global" entra palavra por palavra
 *   ebm: vazio → 6   eixos; a curva pontilhada (o espaço que não conhecemos) se desenha
 *        6 → 7, 7 → 8, 8 → 9   o MÉTODO avalia só alguns pontos: uma bolinha percorre a curva, os pontos brotam com o
 *                    rótulo, o trecho sólido é revelado atrás dela; contador 2 → 6 → 10; no 9 chega a s4 (anel verde)
 * Os contadores ("soluções avaliadas: …") ficam no estado final; o resto é a figura do PDF.
 */
(function () {
  'use strict';
  const A = window.Anim;
  if (!A) return;
  const S = A.svg, E = A.ease, lerp = A.lerp;
  const NAVY = '#00008b', RED = '#d0281a', GREEN = '#169b3a', MYBLUE = '#0061a5';
  const CAP = '"LM Sans 8", "LM Sans", sans-serif';
  const AXY = 125.68;                                   // eixo x (linha de base das hastes)
  const XS = function (i) { return 39.5 + 12 * (i - 1); };   // posição de s_i no eixo (rótulos girados do Ipe)
  const range = function (a, b, st) { const r = []; for (let i = a; i <= b; i += (st || 1)) r.push(i); return r; };
  const pairs = function (a, b) { return range(a, b, 2).map(function (i) { return [i, i + 1]; }); };

  const COUNT = {   // contadores que ficam no estado final
    espaco_busca2: ['soluções avaliadas: 15 de 15'], espaco_busca3: ['soluções avaliadas: 15 de 15'],
    espaco_busca7: ['soluções avaliadas: 2'], espaco_busca8: ['soluções avaliadas: 6'],
    espaco_busca9: ['soluções avaliadas: 10', 'e o ótimo global foi encontrado']
  };
  const MASKS = [1, 2, 3, 15, 16, 17, 18];             // ebm: retângulos brancos do Ipe sobre a curva sólida (item 0)

  // curva amostrada (como no lsprob.js da aula 7)
  function sampleD(d) {
    const n = d.match(/-?\d+(\.\d+)?/g).map(Number), pts = [[n[0], n[1]]];
    for (let i = 2; i + 5 < n.length; i += 6) {
      const p0 = pts[pts.length - 1];
      for (let k = 1; k <= 24; k++) {
        const t = k / 24, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, e = t * t * t;
        pts.push([a * p0[0] + b * n[i] + c * n[i + 2] + e * n[i + 4], a * p0[1] + b * n[i + 1] + c * n[i + 3] + e * n[i + 5]]);
      }
    }
    return pts.sort(function (p, q) { return p[0] - q[0]; });
  }
  function makeCurve(d) {
    const pts = sampleD(d);
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
    if (it.fo !== undefined) p.setAttribute('fill-opacity', it.fo);
    if (it.s) {
      p.setAttribute('stroke', it.s); p.setAttribute('stroke-width', it.w);
      if (it.da) p.setAttribute('stroke-dasharray', it.da);
      if (it.lj) p.setAttribute('stroke-linejoin', it.lj);
    }
    return p;
  }

  A.define('espaco', function (host) {
    const fig = host.dataset.fig, D = A.figData && A.figData[fig];
    if (!D) { console.warn('espaco: faltam os dados (dados/' + fig + '.js)'); return { snap: function () {}, play: null }; }
    const IT = D.items, W = D.W, H = D.H;
    const svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H });
    host.appendChild(svg);
    const defs = S('defs', null, svg), gIt = S('g', null, svg), gFx = S('g', null, svg), gTop = S('g', null, svg);
    const els = IT.map(function (it) { return mk(it, gIt); });
    // máscaras logo acima da curva sólida e abaixo de todo o resto (a ordem mesclada do figura_camadas as punha
    // por cima da curva pontilhada); um marcador separa "máscaras" de "resto" para os recortes temporários
    const cover = S('g', null);
    if (fig === 'ebm') {
      gIt.insertBefore(cover, els[0].nextSibling);
      MASKS.slice().reverse().forEach(function (i) { gIt.insertBefore(els[i], cover); });
    }
    const base = els.map(function (e) { return e.getAttribute('transform') || ''; });
    const Y = makeCurve(IT[0].d);
    const uid = Math.random().toString(36).slice(2);
    const ST = function (s) { return s === 'vazio' ? [] : D.states[s] || []; };

    // ---------- utilidades ----------
    function setT(i, s) { const t = ((s || '') + ' ' + base[i]).trim(); if (t) els[i].setAttribute('transform', t); else els[i].removeAttribute('transform'); }
    function reset(i) { const e = els[i]; e.style.opacity = ''; setT(i, null); e.removeAttribute('clip-path'); e.style.strokeDasharray = ''; e.style.strokeDashoffset = ''; e.style.fill = ''; }
    function show(ids, on) { ids.forEach(function (i) { els[i].style.display = on === false ? 'none' : ''; }); }
    function showSet(ids) { const s = new Set(ids); els.forEach(function (e, i) { reset(i); e.style.display = s.has(i) ? '' : 'none'; }); }
    const ctr = function (ids) {
      const b = [Infinity, Infinity, -Infinity, -Infinity];
      ids.forEach(function (i) { const q = IT[i].b; b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[2]); b[3] = Math.max(b[3], q[3]); });
      return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
    };
    function fade(h, ids, to, dur) {
      show(ids); const from = to ? 0 : 1;
      ids.forEach(function (i) { els[i].style.opacity = from; });
      return h.tween(dur || 300, function (e) { ids.forEach(function (i) { els[i].style.opacity = lerp(from, to, e); }); })
        .then(function () { ids.forEach(function (i) { els[i].style.opacity = ''; }); if (!to) show(ids, false); });
    }
    function pop(h, ids, c, dur) {
      c = c || ctr(ids);
      show(ids);
      return h.tween(dur || 300, function (e, t) {
        ids.forEach(function (i) {
          els[i].style.opacity = Math.min(1, t * 3);
          setT(i, 'translate(' + c[0] + ' ' + c[1] + ') scale(' + Math.max(0.001, E.back(t)) + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')');
        });
      }, E.linear).then(function () { ids.forEach(reset); });
    }
    function trace(h, i, dur) {
      const el = els[i]; show([i]); reset(i);
      const L = el.getTotalLength();
      el.style.strokeDasharray = L + ' ' + (L + 1); el.style.strokeDashoffset = L;
      return h.tween(dur || 450, function (e) { el.style.strokeDashoffset = L * (1 - e); }, E.inOut).then(function () { reset(i); });
    }
    function clipRect() {
      const cp = S('clipPath', { id: 'eb' + uid + Math.random().toString(36).slice(2, 7) }, defs);
      return { id: cp.id, r: S('rect', { x: 0, y: -5, width: 0, height: H + 10 }, cp) };
    }
    // revela itens da esquerda para a direita até x (o retângulo de recorte acompanha)
    function wiper(ids, xa) {
      const c = clipRect();
      show(ids); ids.forEach(function (i) { els[i].setAttribute('clip-path', 'url(#' + c.id + ')'); });
      c.r.setAttribute('x', xa - 2);
      return { to: function (x) { c.r.setAttribute('width', Math.max(0, x - xa + 2)); }, done: function () { ids.forEach(function (i) { els[i].removeAttribute('clip-path'); }); } };
    }
    // ebm: "tampa" branca temporária sobre a curva sólida (abaixo da pontilhada) que recua de xa até xb
    function lid(xa, xb, ya, yb) {
      const r = S('rect', { x: xa, y: ya, width: xb - xa, height: yb - ya, fill: '#fff' }, cover);
      return { to: function (x) { r.setAttribute('x', Math.min(x, xb)); r.setAttribute('width', Math.max(0, xb - x)); }, rm: function () { r.remove(); } };
    }
    function ring(h, p, color, dur) {
      const c = S('circle', { cx: p[0], cy: p[1], r: 1, fill: 'none', stroke: color, 'stroke-width': 0.8 }, gFx);
      return h.tween(dur || 650, function (e) { c.setAttribute('r', 1 + 9 * e); c.setAttribute('opacity', 1 - e); }, E.out).then(function () { c.remove(); });
    }
    function ball(x) {   // bolinha como as do PDF (anel azul, miolo branco)
      const g = S('g', null, gFx);
      S('circle', { r: 1.6, fill: NAVY }, g); S('circle', { r: 0.85, fill: '#fff' }, g);
      g.at = function (q) { g.setAttribute('transform', 'translate(' + q.toFixed(2) + ' ' + Y(q).toFixed(2) + ')'); };
      g.at(x);
      return g;
    }
    function counter(st) {   // texto que fica no estado final
      while (gTop.firstChild) gTop.removeChild(gTop.firstChild);
      const lines = COUNT[st]; if (!lines) return null;
      const t = S('text', { x: 236, y: 9, 'font-size': 6.2, 'font-family': CAP, fill: MYBLUE, 'text-anchor': 'end' }, gTop);
      t.textContent = lines[0];
      if (lines[1]) { const u = S('text', { x: 236, y: 16.5, 'font-size': 6.2, 'font-family': CAP, fill: GREEN, 'text-anchor': 'end' }, gTop); u.textContent = lines[1]; }
      return t;
    }
    function same(a, b) {
      const P = IT[a], Q = IT[b];
      if (P.t !== Q.t) return false;
      for (let k = 0; k < 4; k++) if (Math.abs(P.b[k] - Q.b[k]) > 0.6) return false;
      if (P.t === 'x') return P.tx === Q.tx && P.c === Q.c;
      return P.f === Q.f && P.s === Q.s && P.w === Q.w && P.da === Q.da;
    }
    // caminho da bolinha de x0 a x1; em cada parada (x, ids que brotam) chama a função
    // jump = [xa, xb]: nesse trecho a bolinha salta em arco (o método não avalia o que fica no meio)
    async function walk(h, x0, x1, dur, stops, wp, lids, jump) {
      const b = ball(x0), done = {};
      await h.tween(dur, function (e) {
        const x = lerp(x0, x1, e);
        if (jump && x > jump[0] && x < jump[1]) {
          const u = (x - jump[0]) / (jump[1] - jump[0]);
          b.setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + (lerp(Y(jump[0]), Y(jump[1]), u) - Math.sin(Math.PI * u) * 22).toFixed(2) + ')');
        } else b.at(x);
        if (wp) wp.to(x); if (lids) lids.forEach(function (l) { l.to(x); });
        stops.forEach(function (s, k) { if (!done[k] && x >= s[0] - 0.01) { done[k] = true; s[1](); } });
      }, E.inOut);
      stops.forEach(function (s, k) { if (!done[k]) s[1](); });
      return b;
    }

    // ---------- cenas ----------
    const LAB = pairs(20, 51).filter(function (p) { return p[0] !== 26; });   // eb: rótulos s1…s15 (26/27 = s4 vermelho do frame 27)
    async function enumerar(h) {         // vazio → espaco_busca1
      await h.all([trace(h, 1, 450), trace(h, 3, 550)]);
      await h.all([pop(h, [2], [28.89, 7], 200), pop(h, [4], [243, 125.68], 200), fade(h, range(13, 19), 1, 300)]);
      for (const p of LAB) { await pop(h, p, ctr(p), 180); await h.wait(40); }
    }
    async function forcaBruta(h) {       // espaco_busca1 → 2
      const cnt = S('text', { x: 236, y: 9, 'font-size': 6.2, 'font-family': CAP, fill: MYBLUE, 'text-anchor': 'end' }, gTop);
      cnt.textContent = 'soluções avaliadas: 0 de 15';
      const wp = wiper([0], 28.89);
      const best = S('circle', { r: 2.8, fill: 'none', stroke: GREEN, 'stroke-width': 0.8, opacity: 0 }, gFx);
      const bl = S('text', { 'font-size': 5, 'font-family': CAP, fill: GREEN, opacity: 0 }, gFx);
      bl.textContent = 'melhor até agora';
      let by = -1, x = 28.89;
      const sticks = [];
      for (let i = 1; i <= 15; i++) {
        const xi = XS(i), yi = Y(xi), xa = x;
        await h.tween(i < 4 ? 260 : 150, function (e) { x = lerp(xa, xi, e); wp.to(x); });
        const st = S('path', { d: 'M' + xi + ' ' + AXY + 'V' + AXY, stroke: '#8899bb', 'stroke-width': 0.4, 'stroke-dasharray': '1 1', fill: 'none' }, gFx);
        const dt = S('circle', { cx: xi, cy: yi, r: 1.1, fill: NAVY, opacity: 0 }, gFx);
        sticks.push(st, dt);
        await h.tween(i < 4 ? 220 : 120, function (e) { st.setAttribute('d', 'M' + xi + ' ' + AXY + 'V' + lerp(AXY, yi, e)); dt.setAttribute('opacity', e); });
        cnt.textContent = 'soluções avaliadas: ' + i + ' de 15';
        if (yi > by) {   // menor f = mais baixo no gráfico
          by = yi; best.setAttribute('cx', xi); best.setAttribute('cy', yi); best.setAttribute('opacity', 1);
          bl.setAttribute('x', xi + 3.5); bl.setAttribute('y', yi + 7); bl.setAttribute('opacity', 1);
          ring(h, [xi, yi], GREEN, 400).catch(function () {});
        }
      }
      await h.tween(300, function (e) { wp.to(lerp(x, 221, e)); });
      wp.done();
      await fade(h, [5], 1, 300);
      await h.all([pop(h, [6, 8], [75.48, 113.83]), pop(h, [11, 12], [141.23, 107.17]), pop(h, [9, 10], [220.83, 68.57])]);
      await h.tween(450, function (e) { sticks.concat([best, bl]).forEach(function (s) { s.setAttribute('opacity', 1 - e); }); });
      while (gFx.firstChild) gFx.removeChild(gFx.firstChild);
    }
    async function otimo(h) {            // espaco_busca2 → 3
      show([28, 29], false); show([26, 27]);
      [26, 27].forEach(function (i) { els[i].style.fill = '#000000'; });
      await h.all([ring(h, [75.48, 113.83], RED, 700),
        h.tween(450, function (e) { [26, 27].forEach(function (i) { els[i].style.fill = A.mix('#000000', '#8b0000', e); }); })]);
      [26, 27].forEach(function (i) { els[i].style.fill = ''; });
      show([8], false); await pop(h, [7], [75.48, 113.83], 300);
      for (const i of [52, 53]) await fade(h, [i], 1, 220);
    }
    async function desconhecido(h) {     // ebm: vazio → espaco_busca6
      await h.all([trace(h, 6, 450), trace(h, 33, 550)]);
      await h.all([pop(h, [7], [28.89, 7], 200), pop(h, [34], [243, 125.68], 200), fade(h, range(36, 42), 1, 300), fade(h, [35], 1, 300)]);
      const wp = wiper([5], 28.89);
      await h.tween(1300, function (e) { wp.to(lerp(28.89, 221, e)); }, E.inOut);
      wp.done();
    }
    // um trecho avaliado pelo método: tampas sobre o que vai aparecer recuam com a bolinha
    async function metodo(h, x0, x1, ys, stops, n0, n1, dur, jump) {
      const cnt = counter('x') || S('text', { x: 236, y: 9, 'font-size': 6.2, 'font-family': CAP, fill: MYBLUE, 'text-anchor': 'end' }, gTop);
      cnt.textContent = 'soluções avaliadas: ' + n0;
      const lids = [lid(x0 - 1, x1 + 1, ys[0], ys[1])];
      let n = n0;
      const st = stops.map(function (s) { return [s[0], function () { pop(h, s[1], s[2], 260).catch(function () {}); if (s[3]) { n++; cnt.textContent = 'soluções avaliadas: ' + n; } }]; });
      const b = await walk(h, x0, x1, dur, st, null, lids, jump);
      lids.forEach(function (l) { l.rm(); });
      cnt.textContent = 'soluções avaliadas: ' + n1;
      await h.tween(250, function (e) { b.setAttribute('opacity', 1 - e); });
      b.remove();
    }
    const SCENE = {
      espaco_busca1: enumerar, espaco_busca2: forcaBruta, espaco_busca3: otimo, espaco_busca6: desconhecido,
      espaco_busca7: async function (h) {   // s16 e s17 (o trecho entre os dois)
        show([0, 3, 17, 18]);
        await metodo(h, 208.83, 220.83, [24, 118], [[208.83, [19, 20, 59, 60], [208.83, 36.57], 1], [220.8, [13, 14, 61, 62], [220.83, 68.57], 1]], 0, 2, 900);
      },
      espaco_busca8: async function (h) {   // s8 → s11: desce o vale da direita
        show([3, 17], false); show([2, 16]);
        await metodo(h, 120.83, 156.83, [60, 118.2],
          [[120.83, [23, 24, 51, 52], [120.83, 96.57], 1], [XS(9), [53, 54], ctr([53, 54]), 1], [XS(10), [55, 56], ctr([55, 56]), 1],
           [156.8, [21, 22, 57, 58], [156.83, 100.57], 1]], 2, 6, 1800);
      },
      espaco_busca9: async function (h) {   // s1 → s5: o vale da esquerda, com o ótimo global em s4
        show([2, 16], false); show([1, 15]);
        await metodo(h, 29.14, 86.34, [40, 118.2],
          [[29.14, [29, 30], [29.14, 85.3], 0], [35.74, [31, 32, 43, 44], [35.74, 62.08], 1], [64.72, [25, 26, 45, 46], [64.72, 96.51], 1],
           [75.48, [11, 12, 47, 48], [75.48, 113.83], 1], [86.3, [27, 28, 49, 50], [86.34, 96.51], 1]], 6, 10, 2400, [35.74, 64.72]);
        await ring(h, [75.48, 113.83], GREEN, 800);
        const t = S('text', { x: 236, y: 16.5, 'font-size': 6.2, 'font-family': CAP, fill: GREEN, 'text-anchor': 'end', opacity: 0 }, gTop);
        t.textContent = COUNT.espaco_busca9[1];
        await h.tween(350, function (e) { t.setAttribute('opacity', e); });
      }
    };

    function snap(st) {
      while (gFx.firstChild) gFx.removeChild(gFx.firstChild);
      while (cover.firstChild) cover.removeChild(cover.firstChild);
      showSet(ST(st)); counter(st);
    }
    async function play(a, b, h) {
      snap(a);
      // itens com a mesma geometria (eixos/curva redesenhados pelo Ipe) trocam sem animar
      const sb = new Set(ST(b)), sa = new Set(ST(a));
      const leave = ST(a).filter(function (i) { return !sb.has(i); });
      ST(b).filter(function (i) { return !sa.has(i); }).forEach(function (e) {
        const k = leave.findIndex(function (l) { return same(l, e); });
        if (k >= 0) { show([leave[k]], false); show([e]); leave.splice(k, 1); }
      });
      if (a === 'vazio') { showSet([]); while (gTop.firstChild) gTop.removeChild(gTop.firstChild); }
      if (SCENE[b]) await SCENE[b](h);
      snap(b);
    }
    return { snap: snap, play: play };
  });
})();
