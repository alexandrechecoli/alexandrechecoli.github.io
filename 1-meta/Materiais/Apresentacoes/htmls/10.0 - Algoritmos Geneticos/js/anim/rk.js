/* Chaves aleatórias (aula 10, slides 92–93) e fluxograma do BRKGA (slide 95).
 *
 * rkcross — dados dados/rk.js (CrossRK1 e CrossRK2, ferramentas/figura_camadas.py). Como no PMX, a figura do
 *   PDF fica invisível e o SVG por cima; o estado final de cada slide é a figura do PDF.
 *   r0 → r1 (92)  os cortes descem; os trechos do meio dos pais descem cruzados (p2 → o1, p1 → o2), e nos filhos
 *                 ficam só as cores (como na figura)
 *   r1 → r2 (93)  os valores do meio entram; o resto de cada filho é copiado do próprio pai, célula a célula —
 *                 sem repetidos, nenhuma correção
 *   r2 → r3 (93, passo novo)  decodificação: cada chave ganha o seu índice (1…9); as células se ordenam pela chave
 *                 e os índices, na nova ordem, são a permutação (sempre válida)
 * brkga — camada sobre a figura do PDF (img visível, como o ciclo do frame 48):
 *   b0 → b1 (95)  uma ficha percorre o fluxograma: Begin → gerar → decodificar → parar? → (não) ordenar →
 *                 classificar → copiar elite → mutantes → combinar → decodificar …; 3 gerações, depois "yes" → Stop.
 *                 Cada caixa acende quando a ficha passa; a "Decode" (a única parte dependente do problema) pulsa
 *                 em vermelho. Na 1ª geração, uma fileira de 10 soluções se ordena pelo fitness e a elite (3) fica
 *                 dourada; os mutantes entram em vermelho e os filhos em azul
 *   b1 → b2 (95, passo 2: o texto "a única parte específica…")  a caixa Decode pulsa
 */
