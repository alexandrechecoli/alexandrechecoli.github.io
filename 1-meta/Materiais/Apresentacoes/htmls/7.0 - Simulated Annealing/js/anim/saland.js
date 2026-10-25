/* Simulated Annealing no fitness landscape (aula 7, slides 30–35; figuras img/prob1…prob6).
 *
 * As figuras vêm em camadas (js/anim/dados/prob.js, gerado por ferramentas/figura_camadas.py), então o
 * estado final de cada slide é exatamente a figura do PDF. Por cima, efeitos passageiros:
 *
 *   vazio → prob1  eixos e curva se desenham; s brota
 *   prob1 → prob2  vizinho aleatório: candidatos piscam ao redor de s até o sorteio parar em s';
 *                  linhas de nível mostram que s' é pior; a legenda entra
 *   prob2 → prob3  o termômetro surge e o mercúrio sobe junto com a barra P (P depende de T); ΔE aparece;
 *                  um número aleatório u sobe na escala de P: u < P, o movimento pior é aceito (✓)
 *   prob3 → prob4  o termômetro vai para a direita e o SA roda de verdade (Metropolis, semente fixa) enquanto
 *                  o mercúrio desce: no começo o ponto salta morros, no fim só desce — termina no vale da direita
 *   prob4 → prob5  com T baixa, P é pequena: o mesmo u agora fica acima de P e o movimento é rejeitado (✗)
 *   prob5 → prob6  os pontos caem nos ótimos local e global, as caixas de átomos saem deles e as setas se desenham
 */
