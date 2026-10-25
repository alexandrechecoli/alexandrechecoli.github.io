/* Exemplo - TSP (aula 10, slide 100): um algoritmo genético rodando ao vivo (modelo: tspdemo.js da aula 7).
 *
 * O slide só tem o enunciado: o frame ganha um 2º passo (data-steps="2"). Passo 1 = PDF. No passo 2 o
 * enunciado sai (já foi lido) e a demonstração ocupa a área do frame:
 *   - esquerda: a melhor rota encontrada (30 cidades, semente por instância), os números da execução e os
 *     parâmetros: seleção (roleta / amostragem estocástica universal / torneio), p_m e tamanho da população;
 *   - direita, em cima: os componentes deste AG (os do enunciado + a substituição usada);
 *   - direita, no meio: convergência por geração — melhor (azul), média da população (azul claro), referência
 *     da busca local 2-opt (vermelho tracejado) e diversidade da população (laranja, eixo à direita: % de arestas
 *     diferentes das da melhor rota, em média); passar o mouse lê os valores;
 *   - direita, embaixo: 8 rotas da população ordenadas pelo custo (1ª, 2ª, 3ª, ¼, ½, ¾, penúltima, última), com
 *     o custo e a probabilidade de cada uma ser escolhida pela seleção atual; status e botões (velocidade,
 *     pausar, rodar de novo, nova instância).
 * O AG (o do enunciado): população inicial aleatória; fitness f = 1/z (a seleção usa f/Σf, como no slide 64);
 * pares da seleção cruzados com OX (p_c = 0,9; o mesmo OX dos slides 80–82, dois filhos por par); mutação swap
 * (troca 2 cidades) com probabilidade p_m por filho; substituição geracional mantendo os 2 melhores (elitismo).
 * Para até 400 gerações. Mudar um parâmetro roda de novo na mesma instância.
 * A simulação roda num laço próprio (rAF), não no play (como na aula 7); só avança com o frame ativo.
 *
 * Uso: <span class="anim" data-anim="agdemo" data-state="texto,demo"> no .fc, depois do conteúdo.
 */
