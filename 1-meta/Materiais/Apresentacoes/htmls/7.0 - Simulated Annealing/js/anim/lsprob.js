/* O problema da busca local (aula 7, slides 4–10; figuras img/ls1…ls7).
 *
 * As figuras vêm em camadas (js/anim/dados/ls.js, gerado por ferramentas/figura_camadas.py), então o
 * estado final de cada slide é a figura do PDF. As transições:
 *
 *   vazio → ls1  eixos e curva se desenham; s brota; a seta e "Solução inicial s" entram
 *   ls1 → ls2    a busca local passo a passo: a vizinhança (círculo) cresce em s, o melhor vizinho (na borda,
 *                ladeira abaixo) brota e o caminho é traçado até ele; no último círculo, os vizinhos piscam em
 *                vermelho (todos piores) e surge "ótimo local"
 *   ls2 → ls3    o caminho some e s salta para a nova solução inicial, no alto do morro da direita
 *   ls3 → ls4    a mesma busca, agora descendo para o vale da direita
 *   ls4 → ls5    o ótimo global pulsa, as linhas de nível são traçadas e a cota Δf cresce
 *   ls5 → ls6    surgem as 10 soluções iniciais; cada uma roda a busca local (bolinha com rastro) e para
 *                num ótimo local (✗): nenhuma chega ao ótimo global
 *   ls6 → ls7    as fronteiras vermelhas sobem do eixo; as regiões que não levam ao ótimo global ficam
 *                tingidas de vermelho e a bacia do ótimo global de verde, por alguns segundos
 * Nos slides 9 e 10, clicar no gráfico solta uma solução inicial ali e roda a busca local
 * (✓ verde se chegar ao ótimo global, ✗ vermelho se não).
 */
