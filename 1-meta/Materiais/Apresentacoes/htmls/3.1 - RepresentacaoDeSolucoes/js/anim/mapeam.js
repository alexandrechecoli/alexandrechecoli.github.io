/* Mapeamento representação-solução (aula 3.1, frames 25, 26, 28, 32, 33 e 44): figuras mapeamento, mapeamento_1_1,
 * mapeamento_1_M e mapeamento_M_1 do Ipe em camadas (dados/map.js, figura_camadas.py map …; quadro 243.93 × 119.86).
 * Cada painel (1-1, 1-M, M-1) tem uma versão normal e uma esmaecida (itens diferentes); os estados são os conjuntos de
 * itens de cada figura.
 *
 * <span class="anim pl" data-anim="mapeam" data-from=".." data-state=".."><img mapeamento….svg></span>
 *   todos (frame 25, de vazio): os rótulos da esquerda entram; painel a painel, caixa e círculo surgem, os pontos
 *         (soluções) e os quadrados (codificações) brotam, as setas se traçam da solução para a codificação e o nome
 *         do painel aparece.
 *   p0 / p1 / p2 (frames 26, 28, 32, de todos / p0 / p1): os painéis trocam de versão (normal ↔ esmaecida) e no painel
 *         em destaque uma ficha vermelha corre por cada seta, da solução para a codificação, e os nós pulsam.
 *   p2b (frames 33 e 44, de p2): a mesma figura do 32; só as fichas correm de novo.
 *   Nos estados p0/p1/p2/p2b, clicar numa solução ou codificação do painel em destaque acende as ligações dela
 *   (setas e nós em azul) e diz quantas: "2 codificações" (1-M: redundância), "representa 2 soluções" (M-1).
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease, lerp = Anim.lerp;
  const FD = Anim.figData || {};
  const RED = '#b6321d', BLUE = '#0061a5';
  const FONT = '"LM Sans 8", "LM Sans", sans-serif';
  // painéis: itens da versão normal e da esmaecida; nós (centro) e setas (linha, ponta, de, para)
  const P = [
    { box: 6, circ: 7, s: [[45, 57], [44, 56]], c: [12, 13], ar: [[8, 9, 0, 0], [10, 11, 1, 1]], lab: 71,
      fbox: 0, fcirc: 1, fs: [[41, 53], [40, 52]], fc: [4, 5], fl: [2, 3] },
    { box: 26, circ: 27, s: [[51, 63], [50, 62]], c: [30, 31], ar: [[28, 29, 0, 0], [38, 39, 0, 1]], lab: 72,
      fbox: 14, fcirc: 15, fs: [[47, 59], [46, 58]], fc: [17, 18], fl: [16, 24] },
    { box: 32, circ: 33, s: [[55, 65], [54, 64]], c: [36, 37], ar: [[34, 35, 0, 0], [42, 43, 1, 0]], lab: 73,
      fbox: 19, fcirc: 20, fs: [[49, 61], [48, 60]], fc: [22, 23], fl: [21, 25] }
  ];
  const FIGS = { todos: 'mapeamento', p0: 'mapeamento_1_1', p1: 'mapeamento_1_M', p2: 'mapeamento_M_1', p2b: 'mapeamento_M_1' };
  const HL = { p0: 0, p1: 1, p2: 2, p2b: 2 };

  function mk(it, parent) {
    if (it.t === 'x') {
      const t = S('text', { x: it.x, y: it.y, 'font-size': it.fs, fill: it.c, 'font-family': it.ff }, parent);
      t.textContent = it.tx; return t;
    }
    const p = S('path', { d: it.d, fill: it.f || 'none' }, parent);
    if (it.fo !== undefined) p.setAttribute('fill-opacity', it.fo);
    if (it.eo) p.setAttribute('fill-rule', 'evenodd');
    if (it.s) { p.setAttribute('stroke', it.s); p.setAttribute('stroke-width', it.w); p.setAttribute('stroke-linejoin', 'round'); if (it.so !== undefined) p.setAttribute('stroke-opacity', it.so); }
    return p;
  }
  const center = function (it) { return [(it.b[0] + it.b[2]) / 2, (it.b[1] + it.b[3]) / 2]; };

  Anim.define('mapeam', function (host) {
    const D = FD.map;
    if (!D) { console.warn('mapeam: faltam os dados (dados/map.js)'); return { snap: function () {}, play: null }; }
    const IT = D.items;
    const svg = S('svg', { viewBox: '0 0 ' + D.W + ' ' + D.H });
    host.appendChild(svg);
    const gIt = S('g', null, svg), gTop = S('g', { 'pointer-events': 'none' }, svg), gHit = S('g', null, svg);
    // os textos "Soluções do problema" vêm com os acentos quebrados do PDF: usa o texto certo
    const FIX = { 66: 'Soluções', 68: 'Codificações', 69: '(representação)' };
    const els = IT.map(function (it, i) { const e = mk(it, gIt); if (FIX[i]) e.textContent = FIX[i]; return e; });
    let cur = 'vazio', hl = -1;

    function showSet(ids) {
      const s = new Set(ids);
      els.forEach(function (e, i) { e.style.display = s.has(i) ? '' : 'none'; e.style.opacity = ''; e.removeAttribute('transform'); });
    }
    const vis = function (ids, on) { ids.forEach(function (i) { els[i].style.display = on === false ? 'none' : ''; }); };
    const op = function (ids, v) { ids.forEach(function (i) { els[i].style.opacity = v; }); };
    const scl = function (ids, c, k) { ids.forEach(function (i) { if (k === null) els[i].removeAttribute('transform'); else els[i].setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ') scale(' + Math.max(0.01, k) + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')'); }); };
    async function fade(h, ids, to, dur) {
      vis(ids); const from = to ? 0 : 1;
      await h.tween(dur || 300, function (e) { op(ids, lerp(from, to, e)); });
      op(ids, ''); if (!to) vis(ids, false);
    }
    async function pop(h, ids, c, dur) {
      vis(ids); op(ids, 0);
      await h.tween(dur || 280, function (e, t) { op(ids, Math.min(1, t * 2.5)); scl(ids, c, e); }, ease.back);
      op(ids, ''); scl(ids, c, null);
    }
    async function drawArrow(h, line, head, dur) {
      const it = IT[line], L = Math.hypot(it.b[2] - it.b[0], it.b[3] - it.b[1]);
      // a linha vai da solução (em cima) para a codificação (embaixo); o caminho do Ipe pode estar no outro sentido
      const d = it.d.match(/M([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)/);
      const down = d && +d[2] < +d[4];
      const e = els[line];
      vis([line]); e.setAttribute('stroke-dasharray', L); e.setAttribute('stroke-dashoffset', down ? L : -L);
      await h.tween(dur || 450, function (t) { e.setAttribute('stroke-dashoffset', (down ? L : -L) * (1 - t)); }, ease.inOut);
      e.removeAttribute('stroke-dasharray'); e.removeAttribute('stroke-dashoffset');
      if (head !== undefined) await pop(h, [head], center(IT[head]), 180);
    }
    // ficha que corre pela seta (da solução para a codificação)
    async function token(h, p, a) {
      const sp = center(IT[P[p].s[a[2]][1]]), cp = center(IT[P[p].c[a[3]]]);
      const tk = S('circle', { r: 2, fill: RED, stroke: '#fff', 'stroke-width': 0.5 }, gTop);
      await h.tween(650, function (e) { tk.setAttribute('cx', lerp(sp[0], cp[0], e)); tk.setAttribute('cy', lerp(sp[1], cp[1] - 4, e)); }, ease.inOut);
      tk.remove();
    }
    async function pulse(h, p) {
      const ids = P[p].c.concat(P[p].s.map(function (x) { return x[1]; }));
      await h.tween(420, function (e) { const k = 1 + 0.25 * Math.sin(Math.PI * e); ids.forEach(function (i) { scl([i], center(IT[i]), k); }); });
      ids.forEach(function (i) { scl([i], null, null); });
    }

    // ---------- clique: ligações de um nó do painel em destaque ----------
    function clearHi() { while (gTop.firstChild) gTop.removeChild(gTop.firstChild); }
    function hitAreas(p) {
      while (gHit.firstChild) gHit.removeChild(gHit.firstChild);
      host.toggleAttribute('data-interactive', p >= 0);
      if (p < 0) return;
      const add = function (kind, k) {
        const it = IT[kind === 's' ? P[p].s[k][1] : P[p].c[k]], c = center(it);
        const r = S('circle', { cx: c[0], cy: c[1], r: 7, fill: '#fff', 'fill-opacity': 0, class: 'mp-hit' }, gHit);
        r.addEventListener('click', function (e) { e.stopPropagation(); select(p, kind, k); });
      };
      [0, 1].forEach(function (k) { add('s', k); add('c', k); });
    }
    let selKey = null;
    function select(p, kind, k) {
      clearHi();
      const key = kind + k; if (selKey === key) { selKey = null; return; }
      selKey = key;
      const nodeIt = IT[kind === 's' ? P[p].s[k][1] : P[p].c[k]], nc = center(nodeIt);
      const ring = function (c) { S('circle', { cx: c[0], cy: c[1], r: 6.4, fill: 'none', stroke: BLUE, 'stroke-width': 1.2 }, gTop); };
      ring(nc);
      const arrows = P[p].ar.filter(function (a) { return kind === 's' ? a[2] === k : a[3] === k; });
      arrows.forEach(function (a) {
        const L = IT[a[0]];
        S('path', { d: L.d, stroke: BLUE, 'stroke-width': 1.6, fill: 'none', 'stroke-linecap': 'round' }, gTop);
        S('path', { d: IT[a[1]].d, stroke: BLUE, 'stroke-width': 1.6, fill: 'none' }, gTop);
        ring(center(IT[kind === 's' ? P[p].c[a[3]] : P[p].s[a[2]][1]]));
      });
      const n = arrows.length;
      const msg = kind === 's'
        ? (n === 0 ? 'nenhuma codificação' : n === 1 ? '1 codificação' : n + ' codificações (redundância)')
        : (n === 0 ? 'não representa solução' : n === 1 ? 'representa 1 solução' : 'representa ' + n + ' soluções');
      const box = IT[P[p].box].b;
      const t = S('text', { x: (box[0] + box[2]) / 2, y: -2.5, 'text-anchor': 'middle', 'font-size': 6.2, 'font-family': FONT, fill: BLUE, 'font-weight': 700 }, gTop);
      t.textContent = msg;
    }

    function snap(st) {
      cur = st; clearHi(); selKey = null;
      if (st === 'vazio') { showSet([]); hitAreas(-1); return; }
      showSet(D.states[FIGS[st]]);
      hitAreas(HL[st] === undefined ? -1 : HL[st]);
    }
    async function play(a, b, h) {
      clearHi(); selKey = null; hitAreas(-1);
      if (b === 'todos') {
        showSet([]);
        await fade(h, [66, 67, 70], 1, 300);
        await fade(h, [68, 69], 1, 300);
        for (let p = 0; p < 3; p++) {
          const q = P[p], cc = center(IT[q.circ]);
          vis([q.box]); op([q.box], 0);
          await h.all([fade(h, [q.box], 1, 300), pop(h, [q.circ], cc, 350)]);
          await h.all([pop(h, q.s[0], center(IT[q.s[0][1]]), 220), pop(h, q.s[1], center(IT[q.s[1][1]]), 220),
            pop(h, [q.c[0]], center(IT[q.c[0]]), 220), pop(h, [q.c[1]], center(IT[q.c[1]]), 220)]);
          for (const ar of q.ar) await drawArrow(h, ar[0], ar[1], 420);
          await fade(h, [q.lab], 1, 250);
        }
        return;
      }
      // troca de versão dos painéis (normal ↔ esmaecida) e fichas no painel em destaque
      const A = new Set(a === 'vazio' ? [] : D.states[FIGS[a]]), B = new Set(D.states[FIGS[b]]);
      const out = Array.from(A).filter(function (i) { return !B.has(i); }), inn = Array.from(B).filter(function (i) { return !A.has(i); });
      showSet(Array.from(A));
      if (out.length || inn.length) {
        vis(inn); op(inn, 0);
        await h.tween(650, function (e) { op(inn, e); op(out, 1 - e); });
        showSet(Array.from(B));
      }
      const p = HL[b];
      await h.wait(150);
      await pulse(h, p);
      for (const ar of P[p].ar) await token(h, p, ar);
      hitAreas(p);
    }
    return { snap: snap, play: play };
  });
})();
