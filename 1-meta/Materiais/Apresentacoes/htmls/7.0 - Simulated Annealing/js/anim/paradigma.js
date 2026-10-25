/* Paradigma exploração x intensificação (aula 7, slides 12–14; figuras img/paradigma1…3).
 *
 * Camadas de js/anim/dados/par.js (paradigma1–2) e par3.js (paradigma3), geradas por figura_camadas.py;
 * o estado final de cada slide é a figura do PDF.
 *
 * pareixo  vazio → paradigma1   o eixo cresce do centro para as pontas, a caixa "Paradigma de design"
 *                               brota; um cursor desliza para a direita e acende "Solução única",
 *                               "Busca local" e "Intensificação" quando passa por eles
 *          paradigma1 → paradigma2   o cursor volta da direita até a ponta esquerda acendendo
 *                               "Populacionais", "Busca aleatória" e "Exploração"
 * parbusca vazio → paradigma3   painel da esquerda: eixos e curva, "Busca local" e a busca círculo a círculo
 *                               (sempre ladeira abaixo, perto de onde começou); painel da direita: eixos e
 *                               curva, "Busca aleatória" e saltos — uma ficha voa por cada seta e a nova
 *                               solução brota onde ela cai (qualquer lugar do landscape)
 */
(function () {
  'use strict';
  const A = window.Anim;
  if (!A) return;
  const S = A.svg, E = A.ease, lerp = A.lerp;
  const NAVY = '#00008b', RED = '#d0281a', GOLD = '#e8a317';
  const range = function (a, b, st) { const r = []; for (let i = a; i <= b; i += (st || 1)) r.push(i); return r; };

  // utilidades comuns às duas figuras
  function kit(host, D, SC, aria) {
    const W = D.W, H = D.H, items = D.items;
    const root = S('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': aria });
    root.style.width = (W * SC) + 'pt'; root.style.height = (H * SC) + 'pt'; root.style.overflow = 'visible';
    host.appendChild(root);
    const defs = S('defs', {}, root), gItems = S('g', {}, root), gFx = S('g', {}, root);
    const els = A.figBuild(gItems, items);
    const uid = Math.random().toString(36).slice(2);
    const K = { root: root, items: items, els: els, gFx: gFx, H: H, W: W };
    K.show = function (i, on) { els[i].style.display = on ? '' : 'none'; };
    K.reset = function (i) {
      const e = els[i];
      e.style.opacity = ''; e.removeAttribute('transform'); e.removeAttribute('clip-path');
      e.style.strokeDasharray = ''; e.style.strokeDashoffset = '';
    };
    K.setVisible = function (ids) {
      const on = {}; ids.forEach(function (i) { on[i] = true; });
      items.forEach(function (_, i) { K.reset(i); K.show(i, !!on[i]); });
    };
    K.snap = function (st) { gFx.textContent = ''; defs.textContent = ''; K.setVisible(D.states[st] || []); };
    K.center = function (i) { const b = items[i].b; return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; };
    K.clip = function (x, y, w, hh) {
      const cp = S('clipPath', { id: 'pc' + uid + Math.random().toString(36).slice(2, 7) }, defs);
      return { id: cp.id, r: S('rect', { x: x, y: y, width: Math.max(0, w), height: hh }, cp) };
    };
    K.fade = function (h, ids, a, b, dur) {
      ids.forEach(function (i) { K.show(i, true); els[i].style.opacity = a; });
      return h.tween(dur, function (e) { ids.forEach(function (i) { els[i].style.opacity = lerp(a, b, e); }); })
        .then(function () { ids.forEach(function (i) { K.reset(i); if (b === 0) K.show(i, false); }); });
    };
    K.trace = function (h, i, dur) {
      const el = els[i]; K.show(i, true); K.reset(i);
      const L = el.getTotalLength();
      el.style.strokeDasharray = L + ' ' + (L + 1); el.style.strokeDashoffset = L;
      return h.tween(dur, function (e) { el.style.strokeDashoffset = L * (1 - e); }, E.inOut).then(function () { K.reset(i); });
    };
    K.wipe = function (h, ids, xa, xb, dur) {   // recorte que cresce de xa até xb
      const c = K.clip(xa, -5, 0, H + 10);
      ids.forEach(function (i) { K.show(i, true); K.reset(i); els[i].setAttribute('clip-path', 'url(#' + c.id + ')'); });
      return h.tween(dur, function (e) {
        const x = lerp(xa, xb, e);
        c.r.setAttribute('x', Math.min(xa, x)); c.r.setAttribute('width', Math.abs(x - xa));
      }, E.inOut).then(function () { ids.forEach(K.reset); });
    };
    K.pop = function (h, ids, c, dur) {
      ids.forEach(function (i) { K.show(i, true); K.reset(i); });
      return h.tween(dur || 320, function (e, t) {
        const s = Math.max(0.001, E.back(t));
        ids.forEach(function (i) {
          els[i].setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ') scale(' + s + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')');
          els[i].style.opacity = Math.min(1, t * 3);
        });
      }, E.linear).then(function () { ids.forEach(K.reset); });
    };
    K.words = async function (h, ids, dur) {
      for (const i of ids) {
        K.show(i, true); els[i].style.opacity = 0;
        await h.tween(dur || 150, function (e) { els[i].style.opacity = e; els[i].setAttribute('transform', 'translate(0 ' + (1.5 * (1 - e)) + ')'); }, E.out);
        K.reset(i);
      }
    };
    return K;
  }

  // ---------- slides 12–13: o eixo ----------
  A.define('pareixo', function (host) {
    const D = A.figData && A.figData.par;
    if (!D) { console.warn('pareixo: sem dados (js/anim/dados/par.js)'); return { snap: function () {} }; }
    const K = kit(host, D, 360.36 / D.W, 'Eixo exploração x intensificação');
    const Y = 20.2, XL = 36.6, XR = 240.6, XC = 138.6;
    // rótulos acima do eixo: [ids, x do centro]
    const lab = function (ids) { const b0 = K.items[ids[0]].b, b1 = K.items[ids[ids.length - 1]].b; return { ids: ids, x: (b0[0] + b1[2]) / 2 }; };

    function cursor() {
      const g = S('g', { opacity: 0 }, K.gFx);
      const halo = S('circle', { r: 5.5, fill: GOLD, 'fill-opacity': 0.25 }, g);
      S('circle', { r: 3, fill: GOLD, stroke: NAVY, 'stroke-width': 0.8 }, g);
      g.at = function (x) { g.setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + Y + ')'); };
      g.pulse = function (t) { halo.setAttribute('r', 5.5 + 2 * Math.sin(t * Math.PI * 6)); };
      return g;
    }
    // o cursor desliza de xa a xb; cada rótulo acende quando o cursor passa pelo seu x
    async function sweep(h, xa, xb, labels, last) {
      const c = cursor(); c.at(xa);
      await h.tween(250, function (e) { c.setAttribute('opacity', e); });
      const pend = labels.slice(), runs = [];
      await h.tween(Math.abs(xb - xa) * 9, function (e, t) {
        const x = lerp(xa, xb, e); c.at(x); c.pulse(t);
        while (pend.length && (xb > xa ? x >= pend[0].x - 4 : x <= pend[0].x + 4)) runs.push(K.words(h, pend.shift().ids, 140));
      }, E.inOut);
      pend.forEach(function (l) { runs.push(K.words(h, l.ids, 140)); });
      await h.all(runs);
      await h.all([K.words(h, last, 200), ringAt(h, xb)]);
      await h.wait(300);
      await h.tween(400, function (e) { c.setAttribute('opacity', 1 - e); });
      c.remove();
    }
    function ringAt(h, x) {
      const r = S('circle', { cx: x, cy: Y, r: 2, fill: 'none', stroke: GOLD, 'stroke-width': 1 }, K.gFx);
      return h.tween(600, function (e) { r.setAttribute('r', 2 + 10 * e); r.setAttribute('opacity', 1 - e); }, E.out).then(function () { r.remove(); });
    }

    // eixo crescendo do centro para as duas pontas (recorte simétrico)
    async function grow(h) {
      const c = K.clip(XC, 0, 0, K.H);
      [0].forEach(function (i) { K.show(i, true); K.els[i].setAttribute('clip-path', 'url(#' + c.id + ')'); });
      await h.tween(800, function (e) {
        const w = (XC + 1) * e; c.r.setAttribute('x', XC - w); c.r.setAttribute('width', 2 * w);
      }, E.inOut);
      K.reset(0);
      await h.all([K.pop(h, [1], [276.6, Y], 260), K.pop(h, [2], [0.6, Y], 260)]);
      await h.all([K.pop(h, [3], [XR, Y], 240), K.pop(h, [4], [XL, Y], 240)]);
    }

    return {
      snap: K.snap,
      play: async function (a, b, h) {
        if (a === 'vazio' && b === 'paradigma1') {
          K.setVisible([]);
          await grow(h);
          await K.pop(h, [5], K.center(5), 420);
          await K.words(h, [15, 16, 17, 18, 19], 120);
          await h.wait(200);
          return sweep(h, XC, XR, [lab([9, 10]), lab([7, 8])], [6]);
        }
        if (a === 'paradigma1' && b === 'paradigma2') {
          K.setVisible(D.states.paradigma1);
          return sweep(h, XR, XL, [lab([11]), lab([12, 13])], [14]);
        }
      }
    };
  });

  // ---------- slide 14: busca local x busca aleatória ----------
  A.define('parbusca', function (host) {
    const D = A.figData && A.figData.par3;
    if (!D) { console.warn('parbusca: sem dados (js/anim/dados/par3.js)'); return { snap: function () {} }; }
    const K = kit(host, D, 401.82 / D.W, 'Busca local e busca aleatória no landscape');
    const els = K.els, items = K.items;
    const L = { axes: [6, 8], heads: [7, 9], dash: 10, masks: [1, 2, 3, 4], curve: 5, line: 0, lab: [81, 82],
      circ: range(11, 23), dots: [[46, 47], [50, 51]].concat(range(24, 44, 2).map(function (i) { return [i, i + 1]; })) };
    const R = { axes: [58, 60], heads: [59, 61], dash: 62, masks: [53, 54, 55, 56], curve: 57, line: 52, lab: [83, 84],
      s: [63, 64], hops: [[73, 74, [65, 66]], [75, 76, [69, 70]], [77, 78, [71, 72]], [79, 80, [67, 68]]] };

    async function panel(h, P) {
      await h.all([K.trace(h, P.axes[0], 450), K.trace(h, P.axes[1], 550)]);
      await h.all([K.pop(h, [P.heads[0]], K.center(P.heads[0]), 220), K.pop(h, [P.heads[1]], K.center(P.heads[1]), 220),
        K.fade(h, [P.dash], 0, 1, 300)]);
      // as máscaras brancas escondem a curva sólida; na esquerda ela só aparece com a busca (walk)
      P.masks.concat(P === R ? [P.line] : []).forEach(function (i) { K.show(i, true); });
      const b = items[P.curve].b;
      await K.wipe(h, [P.curve], b[0] - 1, b[2] + 1, 1000);
      await K.words(h, P.lab, 180);
    }

    async function walk(h) {
      const pts = L.circ.map(K.center), n = pts.length, x0 = pts[0][0];
      await K.pop(h, [46, 47, 48, 49], pts[0], 320);
      const c = K.clip(x0, 0, 0, K.H);
      K.show(L.line, true); els[L.line].setAttribute('clip-path', 'url(#' + c.id + ')');
      const cut = function (x) { c.r.setAttribute('x', Math.min(x0, x)); c.r.setAttribute('width', Math.abs(x - x0)); };
      for (let k = 0; k < n; k++) {
        const f = k < 2 ? 1 : 0.55;
        await K.pop(h, [L.circ[k]], pts[k], 240 * f);
        if (k === n - 1) break;
        const xa = pts[k][0], xb = pts[k + 1][0];
        await h.all([h.tween(220 * f, function (e) { cut(lerp(xa, xb, e)); }, E.inOut),
          h.wait(80 * f).then(function () { return K.pop(h, L.dots[k + 1], pts[k + 1], 180 * f); })]);
      }
      await h.tween(200, function (e) { cut(lerp(pts[n - 1][0], pts[n - 1][0] - 12, e)); });
      K.reset(L.line);
    }

    async function hops(h) {
      await K.pop(h, R.s, K.center(R.s[0]), 320);
      for (const hp of R.hops) {
        const arr = els[hp[0]], len = arr.getTotalLength();
        const chip = S('g', {}, K.gFx);
        S('circle', { r: 2.2, fill: GOLD, stroke: NAVY, 'stroke-width': 0.5 }, chip);
        K.show(hp[0], true); arr.style.strokeDasharray = len + ' ' + (len + 1); arr.style.strokeDashoffset = len;
        await h.tween(Math.max(450, len * 4.5), function (e) {
          arr.style.strokeDashoffset = len * (1 - e);
          const p = arr.getPointAtLength(len * e);
          chip.setAttribute('transform', 'translate(' + p.x.toFixed(2) + ' ' + (p.y - 0).toFixed(2) + ')');
        }, E.inOut);
        K.reset(hp[0]);
        await h.all([K.pop(h, [hp[1]], K.center(hp[1]), 160),
          h.tween(200, function (e) { chip.setAttribute('opacity', 1 - e); }).then(function () { chip.remove(); }),
          K.pop(h, hp[2], K.center(hp[2][0]), 260)]);
      }
    }

    return {
      snap: K.snap,
      play: async function (a, b, h) {
        if (!(a === 'vazio' && b === 'paradigma3')) return;
        K.setVisible([]);
        await panel(h, L);
        await walk(h);
        await h.wait(250);
        await panel(h, R);
        await hops(h);
      }
    };
  });
})();