(function () {
  'use strict';
  const A = window.Anim;
  if (!A) return;
  const S = A.svg, E = A.ease, lerp = A.lerp;
  const NAVY = '#00008b', RED = '#d0281a', GREEN = '#169b3a', DRED = '#8b0000';
  const MAIN = 'KaTeX_Main, serif';
  const range = function (a, b, st) { const r = []; for (let i = a; i <= b; i += (st || 1)) r.push(i); return r; };

  // ---------- grupos de itens (ids de js/anim/dados/ls.js) ----------
  const G = {
    axY: 14, headY: 15, axX: 49, headX: 50, dashR: 51, axLab: range(140, 146),
    curve: 13,
    s1: [11, 12, 32], arr1: 138, head1: 139, lab1: [158, 159, 160],
    circ1: range(23, 31), dots1: [[11, 12]].concat(range(33, 47, 2).map(function (i) { return [i, i + 1]; })),
    line1: 1, opt1: [156, 157],
    s3: [19, 20], arr3: 21, head3: 22, lab3: [147, 148, 149],
    circ2: range(52, 64), dots2: [[87, 88], [89, 90]].concat(range(65, 85, 2).map(function (i) { return [i, i + 1]; })),
    line2: 0, opt2: [150, 151],
    brk: [91, 92, 93], dash1: 136, dash2: 137, glob: [152, 153], df: [154, 155],
    many: range(94, 128, 2).map(function (i) { return [i, i + 1]; }),
    vL: 130, vR: 131, hL: 132, hR: 134, hdL: 133, hdR: 135
  };
  const SC = 273.59 / 248.722;      // largura da figura no slide (\includegraphics[width=…])
  const R = 7.155;                   // raio da vizinhança (círculos do PDF)

  // ---------- curva (amostrada do traço pontilhado) ----------
  function sampleD(d) {
    const n = d.match(/-?\d+(\.\d+)?/g).map(Number), pts = [[n[0], n[1]]];
    for (let i = 2; i + 5 < n.length; i += 6) {
      const p0 = pts[pts.length - 1];
      for (let k = 1; k <= 24; k++) {
        const t = k / 24, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, e = t * t * t;
        pts.push([a * p0[0] + b * n[i] + c * n[i + 2] + e * n[i + 4], a * p0[1] + b * n[i + 1] + c * n[i + 3] + e * n[i + 5]]);
      }
    }
    return pts.sort(function (p, q) { return p[0] - q[0]; });
  }
  function makeCurve(d) {
    const pts = sampleD(d);
    const y = function (x) {
      x = Math.max(pts[0][0], Math.min(pts[pts.length - 1][0], x));
      let lo = 0, hi = pts.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m][0] <= x) lo = m; else hi = m; }
      const f = pts[hi][0] > pts[lo][0] ? (x - pts[lo][0]) / (pts[hi][0] - pts[lo][0]) : 0;
      return lerp(pts[lo][1], pts[hi][1], f);
    };
    const x0 = pts[0][0], x1 = pts[pts.length - 1][0];
    let gx = x0;                                     // ótimo global = ponto mais baixo (maior y no SVG)
    for (let x = x0; x <= x1; x += 0.05) if (y(x) > y(gx)) gx = x;
    return { pts: pts, y: y, x0: x0, x1: x1, gx: gx };
  }
  // busca local do melhor vizinho: candidatos na curva a distância ≤ R; para quando nenhum é melhor
  function descend(C, x) {
    const path = [x];
    for (let it = 0; it < 80; it++) {
      const cy = C.y(x); let bx = x, by = cy;
      for (let xc = Math.max(C.x0, x - R); xc <= Math.min(C.x1, x + R); xc += 0.05) {
        const yc = C.y(xc);
        if (Math.hypot(xc - x, yc - cy) <= R && yc > by) { bx = xc; by = yc; }
      }
      if (by <= cy + 0.02) break;
      x = bx; path.push(x);
    }
    return path;
  }

  A.define('lsprob', function (host) {
    const D = A.figData && A.figData.ls;
    if (!D) { console.warn('lsprob: sem dados (js/anim/dados/ls.js)'); return { snap: function () {} }; }
    const W = D.W, H = D.H, items = D.items;
    const root = S('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Busca local presa em ótimos locais' });
    root.style.width = (W * SC) + 'pt'; root.style.height = (H * SC) + 'pt'; root.style.overflow = 'visible';
    host.appendChild(root);
    const defs = S('defs', {}, root), gItems = S('g', {}, root), gFx = S('g', {}, root), gUser = S('g', {}, root);
    const els = A.figBuild(gItems, items);
    const C = makeCurve(items[G.curve].d);
    const GP = [C.gx, C.y(C.gx)];
    const uid = Math.random().toString(36).slice(2);
    let cur = null;

    const show = function (i, on) { els[i].style.display = on ? '' : 'none'; };
    function reset(i) {
      const e = els[i];
      e.style.opacity = ''; e.removeAttribute('transform'); e.removeAttribute('clip-path');
      e.style.strokeDasharray = ''; e.style.strokeDashoffset = '';
    }
    function setVisible(ids) {
      const on = {}; ids.forEach(function (i) { on[i] = true; });
      items.forEach(function (_, i) { reset(i); show(i, !!on[i]); });
    }
    function snap(st) {
      cur = st;
      gFx.textContent = ''; gUser.textContent = ''; defs.textContent = '';
      setVisible(D.states[st] || []);
      if (st === 'ls6' || st === 'ls7') host.setAttribute('data-interactive', ''); else host.removeAttribute('data-interactive');
      root.style.cursor = (st === 'ls6' || st === 'ls7') ? 'crosshair' : '';
    }
    const center = function (i) { const b = items[i].b; return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; };
    const flat = function (l) { return [].concat.apply([], l); };

    // ---------- utilidades ----------
    function fadeIds(h, ids, a, b, dur) {
      ids.forEach(function (i) { show(i, true); els[i].style.opacity = a; });
      return h.tween(dur, function (e) { ids.forEach(function (i) { els[i].style.opacity = lerp(a, b, e); }); })
        .then(function () { ids.forEach(function (i) { reset(i); if (b === 0) show(i, false); }); });
    }
    function fadeEl(h, list, a, b, dur) {
      list.forEach(function (x) { x.style.opacity = a; });
      return h.tween(dur, function (e) { list.forEach(function (x) { x.style.opacity = lerp(a, b, e); }); });
    }
    function trace(h, i, dur) {
      const el = els[i]; show(i, true); reset(i);
      const L = el.getTotalLength();
      el.style.strokeDasharray = L + ' ' + (L + 1); el.style.strokeDashoffset = L;
      return h.tween(dur, function (e) { el.style.strokeDashoffset = L * (1 - e); }, E.inOut).then(function () { reset(i); });
    }
    function clipRect(x, y, w, hh) {
      const cp = S('clipPath', { id: 'lsc' + uid + Math.random().toString(36).slice(2, 7) }, defs);
      const r = S('rect', { x: x, y: y, width: Math.max(0, w), height: hh }, cp);
      return { id: cp.id, r: r };
    }
    // revela itens por um retângulo de recorte que cresce da esquerda (dir=1) ou da direita (dir=-1)
    function wipe(h, ids, xa, xb, dur, ease) {
      const c = clipRect(xa, 0, 0, H);
      ids.forEach(function (i) { show(i, true); reset(i); els[i].setAttribute('clip-path', 'url(#' + c.id + ')'); });
      return h.tween(dur, function (e) {
        const x = lerp(xa, xb, e);
        c.r.setAttribute('x', Math.min(xa, x)); c.r.setAttribute('width', Math.abs(x - xa));
      }, ease || E.inOut).then(function () { ids.forEach(reset); });
    }
    function pop(h, ids, c, dur) {   // brota a partir do ponto c
      ids.forEach(function (i) { show(i, true); reset(i); });
      return h.tween(dur || 320, function (e, t) {
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
        await h.tween(dur || 150, function (e) { els[i].style.opacity = e; els[i].setAttribute('transform', 'translate(0 ' + (1 - e) + ')'); }, E.out);
        reset(i);
      }
    }
    function curvePath(xa, xb) {
      let d = '';
      for (let x = xa; x <= xb + 1e-6; x += 0.25) d += (d ? 'L' : 'M') + x.toFixed(2) + ' ' + C.y(x).toFixed(2);
      return d;
    }
    function mark(p, ok, parent) {   // ✓ / ✗
      const g = S('g', { stroke: ok ? GREEN : RED, 'stroke-width': 0.9, fill: 'none', 'stroke-linecap': 'round' }, parent || gFx);
      if (ok) S('path', { d: 'M' + (p[0] - 2) + ' ' + p[1] + 'l1.6 1.8l3.2-4' }, g);
      else S('path', { d: 'M' + (p[0] - 1.8) + ' ' + (p[1] - 1.8) + 'l3.6 3.6M' + (p[0] + 1.8) + ' ' + (p[1] - 1.8) + 'l-3.6 3.6' }, g);
      return g;
    }
    function ball(p, parent) {   // bolinha como as do PDF (anel azul, miolo branco), um pouco maior
      const g = S('g', {}, parent || gFx);
      S('circle', { r: 1.5, fill: NAVY }, g); S('circle', { r: 0.8, fill: '#fff' }, g);
      g.at = function (q) { g.setAttribute('transform', 'translate(' + q[0].toFixed(3) + ' ' + q[1].toFixed(3) + ')'); };
      g.at(p);
      return g;
    }
    function ring(h, p, color, dur) {   // anel que pulsa e some
      const c = S('circle', { cx: p[0], cy: p[1], r: 1, fill: 'none', stroke: color, 'stroke-width': 0.8 }, gFx);
      return h.tween(dur || 700, function (e) { c.setAttribute('r', 1 + 9 * e); c.setAttribute('opacity', 1 - e); }, E.out)
        .then(function () { c.remove(); });
    }

    // ---------- a busca local do PDF, círculo a círculo ----------
    async function walk(h, circ, dots, line, optLab) {
      const pts = circ.map(center), n = pts.length;
      const x0 = pts[0][0], dir = pts[n - 1][0] > x0 ? 1 : -1;
      const c = clipRect(x0, 0, 0, H);
      show(line, true); reset(line); els[line].setAttribute('clip-path', 'url(#' + c.id + ')');
      const cut = function (x) { c.r.setAttribute('x', Math.min(x0, x)); c.r.setAttribute('width', Math.abs(x - x0)); };
      for (let k = 0; k < n; k++) {
        const f = k < 2 ? 1 : 0.62;                          // os primeiros passos devagar, depois acelera
        await pop(h, [circ[k]], pts[k], 260 * f);
        if (k === n - 1) break;
        const xa = pts[k][0], xb = pts[k + 1][0];
        await h.all([
          h.tween(240 * f, function (e) { cut(lerp(xa, xb, e)); }, E.inOut),
          h.wait(90 * f).then(function () { return pop(h, dots[k + 1], pts[k + 1], 200 * f); })
        ]);
      }
      // último círculo: todos os vizinhos são piores
      const p = pts[n - 1];
      let xa = p[0], xb = p[0];
      while (xa > C.x0 && Math.hypot(xa - p[0], C.y(xa) - p[1]) <= R) xa -= 0.1;
      while (xb < C.x1 && Math.hypot(xb - p[0], C.y(xb) - p[1]) <= R) xb += 0.1;
      const arc = S('path', { d: curvePath(xa + 0.1, xb - 0.1), fill: 'none', stroke: RED, 'stroke-width': 1.3, 'stroke-linecap': 'round', opacity: 0 }, gFx);
      await h.tween(300, function (e) { arc.setAttribute('opacity', 0.9 * e); });
      await h.wait(350);
      await h.tween(350, function (e) { arc.setAttribute('opacity', 0.9 * (1 - e)); });
      arc.remove();
      // o resto do traço sólido do PDF (passa um pouco do último ponto)
      await h.tween(150, function (e) { cut(lerp(p[0], p[0] + dir * 12, e)); });
      els[line].removeAttribute('clip-path');
      await words(h, optLab, 170);
    }

    // ---------- soluções que rolam ladeira abaixo ----------
    function roller(h, x, parent) {
      const path = descend(C, x), g = S('g', {}, parent || gFx);
      const trail = S('path', { d: '', fill: 'none', stroke: NAVY, 'stroke-width': 0.7, 'stroke-opacity': 0.55 }, g);
      const b = ball([x, C.y(x)], g);
      const end = path[path.length - 1];
      return {
        end: end,
        run: async function (stepMs) {
          for (let k = 1; k < path.length; k++) {
            const xa = path[k - 1], xb = path[k];
            await h.tween(stepMs, function (e) {
              const xc = lerp(xa, xb, e);
              b.at([xc, C.y(xc)]);
              trail.setAttribute('d', xb > x ? curvePath(x, xc) : curvePath(xc, x));
            }, E.linear);
          }
          const ok = Math.abs(end - C.gx) < 3;
          const m = mark([end, C.y(end) - 5], ok, g);
          await h.tween(280, function (e, t) {
            m.setAttribute('opacity', Math.min(1, t * 3));
            const q = [end, C.y(end) - 5];
            m.setAttribute('transform', 'translate(' + q[0] + ' ' + q[1] + ') scale(' + (0.6 + 0.4 * E.back(e)) + ') translate(' + (-q[0]) + ' ' + (-q[1]) + ')');
          }, E.linear);
          return ok;
        }
      };
    }

    // ---------- passos ----------
    async function entry(h) {
      setVisible([]);
      await trace(h, G.axY, 450); await pop(h, [G.headY], center(G.headY), 220);
      await trace(h, G.axX, 550); await pop(h, [G.headX], center(G.headX), 220);
      await h.all([fadeIds(h, [G.dashR], 0, 1, 300), fadeIds(h, G.axLab, 0, 1, 400)]);
      await wipe(h, [G.curve], C.x0 - 1, C.x1 + 1, 1400);
      await pop(h, G.s1, center(11), 380);
      await trace(h, G.arr1, 450); await pop(h, [G.head1], center(G.head1), 200);
      await words(h, G.lab1, 140);
    }

    async function play(a, b, h) {
      const st = D.states;
      const without = function (s, ids) { return st[s].filter(function (i) { return ids.indexOf(i) < 0; }); };
      if (a === 'vazio' && b === 'ls1') return entry(h);

      if (a === 'ls1' && b === 'ls2') {
        await fadeIds(h, [G.arr1, G.head1].concat(G.lab1), 1, 0, 300);
        const anim = G.circ1.concat(flat(G.dots1.slice(1)), [32, G.line1], G.opt1);
        setVisible(without('ls2', anim));
        return walk(h, G.circ1, G.dots1, G.line1, G.opt1);
      }

      if (a === 'ls2' && b === 'ls3') {
        const out = G.circ1.concat(flat(G.dots1.slice(1)), [32, G.line1], G.opt1);
        await fadeIds(h, out, 1, 0, 400);
        setVisible(without('ls3', G.s3.concat([G.arr3, G.head3], G.lab3)).concat([11, 12]));
        // s salta para a nova solução inicial
        const p0 = center(11), p1 = center(19);
        await h.tween(800, function (e) {
          const dx = (p1[0] - p0[0]) * e, dy = (p1[1] - p0[1]) * e - 30 * Math.sin(Math.PI * e);
          [11, 12].forEach(function (i) { els[i].setAttribute('transform', 'translate(' + dx + ' ' + dy + ')'); });
        }, E.inOut);
        [11, 12].forEach(function (i) { reset(i); show(i, false); });
        G.s3.forEach(function (i) { show(i, true); });
        await ring(h, p1, NAVY, 500);
        await trace(h, G.arr3, 450); await pop(h, [G.head3], center(G.head3), 200);
        return words(h, G.lab3, 140);
      }

      if (a === 'ls3' && b === 'ls4') {
        const anim = G.circ2.concat(flat(G.dots2), [G.line2], G.opt2);
        setVisible(without('ls4', anim));
        G.dots2[0].forEach(function (i) { show(i, true); });   // 87/88: o próprio s
        return walk(h, G.circ2, G.dots2, G.line2, G.opt2);
      }

      if (a === 'ls4' && b === 'ls5') {
        const anim = G.brk.concat([G.dash1, G.dash2], G.glob, G.df);
        setVisible(without('ls5', anim));
        await h.all([ring(h, GP, GREEN, 800), h.wait(250).then(function () { return words(h, G.glob, 170); })]);
        await ring(h, GP, GREEN, 600);
        await wipe(h, [G.dash1], items[G.dash1].b[0], items[G.dash1].b[2] + 0.5, 500, E.out);
        await wipe(h, [G.dash2], items[G.dash2].b[2] + 0.5, items[G.dash2].b[0] - 0.5, 700, E.out);
        // cota Δf cresce do nível do ótimo local até o do global
        const yA = items[92].b[1], yB = items[91].b[1], xm = items[93].b[0];
        await pop(h, [92], [xm, yA], 200);
        const c = clipRect(xm - 3, yA - 0.5, 6, 0);
        [93, 91].forEach(function (i) { show(i, true); els[i].setAttribute('clip-path', 'url(#' + c.id + ')'); });
        await h.tween(400, function (e) { c.r.setAttribute('height', (yB - yA + 1) * e); }, E.out);
        [93, 91].forEach(reset);
        return words(h, G.df, 150);
      }

      if (a === 'ls5' && b === 'ls6') {
        const keep = st.ls6;
        const out = st.ls5.filter(function (i) { return keep.indexOf(i) < 0 && [0, 3, 5, 13, 49, 50, 51, 2, 9].indexOf(i) < 0; });
        // a máscara branca 4 (do ls6) cobre de volta o traço sólido do caminho
        await h.all([fadeIds(h, out, 1, 0, 450), fadeIds(h, [4], 0, 1, 450)]);
        setVisible(without('ls6', flat(G.many)));
        // as outras soluções iniciais brotam
        const starts = G.many.filter(function (_, k) { return k % 2 === 0; });   // pares duplicados no PDF
        for (let k = 0; k < G.many.length; k += 2) {
          const ids = G.many[k].concat(G.many[k + 1]);
          await pop(h, ids, center(ids[0]), 200);
        }
        await h.wait(300);
        // cada uma roda a busca local
        const xs = starts.map(function (p) { return center(p[0])[0]; }).concat([center(19)[0]]);
        const rs = xs.map(function (x) { return roller(h, x); });
        await h.all(rs.map(function (r, k) { return h.wait(k * 120).then(function () { return r.run(110); }); }));
        await ring(h, GP, GREEN, 700);
        // o core volta ao estado do PDF ao fim do play: mantém o resultado à vista e depois some suave
        await h.wait(4000);
        const fx = [].slice.call(gFx.childNodes);
        await fadeEl(h, fx, 1, 0, 700);
        return;
      }

      if (a === 'ls6' && b === 'ls7') {
        if (gFx.childNodes.length) {
          const old = [].slice.call(gFx.childNodes);
          await fadeEl(h, old, 1, 0, 350); old.forEach(function (n) { n.remove(); });
        }
        const anim = [G.vL, G.vR, G.hL, G.hR, G.hdL, G.hdR];
        setVisible(without('ls7', anim));
        const top = 36.2, base = 125.68, xL = 44.54, xR = 99.88;
        const band = function (x0, x1, col) { return S('rect', { x: x0, y: top, width: x1 - x0, height: base - top, fill: col, opacity: 0 }, gFx); };
        const bands = [band(C.x0, xL, RED), band(xR, C.x1, RED)], gb = band(xL, xR, GREEN);
        await h.all([trace(h, G.vL, 650), trace(h, G.vR, 650),
          h.tween(650, function (e) { bands.forEach(function (r) { r.setAttribute('opacity', 0.12 * e); }); })]);
        await h.all([trace(h, G.hL, 250), trace(h, G.hR, 250)]);
        await h.all([pop(h, [G.hdL], center(G.hdL), 220), pop(h, [G.hdR], center(G.hdR), 220)]);
        await h.tween(450, function (e) { gb.setAttribute('opacity', 0.12 * e); });
        await ring(h, GP, GREEN, 700);
        await h.wait(1600);
        await h.tween(700, function (e) { bands.concat([gb]).forEach(function (r) { r.setAttribute('opacity', 0.12 * (1 - e)); }); });
        bands.concat([gb]).forEach(function (r) { r.remove(); });
        return;
      }
    }

    // ---------- clique: soltar uma solução inicial (slides 9 e 10) ----------
    function rafHelper() {   // h mínimo fora do play (mesma interface usada acima)
      const tw = function (dur, fn, ease) {
        ease = ease || E.inOut;
        return new Promise(function (res) {
          const t0 = performance.now();
          (function f(now) {
            const t = Math.min(1, (now - t0) / dur);
            fn(ease(t), t);
            if (t < 1) requestAnimationFrame(f); else res();
          })(t0);
        });
      };
      return { tween: tw, wait: function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); }, all: function (l) { return Promise.all(l); } };
    }
    root.addEventListener('click', function (ev) {
      if (cur !== 'ls6' && cur !== 'ls7') return;
      const m = root.getScreenCTM(); if (!m) return;
      const pt = root.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
      const q = pt.matrixTransform(m.inverse());
      if (q.x < C.x0 || q.x > C.x1 || q.y < 0 || q.y > 126) return;
      const x = Math.max(C.x0 + 0.5, Math.min(C.x1 - 0.5, q.x));
      while (gUser.childNodes.length > 5) gUser.firstChild.remove();
      const g = S('g', {}, gUser), st = cur;
      roller(rafHelper(), x, g).run(140).then(function () {
        setTimeout(function () {
          if (cur !== st || !g.parentNode) return;
          rafHelper().tween(600, function (e) { g.setAttribute('opacity', 1 - e); }).then(function () { g.remove(); });
        }, 4000);
      });
    });

    return { snap: snap, play: play };
  });
})();
