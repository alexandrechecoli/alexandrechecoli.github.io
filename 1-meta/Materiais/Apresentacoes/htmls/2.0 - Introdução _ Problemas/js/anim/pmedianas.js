/* Localização de facilidades / p-medianas (aula 2, frames 51–54): figuras p_medianas1…3 do Ipe em camadas.
 *
 * Dados: js/anim/dados/pmed.js (figura_camadas.py pmed … p_medianas1 p_medianas2 p_medianas3; quadro 232.4 × 136.4).
 * Uso: <span class="anim pl" data-anim="pmedianas" data-from=".." data-state=".."><img …></span>
 *
 *   m1    (de vazio) frame 51: os 29 pontos brotam; os rótulos de demanda (d = 5, 15, 5) entram e o ponto pulsa
 *   m2    frame 52: os rótulos de demanda saem; os 3 centros caem com a capacidade (C = 200, 100, 150)
 *   demo  frame 53, passo 2 (data-steps="2"): cada ponto liga-se ao centro mais próximo (distância total 288,3; a
 *         atribuição do frame 54 soma 307,0); depois a heurística localiza ↔ aloca (Cooper): cada centro vai para a
 *         mediana geométrica (Weiszfeld) dos seus pontos e os pontos são reatribuídos, até parar (275,6).
 *         Interativo: arrastar os centros; botões "localiza ↔ aloca" e "posições do slide".
 *   m3    frame 54: as linhas de atribuição do PDF saem de cada centro até os seus pontos
 * Distâncias na grade do Ipe (4 pt). As demandas e capacidades não entram na conta (a figura só dá 3 demandas).
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease, lerp = Anim.lerp;
  const D = Anim.figData && Anim.figData.pmed;
  if (!D) { console.warn('pmedianas: faltam os dados (dados/pmed.js)'); return; }
  const IT = D.items, ST = D.states;
  const NAVY = '#00008b', MYBLUE = '#0061a5', GREEN = '#1a7f37', GRAY = '#666666';
  const FONT = '"LM Sans 8", "LM Sans", sans-serif', IWONA = '"Iwona", "LM Sans", sans-serif';
  const UNIT = 4;
  const range = function (a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };

  // pontos (cada × são dois itens) e centros
  const PTS = [];
  for (let i = 0; i < 58; i += 2) { const b = IT[i].b; PTS.push({ ids: [i, i + 1], x: b[0] + 2.85, y: b[1] + 2.85 }); }
  const SQ = [87, 88, 89];
  const C0 = SQ.map(function (i) { const b = IT[i].b; return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; });
  const CAP = { 87: [95, 96, 97], 88: [90, 91, 92], 89: [93, 94] };
  const CAPTXT = ['C = 200', 'C = 100', 'C = 150'];
  const DEM = [[98, 99, 100], [101, 102, 103], [104, 105, 106]];
  const LINES = range(58, 86);   // atribuição do PDF (saem do centro)

  const dist = function (p, c) { return Math.hypot(p.x - c[0], p.y - c[1]); };
  function assign(C) { return PTS.map(function (p) { let k = 0; C.forEach(function (c, j) { if (dist(p, c) < dist(p, C[k])) k = j; }); return k; }); }
  function total(C, a) { return PTS.reduce(function (s, p, i) { return s + dist(p, C[a[i]]); }, 0) / UNIT; }
  function median(P, s) {   // Weiszfeld
    let x = s.slice();
    for (let it = 0; it < 100; it++) {
      let nx = 0, ny = 0, w = 0;
      P.forEach(function (p) { const d = Math.max(1e-6, dist(p, x)); nx += p.x / d; ny += p.y / d; w += 1 / d; });
      x = [nx / w, ny / w];
    }
    return x;
  }
  const PDFTOT = LINES.reduce(function (s, i) {
    const m = /M([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)/.exec(IT[i].d);
    return s + Math.hypot(m[1] - m[3], m[2] - m[4]);
  }, 0) / UNIT;
  const fmt = function (v) { return v.toFixed(1).replace('.', ','); };
  // posições da demo (guardadas entre visitas); começam onde a heurística localiza ↔ aloca para (275,6)
  const centers = (function () {
    let C = C0.map(function (c) { return c.slice(); });
    for (let it = 0; it < 20; it++) {
      const a = assign(C);
      C = C.map(function (c, j) { const P = PTS.filter(function (p, i) { return a[i] === j; }); return P.length ? median(P, c) : c; });
    }
    return C;
  })();

  function mk(it, parent) {
    if (it.t === 'x') {
      const t = S('text', { x: it.x, y: it.y, 'font-size': it.fs, fill: it.c, 'font-family': it.ff === 'Iwona' ? IWONA : it.ff }, parent);
      if (it.st) t.setAttribute('font-style', it.st);
      t.textContent = it.tx;
      return t;
    }
    const p = S('path', { d: it.d, fill: it.f || 'none' }, parent);
    if (it.s) {
      p.setAttribute('stroke', it.s); p.setAttribute('stroke-width', it.w);
      if (it.da) p.setAttribute('stroke-dasharray', it.da);   // linhas de atribuição: pontilhado 1 3
      if (it.lc) p.setAttribute('stroke-linecap', it.lc);
    }
    return p;
  }

  Anim.define('pmedianas', function (host) {
    const svg = S('svg', { viewBox: '0 0 ' + D.W + ' ' + D.H });
    host.appendChild(svg);
    const gLn = S('g', null, svg), gIt = S('g', null, svg), gC = S('g', { 'data-interactive': '' }, svg), gPan = S('g', { 'data-interactive': '' }, svg);
    const els = IT.map(function (it) { return mk(it, gIt); });
    let cur = null, gen = 0, playing = false;

    function empty(g) { while (g.firstChild) g.removeChild(g.firstChild); }
    function showSet(ids) { const s = new Set(ids); els.forEach(function (e, i) { e.style.display = s.has(i) ? '' : 'none'; e.style.opacity = ''; e.removeAttribute('transform'); }); }
    function show(ids, on) { ids.forEach(function (i) { els[i].style.display = on === false ? 'none' : ''; }); }
    function op(ids, v) { ids.forEach(function (i) { els[i].style.opacity = v; }); }
    function tf(ids, s) { ids.forEach(function (i) { if (s) els[i].setAttribute('transform', s); else els[i].removeAttribute('transform'); }); }
    function text(x, y, s, size, color, o, parent) {
      const t = S('text', Object.assign({ x: x, y: y, 'font-size': size, fill: color, 'font-family': FONT }, o || {}), parent || gPan);
      t.textContent = s;
      return t;
    }
    function pop(h, ids, cx, cy, dur) {
      show(ids); op(ids, 0);
      return h.tween(dur || 320, function (e, t) {
        op(ids, Math.min(1, t * 2.5));
        tf(ids, 'translate(' + cx + ' ' + cy + ') scale(' + Math.max(0, e) + ') translate(' + (-cx) + ' ' + (-cy) + ')');
      }, ease.back).then(function () { op(ids, ''); tf(ids, null); });
    }
    function fade(h, ids, to, dur) {
      show(ids); const from = to ? 0 : 1;
      return h.tween(dur || 300, function (e) { op(ids, lerp(from, to, e)); })
        .then(function () { op(ids, ''); if (!to) show(ids, false); });
    }
    function ripple(h, x, y, color) {
      const c = S('circle', { cx: x, cy: y, r: 2, fill: 'none', stroke: color || MYBLUE, 'stroke-width': 0.8 }, gPan);
      return h.tween(500, function (e) { c.setAttribute('r', lerp(2, 10, e)); c.setAttribute('opacity', 1 - e); }, ease.out)
        .then(function () { c.remove(); }, function (x) { c.remove(); throw x; });
    }

    // ---------- demo (frame 53, passo 2) ----------
    let dm = null;   // { lines, sq, lab, tot, msg }
    function drawDemo(a) {
      empty(gLn); empty(gC); empty(gPan);
      showSet(ST.p_medianas2); show(SQ, false); show([].concat(CAP[87], CAP[88], CAP[89]), false);
      a = a || assign(centers);
      const lines = PTS.map(function (p, i) {
        const c = centers[a[i]];
        return S('line', { x1: c[0], y1: c[1], x2: p.x, y2: p.y, stroke: '#000', 'stroke-width': 0.4, 'stroke-dasharray': '1 3' }, gLn);
      });
      const sq = [], lab = [];
      centers.forEach(function (c, j) {
        const g = S('g', { class: 'pm-c' }, gC);
        S('rect', { x: -4, y: -4, width: 8, height: 8, fill: NAVY, stroke: '#000', 'stroke-width': 0.4 }, g);
        S('rect', { x: -9, y: -9, width: 18, height: 18, fill: 'transparent' }, g);   // área de pegar
        g.setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ')');
        sq.push(g);
        const t = S('text', { x: c[0] - 12, y: c[1] - 5.3, 'font-size': 7.17, fill: NAVY, 'font-family': IWONA, 'text-anchor': 'end',
          stroke: '#fff', 'stroke-width': 2, 'paint-order': 'stroke', 'stroke-linejoin': 'round' }, gC);
        t.textContent = CAPTXT[j];
        lab.push(t);
        drag(g, j);
      });
      const x0 = D.W + 8;
      text(x0, 40, 'distância total', 7, GRAY);
      const tot = text(x0, 52, '', 10, MYBLUE, { 'font-weight': 700 });
      const msg = text(x0, 63, '', 6.2, GRAY), msg2 = text(x0, 71, '', 6.2, GRAY);
      btn(x0, 80, 'localiza ↔ aloca', function () { if (!playing) local(cooper); });
      btn(x0, 94, 'posições do slide', function () { if (!playing) { centers.forEach(function (c, j) { c[0] = C0[j][0]; c[1] = C0[j][1]; }); drawDemo(); } });
      text(x0, 114, 'arraste os centros', 5.5, '#888');
      dm = { lines: lines, sq: sq, lab: lab, tot: tot, msg: msg, msg2: msg2 };
      update(a);
    }
    function btn(x, y, label, fn) {
      const g = S('g', { class: 'pm-btn' }, gPan);
      S('rect', { x: x, y: y, width: 68, height: 11, rx: 1.5, fill: '#fff', stroke: '#b7cde0', 'stroke-width': 0.6 }, g);
      text(x + 34, y + 7.8, label, 6.2, MYBLUE, { 'text-anchor': 'middle' }, g);
      g.addEventListener('click', function (e) { e.stopPropagation(); fn(); });
    }
    function setMsg(a, b, col) { dm.msg.textContent = a || ''; dm.msg2.textContent = b || ''; dm.msg.setAttribute('fill', col || GRAY); dm.msg2.setAttribute('fill', col || GRAY); }
    function update(a, keepMsg) {   // redesenha linhas, centros e total para as posições atuais
      a = a || assign(centers);
      PTS.forEach(function (p, i) { const c = centers[a[i]]; dm.lines[i].setAttribute('x1', c[0]); dm.lines[i].setAttribute('y1', c[1]); });
      centers.forEach(function (c, j) {
        dm.sq[j].setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ')');
        dm.lab[j].setAttribute('x', c[0] - 5.5); dm.lab[j].setAttribute('y', c[1] - 6);
        dm.lab[j].setAttribute('text-anchor', 'middle');
      });
      dm.tot.textContent = fmt(total(centers, a));
      if (!keepMsg) setMsg('cada ponto vai ao', 'centro mais próximo');
    }
    function drag(g, j) {
      g.addEventListener('pointerdown', function (ev) {
        if (playing || cur !== 'demo') return;
        ev.preventDefault(); ev.stopPropagation();
        g.setPointerCapture(ev.pointerId);
        const m = svg.getScreenCTM().inverse();
        const move = function (e2) {
          const pt = new DOMPoint(e2.clientX, e2.clientY).matrixTransform(m);
          centers[j][0] = Math.max(4, Math.min(D.W - 4, pt.x)); centers[j][1] = Math.max(4, Math.min(D.H - 4, pt.y));
          update();
        };
        const up = function () { g.removeEventListener('pointermove', move); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up); };
        g.addEventListener('pointermove', move); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
      });
    }
    // localiza ↔ aloca: cada centro vai para a mediana dos seus pontos; reatribui; até parar
    async function cooper(h) {
      for (let it = 1; it <= 8; it++) {
        const a = assign(centers), before = total(centers, a);
        const target = centers.map(function (c, j) {
          const P = PTS.filter(function (p, i) { return a[i] === j; });
          return P.length ? median(P, c) : c.slice();
        });
        const moved = target.some(function (t, j) { return Math.hypot(t[0] - centers[j][0], t[1] - centers[j][1]) > 0.05; });
        if (!moved) { setMsg('nenhum centro se mexe:', 'parou (' + (it - 1) + ' rodadas)', GREEN); return; }
        setMsg('rodada ' + it + ': cada centro vai', 'para a mediana do seu grupo', MYBLUE);
        const from = centers.map(function (c) { return c.slice(); });
        await h.tween(800, function (e) {
          centers.forEach(function (c, j) { c[0] = lerp(from[j][0], target[j][0], e); c[1] = lerp(from[j][1], target[j][1], e); });
          // durante o movimento a atribuição fica a antiga
          PTS.forEach(function (p, i) { const c = centers[a[i]]; dm.lines[i].setAttribute('x1', c[0]); dm.lines[i].setAttribute('y1', c[1]); });
          centers.forEach(function (c, j) { dm.sq[j].setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ')'); dm.lab[j].setAttribute('x', c[0] - 5.5); dm.lab[j].setAttribute('y', c[1] - 6); dm.lab[j].setAttribute('text-anchor', 'middle'); });
          dm.tot.textContent = fmt(total(centers, a));
        }, ease.inOut);
        await h.wait(350);
        const a2 = assign(centers);
        const changed = a2.filter(function (k, i) { return k !== a[i]; }).length;
        update(a2, true);
        setMsg('rodada ' + it + ': ' + fmt(before) + ' → ' + fmt(total(centers, a2)), changed ? changed + ' ponto(s) mudam de centro' : 'ninguém muda de centro', MYBLUE);
        await h.wait(900);
      }
    }
    function local(script) {
      const g0 = ++gen, X = {};
      const h = {
        tween: function (dur, fn, ez) {
          ez = ez || ease.inOut;
          return new Promise(function (res, rej) {
            const t0 = performance.now();
            (function fr(now) {
              if (g0 !== gen) { rej(X); return; }
              const t = Math.min(1, (now - t0) / dur); fn(ez(t), t);
              if (t < 1) requestAnimationFrame(fr); else res();
            })(t0);
          });
        },
        wait: function (ms) { return new Promise(function (res, rej) { setTimeout(function () { if (g0 !== gen) rej(X); else res(); }, ms); }); }
      };
      playing = true;
      script(h).catch(function (e) { if (e !== X) console.error(e); }).then(function () { playing = false; });
    }

    function snap(st) {
      gen++; cur = st; dm = null;
      empty(gLn); empty(gC); empty(gPan);
      if (st === 'vazio') { showSet([]); return; }
      if (st === 'demo') {
        drawDemo();
        const atC0 = centers.every(function (c, j) { return c[0] === C0[j][0] && c[1] === C0[j][1]; });
        if (!atC0) setMsg('centros movidos', '(o slide 54 soma ' + fmt(PDFTOT) + ')');
        return;
      }
      showSet(st === 'm1' ? ST.p_medianas1 : st === 'm3' ? ST.p_medianas3 : ST.p_medianas2);
    }

    async function play(a, b, h) {
      playing = true;
      try {
        if (b === 'm1') {   // os pontos brotam (ordem embaralhada, semente fixa)
          showSet([]);
          let s = 11; const rnd = function () { s = (s * 16807) % 2147483647; return s / 2147483647; };
          const order = PTS.map(function (p, i) { return i; });
          for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t; }
          const ps = [];
          for (const i of order) { ps.push(pop(h, PTS[i].ids, PTS[i].x, PTS[i].y, 300)); await h.wait(45); }
          await h.all(ps);
          const near = [56, 24, 54].map(function (id) { return PTS[id / 2]; });   // pontos com demanda escrita
          for (let k = 0; k < 3; k++) {
            await h.all([ripple(h, near[k].x, near[k].y), fade(h, DEM[k], 1, 350)]);
          }
        }
        if (b === 'm2') {
          await fade(h, [].concat(DEM[0], DEM[1], DEM[2]), 0, 300);
          for (let j = 0; j < 3; j++) {
            const id = SQ[j], c = C0[j];
            show([id]); op([id], 0);
            await h.tween(450, function (e, t) { op([id], Math.min(1, t * 3)); tf([id], 'translate(0 ' + (-(1 - e) * (c[1] + 10)) + ')'); }, ease.out);
            tf([id], null); op([id], '');
            ripple(h, c[0], c[1], NAVY).catch(function () {});
            await fade(h, CAP[id], 1, 300);
          }
        }
        if (b === 'demo') {
          for (let j = 0; j < 3; j++) { centers[j][0] = C0[j][0]; centers[j][1] = C0[j][1]; }
          const asg = assign(centers);
          drawDemo(asg);
          dm.lines.forEach(function (l) { l.style.display = 'none'; });
          dm.tot.textContent = '0,0';
          setMsg('cada ponto vai ao', 'centro mais próximo');
          // as linhas crescem do centro até cada ponto, um centro por vez
          for (let j = 0; j < 3; j++) {
            const ids = PTS.map(function (p, i) { return i; }).filter(function (i) { return asg[i] === j; });
            ids.forEach(function (i) { dm.lines[i].style.display = ''; });
            const base = PTS.reduce(function (s, p, i) { return s + (asg[i] < j ? dist(p, centers[asg[i]]) : 0); }, 0);
            await h.tween(700, function (e) {
              let acc = base;
              ids.forEach(function (i) {
                const c = centers[j], p = PTS[i];
                dm.lines[i].setAttribute('x2', lerp(c[0], p.x, e)); dm.lines[i].setAttribute('y2', lerp(c[1], p.y, e));
                acc += dist(p, c) * e;
              });
              dm.tot.textContent = fmt(acc / UNIT);
            }, ease.out);
          }
          setMsg('o slide seguinte soma ' + fmt(PDFTOT), 'dá para mover os centros?', GRAY);
          await h.wait(1600);
          await cooper(h);
          await h.wait(300);
        }
        if (b === 'm3') {
          await fade(h, [].concat(CAP[87], CAP[88], CAP[89]), 0, 300);
          const groups = [range(58, 64), range(75, 86), range(65, 74)];   // centros 87, 88, 89
          for (let j = 0; j < 3; j++) {
            const c = C0[j];
            show(groups[j]);
            await h.tween(650, function (e) {
              const s = Math.max(0.001, e);
              tf(groups[j], 'translate(' + c[0] + ' ' + c[1] + ') scale(' + s + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')');
            }, ease.out);
            tf(groups[j], null);
            ripple(h, c[0], c[1], NAVY).catch(function () {});
            await h.wait(150);
          }
        }
      } finally { playing = false; }
    }

    return { snap: snap, play: play };
  });
})();
