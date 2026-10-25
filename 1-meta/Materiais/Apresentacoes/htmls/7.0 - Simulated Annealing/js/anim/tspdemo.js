/* Exemplo - TSP (aula 7, slide 66): SA x busca local ao vivo.
 *
 * O slide só tem o enunciado: o frame ganha um 2º passo (data-steps="2"). Passo 1 = PDF. No passo 2 o
 * enunciado sai (já foi lido) e a demonstração ocupa a área do frame:
 *   - esquerda: as rotas (40 cidades, semente por instância); seletor "mostrar: SA / busca local / as duas"
 *     e os custos;
 *   - direita, em cima: a vizinhança usada (2-opt) com desenho antes/depois e a regra de aceite de cada método;
 *   - direita, no meio: gráfico de convergência com legenda explicativa, eixo de T à direita, marca do ótimo
 *     local da busca local e anotações das fases do SA (T alta: aceita pioras, oscila; T baixa: converge);
 *   - direita, embaixo: linha de status (iteração, T, % de pioras aceitas; no modo lento, o vizinho testado,
 *     Δ, P, u e a decisão) e botões: modo lento/rápido, pausar, rodar de novo, nova instância.
 * Gráfico para análise: guarda o histórico completo (custo atual e melhor de cada iteração do SA, custo de
 * cada iteração da busca local; T é calculada da iteração) e desenha uma janela de iterações — quando há mais
 * pontos que pixels, mínimo e máximo de cada trecho. Roda do mouse = zoom no eixo das iterações em torno do
 * cursor (o eixo do custo se ajusta ao trecho visível), arrastar = mover, duplo clique = ver tudo; passar o
 * mouse mostra iteração, custo atual, melhor, T e busca local; botão "ampliar" põe o gráfico no quadro todo.
 * Sequência automática: busca local 2-opt (primeira melhora) a partir de uma rota aleatória; depois o SA
 * (vizinho 2-opt sorteado, Metropolis, α = 0,95, L = 10n, T0 para aceitar ~80% das pioras, até T0·10⁻³) a
 * partir da MESMA rota inicial. No modo lento, cada vizinho aparece na rota: arestas removidas em roxo
 * tracejado, novas em verde.
 * A simulação roda num laço próprio (rAF), não no play: o core chama snap ao fim do play e snap('demo') não
 * reinicia uma execução em andamento; só avança com o frame ativo.
 *
 * Uso: <span class="anim" data-anim="tspdemo" data-state="texto,demo"> no .fc, depois do parágrafo.
 */
