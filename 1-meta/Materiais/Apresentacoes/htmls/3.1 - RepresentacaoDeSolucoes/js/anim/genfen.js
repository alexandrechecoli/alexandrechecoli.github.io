/* Genótipo → fenótipo (aula 3.1, frames 23 e 24): figuras representacao1 e representacao2 do Ipe em camadas
 * (dados/rep.js, figura_camadas.py rep … representacao1 representacao2). Cada figura tem o seu quadro (268.4 × 88.4 e
 * 269.63 × 89.22, scale 1.4); os itens de cada uma estão nas coordenadas dela.
 *
 * <span class="anim pl" data-anim="genfen" data-fig="1|2" data-from=".." data-state=".."><img …></span>
 *   r1    (frame 23, de vazio) a caixa "Representação" surge, a seta se traça, "Solução" surge e uma ficha vermelha
 *         percorre a seta (a codificação vira solução).
 *   r2    (frame 24, passo 1, de r1) as caixas ficam; o cromossomo (genótipo) cresce de baixo para cima, a pessoa
 *         (fenótipo) surge, a seta longa se traça e "é manifestado como" entra palavra a palavra; os rótulos entram.
 *   meio  (passo 2, acrescentado à figura) atrás da pessoa surgem dois fenótipos diferentes do mesmo genótipo (um mais
 *         baixo, azul; um mais alto, vermelho): "o fenótipo é influenciado pelo meio".
 *   sols  (passo 3, acrescentado) a caixa "Solução" vira um maço de três ("várias soluções"): uma mesma codificação
 *         pode representar soluções diferentes. Os fenótipos do passo 2 ficam.
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease, lerp = Anim.lerp;
  const FD = Anim.figData || {};
  const BLUE = '#0061a5', RED = '#b6321d';
  const FONT = '"LM Sans 8", "LM Sans", sans-serif';
  const FIX = { 24: 'Representação', 25: '(codificação)', 26: 'Solução', 27: '(genótipo)', 28: '(fenótipo)', 29: 'é',
    36: 'Representação', 37: '(codificação)', 38: 'Solução' };
  const DIM = { '1': [268.4, 88.4], '2': [269.6261, 89.219] };
  // figura 2: grupos de itens
  const CHROM = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], PERSON = [18, 19], LONG = [22, 23], WORDS = [29, 30, 31];
  const FEET = [245.43, 73.49];

  function mk(it, parent) {
    if (it.t === 'x') {
      const t = S('text', { x: it.x, y: it.y, 'font-size': it.fs, fill: it.c, 'font-family': it.ff }, parent);
      t.textContent = it.tx; return t;
    }
    const p = S('path', { d: it.d, fill: it.f || 'none' }, parent);
    if (it.fo !== undefined) p.setAttribute('fill-opacity', it.fo);
    if (it.eo) p.setAttribute('fill-rule', 'evenodd');
    if (it.s) { p.setAttribute('stroke', it.s); p.setAttribute('stroke-width', it.w); p.setAttribute('stroke-linejoin', 'round'); }
    return p;
  }
  const center = function (it) { return [(it.b[0] + it.b[2]) / 2, (it.b[1] + it.b[3]) / 2]; };

  Anim.define('genfen', function (host) {
    const D = FD.rep, fig = host.dataset.fig;
    if (!D) { console.warn('genfen: faltam os dados (dados/rep.js)'); return { snap: function () {}, play: null }; }
    const IT = D.items, W = DIM[fig][0], H = DIM[fig][1];
    const svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H });
    host.appendChild(svg);
    const gGhost = S('g', null, svg), gIt = S('g', null, svg), gTop = S('g', null, svg);
    const set = D.states[fig === '1' ? 'representacao1' : 'representacao2'];
    const els = {};
    set.forEach(function (i) { els[i] = mk(IT[i], gIt); if (FIX[i]) els[i].textContent = FIX[i]; });
    const ids = set.slice();
    const box1 = fig === '1' ? [32, 36, 37] : [0, 24, 25], box2 = fig === '1' ? [33, 38] : [1, 26], arr = fig === '1' ? [34, 35] : [20, 21];

    function reset(on) {
      ids.forEach(function (i) { els[i].style.display = on ? '' : 'none'; els[i].style.opacity = ''; els[i].removeAttribute('transform');
        els[i].removeAttribute('stroke-dasharray'); els[i].removeAttribute('stroke-dashoffset'); });
      while (gTop.firstChild) gTop.removeChild(gTop.firstChild);
    }
    const vis = function (l, on) { l.forEach(function (i) { els[i].style.display = on === false ? 'none' : ''; }); };
    const op = function (l, v) { l.forEach(function (i) { els[i].style.opacity = v; }); };
    const tf = function (l, s) { l.forEach(function (i) { if (s) els[i].setAttribute('transform', s); else els[i].removeAttribute('transform'); }); };
    async function fade(h, l, dur) { vis(l); op(l, 0); await h.tween(dur || 300, function (e) { op(l, e); }); op(l, ''); }
    async function pop(h, l, c, dur) {
      vis(l); op(l, 0);
      await h.tween(dur || 320, function (e, t) { op(l, Math.min(1, t * 2.5)); tf(l, 'translate(' + c[0] + ' ' + c[1] + ') scale(' + Math.max(0.01, e) + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')'); }, ease.back);
      op(l, ''); tf(l, null);
    }
    async function drawLine(h, line, head, dur) {
      const it = IT[line], L = it.b[2] - it.b[0], e = els[line];
      vis([line]); e.setAttribute('stroke-dasharray', L); e.setAttribute('stroke-dashoffset', L);
      await h.tween(dur || 450, function (t) { e.setAttribute('stroke-dashoffset', L * (1 - t)); }, ease.inOut);
      e.removeAttribute('stroke-dasharray'); e.removeAttribute('stroke-dashoffset');
      await pop(h, [head], center(IT[head]), 160);
    }

    // ---------- acréscimos dos passos 2 e 3 (figura 2) ----------
    function phenos(alpha) {
      while (gGhost.firstChild) gGhost.removeChild(gGhost.firstChild);
      const out = [];
      [[-13, 0.82, 0.82, BLUE], [11, 0.92, 1.08, RED]].forEach(function (v) {
        const g = S('g', { transform: 'translate(' + (FEET[0] + v[0]) + ' ' + FEET[1] + ') scale(' + v[1] + ' ' + v[2] + ') translate(' + (-FEET[0]) + ' ' + (-FEET[1]) + ')' }, gGhost);
        PERSON.forEach(function (i) { S('path', { d: IT[i].d, fill: v[3], 'fill-opacity': 0.4 }, g); });
        g.style.opacity = alpha; out.push(g);
      });
      // máscara branca: a pessoa original (cinza 50%) não deixa ver os fenótipos através dela
      PERSON.forEach(function (i) { S('path', { d: IT[i].d, fill: '#fff' }, gGhost); });
      return out;
    }
    function deck(alpha) {
      const out = [];
      [[8, 8], [4, 4]].forEach(function (d) {
        const g = S('g', { transform: 'translate(' + d[0] + ' ' + d[1] + ')' }, gGhost);
        S('path', { d: IT[1].d, fill: '#00008b', 'fill-opacity': 0.25, stroke: '#000', 'stroke-width': 0.6, 'stroke-opacity': 0.6 }, g);
        S('path', { d: IT[1].d, fill: '#fff' }, g);   // carta opaca por baixo
        g.insertBefore(g.lastChild, g.firstChild);
        g.style.opacity = alpha; out.push(g);
      });
      S('path', { d: IT[1].d, fill: '#fff' }, gGhost);   // máscara da caixa "Solução" original (azul 50%)
      const t = S('text', { x: 189.43 + 6, y: 75.5, 'text-anchor': 'middle', 'font-size': 6.6, 'font-family': FONT, fill: BLUE }, gGhost);
      t.textContent = 'várias soluções'; t.style.opacity = alpha; out.push(t);
      return out;
    }

    function snap(st) {
      while (gGhost.firstChild) gGhost.removeChild(gGhost.firstChild);
      if (st === 'vazio') { reset(false); return; }
      reset(true);
      if (st === 'meio' || st === 'sols') phenos(1);
      if (st === 'sols') deck(1);
    }
    async function play(a, b, h) {
      if (b === 'r1') {
        reset(false);
        await pop(h, box1, center(IT[box1[0]]), 380);
        await drawLine(h, arr[0], arr[1], 420);
        await pop(h, box2, center(IT[box2[0]]), 380);
        const L = IT[arr[0]], tk = S('circle', { r: 2.6, fill: RED, stroke: '#fff', 'stroke-width': 0.6 }, gTop);
        const x0 = IT[box1[0]].b[0] + 36, x1 = IT[box2[0]].b[0] + 36, y = L.b[1];
        await h.tween(1000, function (e) { tk.setAttribute('cx', lerp(x0, x1, e)); tk.setAttribute('cy', y); tk.setAttribute('opacity', e < 0.85 ? 1 : (1 - e) / 0.15); }, ease.inOut);
        tk.remove();
        return;
      }
      if (b === 'r2') {
        reset(true);
        const add = CHROM.concat(PERSON, LONG, WORDS, [27, 28]);
        vis(add, false);
        // cromossomo cresce de baixo para cima
        vis(CHROM);
        await h.tween(550, function (e) { tf(CHROM, 'translate(0 73.02) scale(1 ' + Math.max(0.01, e) + ') translate(0 -73.02)'); op(CHROM, Math.min(1, e * 2)); }, ease.out);
        tf(CHROM, null); op(CHROM, '');
        await fade(h, [27], 250);
        await pop(h, PERSON, FEET, 420);
        await fade(h, [28], 250);
        await drawLine(h, LONG[0], LONG[1], 700);
        for (const w of WORDS) await fade(h, [w], 200);
        return;
      }
      if (b === 'meio') {
        snap('r2');
        const g = phenos(0);
        await h.tween(300, function (e) { tf(PERSON, 'translate(' + FEET[0] + ' ' + FEET[1] + ') scale(' + (1 + 0.08 * Math.sin(Math.PI * e)) + ') translate(' + (-FEET[0]) + ' ' + (-FEET[1]) + ')'); });
        tf(PERSON, null);
        for (const x of g) await h.tween(450, function (e) { x.style.opacity = e; });
        return;
      }
      if (b === 'sols') {
        snap('meio');
        const g = deck(0);
        await h.tween(600, function (e) { g.forEach(function (x) { x.style.opacity = e; }); });
        return;
      }
      snap(b);
    }
    return { snap: snap, play: play };
  });
})();
