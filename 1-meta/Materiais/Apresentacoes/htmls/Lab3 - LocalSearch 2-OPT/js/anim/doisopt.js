/* O operador 2-OPT (aula Lab3): vetor da solução + rota no grafo, redesenhados a partir de um estado.
 *
 * A geometria vem das figuras do Ipe (img/2opt*.pdf, lida com ferramentas/figura_geometria.py): células de
 * 8 pt, nós em coordenadas fixas, setas "normal" do Ipe (tamanho 3), vermelho #8b0000, destaques azul/verde
 * com opacidade 0.5 / 0.1. Os arcos da rota são as cidades consecutivas do vetor (o último volta ao primeiro).
 * O estado final de cada slide é a figura do PDF (os rótulos usam as posições exatas do PDF).
 *
 * Cenas (data-scene) e estados (data-state / data-from):
 *   tsp   (img/2opt1…5, slides 5–9)   t0 vazio · t1 · t2 · t3 · t4 · t5
 *   wrap  (img/2opt8.1–8.2, 21–24)    w0 · w1 · w1b · w2
 *   adj   (img/2opt8.3, slide 26)     a0 · a1
 *   idx   (img/2opt6–8, slides 17–20) x0 · x6 · x7 · x8 · x8b
 * Transições:
 *   t0→t1   os nós surgem e a rota é percorrida: a cada cidade visitada a célula entra no vetor e o arco cresce
 *   t1→t2   o movimento 2-OPT: uma cópia desliza para a direita, os arcos (i,i+1) e (j,j+1) piscam e somem, as
 *           células de i+1 a j trocam de lugar (invertem), os arcos do trecho mudam de sentido (vermelhos) e os
 *           novos arcos (i,j) e (i+1,j+1) são traçados sobre os pontilhados
 *   t2→t3   rótulos i, i+1, j, j+1 e os destaques entram um a um (o nó correspondente pulsa)
 *   t3→t4   retângulo e seta do trecho invertido; i e j+1 pulsam nos dois vetores (não mudaram)
 *   t4→t5   idem à direita; cópias das células do trecho voam da esquerda para a direita, em ordem invertida
 *   w0→w1   os arcos a remover ficam vermelhos (pulso) e os rótulos entram
 *   w1→w1b  (slide 23) j e j+1 pulsam e um arco "dá a volta" do fim do vetor até o início (7 → 0)
 *   w1b→w2  o movimento 2-OPT com j no fim do vetor
 *   a0→a1   o movimento redundante: todos os arcos mudam de sentido (a rota inteira se inverte)
 *   x*      os rótulos de i e j deslizam célula a célula até o limite de cada laço
 *
 * Também registra 'inverte' (img/inverte1…5, slides 10–14), estados v0…v5: os dois elementos trocam de lugar
 * seguindo as próprias setas da figura (um por cima, outro por baixo) e as setas se fecham para o par seguinte.
 */