(function () {
  'use strict';
  const A = window.Anim;
  if (!A) return;
  const S = A.svg;
  const MAIN = 'KaTeX_Main, serif', MATH = 'KaTeX_Math, serif';
  const RED = '#d0281a', NAVY = '#00008b', LIGHT = '#8aa4d6', MYBLUE = '#0061a5', ORANGE = '#e08a00', GREEN = '#169b3a', GRAY = '#888', CUT = '#8e24aa';   // CUT: arestas removidas pelo 2-opt
  const N = 40, ALPHA = 0.95, LPER = 10 * N, TEND = 1e-3;
  const fmt = function (v, d) { return v.toFixed(d == null ? 0 : d).replace('.', ','); };
  const sgn = function (v, d) { return (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v), d); };
  const big = function (v) { return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ---------- o problema ----------
  function instance(seed) {
    const r = rng(seed * 7919 + 13), P = [];
    for (let i = 0; i < N; i++) P.push([r() * 100, r() * 100]);
    const tour = P.map(function (_, i) { return i; });
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = tour[i]; tour[i] = tour[j]; tour[j] = t; }
    return { P: P, tour0: tour };
  }
  const dist = function (P, a, b) { return Math.hypot(P[a][0] - P[b][0], P[a][1] - P[b][1]); };
  function cost(P, t) { let c = 0; for (let i = 0; i < t.length; i++) c += dist(P, t[i], t[(i + 1) % t.length]); return c; }
  // vizinho 2-opt (i, j): remove (t[i], t[i+1]) e (t[j], t[j+1]); reconecta (t[i], t[j]) e (t[i+1], t[j+1])
  function delta2(P, t, i, j) {
    const a = t[i], b = t[i + 1], c = t[j], d = t[(j + 1) % N];
    return dist(P, a, c) + dist(P, b, d) - dist(P, a, b) - dist(P, c, d);
  }
  function rev(t, i, j) { for (let x = i + 1, y = j; x < y; x++, y--) { const k = t[x]; t[x] = t[y]; t[y] = k; } }
  const validPair = function (i, j) { return j - i >= 2 && !(i === 0 && j === N - 1); };

  // busca local 2-opt, primeira melhora: percorre os vizinhos em ordem e aceita o primeiro que melhora
  function lsRun(I) {
    const t = I.tour0.slice(), P = I.P, total = N * (N - 3) / 2;
    let i = 0, j = 2, since = 0;
    const next = function () { j++; if (j >= N) { i++; j = i + 2; if (i >= N - 2) { i = 0; j = 2; } } };
    const R = {
      t: t, c: cost(P, t), it: 0, moves: 0, done: false, hc: null,
      propose: function () {
        while (!validPair(i, j)) next();
        const m = { i: i, j: j, d: delta2(P, t, i, j) };
        m.ok = m.d < -1e-9;
        next();
        return m;
      },
      commit: function (m) {
        R.it++;
        if (m.ok) { rev(t, m.i, m.j); R.c += m.d; R.moves++; since = 0; } else since++;
        R.hc.push(R.c);                       // histórico: custo após cada iteração
        if (since >= total) R.done = true;
      }
    };
    R.hc = [R.c];
    return R;
  }
  // SA: sorteia um vizinho 2-opt; aceita se melhora, ou com probabilidade e^(−Δ/T)
  function saRun(I) {
    const t = I.tour0.slice(), P = I.P, r = rng(4242);
    const pick = function () {
      for (;;) { let i = Math.floor(r() * N), j = Math.floor(r() * N); if (i > j) { const x = i; i = j; j = x; } if (validPair(i, j)) return [i, j]; }
    };
    let sum = 0, cnt = 0;   // T0: aceitar ~80% das pioras no início
    for (let s = 0; s < 400; s++) { const q = pick(), d = delta2(P, t, q[0], q[1]); if (d > 0) { sum += d; cnt++; } }
    const T0 = -(sum / Math.max(1, cnt)) / Math.log(0.8);
    const nT = Math.ceil(Math.log(TEND) / Math.log(ALPHA));
    const R = {
      t: t, c: cost(P, t), T0: T0, T: T0, total: nT * LPER, it: 0, done: false,
      best: 0, bestT: null, worse: 0, worseOk: 0, rate: 0,
      propose: function () {
        const q = pick(), m = { i: q[0], j: q[1], d: delta2(P, t, q[0], q[1]) };
        m.P = m.d <= 0 ? 1 : Math.exp(-m.d / R.T);
        m.u = r();
        m.ok = m.d <= 0 || m.u < m.P;
        return m;
      },
      commit: function (m) {
        R.it++;
        if (m.d > 0) { R.worse++; if (m.ok) R.worseOk++; }
        if (m.ok) { rev(t, m.i, m.j); R.c += m.d; if (R.c < R.best - 1e-9) { R.best = R.c; R.bestT = t.slice(); } }
        if (R.it % LPER === 0) { R.rate = R.worse ? R.worseOk / R.worse : 0; R.worse = R.worseOk = 0; R.T *= ALPHA; }
        R.hc[R.it] = R.c; R.hb[R.it] = R.best;   // histórico: custo atual e melhor após cada iteração
        if (R.it >= R.total) R.done = true;
      }
    };
    R.best = R.c; R.bestT = t.slice();
    R.hc = new Float64Array(R.total + 1); R.hb = new Float64Array(R.total + 1);
    R.hc[0] = R.hb[0] = R.c;
    R.Tat = function (i) { return T0 * Math.pow(ALPHA, Math.floor(i / LPER)); };   // T vigente depois de i iterações
    return R;
  }

  A.define('tspdemo', function (host) {
    const frame = host.closest('section'), fc = host.closest('.fc'), para = fc.querySelector('p');
    host.setAttribute('data-interactive', '');
    host.style.cssText = 'position:absolute;left:0;top:0;line-height:0;display:none';
    const W = 403.7;
    let H = 205;
    const root = S('svg', { role: 'img', 'aria-label': 'Demonstração: SA e busca local no TSP' });
    host.appendChild(root);

    let seed = 1, I = null, ls = null, sa = null, phase = 'idle', paused = false, slow = false, raf = 0;
    let show = 'both', slowAt = 0, slowStage = 0, pend = null, waitUntil = 0;
    const el = {};
    const TP = { x: 0, y: 12, s: 140 };
    const CH = { x0: 186, x1: 380, y0: 66, y1: 126 };
    // janela do gráfico (em iterações) e faixa do custo; zoom/ampliação
    let yLo = 0, yHi = 1, XMAX = 1, notesOn = {};
    let V = { x0: 0, x1: 1 }, VY = { lo: 0, hi: 1 }, zoomed = false, expanded = false, hoverX = null, drag = null;
    const MINW = 20;   // menor janela: 20 iterações

    // ---------- utilidades de desenho ----------
    function text(parent, x, y, s, o) {
      o = o || {};
      const t = S('text', { x: x, y: y, 'font-size': o.fs || 6.5, 'font-family': o.math ? MATH : MAIN, fill: o.c || '#222' }, parent);
      if (o.math) t.setAttribute('font-style', 'italic');
      if (o.anchor) t.setAttribute('text-anchor', o.anchor);
      if (o.bold) t.setAttribute('font-weight', 'bold');
      if (s != null) t.textContent = s;
      return t;
    }
    // texto com trechos em itálico matemático: '$x$'; e '^{...}' para expoente
    function rich(parent, x, y, s, o) {
      const t = text(parent, x, y, null, o), fs = (o && o.fs) || 6.5;
      s.split(/(\^\{[^}]*\})/).forEach(function (part) {
        const sup = /^\^\{/.test(part);
        if (sup) part = part.slice(2, -1);
        part.split('$').forEach(function (seg, k) {
          if (!seg) return;
          const at = k % 2 ? { 'font-family': MATH, 'font-style': 'italic' } : {};
          if (sup) at['font-size'] = fs * 0.72;
          S('tspan', at, t).textContent = seg;
        });
        if (sup) {   // sobe o expoente: desloca o primeiro tspan dele e desce no seguinte
          const sp = t.querySelectorAll('tspan'), n = part.split('$').filter(Boolean).length;
          sp[sp.length - n].setAttribute('dy', -fs * 0.38);
          t.pendingDown = fs * 0.38;
        } else if (t.pendingDown && part) {
          const sp = t.querySelectorAll('tspan'), n = part.split('$').filter(Boolean).length;
          if (n) sp[sp.length - n].setAttribute('dy', t.pendingDown);
          t.pendingDown = 0;
        }
      });
      return t;
    }
    const halo = function (t, w) { t.setAttribute('stroke', '#fff'); t.setAttribute('stroke-width', w || 1.6); t.setAttribute('paint-order', 'stroke'); t.setAttribute('stroke-linejoin', 'round'); return t; };
    const stop = function (ev) { ev.stopPropagation(); };
    function button(parent, x, y, w, label, fn) {
      const g = S('g', { style: 'cursor:pointer' }, parent);
      S('rect', { x: x, y: y, width: w, height: 10.5, rx: 2, fill: '#eef3f9', stroke: MYBLUE, 'stroke-width': 0.5 }, g);
      g.t = text(g, x + w / 2, y + 7.4, label, { anchor: 'middle', fs: 6.2, c: MYBLUE });
      g.addEventListener('pointerdown', function (ev) { ev.preventDefault(); ev.stopPropagation(); fn(); });
      g.addEventListener('click', stop);
      g.addEventListener('dblclick', stop);
      return g;
    }
    function radio(parent, x, y, label, val, col) {
      const g = S('g', { style: 'cursor:pointer' }, parent);
      S('rect', { x: x - 3, y: y - 7, width: label.length * 3.2 + 14, height: 10, fill: 'transparent' }, g);
      S('circle', { cx: x + 2, cy: y - 2.2, r: 2.4, fill: '#fff', stroke: '#555', 'stroke-width': 0.5 }, g);
      g.dot = S('circle', { cx: x + 2, cy: y - 2.2, r: 1.3, fill: col }, g);
      text(g, x + 6.5, y, label, { fs: 6.5, c: col });
      g.val = val;
      g.addEventListener('pointerdown', function (ev) { ev.preventDefault(); ev.stopPropagation(); show = val; refreshRadios(); if (I) drawTours(); });
      g.addEventListener('click', stop);
      return g;
    }
    function refreshRadios() { el.radios.forEach(function (g) { g.dot.style.display = g.val === show ? '' : 'none'; }); }
    function setPaused(p) {
      paused = p;
      [el.bPause, el.bPause2].forEach(function (b) { if (b) b.t.textContent = p ? 'continuar' : 'pausar'; });
    }

    // ---------- montagem ----------
    function measure() {
      const k = frame.getBoundingClientRect().width / 453.543;
      if (!(k > 0) || !fc.offsetParent) return;
      H = Math.max(160, fc.getBoundingClientRect().height / k - 2);
    }
    function build() {
      root.textContent = ''; el.chart = null;
      root.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      root.style.width = W + 'pt'; root.style.height = H + 'pt';
      TP.s = Math.min(150, H - 52);
      const RX = TP.s + 14;                         // coluna da direita
      const M = el.main = S('g', {}, root);         // tudo menos o gráfico (some quando o gráfico é ampliado)

      // --- rotas ---
      text(M, TP.x, 8, 'Rotas', { fs: 7.5, bold: true, c: MYBLUE });
      text(M, TP.x + 24, 8, '(' + N + ' cidades)', { fs: 6.3, c: GRAY });
      S('rect', { x: TP.x, y: TP.y, width: TP.s, height: TP.s, fill: '#fbfbfd', stroke: '#ccd', 'stroke-width': 0.4 }, M);
      el.tourLS = S('path', { fill: 'none', stroke: RED, 'stroke-width': 0.75, 'stroke-linejoin': 'round' }, M);
      el.tourSA = S('path', { fill: 'none', stroke: NAVY, 'stroke-width': 0.85, 'stroke-linejoin': 'round' }, M);
      el.move = S('g', {}, M);
      el.cities = S('g', {}, M);
      el.tourMsg = halo(text(M, TP.x + TP.s / 2, TP.y + TP.s - 4, '', { anchor: 'middle', fs: 6.2, c: NAVY }), 2);
      const ry = TP.y + TP.s + 10;
      text(M, TP.x, ry, 'mostrar:', { fs: 6.5 });
      el.radios = [radio(M, TP.x + 28, ry, 'SA', 'sa', NAVY), radio(M, TP.x + 50, ry, 'busca local', 'ls', RED), radio(M, TP.x + 98, ry, 'as duas', 'both', '#333')];
      refreshRadios();
      el.costLS = text(M, TP.x, ry + 10, '', { fs: 6.5, c: RED });
      el.costSA = text(M, TP.x, ry + 19, '', { fs: 6.5, c: NAVY });
      el.res = text(M, TP.x, ry + 29, '', { fs: 7, bold: true, c: NAVY });

      // --- vizinhança ---
      const NB = { x: RX, y: 0, w: W - RX, h: 57 };
      S('rect', { x: NB.x, y: NB.y + 0.3, width: NB.w - 0.3, height: NB.h, rx: 2, fill: '#f6f8fc', stroke: '#c9d6ea', 'stroke-width': 0.5 }, M);
      text(M, NB.x + 5, NB.y + 9, 'Vizinhança usada: 2-opt', { fs: 7.3, bold: true, c: MYBLUE });
      // desenho: antes (arestas cruzadas) → depois
      const mini = function (ox, oy, after) {
        const g = S('g', { transform: 'translate(' + ox + ' ' + oy + ')' }, M);
        const a = [0, 0], b = [22, 20], c = [22, 0], d = [0, 20];
        S('path', { d: 'M22 20C34 20 34 0 22 0M0 20C-12 20 -12 0 0 0', fill: 'none', stroke: '#999', 'stroke-width': 0.6, 'stroke-dasharray': '1.5 1' }, g);
        if (!after) {
          S('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: CUT, 'stroke-width': 0.9, 'stroke-dasharray': '2 1' }, g);
          S('line', { x1: c[0], y1: c[1], x2: d[0], y2: d[1], stroke: CUT, 'stroke-width': 0.9, 'stroke-dasharray': '2 1' }, g);
        } else {
          S('line', { x1: a[0], y1: a[1], x2: c[0], y2: c[1], stroke: GREEN, 'stroke-width': 1 }, g);
          S('line', { x1: b[0], y1: b[1], x2: d[0], y2: d[1], stroke: GREEN, 'stroke-width': 1 }, g);
        }
        [[a, 'a', -4, -1.5], [b, 'b', 2.5, 4], [c, 'c', 2.5, -1.5], [d, 'd', -5, 4]].forEach(function (q) {
          S('circle', { cx: q[0][0], cy: q[0][1], r: 1.4, fill: '#fff', stroke: '#222', 'stroke-width': 0.5 }, g);
          text(g, q[0][0] + q[2], q[0][1] + q[3], q[1], { math: true, fs: 6 });
        });
        text(g, 11, 30, after ? 'depois' : 'antes', { anchor: 'middle', fs: 5.6, c: GRAY });
        return g;
      };
      mini(NB.x + 14, NB.y + 17, false);
      text(M, NB.x + 47, NB.y + 30, '→', { fs: 8, anchor: 'middle' });
      mini(NB.x + 62, NB.y + 17, true);
      const tx = NB.x + 98, l = function (k, s, o) { return rich(M, tx, NB.y + 9 + 6.5 * k, s, Object.assign({ fs: 5.8 }, o || {})); };
      l(0, 'remove 2 arestas, ($a$,$b$) e ($c$,$d$), e reconecta');
      l(1, 'como ($a$,$c$) e ($b$,$d$): o trecho $b$…$c$ passa a');
      l(2, 'ser percorrido ao contrário.');
      l(3.3, 'Busca local: testa os vizinhos em ordem;', { c: RED });
      l(4.3, 'aceita o 1º que melhora (para se nenhum melhora).', { c: RED });
      l(5.6, 'SA: sorteia um vizinho; aceita se melhora,', { c: NAVY });
      l(6.6, 'ou, se piora, com probabilidade $P$ = e^{−Δ/$T$}.', { c: NAVY });

      // --- legenda (modo normal), status e botões ---
      const ly = H - 53, lx2 = RX + (W - RX) / 2;
      const leg = function (x, y, kind, col, s, parent) {
        if (kind === 'area') S('rect', { x: x, y: y - 4.2, width: 9, height: 4, fill: col, 'fill-opacity': 0.25, stroke: col, 'stroke-width': 0.3 }, parent);
        else S('line', { x1: x, x2: x + 9, y1: y - 2.2, y2: y - 2.2, stroke: col, 'stroke-width': kind === 'thin' ? 0.6 : 1.1 }, parent);
        rich(parent, x + 12, y, s, { fs: 5.9 });
      };
      el.leg = leg;
      leg(RX, ly, 'thin', LIGHT, 'custo da rota atual do SA (oscila)', M);
      leg(lx2, ly, 'line', NAVY, 'melhor rota encontrada pelo SA', M);
      leg(RX, ly + 8, 'line', RED, 'busca local (● = ótimo local)', M);
      leg(lx2, ly + 8, 'area', ORANGE, 'temperatura $T$ (eixo à direita)', M);
      const bx = W - 196, byy = H - 11;
      el.bSpeed = button(M, bx, byy, 62, 'modo lento', function () {
        slow = !slow; el.bSpeed.t.textContent = slow ? 'modo rápido' : 'modo lento';
        el.move.textContent = ''; pend = null; slowStage = 0;
      });
      el.bPause = button(M, bx + 65, byy, 38, 'pausar', function () { setPaused(!paused); });
      button(M, bx + 106, byy, 44, 'rodar de novo', function () { start(false); });
      button(M, bx + 153, byy, 43, 'nova instância', function () { seed++; start(true); });
      el.st1 = text(M, RX, ly + 18, '', { fs: 6.1 });
      el.st2 = text(M, RX, ly + 26, '', { fs: 6.1, c: '#555' });

      buildChart();
    }

    // --- gráfico (normal: coluna da direita; ampliado: o quadro inteiro) ---
    function buildChart() {
      if (el.chart) el.chart.remove();
      const g = el.chart = S('g', {}, root);
      const RX = TP.s + 14;
      el.main.style.display = expanded ? 'none' : '';
      if (!expanded) { CH.x0 = RX + 22; CH.x1 = W - 22; CH.y0 = 57 + 19; CH.y1 = H - 76; }
      else { CH.x0 = 30; CH.x1 = W - 26; CH.y0 = 26; CH.y1 = H - 44; }
      const fsL = expanded ? 6.4 : 5.4;
      text(g, expanded ? 0 : RX, CH.y0 - (expanded ? 13 : 5), expanded ? 'Convergência (ampliado)' : 'Convergência', { fs: expanded ? 8.5 : 7.5, bold: true, c: MYBLUE });
      // dica e botões
      const hint = 'roda do mouse: zoom · arrastar: mover · duplo clique: ver tudo · passe o mouse para ler os valores';
      if (expanded) {
        text(g, CH.x0 + 4, CH.y0 - 4.5, hint, { fs: 5.8, c: GRAY });
        el.bPause2 = button(g, W - 86, CH.y0 - 21, 40, paused ? 'continuar' : 'pausar', function () { setPaused(!paused); });
        button(g, W - 42, CH.y0 - 21, 42, 'voltar', function () { toggleExpand(); });
      } else {
        el.bPause2 = null;
        text(g, W - 43, CH.y0 - 9.5, 'roda: zoom · arrastar: mover · duplo clique: tudo', { anchor: 'end', fs: 4.7, c: GRAY });
        button(g, W - 40, CH.y0 - 17.5, 40, '⤢ ampliar', function () { toggleExpand(); });
      }
      S('path', { d: 'M' + CH.x0 + ' ' + CH.y0 + 'V' + CH.y1 + 'H' + CH.x1 + 'V' + CH.y0, fill: 'none', stroke: '#000', 'stroke-width': 0.45 }, g);
      text(g, CH.x0 - 2, CH.y0 - 1.5, 'custo', { anchor: 'end', fs: fsL + 0.4 });
      text(g, CH.x1 + 2, CH.y0 - 1.5, 'T', { fs: fsL + 0.9, math: true, c: ORANGE });
      el.yHi = text(g, CH.x0 - 2, CH.y0 + 4, '', { anchor: 'end', fs: fsL, c: '#555' });
      el.yMid = text(g, CH.x0 - 2, (CH.y0 + CH.y1) / 2 + 2, '', { anchor: 'end', fs: fsL, c: '#555' });
      el.yLo = text(g, CH.x0 - 2, CH.y1, '', { anchor: 'end', fs: fsL, c: '#555' });
      el.tHi = text(g, CH.x1 + 2, CH.y0 + 6, '', { fs: fsL, c: ORANGE });
      text(g, CH.x1 + 2, CH.y1, '0', { fs: fsL, c: ORANGE });
      el.xA = text(g, CH.x0, CH.y1 + 6.5, '', { anchor: 'middle', fs: fsL, c: '#555' });
      el.xM = text(g, (CH.x0 + CH.x1) / 2, CH.y1 + 6.5, '', { anchor: 'middle', fs: fsL, c: '#555' });
      el.xB = text(g, CH.x1, CH.y1 + 6.5, '', { anchor: 'middle', fs: fsL, c: '#555' });
      el.xTitle = text(g, (CH.x0 + CH.x1) / 2, CH.y1 + 13, 'iterações (vizinhos testados)', { anchor: 'middle', fs: fsL + 0.2, c: '#555' });
      el.zoomTag = text(g, CH.x0 + 2, CH.y1 + 13, '', { fs: fsL, c: MYBLUE });
      // séries, recortadas na área do gráfico
      const cid = 'tspc' + Math.random().toString(36).slice(2);
      S('rect', { x: CH.x0, y: CH.y0 - 0.5, width: CH.x1 - CH.x0, height: CH.y1 - CH.y0 + 1 }, S('clipPath', { id: cid }, g));
      const sg = S('g', { 'clip-path': 'url(#' + cid + ')' }, g);
      el.T = S('path', { fill: ORANGE, 'fill-opacity': 0.12, stroke: ORANGE, 'stroke-width': 0.4, 'stroke-opacity': 0.7 }, sg);
      el.cLS = S('path', { fill: 'none', stroke: RED, 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, sg);
      el.lsLine = S('line', { stroke: RED, 'stroke-width': 0.5, 'stroke-dasharray': '2 1.2' }, sg);
      el.lsDot = S('circle', { r: 1.6, fill: RED }, sg);
      el.cSA = S('path', { fill: 'none', stroke: LIGHT, 'stroke-width': expanded ? 0.55 : 0.45, 'stroke-linejoin': 'round' }, sg);
      el.cBest = S('path', { fill: 'none', stroke: NAVY, 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, sg);
      el.notes = S('g', {}, sg);
      el.read = S('g', { 'pointer-events': 'none' }, g);
      // legenda no modo ampliado: uma linha; e o status embaixo
      if (expanded) {
        const ly = CH.y1 + 23;
        el.leg(0, ly, 'thin', LIGHT, 'custo da rota atual do SA (oscila)', g);
        el.leg(102, ly, 'line', NAVY, 'melhor rota encontrada pelo SA', g);
        el.leg(200, ly, 'line', RED, 'busca local (● = ótimo local)', g);
        el.leg(295, ly, 'area', ORANGE, 'temperatura $T$ (eixo à direita)', g);
        el.st1x = text(g, 0, ly + 12, '', { fs: 6.3 });
      } else el.st1x = null;
      // área sensível: zoom, arrastar, leitura
      const hit = S('rect', { x: CH.x0, y: CH.y0, width: CH.x1 - CH.x0, height: CH.y1 - CH.y0, fill: 'transparent', style: 'cursor:crosshair' }, g);
      g.insertBefore(hit, el.read);
      const svgX = function (ev) {
        const m = root.getScreenCTM(); if (!m) return null;
        const pt = root.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
        return pt.matrixTransform(m.inverse()).x;
      };
      hit.addEventListener('pointerdown', function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        const x = svgX(ev); if (x == null) return;
        drag = { x: x, a: V.x0, b: V.x1, moved: false };
        hit.setPointerCapture(ev.pointerId); hit.style.cursor = 'grabbing';
      });
      hit.addEventListener('pointermove', function (ev) {
        const x = svgX(ev); if (x == null) return;
        if (drag) {
          const di = (drag.x - x) / (CH.x1 - CH.x0) * (drag.b - drag.a);
          if (Math.abs(drag.x - x) > 0.5) drag.moved = true;
          if (zoomed) setView(drag.a + di, drag.b + di);
          hoverX = null; readout();
        } else { hoverX = x; readout(); }
      });
      const end = function () { drag = null; hit.style.cursor = 'crosshair'; };
      hit.addEventListener('pointerup', end);
      hit.addEventListener('pointercancel', end);
      hit.addEventListener('pointerleave', function () { if (!drag) { hoverX = null; readout(); } });
      hit.addEventListener('click', stop);
      hit.addEventListener('dblclick', function (ev) { ev.preventDefault(); ev.stopPropagation(); setView(0, XMAX); });
      hit.addEventListener('wheel', function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        const x = svgX(ev); if (x == null) return;
        const c = inv(x), w = V.x1 - V.x0, nw = w * (ev.deltaY < 0 ? 0.8 : 1.25);
        setView(c - (c - V.x0) * nw / w, c + (V.x1 - c) * nw / w);
      }, { passive: false });
    }
    function toggleExpand() {
      expanded = !expanded; hoverX = null; drag = null;
      buildChart();
      if (I) { drawChart(); status(); }
    }

    // ---------- desenho dinâmico ----------
    const px = function (p) { return [TP.x + 5 + p[0] / 100 * (TP.s - 10), TP.y + 5 + p[1] / 100 * (TP.s - 10)]; };
    const pc = function (c) { return px(I.P[c]); };
    function tourD(t) {
      if (!t) return '';
      return t.map(function (c, k) { const q = pc(c); return (k ? 'L' : 'M') + q[0].toFixed(2) + ' ' + q[1].toFixed(2); }).join('') + 'Z';
    }
    function drawCities() {
      el.cities.textContent = '';
      I.P.forEach(function (p) { const q = px(p); S('circle', { cx: q[0], cy: q[1], r: 1.5, fill: '#fff', stroke: '#222', 'stroke-width': 0.6 }, el.cities); });
    }
    function drawTours() {
      const saOn = sa && phase !== 'ls' && phase !== 'pausa';
      // antes de o SA começar (ele roda depois da busca local), "SA" mostra a rota inicial dele
      const waiting = !saOn && show === 'sa';
      const tSA = waiting ? I.tour0 : (!saOn ? null : (phase === 'fim' ? sa.bestT : sa.t));
      el.tourLS.setAttribute('d', show !== 'sa' && ls ? tourD(ls.t) : '');
      el.tourSA.setAttribute('d', show !== 'ls' ? tourD(tSA) : '');
      el.tourSA.setAttribute('stroke', waiting ? LIGHT : NAVY);
      el.tourSA.setAttribute('stroke-dasharray', waiting ? '2.2 1.4' : '');
      el.tourMsg.textContent = waiting ? 'SA ainda não começou: rota inicial' : '';
      const both = show === 'both' && saOn;
      el.tourLS.setAttribute('stroke-dasharray', both ? '2.2 1.4' : '');
      el.tourLS.setAttribute('stroke-width', both ? 0.6 : 0.75);
    }
    function drawMove(t, m) {   // vizinho em teste: removidas (roxo tracejado), novas (verde)
      el.move.textContent = '';
      if (!m) return;
      const a = pc(t[m.i]), b = pc(t[m.i + 1]), c = pc(t[m.j]), d = pc(t[(m.j + 1) % N]);
      const ln = function (p, q, col, dash, w) { S('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: col, 'stroke-width': w, 'stroke-dasharray': dash || null, 'stroke-linecap': 'round' }, el.move); };
      ln(a, b, CUT, '2 1.2', 1.8); ln(c, d, CUT, '2 1.2', 1.8);
      ln(a, c, GREEN, null, 1.4); ln(b, d, GREEN, null, 1.4);
      [[a, 'a'], [b, 'b'], [c, 'c'], [d, 'd']].forEach(function (q) { text(el.move, q[0][0] + 2, q[0][1] - 2, q[1], { math: true, fs: 6.2, c: '#000' }); });
    }

    // eixos: iteração → x, custo → y (na janela atual)
    const cx = function (it) { return CH.x0 + (CH.x1 - CH.x0) * (it - V.x0) / (V.x1 - V.x0); };
    const inv = function (x) { return V.x0 + (x - CH.x0) / (CH.x1 - CH.x0) * (V.x1 - V.x0); };
    const cy = function (c) { return CH.y1 - (CH.y1 - CH.y0) * Math.max(-0.05, Math.min(1.05, (c - VY.lo) / (VY.hi - VY.lo))); };
    const saOn = function () { return sa && (phase === 'sa' || phase === 'fim'); };
    function setView(a, b) {
      let w = Math.max(MINW, Math.min(XMAX, b - a));
      if (w >= XMAX) { V = { x0: 0, x1: XMAX }; zoomed = false; }
      else { a = Math.max(0, Math.min(XMAX - w, a)); V = { x0: a, x1: a + w }; zoomed = true; }
      if (I) drawChart();
    }
    // série com redução: até ~2 pontos por pixel desenha tudo; acima disso, mínimo e máximo de cada
    // trecho (na ordem em que ocorreram), para nenhum pico ou mergulho sumir
    function series(arr, n) {
      const i0 = Math.max(0, Math.floor(V.x0)), i1 = Math.min(n, Math.ceil(V.x1));
      if (i1 < i0) return '';
      const nb = Math.round((CH.x1 - CH.x0) * 1.5), span = i1 - i0;
      let d = '';
      const pt = function (i) { d += (d ? 'L' : 'M') + cx(i).toFixed(2) + ' ' + cy(arr[i]).toFixed(2); };
      if (span <= nb * 2) { for (let i = i0; i <= i1; i++) pt(i); return d; }
      for (let b = 0; b < nb; b++) {
        const a = i0 + Math.floor(span * b / nb), e = Math.max(a, i0 + Math.floor(span * (b + 1) / nb) - (b < nb - 1 ? 1 : 0));
        let mn = a, mx = a;
        for (let i = a + 1; i <= e; i++) { if (arr[i] < arr[mn]) mn = i; if (arr[i] > arr[mx]) mx = i; }
        if (mn === mx) pt(mn); else if (mn < mx) { pt(mn); pt(mx); } else { pt(mx); pt(mn); }
      }
      return d;
    }
    function rangeOf(arr, n, lo, hi) {
      const i0 = Math.max(0, Math.floor(V.x0)), i1 = Math.min(n, Math.ceil(V.x1));
      for (let i = i0; i <= i1; i++) { const v = arr[i]; if (v < lo[0]) lo[0] = v; if (v > hi[0]) hi[0] = v; }
    }
    function drawChart() {
      if (!zoomed) V = { x0: 0, x1: XMAX };
      const nSA = saOn() ? sa.it : -1, nLS = ls.it;
      // faixa do custo: fixa na visão geral; ajustada ao trecho visível no zoom
      if (!zoomed) VY = { lo: yLo, hi: yHi };
      else {
        const lo = [Infinity], hi = [-Infinity];
        if (nSA >= 0) { rangeOf(sa.hc, nSA, lo, hi); rangeOf(sa.hb, nSA, lo, hi); }
        rangeOf(ls.hc, nLS, lo, hi);
        if (ls.done && ls.it <= V.x1) { lo[0] = Math.min(lo[0], ls.c); hi[0] = Math.max(hi[0], ls.c); }
        if (!isFinite(lo[0])) { lo[0] = yLo; hi[0] = yHi; }
        const pad = Math.max(2, (hi[0] - lo[0]) * 0.08);
        VY = { lo: lo[0] - pad, hi: hi[0] + pad };
      }
      el.cLS.setAttribute('d', series(ls.hc, nLS));
      el.cSA.setAttribute('d', nSA >= 0 ? series(sa.hc, nSA) : '');
      el.cBest.setAttribute('d', nSA >= 0 ? series(sa.hb, nSA) : '');
      // temperatura: degraus (escala: maior T visível no topo)
      let Tvis = sa.T0;
      if (nSA >= 0) {
        const a = Math.max(0, V.x0), b = Math.min(nSA, V.x1);
        if (b > a) {
          Tvis = sa.Tat(a);
          const ty = function (T) { return CH.y1 - (CH.y1 - CH.y0) * T / Tvis; };
          let d = 'M' + cx(a).toFixed(2) + ' ' + CH.y1;
          for (let k = Math.floor(a / LPER); k * LPER <= b; k++) {
            const T = sa.T0 * Math.pow(ALPHA, k), y = ty(T).toFixed(2);
            d += 'L' + cx(Math.max(a, k * LPER)).toFixed(2) + ' ' + y + 'L' + cx(Math.min(b, (k + 1) * LPER)).toFixed(2) + ' ' + y;
          }
          el.T.setAttribute('d', d + 'L' + cx(b).toFixed(2) + ' ' + CH.y1 + 'Z');
        } else el.T.setAttribute('d', '');
      } else el.T.setAttribute('d', '');
      // ótimo local da busca local
      el.lsLine.style.display = el.lsDot.style.display = ls.done ? '' : 'none';
      if (ls.done) {
        const x = cx(ls.it), y = cy(ls.c);
        el.lsDot.setAttribute('cx', x); el.lsDot.setAttribute('cy', y);
        el.lsLine.setAttribute('x1', Math.max(x, CH.x0 - 2)); el.lsLine.setAttribute('x2', CH.x1); el.lsLine.setAttribute('y1', y); el.lsLine.setAttribute('y2', y);
      }
      // rótulos dos eixos
      const dg = VY.hi - VY.lo < 20 ? 1 : 0;
      el.yHi.textContent = fmt(VY.hi, dg); el.yMid.textContent = zoomed ? fmt((VY.hi + VY.lo) / 2, dg) : ''; el.yLo.textContent = fmt(VY.lo, dg);
      el.tHi.textContent = fmt(Tvis, Tvis < 1 ? 3 : 1);
      el.xA.textContent = big(V.x0); el.xM.textContent = big((V.x0 + V.x1) / 2); el.xB.textContent = big(V.x1);
      el.zoomTag.textContent = zoomed ? 'zoom: ' + fmt(XMAX / (V.x1 - V.x0), 1) + '×' : '';
      drawNotes();
      readout();
    }
    // anotações didáticas: só na visão geral (e "ótimo local" sempre que estiver visível)
    function drawNotes() {
      el.notes.textContent = '';
      const nt = function (x, y, lines, col, anchor) {
        lines.forEach(function (s, k) { halo(rich(el.notes, x, y + k * 5.6, s, { fs: expanded ? 6.2 : 5.3, c: col, anchor: anchor })); });
      };
      if (notesOn.ls && ls.it >= V.x0 && ls.it <= V.x1) nt(cx(ls.it) + 3, cy(ls.c) - 3.5, ['ótimo local'], RED);
      if (zoomed) return;
      if (notesOn.hi) nt(cx(0.05 * sa.total), CH.y0 + 6, ['$T$ alta: aceita muitas pioras →', 'o custo atual oscila (exploração)'], '#3d5a99');
      if (notesOn.lo) nt(CH.x1 - 2, CH.y0 + 6, ['$T$ baixa: quase só aceita melhoras →', 'converge (intensificação)'], '#3d5a99', 'end');
    }
    // leitura sob o cursor: linha vertical, pontos nas curvas e quadro com os valores
    function readout() {
      el.read.textContent = '';
      if (hoverX == null || !I) return;
      const x0 = Math.max(CH.x0, Math.min(CH.x1, hoverX));
      const it = Math.max(0, Math.round(inv(x0))), x = cx(it);
      if (x < CH.x0 - 0.5 || x > CH.x1 + 0.5) return;
      S('line', { x1: x, x2: x, y1: CH.y0, y2: CH.y1, stroke: '#444', 'stroke-width': 0.35, 'stroke-dasharray': '1 0.8' }, el.read);
      const lines = [['iteração ' + big(it), '#222', true]];
      const dot = function (v, col) { const y = cy(v); if (y >= CH.y0 - 0.5 && y <= CH.y1 + 0.5) S('circle', { cx: x, cy: y, r: 1.5, fill: col, stroke: '#fff', 'stroke-width': 0.4 }, el.read); };
      if (saOn() && it <= sa.it) {
        lines.push(['SA, rota atual: ' + fmt(sa.hc[it], 1), '#3d5a99']);
        lines.push(['SA, melhor até aqui: ' + fmt(sa.hb[it], 1), NAVY]);
        lines.push(['T = ' + fmt(sa.Tat(it), sa.Tat(it) < 1 ? 3 : 1), ORANGE]);
        dot(sa.hc[it], LIGHT); dot(sa.hb[it], NAVY);
      } else if (saOn()) lines.push(['SA: ainda não chegou aqui', GRAY]);
      if (it <= ls.it) { lines.push(['busca local: ' + fmt(ls.hc[it], 1), RED]); dot(ls.hc[it], RED); }
      else if (ls.done) lines.push(['busca local: ' + fmt(ls.c, 1) + ' (parou na it. ' + big(ls.it) + ')', RED]);
      const fs = expanded ? 6.4 : 5.4, lh = fs * 1.25;
      const g = S('g', {}, el.read);
      const bg = S('rect', { fill: '#fff', 'fill-opacity': 0.92, stroke: '#aab', 'stroke-width': 0.35, rx: 1.5 }, g);
      let wmax = 0;
      lines.forEach(function (ln, k) {
        const t = text(g, 0, (k + 1) * lh, ln[0], { fs: fs, c: ln[1], bold: ln[2] });
        wmax = Math.max(wmax, t.getComputedTextLength ? t.getComputedTextLength() : ln[0].length * fs * 0.5);
      });
      const bw = wmax + 5, bh = lines.length * lh + 3;
      bg.setAttribute('x', -2.5); bg.setAttribute('y', 0); bg.setAttribute('width', bw); bg.setAttribute('height', bh);
      const bx = x + 4 + bw > CH.x1 ? x - 4 - bw + 2.5 : x + 6.5;
      g.setAttribute('transform', 'translate(' + bx.toFixed(2) + ' ' + (CH.y0 + 2) + ')');
    }
    function status() {
      if (!(slow && pend)) {
        if (phase === 'ls' || phase === 'pausa') {
          el.st1.textContent = 'Busca local: iteração ' + big(ls.it) + ' · ' + ls.moves + ' melhorias aceitas';
          el.st2.textContent = ls.done ? 'nenhum vizinho melhora: ótimo local (custo ' + fmt(ls.c) + ')' : 'aceita só vizinhos que melhoram';
        } else if (sa) {
          el.st1.textContent = 'SA: iteração ' + big(sa.it) + ' de ' + big(sa.total) + ' · T = ' + fmt(sa.T, sa.T < 1 ? 3 : 1);
          el.st2.textContent = phase === 'fim' ? 'fim: T chegou a ' + fmt(sa.T, 3) + ' (T0 · 0,001)'
            : 'pioras aceitas na última temperatura: ' + fmt(sa.rate * 100) + '%';
        }
      }
      if (el.st1x) el.st1x.textContent = el.st1.textContent + (el.st2.textContent ? '  ·  ' + el.st2.textContent : '');
      el.costLS.textContent = ls ? 'busca local: ' + fmt(ls.c) + (ls.done ? ' (ótimo local)' : '') : '';
      el.costSA.textContent = sa && phase !== 'ls' && phase !== 'pausa'
        ? 'SA: ' + (phase === 'fim' ? 'melhor ' + fmt(sa.best) : 'atual ' + fmt(sa.c) + ' · melhor ' + fmt(sa.best))
        : 'SA: (começa depois da busca local)';
    }

    // ---------- execução ----------
    function start(fresh) {
      if (fresh || !I) I = instance(seed);
      ls = lsRun(I); sa = saRun(I);
      XMAX = sa.total; notesOn = {}; zoomed = false; V = { x0: 0, x1: XMAX }; hoverX = null;
      yHi = cost(I.P, I.tour0); yLo = 0.75 * Math.sqrt(N * 100 * 100);
      drawCities(); el.move.textContent = ''; pend = null; slowStage = 0;
      el.res.textContent = ''; el.st2.setAttribute('fill', '#555');
      setPaused(false);
      phase = 'ls'; drawTours(); drawChart(); status(); loop();
    }
    // um vizinho no modo lento: mostra o vizinho (0,9 s), mostra a decisão (0,7 s), aplica
    function slowStep(R, isSA, now) {
      if (!pend) {
        pend = R.propose(); slowStage = 1; slowAt = now;
        const m = pend, t = R.t;
        drawMove(t, m);
        el.st1.textContent = 'vizinho: remove (' + t[m.i] + ',' + t[m.i + 1] + ') e (' + t[m.j] + ',' + t[(m.j + 1) % N] + '),'
          + ' liga (' + t[m.i] + ',' + t[m.j] + ') e (' + t[m.i + 1] + ',' + t[(m.j + 1) % N] + ') · Δ = ' + sgn(m.d, 1);
        el.st2.textContent = '';
        return;
      }
      if (slowStage === 1 && now - slowAt > 900) {
        const m = pend;
        let s;
        if (!isSA) s = m.ok ? 'Δ < 0: melhora → aceito' : 'Δ ≥ 0: não melhora → descartado';
        else if (m.d <= 0) s = 'Δ ≤ 0: melhora → aceito (P = 1)';
        else s = 'piora: P = exp(−Δ/T) = ' + fmt(m.P, 2) + ', u = ' + fmt(m.u, 2) + ' → ' + (m.ok ? 'u < P: aceito' : 'u ≥ P: descartado');
        el.st2.textContent = s; el.st2.setAttribute('fill', m.ok ? GREEN : RED);
        slowStage = 2; slowAt = now;
        return;
      }
      if (slowStage === 2 && now - slowAt > 700) {
        R.commit(pend); pend = null; slowStage = 0; el.move.textContent = ''; el.st2.setAttribute('fill', '#555');
      }
    }
    function tick(now) {
      if (paused || !frame.classList.contains('active')) return;
      if (phase === 'ls') {
        if (slow) slowStep(ls, false, now);
        else { pend = null; for (let s = 0; s < 45 && !ls.done; s++) ls.commit(ls.propose()); }
        if (ls.done && !pend) { phase = 'pausa'; waitUntil = now + 900; el.move.textContent = ''; notesOn.ls = true; }
      } else if (phase === 'pausa') {
        if (now > waitUntil) phase = 'sa';
      } else if (phase === 'sa') {
        if (slow) slowStep(sa, true, now);
        else { pend = null; for (let s = 0; s < 160 && !sa.done; s++) sa.commit(sa.propose()); }
        const f = sa.it / sa.total;
        if (f > 0.16) notesOn.hi = true;
        if (f > 0.75) notesOn.lo = true;
        if (sa.done && !pend) {
          phase = 'fim'; el.move.textContent = '';
          const g = (ls.c - sa.best) / ls.c * 100;
          el.res.textContent = g > 0.05 ? 'SA: ' + fmt(g, 1) + '% melhor que a busca local' : (g < -0.05 ? 'busca local: ' + fmt(-g, 1) + '% melhor que o SA' : 'empate');
        }
      }
      drawTours(); drawChart(); status();
    }
    function loop() {
      cancelAnimationFrame(raf);
      const f = function (now) { tick(now); if (phase !== 'fim' && phase !== 'idle') raf = requestAnimationFrame(f); };
      raf = requestAnimationFrame(f);
    }
    function halt() { cancelAnimationFrame(raf); phase = 'idle'; }

    // ---------- estados ----------
    function place(on) {
      para.style.visibility = on ? 'hidden' : ''; para.style.opacity = '';
      if (on) measure();
      host.style.display = on ? '' : 'none';
    }
    function snap(st) {
      if (st !== 'demo') { halt(); expanded = false; place(false); root.style.opacity = ''; return; }
      if (phase === 'idle' || !I) { place(true); build(); start(true); }
      else place(true);
      root.style.opacity = '';
    }
    async function play(a, b, h) {
      if (b !== 'demo') { snap(b); return; }
      halt(); expanded = false; para.style.visibility = ''; measure();
      await h.tween(450, function (e) { para.style.opacity = 1 - e; });
      para.style.visibility = 'hidden'; para.style.opacity = '';
      host.style.display = ''; build();
      root.style.opacity = 0;
      await h.tween(450, function (e) { root.style.opacity = e; });
      start(true);
    }
    return { snap: snap, play: play };
  });
})();
