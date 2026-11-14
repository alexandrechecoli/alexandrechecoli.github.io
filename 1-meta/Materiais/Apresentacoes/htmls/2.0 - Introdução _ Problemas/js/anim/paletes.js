/* Carregamento de paletes → BPP (aula 2, frames 32–35): figuras BPP1…BPP4 do Ipe em camadas.
 *
 * Dados: js/anim/dados/bpp.js (figura_camadas.py, uma cena por figura: bpp1 … bpp4; textos em Iwona).
 * Uso: <span class="anim pl" data-anim="paletes" data-fig="bppN" data-from="vazio" data-state=".."><img …></span>
 * (a <img> do PDF fica invisível reservando o espaço; o SVG por cima, no quadro da figura).
 *
 *   bpp1  b1   frame 32: o palete sobe, as caixas caem nele linha por linha (de baixo para cima) e a legenda brota
 *   bpp2  b2   frame 33: a caixa brota e cópias dela voam para o padrão de carregamento (girando 90° nas verticais)
 *   bpp3  b3   frame 34: o eixo h se desenha, as caixas crescem do chão e a tracejada leva a altura de cada uma ao eixo
 *   bpp4  b4   frame 35, passo 1: cada camada se monta caixa a caixa, o palete sobe e a régua h_max cresce
 *         b4p  passo 2 (data-steps="2"): camadas são empilhadas no palete até h_max (uma não cabe e volta; a última
 *              fecha exatamente em h_max) e o texto liga: camada = item, palete = mochila → BPP
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease, lerp = Anim.lerp;
  const FD = Anim.figData || {};
  const RED = '#b6321d', MYBLUE = '#0061a5', GREEN = '#1a7f37';
  const FONT = '"LM Sans 8", "LM Sans", sans-serif';

  function mk(it, parent) {
    if (it.t === 'x') {
      const t = S('text', { x: it.x, y: it.y, 'font-size': it.fs, fill: it.c,
        'font-family': it.ff === 'Iwona' ? '"Iwona", "LM Sans", sans-serif' : it.ff }, parent);
      if (it.st) t.setAttribute('font-style', it.st);
      if (it.fw) t.setAttribute('font-weight', it.fw);
      t.textContent = it.tx;
      return t;
    }
    const p = S('path', { d: it.d, fill: it.f || 'none' }, parent);
    if (it.fo !== undefined) p.setAttribute('fill-opacity', it.fo);
    if (it.s) {
      p.setAttribute('stroke', it.s); p.setAttribute('stroke-width', it.w);
      if (it.da) p.setAttribute('stroke-dasharray', it.da);
      if (it.lc) p.setAttribute('stroke-linecap', it.lc);
      if (it.lj) p.setAttribute('stroke-linejoin', it.lj);
    }
    return p;
  }
  const range = function (a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
  const cx = function (b) { return (b[0] + b[2]) / 2; }, cy = function (b) { return (b[1] + b[3]) / 2; };
  // agrupa itens com o mesmo retângulo (célula com contorno e preenchimento em dois desenhos)
  function cells(IT, ids) {
    const m = {}, out = [];
    ids.forEach(function (i) { const k = IT[i].b.join(','); if (!m[k]) { m[k] = { b: IT[i].b, ids: [] }; out.push(m[k]); } m[k].ids.push(i); });
    return out;
  }

  // ---------- frame 35, passo 2: as camadas que vão para o palete ----------
  const ROWS4 = { red: { ids: range(0, 4), y0: 36.2, h: 12 }, blue: { ids: range(5, 34), y0: 52.2, h: 8 }, orange: { ids: range(35, 44), y0: 64.2, h: 16 } };
  const PAL = { x0: 144.2, x1: 240.2, top: 72.2, hmax: 0.2, sx: 96 / 120 };
  const STACK = ['orange', 'orange', 'red', 'red', 'blue', 'orange', 'blue'];   // a 6ª (laranja) não cabe e volta

  Anim.define('paletes', function (host) {
    const sc = host.dataset.fig, D = FD[sc];
    if (!D) { console.warn('paletes: faltam os dados de', sc); return { snap: function () {}, play: null }; }
    const IT = D.items;
    const svg = S('svg', { viewBox: '0 0 ' + D.W + ' ' + D.H });
    host.appendChild(svg);
    const gIt = S('g', null, svg), gTop = S('g', null, svg), gRul = S('g', null, svg);   // gRul: régua hmax por cima da pilha
    const els = IT.map(function (it) { return mk(it, gIt); });
    const all = D.states[Object.keys(D.states)[0]];

    function empty(g) { while (g.firstChild) g.removeChild(g.firstChild); }
    function reset() { els.forEach(function (e) { e.style.opacity = ''; e.removeAttribute('transform'); }); }
    function show(ids, on) { ids.forEach(function (i) { els[i].style.display = on === false ? 'none' : ''; }); }
    function hideAll() { els.forEach(function (e) { e.style.display = 'none'; }); }
    function tf(ids, s) { ids.forEach(function (i) { els[i].setAttribute('transform', s); }); }
    function op(ids, v) { ids.forEach(function (i) { els[i].style.opacity = v; }); }

    function ruler() { empty(gRul); [48, 49, 53, 54].forEach(function (i) { mk(IT[i], gRul); }); }
    function snap(st) {
      empty(gTop); empty(gRul); reset();
      show(all, st !== 'vazio');
      if (st === 'b4p') stackFinal();
    }
    // brota (escala a partir do centro do grupo)
    function pop(h, ids, dur) {
      const bs = ids.map(function (i) { return IT[i].b; });
      const b = [Math.min.apply(null, bs.map(function (q) { return q[0]; })), Math.min.apply(null, bs.map(function (q) { return q[1]; })),
        Math.max.apply(null, bs.map(function (q) { return q[2]; })), Math.max.apply(null, bs.map(function (q) { return q[3]; }))];
      const x = cx(b), y = cy(b);
      show(ids); op(ids, 0);
      return h.tween(dur || 360, function (e, t) {
        op(ids, Math.min(1, t * 2.5));
        tf(ids, 'translate(' + x + ' ' + y + ') scale(' + Math.max(0, e) + ') translate(' + (-x) + ' ' + (-y) + ')');
      }, ease.back).then(function () { op(ids, ''); tf(ids, ''); });
    }
    function fadeIn(h, ids, dur) {
      show(ids); op(ids, 0);
      return h.tween(dur || 300, function (e) { op(ids, e); }).then(function () { op(ids, ''); });
    }
    // cresce a partir de uma âncora: eixo 'y' (de baixo para cima, âncora y) ou 'x' (âncora x)
    function grow(h, ids, axis, anchor, dur, ez) {
      show(ids);
      return h.tween(dur || 450, function (e) {
        const s = Math.max(0.001, e);
        tf(ids, axis === 'y' ? 'translate(0 ' + anchor + ') scale(1 ' + s + ') translate(0 ' + (-anchor) + ')'
          : 'translate(' + anchor + ' 0) scale(' + s + ' 1) translate(' + (-anchor) + ' 0)');
      }, ez || ease.out).then(function () { tf(ids, ''); });
    }
    // vários grupos com atraso entre eles
    async function stagger(h, groups, gap, fn) {
      const ps = [];
      for (let k = 0; k < groups.length; k++) { ps.push(fn(groups[k], k)); await h.wait(gap); }
      await h.all(ps);
    }
    function text(x, y, s, size, color, o) {
      const t = S('text', Object.assign({ x: x, y: y, 'font-size': size, fill: color, 'font-family': FONT }, o || {}), gTop);
      t.textContent = s;
      return t;
    }

    // ---------- frame 35, passo 2 ----------
    function layer(kind, y) {   // cópia de uma linha de camadas, já no palete na altura y (topo da camada)
      const R = ROWS4[kind], g = S('g', null, gTop);
      R.ids.forEach(function (i) { mk(IT[i], g); });
      g._k = kind;
      g.setAttribute('transform', layerTf(kind, y, 1));
      return g;
    }
    function layerTf(kind, y, e, lift) {   // e = 0: na linha da esquerda; e = 1: no palete com o topo em y
      const R = ROWS4[kind];
      const sx = lerp(1, PAL.sx, e), tx = lerp(0, PAL.x0 - 0.2 * PAL.sx, e), ty = lerp(0, y - R.y0, e) - (lift || 0);
      return 'translate(' + tx + ' ' + ty + ') scale(' + sx + ' 1) translate(0 0)';
    }
    function captions() {
      const c2 = text(0, 15, 'cada palete = uma mochila (capacidade = h', 6.2, MYBLUE);
      const sub = S('tspan', { 'baseline-shift': 'sub', 'font-size': 4.5 }, c2); sub.textContent = 'max';
      const end = S('tspan', null, c2); end.textContent = ')';
      return [text(0, 7, 'cada camada = um item (tamanho = altura)', 6.2, MYBLUE), c2,
        text(0, 25, '→ é o bin packing problem (BPP)!', 7, MYBLUE, { 'font-weight': 700 })];
    }
    function hline() { return S('path', { d: 'M' + PAL.x0 + ' ' + (PAL.hmax + 0.2) + 'H' + PAL.x1, stroke: RED, 'stroke-width': 0.5, 'stroke-dasharray': '2 1.5', fill: 'none' }, gTop); }
    function stackFinal() {
      hline(); ruler();
      let y = PAL.top;
      STACK.forEach(function (k, n) { if (n === 5) return; y -= ROWS4[k].h; layer(k, y); });
      text(PAL.x1 + 3, PAL.hmax + 5, 'cheio', 6, GREEN, { 'font-weight': 700 });
      captions();
    }
    async function stackPlay(h) {
      const line = hline(); line.setAttribute('opacity', 0); ruler();
      await h.tween(300, function (e) { line.setAttribute('opacity', e); });
      let y = PAL.top;
      for (let n = 0; n < STACK.length; n++) {
        const k = STACK[n], R = ROWS4[k], yt = y - R.h, g = layer(k, yt);
        await h.tween(700, function (e) { g.setAttribute('transform', layerTf(k, yt, e, Math.sin(Math.PI * e) * 14)); }, ease.inOut);
        if (yt < PAL.hmax - 0.01) {   // passa de hmax: fica vermelha, treme e volta
          g.querySelectorAll('path').forEach(function (p) { p.setAttribute('stroke', RED); });
          const x = text(PAL.x1 + 3, yt + R.h / 2 + 2, 'não cabe', 6, RED, { 'font-weight': 700 });
          await h.tween(500, function (e, t) { g.setAttribute('transform', 'translate(' + Math.sin(t * Math.PI * 8) * 1.5 * (1 - t) + ' 0) ' + layerTf(k, yt, 1)); }, ease.linear);
          await h.wait(300);
          await h.tween(550, function (e) { g.setAttribute('transform', layerTf(k, yt, 1 - e)); g.setAttribute('opacity', 1 - e); x.setAttribute('opacity', 1 - e); }, ease.inOut);
          g.remove(); x.remove();
          continue;
        }
        y = yt;
      }
      const ok = text(PAL.x1 + 3, PAL.hmax + 5, 'cheio', 6, GREEN, { 'font-weight': 700 });
      ok.setAttribute('opacity', 0);
      await h.tween(300, function (e) { ok.setAttribute('opacity', e); });
      const cs = captions();
      for (const c of cs) { c.setAttribute('opacity', 0); await h.tween(350, function (e) { c.setAttribute('opacity', e); }); }
    }

    // ---------- cenas ----------
    const SCENES = {
      bpp1: async function (h) {
        hideAll();
        const pallet = [0, 19, 20], legend = [33, 34, 35, 36, 37];
        show(pallet); op(pallet, 0);
        await h.tween(450, function (e) { op(pallet, e); tf(pallet, 'translate(0 ' + (8 * (1 - e)) + ')'); }, ease.out);
        op(pallet, ''); tf(pallet, '');
        const boxes = cells(IT, all.filter(function (i) { return pallet.indexOf(i) < 0 && legend.indexOf(i) < 0; }));
        boxes.sort(function (a, b) { return b.b[1] - a.b[1] || a.b[0] - b.b[0]; });   // de baixo para cima
        await stagger(h, boxes, 55, function (c) {
          show(c.ids); op(c.ids, 0);
          return h.tween(340, function (e, t) {
            op(c.ids, Math.min(1, t * 3)); tf(c.ids, 'translate(0 ' + (-(1 - e) * (c.b[1] + 6)) + ')');
          }, ease.out).then(function () { op(c.ids, ''); tf(c.ids, ''); });
        });
        await pop(h, [33], 300); await pop(h, [36], 260);
        await pop(h, [34, 35], 300); await pop(h, [37], 260);
      },
      bpp2: async function (h) {
        hideAll();
        await pop(h, [0], 420);
        const src = IT[0].b;
        const pieces = range(1, 16).slice().sort(function (a, b) { return IT[a].b[1] - IT[b].b[1] || IT[a].b[0] - IT[b].b[0]; });
        await stagger(h, pieces, 150, function (i) {
          const b = IT[i].b, vert = (b[3] - b[1]) > (b[2] - b[0]);
          show([i]);
          return h.tween(620, function (e) {
            const x = lerp(cx(src), cx(b), e), y = lerp(cy(src), cy(b), e) - Math.sin(Math.PI * e) * 8, r = vert ? 90 * (1 - e) : 0;
            tf([i], 'translate(' + x + ' ' + y + ') rotate(' + r + ') translate(' + (-cx(b)) + ' ' + (-cy(b)) + ')');
          }, ease.inOut).then(function () { tf([i], ''); });
        });
        for (const w of range(17, 22)) { await h.wait(60); fadeIn(h, [w], 220).catch(function () {}); }
        await h.wait(250);
      },
      bpp3: async function (h) {
        hideAll();
        await h.all([grow(h, [4], 'y', 32.2, 500), grow(h, [6], 'x', 6.35, 600)]);
        await h.all([pop(h, [5], 260), fadeIn(h, [11], 250)]);
        const steps = [[[0], [8]], [[1, 2], [10, 9]], [[3], [7]]];   // caixa → tracejada(s) da altura
        for (const s of steps) {
          await grow(h, s[0], 'y', 32.2, 450, ease.back);
          for (const l of s[1]) await grow(h, [l], 'x', IT[l].b[2], 320);
        }
      },
      bpp4: async function (h) {
        hideAll();
        const rows = [[ROWS4.red.ids, 50], [ROWS4.blue.ids, 51], [ROWS4.orange.ids, 52]];
        for (const r of rows) {
          const cs = cells(IT, r[0]).sort(function (a, b) { return a.b[0] - b.b[0]; });
          await stagger(h, cs, cs.length > 10 ? 35 : 70, function (c) {
            show(c.ids); op(c.ids, 0);
            return h.tween(300, function (e, t) { op(c.ids, Math.min(1, t * 3)); tf(c.ids, 'translate(' + (-(1 - e) * 10) + ' 0)'); }, ease.out)
              .then(function () { op(c.ids, ''); tf(c.ids, ''); });
          });
          await fadeIn(h, [r[1]], 220);
        }
        const pal = [45, 46, 47];
        show(pal); op(pal, 0);
        await h.tween(450, function (e) { op(pal, e); tf(pal, 'translate(0 ' + (8 * (1 - e)) + ')'); }, ease.out);
        op(pal, ''); tf(pal, '');
        await grow(h, [48], 'y', 72.2, 650, ease.inOut);
        await pop(h, [49], 260);
        await fadeIn(h, [53, 54], 300);
      }
    };

    return {
      snap: snap,
      play: async function (a, b, h) {
        if (a === 'vazio') { await SCENES[sc](h); if (b === 'b4p') { await h.wait(500); await stackPlay(h); } return; }
        if (b === 'b4p') await stackPlay(h);
      }
    };
  });
})();
