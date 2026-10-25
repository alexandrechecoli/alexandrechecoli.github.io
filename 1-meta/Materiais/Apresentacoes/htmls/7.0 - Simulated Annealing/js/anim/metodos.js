/* Árvore "Estratégias para melhorar a busca local" (aula 7, slides 16, 17 e 28; figuras img/metodos1–3).
 *
 * Camadas em js/anim/dados/met.js (figura_camadas.py). Estados: metodos1 (árvore), metodos3 (destaques em
 * ILS, SA e VNS) e metodos2 (só SA). O estado final de cada slide é a figura do PDF.
 *
 *   vazio → metodos1      a árvore cresce da raiz, nível a nível: as setas saem do ponto do nó pai, o ponto
 *                         do filho brota e o rótulo entra palavra por palavra
 *   metodos1 → metodos3   para cada família (ILS, VNS, SA), o caminho da raiz até o algoritmo acende em azul
 *                         e o destaque se abre da esquerda para a direita
 *   metodos3 → metodos2   (slide 28, de volta à árvore) ILS e VNS apagam; o caminho até o SA acende e o
 *                         destaque do SA pulsa
 */
(function () {
  'use strict';
  const A = window.Anim;
  if (!A) return;
  const S = A.svg, E = A.ease, lerp = A.lerp;
  const MYBLUE = '#0061a5';

  // nós: rótulo, ponto (itens), aresta do pai (linha, pontas), filhos
  const T = {
    root: { lab: [47, 48, 49, 50, 51], dot: [20, 24, 39], kids: ['it', 'land', 'acc'] },
    it: { lab: [52, 53, 56, 57], dot: [19, 23, 38], edge: [0, 1], kids: ['ms', 'ils'] },
    land: { lab: [65, 66, 67], dot: [21, 25, 40], edge: [10, 11, 12], kids: ['fo', 'viz'] },
    acc: { lab: [54, 55, 78], dot: [22, 26, 41], edge: [2, 3], kids: ['sa', 'tabu'] },
    ms: { lab: [58, 59, 60], edge: [4, 5] },
    ils: { lab: [61, 62, 63, 64], edge: [8, 9], hl: 46 },
    sa: { lab: [79, 80], edge: [17, 18], hl: 44 },
    tabu: { lab: [81, 82], edge: [6, 7] },
    fo: { lab: [68, 69, 70, 71, 72, 73, 74], dot: [36, 43], edge: [13, 14], kids: ['gls', 'noisy', 'smooth'] },
    viz: { lab: [75, 76, 77], dot: [37, 42], edge: [15, 16], kids: ['vns'] },
    gls: { lab: [83, 84, 85], edge: [27, 28] },
    noisy: { lab: [86, 87], edge: [29, 30] },
    smooth: { lab: [88, 89], edge: [31, 32] },
    vns: { lab: [90, 91, 92], edge: [33, 34, 35], hl: 45 }
  };
  const PATH = { ils: ['it', 'ils'], vns: ['land', 'viz', 'vns'], sa: ['acc', 'sa'] };

  A.define('metodos', function (host) {
    const D = A.figData && A.figData.met;
    if (!D) { console.warn('metodos: sem dados (js/anim/dados/met.js)'); return { snap: function () {} }; }
    const W = D.W, H = D.H, items = D.items;
    const root = S('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Estratégias para melhorar a busca local' });
    root.style.width = (W * 261.04 / 237.31) + 'pt'; root.style.height = (H * 261.04 / 237.31) + 'pt'; root.style.overflow = 'visible';
    host.appendChild(root);
    const gItems = S('g', {}, root), gFx = S('g', {}, root);
    const els = A.figBuild(gItems, items);
    let on = {};

    const show = function (i, v) { els[i].style.display = v ? '' : 'none'; };
    function reset(i) { const e = els[i]; e.style.opacity = ''; e.removeAttribute('transform'); e.style.strokeDasharray = ''; e.style.strokeDashoffset = ''; }
    function setVisible(ids) { on = {}; ids.forEach(function (i) { on[i] = true; }); items.forEach(function (_, i) { reset(i); show(i, !!on[i]); }); }
    const inState = function (st) { const s = D.states[st]; return function (i) { return s.indexOf(i) >= 0; }; };
    const ctr = function (i) { const b = items[i].b; return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; };
    const ends = function (i) { const n = items[i].d.match(/-?\d+(\.\d+)?/g).map(Number); return [[n[0], n[1]], [n[2], n[3]]]; };

    function snap(st) { gFx.textContent = ''; setVisible(D.states[st] || []); }

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

    // um nó entra: aresta do pai (se houver), ponta, ponto e rótulo
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

    // brilho azul sobre as arestas do caminho root → folha
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
    function openHl(h, i) {   // destaque se abre da esquerda para a direita
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
      if (a === 'vazio' && b === 'metodos1') {
        setVisible([]);
        await grow(h, 'root', keep);
        let level = T.root.kids;
        while (level.length) {
          await h.all(level.map(function (k) { return grow(h, k, keep); }));
          level = [].concat.apply([], level.map(function (k) { return T[k].kids || []; }));
        }
        return;
      }
      if (a === 'metodos1' && b === 'metodos3') {
        setVisible(D.states.metodos3.filter(function (i) { return [44, 45, 46].indexOf(i) < 0; }));
        for (const k of ['ils', 'vns', 'sa']) {
          const lines = await glow(h, PATH[k]);
          await openHl(h, T[k].hl);
          fadeOut(h, lines, 500);
          await h.wait(200);
        }
        return h.wait(400);
      }
      if (a === 'metodos3' && b === 'metodos2') {
        setVisible(D.states.metodos3);
        await h.tween(500, function (e) { [45, 46].forEach(function (i) { els[i].style.opacity = 1 - e; }); });
        [45, 46].forEach(function (i) { reset(i); show(i, false); });
        D.states.metodos2.forEach(function (i) { show(i, true); });
        const lines = await glow(h, PATH.sa);
        await pulse(h, 44);
        await pulse(h, 44);
        return fadeOut(h, lines, 500);
      }
    }

    return { snap: snap, play: play };
  });
})();
