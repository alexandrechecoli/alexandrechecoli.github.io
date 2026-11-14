/* Carregamento 2D (aula 2, frames 41–44): figuras bin_packing1 → bin_packing2 do Ipe em camadas.
 *
 * Dados: js/anim/dados/bp2d.js (figura_camadas.py bp2d … bin_packing1.pdf bin_packing2.pdf; quadro 140.4 × 100.4).
 * Uso: <span class="anim pl" data-anim="corte2d" data-from=".." data-state=".."><img …></span>
 *
 *   c1  (de vazio) frame 41: o retângulo maior brota e as peças brotam grupo a grupo
 *   c2  frame 42: as peças voam para dentro do retângulo maior (da maior para a menor; a barra azul gira 90°) e o
 *       contador da área ocupada sobe até 3360 / 3840 = 87,5%; 11 peças ficam de fora (não mudam de lugar)
 *       frames 43 e 44 (mesma figura): c2 sem animação (o contador continua)
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease, lerp = Anim.lerp;
  const D = Anim.figData && Anim.figData.bp2d;
  if (!D) { console.warn('corte2d: faltam os dados (dados/bp2d.js)'); return; }
  const IT = D.items, A = D.states.bin_packing1, B = D.states.bin_packing2;
  const AREA = 48 * 80, MYBLUE = '#0061a5', GRAY = '#666666';
  const FONT = '"LM Sans 8", "LM Sans", sans-serif';

  function mk(it, parent) {
    const p = S('path', { d: it.d, fill: it.f || 'none' }, parent);
    if (it.fo !== undefined) p.setAttribute('fill-opacity', it.fo);
    if (it.s) { p.setAttribute('stroke', it.s); p.setAttribute('stroke-width', it.w); }
    return p;
  }
  // peças = itens com o mesmo retângulo (contorno + preenchimento); cor = a do item preenchido
  function pieces(ids) {
    const m = {}, out = [];
    ids.forEach(function (i) {
      const k = IT[i].b.join(',');
      if (!m[k]) { m[k] = { b: IT[i].b, ids: [], f: null }; out.push(m[k]); }
      m[k].ids.push(i);
      if (IT[i].f && IT[i].f !== '#ffffff') m[k].f = IT[i].f;
    });
    out.forEach(function (p) {
      const w = Math.round(p.b[2] - p.b[0]), h = Math.round(p.b[3] - p.b[1]);   // 20.000000000000004 → 20
      p.w = w; p.h = h; p.area = w * h; p.kind = p.f + ':' + Math.max(w, h) + 'x' + Math.min(w, h);
      p.cx = (p.b[0] + p.b[2]) / 2; p.cy = (p.b[1] + p.b[3]) / 2;
    });
    return out;
  }
  const inB = new Set(B), inA = new Set(A);
  const big = 0;
  const SRC = pieces(A.filter(function (i) { return !inB.has(i); }));   // saem do lado direito
  const DST = pieces(B.filter(function (i) { return !inA.has(i); }));   // entram no retângulo maior
  // pares origem → destino: mesma cor e tamanho; dentro do tipo, pela ordem (de cima para baixo, da esquerda para a direita)
  const PAIRS = [];
  (function () {
    const by = function (list) { const m = {}; list.forEach(function (p) { (m[p.kind] = m[p.kind] || []).push(p); }); return m; };
    const s = by(SRC), d = by(DST);
    const ord = function (a, b) { return a.b[1] - b.b[1] || a.b[0] - b.b[0]; };
    Object.keys(d).forEach(function (k) {
      const ss = (s[k] || []).sort(ord), dd = d[k].sort(ord);
      dd.forEach(function (t, n) { if (ss[n]) PAIRS.push({ s: ss[n], t: t, rot: (ss[n].w > ss[n].h) !== (t.w > t.h) }); });
    });
    PAIRS.sort(function (a, b) { return b.t.area - a.t.area || a.t.b[1] - b.t.b[1] || a.t.b[0] - b.t.b[0]; });   // maiores primeiro
  })();
  const STAY = pieces(A.filter(function (i) { return inB.has(i) && i !== big; }));   // ficam de fora, no mesmo lugar
  const PLACED = PAIRS.reduce(function (s, p) { return s + p.t.area; }, 0);
  const fmtPct = function (v) { return (Math.round(1000 * v) / 10).toFixed(1).replace('.', ',') + '%'; };

  Anim.define('corte2d', function (host) {
    const svg = S('svg', { viewBox: '0 0 ' + D.W + ' ' + D.H });
    host.appendChild(svg);
    const gIt = S('g', null, svg), gTop = S('g', null, svg);
    const els = IT.map(function (it) { return mk(it, gIt); });

    function empty(g) { while (g.firstChild) g.removeChild(g.firstChild); }
    function showSet(ids) { const s = new Set(ids); els.forEach(function (e, i) { e.style.display = s.has(i) ? '' : 'none'; e.style.opacity = ''; e.removeAttribute('transform'); }); }
    function show(ids, on) { ids.forEach(function (i) { els[i].style.display = on === false ? 'none' : ''; }); }
    function tf(ids, s) { ids.forEach(function (i) { if (s) els[i].setAttribute('transform', s); else els[i].removeAttribute('transform'); }); }
    function op(ids, v) { ids.forEach(function (i) { els[i].style.opacity = v; }); }
    function counter(v, n) {
      const t = S('text', { x: 4.2, y: 8.6, 'font-size': 6.5, fill: MYBLUE, 'font-family': FONT }, gTop);
      t.set = function (x) { t.textContent = 'área ocupada: ' + fmtPct(x / AREA); };
      t.set(v);
      const t2 = S('text', { x: 74, y: 8.6, 'font-size': 5, fill: GRAY, 'font-family': FONT }, gTop);
      t2.textContent = n === undefined ? '' : n;
      return { t: t, t2: t2 };
    }
    function snap(st) {
      empty(gTop);
      if (st === 'vazio') { showSet([]); return; }
      showSet(st === 'c2' ? B : A);
      if (st === 'c2') counter(PLACED, STAY.length + ' peças ficaram de fora');
    }
    function pop(h, ids, b, dur) {
      const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
      show(ids); op(ids, 0);
      return h.tween(dur || 340, function (e, t) {
        op(ids, Math.min(1, t * 2.5));
        tf(ids, 'translate(' + cx + ' ' + cy + ') scale(' + Math.max(0, e) + ') translate(' + (-cx) + ' ' + (-cy) + ')');
      }, ease.back).then(function () { op(ids, ''); tf(ids, null); });
    }

    async function enter(h) {   // frame 41
      showSet([]);
      await pop(h, [big], IT[big].b, 450);
      const rest = pieces(A.filter(function (i) { return i !== big; }));
      // grupos por cor, da esquerda para a direita / de cima para baixo
      const groups = {};
      rest.forEach(function (p) { (groups[p.f] = groups[p.f] || []).push(p); });
      const order = Object.keys(groups).sort(function (a, b) {
        const ma = Math.min.apply(null, groups[a].map(function (p) { return p.b[1]; })), mb = Math.min.apply(null, groups[b].map(function (p) { return p.b[1]; }));
        return ma - mb;
      });
      for (const k of order) {
        const g = groups[k].sort(function (a, b) { return a.b[1] - b.b[1] || a.b[0] - b.b[0]; });
        const ps = [];
        for (const p of g) { ps.push(pop(h, p.ids, p.b, 300)); await h.wait(35); }
        await h.all(ps);
        await h.wait(120);
      }
    }
    async function pack(h) {   // frame 42
      showSet(A);
      DST.forEach(function (p) { show(p.ids, false); });
      const c = counter(0);
      await h.wait(250);
      // voos sobrepostos: a barra azul primeiro (girando), depois uma peça a cada GAP ms
      const prog = PAIRS.map(function () { return 0; });
      const upd = function () { let v = 0; prog.forEach(function (e, k) { v += PAIRS[k].t.area * e; }); c.t.set(v); };
      const fly = function (n, dur) {
        const P = PAIRS[n], s = P.s, t = P.t;
        show(s.ids, false); show(t.ids);
        return h.tween(dur, function (e) {
          const x = lerp(s.cx, t.cx, e), y = lerp(s.cy, t.cy, e) - Math.sin(Math.PI * e) * 6, r = P.rot ? -90 * (1 - e) : 0;
          tf(t.ids, 'translate(' + x + ' ' + y + ') rotate(' + r + ') translate(' + (-t.cx) + ' ' + (-t.cy) + ')');
          prog[n] = e; upd();
        }, ease.inOut).then(function () { tf(t.ids, null); });
      };
      await fly(0, 900);
      await h.wait(150);
      const GAP = 180, ps = [];
      for (let n = 1; n < PAIRS.length; n++) { ps.push(fly(n, 460)); await h.wait(GAP); }
      await h.all(ps);
      c.t.set(PLACED);
      // as que ficaram de fora piscam
      await h.tween(900, function (e, t) {
        const k = 1 - 0.55 * Math.sin(Math.PI * t * 2) ** 2;
        STAY.forEach(function (p) { op(p.ids, k); });
      }, ease.linear);
      STAY.forEach(function (p) { op(p.ids, ''); });
      c.t2.textContent = STAY.length + ' peças ficaram de fora';
    }

    return {
      snap: snap,
      play: async function (a, b, h) {
        if (b === 'c1') await enter(h);
        else if (b === 'c2' && a === 'c1') await pack(h);
        else if (b === 'c2' && a === 'vazio') { await enter(h); await h.wait(300); await pack(h); }
      }
    };
  });
})();
