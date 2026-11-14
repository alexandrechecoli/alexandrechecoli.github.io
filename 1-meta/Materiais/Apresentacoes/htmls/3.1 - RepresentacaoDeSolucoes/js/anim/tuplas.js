/* Tuplas (j,o,b,e) ↔ blocos do Gantt (aula 3.1, frame 41). A figura JSS1 do PDF fica (a imagem); o svg por cima só
 * desenha os destaques. Geometria do Gantt (quadro 189.14 × 81.06, scale 1): t = 0 em x = 20.74, 16 por período,
 * faixas M1 / M2 / M3 com topo em 56.93 / 36.93 / 16.93 (altura 16); números do eixo em y = 80.06, x = 27.33 + 16(p−1).
 * Início e fim da tupla contam "segmentos completos" (OBS do frame): o bloco [t0, t1] tem b = t0 + 1 e e = t1.
 *
 * <span class="anim pl" data-anim="tuplas" data-from="vazio" data-state="ler,ex"><img JSS1.svg></span>
 *   ler (passo 1, entrada) cada tupla das três listas (M3, M2, M1) acende junto com o seu bloco, uma de cada vez;
 *       no fim nada fica aceso (= PDF).
 *   ex  (passo 2) a tupla do exemplo, (3,3,6,7) (vermelha no PDF), fica ligada ao seu bloco.
 *   Nos dois passos: passar o mouse (ou clicar, para fixar) numa tupla acende o bloco, e vice-versa: contorno na cor do
 *   job, faixa "períodos b–e" acima do bloco e os números b..e do eixo em vermelho.
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease;
  const RED = '#b6321d';
  const FONT = '"LM Sans 8", "LM Sans", sans-serif';
  const COLOR = { 1: '#006400', 2: '#00008b', 3: '#a52a2a' };
  const X0 = 20.74, PER = 16, ROWY = { 1: 56.93, 2: 36.93, 3: 16.93 };
  // listas da figura, na ordem do slide: 1ª fórmula = M3, 2ª = M2, 3ª = M1
  const LISTS = [
    { m: 3, t: [[3, 3, 6, 7], [2, 3, 9, 9]] },
    { m: 2, t: [[3, 1, 1, 4], [1, 2, 5, 7], [2, 2, 8, 8]] },
    { m: 1, t: [[1, 1, 1, 2], [2, 1, 3, 4], [3, 2, 5, 5]] }
  ];
  const tx = function (t) { return X0 + PER * t; };

  Anim.define('tuplas', function (host) {
    const frame = host.closest('section');
    const svg = S('svg', { viewBox: '0 0 189.144 81.063' });
    host.appendChild(svg);
    const gHi = S('g', { 'pointer-events': 'none' }, svg), gHit = S('g', null, svg);
    // as tuplas: células das fórmulas da coluna da esquerda (a 1ª lista tem duas versões, passos 1 e 2)
    const eqs = Array.prototype.slice.call(frame.querySelectorAll('.columns .column:first-child .eq'));
    const OPS = [];   // { j, o, b, e, m, cells: [] }
    LISTS.forEach(function (L) { L.t.forEach(function (q) { OPS.push({ j: q[0], o: q[1], b: q[2], e: q[3], m: L.m, cells: [] }); }); });
    const byKey = function (m, k) { let n = 0; for (const op of OPS) { if (op.m === m) { if (n === k) return op; n++; } } return null; };
    eqs.forEach(function (eq) {
      const cells = Array.prototype.slice.call(eq.querySelectorAll('.col-align-c .pstrut + .mord'));
      const m = cells.length === 2 ? 3 : (cells[0] && cells[0].textContent.indexOf('(3,1,1,4)') >= 0 ? 2 : 1);
      cells.forEach(function (c, k) {
        const op = byKey(m, k); if (!op) return;
        op.cells.push(c);
        c.classList.add('tp-cell'); c.style.setProperty('--jc', COLOR[op.j]);
        c.addEventListener('mouseenter', function () { if (live) show(op, false); });
        c.addEventListener('mouseleave', function () { if (live) show(pinned, false); });
        c.addEventListener('click', function (ev) { if (!live) return; ev.stopPropagation(); pinned = pinned === op ? fixed : op; show(pinned, false); });
      });
      eq.setAttribute('data-interactive', '');
    });
    // áreas dos blocos
    OPS.forEach(function (op) {
      const r = S('rect', { x: tx(op.b - 1), y: ROWY[op.m], width: PER * (op.e - op.b + 1), height: 16, fill: '#fff', 'fill-opacity': 0, class: 'tp-hit' }, gHit);
      r.addEventListener('mouseenter', function () { if (live) show(op, false); });
      r.addEventListener('mouseleave', function () { if (live) show(pinned, false); });
      r.addEventListener('click', function (ev) { if (!live) return; ev.stopPropagation(); pinned = pinned === op ? fixed : op; show(pinned, false); });
    });
    let live = false, pinned = null, fixed = null;

    function clear() {
      while (gHi.firstChild) gHi.removeChild(gHi.firstChild);
      OPS.forEach(function (op) { op.cells.forEach(function (c) { c.classList.remove('on'); }); });
    }
    function show(op, anim) {
      clear();
      if (!op) return null;
      op.cells.forEach(function (c) { c.classList.add('on'); });
      const g = S('g', null, gHi), x0 = tx(op.b - 1), x1 = tx(op.e), y = ROWY[op.m], col = COLOR[op.j];
      S('rect', { x: x0, y: y, width: x1 - x0, height: 16, fill: col, 'fill-opacity': 0.25, stroke: col, 'stroke-width': 1.8, 'stroke-linejoin': 'round' }, g);
      // faixa dos períodos acima do bloco
      const yb = y - 2.6;
      S('path', { d: 'M' + (x0 + 0.6) + ' ' + (yb + 1.6) + 'V' + yb + 'H' + (x1 - 0.6) + 'V' + (yb + 1.6), stroke: RED, 'stroke-width': 0.6, fill: 'none' }, g);
      const lb = S('text', { x: (x0 + x1) / 2, y: yb - 1.2, 'text-anchor': 'middle', 'font-size': 5, 'font-family': FONT, fill: RED, 'font-weight': 700 }, g);
      lb.textContent = op.b === op.e ? 'período ' + op.b : 'períodos ' + op.b + '–' + op.e;
      const wbg = S('rect', { x: (x0 + x1) / 2 - 18, y: yb - 6.2, width: 36, height: 6, fill: '#fff', 'fill-opacity': 0.85, rx: 1 }, g);
      g.insertBefore(wbg, lb);
      for (let p = op.b; p <= op.e; p++) {
        const t = S('text', { x: 27.33 + PER * (p - 1), y: 80.06, 'font-size': 5.58, 'font-family': 'KaTeX_Main', fill: RED, 'font-weight': 700, stroke: '#fff', 'stroke-width': 0.6, 'paint-order': 'stroke' }, g);
        t.textContent = p;
      }
      if (anim) g.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
      return g;
    }

    function snap(st) {
      live = st !== 'vazio';
      host.toggleAttribute('data-interactive', live);
      fixed = st === 'ex' ? OPS[0] : null;
      pinned = fixed;
      show(pinned, false);
    }
    async function play(a, b, h) {
      live = false; pinned = fixed = null; clear();
      if (b === 'ler') {
        await h.wait(300);
        for (const op of OPS) { show(op, true); await h.wait(620); }
        clear();
      } else if (b === 'ex') {
        await h.wait(200);
        const g = show(OPS[0], true);
        await h.tween(700, function (e) { g.setAttribute('opacity', 0.4 + 0.6 * Math.abs(Math.cos(e * Math.PI * 1.5))); }, ease.linear);
        g.removeAttribute('opacity');
      }
    }
    return { snap: snap, play: play };
  });
})();
