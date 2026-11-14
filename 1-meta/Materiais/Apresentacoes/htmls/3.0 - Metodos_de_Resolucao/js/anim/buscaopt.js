/* Busca local executável com 2-OPT (aula 3, frame 67). Mesma ideia do componente "pseudo" da aula 6
 * (js/anim/buscalocal.js): o algorithm do slide encolhe (scale 0.62, origem no canto) e, à direita, o efeito de cada
 * linha aparece num TSP pequeno; a linha em execução ganha a classe alg-on (css).
 *
 * Uso: <span class="anim bo" data-anim="buscaopt" data-state="p,i0,w0,alt1,if1,mv1,run,altL,ifL,pare,ret"
 *        style="position:absolute;left:258pt;top:14pt"></span> como último filho do .fc; o section tem data-steps="11".
 * Instância: 7 cidades (semente 23, mesmo gerador do doisopt3.js), rota inicial aleatória; 2-OPT de melhor troca:
 * 461,8 → 388,5 → 313,9 → 295,2 e então nenhum vizinho melhora.
 *   p     passo 1 = PDF (algoritmo no tamanho original)
 *   i0    s = s0: o algoritmo encolhe, a rota inicial é traçada, f(s)
 *   w0    while: o critério de parada aparece ("nenhum vizinho 2-OPT melhor")
 *   alt1  Altere s por s′: o melhor vizinho 2-OPT — arcos que saem (vermelho), que entram (azul), f(s′)
 *   if1   f(s′) < f(s)? ✓
 *   mv1   s = s′: a troca é aplicada (trecho invertido em laranja), f(s) atualiza
 *   run   iterações 2 e 3 de uma vez (as linhas acendem em sequência)
 *   altL  o melhor vizinho agora é pior · ifL ✗ (s fica) · pare: o laço termina · ret: return s = ótimo local
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease, lerp = Anim.lerp;
  const MYBLUE = '#0061a5', RED = '#d0281a', GREEN = '#169b3a', ORANGE = '#d9822b', NAVY = '#00008b';
  const CAP = '"LM Sans 8", "LM Sans", sans-serif', MAIN = 'KaTeX_Main, serif';
  const ALG_SC = 0.62, W = 140, H = 118, N = 7;
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const fmt = function (v) { return v.toFixed(1).replace('.', ','); };

  // ---------- instância e a busca local (calculadas uma vez) ----------
  const R = rng(23), PTS = [];
  while (PTS.length < N) { const p = [10 + R() * 118, 26 + R() * 70]; if (PTS.every(function (q) { return Math.hypot(p[0] - q[0], p[1] - q[1]) > 24; })) PTS.push(p); }
  let r0 = []; for (let i = 0; i < N; i++) r0.push(i);
  for (let i = N - 1; i > 1; i--) { const j = 1 + Math.floor(R() * i); const t = r0[i]; r0[i] = r0[j]; r0[j] = t; }
  const d = function (a, b) { return Math.hypot(PTS[a][0] - PTS[b][0], PTS[a][1] - PTS[b][1]); };
  const L = function (r) { let s = 0; for (let k = 0; k < N; k++) s += d(r[k], r[(k + 1) % N]); return s; };
  function best(r) {   // melhor vizinho 2-OPT (mesmo que piore)
    let b = null;
    for (let i = 0; i < N - 1; i++) for (let j = i + 2; j < N; j++) {
      if (i === 0 && j === N - 1) continue;
      const dl = d(r[i], r[j]) + d(r[i + 1], r[(j + 1) % N]) - d(r[i], r[i + 1]) - d(r[j], r[(j + 1) % N]);
      if (!b || dl < b.dl) b = { i: i, j: j, dl: dl };
    }
    return b;
  }
  const apply = function (r, m) { return r.slice(0, m.i + 1).concat(r.slice(m.i + 1, m.j + 1).reverse(), r.slice(m.j + 1)); };
  const IT = [];   // iterações: rota antes, movimento, rota depois
  for (let r = r0; ;) { const m = best(r); IT.push({ r: r, m: m, r2: apply(r, m) }); if (m.dl >= -1e-6) break; r = apply(r, m); }
  const LAST = IT[IT.length - 1], FINAL = LAST.r;

  // estado de cada passo: linha acesa, rota, prévia do vizinho (iteração), comparação, textos
  const ST = {
    p: { big: true, line: -1 },
    i0: { line: 0, r: r0 },
    w0: { line: 1, r: r0, crit: true },
    alt1: { line: 2, r: r0, pv: 0, crit: true },
    if1: { line: 3, r: r0, pv: 0, cmp: 0, crit: true },
    mv1: { line: 4, r: IT[0].r2, crit: true, it: 1 },
    run: { line: 1, r: IT[IT.length - 2].r2, crit: true, it: IT.length - 1 },
    altL: { line: 2, r: FINAL, pv: IT.length - 1, crit: true, it: IT.length - 1 },
    ifL: { line: 3, r: FINAL, pv: IT.length - 1, cmp: IT.length - 1, crit: true, it: IT.length - 1 },
    pare: { line: 6, r: FINAL, stop: true, it: IT.length - 1 },
    ret: { line: 7, r: FINAL, stop: true, ret: true, it: IT.length - 1 }
  };

  Anim.define('buscaopt', function (host) {
    const frame = host.closest('section'), alg = frame.querySelector('.algorithm');
    const lines = Array.prototype.slice.call(alg.querySelectorAll('.alg-body > div'));
    alg.style.transformOrigin = '0 0';
    const svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.style.cssText = 'width:' + W + 'pt;height:' + H + 'pt;overflow:visible;display:block';
    host.appendChild(svg);
    const gRoute = S('g', null, svg), gPrev = S('g', null, svg), gNodes = S('g', null, svg), gTxt = S('g', null, svg);
    PTS.forEach(function (p) { S('circle', { cx: p[0], cy: p[1], r: 1.9, fill: NAVY }, gNodes); });
    const tF = S('text', { x: 2, y: 7, 'font-size': 6.8, 'font-family': MAIN }, gTxt);
    const tC = S('text', { x: 2, y: 16, 'font-size': 6.4, 'font-family': MAIN }, gTxt);
    const tB = S('text', { x: 2, y: H - 2, 'font-size': 5.4, 'font-family': CAP, fill: '#666' }, gTxt);
    const tI = S('text', { x: W - 2, y: 7, 'font-size': 5.4, 'font-family': CAP, fill: '#666', 'text-anchor': 'end' }, gTxt);

    function hl(i) { lines.forEach(function (l, k) { l.classList.toggle('alg-on', k === i); }); }
    function arrowPath(a, b) {
      const A = PTS[a], B = PTS[b], Ln = Math.hypot(B[0] - A[0], B[1] - A[1]), ux = (B[0] - A[0]) / Ln, uy = (B[1] - A[1]) / Ln;
      const x0 = A[0] + ux * 2.2, y0 = A[1] + uy * 2.2, x1 = B[0] - ux * 2.4, y1 = B[1] - uy * 2.4;
      return { line: 'M' + x0 + ' ' + y0 + 'L' + x1 + ' ' + y1, head: 'M' + x1 + ' ' + y1 + 'l' + (-ux * 3 - uy * 1.2) + ' ' + (-uy * 3 + ux * 1.2) + 'l' + (uy * 2.4) + ' ' + (-ux * 2.4) + 'Z' };
    }
    function arc(a, b, col, parent, dash, w) {
      const p = arrowPath(a, b), g = S('g', null, parent);
      const ln = S('path', { d: p.line, stroke: col, 'stroke-width': w || 0.55, fill: 'none' }, g);
      if (dash) ln.setAttribute('stroke-dasharray', dash);
      S('path', { d: p.head, fill: col }, g);
      return g;
    }
    function drawRoute(r, col) {
      while (gRoute.firstChild) gRoute.removeChild(gRoute.firstChild);
      for (let k = 0; k < N; k++) arc(r[k], r[(k + 1) % N], col || '#000', gRoute);
    }
    // prévia do vizinho: arcos (r[i],r[i+1]) e (r[j],r[j+1]) saem; (r[i],r[j]) e (r[i+1],r[j+1]) entram
    function preview(it) {
      while (gPrev.firstChild) gPrev.removeChild(gPrev.firstChild);
      const r = IT[it].r, m = IT[it].m, a = r[m.i], b = r[m.i + 1], c = r[m.j], e = r[(m.j + 1) % N];
      const out = [arc(a, b, RED, gPrev, null, 1.1), arc(c, e, RED, gPrev, null, 1.1)];
      const inn = [arc(a, c, MYBLUE, gPrev, '2 1', 0.9), arc(b, e, MYBLUE, gPrev, '2 1', 0.9)];
      return { out: out, inn: inn };
    }
    const fS = function (r) { return 'f(s) = ' + fmt(L(r)); };
    function texts(s) {
      tF.textContent = s.r ? fS(s.r) : '';
      tF.setAttribute('fill', s.ret ? GREEN : '#000');
      tC.textContent = ''; tC.removeAttribute('fill');
      if (s.pv != null) { const it = IT[s.pv]; tC.textContent = 'f(s′) = ' + fmt(L(it.r2)); }
      if (s.cmp != null) {
        const it = IT[s.cmp], ok = it.m.dl < -1e-6;
        tC.textContent = 'f(s′) = ' + fmt(L(it.r2)) + (ok ? ' < ' : ' ≥ ') + fmt(L(it.r)) + (ok ? '  ✓ melhor' : '  ✗ não melhora');
        tC.setAttribute('fill', ok ? GREEN : RED);
      }
      tB.textContent = s.ret ? 'ótimo local: nenhum 2-OPT melhora s' : s.stop ? 'critério satisfeito: nenhum vizinho melhor' : s.crit ? 'para quando nenhum 2-OPT melhorar s' : '';
      tB.setAttribute('fill', s.ret || s.stop ? GREEN : '#666');
      tI.textContent = s.it ? 'trocas feitas: ' + s.it : '';
    }

    function snap(name) {
      const s = ST[name] || ST.p;
      alg.style.transform = s.big ? '' : 'scale(' + ALG_SC + ')';
      svg.style.display = s.big ? 'none' : 'block'; svg.style.opacity = '';
      hl(s.line);
      while (gPrev.firstChild) gPrev.removeChild(gPrev.firstChild);
      if (s.r) drawRoute(s.r, s.ret ? GREEN : '#000'); else while (gRoute.firstChild) gRoute.removeChild(gRoute.firstChild);
      if (s.pv != null) preview(s.pv);
      texts(s);
    }

    // ---------- animações ----------
    async function traceRoute(h, r, dur) {
      drawRoute(r);
      const gs = Array.prototype.slice.call(gRoute.childNodes);
      gs.forEach(function (g) { g.style.opacity = 0; });
      for (const g of gs) {
        const ln = g.firstChild, Lg = ln.getTotalLength();
        g.style.opacity = ''; g.lastChild.style.opacity = 0;
        ln.style.strokeDasharray = Lg + ' ' + (Lg + 1);
        await h.tween(dur, function (e) { ln.style.strokeDashoffset = Lg * (1 - e); });
        ln.style.strokeDasharray = ''; ln.style.strokeDashoffset = ''; g.lastChild.style.opacity = '';
      }
    }
    async function showPreview(h, it) {
      const p = preview(it);
      p.out.concat(p.inn).forEach(function (g) { g.style.opacity = 0; });
      await h.tween(450, function (e, t) { p.out.forEach(function (g) { g.style.opacity = e; g.firstChild.setAttribute('stroke-width', 0.6 + 0.9 * Math.sin(Math.PI * t) + 0.5 * e); }); });
      await h.tween(450, function (e) { p.inn.forEach(function (g) { g.style.opacity = e; }); });
    }
    async function doMove(h, it) {   // aplica a troca: rota nova, trecho invertido em laranja por um instante
      const m = IT[it].m, r2 = IT[it].r2;
      while (gPrev.firstChild) gPrev.removeChild(gPrev.firstChild);
      drawRoute(r2);
      const gs = Array.prototype.slice.call(gRoute.childNodes);
      gs.slice(m.i + 1, m.j).forEach(function (g) { g.firstChild.setAttribute('stroke', ORANGE); g.lastChild.setAttribute('fill', ORANGE); });
      [gs[m.i], gs[m.j]].forEach(function (g) { g.firstChild.setAttribute('stroke', MYBLUE); g.lastChild.setAttribute('fill', MYBLUE); g.firstChild.setAttribute('stroke-width', 0.9); });
      await h.wait(650);
      drawRoute(r2);
    }
    async function line(h, i, ms) { hl(i); await h.wait(ms || 380); }

    async function play(a, b, h) {
      const sb = ST[b] || ST.p;
      if (sb.big) { snap(b); return; }
      if (b === 'i0') {   // o algoritmo encolhe; a figura entra; s0 é traçada
        snap('p'); hl(0);
        svg.style.display = 'block'; svg.style.opacity = 0; texts({});
        await h.tween(600, function (e) { alg.style.transform = 'scale(' + lerp(1, ALG_SC, e) + ')'; svg.style.opacity = e; }, ease.inOut);
        svg.style.opacity = '';
        await traceRoute(h, r0, 110);
        texts(sb); return;
      }
      snap(a);
      if (b === 'w0' || b === 'pare') { hl(sb.line); texts(sb); return; }
      if (b === 'alt1' || b === 'altL') { hl(2); texts(Object.assign({}, ST[a], { pv: null })); await showPreview(h, sb.pv); texts(sb); return; }
      if (b === 'if1' || b === 'ifL') { hl(3); await h.wait(250); texts(sb); return; }
      if (b === 'mv1') { hl(4); texts(Object.assign({}, sb, { it: 0 })); await doMove(h, 0); texts(sb); return; }
      if (b === 'run') {   // iterações 2 … k-1
        for (let it = 1; it < IT.length - 1; it++) {
          await line(h, 1, 300);
          await line(h, 2, 50); texts({ r: IT[it].r, pv: it, crit: true, it: it }); await showPreview(h, it);
          await line(h, 3, 50); texts({ r: IT[it].r, pv: it, cmp: it, crit: true, it: it }); await h.wait(500);
          hl(4); await doMove(h, it); texts({ r: IT[it].r2, crit: true, it: it + 1 });
          await line(h, 5, 250);
        }
        snap(b); return;
      }
      if (b === 'ret') {
        hl(7); texts(sb);
        const gs = Array.prototype.slice.call(gRoute.childNodes);
        await h.tween(600, function (e) { gs.forEach(function (g) { const c = Anim.mix('#000000', GREEN, e); g.firstChild.setAttribute('stroke', c); g.lastChild.setAttribute('fill', c); }); });
        return;
      }
      snap(b);
    }
    return { snap: snap, play: play };
  });
})();