(function () {
  'use strict';
  const A = window.Anim, S = A.svg, E = A.ease, lerp = A.lerp;
  if (!A) return;
  const NAVY = '#00008b', RED = '#d0281a', GREEN = '#169b3a', GRAY = '#9a9a9a';
  const MAIN = 'KaTeX_Main, serif', MATH = 'KaTeX_Math, serif';
  const clamp01 = function (t) { return Math.max(0, Math.min(1, t)); };
  const range = function (a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };

  // ---------- grupos de itens (ids de js/anim/dados/prob.js) ----------
  const G = {
    axes: [5, 6, 7, 8, 9, 12, 13, 14, 257, 258, 259, 260, 261, 262, 263],
    curve: [0, 2, 3, 4, 10, 15, 31],
    s1: [231, 232], s1lab: [268],
    sp2: [250, 251], sp2lab: [296, 298],
    leg: [244, 269, 270, 271, 272, 273, 274, 275, 276, 291, 292, 293, 294],
    th3: range(233, 243), merc3: 237, br3: [254, 255, 256], br3lab: [297], bub3: [1, 285, 286, 287, 288, 289, 290], arr3: [252, 253],
    th4: range(16, 26), merc4: 20, s4: [27, 28], s4lab: [283], sp4: [29, 30], sp4lab: [284],
    bub5: [230, 277, 278, 279, 280, 281, 282], arr5: [245, 246], br5: [247, 248, 249], br5lab: [295],
    pL: [32, 33], pG: [34, 35], arrL: [226, 227], arrG: [228, 229],
    boxL: range(135, 225).concat([264, 265]), boxG: range(36, 134).concat([266, 267])
  };
  const P_S1 = [57, 104.84], P_SP2 = [54.39, 95.07], P_S4 = [210.72, 119.79], P_SP4 = [215.01, 113.45];
  const P_L6 = [63.41, 114.42], P_G6 = [208.06, 121.12];
  const TH_DX = 175.76 - 58.01, TH_DY = 57.04 - 57.15;      // termômetro do prob3 → prob4
  const MERC3 = [57.26, 36.18, 58.66, 55.78], MERC4 = [175.17, 50.23, 176.41, 55.67];
  const U = 0.55;                                            // o "número aleatório" usado nos slides 32 e 34

  // ---------- curva (amostrada das duas partes do prob1) ----------
  function sampleD(d) {
    const n = d.match(/-?\d+(\.\d+)?/g).map(Number), pts = [[n[0], n[1]]];
    for (let i = 2; i + 5 < n.length; i += 6) {
      const p0 = pts[pts.length - 1];
      for (let k = 1; k <= 24; k++) {
        const t = k / 24, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, e = t * t * t;
        pts.push([a * p0[0] + b * n[i] + c * n[i + 2] + e * n[i + 4], a * p0[1] + b * n[i + 1] + c * n[i + 3] + e * n[i + 5]]);
      }
    }
    return pts;
  }
  let CURVE = null;
  function curve(items) {
    if (CURVE) return CURVE;
    const pts = sampleD(items[4].d).concat(sampleD(items[31].d)).sort(function (p, q) { return p[0] - q[0]; });
    const yAt = function (x) {
      x = Math.max(pts[0][0], Math.min(pts[pts.length - 1][0], x));
      let lo = 0, hi = pts.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m][0] <= x) lo = m; else hi = m; }
      const f = pts[hi][0] > pts[lo][0] ? (x - pts[lo][0]) / (pts[hi][0] - pts[lo][0]) : 0;
      return lerp(pts[lo][1], pts[hi][1], f);
    };
    CURVE = { pts: pts, y: yAt, x0: pts[0][0], x1: 220.9 };
    return CURVE;
  }

  // ---------- SA de verdade, com semente fixa (mesma execução em toda aula) ----------
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  let RUN = null;
  function saRun(C) {
    if (RUN) return RUN;
    const N = 70, T0 = 45, T1 = 0.4;
    for (let seed = 1; seed < 2000; seed++) {
      const r = rng(seed), steps = [];
      let x = P_S1[0], maxX = x, uphillFar = 0;
      for (let k = 0; k < N; k++) {
        const T = T0 * Math.pow(T1 / T0, k / (N - 1));
        const x2 = Math.max(C.x0 + 1, Math.min(C.x1 - 1, x + (r() * 2 - 1) * 16));
        const dE = C.y(x) - C.y(x2);       // f = -y (para cima é pior); minimização
        const p = dE <= 0 ? 1 : Math.exp(-dE / T), u = r(), ok = dE <= 0 || u < p;
        steps.push({ from: x, to: x2, ok: ok, T: T, worse: dE > 0 });
        if (ok) { if (dE > 4) uphillFar++; x = x2; maxX = Math.max(maxX, x); }
      }
      // boa execução: atravessa o landscape, aceita vários movimentos piores e termina no vale da direita
      if (x > 200 && x < 218 && maxX > 150 && uphillFar >= 6) { RUN = { seed: seed, steps: steps, T0: T0, T1: T1 }; break; }
    }
    return RUN;
  }

  A.saTools = { curve: curve, rng: rng };   // usados também por sapseudo.js (slide 36)

  A.define('saland', function (host) {
    const D = A.figData && A.figData.prob;
    if (!D) { console.warn('saland: sem dados (js/anim/dados/prob.js)'); return { snap: function () {} }; }
    const W = D.W, H = D.H, SC = 1;
    const root = S('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Simulated Annealing no fitness landscape' });
    root.style.width = (W * SC) + 'pt'; root.style.height = (H * SC) + 'pt';
    host.appendChild(root);
    const items = D.items, gItems = S('g', {}, root), gFx = S('g', {}, root);
    const els = A.figBuild(gItems, items);
    const C = curve(items);
    const merc3d = items[G.merc3].d;

    const show = function (i, on) { els[i].style.display = on ? '' : 'none'; };
    function reset(i) { els[i].style.opacity = ''; els[i].removeAttribute('transform'); els[i].style.strokeDasharray = ''; els[i].style.strokeDashoffset = ''; }
    function snap(st) {
      gFx.textContent = '';
      const on = {}; (D.states[st] || []).forEach(function (i) { on[i] = true; });
      items.forEach(function (_, i) { reset(i); show(i, !!on[i]); });
      els[G.merc3].setAttribute('d', merc3d);
    }

    // ---------- utilidades ----------
    const has = function (st, ids) { const s = D.states[st] || []; return ids.filter(function (i) { return s.indexOf(i) >= 0; }); };
    function fade(h, ids, a, b, dur) {
      ids.forEach(function (i) { show(i, true); els[i].style.opacity = a; });
      return h.tween(dur, function (e) { ids.forEach(function (i) { els[i].style.opacity = lerp(a, b, e); }); })
        .then(function () { ids.forEach(function (i) { if (b === 0) show(i, false); reset(i); }); });
    }
    function fadeEl(h, list, a, b, dur) {
      list.forEach(function (x) { x.style.opacity = a; });
      return h.tween(dur, function (e) { list.forEach(function (x) { x.style.opacity = lerp(a, b, e); }); });
    }
    function trace(h, i, dur) {
      const el = els[i]; show(i, true); reset(i);
      const L = el.getTotalLength();
      el.style.strokeDasharray = L + ' ' + (L + 1); el.style.strokeDashoffset = L;
      return h.tween(dur, function (e) { el.style.strokeDashoffset = L * (1 - e); }).then(function () { reset(i); });
    }
    function pop(h, ids, c, dur) {   // brota a partir do ponto c
      ids.forEach(function (i) { show(i, true); reset(i); });
      return h.tween(dur || 380, function (e, t) {
        const s = Math.max(0.001, E.back(t));
        ids.forEach(function (i) {
          els[i].setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ') scale(' + s + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')');
          els[i].style.opacity = Math.min(1, t * 3);
        });
      }, E.linear).then(function () { ids.forEach(reset); });
    }
    async function words(h, ids, dur) {
      for (const i of ids) {
        show(i, true); els[i].style.opacity = 0;
        await h.tween(dur || 160, function (e) { els[i].style.opacity = e; els[i].setAttribute('transform', 'translate(0 ' + (1 - e) + ')'); }, E.out);
        reset(i);
      }
    }
    function dot(p, r, fill, stroke, parent) {
      return S('circle', { cx: p[0], cy: p[1], r: r, fill: fill || NAVY, stroke: stroke || 'none', 'stroke-width': 0.4 }, parent || gFx);
    }
    function point(p) {   // ponto como o do PDF (anel azul com miolo branco)
      const g = S('g', { transform: 'translate(' + p[0] + ' ' + p[1] + ')' }, gFx);
      S('circle', { r: 1.2, fill: NAVY }, g); S('circle', { r: 0.66, fill: '#fff' }, g);
      g.at = function (q) { g.setAttribute('transform', 'translate(' + q[0].toFixed(3) + ' ' + q[1].toFixed(3) + ')'); };
      return g;
    }
    function label(x, y, parts, color, size) {   // parts: [[texto, itálico?], ...]
      const t = S('text', { x: x, y: y, 'font-size': size || 6, fill: color || '#000' }, gFx);
      parts.forEach(function (p) {
        const s = S('tspan', { 'font-family': p[1] ? MATH : MAIN }, t);
        if (p[1]) s.setAttribute('font-style', 'italic');
        s.textContent = p[0];
      });
      return t;
    }
    function mark(p, ok) {   // ✓ ou ✗ passageiro
      const g = S('g', { stroke: ok ? GREEN : RED, 'stroke-width': 0.9, fill: 'none', 'stroke-linecap': 'round', opacity: 0 }, gFx);
      if (ok) S('path', { d: 'M' + (p[0] - 2) + ' ' + p[1] + 'l1.6 1.8l3.2-4' }, g);
      else S('path', { d: 'M' + (p[0] - 1.8) + ' ' + (p[1] - 1.8) + 'l3.6 3.6M' + (p[0] + 1.8) + ' ' + (p[1] - 1.8) + 'l-3.6 3.6' }, g);
      return g;
    }

    // ΔE: linhas de nível de s e s' até a lateral, com a cota entre elas
    function deltaE(ps, pq, xc) {
      const g = S('g', { opacity: 0 }, gFx);
      [ps, pq].forEach(function (p) { S('line', { x1: p[0], y1: p[1], x2: xc - 2, y2: p[1], stroke: GRAY, 'stroke-width': 0.35, 'stroke-dasharray': '1 0.8' }, g); });
      S('line', { x1: xc, y1: ps[1], x2: xc, y2: pq[1], stroke: RED, 'stroke-width': 0.5 }, g);
      [ps[1], pq[1]].forEach(function (y) { S('line', { x1: xc - 1, y1: y, x2: xc + 1, y2: y, stroke: RED, 'stroke-width': 0.5 }, g); });
      g.appendChild(label(xc - 9.5, (ps[1] + pq[1]) / 2 + 2, [['Δ', false], ['E', true]], RED, 5.5));
      return g;
    }

    // u sobe na escala [0, 1] ao lado da barra P; aceita se ficar dentro de P
    async function draw(h, xb, yBottom, yTopP, ok, pMark) {
      const yFull = 34.6 + (yBottom - 59.39);                 // topo da escala (P = 1): topo do tubo
      const g = S('g', {}, gFx), xs = xb - 10;               // escala à esquerda do rótulo "P"
      S('line', { x1: xs, y1: yBottom, x2: xs, y2: yFull, stroke: GRAY, 'stroke-width': 0.4 }, g);
      [yBottom, yFull].forEach(function (y) { S('line', { x1: xs - 0.8, y1: y, x2: xs + 0.8, y2: y, stroke: GRAY, 'stroke-width': 0.4 }, g); });
      g.appendChild(label(xs - 3.6, yFull + 1.5, [['1', false]], GRAY, 4.2));
      g.appendChild(label(xs - 3.6, yBottom + 1.5, [['0', false]], GRAY, 4.2));
      g.style.opacity = 0;
      await fadeEl(h, [g], 0, 1, 250);
      const yu = yBottom - U * (yBottom - yFull);
      const d = dot([xs, yBottom], 1, RED, null, g);
      const lu = label(xs - 4.2, yBottom, [['u', true]], RED, 5.2); g.appendChild(lu);
      await h.tween(750, function (e) {
        const y = lerp(yBottom, yu, e); d.setAttribute('cy', y); lu.setAttribute('y', y + 1.7);
      }, E.out);
      // compara com o topo de P (linha tracejada da escala até a barra)
      const cmp = S('line', { x1: xs, y1: yTopP, x2: xb + 1, y2: yTopP, stroke: ok ? GREEN : RED, 'stroke-width': 0.5, 'stroke-dasharray': '1 0.7', opacity: 0 }, g);
      await h.tween(350, function (e) { cmp.setAttribute('opacity', e); });
      const m = mark(pMark, ok);
      await h.tween(500, function (e, t) { m.setAttribute('opacity', Math.min(1, t * 3)); m.setAttribute('transform', 'translate(' + pMark[0] + ' ' + pMark[1] + ') scale(' + (0.6 + 0.4 * E.back(e)) + ') translate(' + (-pMark[0]) + ' ' + (-pMark[1]) + ')'); }, E.linear);
      await h.wait(700);
      return [g, m];
    }

    // ---------- passos ----------
    async function entry(h, b) {
      const ax = has(b, G.axes).filter(function (i) { return items[i].t === 'p' && items[i].s && !items[i].f; });
      for (const i of ax) await trace(h, i, i === has(b, [9, 14])[0] ? 350 : 500);
      await h.all([fade(h, has(b, G.axes).filter(function (i) { return ax.indexOf(i) < 0; }), 0, 1, 350)]);
      const cv = has(b, G.curve);
      cv.forEach(function (i) { show(i, true); });
      const clip = S('clipPath', { id: 'sacl' + Math.random().toString(36).slice(2) }, root), cr = S('rect', { x: 0, y: 0, width: 0, height: H }, clip);
      cv.forEach(function (i) { els[i].setAttribute('clip-path', 'url(#' + clip.id + ')'); });
      await h.tween(1400, function (e) { cr.setAttribute('width', 28.9 + (222 - 28.9) * e); }, E.inOut);
      cv.forEach(function (i) { els[i].removeAttribute('clip-path'); }); clip.remove();
    }

    // vizinho aleatório: candidatos piscam perto de s e o último é s'
    async function randomNeighbor(h, ps, pq, n) {
      const xs = [], r = rng(7);
      for (let k = 0; k < n; k++) xs.push(ps[0] + (r() * 2 - 1) * 9);
      xs.push(pq[0]);
      for (let k = 0; k < xs.length; k++) {
        const p = [xs[k], C.y(xs[k])], g = point(p);
        const last = k === xs.length - 1;
        await h.tween(last ? 200 : 150, function (e) { g.style.opacity = e; });
        if (!last) { h.tween(260, function (e) { g.style.opacity = 1 - e; }).then(function () { g.remove(); }).catch(function () {}); }
        else g.remove();
      }
    }

    async function play(a, b, h) {
      const on0 = D.states[a] || [], on1 = D.states[b] || [];
      const leaving = on0.filter(function (i) { return on1.indexOf(i) < 0; });
      const entering = on1.filter(function (i) { return on0.indexOf(i) < 0; });
      // variantes quase iguais (curva, eixos, textos): troca direta, sem animar
      const twin = function (i, list) {
        return list.some(function (j) { return items[j].t === items[i].t && items[i].b.every(function (v, k) { return Math.abs(v - items[j].b[k]) < 0.6; }) && (items[i].t !== 'x' || items[i].tx === items[j].tx); });
      };
      const swapIn = entering.filter(function (i) { return twin(i, leaving); });
      const swapOut = leaving.filter(function (i) { return twin(i, entering); });
      swapOut.forEach(function (i) { show(i, false); }); swapIn.forEach(function (i) { show(i, true); });
      let todo = entering.filter(function (i) { return swapIn.indexOf(i) < 0; });
      let gone = leaving.filter(function (i) { return swapOut.indexOf(i) < 0; });
      todo.forEach(function (i) { show(i, false); });
      const done = function (ids) { todo = todo.filter(function (i) { return ids.indexOf(i) < 0; }); };

      if (!on0.length) {                                               // slide 30
        await entry(h, b); done(G.axes.concat(G.curve));
        await pop(h, has(b, G.s1), P_S1, 420); await words(h, has(b, G.s1lab)); done(G.s1.concat(G.s1lab));
      }
      if (a === 'prob1' && b === 'prob2') {                            // slide 31
        await randomNeighbor(h, P_S1, P_SP2, 6);
        await pop(h, G.sp2, P_SP2, 400); await words(h, has(b, G.sp2lab)); done(G.sp2.concat(G.sp2lab));
        // s' é pior (mais alto) que s
        const lv = deltaE(P_S1, P_SP2, 44);
        await fadeEl(h, [lv], 0, 1, 350); await h.wait(900);
        for (const i of [244]) await trace(h, i, 600);
        await words(h, has(b, G.leg).filter(function (i) { return i !== 244; }), 90); done(G.leg);
        await fadeEl(h, [lv], 1, 0, 400); lv.remove();
      }
      if (a === 'prob2' && b === 'prob3') {                            // slide 32
        const lv = deltaE(P_S1, P_SP2, 44); await fadeEl(h, [lv], 0, 1, 350);
        await fade(h, G.th3.filter(function (i) { return i !== G.merc3; }), 0, 1, 400);
        // mercúrio e barra P sobem juntos
        show(G.merc3, true); G.br3.forEach(function (i) { show(i, true); });
        const m = MERC3;
        await h.tween(1100, function (e) {
          const top = lerp(m[3], m[1], e);
          els[G.merc3].setAttribute('d', 'M' + m[0] + ' ' + top + 'L' + m[0] + ' ' + m[3] + 'L' + m[2] + ' ' + m[3] + 'L' + m[2] + ' ' + top + 'Z');
          const yt = lerp(59.39, 36, e);
          els[254].setAttribute('d', 'M51.43 59.39L51.43 ' + yt.toFixed(2));
          els[255].setAttribute('transform', 'translate(0 ' + (yt - 35.93).toFixed(3) + ')');
        }, E.out);
        els[G.merc3].setAttribute('d', merc3d); els[254].setAttribute('d', items[254].d); reset(255);
        await words(h, G.br3lab); done(G.th3.concat(G.br3, G.br3lab));
        await pop(h, [G.bub3[0]], [80, 48], 380); await words(h, G.bub3.slice(1), 110); done(G.bub3);
        await trace(h, 252, 500); await pop(h, [253], [57.2, 94.8], 250); done(G.arr3);
        await fadeEl(h, [lv], 1, 0, 300); lv.remove();
        const fx = await draw(h, 51.43, 59.39, 36, true, [64, 92]);
        await fadeEl(h, fx, 1, 0, 400); fx.forEach(function (x) { x.remove(); });
      }
      if (a === 'prob3' && b === 'prob4') {                            // slide 33: o SA roda
        const outs = gone.filter(function (i) { return G.th3.indexOf(i) < 0; });
        await fade(h, outs, 1, 0, 450);
        // termômetro vai para a direita
        G.th3.forEach(function (i) { show(i, true); });
        await h.tween(800, function (e) {
          G.th3.forEach(function (i) { els[i].setAttribute('transform', 'translate(' + (TH_DX * e).toFixed(3) + ' ' + (TH_DY * e).toFixed(3) + ')'); });
        }, E.inOut);
        const run = saRun(C);
        const s = point(P_S1), m = MERC3, n = MERC4;
        const trail = S('g', {}, gFx);
        const nSt = run.steps.length, per = 72;
        let x = P_S1[0];
        await h.tween(nSt * per, function (e, t) {
          const k = Math.min(nSt - 1, Math.floor(t * nSt)), f = t * nSt - k, st = run.steps[k];
          // mercúrio acompanha o resfriamento (escala log de T)
          const lt = Math.log(st.T / run.T0) / Math.log(run.T1 / run.T0);
          const top = lerp(m[1], n[1], lt), x0 = lerp(m[0], n[0] - TH_DX, lt), x1 = lerp(m[2], n[2] - TH_DX, lt);
          els[G.merc3].setAttribute('d', 'M' + x0 + ' ' + top + 'L' + x0 + ' ' + m[3] + 'L' + x1 + ' ' + m[3] + 'L' + x1 + ' ' + top + 'Z');
          if (!st.ok) { s.at([st.from, C.y(st.from)]); x = st.from; return; }
          const xx = lerp(st.from, st.to, E.inOut(clamp01(f * 1.6)));
          s.at([xx, C.y(xx) - (st.worse ? 3 * Math.sin(Math.PI * clamp01(f * 1.6)) : 0)]);
          if (f > 0.62 && x !== st.to) {
            x = st.to;
            const d = dot([x, C.y(x)], 0.6, st.worse ? RED : NAVY, null, trail); d.style.opacity = 0.55;
          }
        }, E.linear);
        // rastro some; o ponto vai à posição de s do PDF
        const sx = x;
        await h.all([fadeEl(h, [trail], 1, 0, 500), h.tween(500, function (e) { const xx = lerp(sx, P_S4[0], e); s.at([xx, C.y(xx)]); })]);
        s.remove(); trail.remove();
        G.th3.forEach(function (i) { show(i, false); reset(i); }); els[G.merc3].setAttribute('d', merc3d);
        G.th4.forEach(function (i) { show(i, true); }); done(G.th4);
        G.s4.forEach(function (i) { show(i, true); }); done(G.s4);
        await words(h, G.s4lab); done(G.s4lab);
        await randomNeighbor(h, P_S4, P_SP4, 4);
        await pop(h, G.sp4, P_SP4, 380); await words(h, G.sp4lab); done(G.sp4.concat(G.sp4lab));
      }
      if (a === 'prob4' && b === 'prob5') {                            // slide 34
        const lv = deltaE(P_S4, P_SP4, 203); await fadeEl(h, [lv], 0, 1, 350);
        G.br5.forEach(function (i) { show(i, true); });
        await h.tween(700, function (e) {
          const yt = lerp(59.84, 50.49, e);
          els[247].setAttribute('d', 'M170.05 59.84L170.05 ' + yt.toFixed(2));
          els[248].setAttribute('transform', 'translate(0 ' + (yt - 50.47).toFixed(3) + ')');
        }, E.out);
        els[247].setAttribute('d', items[247].d); reset(248);
        await words(h, G.br5lab); done(G.br5.concat(G.br5lab));
        await pop(h, [G.bub5[0]], [199, 48], 380); await words(h, G.bub5.slice(1), 110); done(G.bub5);
        await trace(h, 245, 450); await pop(h, [246], [212.9, 111.2], 250); done(G.arr5);
        await fadeEl(h, [lv], 1, 0, 300); lv.remove();
        const fx = await draw(h, 170.05, 59.84, 50.49, false, [221, 108]);
        await fadeEl(h, fx, 1, 0, 400); fx.forEach(function (x) { x.remove(); });
      }
      if (a === 'prob5' && b === 'prob6') {                            // slide 35
        const keep = G.s4;
        await fade(h, gone.filter(function (i) { return keep.indexOf(i) < 0; }), 1, 0, 450);
        // s escorrega até o fundo do vale; outro ponto cai no ótimo local
        keep.forEach(function (i) { show(i, false); });
        const s = point(P_S4);
        await h.tween(500, function (e) { const xx = lerp(P_S4[0], P_G6[0], e); s.at([xx, lerp(C.y(xx), P_G6[1], e * e)]); });
        s.remove(); G.pG.forEach(function (i) { show(i, true); }); done(G.pG);
        const l = point([P_L6[0], 30]);
        await h.tween(650, function (e) { l.at([P_L6[0], lerp(30, P_L6[1], e)]); }, function (t) { return t * t; });
        await h.tween(180, function (e, t) { l.at([P_L6[0], P_L6[1] - 2.2 * Math.sin(Math.PI * t)]); }, E.linear);
        l.remove(); G.pL.forEach(function (i) { show(i, true); }); done(G.pL);
        // caixas de átomos saem dos pontos; setas
        await pop(h, G.boxL.filter(function (i) { return on1.indexOf(i) >= 0; }), P_L6, 650);
        await trace(h, 226, 450); await pop(h, [227], [60.4, 108.6], 220);
        await pop(h, G.boxG.filter(function (i) { return on1.indexOf(i) >= 0; }), P_G6, 650);
        await trace(h, 228, 450); await pop(h, [229], [210.2, 115.7], 220);
        done(G.boxL.concat(G.boxG, G.arrL, G.arrG));
      }
      // rede de segurança: o que sobrou entra/sai em fade (o estado final é sempre o do PDF)
      gone = gone.filter(function (i) { return els[i].style.display !== 'none'; });
      await h.all([fade(h, todo, 0, 1, 350), fade(h, gone.filter(function (i) { return on1.indexOf(i) < 0; }), 1, 0, 350)]);
    }

    return { snap: snap, play: play };
  });
})();
