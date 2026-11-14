/* Branch and Bound (aula 3, frames 42–55): figuras bb1…bb14 do Ipe em camadas.
 *
 * Dados: js/anim/dados/bb.js (figura_camadas.py bb … bb1.pdf … bb14.pdf; quadro 320.4 × 188.4).
 * Uso:  <span class="anim pl" data-anim="bnb" data-from="bbN-1" data-state="bbN"><img src="img/bbN.svg" …></span>
 *       (a <img> do PDF fica invisível e reserva o espaço; o SVG por cima). Estados = nomes das figuras + "vazio".
 *
 * Geometria (pt do quadro): origem do gráfico em (24.2, 168.2), 16 pt por unidade (x1 → direita, x2 → cima).
 * Função objetivo usada para animar o Simplex: max z = 5 x1 − x2 (bate com os rótulos da raiz, de P1 e de P4:
 * 16.3, 13.4, 13.0; o .tex não a escreve). Em coordenadas do quadro as retas de nível são 5X + Y = c.
 *
 * Estado final de cada frame = figura do PDF (itens do bb.js). Os acréscimos ("inviável", "podado", "ótimo") são
 * só durante a animação.
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease, lerp = Anim.lerp;
  const FD = Anim.figData || {};
  const RED = '#d01c1c', BLUE = '#1f5fbf', SWEEP = '#c0392b';
  const CAP = '"LM Sans 8", "LM Sans", sans-serif';
  const PX0 = 24.2, PX1 = 118, PY0 = 10, PY1 = 168.2;        // área do gráfico (reta de nível recortada aqui)
  const NODE = { P: [260.2, 48.2], P1: [236.2, 96.9], P2: [284.2, 96.9], P3: [212.2, 144.9], P4: [260.2, 144.9] };

  function mk(it, parent) {
    if (it.t === 'x') {
      const t = S('text', { x: it.x, y: it.y, 'font-size': it.fs, 'font-family': it.ff, fill: it.c }, parent);
      if (it.st) t.setAttribute('font-style', it.st);
      if (it.fw) t.setAttribute('font-weight', it.fw);
      if (it.r) t.setAttribute('transform', 'rotate(' + it.r + ' ' + it.x + ' ' + it.y + ')');   // rótulos das arestas
      else if (/\s/.test(it.tx.trim())) { t.setAttribute('textLength', (it.b[2] - it.b[0]).toFixed(2)); t.setAttribute('lengthAdjust', 'spacing'); }
      t.textContent = it.tx;
      return t;
    }
    const p = S('path', { d: it.d, fill: it.f || 'none' }, parent);
    if (it.fo !== undefined) p.setAttribute('fill-opacity', it.fo);
    if (it.eo) p.setAttribute('fill-rule', 'evenodd');
    if (it.s) {
      p.setAttribute('stroke', it.s); p.setAttribute('stroke-width', it.w);
      if (it.so !== undefined) p.setAttribute('stroke-opacity', it.so);
      if (it.da) p.setAttribute('stroke-dasharray', it.da);
      if (it.lc) p.setAttribute('stroke-linecap', it.lc);
      if (it.lj) p.setAttribute('stroke-linejoin', it.lj);
    }
    return p;
  }
  const range = function (a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };

  Anim.define('bnb', function (host) {
    const D = FD.bb;
    if (!D) { console.warn('bnb: faltam os dados (dados/bb.js)'); return { snap: function () {}, play: null }; }
    const IT = D.items;
    const svg = S('svg', { viewBox: '0 0 ' + D.W + ' ' + D.H });
    host.appendChild(svg);
    const gIt = S('g', null, svg), gTop = S('g', null, svg);
    const els = IT.map(function (it) { return mk(it, gIt); });
    const ST = function (s) { return s === 'vazio' ? [] : D.states[s] || []; };

    // ---------- utilidades ----------
    function empty(g) { while (g.firstChild) g.removeChild(g.firstChild); }
    // transformação da animação por fora da rotação própria do item (texto girado)
    const base = els.map(function (e) { return e.getAttribute('transform') || ''; });
    function setT(i, s) { const t = ((s || '') + ' ' + base[i]).trim(); if (t) els[i].setAttribute('transform', t); else els[i].removeAttribute('transform'); }
    function reset(e) { e.style.opacity = ''; setT(els.indexOf(e), null); e.style.strokeDasharray = ''; e.style.strokeDashoffset = ''; e.style.fill = ''; }
    function showSet(ids) { const s = new Set(ids); els.forEach(function (e, i) { e.style.display = s.has(i) ? '' : 'none'; reset(e); }); }
    function show(ids, on) { ids.forEach(function (i) { els[i].style.display = on === false ? 'none' : ''; }); }
    function op(ids, v) { ids.forEach(function (i) { els[i].style.opacity = v; }); }
    function tf(ids, s) { ids.forEach(function (i) { setT(i, s); }); }
    function box(ids) {
      const b = [Infinity, Infinity, -Infinity, -Infinity];
      ids.forEach(function (i) { const q = IT[i].b; b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[2]); b[3] = Math.max(b[3], q[3]); });
      return b;
    }
    const ctr = function (ids) { const b = box(ids); return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; };
    function fade(h, ids, to, dur) {
      show(ids); const from = to ? 0 : 1;
      op(ids, from);
      return h.tween(dur || 300, function (e) { op(ids, lerp(from, to, e)); }).then(function () { op(ids, ''); if (!to) show(ids, false); });
    }
    function pop(h, ids, c, dur) {
      c = c || ctr(ids);
      show(ids); op(ids, 0);
      return h.tween(dur || 340, function (e, t) {
        op(ids, Math.min(1, t * 2.5));
        tf(ids, 'translate(' + c[0] + ' ' + c[1] + ') scale(' + Math.max(0, e) + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')');
      }, ease.back).then(function () { op(ids, ''); tf(ids, null); });
    }
    function draw(h, ids, dur) {   // traço revelado do início ao fim do caminho
      show(ids);
      const L = ids.map(function (i) { return els[i].getTotalLength(); });
      ids.forEach(function (i, k) { els[i].style.strokeDasharray = L[k] + ' ' + L[k]; els[i].style.strokeDashoffset = L[k]; });
      return h.tween(dur || 420, function (e) { ids.forEach(function (i, k) { els[i].style.strokeDashoffset = L[k] * (1 - e); }); }, ease.out)
        .then(function () { ids.forEach(function (i) { els[i].style.strokeDasharray = ''; els[i].style.strokeDashoffset = ''; }); });
    }
    async function typeIn(h, ids, step) {   // textos da esquerda para a direita
      const order = ids.slice().sort(function (a, b) { return IT[a].b[0] - IT[b].b[0]; });
      show(order); op(order, 0);
      for (const i of order) { await h.wait(step || 55); els[i].style.opacity = ''; }
    }
    function pulse(h, ids, amp, dur) {
      const c = ctr(ids);
      return h.tween(dur || 520, function (e, t) {
        const s = 1 + (amp || 0.35) * Math.sin(Math.PI * t);
        tf(ids, 'translate(' + c[0] + ' ' + c[1] + ') scale(' + s + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')');
      }, ease.linear).then(function () { tf(ids, null); });
    }
    function shake(h, ids, dur) {
      return h.tween(dur || 450, function (e, t) { tf(ids, 'translate(' + (Math.sin(t * Math.PI * 6) * 1.6 * (1 - t)) + ' 0)'); }, ease.linear)
        .then(function () { tf(ids, null); });
    }
    function recolor(h, ids, from, to, dur) {   // texto preto -> cor final (a cor do item é a do PDF)
      return h.tween(dur || 380, function (e) { ids.forEach(function (i) { els[i].style.fill = Anim.mix(from, to, e); }); })
        .then(function () { ids.forEach(function (i) { els[i].style.fill = ''; }); });
    }
    // rótulo da solução "voa" do gráfico para a árvore (escala + translação a partir da caixa de origem)
    function fly(h, ids, from, dur) {
      const T = box(ids), F = box(from);
      const k0 = (F[3] - F[1]) / (T[3] - T[1]);
      show(ids); op(ids, 0.9);
      return h.tween(dur || 750, function (e) {
        const k = lerp(k0, 1, e), x = lerp(F[0], T[0], e), y = lerp(F[1], T[1], e) - Math.sin(Math.PI * e) * 8;
        tf(ids, 'translate(' + x + ' ' + y + ') scale(' + k + ') translate(' + (-T[0]) + ' ' + (-T[1]) + ')');
      }, ease.inOut).then(function () { op(ids, ''); tf(ids, null); });
    }
    function poly(pts, attrs) {
      return S('path', Object.assign({ d: 'M' + pts.map(function (p) { return p[0] + ' ' + p[1]; }).join('L') + 'Z' }, attrs), gTop);
    }
    // pedaço da região que sai na ramificação: pisca em vermelho e some
    async function cut(h, pts) {
      const p = poly(pts, { fill: '#000080', 'fill-opacity': 0.1, stroke: 'none' });
      await h.tween(380, function (e) { p.setAttribute('fill', Anim.mix('#000080', RED, e)); p.setAttribute('fill-opacity', lerp(0.1, 0.35, e)); });
      await h.tween(420, function (e) { p.setAttribute('fill-opacity', 0.35 * (1 - e)); });
      p.remove();
    }
    function caption(txt, x, y, col, anchor) {
      const t = S('text', { x: x, y: y, 'font-size': 5.6, 'font-family': CAP, fill: col || RED, 'text-anchor': anchor || 'middle', opacity: 0 }, gTop);
      t.textContent = txt;
      return t;
    }
    async function flash(h, t, hold) {   // legenda temporária
      await h.tween(250, function (e) { t.setAttribute('opacity', e); });
      await h.wait(hold || 1400);
      await h.tween(350, function (e) { t.setAttribute('opacity', 1 - e); });
      t.remove();
    }
    // Simplex na região: a reta de nível 5X + Y = c desliza (no sentido em que z cresce) até o vértice ótimo
    async function sweep(h, region, vx, vy) {
      const cs = region.map(function (p) { return 5 * p[0] + p[1]; });
      const c0 = Math.min.apply(null, cs) - 30, c1 = 5 * vx + vy;
      const ln = S('path', { stroke: SWEEP, 'stroke-width': 0.7, 'stroke-dasharray': '2.5 1.5', fill: 'none' }, gTop);
      const lb = S('text', { 'font-size': 6.5, 'font-family': 'KaTeX_Math', 'font-style': 'italic', fill: SWEEP }, gTop);
      lb.textContent = 'z';
      const set = function (c) {   // segmento de 5X + Y = c dentro da área do gráfico
        const xa = Math.max(PX0, (c - PY1) / 5), xb = Math.min(PX1, (c - PY0) / 5);
        if (xb <= xa) { ln.setAttribute('d', ''); return; }
        ln.setAttribute('d', 'M' + xa + ' ' + (c - 5 * xa) + 'L' + xb + ' ' + (c - 5 * xb));
        lb.setAttribute('x', xb + 1.5); lb.setAttribute('y', c - 5 * xb + 4);
      };
      await h.tween(1500, function (e) { set(lerp(c0, c1, e)); }, ease.inOut);
      const ring = S('circle', { cx: vx, cy: vy, r: 2, fill: 'none', stroke: SWEEP, 'stroke-width': 0.6 }, gTop);
      await h.tween(420, function (e) { ring.setAttribute('r', 2 + 7 * e); ring.setAttribute('opacity', 1 - e); });
      ring.remove();
      await h.tween(300, function (e) { ln.setAttribute('opacity', 1 - e); lb.setAttribute('opacity', 1 - e); });
      ln.remove(); lb.remove();
    }

    // itens com a mesma geometria em figuras vizinhas (marcas dos eixos e nós redesenhados pelo Ipe com
    // centésimos de diferença) trocam sem animar
    function same(a, b) {
      const A = IT[a], B = IT[b];
      if (A.t !== B.t) return false;
      for (let k = 0; k < 4; k++) if (Math.abs(A.b[k] - B.b[k]) > 0.6) return false;
      if (A.t === 'x') return A.tx === B.tx && A.c === B.c && A.fs === B.fs;
      return A.f === B.f && A.s === B.s && A.fo === B.fo && A.w === B.w;
    }
    function diff(a, b) {
      const sa = new Set(ST(a)), sb = new Set(ST(b));
      let enter = ST(b).filter(function (i) { return !sa.has(i); }), leave = ST(a).filter(function (i) { return !sb.has(i); });
      const swapped = [];
      enter = enter.filter(function (e) {
        const k = leave.findIndex(function (l) { return same(l, e); });
        if (k < 0) return true;
        swapped.push([leave[k], e]); leave.splice(k, 1); return false;
      });
      return { enter: enter, leave: leave, swapped: swapped };
    }

    // ---------- coreografia de cada figura ----------
    const R0 = [[24.2, 32.2], [85.28, 123.35], [51.59, 168.2], [24.2, 168.2]];            // região inicial
    const R1 = [[24.2, 168.2], [51.59, 168.2], [72.2, 140.76], [72.2, 103.83], [24.2, 32.2]];   // P1 (x1 ≤ 3)
    const R4 = [[24.2, 136.28], [72.2, 136.28], [72.2, 104.28], [24.2, 32.28]];           // P4 (x2 ≥ 2)
    const R3 = [[24.2, 152.28], [24.2, 168.28], [52.2, 168.28], [64.2, 152.28]];          // P3 (x2 ≤ 1)
    const SCENE = {
      bb1: async function (h) {
        await h.all([draw(h, [2], 500), draw(h, [4], 500)]);
        await h.all([pop(h, [3], [121.8, 168.2], 220), pop(h, [5], [24.2, 9.7], 220), fade(h, [92, 93, 94, 95, 96], 1, 300)]);
        for (const i of [34, 45, 46, 47, 48, 49, 50, 51, 52, 6, 7, 8]) { await h.wait(25); fade(h, [i], 1, 160).catch(function () {}); }
        await h.all([fade(h, [35], 1, 500), draw(h, [36], 700)]);
        await sweep(h, R0, 85.28, 123.35);
        await pop(h, [53], [85.28, 123.35], 300);
        await fade(h, range(114, 122), 1, 300);
        await typeIn(h, [97, 98, 103, 104, 105].concat(range(106, 113)));
        await h.wait(200);
        await pop(h, [91, 123], NODE.P, 380);
        await fly(h, range(124, 134), [103, 104, 105].concat(range(106, 113)));
      },
      bb2: async function (h) {
        await fade(h, range(114, 122), 0, 250);
        show([103, 104, 105], false); show([99, 100, 101, 102]);
        await h.all([recolor(h, [100, 101, 102], '#000000', '#ff0000', 350), pulse(h, [100, 101, 102], 0.5, 600)]);
        await h.wait(150);
        await h.all([draw(h, [89], 500), draw(h, [90], 500)]);
        await h.all([pop(h, [135], null, 260), pop(h, [136], null, 260)]);
      },
      bb3: async function (h, d) {
        await fade(h, [53, 97, 98, 99, 100, 101, 102].concat(range(106, 113)), 0, 300);
        show([35, 36], false); show([59]);
        const c = cut(h, [[72.2, 103.83], [85.28, 123.35], [72.2, 140.76]]);
        await h.all([fade(h, [89, 90], 0, 250), draw(h, [55, 57], 520)]);
        await h.all([pop(h, [56], [64.2, 88.2], 220), pop(h, [58], [96.2, 88.2], 220), c]);
      },
      bb4: async function (h) {
        await h.all([draw(h, [61], 450), draw(h, [62], 450)]);
        await h.all([pop(h, [65, 139, 140], NODE.P1), pop(h, [63, 141, 142], NODE.P2)]);
        await h.all([fade(h, range(143, 146), 1, 300), fade(h, range(147, 150), 1, 300)]);
        await pop(h, [151, 152], null, 320);
        await pop(h, [303, 304], null, 320);
        await shake(h, [303, 304]);
      },
      bb5: async function (h) {
        const t = caption('vazia: inviável', 120, 128);
        await h.all([shake(h, [303, 304], 400), flash(h, t, 900)]);
        await h.all([fade(h, [303, 304], 0, 300), fade(h, [55, 56, 57, 58], 0, 300)]);
        await draw(h, [66], 260); await draw(h, [67], 260);
        await flash(h, caption('inviável', NODE.P2[0], 116), 1100);
      },
      bb6: async function (h) {
        await sweep(h, R1, 72.2, 140.76);
        await pop(h, [88], [72.2, 140.76], 300);
        await typeIn(h, range(153, 158).concat(range(162, 168)));
        await h.wait(200);
        await fly(h, range(169, 179), range(155, 168));
      },
      bb7: async function (h) {
        show([162, 163, 164], false); show([159, 160, 161]);
        await h.all([recolor(h, [159, 160, 161], '#000000', '#ff0000', 350), pulse(h, [159, 160, 161], 0.5, 600)]);
      },
      bb8: async function (h) {
        await fade(h, [88, 151, 152].concat(range(153, 158), range(159, 161), range(165, 168)), 0, 300);
        show([59], false); show([72, 73, 74, 75]);
        const c = cut(h, [[24.2, 136.28], [72.2, 136.28], [72.2, 140.76], [64.2, 152.28], [24.2, 152.28]]);
        await h.all([draw(h, [68, 70], 560), c]);
        await h.all([pop(h, [69], [80.2, 160.28], 220), pop(h, [71], [80.2, 128.28], 220), pop(h, [180], null, 260), pop(h, [181], null, 260)]);
      },
      bb9: async function (h) {
        // rótulo de P1 sobe 2pt (o Ipe o redesenhou): desliza
        const F = box(range(169, 179)), T = box(range(189, 199));
        show(range(169, 179), false); show(range(189, 199));
        h.tween(300, function (e) { tf(range(189, 199), 'translate(' + lerp(F[0] - T[0], 0, e) + ' ' + lerp(F[1] - T[1], 0, e) + ')'); }).then(function () { tf(range(189, 199), null); });
        await h.all([draw(h, [76], 450), draw(h, [80], 450)]);
        await h.all([pop(h, [82, 185, 186], NODE.P3), pop(h, [81, 187, 188], NODE.P4)]);
        await h.all([fade(h, range(211, 214), 1, 300), fade(h, range(215, 218), 1, 300)]);
        await h.all([pop(h, [223, 224], null, 320), pop(h, [225, 226], null, 320)]);
      },
      bb10: async function (h) {
        await fade(h, range(68, 71), 0, 300);
        await sweep(h, R4, 72.2, 136.28);
        await pop(h, [87], [72.2, 136.76], 300);
        await typeIn(h, range(227, 240));
        await pulse(h, [230, 231, 232, 234, 235, 236], 0.4, 500);
        await fly(h, range(241, 252), range(229, 240));
        await h.all([pop(h, [301, 302], null, 380), pulse(h, [81, 187, 188], 0.25, 650)]);
      },
      bb11: async function (h) {
        await fade(h, [87, 301, 302].concat(range(227, 240)), 0, 300);
        await sweep(h, R3, 64.2, 152.28);
        await pop(h, [86], [64.2, 152.76], 300);
        await typeIn(h, range(253, 265));
        await h.wait(200);
        await fly(h, range(266, 276), range(255, 265));
      },
      bb12: async function (h) {
        await fade(h, [86].concat(range(253, 265)), 0, 300);
        await h.all([fade(h, [0], 1, 350), fade(h, [1], 1, 350)]);
        await draw(h, [85], 500);
        const words = range(277, 300);
        show(words); op(words, 0);
        for (const i of words) { await h.wait(70); els[i].style.opacity = ''; }
      },
      bb13: async function (h) {
        await fade(h, range(277, 300).concat([85]), 0, 300);
        await h.all([pulse(h, [1], 0.15, 450), fade(h, [0, 1], 0, 450)]);
        await draw(h, [83], 260); await draw(h, [84], 260);
        await flash(h, caption('podado: 11,8 < 13,0', NODE.P3[0], 176), 1300);
      },
      bb14: async function (h, d) {
        // nós ficam brancos; P4 (solução ótima) ganha destaque
        const pairs = [[19, 18], [64, 23], [63, 22], [82, 79]];
        pairs.forEach(function (p) { show([p[1]]); op([p[1]], 0); });
        await h.tween(600, function (e) { pairs.forEach(function (p) { op([p[0]], 1 - e); op([p[1]], e); }); });
        pairs.forEach(function (p) { show([p[0]], false); op([p[0], p[1]], ''); });
        show([78]); op([78], 0);
        await h.tween(400, function (e) { op([78], e); op([81], 1 - e); });
        show([81], false); op([78, 81], '');
        await pulse(h, [78, 187, 188, 184], 0.3, 700);
        await flash(h, caption('solução ótima', NODE.P4[0], 177, BLUE), 1500);
      }
    };

    return {
      snap: function (st) { empty(gTop); showSet(ST(st)); },
      play: async function (a, b, h) {
        empty(gTop);
        const d = diff(a, b);
        showSet(ST(a));
        d.swapped.forEach(function (p) { show([p[0]], false); show([p[1]]); });
        if (SCENE[b] && (a === 'vazio' ? b === 'bb1' : true)) {
          if (a === 'vazio') showSet([]);
          await SCENE[b](h, d);
        }
        // o que a coreografia não tratou entra/sai em fade; no fim, exatamente a figura do PDF
        const target = new Set(ST(b));
        const rest = d.enter.filter(function (i) { return els[i].style.display === 'none'; });
        const gone = d.leave.filter(function (i) { return els[i].style.display !== 'none' && !target.has(i); });
        if (rest.length || gone.length) await h.all([fade(h, rest, 1, 250), fade(h, gone, 0, 250)]);
        empty(gTop); showSet(ST(b));
      }
    };
  });
})();
