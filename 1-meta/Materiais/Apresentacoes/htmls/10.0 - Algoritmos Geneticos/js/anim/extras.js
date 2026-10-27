/* Animações menores da aula 10 (sugestão 10).
 *
 * tline    (frames 13–24; dados/timeline.js = timeline1…8) — linha do tempo. t0 → t1: as células surgem da
 *          esquerda para a direita. Depois, cada balão novo chega pelo lado dele (de cima ou de baixo) até a
 *          linha e o ano correspondente pulsa. t7 → t8: tudo esmaece, menos Holland (1975). O PDF também
 *          esmaece os textos (transparência que o figura_camadas não lê): feito à mão (opacidade 0,3)
 * popmet   (frame 5; camada sobre a figura) — três soluções vão de um conjunto ao outro pela seta "Gerar
 *          população" (novas, em vermelho) e voltam pela seta de baixo, passando pela Memória, que as registra
 * galap    (frames 33 e 35; dados/galapagos.js = pass5, pass6) — 33: o mar e as ilhas surgem, os pássaros
 *          aparecem em onda ao longo das setas (de baixo para cima) e por fim os das ilhas. 35: os pássaros das
 *          setas da esquerda saem, a lupa surge, as linhas são traçadas e o círculo de zoom cresce da lente
 * subst    (frames 87–88; dados/subst.js = Substituicao1…3) — 87: a seta "Ordenação crescente" e a caixa nova
 *          aparecem e cada rota voa da 1ª linha para a sua posição na linha ordenada. 88: a 3ª linha desce, a
 *          região dos k = 3 primeiros é marcada e um anel sorteia, entre eles, os m = 2 que recebem o ✗
 * passaros (frames 29–32; dados/passaros.js = pass1…4) — 29: os pássaros chegam e os bicos crescem; 30: a linha
 *          liga os bicos diferentes, que pulsam; 31: os bicos somem e o contorno do 1º pássaro desliza sobre os outros
 *          (são iguais); 32: o mesmo bico quadrado surge nos três (um ancestral comum?)
 * mutdemo  (frame 83, passo novo) — demonstração: 12 rotas de 8 cidades; cada posição sofre swap com
 *          probabilidade pm. Botões de pm, "1 geração", "▶ rodar", "↺ reiniciar"; contadores de mutações
 *
 * Os estados finais das figuras são os do PDF; os destaques são passageiros.
 */
