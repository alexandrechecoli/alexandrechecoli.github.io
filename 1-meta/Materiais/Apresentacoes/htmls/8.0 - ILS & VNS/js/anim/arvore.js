/* Árvore "Estratégias para melhorar busca local" (aula 8, slides 4 e 20; figuras img/metodo e img/metodo2).
 * Adaptado de metodos.js da aula 7 (mesma árvore; números dos itens refeitos para js/anim/dados/met.js desta aula).
 *
 *   vazio → metodo      a árvore cresce da raiz, nível a nível (seta sai do ponto do pai, ponta e ponto do
 *                       filho brotam, rótulo palavra por palavra); depois o caminho até o Iterative local
 *                       search acende em azul e o destaque se abre da esquerda para a direita
 *   metodo → metodo2    o destaque do ILS apaga; o caminho até o Variable neighborhood search acende e o
 *                       destaque do VNS se abre e pulsa
 */
(function () {
  'use strict';
  const A = window.Anim;
  if (!A) return;
  const S = A.svg, E = A.ease, lerp = A.lerp;
  const MYBLUE = '#0061a5';

  // nós: rótulo, ponto (itens), aresta do pai (linha + pontas), filhos
  const T = {
    root: { lab: [41, 42, 43, 44, 45], dot: [20, 34], kids: ['it', 'land', 'acc'] },
    it: { lab: [46, 47, 50, 51], dot: [19, 33], edge: [0, 1], kids: ['ms', 'ils'] },
    land: { lab: [59, 60, 61], dot: [21, 35], edge: [10, 11], kids: ['fo', 'viz'] },
    acc: { lab: [48, 49, 71], dot: [22, 36], edge: [2, 3], kids: ['sa', 'tabu'] },
    ms: { lab: [52, 53, 54], edge: [4, 5] },
    ils: { lab: [55, 56, 57, 58], edge: [8, 9], hl: 40 },
    sa: { lab: [81, 82], edge: [16, 17, 18] },
    tabu: { lab: [72, 73], edge: [6, 7] },
    fo: { lab: [62, 63, 64, 65, 66, 67], dot: [31, 38], edge: [12, 13], kids: ['gls', 'noisy', 'smooth'] },
    viz: { lab: [68, 69, 70], dot: [32, 37], edge: [14, 15], kids: ['vns'] },
    gls: { lab: [83, 84, 85], edge: [23, 24] },
    noisy: { lab: [74, 75], edge: [25, 26] },
    smooth: { lab: [76, 77], edge: [27, 28] },
    vns: { lab: [78, 79, 80], edge: [29, 30], hl: 39 }
  };
  const PATH = { ils: ['it', 'ils'], vns: ['land', 'viz', 'vns'] };

  A.define('arvore', function (host) {
    const D = A.figData && A.figData.met;
    if (!D) { console.warn('arvore: sem dados (js/anim/dados/met.js)'); return { snap: function () {} }; }
    const W = D.W, H = D.H, items = D.items, SC = +(host.dataset.scale || 1.3);
    const root = S('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Estratégias para melhorar a busca local' });
    root.style.width = (W * SC) + 'pt'; root.style.height = (H * SC) + 'pt'; root.style.overflow = 'visible';
    host.appendChild(root);
    const gItems = S('g', {}, root), gFx = S('g', {}, root);
    const els = A.figBuild(gItems, items);
    const STATES = { vazio: [], metodo: D.states.metodo, metodo2: D.states.metodo2 };

    const show = function (i, v) { els[i].style.display = v ? '' : 'none'; };
    function reset(i) { const e = els[i]; e.style.opacity = ''; e.removeAttribute('transform'); e.style.strokeDasharray = ''; e.style.strokeDashoffset = ''; }
    function setVisible(ids) { const on = {}; ids.forEach(function (i) { on[i] = true; }); items.forEach(function (_, i) { reset(i); show(i, !!on[i]); }); }
    const inState = function (st) { const s = STATES[st]; return function (i) { return s.indexOf(i) >= 0; }; };
    const ctr = function (i) { const b = items[i].b; return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; };
    const ends = function (i) { const n = items[i].d.match(/-?\d+(\.\d+)?/g).map(Number); return [[n[0], n[1]], [n[2], n[3]]]; };

    function snap(st) { gFx.textContent = ''; setVisible(STATES[st] || []); }

    function pop(h, ids, c, dur) {
      ids.forEach(function (i) { show(i, true); reset(i); });
      return h.tween(dur || 280, function (e, t) {
        const s = Math.max(0.001, E.back(t));
        ids.forEach(function (i) {
          els[i].setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ') scale(' + s + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')');
          els[i].style.opacity = Math.min(1, t * 3);
        });
      }, E.linear).then(function () { ids.forEach(reset); });
    }
    function trace(h, i, dur) {
      const el = els[i]; show(i, true); reset(i);
      const L = el.getTotalLength();
      el.style.strokeDasharray = L + ' ' + (L + 1); el.style.strokeDashoffset = L;
      return h.tween(dur, function (e) { el.style.strokeDashoffset = L * (1 - e); }, E.inOut).then(function () { reset(i); });
    }
    async function words(h, ids, dur) {
      for (const i of ids) {
        show(i, true); els[i].style.opacity = 0;
        await h.tween(dur || 90, function (e) { els[i].style.opacity = e; els[i].setAttribute('transform', 'translate(0 ' + (1.2 * (1 - e)) + ')'); }, E.out);
        reset(i);
      }
    }
    async function grow(h, k, keep) {
      const n = T[k];
      if (n.edge) {
        await trace(h, n.edge[0], 420);
        const heads = n.edge.slice(1).filter(keep);
        await pop(h, heads, heads.length ? ends(n.edge[0])[1] : [0, 0], 200);
      }
      const dot = (n.dot || []).filter(keep);
      if (dot.length) await pop(h, dot, ctr(dot[0]), 240);
      await words(h, n.lab.filter(keep), 85);
    }
    async function glow(h, path) {
      const lines = [];
      for (const k of path) {
        const p = ends(T[k].edge[0]);
        const ln = S('line', { x1: p[0][0], y1: p[0][1], x2: p[0][0], y2: p[0][1], stroke: MYBLUE, 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-opacity': 0.7 }, gFx);
        lines.push(ln);
        await h.tween(300, function (e) { ln.setAttribute('x2', lerp(p[0][0], p[1][0], e)); ln.setAttribute('y2', lerp(p[0][1], p[1][1], e)); }, E.inOut);
      }
      return lines;
    }
    function fadeOut(h, list, dur) {
      return h.tween(dur, function (e) { list.forEach(function (x) { x.style.opacity = 1 - e; }); }).then(function () { list.forEach(function (x) { x.remove(); }); });
    }
    function openHl(h, i) {
      const b = items[i].b; show(i, true); reset(i);
      return h.tween(380, function (e) {
        els[i].setAttribute('transform', 'translate(' + b[0] + ' 0) scale(' + Math.max(0.001, e) + ' 1) translate(' + (-b[0]) + ' 0)');
      }, E.out).then(function () { reset(i); });
    }
    function pulse(h, i) {
      const b = items[i].b, cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
      const r = S('rect', { x: b[0], y: b[1], width: b[2] - b[0], height: b[3] - b[1], fill: 'none', stroke: '#00008b', 'stroke-width': 0.9 }, gFx);
      return h.tween(800, function (e) {
        r.setAttribute('transform', 'translate(' + cx + ' ' + cy + ') scale(' + (1 + 0.3 * e) + ') translate(' + (-cx) + ' ' + (-cy) + ')');
        r.setAttribute('opacity', 1 - e);
      }, E.out).then(function () { r.remove(); });
    }

    async function play(a, b, h) {
      const keep = inState(b);
      if (a === 'vazio' && b === 'metodo') {
        setVisible([]);
        await grow(h, 'root', keep);
        let level = T.root.kids;
        while (level.length) {
          await h.all(level.map(function (k) { return grow(h, k, keep); }));
          level = [].concat.apply([], level.map(function (k) { return T[k].kids || []; }));
        }
        await h.wait(300);
        const lines = await glow(h, PATH.ils);
        await openHl(h, T.ils.hl);
        await pulse(h, T.ils.hl);
        return fadeOut(h, lines, 500);
      }
      if (a === 'metodo' && b === 'metodo2') {
        setVisible(STATES.metodo);
        await h.tween(450, function (e) { els[T.ils.hl].style.opacity = 1 - e; });
        reset(T.ils.hl); show(T.ils.hl, false);
        STATES.metodo2.forEach(function (i) { if (i !== T.vns.hl) show(i, true); });
        const lines = await glow(h, PATH.vns);
        await openHl(h, T.vns.hl);
        await pulse(h, T.vns.hl);
        return fadeOut(h, lines, 500);
      }
    }

    return { snap: snap, play: play };
  });
})();
