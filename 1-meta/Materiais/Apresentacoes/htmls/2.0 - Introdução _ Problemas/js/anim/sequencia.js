/* Programação da produção (aula 2, frames 62–64): figuras seq1…seq3 e arvore_produto do Ipe em camadas.
 *
 * Dados: js/anim/dados/seq.js (figura_camadas.py seq … seq1 seq2 seq3, quadro 132.75 × 96.49; arv … arvore_produto).
 * Uso: <span class="anim pl" data-anim="sequencia" data-fig="gantt|arvore" data-from=".." data-state=".."><img …></span>
 *
 * Gantt: t = 0 em x = 17.55, 16 unidades por período; M1 / M2 / M3 nas faixas y = 26.59 / 42.59 / 58.59 (altura 16).
 *   s1  (de vazio) frame 62: eixos e marcas se desenham; P1, P2, P3 crescem em série na M3; marca "término: 6"
 *   s2  frame 63: P2 e P3 deslizam para M2 e M1 (em paralelo) e a marca do término recua de 6 para 2
 *   g3  frame 64, passo 2 (o seq3 aparece com \onslide<2>): um cursor de tempo varre o Gantt e cada barra cresce na
 *       sua hora; "P0 espera P1 e P2" na M1 entre 2 e 4
 * Árvore (frame 64):
 *   t1  (de vazio) passo 1: a árvore se monta da raiz para baixo (setas traçadas, nós brotam)
 *   t2  passo 2: cada nó ganha a cor da sua barra quando a tarefa termina (de baixo para cima), no mesmo relógio do
 *       Gantt (as duas instâncias recebem o passo juntas e usam a mesma tabela SCHED)
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease, lerp = Anim.lerp;
  const FD = Anim.figData || {};
  const RED = '#b6321d', GRAY = '#666666';
  const FONT = '"LM Sans 8", "LM Sans", sans-serif';
  const X0 = 17.55, PER = 16, TOP = 22, BASE = 82.59;
  const tx = function (t) { return X0 + PER * t; };
  const PERIOD_MS = 650;   // relógio do passo 2 do frame 64 (6 períodos ≈ 3,9 s)

  // seq3: barra, rótulos, máquina, início/fim, nó da árvore (círculo, texto), cor
  const SCHED = [
    { bar: 13, lab: [28, 35], t0: 0, t1: 2, node: [11, 21] },   // P3 (M3)
    { bar: 14, lab: [30, 34], t0: 0, t1: 2, node: [4, 20] },    // P4 (M2) — o 4 filho de 2
    { bar: 15, lab: [32, 33], t0: 0, t1: 2, node: [3, 18] },    // P4 (M1) — o 4 filho de 1
    { bar: 16, lab: [39, 40], t0: 2, t1: 4, node: [1, 17] },    // P1 (M3)
    { bar: 17, lab: [41, 42], t0: 2, t1: 4, node: [2, 19] },    // P2 (M2)
    { bar: 18, lab: [36, 37], t0: 4, t1: 6, node: [0, 16] }     // P0 (M1)
  ];

  function mk(it, parent) {
    if (it.t === 'x') {
      const t = S('text', { x: it.x, y: it.y, 'font-size': it.fs, fill: it.c,
        'font-family': it.ff === 'Iwona' ? '"Iwona", "LM Sans", sans-serif' : it.ff }, parent);
      if (it.st) t.setAttribute('font-style', it.st);
      t.textContent = it.tx;
      return t;
    }
    const p = S('path', { d: it.d, fill: it.f || 'none' }, parent);
    if (it.fo !== undefined) p.setAttribute('fill-opacity', it.fo);
    if (it.s) { p.setAttribute('stroke', it.s); p.setAttribute('stroke-width', it.w); if (it.da) p.setAttribute('stroke-dasharray', it.da); }
    return p;
  }
  const range = function (a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };

  Anim.define('sequencia', function (host) {
    const fig = host.dataset.fig, D = FD[fig === 'arvore' ? 'arv' : 'seq'];
    if (!D) { console.warn('sequencia: faltam os dados (dados/seq.js)'); return { snap: function () {}, play: null }; }
    const IT = D.items;
    const svg = S('svg', { viewBox: '0 0 ' + D.W + ' ' + D.H });
    host.appendChild(svg);
    const gBg = S('g', null, svg), gIt = S('g', null, svg), gTop = S('g', null, svg);
    const els = IT.map(function (it) { return mk(it, gIt); });

    function empty(g) { while (g.firstChild) g.removeChild(g.firstChild); }
    function showSet(ids) { const s = new Set(ids); els.forEach(function (e, i) { e.style.display = s.has(i) ? '' : 'none'; e.style.opacity = ''; e.removeAttribute('transform'); }); }
    function show(ids, on) { ids.forEach(function (i) { els[i].style.display = on === false ? 'none' : ''; }); }
    function op(ids, v) { ids.forEach(function (i) { els[i].style.opacity = v; }); }
    function tf(ids, s) { ids.forEach(function (i) { if (s) els[i].setAttribute('transform', s); else els[i].removeAttribute('transform'); }); }
    function fade(h, ids, to, dur) {
      show(ids); const from = to ? 0 : 1;
      return h.tween(dur || 280, function (e) { op(ids, lerp(from, to, e)); }).then(function () { op(ids, ''); if (!to) show(ids, false); });
    }
    function grow(h, ids, axis, anchor, dur, ez) {
      show(ids);
      return h.tween(dur || 450, function (e) {
        const s = Math.max(0.001, e);
        tf(ids, axis === 'y' ? 'translate(0 ' + anchor + ') scale(1 ' + s + ') translate(0 ' + (-anchor) + ')'
          : 'translate(' + anchor + ' 0) scale(' + s + ' 1) translate(' + (-anchor) + ' 0)');
      }, ez || ease.out).then(function () { tf(ids, null); });
    }
    function pop(h, ids, cx, cy, dur) {
      show(ids); op(ids, 0);
      return h.tween(dur || 320, function (e, t) {
        op(ids, Math.min(1, t * 2.5));
        tf(ids, 'translate(' + cx + ' ' + cy + ') scale(' + Math.max(0, e) + ') translate(' + (-cx) + ' ' + (-cy) + ')');
      }, ease.back).then(function () { op(ids, ''); tf(ids, null); });
    }

    // ---------- marca do término (frames 62–63) ----------
    function marker(t) {
      const g = S('g', null, gTop);
      S('path', { d: 'M0 ' + TOP + 'V' + BASE, stroke: RED, 'stroke-width': 0.6, 'stroke-dasharray': '2 1.5', fill: 'none' }, g);
      const lb = S('text', { x: 1.5, y: TOP + 3, 'font-size': 5.2, fill: RED, 'font-family': FONT }, g);
      g.set = function (v) { g.setAttribute('transform', 'translate(' + tx(v) + ' 0)'); lb.textContent = 'término: ' + (Math.round(v * 10) / 10).toString().replace('.', ','); };
      g.set(t);
      return g;
    }

    // ---------- Gantt ----------
    const AXES = [0, 1, 2, 3], TICKS = range(4, 12), LABELS = range(22, 27);
    function snapGantt(st) {
      empty(gTop);
      if (st === 'vazio') { showSet([]); return; }
      showSet(st === 's1' ? D.states.seq1 : st === 's2' ? D.states.seq2 : D.states.seq3);
      if (st === 's1') marker(6);
      if (st === 's2') marker(2);
    }
    async function axes(h) {
      await h.all([grow(h, [0], 'y', 82.59, 450), grow(h, [2], 'x', 17.55, 550)]);
      await h.all([pop(h, [1], 17.55, 12, 250), pop(h, [3], 128, 82.59, 250), fade(h, LABELS, 1, 300)]);
      for (const i of TICKS) { await h.wait(40); fade(h, [i], 1, 200).catch(function () {}); }
      await h.wait(200);
    }
    async function bar(h, id, lab, dur) {   // barra cresce da esquerda; o rótulo entra no fim
      await grow(h, [id], 'x', IT[id].b[0], dur || 500, ease.inOut);
      await fade(h, lab, 1, 200);
    }
    async function playGantt(a, b, h) {
      if (b === 's1') {
        showSet([]);
        await axes(h);
        await bar(h, 13, [28, 29]); await bar(h, 20, [39, 43]); await bar(h, 21, [44, 45]);
        const m = marker(6); m.setAttribute('opacity', 0);
        await h.tween(350, function (e) { m.setAttribute('opacity', e); });
        return;
      }
      if (b === 's2') {
        const m = gTop.querySelector('g') || marker(6);
        // P2: (2–4, M3) → (0–2, M2); P3: (4–6, M3) → (0–2, M1)
        const moves = [[20, [39, 43], 14, [30, 31]], [21, [44, 45], 19, [32, 38]]];
        for (const mv of moves) {
          const dx = IT[mv[0]].b[0] - IT[mv[2]].b[0], dy = IT[mv[0]].b[1] - IT[mv[2]].b[1];
          show([mv[0]].concat(mv[1]), false);
          const ids = [mv[2]].concat(mv[3]);
          show(ids);
          await h.tween(750, function (e) { tf(ids, 'translate(' + dx * (1 - e) + ' ' + (dy * (1 - e) - Math.sin(Math.PI * e) * 6) + ')'); }, ease.inOut);
          tf(ids, null);
        }
        await h.tween(700, function (e) { m.set(lerp(6, 2, e)); }, ease.inOut);
        m.set(2);
        return;
      }
      if (b === 'g3') {
        showSet(D.states.seq3);
        SCHED.forEach(function (s) { show([s.bar].concat(s.lab), false); });
        const cur = S('path', { d: 'M0 ' + (TOP + 2) + 'V' + BASE, stroke: GRAY, 'stroke-width': 0.5, fill: 'none' }, gTop);
        const clk = S('text', { x: 0, y: TOP, 'font-size': 5, fill: GRAY, 'font-family': FONT, 'text-anchor': 'middle' }, gTop);
        const wait = S('text', { x: tx(3), y: 36.4, 'font-size': 4.4, fill: GRAY, 'font-family': FONT, 'font-style': 'italic', 'text-anchor': 'middle', opacity: 0 }, gTop);
        wait.textContent = 'P0 espera P1 e P2';
        const shown = {};
        await h.tween(6 * PERIOD_MS, function (e, t) {
          const now = 6 * t;
          cur.setAttribute('transform', 'translate(' + tx(now) + ' 0)'); clk.setAttribute('x', tx(now));
          clk.textContent = 't = ' + now.toFixed(1).replace('.', ',');
          SCHED.forEach(function (s, k) {
            const u = Math.max(0, Math.min(1, (now - s.t0) / (s.t1 - s.t0)));
            if (u <= 0) return;
            show([s.bar]);
            tf([s.bar], 'translate(' + tx(s.t0) + ' 0) scale(' + Math.max(0.001, u) + ' 1) translate(' + (-tx(s.t0)) + ' 0)');
            if (u >= 1 && !shown[k]) { shown[k] = true; tf([s.bar], null); show(s.lab); }
          });
          wait.setAttribute('opacity', now > 2.1 && now < 4 ? Math.min(1, (now - 2.1) * 3) : 0);
        }, ease.linear);
        await h.tween(300, function (e) { cur.setAttribute('opacity', 1 - e); clk.setAttribute('opacity', 1 - e); });
        cur.remove(); clk.remove(); wait.remove();
      }
    }

    // ---------- árvore ----------
    const EDGES = [[14, 15, [1, 17]], [9, 10, [2, 19]], [12, 13, [11, 21]], [5, 6, [3, 18]], [7, 8, [4, 20]]];   // linha, seta, nó filho
    const ROOT = [0, 16];
    function tint(node, col, parent) {   // disco colorido atrás do nó
      const b = IT[node[0]].b, cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
      return S('circle', { cx: cx, cy: cy, r: (b[2] - b[0]) / 2, fill: col, 'fill-opacity': 0.45, stroke: 'none' }, parent || gBg);
    }
    function colorOf(k) { return seqData().items[SCHED[k].bar].f; }
    function seqData() { return FD.seq; }
    function snapTree(st) {
      empty(gBg); empty(gTop);
      if (st === 'vazio') { showSet([]); return; }
      showSet(D.states.arvore_produto);
      if (st === 't2') SCHED.forEach(function (s, k) { tint(s.node, colorOf(k)); });
    }
    async function playTree(a, b, h) {
      if (b === 't1') {
        showSet([]);
        const c = function (n) { const q = IT[n[0]].b; return [(q[0] + q[2]) / 2, (q[1] + q[3]) / 2]; };
        await pop(h, ROOT, c(ROOT)[0], c(ROOT)[1], 380);
        const levels = [[0, 1], [2, 3, 4]];
        for (const lv of levels) {
          await h.all(lv.map(function (k) {
            const e = EDGES[k], el = els[e[0]], L = el.getTotalLength();   // a linha vai do pai ao filho
            show([e[0]]); el.style.strokeDasharray = L + ' ' + L;
            return h.tween(380, function (u) { el.style.strokeDashoffset = L * (1 - u); }, ease.out).then(function () {
              el.style.strokeDasharray = ''; el.style.strokeDashoffset = '';
              return h.all([pop(h, [e[1]], (IT[e[1]].b[0] + IT[e[1]].b[2]) / 2, IT[e[1]].b[3], 220), pop(h, e[2], c(e[2])[0], c(e[2])[1], 340)]);
            });
          }));
        }
        return;
      }
      if (b === 't2') {   // mesmo relógio do Gantt
        const done = {};
        await h.tween(6 * PERIOD_MS, function (e, t) {
          const now = 6 * t;
          SCHED.forEach(function (s, k) {
            if (done[k] || now < s.t1) return;
            done[k] = true;
            const d = tint(s.node, colorOf(k));
            h.tween(450, function (u) { d.setAttribute('fill-opacity', 0.45 * u); d.setAttribute('r', ((IT[s.node[0]].b[2] - IT[s.node[0]].b[0]) / 2) * (1 + 0.35 * Math.sin(Math.PI * u))); }).catch(function () {});
          });
        }, ease.linear);
        await h.wait(450);
      }
    }

    return fig === 'arvore'
      ? { snap: snapTree, play: playTree }
      : { snap: snapGantt, play: playGantt };
  });
})();