(function () {
  'use strict';
  const A = window.Anim;
  if (!A) return;
  const S = A.svg, E = A.ease, lerp = A.lerp;
  const HI = '#e0a000', RED = '#c0281a', MYBLUE = '#0061a5', GREEN = '#169b3a';
  const MAIN = 'KaTeX_Main, serif', MATH = 'KaTeX_Math, serif';

  // ---------- figuras em camadas ----------
  const ACC = { '´': '́', '˜': '̃', '¸': '̧', 'ˆ': '̂', '`': '̀', '¨': '̈' };
  const fixText = function (t) { return t.replace(/([´˜¸ˆ`¨])(\S)/g, function (m, a, c) { return c + ACC[a]; }).normalize('NFC'); };
  function item(root, it) {
    let e;
    if (it.t === 'x') {
      e = S('text', { x: it.x, y: it.y, fill: it.c, 'font-family': it.ff + ', serif', 'font-size': it.fs }, root);
      if (it.st) e.setAttribute('font-style', it.st);
      if (it.fw) e.setAttribute('font-weight', it.fw);
      e.textContent = fixText(it.tx);
    } else {
      e = S('path', { d: it.d, fill: it.f || 'none' }, root);
      if (it.fo != null) e.setAttribute('fill-opacity', it.fo);
      if (it.eo) e.setAttribute('fill-rule', 'evenodd');
      if (it.s) {
        e.setAttribute('stroke', it.s); e.setAttribute('stroke-width', it.w);
        if (it.so != null) e.setAttribute('stroke-opacity', it.so);
        if (it.da) e.setAttribute('stroke-dasharray', it.da);
        if (it.lc) e.setAttribute('stroke-linecap', it.lc);
        if (it.lj) e.setAttribute('stroke-linejoin', it.lj);
      }
    }
    return e;
  }
  function bbox(items, ids) {
    const b = [Infinity, Infinity, -Infinity, -Infinity];
    ids.forEach(function (i) { const q = items[i].b; b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[2]); b[3] = Math.max(b[3], q[3]); });
    return b;
  }
  const mid = function (b) { return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; };
  const tfS = function (dx, dy, s, c) {
    let t = 'translate(' + dx.toFixed(3) + ' ' + dy.toFixed(3) + ')';
    if (c && s != null && s !== 1) t += ' translate(' + c[0] + ' ' + c[1] + ') scale(' + Math.max(0.001, s) + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')';
    return t;
  };
  function stroke(h, el, dur) {
    let L = 0;
    try { L = el.getTotalLength(); } catch (e) { L = 0; }
    el.setAttribute('opacity', 1);
    if (!(L > 0)) return Promise.resolve();
    el.style.strokeDasharray = L; el.style.strokeDashoffset = L;
    return h.tween(dur || 400, function (e) { el.style.strokeDashoffset = L * (1 - e); })
      .then(function () { el.style.strokeDasharray = ''; el.style.strokeDashoffset = ''; });
  }
  // indivíduos: corpo = peça grande preenchida; as demais peças vão para o corpo mais próximo que as contém
  function groupBy(items, ids, isBody, pad) {
    const G = ids.filter(function (i) { return isBody(items[i]); }).map(function (i) { return { body: i, ids: [] }; });
    ids.forEach(function (i) {
      const it = items[i];
      if (it.t !== 'p') return;
      const c = mid(it.b);
      let best = null, bd = Infinity;
      G.forEach(function (g) {
        const q = items[g.body].b;
        if (it.b[0] < q[0] - pad || it.b[1] < q[1] - pad || it.b[2] > q[2] + pad || it.b[3] > q[3] + pad) return;
        const m = mid(q), d = Math.hypot(c[0] - m[0], c[1] - m[1]);
        if (d < bd) { bd = d; best = g; }
      });
      if (best) best.ids.push(i);
    });
    G.forEach(function (g) { g.ids.sort(function (a, b) { return a - b; }); g.bb = bbox(items, g.ids); g.c = mid(g.bb); });
    return G;
  }
  // camada: itens em ordem de desenho; set/get de opacidade
  function Layer(svg, items) {
    const L = { el: {} };
    L.build = function (ids) {
      svg.textContent = ''; L.el = {};
      L.root = S('g', {}, svg);
      ids.slice().sort(function (a, b) { return a - b; }).forEach(function (i) { L.el[i] = item(L.root, items[i]); });
      L.fx = S('g', {}, svg);
    };
    L.op = function (ids, v) { ids.forEach(function (i) { if (L.el[i]) L.el[i].setAttribute('opacity', v); }); };
    L.tf = function (ids, t) { ids.forEach(function (i) { if (L.el[i]) { if (t) L.el[i].setAttribute('transform', t); else L.el[i].removeAttribute('transform'); } }); };
    return L;
  }
  const figSvg = function (host, W, H) { return S('svg', { viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true' }, host); };

  // =====================================================================================================
  // Linha do tempo
  // =====================================================================================================
  A.define('tline', function (host) {
    const D = A.figData.timeline, items = D.items;
    const svg = figSvg(host, 376.4, 144.4), L = Layer(svg, items);
    const set = function (st) { return st === 't0' ? [] : D.states['timeline' + st.slice(1)]; };
    const YEARS = D.states.timeline1.filter(function (i) { return items[i].t === 'x' && /^\d{4}$/.test(items[i].tx); });
    // em timeline8 só Holland (coluna de 1975) não esmaece
    const dimText = function (i) { const it = items[i]; if (it.t !== 'x') return false; const c = mid(it.b)[0]; return c < 188 || c > 252; };
    function dim(ids, v) { ids.forEach(function (i) { if (dimText(i) && L.el[i]) L.el[i].setAttribute('opacity', v); }); }
    function snap(st) { L.build(set(st)); if (st === 't8') dim(set('t8'), 0.3); }
    async function play(a, b, h) {
      const A0 = set(a), B0 = set(b);
      if (a === 't0') {                                   // a linha surge da esquerda para a direita
        L.build(B0); L.op(B0, 0);
        const frame = B0.filter(function (i) { return items[i].t === 'p' && items[i].b[2] - items[i].b[0] > 300; });
        const rest = B0.filter(function (i) { return frame.indexOf(i) < 0; }).sort(function (p, q) { return items[p].b[0] - items[q].b[0]; });
        const x0 = 12, x1 = 364;
        await h.all([stroke(h, L.el[frame[0]], 1100), h.tween(1100, function (e) {
          const xe = lerp(x0, x1, e);
          rest.forEach(function (i) { const it = items[i]; L.el[i].setAttribute('opacity', Math.max(0, Math.min(1, (xe - it.b[0]) / 16))); });
        }, E.linear)]);
        L.op(B0, 1);
        return;
      }
      const U = A0.concat(B0.filter(function (i) { return A0.indexOf(i) < 0; }));
      L.build(U);
      const enter = B0.filter(function (i) { return A0.indexOf(i) < 0; }), leave = A0.filter(function (i) { return B0.indexOf(i) < 0; });
      if (b === 't8') {                                   // foco em Holland: o resto esmaece
        L.op(enter, 0);
        await h.tween(900, function (e) { L.op(enter, e); L.op(leave, 1 - e); dim(B0, 1 - 0.7 * e); });
        L.op(leave, 0); dim(B0, 0.3);
        return;
      }
      L.op(enter, 0);
      const bb = bbox(items, enter), above = bb[3] < 64, dy0 = above ? -22 : 22;
      await h.tween(700, function (e) { L.op(enter, Math.min(1, e * 2)); L.tf(enter, 'translate(0 ' + (dy0 * (1 - E.out(e))).toFixed(2) + ')'); }, E.linear);
      L.tf(enter, null);
      // o ano para onde a seta aponta pulsa
      const cx = mid(bb)[0];
      const y = YEARS.reduce(function (p, q) { return Math.abs(mid(items[q].b)[0] - cx) < Math.abs(mid(items[p].b)[0] - cx) ? q : p; });
      const ye = L.el[y], c = mid(items[y].b);
      await h.tween(600, function (e) { ye.setAttribute('transform', tfS(0, 0, 1 + 0.35 * Math.sin(Math.PI * e), c)); ye.setAttribute('fill', e > 0.1 && e < 0.9 ? RED : items[y].c); }, E.linear);
      ye.removeAttribute('transform'); ye.setAttribute('fill', items[y].c);
    }
    return { snap: snap, play: play };
  });

  // =====================================================================================================
  // População e memória (camada sobre a figura)
  // =====================================================================================================
  A.define('popmet', function (host) {
    const svg = figSvg(host, 284.3423, 118.034);
    const LP = [[22.17, 47.86], [34.17, 79.86], [82.17, 51.86], [94.17, 79.86], [58.17, 63.86], [70.17, 103.86], [46.17, 39.86]];
    const MEM = [118.17, 47.86, 166.17, 63.86];
    let L = {};
    function build() { svg.textContent = ''; L.fx = S('g', {}, svg); L.mem = S('g', {}, svg); }
    function tok(p, col) {
      const g = S('g', {}, L.fx);
      S('circle', { cx: 0, cy: 0, r: 3, fill: col || '#000' }, g);
      S('circle', { cx: 0, cy: 0, r: 1.2, fill: '#fff' }, g);
      g.setAttribute('transform', 'translate(' + p[0] + ' ' + p[1] + ')');
      return g;
    }
    function along(pts, e) {                              // ponto na polilinha (fração e)
      const Ls = [0];
      for (let i = 1; i < pts.length; i++) Ls.push(Ls[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const g = Ls[Ls.length - 1] * e;
      for (let i = 1; i < pts.length; i++) if (Ls[i] >= g) { const f = (g - Ls[i - 1]) / (Ls[i] - Ls[i - 1] || 1); return [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]; }
      return pts[pts.length - 1];
    }
    async function travel(h, toks, paths, dur, after) {
      await h.tween(dur, function (e) {
        toks.forEach(function (t, k) { const ek = Math.max(0, Math.min(1, e * 1.3 - k * 0.15)); const p = along(paths[k], E.inOut(ek)); t.setAttribute('transform', 'translate(' + p[0].toFixed(2) + ' ' + p[1].toFixed(2) + ')'); if (after) after(t, k, ek); });
      }, E.linear);
    }
    function snap() { build(); }
    async function play(a, b, h) {
      build();
      if (b !== 'p1') return;
      const box = S('rect', { x: MEM[0], y: MEM[1], width: MEM[2] - MEM[0], height: MEM[3] - MEM[1], fill: HI, 'fill-opacity': 0.25, stroke: HI, 'stroke-width': 1.4, opacity: 0 }, L.mem);
      const marks = S('g', {}, L.mem);
      let nmem = 0;
      const NEW = [[[210, 30], [262, 95], [244, 22]], [[196, 98], [270, 50], [214, 70]]];
      for (let round = 0; round < 2; round++) {
        // gerar: 3 soluções saem do conjunto da esquerda e entram no da direita como novas
        const src = [LP[(round * 3) % 7], LP[(round * 3 + 1) % 7], LP[(round * 3 + 2) % 7]], dst = NEW[round];
        const ts = src.map(function (p) { return tok(p, '#000'); });
        await travel(h, ts, src.map(function (p, k) { return [p, [114.17, 27.86], [166.17, 27.86], dst[k]]; }), 1800, function (t, k, ek) {
          t.firstChild.setAttribute('fill', ek > 0.8 ? RED : '#000');
        });
        await h.wait(250);
        // voltam pela seta de baixo e passam pela memória, que guarda o registro
        await travel(h, ts, dst.map(function (p, k) { return [p, [166.17, 91.86], [142.17, 91.86], [142.17, 70], [142.17, 91.86], [114.17, 91.86], LP[(round * 3 + k + 3) % 7]]; }), 2200, function (t, k, ek) {
          if (ek > 0.45 && !t._m) {
            t._m = 1; nmem++;
            const m = S('circle', { cx: MEM[0] + 46 - nmem * 4.6, cy: MEM[3] + 3.8, r: 1.4, fill: RED }, marks);
            m.setAttribute('opacity', 0.9);
          }
          box.setAttribute('opacity', Math.max(+box.getAttribute('opacity') * 0.97, ek > 0.35 && ek < 0.6 ? 1 : 0));
        });
        ts.forEach(function (t) { t.remove(); });
        box.setAttribute('opacity', 0);
        await h.wait(300);
      }
      await h.wait(600);
      await h.tween(500, function (e) { marks.setAttribute('opacity', 1 - e); });
      L.mem.textContent = '';
    }
    return { snap: snap, play: play };
  });

  // =====================================================================================================
  // Galápagos
  // =====================================================================================================
  A.define('galap', function (host) {
    const D = A.figData.galapagos, items = D.items;
    const svg = figSvg(host, 254.2047, 282.594), L = Layer(svg, items);
    const set = function (st) { return st === 'g5' ? D.states.pass5 : st === 'g6' ? D.states.pass6 : []; };
    const P5 = D.states.pass5, P6 = D.states.pass6;
    const isBody = function (it) { return it.t === 'p' && it.f === '#00008b' && it.fo != null && it.b[2] - it.b[0] > 12; };
    const BIRDS = groupBy(items, P5, isBody, 9);
    const inBird = {}; BIRDS.forEach(function (g) { g.ids.forEach(function (i) { inBird[i] = g; }); });
    const bigBird = function (g) { return items[g.body].b[2] - items[g.body].b[0] > 18; };
    // setas: as linhas longas e as pontas (triângulos pretos pequenos, fora dos pássaros)
    const ARCS = P5.filter(function (i) {
      const it = items[i];
      if (it.t !== 'p' || inBird[i]) return false;
      if (it.da || (!it.f && it.s === '#000000' && it.b[3] - it.b[1] > 40)) return true;
      return it.f === '#000000' && it.b[2] - it.b[0] < 8 && it.b[3] - it.b[1] < 8;
    });
    function snap(st) { L.build(set(st)); }
    async function play(a, b, h) {
      if (b === 'g5' && a !== 'g6') {
        L.build(P5); L.op(P5, 0);
        const scene = P5.filter(function (i) { return !inBird[i] && ARCS.indexOf(i) < 0; });
        await h.tween(600, function (e) { L.op(scene, e); });
        // o pássaro do continente primeiro
        const small = BIRDS.filter(function (g) { return !bigBird(g); }).sort(function (p, q) { return q.c[1] - p.c[1]; });
        const big = BIRDS.filter(bigBird), land = big.filter(function (g) { return g.c[0] > 90 && g.c[0] < 120; }), isl = big.filter(function (g) { return land.indexOf(g) < 0; });
        const pop = function (g, dur) {
          return h.tween(dur || 380, function (e) { L.op(g.ids, Math.min(1, e * 2)); L.tf(g.ids, tfS(0, 4 * (1 - e), lerp(0.3, 1, E.back(e)), g.c)); }, E.linear).then(function () { L.tf(g.ids, null); });
        };
        for (const g of land) await pop(g, 450);
        // os pássaros voam pelas setas: onda de baixo para cima
        const all = [];
        all.push(h.tween(small.length * 110 + 300, function (e) { L.op(ARCS, e); }));
        for (const g of small) { all.push(pop(g, 320)); await h.wait(110); }
        await h.all(all);
        for (const g of isl) await pop(g, 420);
        return;
      }
      if (a === 'g5' && b === 'g6') {
        const U = P5.concat(P6.filter(function (i) { return P5.indexOf(i) < 0; }));
        L.build(U);
        const enter = P6.filter(function (i) { return P5.indexOf(i) < 0; }), leave = P5.filter(function (i) { return P6.indexOf(i) < 0; });
        L.op(enter, 0);
        await h.tween(600, function (e) { L.op(leave, 1 - e); });
        L.op(leave, 0);
        // a lupa (cabo e lente) surge; as linhas são traçadas; o círculo de zoom cresce a partir da lente
        const lens = enter.filter(function (i) { return [319, 320, 321, 325, 326, 327, 328, 329, 330].indexOf(i) >= 0; });
        const lines = enter.filter(function (i) { return i === 323 || i === 324; }), zoom = enter.filter(function (i) { return i === 322; });
        const lc = mid(bbox(items, lens.length ? lens : enter));
        await h.tween(500, function (e) { L.op(lens, Math.min(1, e * 2)); L.tf(lens, tfS(0, 0, lerp(0.2, 1, E.back(e)), lc)); }, E.linear);
        L.tf(lens, null);
        const zc = mid(items[322].b);
        L.op(zoom, 1);
        await h.all([h.all(lines.map(function (i) { return stroke(h, L.el[i], 500); })),
          h.tween(700, function (e) { L.tf(zoom, tfS((lc[0] - zc[0]) * (1 - e), (lc[1] - zc[1]) * (1 - e), lerp(0.15, 1, E.out(e)), zc)); })]);
        L.tf(zoom, null);
        return;
      }
      snap(b);
    }
    return { snap: snap, play: play };
  });

  // =====================================================================================================
  // Substituição com margem
  // =====================================================================================================
  A.define('subst', function (host) {
    const D = A.figData.subst, items = D.items;
    const svg = figSvg(host, 152.8, +(host.dataset.h || 120.8)), L = Layer(svg, items);
    const set = function (st) { return D.states['Substituicao' + st.slice(1)]; };
    const isBody = function (it) { return it.t === 'p' && it.f === '#d3d3d3'; };
    const ALL = D.states.Substituicao3;
    const G = groupBy(items, ALL.filter(function (i) { return items[i].s !== '#8b0000'; }), isBody, 1);   // os ✗ vermelhos ficam de fora
    const rowOf = function (g) { return g.c[1] < 40 ? 0 : g.c[1] < 84 ? 1 : 2; };
    const LABELS = ALL.filter(function (i) { return items[i].t === 'x' && /%$/.test(items[i].tx); });
    G.forEach(function (g) {
      g.row = rowOf(g);
      const q = items[g.body].b;
      g.lab = LABELS.filter(function (i) { const b = items[i].b; return b[3] <= q[1] + 1 && b[3] > q[1] - 9 && Math.abs(mid(b)[0] - mid(q)[0]) < 8; })[0];
      const r = g.ids.filter(function (i) { return items[i].s === '#000000' && !items[i].f; })[0];
      const nums = (items[r] ? items[r].d.match(/-?[\d.]+/g) : []).map(Number);
      g.key = (g.lab != null ? items[g.lab].tx : '') + '|' + nums.map(function (v, k) { return Math.round((v - (k % 2 ? q[1] : q[0])) * 2); }).join(',');
      g.all = g.ids.concat(g.lab != null ? [g.lab] : []);
    });
    const row = function (r) { return G.filter(function (g) { return g.row === r; }).sort(function (a, b) { return a.c[0] - b.c[0]; }); };
    function ghost(g) { const e = S('g', {}, L.fx); g.all.forEach(function (i) { item(e, items[i]); }); return e; }
    function snap(st) { L.build(set(st)); }
    async function reveal(h, ids) {                       // setas e caixas traçadas; textos aparecem
      const tx = ids.filter(function (i) { return items[i].t === 'x'; }), ps = ids.filter(function (i) { return items[i].t === 'p'; });
      await h.all(ps.map(function (i) { const it = items[i]; return (it.b[2] - it.b[0] < 4 && it.b[3] - it.b[1] < 4) ? h.tween(300, function (e) { L.op([i], e); }) : stroke(h, L.el[i], 450); }).concat([h.tween(400, function (e) { L.op(tx, e); })]));
    }
    async function play(a, b, h) {
      const A0 = set(a), B0 = set(b);
      L.build(B0);
      const enter = B0.filter(function (i) { return A0.indexOf(i) < 0; });
      L.op(enter, 0);
      const inG = {}; G.forEach(function (g) { g.all.forEach(function (i) { inG[i] = 1; }); });
      const deco = enter.filter(function (i) { return !inG[i]; });
      if (a === 's1' && b === 's2') {
        await reveal(h, deco);
        // cada rota da 1ª linha voa até a sua posição na linha ordenada
        const r0 = row(0), r1 = row(1);
        for (const g of r1) {
          const src = r0.filter(function (x) { return x.key === g.key && !x.used; })[0] || r0[0];
          src.used = 1;
          const e = ghost(src), dx = g.c[0] - src.c[0], dy = g.c[1] - src.c[1];
          await h.tween(520, function (t) { const k = E.inOut(t); e.setAttribute('transform', 'translate(' + (dx * k).toFixed(2) + ' ' + (dy * k - 10 * Math.sin(Math.PI * k)).toFixed(2) + ')'); }, E.linear);
          e.remove(); L.op(g.all, 1);
        }
        r0.forEach(function (x) { delete x.used; });
        return;
      }
      if (a === 's2' && b === 's3') {
        const boxK = enter.filter(function (i) { return i === 135; }), xs = enter.filter(function (i) { return i === 136 || i === 137; });
        await reveal(h, deco.filter(function (i) { return boxK.indexOf(i) < 0 && xs.indexOf(i) < 0; }));
        // a 3ª linha desce da 2ª
        const r1 = row(1), r2 = row(2);
        const gs = r2.map(function (g, k) { return [g, ghost(r1[k])]; });
        await h.tween(650, function (t) { gs.forEach(function (p) { p[1].setAttribute('transform', 'translate(0 ' + (44 * E.inOut(t)).toFixed(2) + ')'); }); });
        gs.forEach(function (p) { p[1].remove(); L.op(p[0].all, 1); });
        // os k primeiros: a região é marcada
        await h.all(boxK.map(function (i) { return stroke(h, L.el[i], 500); }));
        // sorteio entre os k primeiros: o anel salta e para; o escolhido recebe o ✗
        const ringAt = function (g) { const q = items[g.body].b; return S('rect', { x: q[0] - 1.5, y: q[1] - 1.5, width: q[2] - q[0] + 3, height: q[3] - q[1] + 3, rx: 2, fill: 'none', stroke: HI, 'stroke-width': 0.9 }, L.fx); };
        const seq = [[1, 2, 0, 1, 2, 0], [1, 2, 1, 0, 1, 2]];
        const chosenX = [136, 137];
        for (let k = 0; k < 2; k++) {
          for (const s of seq[k]) { const r = ringAt(r2[s]); await h.wait(150); r.remove(); }
          const xi = chosenX[k], c = mid(items[xi].b);
          L.op([xi], 1);
          await h.tween(320, function (t) { L.tf([xi], tfS(0, 0, lerp(2, 1, E.out(t)), c)); }, E.linear);
          L.tf([xi], null);
          await h.wait(250);
        }
        return;
      }
      snap(b);
    }
    return { snap: snap, play: play };
  });

  // =====================================================================================================
  // Demonstração da mutação (frame 83, passo 2)
  // =====================================================================================================
  A.define('mutdemo', function (host) {
    const frame = host.closest('section'), fc = host.closest('.fc');
    const others = Array.prototype.filter.call(fc.children, function (c) { return c !== host; });
    host.setAttribute('data-interactive', '');
    host.style.cssText = 'position:absolute;left:0;top:0;line-height:0;display:none';
    const root = S('svg', { role: 'img', 'aria-label': 'Mutação por troca com probabilidade pm' }, host);
    const NI = 12, NC = 8, CW = 13, CH = 10.5, X0 = 22, Y0 = 30;
    const COLS = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6', '#9a6324'];
    const PMS = [0.001, 0.01, 0.1, 0.3];
    let W = 403.7, H = 200, pm = 0.01, gen = 0, total = 0, last = 0, pop = [], running = false, animGen = 0;
    const el = {};
    const fmtP = function (v) { return String(v).replace('.', ','); };
    function reset() {
      pop = [];
      for (let i = 0; i < NI; i++) pop.push([1, 2, 3, 4, 5, 6, 7, 8]);
      // a população já convergiu: todos iguais (como depois de muitas gerações)
      gen = 0; total = 0; last = 0;
    }
    reset();
    function text(parent, x, y, s, o) {
      o = o || {};
      const t = S('text', { x: x, y: y, 'font-size': o.fs || 6.5, 'font-family': o.math ? MATH : MAIN, fill: o.c || '#222' }, parent);
      if (o.math) t.setAttribute('font-style', 'italic');
      if (o.anchor) t.setAttribute('text-anchor', o.anchor);
      if (o.bold) t.setAttribute('font-weight', 'bold');
      if (s != null) t.textContent = s;
      return t;
    }
    // p_m em itálico com o m subscrito, como tspans do texto
    function pmSpan(t, d) {
      S('tspan', { 'font-family': MATH, 'font-style': 'italic' }, t).textContent = 'p';
      S('tspan', { 'font-size': '72%', dy: d }, t).textContent = 'm';
    }
    function button(parent, x, y, w, label, fn) {
      const g = S('g', { style: 'cursor:pointer' }, parent);
      g._r = S('rect', { x: x, y: y, width: w, height: 10.5, rx: 2, fill: '#eef3f9', stroke: MYBLUE, 'stroke-width': 0.5 }, g);
      g._t = text(g, x + w / 2, y + 7.3, label, { anchor: 'middle', fs: 6, c: MYBLUE });
      g.addEventListener('pointerdown', function (ev) { ev.preventDefault(); ev.stopPropagation(); fn(); });
      g.addEventListener('click', function (ev) { ev.stopPropagation(); });
      return g;
    }
    function measure() {
      const k = frame.getBoundingClientRect().width / 453.543;
      if (!(k > 0) || !fc.offsetParent) return;
      const r = fc.getBoundingClientRect();
      W = r.width / k; H = Math.max(170, r.height / k - 2);
    }
    function build() {
      root.textContent = '';
      root.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      root.style.width = W + 'pt'; root.style.height = H + 'pt';
      const tt = text(root, 0, 9, 'Mutação por troca (swap): cada posição de cada rota troca com outra, com probabilidade ', { fs: 7.2, bold: true, c: MYBLUE });
      pmSpan(tt, 1.6);
      text(root, 0, 20, '12 indivíduos (rotas de 8 cidades). A população já convergiu: todos iguais.', { fs: 6, c: '#555' });
      // população
      el.rows = [];
      for (let i = 0; i < NI; i++) {
        const g = S('g', {}, root), cells = [];
        text(g, X0 - 4, Y0 + i * (CH + 1.6) + 7.5, String(i + 1), { fs: 5.2, anchor: 'end', c: '#888' });
        for (let j = 0; j < NC; j++) {
          const c = S('g', {}, g);
          c._r = S('rect', { x: 0, y: 0, width: CW - 1.2, height: CH, rx: 1, 'stroke-width': 0.45 }, c);
          c._t = text(c, (CW - 1.2) / 2, 7.4, '', { fs: 6, anchor: 'middle' });
          cells.push(c);
        }
        el.rows.push(cells);
      }
      // painel
      const px = X0 + NC * CW + 22, pw = W - px;
      el.genT = text(root, px, Y0 + 6, '', { fs: 8, bold: true });
      el.lastT = text(root, px, Y0 + 18, '', { fs: 6.5 });
      el.totT = text(root, px, Y0 + 28, '', { fs: 6.5 });
      el.expT = text(root, px, Y0 + 38, '', { fs: 6.5, c: '#555' });
      el.difT = text(root, px, Y0 + 48, '', { fs: 6.5, c: '#555' });
      text(root, px, Y0 + 64, 'probabilidade de mutação:', { fs: 6.2 });
      el.pmB = PMS.map(function (v, k) { return button(root, px + k * ((pw - 4) / 4), Y0 + 68, (pw - 4) / 4 - 3, fmtP(v), function () { stop(); pm = v; refresh(); }); });
      button(root, px, Y0 + 86, pw - 4, '1 geração', function () { stop(); advance(); });
      el.run = button(root, px, Y0 + 100, pw - 4, '▶ rodar 20 gerações', function () { if (running) stop(); else start(); });
      button(root, px, Y0 + 114, pw - 4, '↺ reiniciar', function () { stop(); reset(); refresh(); });
      const vu = text(root, px, Y0 + 136, 'Valores usuais: ', { fs: 5.6, c: '#777' });
      pmSpan(vu, 1.2); S('tspan', { dy: -1.2 }, vu).textContent = ' entre 0,001 e 0,01 —';
      text(root, px, Y0 + 144, 'mudanças raras, que reintroduzem diversidade', { fs: 5.6, c: '#777' });
      text(root, px, Y0 + 152, 'sem destruir as boas soluções.', { fs: 5.6, c: '#777' });
      refresh();
    }
    function cellPos(i, j) { return [X0 + j * CW, Y0 + i * (CH + 1.6)]; }
    function paint(i, j, flash) {
      const c = el.rows[i][j], v = pop[i][j], col = COLS[v - 1];
      c._r.setAttribute('fill', flash ? '#fff3c4' : A.mix('#ffffff', col, 0.28));
      c._r.setAttribute('stroke', flash ? HI : col);
      c._r.setAttribute('stroke-width', flash ? 0.9 : 0.45);
      c._t.textContent = String(v);
      const p = cellPos(i, j); c.setAttribute('transform', 'translate(' + p[0] + ' ' + p[1] + ')');
    }
    function distinct() { return new Set(pop.map(function (r) { return r.join(''); })).size; }
    function refresh() {
      for (let i = 0; i < NI; i++) for (let j = 0; j < NC; j++) paint(i, j, false);
      el.genT.textContent = 'geração ' + gen;
      el.lastT.textContent = 'trocas nesta geração: ' + last;
      el.totT.textContent = 'trocas no total: ' + total;
      el.expT.textContent = 'esperado por geração: 12 · 8 · ' + fmtP(pm) + ' ≈ ' + (96 * pm).toFixed(pm < 0.01 ? 2 : 1).replace('.', ',');
      el.difT.textContent = 'rotas diferentes na população: ' + distinct();
      el.pmB.forEach(function (bt, k) { const on = PMS[k] === pm; bt._r.setAttribute('fill', on ? MYBLUE : '#eef3f9'); bt._t.setAttribute('fill', on ? '#fff' : MYBLUE); });
    }
    // uma geração: cada posição de cada rota troca com outra posição sorteada, com probabilidade pm
    function advance() {
      const sw = [];
      for (let i = 0; i < NI; i++) for (let j = 0; j < NC; j++) {
        if (Math.random() < pm) {
          let k = Math.floor(Math.random() * (NC - 1)); if (k >= j) k++;
          const t = pop[i][j]; pop[i][j] = pop[i][k]; pop[i][k] = t;
          sw.push([i, j, k]);
        }
      }
      gen++; last = sw.length; total += sw.length;
      refresh();
      const g = ++animGen, t0 = performance.now();
      sw.forEach(function (s) { paint(s[0], s[1], true); paint(s[0], s[2], true); });
      (function fr(now) {                                  // as células trocadas cruzam de lugar
        if (g !== animGen) return;
        const e = Math.min(1, (now - t0) / 550), k = E.inOut(e);
        sw.forEach(function (s) {
          const a = cellPos(s[0], s[1]), b = cellPos(s[0], s[2]), up = -5 * Math.sin(Math.PI * k);
          el.rows[s[0]][s[1]].setAttribute('transform', 'translate(' + lerp(b[0], a[0], k) + ' ' + (a[1] + up) + ')');
          el.rows[s[0]][s[2]].setAttribute('transform', 'translate(' + lerp(a[0], b[0], k) + ' ' + (a[1] - up) + ')');
        });
        if (e < 1) requestAnimationFrame(fr);
        else {
          setTimeout(function () { if (g === animGen) sw.forEach(function (s) { paint(s[0], s[1], false); paint(s[0], s[2], false); }); }, 500);
          if (running) setTimeout(function () { if (running && g === animGen) { if (--running.left > 0) advance(); else stop(); } }, 650);
        }
      })(t0);
    }
    function start() { running = { left: 20 }; el.run._t.textContent = '❚❚ pausar'; advance(); }
    function stop() { running = false; animGen++; if (el.run) el.run._t.textContent = '▶ rodar 20 gerações'; if (el.rows) refresh(); }

    function place(on) {
      others.forEach(function (c) { c.style.visibility = on ? 'hidden' : ''; c.style.opacity = ''; });
      host.style.display = on ? '' : 'none';
    }
    function snap(st) {
      stop();
      if (st === 'm1') { place(false); return; }
      place(true); measure(); build(); root.style.opacity = '';
    }
    async function play(a, b, h) {
      stop();
      if (b !== 'm2') { snap(b); return; }
      reset();
      others.forEach(function (c) { c.style.visibility = ''; });
      await h.tween(400, function (e) { others.forEach(function (c) { c.style.opacity = 1 - e; }); });
      others.forEach(function (c) { c.style.visibility = 'hidden'; c.style.opacity = ''; });
      host.style.display = ''; measure(); build(); root.style.opacity = 0;
      await h.tween(400, function (e) { root.style.opacity = e; });
      root.style.opacity = '';
    }
    return { snap: snap, play: play };
  });

  // =====================================================================================================
  // Os bicos dos pássaros (frames 29–32; dados/passaros.js = pass1…4)
  // =====================================================================================================
  A.define('passaros', function (host) {
    const D = A.figData.passaros, items = D.items;
    const svg = figSvg(host, 557.2, 213.2), L = Layer(svg, items);
    const set = function (st) { return st === 'q0' ? [] : D.states['pass' + st.slice(1)]; };
    // pássaro k: corpo, olho, listras e pernas; bicos de cada figura
    const rng = function (a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
    const BIRD = [rng(0, 13), rng(15, 28), rng(30, 43)];
    const BEAK = [14, 29, 44], SQ = [46, 47, 48], LINES = [49, 50], DOTS = [51, 52, 53, 54], FRAME = [45];
    const attach = function (i) { const b = items[i].b; return [b[0], (b[1] + b[3]) / 2]; };   // onde o bico encosta na cabeça
    async function grow(h, ids, dur) {
      L.op(ids, 1);
      await h.tween(dur || 420, function (e) { ids.forEach(function (i) { L.tf([i], tfS(0, 0, lerp(0.05, 1, E.back(e)), attach(i))); }); }, E.linear);
      L.tf(ids, null);
    }
    async function pulse(h, ids, amp, dur) {
      await h.tween(dur || 450, function (e) { ids.forEach(function (i) { L.tf([i], tfS(0, 0, 1 + (amp || 0.25) * Math.sin(Math.PI * e), attach(i))); }); }, E.linear);
      L.tf(ids, null);
    }
    function snap(st) { L.build(set(st)); }
    async function play(a, b, h) {
      const A0 = set(a), B0 = set(b);
      const U = A0.concat(B0.filter(function (i) { return A0.indexOf(i) < 0; }));
      L.build(U);
      const enter = B0.filter(function (i) { return A0.indexOf(i) < 0; }), leave = A0.filter(function (i) { return B0.indexOf(i) < 0; });
      L.op(enter, 0);
      if (b === 'q1') {                                   // os pássaros chegam e os bicos crescem
        await stroke(h, L.el[45], 600);
        for (let k = 0; k < 3; k++) {
          const ids = BIRD[k], c = mid(bbox(items, ids));
          await h.tween(450, function (e) { L.op(ids, Math.min(1, e * 2)); L.tf(ids, tfS(0, 18 * (1 - E.out(e)), 1, c)); }, E.linear);
          L.tf(ids, null);
        }
        for (const i of BEAK) await grow(h, [i], 420);
        return;
      }
      if (b === 'q2') {                                   // "bicos diferentes": a linha liga os bicos, que pulsam
        await h.tween(250, function (e) { L.op([51, 52], e); });
        await stroke(h, L.el[49], 600);
        await h.tween(200, function (e) { L.op([53], e); });
        await stroke(h, L.el[50], 600);
        await h.tween(200, function (e) { L.op([54], e); });
        for (const i of BEAK) await pulse(h, [i], 0.3, 420);
        return;
      }
      if (b === 'q3') {                                   // os bicos somem; os pássaros são iguais
        const marks = LINES.concat(DOTS);
        await h.tween(400, function (e) { L.op(marks, 1 - e); });
        await h.tween(500, function (e) { BEAK.forEach(function (i) { L.tf([i], tfS(0, 0, 1 - e, attach(i))); }); L.op(BEAK, 1 - e); }, E.inOut);
        L.op(leave, 0); L.tf(BEAK, null);
        // o contorno do 1º pássaro desliza sobre o 2º e o 3º e encaixa
        const out = item(L.fx, items[0]);
        out.setAttribute('fill', 'none'); out.setAttribute('stroke', HI); out.setAttribute('stroke-width', 2.4); out.removeAttribute('fill-opacity');
        const d1 = [items[15].b[0] - items[0].b[0], items[15].b[1] - items[0].b[1]], d2 = [items[30].b[0] - items[0].b[0], items[30].b[1] - items[0].b[1]];
        out.setAttribute('opacity', 0);
        await h.tween(300, function (e) { out.setAttribute('opacity', e); });
        await h.tween(800, function (e) { out.setAttribute('transform', 'translate(' + (d1[0] * e).toFixed(2) + ' ' + (d1[1] * e).toFixed(2) + ')'); });
        await h.wait(350);
        await h.tween(800, function (e) { out.setAttribute('transform', 'translate(' + lerp(d1[0], d2[0], e).toFixed(2) + ' ' + lerp(d1[1], d2[1], e).toFixed(2) + ')'); });
        await h.wait(350);
        await h.tween(400, function (e) { out.setAttribute('opacity', 1 - e); });
        out.remove();
        return;
      }
      if (b === 'q4') {                                   // o mesmo bico nos três: um ancestral comum?
        await grow(h, SQ, 600);
        await pulse(h, SQ, 0.2, 500);
        return;
      }
      snap(b);
    }
    return { snap: snap, play: play };
  });
})();
