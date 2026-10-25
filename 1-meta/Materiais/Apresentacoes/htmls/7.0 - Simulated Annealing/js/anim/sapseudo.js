/* Pseudocódigo do SA executado passo a passo (aula 7, slide 36).
 *
 * Passo 1: o algoritmo como no PDF. No passo 2 ele encolhe para a esquerda; à direita aparece o landscape
 * (o mesmo dos slides 30–35, desenhado de js/anim/dados/prob.js) com o termômetro, e embaixo do algoritmo
 * um painel com os valores (T, k, ΔE, P, u, melhor s). A cada → uma linha é executada:
 *
 *   i0  s = GeraSolInicial()           s brota
 *   t0  T = Tmax                         o mercúrio sobe
 *   w0  while T ≥ Tmin                   comparação (✓)
 *   e0  while equilíbrio não atingido    k = 1 de L
 *   g0  gera vizinho aleatório s'        candidatos piscam, para em s'
 *   d0  ΔE = f(s') − f(s)                cota ΔE no gráfico
 *   if0 if ΔE ≤ 0                         falso → else
 *   acc0 aceite s' com probabilidade P   P = e^(−ΔE/T), u sorteado: u < P, s vai para s'
 *   run  o resto da execução (Metropolis, semente fixa) com as linhas acendendo, T caindo a cada
 *        RefriaTemperatura, o melhor s marcado em verde
 *   fim  while T ≥ Tmin: falso, sai do laço
 *   ret  return melhor s
 *
 * Linhas do algoritmo (índices de .alg-body > div): 0 s=Gera, 1 T=Tmax, 2 while T, 3 while equilíbrio,
 * 4 gera vizinho, 5 ΔE, 6 if, 7 s=s', 8 else, 9 aceite, 10 end if, 11 end while, 12 Refria, 13 end while, 14 return.
 */
