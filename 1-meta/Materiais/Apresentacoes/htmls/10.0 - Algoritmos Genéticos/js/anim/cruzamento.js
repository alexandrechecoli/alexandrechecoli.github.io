/* Cruzamentos PMX e OX (aula 10, frames 75–82): vetores dos pais e dos filhos redesenhados a partir de um
 * "exemplo" (pais p1, p2 e os pontos de corte), com a geometria das figuras do Ipe (img/PMX1…5, img/OX1…3):
 * células de 12 pt nas linhas y = 8.2 (p1), 32.2 (p2), 56.2 (o1), 80.2 (o2), colunas a partir de x = 16.2;
 * interior de p1/o2 em vermelho #8b0000 e de p2/o1 em azul #00008b (opacidade 0.3); cortes verticais de y = 0.2 a
 * 52.2; setas do mapeamento (PMX4–5) e setas de varredura vermelhas (OX2–3); números preenchidos pelo OX em #a52a2a.
 * Com o exemplo original, o estado final de cada slide é a figura do PDF.
 *
 * Uso: <span class="anim cruz" data-anim="cruz" data-from="p1" data-state="p2"><img ...figura do PDF...></span>
 *   (a <img> fica invisível e reserva o espaço: o layout e os ajustes do slides.js não mudam)
 * Estados: vazio · p1 (PMX1) · p2 (PMX2) · p3 · p4 · p5 · x1 (OX1) · x2 · x3
 * Transições (→):
 *   vazio→p1  as células dos pais surgem da esquerda para a direita
 *   p1→p2     os cortes descem, os interiores se destacam, as linhas dos filhos surgem e os interiores descem
 *             trocados (p2 → o1, p1 → o2)
 *   p2→p3     o resto de cada pai é copiado posição a posição; o que já está no interior do filho pisca em
 *             vermelho (✗) e a posição fica vaga
 *   p3→p4     as setas do mapeamento são traçadas, par a par
 *   p4→p5     cada vaga segue a cadeia do mapeamento (o valor original → a seta → o valor mapeado, repetindo se
 *             ele também já estiver no filho) e o valor final desce para a vaga
 *   p5→x1     as setas e o que o PMX preencheu fora do interior somem (o OX começa igual)
 *   x1→x2     varredura de p2 a partir do 2º corte, "dando a volta": a seta vermelha cresce sob p2, os valores
 *             já presentes em o2 recebem ✗ e os outros descem para a próxima posição livre de o2
 *   x2→x3     idem para o1, varrendo p1
 * Botões abaixo da figura (todos os slides PMX/OX usam o mesmo exemplo): "novo exemplo" sorteia pais e
 * cortes; "original" volta ao exemplo do PDF. A tecla R repete a animação do slide com o exemplo atual.
 */
