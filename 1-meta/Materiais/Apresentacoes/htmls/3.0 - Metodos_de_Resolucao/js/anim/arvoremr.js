/* Árvore dos métodos de resolução (aula 3, frames 37, 38, 41, 58, 60, 62, 63, 65, 69; figuras metodos_resolucao1…8
 * do Ipe em camadas, dados/mr.js, quadro 401.2 × 172.4). Mesmo estilo do metodos.js da aula 7.
 * As 8 figuras só diferem nas caixas de destaque (itens 0–11, atrás da árvore).
 * Uso: <span class="anim pl" data-anim="arvoremr" data-from="metodos_resolucaoK" data-state="metodos_resolucaoN"><img …></span>
 *   vazio → 1   a árvore cresce nível a nível: arestas traçadas do pai, pontas brotam, rótulos entram palavra por palavra
 *   K → N       o destaque anterior encolhe e some; o caminho da raiz até cada nó novo acende em azul (aresta por
 *               aresta), o destaque novo se abre da esquerda para a direita e o azul apaga (estado final = PDF)
 *   N → N       (frame 62, mesma figura do 60) o destaque pulsa
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease, lerp = Anim.lerp;
  const FD = Anim.figData || {};
  const MYBLUE = '#0061a5';
  const range = function (a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
  // níveis da árvore: [aresta, rótulos]
  const LEVELS = [
    [[12, [43]], [14, [44]]],
    [[16, [55, 56, 57]], [18, [58, 59, 60]], [20, [61, 62]], [36, [45]], [38, [46, 47, 48]]],
    [[22, [63, 64, 65]], [24, [66, 67, 68]], [26, [69, 70, 71]], [28, [49]], [30, [50, 51]]],
    [[32, [53, 54]], [34, [52]]]
  ];
  // caixa de destaque -> caminho (arestas) desde a raiz
  const PATH = { 10: [12], 11: [14], 6: [12, 16], 7: [12, 16, 22], 8: [12, 16, 24], 9: [12, 16, 26],
    5: [14, 38], 4: [14, 36], 3: [14, 36, 30], 2: [14, 36, 28], 0: [14, 36, 28, 32], 1: [14, 36, 28, 34] };
  const HL = range(0, 11);

  function mk(it, parent) {
    if (it.t === 'x') {
      const t = S('text', { x: it.x, y: it.y, 'font-size': it.fs, 'font-family': it.ff, fill: it.c }, parent);
      if (it.tx.length > 1) { t.setAttribute('textLength', (it.b[2] - it.b[0]).toFixed(2)); t.setAttribute('lengthAdjust', 'spacing'); }
      t.textContent = it.tx;
      return t;
    }
    const p = S('path', { d: it.d, fill: it.f || 'none' }, parent);
    if (it.fo !== undefined) p.setAttribute('fill-opacity', it.fo);
    if (it.s) { p.setAttribute('stroke', it.s); p.setAttribute('stroke-width', it.w); }
    return p;
  }

  Anim.define('arvoremr', function (host) {
    const D = FD.mr;
    if (!D) { console.warn('arvoremr: faltam os dados (dados/mr.js)'); return { snap: function () {}, play: null }; }
    const IT = D.items;
    const svg = S('svg', { viewBox: '0 0 ' + D.W + ' ' + D.H });
    host.appendChild(svg);
    const gIt = S('g', null, svg), gFx = S('g', null, svg);
    const els = IT.map(function (it) { return mk(it, gIt); });
    // "…5p" = mesma figura do 5 (frame 62): o core não anima de um estado para ele mesmo, o apelido faz o destaque pulsar
    const ST = function (s) { return s === 'vazio' ? [] : D.states[String(s).replace(/p$/, '')] || []; };

    function reset(i) { const e = els[i]; e.style.opacity = ''; e.removeAttribute('transform'); e.style.strokeDasharray = ''; e.style.strokeDashoffset = ''; }
    function show(ids, on) { ids.forEach(function (i) { els[i].style.display = on === false ? 'none' : ''; }); }
    function showSet(ids) { const s = new Set(ids); els.forEach(function (e, i) { reset(i); e.style.display = s.has(i) ? '' : 'none'; }); }
    const box = function (i) { return IT[i].b; };
    const ctr = function (i) { const b = box(i); return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; };
    function pop(h, ids, c, dur) {
      show(ids);
      return h.tween(dur || 200, function (e, t) {
        ids.forEach(function (i) { els[i].style.opacity = Math.min(1, t * 3); els[i].setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ') scale(' + Math.max(0.001, ease.back(t)) + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')'); });
      }, ease.linear).then(function () { ids.forEach(reset); });
    }
    function trace(h, i, dur) {
      const el = els[i]; show([i]); reset(i);
      const L = el.getTotalLength();
      el.style.strokeDasharray = L + ' ' + (L + 1); el.style.strokeDashoffset = L;
      return h.tween(dur || 300, function (e) { el.style.strokeDashoffset = L * (1 - e); }, ease.out).then(function () { reset(i); });
    }
    async function words(h, ids) {
      for (const i of ids) {
        show([i]); els[i].style.opacity = 0;
        await h.tween(140, function (e) { els[i].style.opacity = e; els[i].setAttribute('transform', 'translate(0 ' + (1.2 * (1 - e)) + ')'); }, ease.out);
        reset(i);
      }
    }
    async function grow(h) {   // vazio → metodos_resolucao1
      await words(h, [40, 41, 42]);
      for (const lv of LEVELS) {
        await h.all(lv.map(function (n) {
          return trace(h, n[0], 320).then(function () {
            const hd = n[0] + 1;
            return pop(h, [hd], [box(hd)[0] + (box(hd)[2] - box(hd)[0]) / 2, box(hd)[1] + (box(hd)[3] - box(hd)[1]) / 2], 150);
          }).then(function () { return words(h, n[1]); });
        }));
      }
    }
    // caminho azul por cima das arestas (cópias), aresta por aresta
    async function lightPath(h, edges, overlays) {
      for (const e of edges) {
        const p = S('path', { d: IT[e].d, stroke: MYBLUE, 'stroke-width': 1.8, fill: 'none', 'stroke-linecap': 'round' }, gFx);
        const L = p.getTotalLength();
        p.style.strokeDasharray = L + ' ' + (L + 1); p.style.strokeDashoffset = L;
        overlays.push(p);
        await h.tween(260, function (t) { p.style.strokeDashoffset = L * (1 - t); }, ease.inOut);
      }
    }
    function openBox(h, i) {   // destaque se abre da esquerda para a direita
      show([i]);
      const b = box(i), x0 = b[0];
      return h.tween(380, function (e) {
        els[i].setAttribute('transform', 'translate(' + x0 + ' 0) scale(' + Math.max(0.001, e) + ' 1) translate(' + (-x0) + ' 0)');
      }, ease.out).then(function () { reset(i); });
    }
    function shrinkBox(h, i) {
      const c = ctr(i);
      return h.tween(300, function (e) {
        els[i].style.opacity = 1 - e;
        els[i].setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ') scale(' + (1 - 0.4 * e) + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')');
      }).then(function () { reset(i); show([i], false); });
    }
    function pulse(h, ids) {
      return h.all(ids.map(function (i) {
        const c = ctr(i);
        return h.tween(600, function (e, t) {
          const s = 1 + 0.12 * Math.sin(Math.PI * t);
          els[i].setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ') scale(' + s + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')');
        }, ease.linear).then(function () { reset(i); });
      }));
    }
    async function highlight(h, a, b) {
      const sa = new Set(ST(a)), sb = new Set(ST(b));
      const oldH = HL.filter(function (i) { return sa.has(i) && !sb.has(i); }), newH = HL.filter(function (i) { return sb.has(i) && !sa.has(i); });
      if (!oldH.length && !newH.length) { await pulse(h, HL.filter(function (i) { return sb.has(i); })); return; }
      await h.all(oldH.map(function (i) { return shrinkBox(h, i); }));
      const ov = [];
      // caminhos de todos os destaques novos (as arestas comuns acendem uma vez só)
      const done = new Set();
      for (const i of newH) {
        const edges = PATH[i].filter(function (e) { return !done.has(e); });
        edges.forEach(function (e) { done.add(e); });
        await lightPath(h, edges, ov);
        await openBox(h, i);
      }
      await h.wait(250);
      await h.tween(400, function (e) { ov.forEach(function (p) { p.style.opacity = 1 - e; }); });
      ov.forEach(function (p) { p.remove(); });
    }

    function snap(st) { while (gFx.firstChild) gFx.removeChild(gFx.firstChild); showSet(ST(st)); }
    async function play(a, b, h) {
      if (a === 'vazio') { showSet([]); while (gFx.firstChild) gFx.removeChild(gFx.firstChild); await grow(h); }
      else { snap(a); await highlight(h, a, b); }
      snap(b);
    }
    return { snap: snap, play: play };
  });
})();
