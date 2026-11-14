/* Caixeiro viajante (aula 2, frames 5–10): figuras tsp1…tsp5 do Ipe redesenhadas em SVG.
 *
 * Uso: <span class="anim cx" data-anim="caixeiro" data-from=".." data-state=".."><img ... tspN.svg></span>
 *   (a <img> do PDF fica invisível reservando o espaço; o SVG fica por cima, no mesmo quadro de 156.4 × 96.4)
 *   data-painel="comb" acrescenta à direita o painel "quantas rotas existem?" (frame 7).
 *
 * Estados:
 *   vazio  nada                         pts   só os pontos (tsp1)
 *   t2     rota ótima (tsp2)            t3    rota ruim (tsp3)
 *   t2ok   t2 + "✓ a menor das 360"     t3x   t3 + "x% mais longa"   (frame 8, passo 2)
 *   t4     rota que esquece E (tsp4)    t5    duas sub-rotas (tsp5)
 *
 * Os pontos podem ser arrastados (em qualquer um dos frames; a posição vale para todos). Os comprimentos, o
 * "✓ a menor das 360" (força bruta nas (n−1)!/2 rotas) e os rótulos acompanham. O botão ↺ volta às posições do PDF.
 * Comprimentos na unidade da grade do Ipe (4 pt): t2 = 74,8 (a ótima), t3 = 102,2; a pior das 360 tem 154,0.
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease, lerp = Anim.lerp, mix = Anim.mix;
  const W = 156.4, H = 96.4, UNIT = 4;
  const BLUE = '#00008b', MYBLUE = '#0061a5', RED = '#b6321d', GREEN = '#1a7f37', GOLD = '#e8a33d';
  const FONT = '"LM Sans 8", "LM Sans", sans-serif';

  // pontos do Ipe: A B C D E F G
  const P0 = [[20.2, 68.2], [52.2, 20.2], [100.2, 20.2], [124.2, 44.2], [144.2, 68.2], [108.2, 76.2], [64.2, 84.2]];
  const P = P0.map(function (p) { return p.slice(); });
  const A = 0, B = 1, C = 2, D = 3, E = 4, F = 5, G = 6;
  // rotas das figuras (cada sub-rota é fechada; a seta aponta para o ponto seguinte)
  const TOURS = {
    t2: [[A, B, C, D, E, F, G]],
    t3: [[A, B, F, C, E, D, G]],
    t4: [[A, B, C, D, F, G]],
    t5: [[A, B, C], [E, F, G, D]]
  };
  const BASE = { t2: 't2', t3: 't3', t2ok: 't2', t3x: 't3', t4: 't4', t5: 't5' };
  const instances = [];

  // ---------- geometria ----------
  function dist(i, j) { return Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]) / UNIT; }
  function tourLen(t) { let s = 0; for (let k = 0; k < t.length; k++) s += dist(t[k], t[(k + 1) % t.length]); return s; }
  function edgesOf(tours) {
    const out = [];
    tours.forEach(function (t, si) { t.forEach(function (a, k) { out.push({ a: a, b: t[(k + 1) % t.length], sub: si }); }); });
    return out;
  }
  function bestLen() {   // força bruta: todas as permutações começando em A
    let best = Infinity;
    const rest = [1, 2, 3, 4, 5, 6];
    (function perm(arr, l) {
      if (l === arr.length) { const v = tourLen([0].concat(arr)); if (v < best) best = v; return; }
      for (let i = l; i < arr.length; i++) {
        let t = arr[l]; arr[l] = arr[i]; arr[i] = t;
        perm(arr, l + 1);
        t = arr[l]; arr[l] = arr[i]; arr[i] = t;
      }
    })(rest, 0);
    return best;
  }
  const fmt = function (v, d) { return v.toFixed(d === undefined ? 1 : d).replace('.', ','); };
  const moved = function () { return P.some(function (p, i) { return p[0] !== P0[i][0] || p[1] !== P0[i][1]; }); };

  // seta do Ipe: ponta no centro do ponto, 3 de comprimento, meia largura 1
  function headPts(a, b) {
    const x1 = P[a][0], y1 = P[a][1], x2 = P[b][0], y2 = P[b][1];
    const L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L;
    const bx = x2 - 3 * ux, by = y2 - 3 * uy;
    return x2 + ',' + y2 + ' ' + (bx - uy) + ',' + (by + ux) + ' ' + (bx + uy) + ',' + (by - ux);
  }

  // ---------- painel "quantas rotas?" (frame 7) ----------
  function fact2(n) { let f = 1n; for (let i = 2n; i <= BigInt(n - 1); i++) f *= i; return n < 3 ? 1n : f / 2n; }
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  function fmtBig(b) {
    const s = b.toString();
    if (s.length <= 15) return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const e = s.length - 1;
    return s[0] + ',' + s.slice(1, 3) + ' × 10' + String(e).replace(/\d/g, function (c) { return SUP[c]; });
  }
  function fmtNum(v) {   // 1–999 com até 2 casas, sem zeros à direita
    return (v >= 100 ? Math.round(v).toString() : (+v.toPrecision(2)).toString()).replace('.', ',');
  }
  function fmtTime(sec) {
    const Y = 365.25 * 86400, UNI = 13.8e9;
    if (sec < 1e-3) return 'menos de 1 milissegundo';
    if (sec < 1) return fmtNum(sec * 1000) + ' milissegundos';
    if (sec < 60) return fmtNum(sec) + ' segundos';
    if (sec < 3600) return fmtNum(sec / 60) + ' minutos';
    if (sec < 86400) return fmtNum(sec / 3600) + ' horas';
    if (sec < Y) return fmtNum(sec / 86400) + ' dias';
    const y = sec / Y;
    if (y < 1e3) return fmtNum(y) + (y < 2 ? ' ano' : ' anos');
    if (y < 1e6) return fmtNum(y / 1e3) + ' mil anos';
    if (y < 1e9) return fmtNum(y / 1e6) + ' milhões de anos';
    if (y < UNI) return fmtNum(y / 1e9) + ' bilhões de anos';
    const k = y / UNI;
    return (k < 1e3 ? fmtNum(k) : fmtBig(BigInt(Math.round(k)))) + ' × a idade do universo';
  }
  function makePanel(host) {
    const d = document.createElement('div');
    d.className = 'cx-painel';
    d.setAttribute('data-interactive', '');
    d.innerHTML =
      '<div class="cx-n"><button type="button" data-d="-1">−</button><span><b>7</b> pontos</span>' +
      '<button type="button" data-d="1">+</button></div>' +
      '<div class="cx-lb">rotas diferentes: (n−1)!/2</div><div class="cx-big">360</div>' +
      '<div class="cx-lb">testando 1 bilhão por segundo:</div><div class="cx-t"></div>';
    host.appendChild(d);
    let n = 7;
    function upd(flash) {
      const r = fact2(n);
      d.querySelector('b').textContent = n;
      const big = d.querySelector('.cx-big');
      big.textContent = fmtBig(r);
      d.querySelector('.cx-t').textContent = fmtTime(Number(r) / 1e9);
      if (flash) { big.classList.remove('cx-flash'); void big.offsetWidth; big.classList.add('cx-flash'); }
    }
    d.addEventListener('click', function (e) {
      const b = e.target.closest('button'); if (!b) return;
      n = Math.max(4, Math.min(60, n + (+b.dataset.d)));
      upd(true);
    });
    d._reset = function () { n = 7; upd(false); };
    upd(false);
    return d;
  }

  Anim.define('caixeiro', function (host, opts) {
    const svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H });
    host.appendChild(svg);
    const gFill = S('g', null, svg), gEdge = S('g', null, svg), gNode = S('g', null, svg);
    const gTop = S('g', null, svg), gHit = S('g', { class: 'cx-hit', 'data-interactive': '' }, svg);
    const panel = host.dataset.painel === 'comb' ? makePanel(host) : null;
    const reset = document.createElement('button');
    reset.type = 'button'; reset.className = 'cx-reset'; reset.textContent = '↺ pontos originais';
    reset.title = 'voltar os pontos às posições da figura';
    host.appendChild(reset);

    let cur = null, playing = false;
    // num frame com duas figuras (8), o botão ↺ só na última
    const showReset = !host.nextElementSibling || !host.nextElementSibling.matches('.anim.cx');

    // ---------- desenho ----------
    const nodes = P.map(function () {
      const g = S('g', null, gNode);
      S('circle', { r: 1.8, fill: '#000' }, g);
      S('circle', { r: 0.66, fill: '#fff' }, g);
      return g;
    });
    function placeNode(i, s) {
      nodes[i].setAttribute('transform', 'translate(' + P[i][0] + ' ' + P[i][1] + ')' + (s !== undefined && s !== 1 ? ' scale(' + Math.max(0, s) + ')' : ''));
      nodes[i].style.display = s === 0 ? 'none' : '';
    }
    function showNodes(on) { nodes.forEach(function (g, i) { placeNode(i, on ? 1 : 0); }); }

    function edge(e) {   // aresta + seta; set(t) cresce a aresta até t ∈ [0,1]
      const ln = S('line', { stroke: BLUE, 'stroke-width': 0.4, x1: P[e.a][0], y1: P[e.a][1] }, gEdge);
      const hd = S('polygon', { fill: BLUE, stroke: BLUE, 'stroke-width': 0.4, 'stroke-linejoin': 'miter', points: headPts(e.a, e.b) }, gEdge);
      e.ln = ln; e.hd = hd;
      e.set = function (t) {
        ln.setAttribute('x2', lerp(P[e.a][0], P[e.b][0], t)); ln.setAttribute('y2', lerp(P[e.a][1], P[e.b][1], t));
        ln.style.display = t > 0 ? '' : 'none';
      };
      e.head = function (s) {   // s = escala da seta em torno da ponta
        hd.style.display = s > 0 ? '' : 'none';
        hd.setAttribute('transform', s === 1 ? '' : 'translate(' + P[e.b][0] + ' ' + P[e.b][1] + ') scale(' + s + ') translate(' + (-P[e.b][0]) + ' ' + (-P[e.b][1]) + ')');
      };
      return e;
    }
    function text(x, y, str, size, color, extra) {
      const t = S('text', Object.assign({ x: x, y: y, 'text-anchor': 'middle', 'font-size': size, fill: color, 'font-family': FONT }, extra || {}), gTop);
      t.textContent = str;
      return t;
    }
    function empty(g) { while (g.firstChild) g.removeChild(g.firstChild); }
    function clear() { [gFill, gEdge, gTop].forEach(empty); }
    function counter(v) { const t = text(78.2, 9.4, '', 5.4, MYBLUE); t.set = function (x) { t.textContent = 'comprimento: ' + fmt(x); }; t.set(v); return t; }
    function centroid(t) { let x = 0, y = 0; t.forEach(function (i) { x += P[i][0]; y += P[i][1]; }); return [x / t.length, y / t.length]; }

    // elementos extras de cada estado (o que não é a figura do PDF)
    function extras(st) {
      const out = {};
      const base = BASE[st];
      if (base === 't2' || base === 't3') out.cnt = counter(tourLen(TOURS[base][0]));
      if (st === 't2ok') {
        out.cnt.setAttribute('fill', GREEN); out.cnt.setAttribute('font-weight', 700);
        const opt = Math.abs(tourLen(TOURS.t2[0]) - bestLen()) < 1e-9;
        out.v = text(78.2, 15.6, opt ? '✓ a menor das 360 rotas' : '✓ a mais curta das duas', 4.5, GREEN);
      }
      if (st === 't3x') {
        out.cnt.setAttribute('fill', RED);
        const r = tourLen(TOURS.t3[0]) / tourLen(TOURS.t2[0]) - 1;
        out.v = text(78.2, 15.6, r > 0 ? '✗ ' + Math.round(r * 100) + '% mais longa' : '✗ não é a menor', 4.5, RED);
      }
      if (st === 't4') {
        out.miss = [];
        P.forEach(function (p, i) {
          if (TOURS.t4[0].indexOf(i) >= 0) return;
          const ring = S('circle', { cx: p[0], cy: p[1], r: 4.2, fill: 'none', stroke: RED, 'stroke-width': 0.6 }, gTop);
          const lb = text(p[0], p[1] + 10.6, 'fora da rota', 4.8, RED);
          out.miss.push({ i: i, ring: ring, lb: lb });
        });
      }
      if (st === 't5') {
        out.subs = TOURS.t5.map(function (t, k) {
          const poly = S('polygon', { points: t.map(function (i) { return P[i].join(','); }).join(' '), fill: RED, 'fill-opacity': 0.1 }, gFill);
          const c = centroid(t);
          let y;
          if (k === 0) y = Math.min.apply(null, t.map(function (i) { return P[i][1]; })) - 5.6;
          else y = Math.max.apply(null, t.map(function (i) { return P[i][1]; })) + 8.6;
          const lb = text(c[0], y, 'sub-rota ' + (k + 1), 4.8, RED);
          return { poly: poly, lb: lb };
        });
      }
      return out;
    }

    function snap(st) {
      cur = st;
      clear();
      showNodes(st !== 'vazio');
      const base = BASE[st];
      if (base) edgesOf(TOURS[base]).forEach(function (e) { edge(e); e.set(1); e.head(1); });
      extras(st);
      reset.style.display = showReset && moved() && st !== 'vazio' ? '' : 'none';
      if (panel) panel.style.display = st === 'vazio' ? 'none' : '';
    }

    // ---------- pedaços de animação ----------
    function token(x, y) { return S('circle', { cx: x, cy: y, r: 2.1, fill: GOLD, stroke: '#fff', 'stroke-width': 0.5 }, gTop); }
    function ripple(i, color, h) {
      const c = S('circle', { cx: P[i][0], cy: P[i][1], r: 2, fill: 'none', stroke: color, 'stroke-width': 0.7 }, gTop);
      return h.tween(520, function (e) { c.setAttribute('r', lerp(2, 8, e)); c.setAttribute('opacity', 1 - e); }, ease.out)
        .then(function () { c.remove(); });
    }
    function pop(el, h, dur) {   // brota a partir do centro (texto ou forma)
      el.setAttribute('opacity', 0);
      const bb = el.getBBox(), cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
      return h.tween(dur || 380, function (e, t) {
        el.setAttribute('opacity', Math.min(1, t * 2.5));
        el.setAttribute('transform', 'translate(' + cx + ' ' + cy + ') scale(' + Math.max(0, e) + ') translate(' + (-cx) + ' ' + (-cy) + ')');
      }, ease.back).then(function () { el.removeAttribute('transform'); });
    }
    // percorre uma sub-rota com a ficha: cada aresta cresce, a seta brota no fim; cnt soma o comprimento
    async function trace(tour, h, o) {
      o = o || {};
      const ms = o.ms || 38, cnt = o.cnt, acc0 = o.acc || 0;
      const es = edgesOf([tour]).map(function (e) { edge(e); e.set(0); e.head(0); return e; });
      const tk = token(P[tour[0]][0], P[tour[0]][1]);
      await h.all([pop(tk, h, 260), ripple(tour[0], MYBLUE, h)]);
      let acc = acc0;
      for (const e of es) {
        const L = dist(e.a, e.b);
        await h.tween(90 + L * ms, function (t) {
          e.set(t);
          tk.setAttribute('cx', lerp(P[e.a][0], P[e.b][0], t)); tk.setAttribute('cy', lerp(P[e.a][1], P[e.b][1], t));
          if (cnt) cnt.set(acc + L * t);
        }, ease.inOut);
        acc += L;
        h.tween(220, function (s) { e.head(Math.max(0.01, s)); }, ease.back).catch(function () {});
      }
      await ripple(tour[0], MYBLUE, h);
      await h.tween(200, function (t) { tk.setAttribute('opacity', 1 - t); });
      tk.remove();
      return acc;
    }
    async function popNodes(h) {
      const order = P.map(function (p, i) { return i; }).sort(function (a, b) { return P[a][0] - P[b][0]; });
      nodes.forEach(function (g, i) { placeNode(i, 0); });
      await h.tween(order.length * 110 + 360, function (e, t) {
        const now = t * (order.length * 110 + 360);
        order.forEach(function (i, k) {
          const u = Math.max(0, Math.min(1, (now - k * 110) / 360));
          placeNode(i, u <= 0 ? 0 : ease.back(u));
        });
      }, ease.linear);
    }
    async function verdict(st, h) {
      empty(gTop);
      const x = extras(st), good = st === 't2ok';
      const v = x.v; v.setAttribute('opacity', 0);
      const c0 = MYBLUE, c1 = good ? GREEN : RED;
      await h.tween(450, function (e) { x.cnt.setAttribute('fill', mix(c0, c1, e)); });
      if (good) {
        const ls = Array.prototype.slice.call(gEdge.querySelectorAll('line'));
        await h.all([pop(v, h, 420), h.tween(900, function (e, t) {
          const w = 0.4 + 0.9 * Math.sin(Math.PI * t * 2) ** 2;
          ls.forEach(function (l) { l.setAttribute('stroke-width', w); l.setAttribute('stroke', mix(BLUE, GREEN, Math.sin(Math.PI * t))); });
        }, ease.linear)]);
      } else {
        await pop(v, h, 420);
      }
    }
    // frame 7: rotas sorteadas uma atrás da outra antes de chegar à da figura
    async function shuffle(h) {
      let s = 7;
      const rnd = function () { s = (s * 16807) % 2147483647; return s / 2147483647; };
      empty(gTop);
      const cnt = counter(tourLen(TOURS.t2[0]));
      const old = Array.prototype.slice.call(gEdge.children);
      await h.tween(260, function (t) { old.forEach(function (el) { el.setAttribute('opacity', 1 - t); }); });
      old.forEach(function (el) { el.remove(); });
      for (let k = 0; k < 5; k++) {
        const rest = [1, 2, 3, 4, 5, 6];
        for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)), t = rest[i]; rest[i] = rest[j]; rest[j] = t; }
        const t = [0].concat(rest), L = tourLen(t);
        const es = edgesOf([t]).map(function (e) { edge(e); e.set(0); e.head(0); return e; });
        await h.tween(240, function (e) { es.forEach(function (x) { x.set(e); }); cnt.set(L * e); }, ease.out);
        es.forEach(function (x) { x.head(1); });
        await h.wait(300);
        await h.tween(140, function (e) { es.forEach(function (x) { x.ln.setAttribute('opacity', 1 - e); x.hd.setAttribute('opacity', 1 - e); }); });
        es.forEach(function (x) { x.ln.remove(); x.hd.remove(); });
      }
      await trace(TOURS.t3[0], h, { cnt: cnt, ms: 22 });
    }

    // ---------- play ----------
    async function play(a, b, h) {
      playing = true;
      try {
        const base = BASE[b];
        if (a === 'vazio') { clear(); await popNodes(h); if (b === 'pts') return; a = 'pts'; }
        if (a === 'pts' && base) {
          clear(); showNodes(true);
          if (base === 't5') {
            const subs = extras('t5').subs;
            subs.forEach(function (x) { x.poly.setAttribute('fill-opacity', 0); x.lb.setAttribute('opacity', 0); });
            for (let k = 0; k < subs.length; k++) {
              const x = subs[k];
              await trace(TOURS.t5[k], h);
              await h.all([h.tween(400, function (e) { x.poly.setAttribute('fill-opacity', 0.1 * e); }), pop(x.lb, h)]);
            }
            const ps = gFill.querySelectorAll('polygon');
            await h.tween(1100, function (e, t) {
              ps.forEach(function (p) { p.setAttribute('fill-opacity', 0.1 + 0.18 * Math.sin(Math.PI * t * 2) ** 2); });
            }, ease.linear);
            return;
          }
          const cnt = (base === 't2' || base === 't3') ? counter(0) : null;
          await trace(TOURS[base][0], h, { cnt: cnt });
          if (base === 't4') {
            const x = extras('t4');
            for (const m of x.miss) {
              m.ring.setAttribute('opacity', 0); m.lb.setAttribute('opacity', 0);
              const p = P[m.i];
              await h.tween(500, function (e, t) {   // o ponto esquecido treme
                const dx = Math.sin(t * Math.PI * 6) * 1.3 * (1 - t);
                nodes[m.i].setAttribute('transform', 'translate(' + (p[0] + dx) + ' ' + p[1] + ')');
              }, ease.linear);
              placeNode(m.i, 1);
              await h.all([pop(m.ring, h, 420), ripple(m.i, RED, h)]);
              await pop(m.lb, h, 360);
            }
            return;
          }
          if (b !== base) { snap(base); await h.wait(250); await verdict(b, h); }
          return;
        }
        if (a === 't2' && b === 't3') { await shuffle(h); return; }
        if ((a === 't2' && b === 't2ok') || (a === 't3' && b === 't3x')) { await verdict(b, h); return; }
      } finally { playing = false; }
    }

    // ---------- arrastar os pontos ----------
    const hits = P.map(function (p, i) {
      const c = S('circle', { r: 5.5, fill: 'transparent' }, gHit);
      c.addEventListener('pointerdown', function (ev) {
        if (playing || cur === 'vazio') return;
        ev.preventDefault(); ev.stopPropagation();
        c.setPointerCapture(ev.pointerId);
        const m = svg.getScreenCTM().inverse();
        const move = function (e2) {
          const pt = new DOMPoint(e2.clientX, e2.clientY).matrixTransform(m);
          P[i][0] = Math.max(3, Math.min(W - 3, pt.x)); P[i][1] = Math.max(3, Math.min(H - 3, pt.y));
          instances.forEach(function (f) { f(); });   // as outras figuras (ex.: frame 8) acompanham
        };
        const up = function () { c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', up); };
        c.addEventListener('pointermove', move); c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
      });
      return c;
    });
    function placeHits() { hits.forEach(function (c, i) { c.setAttribute('cx', P[i][0]); c.setAttribute('cy', P[i][1]); }); }
    function refresh() { if (cur && !playing) snap(cur); placeHits(); }   // quem está animando redesenha no fim
    reset.addEventListener('click', function () {
      P.forEach(function (p, i) { p[0] = P0[i][0]; p[1] = P0[i][1]; });
      instances.forEach(function (f) { f(); });
    });
    instances.push(refresh);
    placeHits();

    return {
      snap: function (st) { placeHits(); snap(st); },
      play: play
    };
  });
})();