(function () {
  'use strict';
  const A = window.Anim;
  if (!A) return;
  const S = A.svg;
  const MAIN = 'KaTeX_Main, serif', MATH = 'KaTeX_Math, serif';
  const RED = '#d0281a', NAVY = '#00008b', LIGHT = '#8aa4d6', MYBLUE = '#0061a5', ORANGE = '#e08a00', GRAY = '#888';
  const N = 30, GMAX = 400, PC = 0.9, ELITE = 2, TK = 3;
  const fmt = function (v, d) { return v.toFixed(d == null ? 0 : d).replace('.', ','); };
  const big = function (v) { return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };

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
    const r = rng(seed * 7919 + 17), P = [];
    for (let i = 0; i < N; i++) P.push([r() * 100, r() * 100]);
    const D = P.map(function (p) { return P.map(function (q) { return Math.hypot(p[0] - q[0], p[1] - q[1]); }); });
    return { P: P, D: D };
  }
  function cost(I, t) { let c = 0; for (let i = 0; i < N; i++) c += I.D[t[i]][t[(i + 1) % N]]; return c; }
  function randPerm(r) {
    const t = []; for (let i = 0; i < N; i++) t.push(i);
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const x = t[i]; t[i] = t[j]; t[j] = x; }
    return t;
  }
  // referência: busca local 2-opt (primeira melhora) a partir de uma rota aleatória
  function twoOpt(I, t) {
    t = t.slice();
    let imp = true;
    while (imp) {
      imp = false;
      for (let i = 0; i < N - 2 && !imp; i++) for (let j = i + 2; j < N && !imp; j++) {
        if (i === 0 && j === N - 1) continue;
        const a = t[i], b = t[i + 1], c = t[j], d = t[(j + 1) % N];
        if (I.D[a][c] + I.D[b][d] < I.D[a][b] + I.D[c][d] - 1e-9) {
          for (let x = i + 1, y = j; x < y; x++, y--) { const k = t[x]; t[x] = t[y]; t[y] = k; }
          imp = true;
        }
      }
    }
    return t;
  }
  // OX (como nos slides 80–82): interior [a, b) vem de "de"; o resto segue a ordem de "pa" a partir do 2º corte
  function ox(pa, de, a, b) {
    const ch = new Array(N), used = new Uint8Array(N);
    for (let i = a; i < b; i++) { ch[i] = de[i]; used[de[i]] = 1; }
    let s = b % N;
    for (let q = 0; q < N; q++) {
      const v = pa[(b + q) % N];
      if (used[v]) continue;
      ch[s] = v; used[v] = 1; s = (s + 1) % N;
      if (s === a) s = b % N;   // (nunca acontece antes do fim; só por segurança)
    }
    return ch;
  }

  // ---------- o AG ----------
  function gaRun(I, opt, seed) {
    const r = rng(seed);
    const R = { gen: 0, done: false, pop: [], hb: [], hm: [], hd: [], best: null, bestC: Infinity, mut: 0, cx: 0, ls: 0, opt: opt };
    for (let k = 0; k < opt.pop; k++) { const t = randPerm(r); R.pop.push({ t: t, c: cost(I, t) }); }
    function stats() {
      R.pop.sort(function (x, y) { return x.c - y.c; });
      if (R.pop[0].c < R.bestC - 1e-9) { R.bestC = R.pop[0].c; R.best = R.pop[0].t.slice(); }
      let s = 0; R.pop.forEach(function (x) { s += x.c; });
      R.mean = s / R.pop.length;
      // diversidade: fração média das arestas de cada rota que não estão na melhor
      const nx = new Int16Array(N), pv = new Int16Array(N), b = R.pop[0].t;
      for (let i = 0; i < N; i++) { nx[b[i]] = b[(i + 1) % N]; pv[b[(i + 1) % N]] = b[i]; }
      let dif = 0;
      R.pop.forEach(function (x) {
        const t = x.t;
        for (let i = 0; i < N; i++) { const u = t[i], v = t[(i + 1) % N]; if (nx[u] !== v && pv[u] !== v) dif++; }
      });
      R.div = dif / (N * R.pop.length);
      R.hb[R.gen] = R.bestC; R.hm[R.gen] = R.mean; R.hd[R.gen] = R.div;
    }
    // seleção: devolve n índices da população (já ordenada pelo custo)
    function select(n) {
      const P = R.pop, out = [];
      if (opt.sel === 'torneio') {
        for (let k = 0; k < n; k++) { let w = Math.floor(r() * P.length); for (let q = 1; q < TK; q++) w = Math.min(w, Math.floor(r() * P.length)); out.push(w); }
        return out;
      }
      const f = P.map(function (x) { return 1 / x.c; }), F = f.reduce(function (s, v) { return s + v; }, 0);
      const pick = function (u) { let acc = 0; for (let i = 0; i < f.length; i++) { acc += f[i]; if (u < acc) return i; } return f.length - 1; };
      if (opt.sel === 'sus') {   // um giro só, n marcadores igualmente espaçados
        const step = F / n, u0 = r() * step;
        for (let k = 0; k < n; k++) out.push(pick(u0 + k * step));
        for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const x = out[i]; out[i] = out[j]; out[j] = x; }
        return out;
      }
      for (let k = 0; k < n; k++) out.push(pick(r() * F));     // roleta: n giros
      return out;
    }
    R.step = function () {
      const P = R.pop, n = opt.pop - ELITE, pool = select(n + (n % 2)), kids = [];
      R.mut = 0; R.cx = 0; R.ls = 0;
      for (let k = 0; k < pool.length; k += 2) {
        const p1 = P[pool[k]].t, p2 = P[pool[k + 1]].t;
        let c1, c2;
        if (r() < PC) {
          let a = Math.floor(r() * N), b = Math.floor(r() * N); if (a > b) { const x = a; a = b; b = x; } b++;
          if (b - a >= N) b = N - 1;
          c1 = ox(p1, p2, a, b); c2 = ox(p2, p1, a, b); R.cx++;
        } else { c1 = p1.slice(); c2 = p2.slice(); }
        [c1, c2].forEach(function (c) {
          if (r() < opt.pm) { const i = Math.floor(r() * N); let j = Math.floor(r() * (N - 1)); if (j >= i) j++; const x = c[i]; c[i] = c[j]; c[j] = x; R.mut++; }
          // AG híbrido (memético): cada filho passa por uma busca local 2-opt antes de entrar na população
          if (opt.hib) { c = twoOpt(I, c); R.ls++; }
          kids.push(c);
        });
      }
      const next = P.slice(0, ELITE).map(function (x) { return { t: x.t.slice(), c: x.c }; });
      for (let k = 0; next.length < opt.pop; k++) next.push({ t: kids[k], c: cost(I, kids[k]) });
      R.pop = next; R.gen++;
      stats();
      if (R.gen >= GMAX) R.done = true;
    };
    // probabilidade de a seleção escolher o indivíduo de posição k (0 = melhor), por sorteio
    R.prob = function (k) {
      const P = R.pop, m = P.length;
      if (opt.sel === 'torneio') return (Math.pow(m - k, TK) - Math.pow(m - k - 1, TK)) / Math.pow(m, TK);
      let F = 0; P.forEach(function (x) { F += 1 / x.c; });
      return (1 / P[k].c) / F;
    };
    stats();
    return R;
  }

  A.agdemo = { instance: instance, gaRun: gaRun, twoOpt: twoOpt, randPerm: randPerm, cost: cost, rng: rng };   // (para testes)


  A.define('agdemo', function (host) {
    const frame = host.closest('section'), fc = host.closest('.fc');
    const others = Array.prototype.filter.call(fc.children, function (c) { return c !== host; });
    host.setAttribute('data-interactive', '');
    host.style.cssText = 'position:absolute;left:0;top:0;line-height:0;display:none';
    const W = 403.7;
    let H = 205;
    const root = S('svg', { role: 'img', 'aria-label': 'Demonstração: algoritmo genético no TSP' });
    host.appendChild(root);

    const opt = { sel: 'roleta', pm: 0.05, pop: 50, hib: false };
    let seed = 1, runSeed = 1, I = null, ga = null, lsC = 0, lsT = null, phase = 'idle', paused = false, raf = 0;
    let speed = 1, last = 0, hoverX = null, yLo = 0, yHi = 1, noted = {};
    // gráfico: janela de gerações (zoom), faixa do custo, ampliação
    let V = { x0: 0, x1: GMAX }, VY = { lo: 0, hi: 1 }, zoomed = false, expanded = false, drag = null;
    const MINW = 10;                                  // menor janela: 10 gerações
    const SPEEDS = [{ label: 'lenta', gpf: 0, ms: 380 }, { label: 'normal', gpf: 1 }, { label: 'rápida', gpf: 6 }];
    const el = {};
    const TP = { x: 0, y: 11, s: 128 };
    const RX = 150;                                   // coluna da direita
    const NBH = 46;                                   // altura do quadro "Este AG"
    const CH = { x0: 0, x1: 0, y0: 0, y1: 0 };

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
    // texto com trechos em itálico matemático: '$x$'; '_{...}' para subscrito
    function rich(parent, x, y, s, o) {
      const t = text(parent, x, y, null, o), fs = (o && o.fs) || 6.5;
      let down = 0;
      s.split(/(_\{[^}]*\})/).forEach(function (part) {
        if (!part) return;
        const sub = /^_\{/.test(part);
        if (sub) part = part.slice(2, -1);
        part.split('$').forEach(function (seg, k) {
          if (!seg) return;
          const at = k % 2 ? { 'font-family': MATH, 'font-style': 'italic' } : {};
          if (sub) { at['font-size'] = fs * 0.7; if (!down) { at.dy = fs * 0.25; down = fs * 0.25; } }
          else if (down) { at.dy = -down; down = 0; }
          S('tspan', at, t).textContent = seg;
        });
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
    // grupo de opções (rádio): ao trocar, roda de novo na mesma instância
    function radios(parent, x, y, label, key, items) {
      rich(parent, x, y, label, { fs: 6.3 });
      const gs = [];
      let cx0 = x + (label.replace(/[${}_]/g, '').length * 2.9 + 4);
      items.forEach(function (it) {
        const g = S('g', { style: 'cursor:pointer' }, parent);
        const wl = it[1].length * 2.85 + 9;
        S('rect', { x: cx0 - 1.5, y: y - 6.5, width: wl, height: 9, fill: 'transparent' }, g);
        S('circle', { cx: cx0 + 2, cy: y - 2.2, r: 2.3, fill: '#fff', stroke: '#555', 'stroke-width': 0.5 }, g);
        g.dot = S('circle', { cx: cx0 + 2, cy: y - 2.2, r: 1.25, fill: MYBLUE }, g);
        text(g, cx0 + 6, y, it[1], { fs: 6.1 });
        g.val = it[0];
        g.addEventListener('pointerdown', function (ev) {
          ev.preventDefault(); ev.stopPropagation();
          if (opt[key] === it[0]) return;
          opt[key] = it[0]; refresh(); start(false);
        });
        g.addEventListener('click', stop);
        gs.push(g);
        cx0 += wl + 2;
      });
      const refresh = function () { gs.forEach(function (g) { g.dot.style.display = g.val === opt[key] ? '' : 'none'; }); };
      refresh();
    }
    function setPaused(p) {
      paused = p;
      [el.bPause, el.bPause2].forEach(function (b) { if (b) b.t.textContent = p ? 'continuar' : 'pausar'; });
    }
    const togglePause = function () { if (phase === 'fim') return; setPaused(!paused); };

    // ---------- montagem ----------
    function measure() {
      const k = frame.getBoundingClientRect().width / 453.543;
      if (!(k > 0) || !fc.offsetParent) return;
      H = Math.max(180, fc.getBoundingClientRect().height / k - 2);
    }
    // posição do gráfico: na coluna da direita (normal) ou no quadro inteiro (ampliado)
    function chartBox() {
      if (expanded) { CH.x0 = 30; CH.x1 = W - 26; CH.y0 = 26; CH.y1 = H - 44; }
      else { CH.x0 = RX + 20; CH.x1 = W - 20; CH.y0 = NBH + 19; CH.y1 = H - 94; }
    }
    function build() {
      root.textContent = ''; el.chart = null;
      root.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      root.style.width = W + 'pt'; root.style.height = H + 'pt';
      TP.s = Math.min(128, H - 88);
      const M = el.main = S('g', {}, root);         // tudo menos o gráfico (some quando o gráfico é ampliado)

      // --- melhor rota e parâmetros ---
      text(M, TP.x, 8, 'Melhor rota', { fs: 7.5, bold: true, c: MYBLUE });
      text(M, TP.x + 48, 8, '(' + N + ' cidades)', { fs: 6.3, c: GRAY });
      S('rect', { x: TP.x, y: TP.y, width: TP.s, height: TP.s, fill: '#fbfbfd', stroke: '#ccd', 'stroke-width': 0.4 }, M);
      el.tourLS = S('path', { fill: 'none', stroke: RED, 'stroke-width': 0.5, 'stroke-dasharray': '1.6 1.2', 'stroke-linejoin': 'round', 'stroke-opacity': 0.6 }, M);
      el.tour = S('path', { fill: 'none', stroke: NAVY, 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, M);
      el.cities = S('g', {}, M);
      el.tourMsg = halo(text(M, TP.x + TP.s / 2, TP.y + TP.s - 4, '', { anchor: 'middle', fs: 5.8, c: GRAY }), 2);
      const ly = TP.y + TP.s + 9;
      el.c1 = text(M, TP.x, ly, '', { fs: 6.5, c: NAVY });
      el.c2 = text(M, TP.x, ly + 8.5, '', { fs: 6.3, c: RED });
      el.res = text(M, TP.x, ly + 17, '', { fs: 6.6, bold: true, c: NAVY });
      const py = ly + 27.5;
      radios(M, TP.x, py, 'seleção:', 'sel', [['roleta', 'roleta'], ['sus', 'SUS'], ['torneio', 'torneio (k = 3)']]);
      radios(M, TP.x, py + 9.5, '$p$_{m}:', 'pm', [[0, '0'], [0.01, '0,01'], [0.05, '0,05'], [0.2, '0,2']]);
      radios(M, TP.x, py + 19, 'população:', 'pop', [[20, '20'], [50, '50'], [100, '100']]);
      radios(M, TP.x, py + 28.5, 'AG híbrido:', 'hib', [[false, 'não'], [true, 'sim (2-opt nos filhos)']]);

      // --- componentes deste AG ---
      S('rect', { x: RX, y: 0.3, width: W - RX - 0.3, height: NBH, rx: 2, fill: '#f6f8fc', stroke: '#c9d6ea', 'stroke-width': 0.5 }, M);
      el.nbTitle = text(M, RX + 5, 8.5, '', { fs: 7.3, bold: true, c: MYBLUE });
      const l = function (k, s, col) { return rich(M, RX + 5, 16 + 6.2 * k, s, { fs: 5.7, c: col || '#222' }); };
      el.lPop = l(0, '');
      el.lSel = l(1, '');
      l(2, 'cruzamento: OX com $p$_{c} = 0,9 (dois filhos por par) · mutação: swap de 2 cidades com prob. $p$_{m}');
      el.lHib = l(3, '');
      l(4, 'substituição: os filhos formam a nova geração, mantendo os 2 melhores (elitismo)');

      // --- legenda do gráfico (modo normal) ---
      expanded = false; chartBox();
      const lg = CH.y1 + 19.5;
      el.leg = function (parent, x, y, kind, col, s, fs) {
        if (kind === 'area') S('rect', { x: x, y: y - 4.2, width: 8, height: 4, fill: col, 'fill-opacity': 0.25, stroke: col, 'stroke-width': 0.3 }, parent);
        else S('line', { x1: x, x2: x + 8, y1: y - 2.2, y2: y - 2.2, stroke: col, 'stroke-width': kind === 'dash' ? 0.6 : 1, 'stroke-dasharray': kind === 'dash' ? '2 1.2' : null }, parent);
        rich(parent, x + 10, y, s, { fs: fs || 5.4 });
      };
      el.leg(M, RX, lg, 'line', NAVY, 'melhor'); el.leg(M, RX + 34, lg, 'line', LIGHT, 'média da população');
      el.leg(M, RX + 100, lg, 'dash', RED, 'busca local 2-opt'); el.leg(M, RX + 160, lg, 'area', ORANGE, 'diversidade');

      // --- população ---
      const PY = lg + 6;
      el.popTitle = text(M, RX, PY + 5, '', { fs: 6.6, bold: true, c: MYBLUE });
      el.thumbs = S('g', {}, M);
      el.PY = PY + 8;

      // --- status e botões ---
      const by = H - 10.5;
      el.st1 = text(M, RX, by - 3, '', { fs: 6.1 });
      el.bSpeed = button(M, W - 180, by, 52, 'velocidade: ' + SPEEDS[speed].label, function () {
        speed = (speed + 1) % SPEEDS.length; el.bSpeed.t.textContent = 'velocidade: ' + SPEEDS[speed].label;
      });
      el.bPause = button(M, W - 125, by, 36, 'pausar', togglePause);
      button(M, W - 86, by, 42, 'rodar de novo', function () { start(false); });
      button(M, W - 41, by, 41, 'nova instância', function () { seed++; start(true); });

      buildChart();
    }

    // --- gráfico (normal: coluna da direita; ampliado: o quadro inteiro) ---
    function buildChart() {
      if (el.chart) el.chart.remove();
      chartBox();
      const g = el.chart = S('g', {}, root);
      el.main.style.display = expanded ? 'none' : '';
      const fsL = expanded ? 6.2 : 5.3;
      text(g, expanded ? 0 : RX, CH.y0 - (expanded ? 13 : 8), expanded ? 'Convergência (ampliado)' : 'Convergência', { fs: expanded ? 8.5 : 7.5, bold: true, c: MYBLUE });
      if (expanded) {
        text(g, CH.x0 + 4, CH.y0 - 4.5, 'roda do mouse: zoom · arrastar: mover · duplo clique: ver tudo · passe o mouse para ler os valores', { fs: 5.8, c: GRAY });
        el.bPause2 = button(g, W - 86, CH.y0 - 21, 40, paused ? 'continuar' : 'pausar', togglePause);
        button(g, W - 42, CH.y0 - 21, 42, 'voltar', function () { toggleExpand(); });
      } else {
        el.bPause2 = null;
        button(g, RX + 58, CH.y0 - 15.5, 40, '⤢ ampliar', function () { toggleExpand(); });
        text(g, RX + 102, CH.y0 - 8.5, 'roda: zoom · arrastar: mover · duplo clique: tudo · mouse: valores', { fs: 4.7, c: GRAY });
      }
      S('path', { d: 'M' + CH.x0 + ' ' + CH.y0 + 'V' + CH.y1 + 'H' + CH.x1 + 'V' + CH.y0, fill: 'none', stroke: '#000', 'stroke-width': 0.45 }, g);
      text(g, CH.x0 - 2, CH.y0 - 1.5, 'custo', { anchor: 'end', fs: fsL + 0.3 });
      text(g, CH.x1 + 2, CH.y0 - 1.5, 'divers.', { fs: fsL + 0.1, c: ORANGE });
      el.yHi = text(g, CH.x0 - 2, CH.y0 + 4, '', { anchor: 'end', fs: fsL, c: '#555' });
      el.yMid = text(g, CH.x0 - 2, (CH.y0 + CH.y1) / 2 + 2, '', { anchor: 'end', fs: fsL, c: '#555' });
      el.yLo = text(g, CH.x0 - 2, CH.y1, '', { anchor: 'end', fs: fsL, c: '#555' });
      text(g, CH.x1 + 2, CH.y0 + 5, '100%', { fs: fsL - 0.2, c: ORANGE });
      if (expanded) text(g, CH.x1 + 2, (CH.y0 + CH.y1) / 2 + 2, '50%', { fs: fsL - 0.2, c: ORANGE });
      text(g, CH.x1 + 2, CH.y1, '0', { fs: fsL - 0.2, c: ORANGE });
      el.xA = text(g, CH.x0, CH.y1 + 6.3, '', { anchor: 'middle', fs: fsL, c: '#555' });
      el.xM = text(g, (CH.x0 + CH.x1) / 2, CH.y1 + 6.3, '', { anchor: 'middle', fs: fsL, c: '#555' });
      el.xB = text(g, CH.x1, CH.y1 + 6.3, '', { anchor: 'middle', fs: fsL, c: '#555' });
      text(g, (CH.x0 + CH.x1) / 2, CH.y1 + 12.5, 'gerações', { anchor: 'middle', fs: fsL + 0.3, c: '#555' });
      el.zoomTag = text(g, CH.x0 + 2, CH.y1 + 12.5, '', { fs: fsL, c: MYBLUE });
      // séries, recortadas na área do gráfico
      const cid = 'agc' + Math.random().toString(36).slice(2);
      S('rect', { x: CH.x0, y: CH.y0 - 0.5, width: CH.x1 - CH.x0, height: CH.y1 - CH.y0 + 1 }, S('clipPath', { id: cid }, g));
      const sg = S('g', { 'clip-path': 'url(#' + cid + ')' }, g);
      el.div = S('path', { fill: ORANGE, 'fill-opacity': 0.13, stroke: ORANGE, 'stroke-width': 0.4, 'stroke-opacity': 0.7 }, sg);
      el.lsLine = S('line', { stroke: RED, 'stroke-width': 0.6, 'stroke-dasharray': '2 1.2' }, sg);
      el.mean = S('path', { fill: 'none', stroke: LIGHT, 'stroke-width': expanded ? 0.8 : 0.7, 'stroke-linejoin': 'round' }, sg);
      el.best = S('path', { fill: 'none', stroke: NAVY, 'stroke-width': expanded ? 1.1 : 0.95, 'stroke-linejoin': 'round' }, sg);
      el.notes = S('g', {}, sg);
      el.read = S('g', { 'pointer-events': 'none' }, g);
      // no modo ampliado: legenda numa linha e o status embaixo
      if (expanded) {
        const ly = CH.y1 + 24;
        el.leg(g, 0, ly, 'line', NAVY, 'melhor rota da população', 6.2);
        el.leg(g, 100, ly, 'line', LIGHT, 'custo médio da população', 6.2);
        el.leg(g, 200, ly, 'dash', RED, 'busca local 2-opt (referência)', 6.2);
        el.leg(g, 312, ly, 'area', ORANGE, 'diversidade (eixo à direita)', 6.2);
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
        drag = { x: x, a: V.x0, b: V.x1 };
        hit.setPointerCapture(ev.pointerId); hit.style.cursor = 'grabbing';
      });
      hit.addEventListener('pointermove', function (ev) {
        const x = svgX(ev); if (x == null) return;
        if (drag) {
          const di = (drag.x - x) / (CH.x1 - CH.x0) * (drag.b - drag.a);
          if (zoomed) setView(drag.a + di, drag.b + di);
          hoverX = null; readout();
        } else { hoverX = x; readout(); }
      });
      const end = function () { drag = null; hit.style.cursor = 'crosshair'; };
      hit.addEventListener('pointerup', end);
      hit.addEventListener('pointercancel', end);
      hit.addEventListener('pointerleave', function () { if (!drag) { hoverX = null; readout(); } });
      hit.addEventListener('click', stop);
      hit.addEventListener('dblclick', function (ev) { ev.preventDefault(); ev.stopPropagation(); setView(0, GMAX); });
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
      if (ga) { drawChart(); status(); }
    }

    // ---------- desenho dinâmico ----------
    const px = function (p, box) { return [box.x + 4 + p[0] / 100 * (box.s - 8), box.y + 4 + p[1] / 100 * (box.s - 8)]; };
    function tourD(t, box) {
      if (!t) return '';
      return t.map(function (c, k) { const q = px(I.P[c], box); return (k ? 'L' : 'M') + q[0].toFixed(2) + ' ' + q[1].toFixed(2); }).join('') + 'Z';
    }
    function drawCities() {
      el.cities.textContent = '';
      I.P.forEach(function (p) { const q = px(p, TP); S('circle', { cx: q[0], cy: q[1], r: 1.45, fill: '#fff', stroke: '#222', 'stroke-width': 0.55 }, el.cities); });
      el.tourLS.setAttribute('d', tourD(lsT, TP));
    }
    // eixos: geração → x, custo → y (na janela atual)
    const gx = function (g) { return CH.x0 + (CH.x1 - CH.x0) * (g - V.x0) / (V.x1 - V.x0); };
    const inv = function (x) { return V.x0 + (x - CH.x0) / (CH.x1 - CH.x0) * (V.x1 - V.x0); };
    const gy = function (c) { return CH.y1 - (CH.y1 - CH.y0) * Math.max(-0.05, Math.min(1.05, (c - VY.lo) / (VY.hi - VY.lo))); };
    const dy = function (d) { return CH.y1 - (CH.y1 - CH.y0) * d; };
    function setView(a, b) {
      const w = Math.max(MINW, Math.min(GMAX, b - a));
      if (w >= GMAX) { V = { x0: 0, x1: GMAX }; zoomed = false; }
      else { a = Math.max(0, Math.min(GMAX - w, a)); V = { x0: a, x1: a + w }; zoomed = true; }
      if (ga) drawChart();
    }
    const win = function () { return [Math.max(0, Math.floor(V.x0)), Math.min(ga.gen, Math.ceil(V.x1))]; };
    function series(arr, f) {
      const w = win(); let d = '';
      for (let g = w[0]; g <= w[1]; g++) d += (d ? 'L' : 'M') + gx(g).toFixed(2) + ' ' + f(arr[g]).toFixed(2);
      return d;
    }
    // 8 rotas da população (posições pelo custo), com o custo e a probabilidade de seleção
    const RANKS = function (m) { return [0, 1, 2, Math.floor(m / 4), Math.floor(m / 2), Math.floor(3 * m / 4), m - 2, m - 1]; };
    function drawThumbs() {
      el.thumbs.textContent = '';
      const m = ga.pop.length, ks = RANKS(m), n = ks.length, w = (W - RX) / n, s = Math.min(24, w - 4);
      el.popTitle.textContent = 'População (' + m + ' rotas, da melhor para a pior)';
      ks.forEach(function (k, q) {
        const x = RX + q * w + (w - s) / 2, y = el.PY;
        S('rect', { x: x, y: y, width: s, height: s, fill: '#fbfbfd', stroke: k === 0 ? NAVY : '#ccd', 'stroke-width': k === 0 ? 0.7 : 0.4 }, el.thumbs);
        const t = ga.pop[k].t;
        S('path', { d: t.map(function (c, i) { const p = I.P[c]; return (i ? 'L' : 'M') + (x + 1.5 + p[0] / 100 * (s - 3)).toFixed(2) + ' ' + (y + 1.5 + p[1] / 100 * (s - 3)).toFixed(2); }).join('') + 'Z',
          fill: 'none', stroke: k === 0 ? NAVY : '#4a5f8c', 'stroke-width': 0.45, 'stroke-linejoin': 'round' }, el.thumbs);
        text(el.thumbs, x + s / 2, y + s + 5.6, (k + 1) + 'ª · ' + fmt(ga.pop[k].c), { anchor: 'middle', fs: 4.9, c: '#333' });
        text(el.thumbs, x + s / 2, y + s + 10.6, 'P = ' + fmt(ga.prob(k) * 100, 1) + '%', { anchor: 'middle', fs: 4.7, c: ORANGE });
      });
    }
    function drawChart() {
      // escala da visão geral: do custo médio mais alto a partir da geração 1 (a geração 0, aleatória, pode ficar
      // acima do topo: no híbrido a 1ª geração já cai muito) até abaixo da busca local e do melhor
      if (ga.gen >= 1) { let m = 0; for (let k = 1; k <= ga.gen; k++) m = Math.max(m, ga.hm[k]); yHi = m * 1.03; }
      if (ga.bestC < yLo + 0.03 * (yHi - yLo)) yLo = ga.bestC - 0.06 * (yHi - yLo);
      if (!zoomed) { V = { x0: 0, x1: GMAX }; VY = { lo: yLo, hi: yHi }; }
      else {   // no zoom, o eixo do custo se ajusta ao trecho visível
        const w = win(); let lo = Infinity, hi = -Infinity;
        for (let g = w[0]; g <= w[1]; g++) { lo = Math.min(lo, ga.hb[g], ga.hm[g]); hi = Math.max(hi, ga.hb[g], ga.hm[g]); }
        if (!isFinite(lo)) { lo = yLo; hi = yHi; }
        if (lsC >= lo - (hi - lo) * 0.5 && lsC <= hi + (hi - lo) * 0.5) { lo = Math.min(lo, lsC); hi = Math.max(hi, lsC); }
        const pad = Math.max(2, (hi - lo) * 0.08);
        VY = { lo: lo - pad, hi: hi + pad };
      }
      el.best.setAttribute('d', series(ga.hb, gy));
      el.mean.setAttribute('d', series(ga.hm, gy));
      const w = win();
      el.div.setAttribute('d', w[1] >= w[0] ? series(ga.hd, dy) + 'L' + gx(w[1]).toFixed(2) + ' ' + CH.y1 + 'L' + gx(w[0]).toFixed(2) + ' ' + CH.y1 + 'Z' : '');
      const y = gy(lsC);
      el.lsLine.setAttribute('x1', CH.x0); el.lsLine.setAttribute('x2', CH.x1); el.lsLine.setAttribute('y1', y); el.lsLine.setAttribute('y2', y);
      const dg = VY.hi - VY.lo < 20 ? 1 : 0;
      el.yHi.textContent = fmt(VY.hi, dg); el.yLo.textContent = fmt(VY.lo, dg);
      el.yMid.textContent = zoomed || expanded ? fmt((VY.hi + VY.lo) / 2, dg) : '';
      el.xA.textContent = big(V.x0); el.xM.textContent = big((V.x0 + V.x1) / 2); el.xB.textContent = big(V.x1);
      el.zoomTag.textContent = zoomed ? 'zoom: ' + fmt(GMAX / (V.x1 - V.x0), 1) + '×' : '';
      drawNotes(); readout();
    }
    // anotações didáticas: só na visão geral
    function drawNotes() {
      el.notes.textContent = '';
      if (zoomed) return;
      const fs = expanded ? 6.2 : 5.1;
      const nt = function (x, y, lines, col, anchor) {
        lines.forEach(function (s, k) { halo(rich(el.notes, x, y + k * fs * 1.06, s, { fs: fs, c: col, anchor: anchor })); });
      };
      if (noted.conv) {
        const g = noted.conv, x = gx(g);
        nt(Math.min(x + 3, CH.x1 - fs * 14), Math.max(CH.y0 + 6, Math.min(dy(ga.hd[g]), gy(ga.hb[g])) - 2.6 * fs), ['diversidade < 5%: a população', 'quase toda igual (convergiu)'], '#b06a00');
      }
      if (noted.ls) nt(CH.x1 - 2, gy(lsC) - fs * 0.5, ['AG passou a busca local (geração ' + noted.ls + ')'], RED, 'end');
    }
    function readout() {
      el.read.textContent = '';
      if (hoverX == null || !ga) return;
      const g = Math.max(0, Math.min(ga.gen, Math.round(inv(Math.max(CH.x0, Math.min(CH.x1, hoverX))))));
      const x = gx(g);
      if (x < CH.x0 - 0.5 || x > CH.x1 + 0.5) return;
      S('line', { x1: x, x2: x, y1: CH.y0, y2: CH.y1, stroke: '#444', 'stroke-width': 0.35, 'stroke-dasharray': '1 0.8' }, el.read);
      [[gy(ga.hb[g]), NAVY], [gy(ga.hm[g]), LIGHT], [dy(ga.hd[g]), ORANGE]].forEach(function (p) {
        if (p[0] >= CH.y0 - 0.5 && p[0] <= CH.y1 + 0.5) S('circle', { cx: x, cy: p[0], r: 1.4, fill: p[1], stroke: '#fff', 'stroke-width': 0.4 }, el.read);
      });
      const d = (ga.hb[g] - lsC) / lsC * 100;
      const lines = [['geração ' + g, '#222', true], ['melhor: ' + fmt(ga.hb[g], 1) + ' (' + (d >= 0 ? '+' : '−') + fmt(Math.abs(d), 1) + '% da busca local)', NAVY],
        ['média: ' + fmt(ga.hm[g], 1), '#3d5a99'], ['diversidade: ' + fmt(ga.hd[g] * 100) + '%', ORANGE], ['busca local: ' + fmt(lsC, 1), RED]];
      const fs = expanded ? 6.4 : 5.3, lh = fs * 1.25, gg = S('g', {}, el.read);
      const bg = S('rect', { fill: '#fff', 'fill-opacity': 0.93, stroke: '#aab', 'stroke-width': 0.35, rx: 1.5 }, gg);
      let wmax = 0;
      lines.forEach(function (ln, k) {
        const t = text(gg, 0, (k + 1) * lh, ln[0], { fs: fs, c: ln[1], bold: ln[2] });
        wmax = Math.max(wmax, t.getComputedTextLength ? t.getComputedTextLength() : ln[0].length * fs * 0.5);
      });
      const bw = wmax + 5;
      bg.setAttribute('x', -2.5); bg.setAttribute('y', 0); bg.setAttribute('width', bw); bg.setAttribute('height', lines.length * lh + 3);
      const bx = x + 6 + bw > CH.x1 ? x - 4 - bw + 2.5 : x + 6.5;
      gg.setAttribute('transform', 'translate(' + bx.toFixed(2) + ' ' + (CH.y0 + 2) + ')');
    }
    function labels() {
      const lp = el.lPop; lp.textContent = '';
      ['população inicial: ' + opt.pop + ' rotas aleatórias · fitness: ', '$f$', ' = 1/', '$z$', ' (custo da rota)'].forEach(function (s) {
        const it = s[0] === '$'; S('tspan', it ? { 'font-family': MATH, 'font-style': 'italic' } : {}, lp).textContent = it ? s.slice(1, -1) : s;
      });
      el.lSel.textContent = {
        roleta: 'seleção: roleta — cada pai é um giro; P(escolher a rota) = f / Σf',
        sus: 'seleção: amostragem estocástica universal — um giro só, marcadores igualmente espaçados',
        torneio: 'seleção: torneio — sorteia 3 rotas e fica com a melhor (independe do valor de f)'
      }[opt.sel];
      el.nbTitle.textContent = opt.hib ? 'Este AG (híbrido: AG + busca local)' : 'Este AG (o do exemplo)';
      el.lHib.textContent = opt.hib ? 'busca local: cada filho passa por um 2-opt (primeira melhora) antes de entrar na população'
        : 'busca local: nenhuma (AG puro)';
      el.lHib.setAttribute('fill', opt.hib ? '#7a2e9a' : '#222');
    }
    function status() {
      const g = ga.gen;
      el.c1.textContent = (opt.hib ? 'AG híbrido' : 'AG') + ': melhor ' + fmt(ga.bestC) + ' (geração 0: ' + fmt(ga.hb[0]) + ')';
      el.c2.textContent = 'busca local 2-opt (referência): ' + fmt(lsC);
      if (phase === 'fim') {
        const d = (ga.bestC - lsC) / lsC * 100;
        el.res.textContent = Math.abs(d) < 0.05 ? 'AG empatou com a busca local' : 'AG ' + fmt(Math.abs(d), 1) + '% ' + (d < 0 ? 'melhor' : 'pior') + ' que a busca local';
      } else el.res.textContent = '';
      el.st1.textContent = (phase === 'fim' ? 'fim: ' : '') + 'geração ' + g + ' de ' + GMAX + ' · ' + ga.cx + ' cruzamentos e ' + ga.mut + ' mutações'
        + (opt.hib ? ' · ' + ga.ls + ' buscas locais' : '') + ' na última geração';
      if (el.st1x) el.st1x.textContent = (phase === 'fim' ? 'fim: ' : '') + (opt.hib ? 'AG híbrido' : 'AG') + ' · geração ' + g + ' de ' + GMAX
        + ' · melhor ' + fmt(ga.bestC, 1) + ' · busca local ' + fmt(lsC, 1) + (phase === 'fim' ? ' · ' + el.res.textContent : '')
        + ' · seleção: ' + { roleta: 'roleta', sus: 'SUS', torneio: 'torneio' }[opt.sel] + ', p_m = ' + fmt(opt.pm, 2) + ', população ' + opt.pop;
      el.tourMsg.textContent = g === 0 ? 'geração 0: a melhor das rotas aleatórias' : '';
    }

    // ---------- execução ----------
    function start(fresh) {
      if (fresh || !I) {
        I = instance(seed);
        lsT = twoOpt(I, randPerm(rng(seed * 31 + 7))); lsC = cost(I, lsT);
      }
      runSeed++;
      ga = gaRun(I, { sel: opt.sel, pm: opt.pm, pop: opt.pop, hib: opt.hib }, runSeed * 104729 + seed);
      yHi = ga.hm[0] * 1.03; yLo = lsC * 0.85; noted = {}; hoverX = null; zoomed = false; V = { x0: 0, x1: GMAX };
      labels(); drawCities(); setPaused(false);
      phase = 'ga'; last = 0;
      el.tour.setAttribute('d', tourD(ga.best, TP));
      drawChart(); drawThumbs(); status(); loop();
    }
    function tick(now) {
      if (paused || !frame.classList.contains('active') || phase !== 'ga') return;
      const sp = SPEEDS[speed];
      let n = sp.gpf;
      if (!n) { if (now - last < sp.ms) return; last = now; n = 1; }
      for (let k = 0; k < n && !ga.done; k++) {
        ga.step();
        if (!noted.conv && ga.div < 0.05) noted.conv = ga.gen;
        if (!noted.ls && ga.bestC < lsC - 1e-9) noted.ls = ga.gen;
      }
      if (ga.done) phase = 'fim';
      el.tour.setAttribute('d', tourD(ga.best, TP));
      drawChart(); drawThumbs(); status();
    }
    function loop() {
      cancelAnimationFrame(raf);
      const f = function (now) { tick(now); if (phase === 'ga') raf = requestAnimationFrame(f); };
      raf = requestAnimationFrame(f);
    }
    function halt() { cancelAnimationFrame(raf); phase = 'idle'; }

    // ---------- estados ----------
    function place(on) {
      others.forEach(function (c) { c.style.visibility = on ? 'hidden' : ''; c.style.opacity = ''; });
      if (on) measure();
      host.style.display = on ? '' : 'none';
    }
    function snap(st) {
      if (st !== 'demo') { halt(); expanded = false; place(false); root.style.opacity = ''; return; }
      if (phase === 'idle' || !ga) { place(true); build(); start(true); }
      else { place(true); if (phase === 'ga') loop(); }
      root.style.opacity = '';
    }
    async function play(a, b, h) {
      if (b !== 'demo') { snap(b); return; }
      halt(); expanded = false; others.forEach(function (c) { c.style.visibility = ''; }); measure();
      await h.tween(450, function (e) { others.forEach(function (c) { c.style.opacity = 1 - e; }); });
      others.forEach(function (c) { c.style.visibility = 'hidden'; c.style.opacity = ''; });
      host.style.display = ''; build();
      root.style.opacity = 0;
      await h.tween(450, function (e) { root.style.opacity = e; });
      start(true);
    }
    // ao voltar ao frame com a execução pausada pela saída, o laço recomeça
    frame.addEventListener('enter', function () { if (phase === 'ga') loop(); });
    return { snap: snap, play: play };
  });
})();