(function () {
  'use strict';
  const A = window.Anim;
  if (!A) return;
  const S = A.svg, E = A.ease, lerp = A.lerp;
  const W = 124.4, H = 92.4;
  const RED = '#8b0000', BLUE = '#00008b', BROWN = '#a52a2a', BLACK = '#000000', HI = '#e0a000';
  const MAIN = 'KaTeX_Main, serif', MATH = 'KaTeX_Math, serif', SANS = '"LM Sans 8", "LM Sans", sans-serif';
  const ROWS = ['p1', 'p2', 'o1', 'o2'];
  const TOP = { p1: 8.2, p2: 32.2, o1: 56.2, o2: 80.2 };
  const X0 = 16.2, C = 12, N = 9;
  const cx = function (i) { return X0 + C * i; };
  const SUB = { p1: '1', p2: '2', o1: '1', o2: '2' };

  // ---------- o exemplo (compartilhado por todos os slides) ----------
  const ORIG = { p1: [1, 2, 3, 4, 5, 6, 7, 8, 9], p2: [4, 5, 2, 1, 8, 7, 6, 9, 3], a: 3, b: 7 };
  let EX = JSON.parse(JSON.stringify(ORIG));
  const insts = [];
  function shuffle(v) {
    for (let i = v.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = v[i]; v[i] = v[j]; v[j] = t; }
    return v;
  }
  function randomEx() {
    const len = 3 + Math.floor(Math.random() * 3);              // interior de 3 a 5
    const a = 1 + Math.floor(Math.random() * (N - len - 1));    // sempre sobra algo dos dois lados
    return { p1: shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]), p2: shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]), a: a, b: a + len };
  }
  const isOrig = function () { return JSON.stringify(EX) === JSON.stringify(ORIG); };

  // ---------- os algoritmos ----------
  function solve(ex) {
    const p1 = ex.p1, p2 = ex.p2, a = ex.a, b = ex.b;
    const inside = function (i) { return i >= a && i < b; };
    const in1 = p2.slice(a, b), in2 = p1.slice(a, b);           // interior de o1 (vem de p2) e de o2 (de p1)
    const outer = []; for (let i = 0; i < N; i++) if (!inside(i)) outer.push(i);
    const base = { o1: [], o2: [] };
    for (let i = 0; i < N; i++) { base.o1.push(inside(i) ? p2[i] : null); base.o2.push(inside(i) ? p1[i] : null); }
    // PMX: cópia direta do outro pai (vaga se já estiver no interior) e depois o mapeamento
    const pmx3 = { o1: base.o1.slice(), o2: base.o2.slice() }, pmx5 = { o1: null, o2: null }, chains = { o1: {}, o2: {} };
    outer.forEach(function (i) {
      if (in1.indexOf(p1[i]) < 0) pmx3.o1[i] = p1[i];
      if (in2.indexOf(p2[i]) < 0) pmx3.o2[i] = p2[i];
    });
    pmx5.o1 = pmx3.o1.slice(); pmx5.o2 = pmx3.o2.slice();
    outer.forEach(function (i) {
      if (pmx3.o1[i] === null) {      // o1: valor de p1 já está no interior (que veio de p2) -> segue p2[k] ↔ p1[k]
        let v = p1[i]; const ch = [];
        while (in1.indexOf(v) >= 0) { const k = p2.indexOf(v); ch.push(k); v = p1[k]; }
        pmx5.o1[i] = v; chains.o1[i] = ch;
      }
      if (pmx3.o2[i] === null) {
        let v = p2[i]; const ch = [];
        while (in2.indexOf(v) >= 0) { const k = p1.indexOf(v); ch.push(k); v = p2[k]; }
        pmx5.o2[i] = v; chains.o2[i] = ch;
      }
    });
    // OX: varre o outro pai a partir do 2º corte, dando a volta, e preenche as posições livres a partir do 2º corte
    function ox(parent, interior, child) {
      const out = child.slice(), slots = [], scan = [];
      for (let q = 0; q < N; q++) { const i = (b + q) % N; if (!inside(i)) slots.push(i); }
      let s = 0;
      for (let q = 0; q < N && s < slots.length; q++) {
        const j = (b + q) % N, v = parent[j];
        if (interior.indexOf(v) >= 0) scan.push({ j: j, v: v, skip: true });
        else { scan.push({ j: j, v: v, to: slots[s] }); out[slots[s]] = v; s++; }
      }
      return { vals: out, scan: scan };
    }
    const ox1 = ox(p1, in1, base.o1), ox2 = ox(p2, in2, base.o2);
    return { a: a, b: b, outer: outer, inside: inside, base: base, pmx3: pmx3, pmx5: pmx5, chains: chains, ox1: ox1, ox2: ox2 };
  }

  // segmentos da seta de varredura: do 2º corte até a última posição varrida (sem passar do fim) e, se deu a
  // volta, do início até a última
  function scanSegs(scan, b) {
    const last = scan[scan.length - 1].j;
    if (last >= b) return [[cx(b), cx(last) + C]];
    return [[cx(b), cx(N)], [cx(0), cx(last) + C]];
  }

  // ---------- modelo de cada estado ----------
  function model(st, R) {
    const m = { rows: { p1: EX.p1, p2: EX.p2 }, tint: false, cuts: false, map: false, scan: null, red: { o1: {}, o2: {} } };
    if (st === 'vazio') { m.rows = {}; return m; }
    if (st === 'p1') return m;
    m.tint = true; m.cuts = true;
    if (st === 'p2' || st === 'x1') { m.rows.o1 = R.base.o1; m.rows.o2 = R.base.o2; return m; }
    if (st === 'p3' || st === 'p4') { m.rows.o1 = R.pmx3.o1; m.rows.o2 = R.pmx3.o2; m.map = st === 'p4'; return m; }
    if (st === 'p5') { m.rows.o1 = R.pmx5.o1; m.rows.o2 = R.pmx5.o2; m.map = true; return m; }
    m.rows.o2 = R.ox2.vals; R.outer.forEach(function (i) { m.red.o2[i] = true; });
    if (st === 'x2') { m.rows.o1 = R.base.o1; m.scan = 'p2'; return m; }
    m.rows.o1 = R.ox1.vals; R.outer.forEach(function (i) { m.red.o1[i] = true; }); m.scan = 'p1';
    return m;
  }

  // ---------- desenho ----------
  // posições x das setas do mapeamento no PDF (desenhadas à mão no Ipe); nos outros exemplos, o centro da célula
  const MAPX = { 3: 58.23, 4: 70.17, 5: 82.46, 6: 94.36 };
  const mapX = function (k) { return isOrig() ? MAPX[k] : cx(k) + 6.03; };
  const tintOf = function (r) { return r === 'p1' || r === 'o2' ? RED : BLUE; };

  function digit(parent, v, r, i, color) {
    const t = S('text', { x: cx(i) + 3.53, y: TOP[r] + 9.04, 'font-size': 9.96, 'font-family': MAIN, fill: color || BLACK }, parent);
    t.textContent = v;
    return t;
  }
  function headOpen(x, y, dir) {    // seta aberta do Ipe (tamanho 3): dir = -1 para cima, +1 para baixo
    return 'M' + (x - 1) + ',' + (y - 3 * dir) + 'L' + x + ',' + y + 'L' + (x + 1) + ',' + (y - 3 * dir);
  }
  function mapArrow(parent, k) {
    const x = mapX(k), g = S('g', { stroke: BLACK, 'stroke-width': 0.4, fill: 'none' }, parent);
    S('line', { x1: x, y1: 32.29, x2: x, y2: 20.29 }, g);
    S('path', { d: headOpen(x, 20.29, -1) }, g);
    S('path', { d: headOpen(x, 32.29, 1) }, g);
    return g;
  }
  function scanArrow(parent, x1, x2, y) {
    const g = S('g', {}, parent);
    const ln = S('line', { x1: x1, y1: y, x2: x2, y2: y, stroke: RED, 'stroke-width': 0.4 }, g);
    const hd = S('path', { d: '', fill: RED, stroke: RED, 'stroke-width': 0.4 }, g);
    const set = function (xe) {
      ln.setAttribute('x2', xe);
      hd.setAttribute('d', 'M' + xe + ',' + y + 'L' + (xe - 3) + ',' + (y - 1) + 'L' + (xe - 3) + ',' + (y + 1) + 'Z');
    };
    set(x2);
    return { g: g, set: set };
  }

  function build(svg, st) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const R = solve(EX), m = model(st, R);
    const L = { R: R, m: m, cells: {}, digits: {}, labels: {}, cuts: [], maps: {}, scans: [] };
    L.gGrid = S('g', {}, svg); L.gTxt = S('g', {}, svg); L.gDeco = S('g', {}, svg); L.gFx = S('g', {}, svg);
    ROWS.forEach(function (r) {
      const vals = m.rows[r]; if (!vals) return;
      const lg = S('g', {}, L.gTxt);
      const t = S('text', { x: 3.44, y: TOP[r] + (r[0] === 'p' ? 7.8 : 7.81), 'font-size': 9.96, 'font-family': MATH, 'font-style': 'italic', fill: BLACK }, lg);
      t.textContent = r[0];
      const s = S('text', { x: r[0] === 'p' ? 8.45 : 8.27, y: TOP[r] + 9.3, 'font-size': 6.97, 'font-family': MAIN, fill: BLACK }, lg);
      s.textContent = SUB[r];
      L.labels[r] = lg;
      L.cells[r] = []; L.digits[r] = [];
      for (let i = 0; i < N; i++) {
        const g = S('g', {}, L.gGrid);
        let tint = null;
        if (m.tint && R.inside(i)) tint = S('rect', { x: cx(i), y: TOP[r], width: C, height: C, fill: tintOf(r), 'fill-opacity': 0.3 }, g);
        S('rect', { x: cx(i), y: TOP[r], width: C, height: C, fill: 'none', stroke: BLACK, 'stroke-width': 0.4 }, g);
        L.cells[r].push({ g: g, tint: tint });
        L.digits[r].push(vals[i] === null ? null : digit(L.gTxt, vals[i], r, i, m.red[r] && m.red[r][i] ? BROWN : BLACK));
      }
    });
    if (m.cuts) [R.a, R.b].forEach(function (k) {
      L.cuts.push(S('line', { x1: cx(k), y1: 0.2, x2: cx(k), y2: 52.2, stroke: BLACK, 'stroke-width': 0.4 }, L.gDeco));
    });
    if (m.map) for (let k = R.a; k < R.b; k++) L.maps[k] = mapArrow(L.gDeco, k);
    if (m.scan) {
      const sc = m.scan === 'p1' ? R.ox1.scan : R.ox2.scan, y = m.scan === 'p1' ? 24.2 : 48.2;
      scanSegs(sc, R.b).forEach(function (sg) { L.scans.push(scanArrow(L.gDeco, sg[0], sg[1], y)); });
    }
    return L;
  }

  // ---------- efeitos ----------
  const ctr = function (r, i) { return [cx(i) + 6, TOP[r] + 6]; };
  function scaleAbout(el, x, y, s) { el.setAttribute('transform', 'translate(' + x + ',' + y + ') scale(' + s + ') translate(' + (-x) + ',' + (-y) + ')'); }
  function flash(L, h, r, i, color, dur) {      // contorno que acende e apaga sobre uma célula
    const rc = S('rect', { x: cx(i) - 0.6, y: TOP[r] - 0.6, width: C + 1.2, height: C + 1.2, rx: 1, fill: 'none', stroke: color || HI, 'stroke-width': 1.1, opacity: 0 }, L.gFx);
    return h.tween(dur || 600, function (e) { rc.setAttribute('opacity', Math.sin(Math.PI * e).toFixed(3)); }, E.linear)
      .then(function () { rc.remove(); });
  }
  function mark(L, r, i, color) {               // contorno que fica aceso (cursor); devolve a função que o remove
    const rc = S('rect', { x: cx(i) - 0.6, y: TOP[r] - 0.6, width: C + 1.2, height: C + 1.2, rx: 1, fill: 'none', stroke: color || HI, 'stroke-width': 1.1 }, L.gFx);
    return function () { rc.remove(); };
  }
  function fly(L, h, v, r0, i0, r1, i1, dur, color, tile) {   // número (com o fundo da célula, se tile) voando de uma célula a outra
    const g = S('g', {}, L.gFx);
    if (tile) S('rect', { x: 0, y: 0, width: C, height: C, fill: tile, 'fill-opacity': 0.3 }, g);
    const t = S('text', { x: 3.53, y: 9.04, 'font-size': 9.96, 'font-family': MAIN, fill: color || BLACK }, g);
    t.textContent = v;
    const x0 = cx(i0), y0 = TOP[r0], x1 = cx(i1), y1 = TOP[r1];
    const arc = Math.min(10, Math.abs(x1 - x0) * 0.15 + Math.abs(y1 - y0) * 0.05);
    return h.tween(dur, function (e) {
      const x = lerp(x0, x1, e), y = lerp(y0, y1, e) - arc * Math.sin(Math.PI * e);
      g.setAttribute('transform', 'translate(' + x + ',' + y + ')');
    }).then(function () { return g; });
  }
  function cross(L, h, r, i) {                  // ✗ vermelho sobre uma célula
    const [x, y] = ctr(r, i), g = S('g', { stroke: '#cc0000', 'stroke-width': 1.2, 'stroke-linecap': 'round', opacity: 0 }, L.gFx);
    S('line', { x1: x - 3.2, y1: y - 3.2, x2: x + 3.2, y2: y + 3.2 }, g);
    S('line', { x1: x - 3.2, y1: y + 3.2, x2: x + 3.2, y2: y - 3.2 }, g);
    return h.tween(220, function (e) { g.setAttribute('opacity', e); scaleAbout(g, x, y, lerp(1.6, 1, e)); }, E.out).then(function () { return g; });
  }
  function popIn(h, el, x, y, dur) {
    el.setAttribute('opacity', 0);
    return h.tween(dur || 320, function (e) { el.setAttribute('opacity', Math.min(1, e * 1.5)); scaleAbout(el, x, y, lerp(0.3, 1, E.back(e))); }, E.linear)
      .then(function () { el.removeAttribute('transform'); });
  }
  function fade(h, els, a, b, dur) {
    return h.tween(dur || 350, function (e) { els.forEach(function (el) { if (el) el.setAttribute('opacity', lerp(a, b, e)); }); });
  }
  function hideAll(els) { els.forEach(function (el) { if (el) el.setAttribute('opacity', 0); }); }
  // legenda abaixo da figura, durante a animação; "§o1" vira o₁ (itálico + subscrito)
  function say(L, txt) {
    if (!L.cap) L.cap = S('text', { x: W / 2, y: 104, 'text-anchor': 'middle', 'font-size': 6.2, 'font-family': SANS, fill: '#444' }, L.gFx);
    while (L.cap.firstChild) L.cap.removeChild(L.cap.firstChild);
    (txt || '').split(/(§[po][12])/).forEach(function (part) {
      if (!part) return;
      if (part[0] !== '§') { S('tspan', {}, L.cap).textContent = part; return; }
      S('tspan', { 'font-style': 'italic' }, L.cap).textContent = part[1];
      S('tspan', { 'font-size': 4.6, dy: 1.2 }, L.cap).textContent = part[2];
      S('tspan', { dy: -1.2 }, L.cap).textContent = '​';
    });
  }
  const sub = function (r) { return '§' + r; };

  // ---------- transições ----------
  const PLAYS = {
    'vazio>p1': async function (svg, h) {
      const L = build(svg, 'p1');
      ['p1', 'p2'].forEach(function (r) { hideAll([L.labels[r]].concat(L.cells[r].map(function (c) { return c.g; }), L.digits[r])); });
      await fade(h, [L.labels.p1, L.labels.p2], 0, 1, 300);
      const jobs = [];
      ['p1', 'p2'].forEach(function (r, ri) {
        for (let i = 0; i < N; i++) jobs.push(h.wait(ri * 260 + i * 70).then(function () {
          const [x, y] = ctr(r, i);
          return h.all([popIn(h, L.cells[r][i].g, x, y), popIn(h, L.digits[r][i], x, y)]);
        }));
      });
      await h.all(jobs);
    },

    'p1>p2': async function (svg, h) {
      const L = build(svg, 'p2'), R = L.R;
      const oEls = ['o1', 'o2'].reduce(function (acc, r) { return acc.concat([L.labels[r]], L.cells[r].map(function (c) { return c.g; }), L.digits[r]); }, []);
      hideAll(oEls);
      const tints = ['p1', 'p2'].reduce(function (acc, r) { return acc.concat(L.cells[r].map(function (c) { return c.tint; })); }, []);
      hideAll(tints);
      say(L, 'dois pontos de corte aleatórios');
      L.cuts.forEach(function (c) { c.setAttribute('y2', 0.2); });
      await h.tween(500, function (e) { L.cuts.forEach(function (c) { c.setAttribute('y2', lerp(0.2, 52.2, e)); }); });
      await fade(h, tints, 0, 1, 400);
      await h.wait(150);
      // linhas dos filhos (vazias)
      const pops = [];
      ['o1', 'o2'].forEach(function (r, ri) {
        pops.push(fade(h, [L.labels[r]], 0, 1, 250));
        for (let i = 0; i < N; i++) {
          const g = L.cells[r][i].g; if (L.cells[r][i].tint) L.cells[r][i].tint.setAttribute('opacity', 0);
          pops.push(h.wait(ri * 150 + i * 40).then(function () { const [x, y] = ctr(r, i); return popIn(h, g, x, y, 260); }));
        }
      });
      await h.all(pops);
      // interiores trocados: p2 -> o1 e p1 -> o2
      const send = async function (from, to, tile, msg) {
        say(L, msg);
        const fl = [];
        for (let i = R.a; i < R.b; i++) {
          fl.push(h.wait((i - R.a) * 90).then(function () {
            return fly(L, h, EX[from][i], from, i, to, i, 650, BLACK, tile).then(function (g) {
              g.remove(); L.digits[to][i].setAttribute('opacity', 1);
              const tn = L.cells[to][i].tint; if (tn) return fade(h, [tn], 0, 1, 200);
            });
          }));
        }
        await h.all(fl);
      };
      await send('p2', 'o1', BLUE, 'o interior de ' + sub('p2') + ' vai para ' + sub('o1'));
      await h.wait(150);
      await send('p1', 'o2', RED, 'o interior de ' + sub('p1') + ' vai para ' + sub('o2'));
      say(L, '');
    },

    'p2>p3': async function (svg, h) {
      const L = build(svg, 'p3'), R = L.R;
      const run = async function (from, to) {
        say(L, 'o resto de ' + sub(to) + ' vem de ' + sub(from) + ', nas mesmas posições');
        await h.wait(350);
        for (const i of R.outer) {
          const v = EX[from][i], d = L.digits[to][i];
          if (d) d.setAttribute('opacity', 0);
          const unmark = mark(L, from, i);
          const g = await fly(L, h, v, from, i, to, i, 420);
          unmark();
          if (d) { g.remove(); d.setAttribute('opacity', 1); continue; }
          // já está no interior do filho: o valor repetido pisca e a posição fica vaga
          const k = EX[to === 'o1' ? 'p2' : 'p1'].indexOf(v);
          say(L, v + ' já está em ' + sub(to) + ' → a posição fica vaga');
          const x = await cross(L, h, to, i);
          await h.all([flash(L, h, to, k, '#cc0000', 500), h.tween(500, function (e) { g.setAttribute('opacity', 1 - e); x.setAttribute('opacity', 1 - e); }, E.linear)]);
          g.remove(); x.remove();
          say(L, 'o resto de ' + sub(to) + ' vem de ' + sub(from) + ', nas mesmas posições');
        }
      };
      R.outer.forEach(function (i) { ['o1', 'o2'].forEach(function (r) { if (L.digits[r][i]) L.digits[r][i].setAttribute('opacity', 0); }); });
      await run('p1', 'o1');
      await h.wait(200);
      await run('p2', 'o2');
      say(L, '');
    },

    'p3>p4': async function (svg, h) {
      const L = build(svg, 'p4'), R = L.R;
      const ks = Object.keys(L.maps).map(Number);
      ks.forEach(function (k) { L.maps[k].setAttribute('opacity', 0); });
      say(L, 'mapeamento entre os interiores dos pais');
      for (const k of ks) {
        const m = L.maps[k];
        await h.all([
          flash(L, h, 'p1', k, HI, 700), flash(L, h, 'p2', k, HI, 700),
          h.tween(450, function (e) { m.setAttribute('opacity', 1); scaleAbout(m, mapX(k), 26.29, Math.max(0.01, e)); }, E.out)
        ]);
        m.removeAttribute('transform');
        say(L, 'mapeamento: ' + EX.p1.slice(R.a, R.b).map(function (v, q) { return q <= k - R.a ? v + '↔' + EX.p2[R.a + q] : null; }).filter(Boolean).join('   '));
      }
      await h.wait(400);
      say(L, '');
    },

    'p4>p5': async function (svg, h) {
      const L = build(svg, 'p5'), R = L.R;
      const todo = [];
      ['o1', 'o2'].forEach(function (r) { Object.keys(R.chains[r]).map(Number).sort(function (x, y) { return x - y; }).forEach(function (i) { todo.push([r, i]); }); });
      todo.forEach(function (t) { L.digits[t[0]][t[1]].setAttribute('opacity', 0); });
      for (const t of todo) {
        const r = t[0], i = t[1], par = r === 'o1' ? 'p1' : 'p2', oth = r === 'o1' ? 'p2' : 'p1';
        const ch = R.chains[r][i];
        let v = EX[par][i];
        const um = mark(L, r, i, HI);
        await flash(L, h, par, i, HI, 500);
        for (const k of ch) {
          // v está no interior do filho (posição k do outro pai) -> segue a seta até o valor de cima/baixo
          say(L, sub(r) + ': ' + v + ' já está no filho → ' + v + '↔' + EX[par][k]);
          const m = L.maps[k];
          await h.all([
            flash(L, h, oth, k, '#cc0000', 650),
            h.tween(650, function (e) { const s = 1 + 0.35 * Math.sin(Math.PI * e); m.setAttribute('stroke-width', 0.4 * s); scaleAbout(m, mapX(k), 26.29, s); }, E.linear)
          ]);
          m.removeAttribute('transform');
          await flash(L, h, par, k, HI, 450);
          v = EX[par][k];
        }
        say(L, sub(r) + ': ' + v + ' ainda não está no filho → vai para a vaga');
        const src = ch[ch.length - 1];
        const g = await fly(L, h, v, par, src, r, i, 650);
        g.remove(); um();
        L.digits[r][i].setAttribute('opacity', 1);
        await h.wait(200);
      }
      say(L, '');
    },

    'p5>x1': async function (svg, h) {
      const L = build(svg, 'p5'), R = L.R;
      const gone = Object.keys(L.maps).map(function (k) { return L.maps[k]; });
      R.outer.forEach(function (i) { gone.push(L.digits.o1[i], L.digits.o2[i]); });
      say(L, 'OX: os mesmos cortes e os mesmos interiores');
      await fade(h, gone, 1, 0, 700);
      await h.wait(300);
      say(L, '');
    },

    'x1>x2': function (svg, h) { return oxRun(svg, h, 'x2', 'p2', 'o2', null); },
    'x2>x3': function (svg, h) { return oxRun(svg, h, 'x3', 'p1', 'o1', 'p2'); }
  };

  // varredura do OX: o pai é lido a partir do 2º corte, dando a volta; quem já está no filho é pulado
  async function oxRun(svg, h, st, par, child, oldScan) {
    const L = build(svg, st), R = L.R, run = par === 'p1' ? R.ox1 : R.ox2;
    R.outer.forEach(function (i) { L.digits[child][i].setAttribute('opacity', 0); });
    const segs = scanSegs(run.scan, R.b), y = par === 'p1' ? 24.2 : 48.2;
    L.scans.forEach(function (s) { s.g.setAttribute('opacity', 0); });
    if (oldScan) {   // a seta da varredura anterior (sob p2) some
      const old = scanSegs(R.ox2.scan, R.b).map(function (sg) { return scanArrow(L.gFx, sg[0], sg[1], 48.2); });
      await h.tween(400, function (e) { old.forEach(function (o) { o.g.setAttribute('opacity', 1 - e); }); });
      old.forEach(function (o) { o.g.remove(); });
    }
    say(L, sub(child) + ': segue a ordem de ' + sub(par) + ' a partir do 2º corte');
    await h.wait(300);
    let seg = -1;
    for (const s of run.scan) {
      const sg = s.j < R.b && segs.length > 1 ? 1 : 0;   // posições antes do 2º corte: já deu a volta (2ª seta)
      if (sg !== seg) {
        seg = sg;
        if (seg === 1) say(L, '… dando a volta no vetor');
        L.scans[seg].g.setAttribute('opacity', 1);
      }
      const ar = L.scans[seg], x0 = segs[seg][0];
      await h.tween(260, function (e) { ar.set(Math.max(x0 + 3, lerp(cx(s.j), cx(s.j) + C, e))); }, E.linear);
      const um = mark(L, par, s.j);
      if (s.skip) {
        say(L, s.v + ' já está em ' + sub(child) + ' → pula');
        const k = EX[par === 'p1' ? 'p2' : 'p1'].indexOf(s.v);
        const x = await cross(L, h, par, s.j);
        await flash(L, h, child, k, '#cc0000', 500);
        x.remove();
      } else {
        say(L, s.v + ' → próxima posição livre de ' + sub(child));
        const g = await fly(L, h, s.v, par, s.j, child, s.to, 480, BROWN);
        g.remove();
        L.digits[child][s.to].setAttribute('opacity', 1);
      }
      um();
    }
    L.scans.forEach(function (s, q) { s.set(segs[q][1]); });
    await h.wait(250);
    say(L, '');
  }

  A.cruz = { solve: solve, randomEx: randomEx };   // (para testes)

  // ---------- componente ----------
  A.define('cruz', function (host) {
    const img = host.querySelector('img');
    const svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true' }, host);
    let cur = 'vazio';
    const self = {
      snap: function (st) { cur = st; build(svg, st); },
      play: function (a, b, h) {
        const f = PLAYS[a + '>' + b];
        if (!f) { build(svg, b); return Promise.resolve(); }
        cur = b;
        return f(svg, h);
      },
      redraw: function () { build(svg, cur); }
    };
    insts.push(self);
    // botões: o mesmo exemplo vale para todos os slides do PMX e do OX
    const ctl = document.createElement('div');
    ctl.className = 'cruz-ctl'; ctl.setAttribute('data-interactive', '');
    const mk = function (label, title, fn) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.title = title;
      b.addEventListener('click', function (e) { e.stopPropagation(); fn(); b.blur(); });
      ctl.appendChild(b); return b;
    };
    mk('🎲 novo exemplo', 'sorteia outros pais e outros pontos de corte (todos os slides do PMX e do OX)', function () {
      EX = randomEx(); insts.forEach(function (o) { o.redraw(); }); replay();
    });
    mk('↺ original', 'volta ao exemplo do PDF', function () {
      EX = JSON.parse(JSON.stringify(ORIG)); insts.forEach(function (o) { o.redraw(); }); replay();
    });
    const hint = document.createElement('span'); hint.className = 'cruz-hint'; hint.textContent = 'R repete';
    ctl.appendChild(hint);
    host.appendChild(ctl);
    function replay() {
      const f = host.closest('section.frame');
      if (f && f.classList.contains('active') && f._replay) f._replay();
    }
    if (img) img.setAttribute('aria-hidden', 'true');
    return self;
  });
})();