(function () {
  'use strict';
  const A = window.Anim, S = A.svg, E = A.ease, lerp = A.lerp;
  if (!A) return;
  const NAVY = '#00008b', RED = '#d0281a', GREEN = '#169b3a', MYBLUE = '#0061a5', GRAY = '#8a8a8a', DRED = '#8b0000';
  const MAIN = 'KaTeX_Main, serif', MATH = 'KaTeX_Math, serif';
  const clamp01 = function (t) { return Math.max(0, Math.min(1, t)); };
  const ALG_SC = 0.56;                       // escala extra do algoritmo (sobre o 0.9 do \scalebox)
  const FW = 403.7, FH = 209.7;              // área do .fc (pt)
  const LX = 210, LY = 2, LS = 0.765;        // posição/escala do landscape (coordenadas de prob.js)
  const PX = 6, PY = 132;                    // painel de valores
  const T0 = 45, TMIN = 0.4, ALPHA = 0.8, LEQ = 3;
  const X0 = 57, XP0 = 54.39, U0 = 0.35;     // 1ª iteração (a mesma dos slides 30–32)
  // itens de prob.js: eixos + curva (estado prob1) e o termômetro do prob4
  const LAND = [5, 6, 12, 13, 14, 4, 31, 257, 258, 259, 260, 261, 262, 263];
  const THERM = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26], MERC = 20, MERC_Y = [36.18, 50.23], MERC_X = [175.17, 176.41], MERC_B = 55.67;

  const fmt = function (v, d) { return (d == null ? v.toFixed(2) : v.toFixed(d)).replace('.', ',').replace('-', '−'); };

  // ---------- roteiro: estados dos passos + traço da execução ----------
  let SCRIPT = null;
  function script(C, rng) {
    if (SCRIPT) return SCRIPT;
    const f = function (x) { return 125.68 - C.y(x); };      // altura acima do eixo (minimização)
    const st = {};
    st.p = { big: true };
    st.i0 = { line: 0, s: X0, best: X0 };
    st.t0 = { line: 1, s: X0, best: X0, T: T0 };
    st.w0 = { line: 2, s: X0, best: X0, T: T0, wT: true };
    st.e0 = { line: 3, s: X0, best: X0, T: T0, k: 1 };
    st.g0 = { line: 4, s: X0, best: X0, T: T0, k: 1, sp: XP0 };
    const dE0 = f(XP0) - f(X0), P0 = Math.exp(-dE0 / T0);
    st.d0 = { line: 5, s: X0, best: X0, T: T0, k: 1, sp: XP0, dE: dE0, cota: true };
    st.if0 = { line: 6, s: X0, best: X0, T: T0, k: 1, sp: XP0, dE: dE0, cota: true, ifr: false };
    st.acc0 = { bestOn: true, line: 9, s: XP0, prev: X0, best: X0, T: T0, k: 1, dE: dE0, P: P0, u: U0, acc: true };
    // o resto da execução: procura uma semente que atravesse o landscape e termine no vale da direita
    for (let seed = 1; seed < 3000; seed++) {
      const r = rng(seed), tr = [];
      let x = XP0, best = X0, T = T0, k = 2, maxX = x, up = 0;
      if (f(XP0) < f(best)) best = XP0;
      while (T >= TMIN) {
        for (; k <= LEQ; k++) {
          const x2 = Math.max(C.x0 + 1, Math.min(C.x1 - 1, x + (r() * 2 - 1) * 16));
          const dE = f(x2) - f(x), P = dE <= 0 ? 1 : Math.exp(-dE / T), u = r(), acc = dE <= 0 || u < P;
          tr.push({ T: T, k: k, from: x, to: x2, dE: dE, P: P, u: u, acc: acc });
          if (acc) { if (dE > 3) up++; x = x2; maxX = Math.max(maxX, x); if (f(x) < f(best)) best = x; }
          tr[tr.length - 1].best = best;
        }
        T *= ALPHA; k = 1;
        tr.push({ cool: true, T: T, best: best, s: x });
      }
      if (x > 200 && best > 200 && maxX > 150 && up >= 6) {
        const last = tr[tr.length - 1];
        st.run = { bestOn: true, line: 12, s: x, best: best, T: last.T, k: LEQ, trace: tr, seed: seed };
        st.fim = { bestOn: true, line: 2, s: x, best: best, T: last.T, wT: true };
        st.ret = { bestOn: true, line: 14, s: x, best: best, T: last.T, ret: true };
        break;
      }
    }
    SCRIPT = { st: st, f: f };
    return SCRIPT;
  }

  A.define('sapseudo', function (host) {
    const D = A.figData && A.figData.prob, T = A.saTools;
    if (!D || !T) { console.warn('sapseudo: faltam prob.js / saland.js'); return { snap: function () {} }; }
    const frame = host.closest('section'), box = frame.querySelector('.scalebox');
    const lines = Array.prototype.slice.call(box.querySelectorAll('.alg-body > div'));
    const C = T.curve(D.items), SC = script(C, T.rng), ST = SC.st, f = SC.f;

    host.style.cssText = 'position:absolute;left:0;top:0;width:' + FW + 'pt;height:' + FH + 'pt;pointer-events:none';
    const root = S('svg', { viewBox: '0 0 ' + FW + ' ' + FH, role: 'img', 'aria-label': 'Execução do pseudocódigo do Simulated Annealing' });
    root.style.width = FW + 'pt'; root.style.height = FH + 'pt';
    host.appendChild(root);
    const gL = S('g', { transform: 'translate(' + LX + ' ' + LY + ') scale(' + LS + ')' }, root);
    const items = D.items, all = A.figBuild(gL, items);
    all.forEach(function (e, i) { if (LAND.indexOf(i) < 0 && THERM.indexOf(i) < 0) e.remove(); });
    const merc = all[MERC];
    const gFx = S('g', {}, gL);                 // cota, marcas
    const best = S('g', {}, gL);
    S('circle', { r: 3.2, fill: 'none', stroke: GREEN, 'stroke-width': 0.7 }, best);
    const bestLab = S('text', { x: -9, y: -4.2, 'font-size': 5, 'font-family': MAIN, fill: GREEN }, best); bestLab.textContent = 'melhor';
    function pt() {
      const g = S('g', {}, gL); S('circle', { r: 1.2, fill: NAVY }, g); S('circle', { r: 0.66, fill: '#fff' }, g);
      g.at = function (x, dy) { g.setAttribute('transform', 'translate(' + x.toFixed(3) + ' ' + (C.y(x) - (dy || 0)).toFixed(3) + ')'); };
      return g;
    }
    const sP = pt(), spP = pt();
    const sLab = S('text', { 'font-size': 6.97, 'font-family': MAIN, fill: '#000' }, gL); sLab.textContent = 's';
    const spLab = S('text', { 'font-size': 6.97, 'font-family': MAIN, fill: '#000' }, gL); spLab.textContent = 's’';
    const gP = S('g', {}, root);                // painel de valores
    S('rect', { x: PX - 3, y: PY - 7, width: 198, height: 74, rx: 2, fill: '#f7f9fc', stroke: '#c9d6e6', 'stroke-width': 0.5 }, gP);
    const rows = [0, 1, 2, 3, 4, 5].map(function (k) {
      const t = S('text', { x: PX, y: PY + 2 + k * 11.2, 'font-size': 7.2, 'font-family': MAIN, fill: '#222' }, gP);
      return t;
    });

    // ---------- desenho de um estado ----------
    function setRow(i, parts, color, bold) {
      const t = rows[i]; t.textContent = '';
      t.setAttribute('fill', color || '#222'); t.setAttribute('font-weight', bold ? 'bold' : 'normal');
      let off = 0;   // deslocamento vertical atual (sobrescrito/subscrito)
      (parts || []).forEach(function (p) {
        const s = S('tspan', {}, t), kind = typeof p === 'string' ? '' : p[1];
        s.textContent = typeof p === 'string' ? p : p[0];
        if (kind === 'i') { s.setAttribute('font-family', MATH); s.setAttribute('font-style', 'italic'); }
        const want = kind === 'sup' ? -2.8 : kind === 'down' ? 1.8 : 0;
        if (want) s.setAttribute('font-size', 5.2);
        if (want !== off) { s.setAttribute('dy', want - off); off = want; }
      });
    }
    function mercFor(Tv) {
      const lt = Tv == null ? null : clamp01(Math.log(Tv / TMIN) / Math.log(T0 / TMIN));
      if (lt == null) { merc.style.display = 'none'; return; }
      merc.style.display = '';
      const top = lerp(MERC_Y[1] + 4.5, MERC_Y[0], lt);
      merc.setAttribute('d', 'M' + MERC_X[0] + ' ' + top + 'L' + MERC_X[0] + ' ' + MERC_B + 'L' + MERC_X[1] + ' ' + MERC_B + 'L' + MERC_X[1] + ' ' + top + 'Z');
    }
    function cota(xs, xq, on) {
      gFx.textContent = '';
      if (!on) return;
      const ys = C.y(xs), yq = C.y(xq), xc = Math.min(xs, xq) - 7;
      [ys, yq].forEach(function (y, i) { S('line', { x1: [xs, xq][i], y1: y, x2: xc - 1.5, y2: y, stroke: GRAY, 'stroke-width': 0.35, 'stroke-dasharray': '1 0.8' }, gFx); });
      S('line', { x1: xc, y1: ys, x2: xc, y2: yq, stroke: RED, 'stroke-width': 0.5 }, gFx);
      const t = S('text', { x: xc - 9.5, y: (ys + yq) / 2 + 2, 'font-size': 5.5, fill: RED }, gFx);
      const a = S('tspan', { 'font-family': MAIN }, t); a.textContent = 'Δ';
      const b = S('tspan', { 'font-family': MATH, 'font-style': 'italic' }, t); b.textContent = 'E';
    }
    function hl(i) { lines.forEach(function (l, k) { l.classList.toggle('alg-on', k === i); }); }
    function place(g, lab, x, dy) { g.at(x, dy); lab.setAttribute('x', x - 6); lab.setAttribute('y', C.y(x) + 6 - (dy || 0)); }
    function placeSp(x) { spP.at(x); spLab.setAttribute('x', x + 1.5); spLab.setAttribute('y', C.y(x) - 2.5); }
    function rowsFor(s) {
      const hiT = [1, 2, 12].indexOf(s.line) >= 0, hiK = s.line === 3, hiE = s.line === 5 || s.line === 6, hiP = s.line === 9;
      if (s.T == null) setRow(0, []);
      else if (s.wT) {
        const ok = s.T >= TMIN;
        setRow(0, [['T', 'i'], ' = ' + fmt(s.T) + (ok ? ' ≥ ' : ' < '), ['T', 'i'], ['min', 'down'], '  = ' + fmt(TMIN) + (ok ? '   ✓ continua' : '   ✗ sai do laço')], ok ? GREEN : RED, true);
      } else setRow(0, [['T', 'i'], ' = ' + fmt(s.T) + '     (', ['T', 'i'], ['min', 'down'], ' = ' + fmt(TMIN) + ')'], hiT ? MYBLUE : null, hiT);
      setRow(1, s.k ? ['equilíbrio: iteração ' + s.k + ' de ' + LEQ] : [], hiK ? MYBLUE : null, hiK);
      if (s.dE != null) {
        const fs = s.prev != null ? s.prev : s.s, fq = s.sp != null ? s.sp : s.s;
        setRow(2, [['Δ', ''], ['E', 'i'], ' = ', ['f', 'i'], '(s′) − ', ['f', 'i'], '(s) = ' + fmt(f(fq)) + ' − ' + fmt(f(fs)) + ' = ' + fmt(s.dE)], hiE ? MYBLUE : null, hiE);
      } else setRow(2, []);
      if (s.ifr === false) setRow(3, ['Δ', ['E', 'i'], ' ≤ 0 ?  não  →  else'], MYBLUE, true);
      else if (s.P != null) setRow(3, [['P', 'i'], ' = ', ['e', 'i'], ['−ΔE/T', 'sup'], '   ' + (s.P < 0.005 ? '≈ 0' : '= ' + fmt(s.P))], hiP ? MYBLUE : null, hiP);
      else setRow(3, []);
      if (s.u != null) setRow(4, [['u', 'i'], ' = ' + fmt(s.u) + (s.acc ? ' < ' : ' ≥ '), ['P', 'i'], s.acc ? '  →  aceita s′ (s = s′)' : '  →  rejeita s′'], s.acc ? GREEN : RED, true);
      else setRow(4, []);
      setRow(5, s.best != null ? ['melhor ', ['s', 'i'], ' até agora:  ', ['f', 'i'], ' = ' + fmt(f(s.best))] : [], s.ret ? GREEN : null, !!s.ret);
    }
    function render(s, hideS) {
      hl(s.line);
      const has = s.s != null;
      sP.style.display = has && !hideS ? '' : 'none'; sLab.style.display = sP.style.display;
      if (has) place(sP, sLab, s.s);
      spP.style.display = s.sp != null ? '' : 'none'; spLab.style.display = spP.style.display;
      if (s.sp != null) placeSp(s.sp);
      best.style.display = s.best != null && s.bestOn ? '' : 'none';
      if (s.best != null) best.setAttribute('transform', 'translate(' + s.best.toFixed(3) + ' ' + C.y(s.best).toFixed(3) + ')');
      cota(s.prev != null ? s.prev : s.s, s.sp, !!s.cota);
      mercFor(s.T);
      rowsFor(s);
    }

    const BASE = box.style.transform;
    function snap(name) {
      const s = ST[name] || ST.p;
      box.style.transform = s.big ? BASE : 'scale(' + (0.9 * ALG_SC) + ')';
      root.style.display = s.big ? 'none' : ''; root.style.opacity = '';
      bestLab.style.display = '';
      if (s.big) { hl(-1); return; }
      render(s);
    }

    // ---------- animações ----------
    async function flick(h, x0, x1, n, seed) {   // candidatos aleatórios piscam e param em x1
      const r = T.rng(seed), xs = [];
      for (let k = 0; k < n; k++) xs.push(Math.max(C.x0 + 2, Math.min(C.x1 - 2, x0 + (r() * 2 - 1) * 12)));
      xs.push(x1);
      const g = pt();
      for (let k = 0; k < xs.length; k++) {
        g.at(xs[k]); g.style.opacity = 0;
        await h.tween(k === xs.length - 1 ? 200 : 120, function (e) { g.style.opacity = e; });
        if (k < xs.length - 1) await h.tween(80, function (e) { g.style.opacity = 1 - e; });
      }
      g.remove();
    }
    function rowIn(h, i) {
      const t = rows[i];
      return h.tween(300, function (e) { t.style.opacity = e; t.setAttribute('transform', 'translate(' + (3 * (1 - e)) + ' 0)'); }, E.out)
        .then(function () { t.style.opacity = ''; t.removeAttribute('transform'); });
    }
    async function moveS(h, a, b, dur, up) {
      await h.tween(dur, function (e) { place(sP, sLab, lerp(a, b, e), up ? 3 * Math.sin(Math.PI * e) : 0); }, E.inOut);
      place(sP, sLab, b);
    }
    function ring(h, x, color) {
      const c = S('circle', { cx: x, cy: C.y(x), r: 2, fill: 'none', stroke: color, 'stroke-width': 0.6 }, gFx);
      return h.tween(700, function (e) { c.setAttribute('r', 2 + 6 * e); c.setAttribute('opacity', 1 - e); }, E.out).then(function () { c.remove(); });
    }

    async function play(a, b, h) {
      const s0 = ST[a] || ST.p, s1 = ST[b] || ST.p;
      if (s0.big && !s1.big) {        // o algoritmo encolhe e o painel/landscape aparecem
        root.style.display = ''; root.style.opacity = 0;
        render(Object.assign({}, s1, { s: null, best: null, line: -1, T: null }));
        await h.tween(800, function (e) {
          box.style.transform = 'scale(' + (0.9 * lerp(1, ALG_SC, e)) + ')';
          root.style.opacity = clamp01(e * 1.4 - 0.4);
        }, E.inOut);
        root.style.opacity = '';
      }
      if (b === 'i0') { render(s1, true); hl(0); sP.style.display = ''; sLab.style.display = '';
        await h.tween(420, function (e) { sP.setAttribute('transform', sP.getAttribute('transform').replace(/ scale\([^)]*\)/, '') + ' scale(' + Math.max(0.01, E.back(e)) + ')'); }, E.linear);
        render(s1); await rowIn(h, 5); return; }
      if (b === 't0') {
        hl(1); rowsFor(s1); await h.tween(900, function (e) { mercFor(TMIN * Math.pow(T0 / TMIN, e)); }, E.out); await rowIn(h, 0); return;
      }
      if (b === 'w0' || b === 'fim') { render(s1); await rowIn(h, 0); return; }
      if (b === 'e0') { render(s1); await rowIn(h, 1); return; }
      if (b === 'g0') {
        hl(4); await flick(h, X0, XP0, 5, 11); render(s1);
        await h.tween(300, function (e) { spP.style.opacity = e; spLab.style.opacity = e; }); spP.style.opacity = ''; spLab.style.opacity = '';
        return;
      }
      if (b === 'd0') { render(s1); gFx.style.opacity = 0; await h.tween(400, function (e) { gFx.style.opacity = e; }); gFx.style.opacity = ''; await rowIn(h, 2); return; }
      if (b === 'if0') { render(s1); hl(6); await rowIn(h, 3); await h.wait(450); hl(8); await h.wait(450); hl(6); return; }
      if (b === 'acc0') {
        hl(8); await h.wait(300);
        render(Object.assign({}, s1, { s: s0.s, sp: s0.sp, cota: true, u: null })); hl(9);
        await rowIn(h, 3);
        rowsFor(s1); await rowIn(h, 4);
        hl(7);
        await moveS(h, X0, XP0, 650, true);
        render(s1); return;
      }
      if (b === 'run') { await run(h, s0, s1); return; }
      if (b === 'ret') {
        render(s1); await rowIn(h, 5); await ring(h, s1.best, GREEN); await ring(h, s1.best, GREEN); return;
      }
      render(s1);
    }

    // a execução inteira: cada proposta acende as linhas 4–9, e cada resfriamento a linha 12
    async function run(h, s0, s1) {
      let x = s0.s, bst = s0.best, k = 2;
      const tr = s1.trace, per = 78;
      const trail = S('g', {}, gL);
      gFx.textContent = '';
      for (let i = 0; i < tr.length; i++) {
        const p = tr[i];
        if (p.cool) {
          hl(12);
          const Ta = p.T / ALPHA, Tb = p.T;
          await h.tween(110, function (e) { mercFor(lerp(Ta, Tb, e)); rowsFor({ line: 12, T: lerp(Ta, Tb, e), best: bst }); });
          hl(2); rowsFor({ line: 2, T: Tb, best: bst, wT: true }); await h.wait(45);
          hl(3); k = 1; continue;
        }
        hl(4); placeSp(p.to); spP.style.display = ''; spLab.style.display = 'none';
        rowsFor({ line: 9, T: p.T, k: p.k, dE: p.dE, P: p.dE > 0 ? p.P : null, u: p.dE > 0 ? p.u : null, acc: p.acc, s: p.from, sp: p.to, best: bst });
        if (p.dE > 0 && !p.acc) { setRow(4, [['u', 'i'], ' = ' + fmt(p.u) + ' ≥ ', ['P', 'i'], '  →  rejeita s′'], RED, true); }
        if (p.dE <= 0) setRow(4, ['Δ', ['E', 'i'], ' ≤ 0  →  aceita (melhor)'], GREEN, true);
        await h.wait(per * 0.35);
        hl(6); await h.wait(per * 0.15);
        if (p.acc) {
          hl(p.dE <= 0 ? 7 : 9);
          const xa = x, xb = p.to;
          await h.tween(per * 0.5, function (e) { place(sP, sLab, lerp(xa, xb, e), p.dE > 0 ? 2.5 * Math.sin(Math.PI * e) : 0); }, E.inOut);
          x = xb;
          S('circle', { cx: x, cy: C.y(x), r: 0.55, fill: p.dE > 0 ? RED : NAVY, opacity: 0.5 }, trail);
        } else { hl(9); spP.style.opacity = 0.35; await h.wait(per * 0.5); spP.style.opacity = ''; }
        bst = p.best;
        best.style.display = ''; best.setAttribute('transform', 'translate(' + bst.toFixed(3) + ' ' + C.y(bst).toFixed(3) + ')');
        spP.style.display = 'none';
      }
      await h.tween(500, function (e) { trail.style.opacity = 1 - e; });
      trail.remove();
      render(s1);
    }

    return { snap: snap, play: play };
  });
})();