(function () {
  'use strict';
  const A = window.Anim;
  if (!A) return;
  const S = A.svg, E = A.ease, lerp = A.lerp;
  const HI = '#e0a000', RED = '#c0281a', MYBLUE = '#0061a5', GREEN = '#169b3a';

  const ACC = { '´': '́', '˜': '̃', '¸': '̧', 'ˆ': '̂', '`': '̀', '¨': '̈' };
  const fixText = function (t) { return t.replace(/([´˜¸ˆ`¨])(\S)/g, function (m, a, c) { return c + ACC[a]; }).normalize('NFC'); };
  function item(root, it) {
    let e;
    if (it.t === 'x') {
      e = S('text', { x: it.x, y: it.y, fill: it.c, 'font-family': it.ff + ', serif', 'font-size': it.fs }, root);
      if (it.st) e.setAttribute('font-style', it.st);
      e.textContent = fixText(it.tx);
    } else {
      e = S('path', { d: it.d, fill: it.f || 'none' }, root);
      if (it.fo != null) e.setAttribute('fill-opacity', it.fo);
      if (it.s) {
        e.setAttribute('stroke', it.s); e.setAttribute('stroke-width', it.w);
        if (it.da) e.setAttribute('stroke-dasharray', it.da);
        if (it.lj) e.setAttribute('stroke-linejoin', it.lj);
      }
    }
    return e;
  }
  function stroke(h, el, dur) {
    let L = 0;
    try { L = el.getTotalLength(); } catch (e) { L = 0; }
    el.setAttribute('opacity', 1);
    if (!(L > 0)) return Promise.resolve();
    el.style.strokeDasharray = L; el.style.strokeDashoffset = L;
    return h.tween(dur || 400, function (e) { el.style.strokeDashoffset = L * (1 - e); })
      .then(function () { el.style.strokeDasharray = ''; el.style.strokeDashoffset = ''; });
  }

  // =====================================================================================================
  // Cruzamento com chaves aleatórias
  // =====================================================================================================
  A.define('rkcross', function (host) {
    const D = A.figData.rk, items = D.items;
    const svg = S('svg', { viewBox: '0 0 124.4 92.4', 'aria-hidden': 'true' }, host);
    const ROWY = [8.2, 32.2, 56.2, 80.2], X0 = 16.2, CW = 12, MID = [3, 4, 5, 6];
    const near = function (a, b) { return Math.abs(a - b) < 0.6; };
    // células (retângulo e texto) por linha e coluna; rótulos p1, p2, o1, o2; cortes
    const cell = [[], [], [], []], txt = [[], [], [], []], lab = [[], [], [], []], CUTS = [];
    items.forEach(function (it, i) {
      if (it.t === 'p') {
        if (it.b[2] - it.b[0] < 1) { CUTS.push(i); return; }
        const r = ROWY.findIndex(function (y) { return near(it.b[1], y); }), j = Math.round((it.b[0] - X0) / CW);
        if (r >= 0) cell[r][j] = i;
      } else if (/^\d\.\d\d$/.test(it.tx)) {
        const r = ROWY.findIndex(function (y) { return it.b[1] > y && it.b[3] < y + CW; }), j = Math.floor((it.b[0] - X0) / CW);
        if (r >= 0) txt[r][j] = i;
      } else {
        const r = ROWY.findIndex(function (y) { return it.b[1] > y - 2 && it.b[3] < y + CW + 1; });
        if (r >= 0) lab[r].push(i);
      }
    });
    const key = function (r, j) { return +items[txt[r][j]].tx; };
    const S1 = D.states.CrossRK1, S2 = D.states.CrossRK2;
    let L = {};
    function build(ids) {
      svg.textContent = ''; L = { el: {} };
      L.cells = S('g', {}, svg);
      ids.slice().sort(function (a, b) { return a - b; }).forEach(function (i) { L.el[i] = item(svg, items[i]); });
      L.fx = S('g', {}, svg);
    }
    const op = function (ids, v) { ids.forEach(function (i) { if (L.el[i]) L.el[i].setAttribute('opacity', v); }); };
    const flat = function (a) { return [].concat.apply([], a).filter(function (x) { return x != null; }); };
    const R0 = S1.filter(function (i) { return items[i].b[3] < 50 && CUTS.indexOf(i) < 0; });
    // cópia de células (retângulo + texto) para voar
    function ghost(r, js, withText, withFill) {
      const g = S('g', {}, L.fx);
      js.forEach(function (j) {
        const c = items[cell[r][j]];
        const e = item(g, c);
        if (!withFill) { e.setAttribute('fill', 'none'); }
        if (withText && txt[r][j] != null) item(g, items[txt[r][j]]);
      });
      return g;
    }
    // decodificação: estado r3 (as células de cada filho na ordem das chaves, com o índice no lugar da chave)
    function order(r) { return [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(function (a, b) { return key(r, a) - key(r, b) || a - b; }); }
    function decoded(r, e) {                              // e: 0 = posições originais, 1 = ordenadas
      const ord = order(r);
      return [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (j) { return (ord.indexOf(j) - j) * CW * e; });
    }
    function drawDecoded(e, swap) {                       // move as células dos filhos; swap: chave → índice
      [2, 3].forEach(function (r) {
        const dx = decoded(r, e);
        for (let j = 0; j < 9; j++) {
          [cell[r][j], txt[r][j]].forEach(function (i) { if (L.el[i]) L.el[i].setAttribute('transform', 'translate(' + dx[j].toFixed(2) + ' 0)'); });
          if (L.idx) {
            const t = L.idx[r][j];
            t.setAttribute('transform', 'translate(' + dx[j].toFixed(2) + ' 0)');
            const big = swap;
            t.setAttribute('y', lerp(ROWY[r] + CW + 4.6, ROWY[r] + 8.3, big));
            t.setAttribute('font-size', lerp(3.6, 5.6, big));
            t.setAttribute('fill', A.mix('#777777', '#000000', big));
            L.el[txt[r][j]].setAttribute('opacity', 1 - big);
          }
        }
      });
    }
    function addIdx() {
      L.idx = [null, null, [], []];
      [2, 3].forEach(function (r) {
        for (let j = 0; j < 9; j++) {
          const t = S('text', { x: X0 + CW * j + CW / 2, y: ROWY[r] + CW + 4.6, 'text-anchor': 'middle', 'font-family': 'KaTeX_Main, serif', 'font-size': 3.6, fill: '#777' }, L.fx);
          t.textContent = String(j + 1);
          L.idx[r].push(t);
        }
      });
      L.ok = [2, 3].map(function (r) {
        const g = S('g', { opacity: 0 }, L.fx);
        S('path', { d: 'M' + 126.5 + ' ' + (ROWY[r] + 6) + 'l1.6 1.9l3.4-4.3', fill: 'none', stroke: GREEN, 'stroke-width': 0.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
        return g;
      });
    }
    function snap(st) {
      if (st === 'r0') { build(R0); return; }
      if (st === 'r1') { build(S1); return; }
      build(S2);
      if (st === 'r3') { addIdx(); drawDecoded(1, 1); L.ok.forEach(function (g) { g.setAttribute('opacity', 1); }); }
    }
    async function play(a, b, h) {
      if (a === 'r0' && b === 'r1') {
        build(S1);
        const kids = flat([cell[2], cell[3], lab[2], lab[3]]);
        op(kids.concat(CUTS), 0);
        await h.all(CUTS.map(function (i) { return stroke(h, L.el[i], 450); }));
        // os trechos do meio dos pais acendem
        const segs = MID.map(function (j) { return cell[0][j]; }).concat(MID.map(function (j) { return cell[1][j]; }));
        await h.tween(450, function (e) { segs.forEach(function (i) { L.el[i].setAttribute('fill-opacity', (items[i].fo || 1) * (1 + 0.8 * Math.sin(Math.PI * e))); }); }, E.linear);
        segs.forEach(function (i) { L.el[i].setAttribute('fill-opacity', items[i].fo != null ? items[i].fo : 1); });
        // as linhas vazias dos filhos
        const outer = flat([lab[2], lab[3]]).concat([0, 1, 2, 7, 8].map(function (j) { return cell[2][j]; }), [0, 1, 2, 7, 8].map(function (j) { return cell[3][j]; }));
        await h.tween(350, function (e) { op(outer, e); });
        // cruzado: o meio de p2 desce para o1, o de p1 desce para o2 (os números somem no caminho)
        const g1 = ghost(1, MID, true, true), g2 = ghost(0, MID, true, true);
        await h.tween(900, function (e) {
          g1.setAttribute('transform', 'translate(0 ' + (24 * e).toFixed(2) + ')');
          g2.setAttribute('transform', 'translate(0 ' + (72 * e).toFixed(2) + ')');
          [g1, g2].forEach(function (g) { g.querySelectorAll('text').forEach(function (t) { t.setAttribute('opacity', 1 - e); }); });
        });
        g1.remove(); g2.remove();
        op(MID.map(function (j) { return cell[2][j]; }).concat(MID.map(function (j) { return cell[3][j]; })), 1);
        return;
      }
      if (a === 'r1' && b === 'r2') {
        build(S2);
        const kt = flat([txt[2], txt[3]]);
        op(kt, 0);
        // os valores do meio entram (vindos dos pais, cruzados)
        const m1 = ghost(1, MID, true, false), m2 = ghost(0, MID, true, false);
        [m1, m2].forEach(function (g) { g.querySelectorAll('path').forEach(function (p) { p.remove(); }); });
        await h.tween(800, function (e) {
          m1.setAttribute('transform', 'translate(0 ' + (24 * e).toFixed(2) + ')');
          m2.setAttribute('transform', 'translate(0 ' + (72 * e).toFixed(2) + ')');
        });
        m1.remove(); m2.remove();
        op(MID.map(function (j) { return txt[2][j]; }).concat(MID.map(function (j) { return txt[3][j]; })), 1);
        // o resto de cada filho vem do próprio pai, célula a célula
        for (const j of [0, 1, 2, 7, 8]) {
          const c1 = S('g', {}, L.fx), c2 = S('g', {}, L.fx);
          item(c1, items[txt[0][j]]); item(c2, items[txt[1][j]]);
          await h.tween(380, function (e) {
            c1.setAttribute('transform', 'translate(0 ' + (48 * e).toFixed(2) + ')');
            c2.setAttribute('transform', 'translate(0 ' + (48 * e).toFixed(2) + ')');
          });
          c1.remove(); c2.remove();
          op([txt[2][j], txt[3][j]], 1);
        }
        return;
      }
      if (a === 'r2' && b === 'r3') {
        build(S2); addIdx();
        L.idx[2].concat(L.idx[3]).forEach(function (t) { t.setAttribute('opacity', 0); });
        for (const r of [2, 3]) {
          // os índices 1…9 aparecem sob as chaves
          await h.tween(400, function (e) { L.idx[r].forEach(function (t) { t.setAttribute('opacity', e); }); });
          // as células se ordenam pela chave
          // (quem vai para a direita sobe e quem vai para a esquerda desce: as células não passam umas sobre as outras)
          const D1 = decoded(r, 1);
          await h.tween(1300, function (e) {
            const dx = decoded(r, e);
            for (let j = 0; j < 9; j++) {
              const dy = -Math.sign(D1[j]) * Math.min(6, 1.5 + Math.abs(D1[j]) / 12) * Math.sin(Math.PI * e);
              const tr = 'translate(' + dx[j].toFixed(2) + ' ' + dy.toFixed(2) + ')';
              [cell[r][j], txt[r][j]].forEach(function (i) { L.el[i].setAttribute('transform', tr); });
              L.idx[r][j].setAttribute('transform', tr);
            }
          });
          // o índice toma o lugar da chave: a linha é a permutação
          await h.tween(500, function (e) {
            L.idx[r].forEach(function (t, j) {
              t.setAttribute('y', lerp(ROWY[r] + CW + 4.6, ROWY[r] + 8.3, e));
              t.setAttribute('font-size', lerp(3.6, 5.6, e));
              t.setAttribute('fill', A.mix('#777777', '#000000', e));
              L.el[txt[r][j]].setAttribute('opacity', 1 - e);
            });
          });
          const g = L.ok[r - 2];
          await h.tween(300, function (e) { g.setAttribute('opacity', e); });
        }
      }
    }
    return { snap: snap, play: play };
  });

  // =====================================================================================================
  // Fluxograma do BRKGA (camada sobre a figura)
  // =====================================================================================================
  A.define('brkga', function (host) {
    const svg = S('svg', { viewBox: '0 0 448.4 247.883', 'aria-hidden': 'true' }, host);
    // caixas (retângulos; a de parada é um losango e as pontas são círculos)
    const BOX = {
      begin: { c: [76.75, 49.7], r: 22.6 }, gen: { b: [128.2, 22.8, 210.9, 72.7] }, dec: { b: [255.5, 23.1, 336.0, 72.5] },
      stop: { d: [238.2, 92.2, 334.2, 156.2] }, end: { c: [385.2, 125.5], r: 23 }, sort: { b: [128.7, 104.0, 208.7, 152.0] },
      cls: { b: [16.2, 103.7, 96.2, 151.7] }, copy: { b: [16.2, 183.7, 96.2, 231.7] }, mut: { b: [128.2, 183.7, 208.2, 231.7] },
      comb: { b: [239.9, 184.5, 329.0, 235.1] }
    };
    const P = {
      begin: [76.75, 49.7], gen: [169.6, 47.7], dec: [286.2, 47.7], stop: [286.2, 124.2], sort: [168.7, 124.2], cls: [56.2, 124.2],
      copy: [56.2, 207.7], mut: [168.2, 207.7], comb: [284.5, 207.7], c1: [432.2, 207.7], c2: [432.2, 47.7], end: [385.2, 124.2]
    };
    let L = {};
    function build() { svg.textContent = ''; L = {}; L.fx = S('g', {}, svg); L.chips = S('g', {}, svg); L.top = S('g', {}, svg); }
    function glow(name, color, dur, amp) {
      const bx = BOX[name], g = S('g', { opacity: 0 }, L.fx);
      let el;
      const pad = 3;
      if (bx.b) el = S('rect', { x: bx.b[0] - pad, y: bx.b[1] - pad, width: bx.b[2] - bx.b[0] + 2 * pad, height: bx.b[3] - bx.b[1] + 2 * pad, rx: 3 }, g);
      else if (bx.d) { const d = bx.d, cx = (d[0] + d[2]) / 2, cy = (d[1] + d[3]) / 2; el = S('path', { d: 'M' + (d[0] - 5) + ' ' + cy + 'L' + cx + ' ' + (d[1] - 4) + 'L' + (d[2] + 5) + ' ' + cy + 'L' + cx + ' ' + (d[3] + 4) + 'Z' }, g); }
      else el = S('circle', { cx: bx.c[0], cy: bx.c[1], r: bx.r + pad }, g);
      el.setAttribute('fill', color); el.setAttribute('fill-opacity', 0.12); el.setAttribute('stroke', color); el.setAttribute('stroke-width', amp || 2.2);
      return { g: g, run: function (h) { return h.tween(dur || 650, function (e) { g.setAttribute('opacity', Math.sin(Math.PI * e)); }, E.linear).then(function () { g.remove(); }); } };
    }
    function chipRow() {                                   // 10 soluções (fileira sob "Sort")
      const fit = [0.42, 0.81, 0.27, 0.93, 0.55, 0.68, 0.12, 0.77, 0.36, 0.60];
      const x0 = 132, w = 7.2, y = 160;
      const chips = fit.map(function (f, i) {
        const g = S('g', { opacity: 0 }, L.chips);
        g._r = S('rect', { x: 0, y: y, width: 6.2, height: 14, rx: 1, fill: '#fff', stroke: '#555', 'stroke-width': 0.5 }, g);
        g._b = S('rect', { x: 0.6, y: y + 14 - 13 * f, width: 5, height: 13 * f, fill: MYBLUE, 'fill-opacity': 0.7 }, g);
        g._f = f; g._x = x0 + i * w; g.setAttribute('transform', 'translate(' + g._x + ' 0)');
        return g;
      });
      return { chips: chips, x0: x0, w: w };
    }
    async function move(h, tok, a, b, ms) {
      const pa = P[a] || a, pb = P[b] || b;
      await h.tween(ms, function (e) { tok.setAttribute('cx', lerp(pa[0], pb[0], e)); tok.setAttribute('cy', lerp(pa[1], pb[1], e)); }, E.inOut);
    }
    const dist = function (a, b) { const pa = P[a], pb = P[b]; return Math.hypot(pb[0] - pa[0], pb[1] - pa[1]); };
    function snap() { build(); }
    async function play(a, b, h) {
      build();
      if (b === 'b2') {                                     // passo 2: a caixa da decodificação pulsa
        for (let k = 0; k < 2; k++) await glow('dec', RED, 750, 3).run(h);
        return;
      }
      if (b !== 'b1') return;
      const cnt = S('text', { x: 444, y: 243, 'text-anchor': 'end', 'font-size': 11, 'font-family': 'KaTeX_Main, serif', fill: MYBLUE, 'font-weight': 'bold' }, L.top);
      const tok = S('circle', { r: 5, fill: MYBLUE, stroke: '#fff', 'stroke-width': 1.2, cx: P.begin[0], cy: P.begin[1] }, L.top);
      const V = 2.6;                                          // ms por unidade de caminho
      const go = async function (x, y, sp) { await move(h, tok, x, y, Math.max(160, dist(x, y) * V * (sp || 1))); };
      const visit = async function (name, color, dur) { await glow(name, color || HI, dur).run(h); };
      await visit('begin', HI, 500);
      await go('begin', 'gen'); await visit('gen');
      for (let gen = 1; ; gen++) {
        const fast = gen > 1 ? 0.4 : 1;
        cnt.textContent = 'geração ' + (gen - 1);
        await go(gen === 1 ? 'gen' : 'c2', 'dec', fast);
        await visit('dec', RED, 800 * fast + 150);
        await go('dec', 'stop', fast);
        const done = gen > 3;
        await visit('stop', done ? GREEN : HI, 500 * fast + 100);
        if (done) break;
        cnt.textContent = 'geração ' + gen;
        await go('stop', 'sort', fast);
        let row = null;
        if (gen === 1) {                                      // ordenar: as soluções se arrumam pelo fitness
          row = chipRow();
          await h.tween(300, function (e) { row.chips.forEach(function (c) { c.setAttribute('opacity', e); }); });
          const ord = row.chips.slice().sort(function (p, q) { return q._f - p._f; });
          const from = row.chips.map(function (c) { return c._x; });
          await h.all([visit('sort'), h.tween(800, function (e) { ord.forEach(function (c, k) { const x = lerp(from[row.chips.indexOf(c)], row.x0 + k * row.w, e); c.setAttribute('transform', 'translate(' + x + ' 0)'); }); })]);
          row.ord = ord;
        } else await visit('sort', HI, 350);
        await go('sort', 'cls', fast);
        if (row) {                                            // elite (3 melhores) fica dourada
          await h.all([visit('cls'), h.tween(500, function (e) { row.ord.slice(0, 3).forEach(function (c) { c._b.setAttribute('fill', A.mix(MYBLUE, HI, e)); c._b.setAttribute('fill-opacity', 0.7 + 0.3 * e); }); })]);
        } else await visit('cls', HI, 350);
        await go('cls', 'copy', fast); await visit('copy', HI, gen === 1 ? 650 : 350);
        await go('copy', 'mut', fast);
        if (row) {                                            // os 2 piores dão lugar a mutantes (vermelhos)
          await h.all([visit('mut'), h.tween(500, function (e) { row.ord.slice(8).forEach(function (c) { c._b.setAttribute('fill', A.mix(MYBLUE, RED, e)); c._b.setAttribute('height', 13 * lerp(c._f, 0.5, e)); c._b.setAttribute('y', 174 - 13 * lerp(c._f, 0.5, e)); }); })]);
        } else await visit('mut', HI, 350);
        await go('mut', 'comb', fast);
        if (row) {                                            // os do meio dão lugar aos filhos (elite × não elite)
          await h.all([visit('comb'), h.tween(500, function (e) { row.ord.slice(3, 8).forEach(function (c) { c._b.setAttribute('fill', A.mix(MYBLUE, '#3b9a9a', e)); }); })]);
          await h.tween(400, function (e) { row.chips.forEach(function (c) { c.setAttribute('opacity', 1 - e); }); });
          L.chips.textContent = '';
        } else await visit('comb', HI, 350);
        await go('comb', 'c1', fast); await go('c1', 'c2', fast);
      }
      await go('stop', 'end'); await visit('end', GREEN, 700);
      await h.wait(500);
      await h.tween(400, function (e) { tok.setAttribute('opacity', 1 - e); cnt.setAttribute('opacity', 1 - e); });
      L.top.textContent = '';
    }
    return { snap: snap, play: play };
  });
})();