(function () {
  'use strict';
  const A = window.Anim;
  if (!A) return;
  const S = A.svg, E = A.ease, lerp = A.lerp;
  const NAVY = '#000080', DRED = '#8b0000', BLUE = '#00008b', GREEN = '#006400', BLACK = '#000000';
  const MAIN = 'KaTeX_Main, serif', MATH = 'KaTeX_Math, serif';
  const FS = 4.98, MED = 4 / 18 * 4.98;        // tamanho dos rótulos (5 pt) e \medmuskip
  const CELL = 8, VAL = 5.94;                   // célula; linha de base do número (a partir do topo da célula)

  // ---------- geometria das figuras ----------
  const LAY_A = { 0: [8.2, 48.2], 1: [24.2, 28.2], 2: [44.2, 28.2], 3: [60.2, 28.2], 4: [72.2, 48.2], 5: [60.2, 60.2], 6: [44.2, 60.2], 7: [24.2, 60.2] };
  const LAY_B = { 0: [8.2, 48.2], 1: [24.2, 28.2], 7: [44.2, 28.2], 3: [60.2, 28.2], 4: [72.2, 48.2], 5: [60.2, 60.2], 6: [44.2, 60.2], 2: [24.2, 60.2] };
  // rótulos dos nós: trechos [texto, x, y, matemática?] (posições do PDF)
  const NL_A = {
    0: [['0', 1.45, 50.46]], 3: [['3', 58.66, 25.08]], 4: [['4', 75.09, 49.83]], 5: [['5', 63.24, 62.27]],
    1: [['1(', 22.46, 25.08], ['i', 26.89, 25.08, 1], [')', 28.61, 25.08]],
    2: [['2(', 42.64, 25.08], ['j', 47.07, 25.08, 1], [')', 49.4, 25.08]],
    6: [['6(', 43.06, 66.89], ['i', 47.48, 66.89, 1], ['+', 49.2 + MED, 66.89], ['1)', 49.2 + 2 * MED + 3.874, 66.89]],
    7: [['7(', 22.88, 67.1], ['j', 27.31, 67.1, 1], ['+', 29.36 + MED, 67.1], ['1)', 29.36 + 2 * MED + 3.874, 67.1]]
  };
  const NL_B = {
    0: [['0', 1.46, 50.46]], 1: [['1', 22.46, 25.08]], 7: [['7', 42.64, 25.08]], 3: [['3', 58.66, 25.08]],
    4: [['4', 75.09, 49.83]], 6: [['6', 43.06, 66.89]], 2: [['2', 22.88, 67.1]], 5: [['5', 63.24, 62.27]]
  };
  const A0 = [0, 1, 6, 5, 4, 3, 2, 7];
  const I8 = [0, 1, 2, 3, 4, 5, 6, 7];
  const clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  const shiftLabs = function (labs, d) { return labs.map(function (l) { const c = l.slice(); c[2] += d; return c; }); };

  const T1 = { L: { arr: A0, dots: [[1, 2], [7, 6]] } };
  const T2 = { L: T1.L, R: { arr: I8, red: [[2, 3], [3, 4], [4, 5], [5, 6]] } };
  const HL = { 1: [BLUE, 0.5], 6: [BLUE, 0.1], 2: [GREEN, 0.5], 7: [GREEN, 0.1] };
  const T3 = clone(T2);
  T3.L.hl = HL; T3.R.hl = HL;
  T3.L.labs = [['i', 'i', 15.33, 6.89, 1], ['i1', 'i+1', 20.06, 7.05, 6], ['j', 'j', 54.99, 6.73, 2], ['j1', 'j+1', 59.1, 6.93, 7]];
  T3.R.labs = [['i', 'i', 99.33, 6.89, 1], ['j', 'j', 107.11, 6.49, 2], ['i1', 'i+1', 135.13, 6.64, 6], ['j1', 'j+1', 143.42, 20.45, 7]];
  const T4 = clone(T3); T4.L.rect = [2, 6]; T4.L.arw = [32.2, 48.2];
  const T5 = clone(T4); T5.R.rect = [2, 6]; T5.R.arw = [132.2, 116.2];

  const W1L = { arr: A0, red: [[1, 6], [7, 0]], labs: [['j1', 'j+1', 3.1, 6.93, 0], ['i', 'i', 15.33, 6.89, 1], ['i1', 'i+1', 20.06, 7.05, 6], ['j', 'j', 62.99, 6.73, 7]] };
  const W2R = { arr: [0, 1, 7, 2, 3, 4, 5, 6], labs: shiftLabs(W1L.labs, 84) };
  const AL = { arr: A0, red: [[0, 1], [7, 0]], labs: [['j1', 'j+1', 3.1, 10.93, 0], ['i', 'i', 7.33, 14.89, 1], ['i1', 'i+1', 12.06, 15.05, 6], ['j', 'j', 62.99, 14.73, 7]] };
  const AR = { arr: [0, 7, 2, 3, 4, 5, 6, 1], red: [[1, 0], [0, 7]], labs: shiftLabs(AL.labs, 80) };

  const XI = [['i', 'i', 6.42, 7.39], ['i1', 'i+1', 11.13, 7.24]];
  const XI2 = [['i_', 'i', 37.88, 7.39], ['i1_', 'i+1', 42.58, 7.24]];
  const XJ = [['j', 'j', 22.5, 6.38], ['j1', 'j+1', 27.28, 6.48], ['j_', 'j', 54.16, 6.27], ['j1_', 'j+1', 58.93, 6.38]];

  const SCENES = {
    tsp: { W: 164.4, H: 72.4, lay: LAY_A, nl: NL_A, ax: { L: 0, R: 84 }, gx: { L: 0, R: 84 }, dy: 0, cy: 8.2,
      states: { t0: {}, t1: T1, t2: T2, t3: T3, t4: T4, t5: T5 } },
    wrap: { W: 160.4, H: 72.4, lay: LAY_B, nl: NL_B, ax: { L: 0, R: 84 }, gx: { L: 0, R: 80 }, dy: 0, cy: 8.2,
      states: { w0: { L: { arr: A0 } }, w1: { L: W1L }, w1b: { L: W1L }, w2: { L: W1L, R: W2R } } },
    adj: { W: 160.4, H: 80.4, lay: LAY_B, nl: NL_B, ax: { L: 0, R: 80 }, gx: { L: 0, R: 80 }, dy: 8, cy: 16.2,
      states: { a0: { L: AL }, a1: { L: AL, R: AR } } },
    idx: { W: 80.4, H: 20.4, lay: null, ax: { L: 0 }, gx: { L: 0 }, dy: 0, cy: 8.2,
      states: { x0: { L: { arr: A0 } }, x6: { L: { arr: A0, labs: XI } }, x7: { L: { arr: A0, labs: XI.concat(XI2) } },
        x8: { L: { arr: A0, labs: XJ } }, x8b: { L: { arr: A0, labs: XJ } } } }
  };

  // ---------- desenho ----------
  const key = function (a, b) { return a < b ? a + '-' + b : b + '-' + a; };
  function headD(x1, y1, x2, y2) {         // seta "normal" do Ipe, aberta: ponta + (-3, ±1)
    const L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy, ny = ux;
    const p = function (s) { return (x2 - 3 * ux + s * nx).toFixed(3) + ',' + (y2 - 3 * uy + s * ny).toFixed(3); };
    return 'M' + p(1) + 'L' + x2.toFixed(3) + ',' + y2.toFixed(3) + 'L' + p(-1);
  }
  function label(parent, t, x, y, extra) {
    const tx = S('text', Object.assign({ x: x, y: y, 'font-size': FS, fill: BLACK }, extra || {}), parent);
    const m = S('tspan', { 'font-family': MATH, 'font-style': 'italic' }, tx); m.textContent = t[0];
    if (t.length > 1) {
      S('tspan', { 'font-family': MAIN, dx: MED }, tx).textContent = '+';
      S('tspan', { 'font-family': MAIN, dx: MED }, tx).textContent = '1';
    }
    return tx;
  }
  function runs(parent, list, dx, dy) {
    list.forEach(function (r) {
      const t = S('text', { x: r[1] + dx, y: r[2] + dy, 'font-size': FS, 'font-family': r[3] ? MATH : MAIN, fill: BLACK }, parent);
      if (r[3]) t.setAttribute('font-style', 'italic');
      t.textContent = r[0];
    });
  }

  function Panel(root, sc, name, ps, ofs) {
    const self = this;
    this.sc = sc; this.name = name; this.ps = ps;
    this.ax = sc.ax[name]; this.gx = sc.gx[name];
    this.g = S('g', {}, root);
    this.gg = S('g', {}, this.g);      // grafo
    this.ga = S('g', {}, this.g);      // vetor + rótulos
    this.cells = {}; this.edges = {}; this.nodes = {}; this.labs = {}; this.dots = [];
    if (ofs) {
      this.gg.setAttribute('transform', 'translate(' + ofs.g + ',0)');
      this.ga.setAttribute('transform', 'translate(' + ofs.a + ',0)');
    }
    if (sc.lay) {
      const ge = S('g', {}, this.gg);
      this.ge = S('g', {}, this.gg);
      Object.keys(sc.lay).forEach(function (c) {
        const p = self.P(+c);
        self.nodes[c] = S('circle', { cx: p[0], cy: p[1], r: 1.8, fill: NAVY }, ge);
      });
      const n = ps.arr.length;
      ps.arr.forEach(function (a, k) { self.edge(a, ps.arr[(k + 1) % n], self.isRed(ps, a, ps.arr[(k + 1) % n])); });
      (ps.dots || []).forEach(function (d) {
        const p = self.P(d[0]), q = self.P(d[1]);
        self.dots.push(S('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: BLACK, 'stroke-width': 0.4, 'stroke-dasharray': '1 3' }, self.gg));
      });
      this.gl = S('g', {}, this.gg);
      Object.keys(sc.nl).forEach(function (c) { runs(self.gl, sc.nl[c], self.gx, sc.dy); });
    }
    ps.arr.forEach(function (c, k) { self.cell(c, k, (ps.hl || {})[c]); });
    (ps.labs || []).forEach(function (l) { self.lab(l); });
    if (ps.rect) this.mkRect(ps.rect);
    if (ps.arw) this.mkArw(ps.arw);
  }
  Panel.prototype.P = function (c) { const p = this.sc.lay[c]; return [p[0] + this.gx, p[1] + this.sc.dy]; };
  Panel.prototype.isRed = function (ps, a, b) { return (ps.red || []).some(function (r) { return r[0] === a && r[1] === b; }); };
  Panel.prototype.cx = function (k) { return this.ax + 4.2 + CELL * k; };
  Panel.prototype.edge = function (a, b, red) {
    const p = this.P(a), q = this.P(b), col = red ? DRED : BLACK;
    const g = S('g', { stroke: col, 'stroke-width': 0.4, fill: 'none', 'stroke-linejoin': 'round' }, this.ge);
    const line = S('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1] }, g);
    const head = S('path', { d: headD(p[0], p[1], q[0], q[1]) }, g);
    const e = { g: g, line: line, head: head, a: a, b: b, col: col };
    this.edges[key(a, b)] = e;
    return e;
  };
  Panel.prototype.cell = function (c, k, hl) {
    const g = S('g', { transform: 'translate(' + this.cx(k) + ',' + this.sc.cy + ')' }, this.ga);
    const r = S('rect', { x: 0, y: 0, width: CELL, height: CELL, stroke: BLACK, 'stroke-width': 0.4,
      fill: hl ? hl[0] : '#ffffff', 'fill-opacity': hl ? hl[1] : 0 }, g);
    const t = S('text', { x: CELL / 2, y: VAL, 'font-size': FS, 'font-family': MAIN, 'text-anchor': 'middle', fill: BLACK }, g);
    t.textContent = c;
    this.cells[c] = { g: g, r: r, t: t, k: k, x: this.cx(k), y: this.sc.cy };
  };
  Panel.prototype.lab = function (l) { this.labs[l[0]] = { el: label(this.ga, l[1], l[2], l[3]), x: l[2], y: l[3], spec: l }; };
  Panel.prototype.rectD = function (r) {
    const x0 = this.cx(r[0]), x1 = this.cx(r[1] + 1), y0 = this.sc.cy, y1 = y0 + CELL;
    return 'M' + x0 + ',' + y0 + 'V' + y1 + 'H' + x1 + 'V' + y0 + 'Z';
  };
  Panel.prototype.mkRect = function (r) {
    this.rect = S('path', { d: this.rectD(r), stroke: DRED, 'stroke-width': 0.8, fill: 'none' }, this.ga);
    return this.rect;
  };
  Panel.prototype.mkArw = function (w) {
    const g = S('g', { stroke: DRED, fill: DRED, 'stroke-width': 0.4 }, this.ga);
    const s = Math.sign(w[1] - w[0]), y = 4.2;
    const line = S('line', { x1: w[0], y1: y, x2: w[1], y2: y }, g);
    const head = S('path', { d: 'M' + w[1] + ',' + y + 'L' + (w[1] - 3 * s) + ',' + (y - 1) + 'L' + (w[1] - 3 * s) + ',' + (y + 1) + 'Z' }, g);
    this.arw = { g: g, line: line, head: head, w: w };
    return this.arw;
  };

  // ---------- pequenas animações ----------
  function pop(h, el, cx, cy, ms, base) {     // brota com leve overshoot; base = transform já existente
    base = base || '';
    el.style.opacity = 0;
    return h.tween(ms || 320, function (e) {
      const s = 0.3 + 0.7 * e;
      el.setAttribute('transform', base + ' translate(' + cx + ',' + cy + ') scale(' + s + ') translate(' + (-cx) + ',' + (-cy) + ')');
      el.style.opacity = Math.min(1, e * 1.6);
    }, E.back).then(function () { if (base) el.setAttribute('transform', base); else el.removeAttribute('transform'); el.style.opacity = ''; });
  }
  function bump(h, el, cx, cy, amp, ms, base) {  // pulso (escala 1 → 1+amp → 1); base = transform já existente
    base = base || '';
    return h.tween(ms || 500, function (e, t) {
      const s = 1 + amp * Math.sin(Math.PI * t);
      el.setAttribute('transform', base + ' translate(' + cx + ',' + cy + ') scale(' + s + ') translate(' + (-cx) + ',' + (-cy) + ')');
    }, E.linear).then(function () { if (base) el.setAttribute('transform', base); else el.removeAttribute('transform'); });
  }
  function ring(h, parent, x, y, col, ms) {     // anel que se expande e some (destaque de nó)
    const c = S('circle', { cx: x, cy: y, r: 1.8, fill: 'none', stroke: col || DRED, 'stroke-width': 0.5 }, parent);
    return h.tween(ms || 650, function (e) { c.setAttribute('r', 1.8 + 4.5 * e); c.style.opacity = 1 - e; }, E.out)
      .then(function () { c.remove(); });
  }
  function drawOn(h, el, ms) {                  // traça um path/linha
    const L = el.getTotalLength ? el.getTotalLength() : 0;
    if (!L) return h.wait(0);
    el.style.strokeDasharray = L; el.style.strokeDashoffset = L;
    return h.tween(ms || 450, function (e) { el.style.strokeDashoffset = L * (1 - e); })
      .then(function () { el.style.strokeDasharray = ''; el.style.strokeDashoffset = ''; });
  }
  function cellBase(c) { return 'translate(' + c.x + ',' + c.y + ')'; }

  // ---------- transformação genérica de um painel (estado de → para) ----------
  // fase 1: arcos removidos piscam e somem; fase 2 (junto): células trocam de lugar em arco, arcos invertem o
  // sentido, arcos novos crescem, pontilhados somem; fase 3: destaques e rótulos entram um a um;
  // fase 4: retângulo e seta são traçados.
  async function morph(h, P, from, to, opt) {
    opt = opt || {};
    const n = to.arr.length;
    const T = {};
    to.arr.forEach(function (a, k) { const b = to.arr[(k + 1) % n]; T[key(a, b)] = [a, b]; });
    if (P.sc.lay) {
      const removed = Object.keys(P.edges).filter(function (k) { return !T[k]; });
      if (removed.length) {
        await h.tween(260, function (e, t) {
          removed.forEach(function (k) {
            const ed = P.edges[k];
            ed.g.setAttribute('stroke', A.mix(ed.col, DRED, Math.min(1, t * 2)));
            ed.g.setAttribute('stroke-width', 0.4 + 0.5 * Math.sin(Math.PI * t));
          });
        }, E.linear);
        await h.wait(150);
        await h.tween(380, function (e) { removed.forEach(function (k) { P.edges[k].g.style.opacity = 1 - e; }); });
        removed.forEach(function (k) { P.edges[k].g.remove(); delete P.edges[k]; });
      }
    }
    // fase 2
    const jobs = [];
    const moves = [];
    to.arr.forEach(function (c, k) {
      const cl = P.cells[c];
      if (cl && cl.k !== k) moves.push({ cl: cl, x0: cl.x, x1: P.cx(k), k0: cl.k, k1: k });
    });
    if (moves.length) {
      // inversão de um trecho: o trecho gira 180° em torno do centro (como uma roda, achatada na vertical)
      const xs = moves.map(function (m) { return m.x0; });
      const xc = (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2;
      const rot = moves.every(function (m) { return Math.abs(m.x1 - (2 * xc - m.x0)) < 0.01; });
      jobs.push(h.tween(opt.moveMs || 1200, function (e) {
        moves.forEach(function (m) {
          let x, y;
          if (rot) {
            const d = m.x0 - xc, th = Math.PI * e;
            x = xc + d * Math.cos(th); y = m.cl.y - 0.6 * d * Math.sin(th);
          } else {
            const amp = 3 + 1.1 * Math.abs(m.k1 - m.k0), sgn = m.k1 > m.k0 ? -1 : 1;
            x = lerp(m.x0, m.x1, e); y = m.cl.y + sgn * amp * Math.sin(Math.PI * e);
          }
          m.cl.g.setAttribute('transform', 'translate(' + x + ',' + y + ')');
        });
      }).then(function () { moves.forEach(function (m) { m.cl.x = m.x1; m.cl.k = m.k1; m.cl.g.setAttribute('transform', cellBase(m.cl)); }); }));
    }
    if (P.sc.lay) {
      Object.keys(T).forEach(function (k) {
        const a = T[k][0], b = T[k][1], col = P.isRed(to, a, b) ? DRED : BLACK;
        const ed = P.edges[k];
        if (!ed) {                                     // arco novo: cresce de a até b
          const e2 = P.edge(a, b, col === DRED);
          const p = P.P(a), q = P.P(b);
          e2.head.style.opacity = 0;
          e2.line.setAttribute('x2', p[0]); e2.line.setAttribute('y2', p[1]);
          jobs.push(h.wait(opt.addDelay || 250).then(function () {
            return h.tween(650, function (e) {
              e2.line.setAttribute('x2', lerp(p[0], q[0], e)); e2.line.setAttribute('y2', lerp(p[1], q[1], e));
              e2.head.style.opacity = e > 0.85 ? (e - 0.85) / 0.15 : 0;
            });
          }));
        } else if (ed.a !== a) {                       // muda de sentido: a ponta troca de lado
          const p = P.P(a), q = P.P(b);
          const nh = S('path', { d: headD(p[0], p[1], q[0], q[1]) }, ed.g);
          nh.style.opacity = 0;
          const c0 = ed.col;
          jobs.push(h.tween(900, function (e) {
            ed.head.style.opacity = 1 - Math.min(1, e * 2);
            nh.style.opacity = Math.max(0, e * 2 - 1);
            ed.g.setAttribute('stroke', A.mix(c0, col, e));
          }).then(function () { ed.head.remove(); ed.head = nh; ed.a = a; ed.b = b; ed.col = col; }));
        } else if (ed.col !== col) {                   // só muda de cor (com um pulso)
          const c0 = ed.col;
          jobs.push(h.tween(600, function (e, t) {
            ed.g.setAttribute('stroke', A.mix(c0, col, e));
            ed.g.setAttribute('stroke-width', 0.4 + 0.5 * Math.sin(Math.PI * t));
          }).then(function () { ed.col = col; ed.g.setAttribute('stroke-width', 0.4); }));
        }
      });
      if (P.dots.length && !(to.dots || []).length) {
        const ds = P.dots.slice(); P.dots = [];
        jobs.push(h.wait(500).then(function () {
          return h.tween(400, function (e) { ds.forEach(function (d) { d.style.opacity = 1 - e; }); });
        }).then(function () { ds.forEach(function (d) { d.remove(); }); }));
      }
    }
    // rótulos que se deslocam ou saem
    const TL = {}; (to.labs || []).forEach(function (l) { TL[l[0]] = l; });
    Object.keys(P.labs).forEach(function (id) {
      const L = P.labs[id], t = TL[id];
      if (!t) { jobs.push(h.tween(300, function (e) { L.el.style.opacity = 1 - e; }).then(function () { L.el.remove(); delete P.labs[id]; })); return; }
      if (Math.abs(t[2] - L.x) > 0.01 || Math.abs(t[3] - L.y) > 0.01) {
        const x0 = L.x, y0 = L.y;
        jobs.push(h.tween(700, function (e) {
          L.el.setAttribute('x', lerp(x0, t[2], e)); L.el.setAttribute('y', lerp(y0, t[3], e));
        }).then(function () { L.x = t[2]; L.y = t[3]; }));
      }
    });
    await h.all(jobs);
    // fase 3: destaques (com o rótulo da cidade, se houver) e rótulos novos
    const hl = to.hl || {}, fromHl = from.hl || {};
    const news = (to.labs || []).filter(function (l) { return !P.labs[l[0]]; });
    const tied = {};
    news.forEach(function (l) { if (l[4] !== undefined) tied[l[4]] = true; });
    const fadeHl = function (c) {
      const cl = P.cells[c], f = hl[c]; if (!cl || !f) return h.wait(0);
      cl.r.setAttribute('fill', f[0]);
      return h.tween(350, function (e) { cl.r.setAttribute('fill-opacity', f[1] * e); });
    };
    const loose = Object.keys(hl).filter(function (c) { return !fromHl[c] && !tied[c]; });
    if (loose.length) await h.all(loose.map(fadeHl));
    for (let q = 0; q < news.length; q++) {
      const l = news[q];
      P.lab(l);
      const el = P.labs[l[0]].el, bb = el.getBBox();
      const w = [pop(h, el, bb.x + bb.width / 2, bb.y + bb.height / 2, 320)];
      if (l[4] !== undefined && !fromHl[l[4]]) w.push(fadeHl(l[4]));
      if (l[4] !== undefined && P.sc.lay && opt.ringNodes !== false) { const p = P.P(l[4]); w.push(ring(h, P.gg, p[0], p[1], hl[l[4]] ? hl[l[4]][0] : DRED)); }
      await h.all(w);
      await h.wait(opt.labGap || 160);
    }
    // fase 4
    if (to.rect && !P.rect) { await drawOn(h, P.mkRect(to.rect), 550); }
    if (to.arw && !P.arw) {
      const ar = P.mkArw(to.arw);
      ar.head.style.opacity = 0;
      await drawOn(h, ar.line, 350);
      await h.tween(150, function (e) { ar.head.style.opacity = e; });
    }
  }

  // ---------- componente ----------
  A.define('doisopt', function (host, opts) {
    const sc = SCENES[host.dataset.scene];
    const scale = parseFloat(host.dataset.scale || '1');
    host.innerHTML = '';
    const root = S('svg', { viewBox: '0 0 ' + sc.W + ' ' + sc.H, width: (sc.W * scale).toFixed(2) + 'pt', height: (sc.H * scale).toFixed(2) + 'pt' }, host);
    let panels = {};
    function build(stName) {
      while (root.firstChild) root.removeChild(root.firstChild);
      panels = {};
      const st = sc.states[stName] || {};
      ['L', 'R'].forEach(function (nm) { if (st[nm]) panels[nm] = new Panel(root, sc, nm, st[nm]); });
      return st;
    }

    // painel que aparece: cópia do painel da esquerda desliza até o lugar e depois se transforma
    async function copyAndMorph(h, from, to, nm, opt) {
      const src = clone(from.L);
      delete src.rect; delete src.arw;
      const da = sc.ax[nm] - sc.ax.L, dg = sc.gx[nm] - sc.gx.L;
      src.labs = shiftLabs(src.labs || [], da);
      const P = new Panel(root, sc, nm, src, { a: -da, g: -dg });
      panels[nm] = P;
      P.g.style.opacity = 0.25;
      await h.tween(800, function (e) {
        P.ga.setAttribute('transform', 'translate(' + (-da * (1 - e)) + ',0)');
        P.gg.setAttribute('transform', 'translate(' + (-dg * (1 - e)) + ',0)');
        P.g.style.opacity = 0.25 + 0.75 * Math.min(1, e * 1.5);
      });
      P.ga.removeAttribute('transform'); P.gg.removeAttribute('transform'); P.g.style.opacity = '';
      await h.wait(250);
      await morph(h, P, src, to[nm], opt);
    }

    // ----- transições especiais -----
    const CUSTOM = {
      // a rota é percorrida e montada no vetor
      't0>t1': async function (h) {
        const st = sc.states.t1, P = new Panel(root, sc, 'L', st.L);
        panels.L = P;
        const hide = [];
        Object.keys(P.edges).forEach(function (k) { P.edges[k].g.style.opacity = 0; hide.push(P.edges[k].g); });
        Object.keys(P.cells).forEach(function (c) { P.cells[c].g.style.opacity = 0; });
        P.dots.forEach(function (d) { d.style.opacity = 0; });
        P.gl.style.opacity = 0;
        Object.keys(P.nodes).forEach(function (c) { P.nodes[c].style.opacity = 0; });
        await h.all(Object.keys(P.nodes).map(function (c, q) {
          return h.wait(q * 45).then(function () { const p = P.P(+c); P.nodes[c].style.opacity = ''; return pop(h, P.nodes[c], p[0], p[1], 260); });
        }).concat([h.tween(400, function (e) { P.gl.style.opacity = e; })]));
        const arr = st.L.arr;
        for (let k = 0; k < arr.length; k++) {
          const a = arr[k], b = arr[(k + 1) % arr.length], cl = P.cells[a], ed = P.edges[key(a, b)];
          cl.g.style.opacity = '';
          const w = [pop(h, cl.g, 4, 4, 260, cellBase(cl)), ring(h, P.gg, P.P(a)[0], P.P(a)[1], BLUE, 500)];
          const p = P.P(a), q = P.P(b);
          ed.g.style.opacity = ''; ed.head.style.opacity = 0;
          ed.line.setAttribute('x2', p[0]); ed.line.setAttribute('y2', p[1]);
          w.push(h.tween(300, function (e) {
            ed.line.setAttribute('x2', lerp(p[0], q[0], e)); ed.line.setAttribute('y2', lerp(p[1], q[1], e));
            ed.head.style.opacity = e > 0.8 ? (e - 0.8) / 0.2 : 0;
          }));
          await h.all(w);
        }
        await h.tween(400, function (e) { P.dots.forEach(function (d) { d.style.opacity = e; }); });
      },
      't1>t2': function (h, a, b) { build('t1'); return copyAndMorph(h, sc.states[a], sc.states[b], 'R'); },
      't3>t4': async function (h, a, b) {
        build(a);
        await morph(h, panels.L, sc.states[a].L, sc.states[b].L);
        await h.wait(200);
        // i e j+1 não mudaram: pulsam nos dois vetores
        const w = [];
        ['L', 'R'].forEach(function (nm) {
          [1, 7].forEach(function (c) { const cl = panels[nm].cells[c]; w.push(bump(h, cl.g, 4, 4, 0.3, 700, cellBase(cl))); });
        });
        await h.all(w);
      },
      't4>t5': async function (h, a, b) {
        build(a);
        await morph(h, panels.R, sc.states[a].R, sc.states[b].R);
        // cópias das células i+1..j voam da esquerda para a direita, em ordem invertida
        const L = panels.L, R = panels.R, arrL = sc.states[a].L.arr, arrR = sc.states[b].R.arr;
        const fly = [];
        for (let k = 2; k <= 6; k++) {
          const c = arrL[k], kr = arrR.indexOf(c);
          const gh = S('g', { transform: 'translate(' + L.cx(k) + ',' + sc.cy + ')' }, root);
          S('rect', { x: 0, y: 0, width: CELL, height: CELL, fill: DRED, 'fill-opacity': 0.15, stroke: DRED, 'stroke-width': 0.5 }, gh);
          const t = S('text', { x: 4, y: VAL, 'font-size': FS, 'font-family': MAIN, 'text-anchor': 'middle', fill: DRED }, gh);
          t.textContent = c;
          const x0 = L.cx(k), x1 = R.cx(kr);
          fly.push(h.wait((k - 2) * 180).then(function () {
            return h.tween(900, function (e) {
              gh.setAttribute('transform', 'translate(' + lerp(x0, x1, e) + ',' + (sc.cy - 9 * Math.sin(Math.PI * e)) + ')');
            });
          }).then(function () {
            const cl = R.cells[c];
            return h.all([h.tween(300, function (e) { gh.style.opacity = 1 - e; }), bump(h, cl.g, 4, 4, 0.25, 400, cellBase(cl))]);
          }).then(function () { gh.remove(); }));
        }
        await h.all(fly);
      },
      // slide 23: j = último elemento, j+1 = primeiro (o arco 7 → 0 "dá a volta")
      'w1>w1b': async function (h) {
        build('w1');
        const P = panels.L, c7 = P.cells[7], c0 = P.cells[0];
        const y = sc.cy + CELL, x7 = c7.x + 4, x0 = c0.x + 4;
        const path = S('path', { d: 'M' + x7 + ',' + y + 'C' + x7 + ',' + (y + 6) + ' ' + x0 + ',' + (y + 6) + ' ' + x0 + ',' + (y + 0.6),
          stroke: DRED, 'stroke-width': 0.5, fill: 'none', 'stroke-dasharray': '1.5 1' }, root);
        const hd = S('path', { d: 'M' + x0 + ',' + y + 'L' + (x0 - 1) + ',' + (y + 3) + 'L' + (x0 + 1) + ',' + (y + 3) + 'Z', fill: DRED }, root);
        hd.style.opacity = 0; path.style.opacity = 0;
        await h.all([bump(h, P.labs.j.el, P.labs.j.x + 1, P.labs.j.y - 1.5, 0.4, 600), bump(h, c7.g, 4, 4, 0.3, 600, cellBase(c7))]);
        const L = path.getTotalLength();
        path.style.strokeDasharray = L; path.style.strokeDashoffset = L; path.style.opacity = '';
        await h.tween(800, function (e) { path.style.strokeDashoffset = L * (1 - e); });
        path.style.strokeDasharray = '1.5 1'; path.style.strokeDashoffset = '';
        hd.style.opacity = 1;
        const ed = P.edges[key(7, 0)];
        await h.all([bump(h, P.labs.j1.el, P.labs.j1.x + 3, P.labs.j1.y - 1.5, 0.4, 600), bump(h, c0.g, 4, 4, 0.3, 600, cellBase(c0)),
          h.tween(700, function (e, t) { ed.g.setAttribute('stroke-width', 0.4 + 0.6 * Math.sin(Math.PI * t)); }, E.linear)]);
        await h.wait(1600);
        await h.tween(500, function (e) { path.style.opacity = 1 - e; hd.style.opacity = 1 - e; });
        path.remove(); hd.remove();
      },
      'w1b>w2': function (h, a, b) { build(a); return copyAndMorph(h, sc.states[a], sc.states[b], 'R', { moveMs: 1100 }); },
      'a0>a1': async function (h, a, b) {
        build(a);
        const P = panels.L;
        // os dois arcos vermelhos são adjacentes (compartilham o 0)
        await h.all([ring(h, P.gg, P.P(0)[0], P.P(0)[1], DRED, 800), bump(h, P.cells[0].g, 4, 4, 0.3, 700, cellBase(P.cells[0]))]);
        await copyAndMorph(h, sc.states[a], sc.states[b], 'R', { moveMs: 1300 });
      },
      // índices: o par (i, i+1) desliza célula a célula
      'x6>x7': async function (h) {
        build('x6');
        const P = panels.L;
        const ids = [['i_', XI2[0], XI[0]], ['i1_', XI2[1], XI[1]]];
        ids.forEach(function (d) { P.lab([d[0], d[1][1], d[2][2], d[2][3]]); P.labs[d[0]].el.style.opacity = 0; });
        await h.tween(250, function (e) { ids.forEach(function (d) { P.labs[d[0]].el.style.opacity = e; }); });
        const hops = 4;
        for (let s = 1; s <= hops; s++) {
          await h.tween(300, function (e) {
            ids.forEach(function (d) {
              const x0 = d[2][2], x1 = d[1][2], y0 = d[2][3], y1 = d[1][3];
              const u = (s - 1 + e) / hops;
              P.labs[d[0]].el.setAttribute('x', lerp(x0, x1, u));
              P.labs[d[0]].el.setAttribute('y', lerp(y0, y1, u) - 1.6 * Math.sin(Math.PI * e));
            });
          });
          const cl = P.cells[sc.states.x7.L.arr[s]];
          await h.all([bump(h, cl.g, 4, 4, 0.18, 220, cellBase(cl)), h.wait(120)]);
        }
        ids.forEach(function (d) { P.labs[d[0]].x = d[1][2]; P.labs[d[0]].y = d[1][3]; });
        // por que para aqui: i+1, j e j+1 ocupam as 3 últimas células
        const w = [];
        [5, 6, 7].forEach(function (k, q) {
          const cl = P.cells[sc.states.x7.L.arr[k]];
          cl.r.setAttribute('fill', DRED);
          w.push(h.wait(q * 120).then(function () { return h.tween(700, function (e, t) { cl.r.setAttribute('fill-opacity', 0.25 * Math.sin(Math.PI * t)); }, E.linear); })
            .then(function () { cl.r.setAttribute('fill-opacity', 0); }));
        });
        await h.all(w);
      },
      'x7>x8': async function (h) {
        build('x7');
        const P = panels.L;
        await h.tween(350, function (e) { Object.keys(P.labs).forEach(function (id) { P.labs[id].el.style.opacity = 1 - e; }); });
        Object.keys(P.labs).forEach(function (id) { P.labs[id].el.remove(); delete P.labs[id]; });
        // j começa em i + 2 (com i = 0)
        const gi = [['gi', 'i', 6.42, 7.39], ['gi1', 'i+1', 11.13, 7.24]];
        gi.forEach(function (l) { P.lab(l); P.labs[l[0]].el.setAttribute('fill', '#999999'); P.labs[l[0]].el.style.opacity = 0; });
        await h.tween(250, function (e) { gi.forEach(function (l) { P.labs[l[0]].el.style.opacity = e; }); });
        for (let q = 0; q < 2; q++) {
          const l = XJ[q]; P.lab(l);
          const el = P.labs[l[0]].el, bb = el.getBBox();
          await pop(h, el, bb.x + bb.width / 2, bb.y + bb.height / 2, 300);
        }
        await h.wait(300);
        await h.tween(300, function (e) { gi.forEach(function (l) { P.labs[l[0]].el.style.opacity = 1 - e; }); });
        gi.forEach(function (l) { P.labs[l[0]].el.remove(); delete P.labs[l[0]]; });
        // o segundo par desliza até o fim
        const ids = [['j_', XJ[2], XJ[0]], ['j1_', XJ[3], XJ[1]]];
        ids.forEach(function (d) { P.lab([d[0], d[1][1], d[2][2], d[2][3]]); });
        const hops = 4;
        for (let s = 1; s <= hops; s++) {
          await h.tween(300, function (e) {
            ids.forEach(function (d) {
              const u = (s - 1 + e) / hops;
              P.labs[d[0]].el.setAttribute('x', lerp(d[2][2], d[1][2], u));
              P.labs[d[0]].el.setAttribute('y', lerp(d[2][3], d[1][3], u) - 1.6 * Math.sin(Math.PI * e));
            });
          });
          await h.wait(120);
        }
      },
      // slide 20: j + 1 é o último elemento
      'x8>x8b': async function (h) {
        build('x8');
        const P = panels.L, cl = P.cells[7], L1 = P.labs.j1_;
        cl.r.setAttribute('fill', GREEN);
        await h.all([h.tween(900, function (e, t) { cl.r.setAttribute('fill-opacity', 0.35 * Math.sin(Math.PI * t)); }, E.linear),
          bump(h, cl.g, 4, 4, 0.25, 600, cellBase(cl)), bump(h, L1.el, L1.x + 4, L1.y - 1.5, 0.35, 600)]);
        cl.r.setAttribute('fill-opacity', 0);
      },
      'x0>x6': async function (h) {
        build('x0');
        const P = panels.L;
        for (let q = 0; q < XI.length; q++) {
          const l = XI[q]; P.lab(l);
          const el = P.labs[l[0]].el, bb = el.getBBox();
          await pop(h, el, bb.x + bb.width / 2, bb.y + bb.height / 2, 300);
        }
      }
    };

    return {
      snap: function (st) { build(st); },
      play: async function (a, b, h) {
        const c = CUSTOM[a + '>' + b];
        if (c) { if (a === 't0') build('t0'); return c(h, a, b); }
        const sa = sc.states[a], sb = sc.states[b];
        build(a);
        for (const nm of ['L', 'R']) {
          if (!sb[nm]) continue;
          if (!panels[nm]) { await copyAndMorph(h, sa, sb, nm); continue; }
          await morph(h, panels[nm], sa[nm], sb[nm]);
        }
      }
    };
  });

  // ---------- inversão de um vetor (img/inverte1…5) ----------
  const INV = {
    W: 64.4, H: 24.4,
    states: {
      v0: { arr: A0, br: null }, v1: { arr: A0, br: [0, 7] }, v2: { arr: [7, 1, 6, 5, 4, 3, 2, 0], br: [1, 6] },
      v3: { arr: [7, 2, 6, 5, 4, 3, 1, 0], br: [2, 5] }, v4: { arr: [7, 2, 3, 5, 4, 6, 1, 0], br: [3, 4] },
      v5: { arr: [7, 2, 3, 4, 5, 6, 1, 0], br: null }
    }
  };
  const cX = function (k) { return 4.2 + CELL * k; };
  function brTop(c1, c2) { return 'M' + c2 + ',8.2V0.2H' + c1 + 'V8.2'; }
  function brBot(c1, c2) { return 'M' + c1 + ',16.2V24.2H' + c2 + 'V16.2'; }
  function hdDown(x) { return 'M' + x + ',8.2L' + (x + 1) + ',5.2L' + (x - 1) + ',5.2Z'; }
  function hdUp(x) { return 'M' + x + ',16.2L' + (x - 1) + ',19.2L' + (x + 1) + ',19.2Z'; }

  A.define('inverte', function (host) {
    const scale = parseFloat(host.dataset.scale || '1');
    host.innerHTML = '';
    const root = S('svg', { viewBox: '0 0 ' + INV.W + ' ' + INV.H, width: (INV.W * scale).toFixed(2) + 'pt', height: (INV.H * scale).toFixed(2) + 'pt' }, host);
    let R = {};
    function build(stName) {
      while (root.firstChild) root.removeChild(root.firstChild);
      const st = INV.states[stName];
      R = { vals: {}, br: null };
      const gc = S('g', {}, root);
      st.arr.forEach(function (v, k) {
        S('rect', { x: 0.2 + CELL * k, y: 8.2, width: CELL, height: CELL, fill: 'none', stroke: BLACK, 'stroke-width': 0.4 }, gc);
      });
      st.arr.forEach(function (v, k) {
        const t = S('text', { x: cX(k), y: 8.2 + VAL, 'font-size': FS, 'font-family': MAIN, 'text-anchor': 'middle', fill: BLACK }, root);
        t.textContent = v;
        R.vals[k] = t;
      });
      if (st.br) R.br = mkBr(st.br[0], st.br[1]);
      return st;
    }
    function mkBr(p1, p2) {
      const g = S('g', { stroke: BLACK, 'stroke-width': 0.4 }, root);
      const c1 = cX(p1), c2 = cX(p2);
      const top = S('path', { d: brTop(c1, c2), fill: 'none' }, g), bot = S('path', { d: brBot(c1, c2), fill: 'none' }, g);
      const h1 = S('path', { d: hdDown(c1), fill: BLACK }, g), h2 = S('path', { d: hdUp(c2), fill: BLACK }, g);
      return { g: g, top: top, bot: bot, h1: h1, h2: h2, c1: c1, c2: c2 };
    }
    function setBr(b, c1, c2) {
      b.top.setAttribute('d', brTop(c1, c2)); b.bot.setAttribute('d', brBot(c1, c2));
      b.h1.setAttribute('d', hdDown(c1)); b.h2.setAttribute('d', hdUp(c2));
      b.c1 = c1; b.c2 = c2;
    }
    // ponto a uma fração u de uma poligonal
    function along(pts, u) {
      let L = 0; const seg = [];
      for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
      let d = u * L;
      for (let i = 0; i < seg.length; i++) {
        if (d <= seg[i] || i === seg.length - 1) { const f = seg[i] ? Math.min(1, d / seg[i]) : 1; return [lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f)]; }
        d -= seg[i];
      }
      return pts[pts.length - 1];
    }
    return {
      snap: function (st) { build(st); },
      play: async function (a, b, h) {
        const sa = build(a), sb = INV.states[b];
        if (!sa.br && sb.br) {             // as setas são traçadas
          const br = mkBr(sb.br[0], sb.br[1]);
          br.h1.style.opacity = 0; br.h2.style.opacity = 0;
          await h.all([drawOn(h, br.top, 700), drawOn(h, br.bot, 700)]);
          await h.tween(200, function (e) { br.h1.style.opacity = e; br.h2.style.opacity = e; });
          return;
        }
        if (!sa.br) return;
        const p1 = sa.br[0], p2 = sa.br[1], c1 = cX(p1), c2 = cX(p2);
        const t1 = R.vals[p1], t2 = R.vals[p2];
        // o elemento de p2 vai por cima (seta de cima, até p1); o de p1 vai por baixo (até p2)
        const top = [[c2, 12.2], [c2, 0.2], [c1, 0.2], [c1, 12.2]], bot = [[c1, 12.2], [c1, 24.2], [c2, 24.2], [c2, 12.2]];
        const dy = VAL + 8.2 - 12.2;
        t1.setAttribute('fill', DRED); t2.setAttribute('fill', DRED);
        await h.all([bump(h, t1, c1, 12.2, 0.35, 400), bump(h, t2, c2, 12.2, 0.35, 400)]);
        await h.tween(1300, function (e) {
          const q2 = along(top, e), q1 = along(bot, e);
          t2.setAttribute('x', q2[0]); t2.setAttribute('y', q2[1] + dy);
          t1.setAttribute('x', q1[0]); t1.setAttribute('y', q1[1] + dy);
        });
        await h.tween(300, function (e) { const c = A.mix(DRED, BLACK, e); t1.setAttribute('fill', c); t2.setAttribute('fill', c); });
        await h.wait(200);
        if (sb.br) {                        // as setas se fecham para o par seguinte
          const n1 = cX(sb.br[0]), n2 = cX(sb.br[1]);
          await h.tween(600, function (e) { setBr(R.br, lerp(c1, n1, e), lerp(c2, n2, e)); });
        } else if (R.br) {
          const g = R.br.g;
          await h.tween(500, function (e) { g.style.opacity = 1 - e; });
        }
      }
    };
  });
})();
