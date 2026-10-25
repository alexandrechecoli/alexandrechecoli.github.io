/* Animações da aula 9 (LNS & ALNS). Dados das figuras em js/anim/dados/{swap,vrp,plot}.js
 * (ferramentas/figura_camadas.py). O estado final de cada passo é a figura do PDF.
 *
 *   swap  (frame 6; estados vazio, swap1..swap4, total)
 *         os 5 pontos brotam; a cada passo os arcos de SWAP do ponto da vez são traçados um a um e os dois
 *         rótulos trocam de lugar seguindo o arco (o vizinho) e voltam, com um contador de vizinhos;
 *         "total" (passo 5, junto com a caixa 4 + 3 + 3 = 10): os 10 arcos aparecem juntos, por grupo
 *   vrp   (frames 12–14; estados vazio, VRP1, VRP2, VRP3)
 *         VRP1: o depósito surge e cada rota é percorrida por um veículo; os clientes surgem quando ele passa.
 *         VRP2 (destruição): sorteio — clientes piscam ao acaso até parar nos removidos, que ficam vermelhos;
 *         as arestas deles ficam vermelhas tracejadas e somem, e as rotas se fecham sem eles.
 *         VRP3 (reconstrução): cada cliente removido é reinserido: a aresta onde ele entra "estica" até ele
 *         (elástico) e vira duas.
 *   plot  (frame 9, slide [plain] com o gráfico do pgfplots; estados vazio, plot)
 *         moldura, grade e eixos; título; f(n) é desenhada com um ponto na ponta, depois g(n) tracejada;
 *         a legenda entra. Interativo: com o mouse sobre o gráfico, uma linha vertical mostra n, f(n), g(n) e
 *         a razão f(n)/g(n) = (n−1)/n, que tende a 1 (por isso f(n) = O(n²)).
 */
(function () {
  'use strict';
  const A = window.Anim;
  if (!A) return;
  const S = A.svg, E = A.ease, lerp = A.lerp;
  const BLUE = '#0061a5', RED = '#8b0000', GRAY = '#bebebe';

  // ---------- figuras em camadas ----------
  // acentos do OT1 vêm separados no PDF ("Solu¸c˜ao"): acento + letra -> letra acentuada
  const ACC = { '´': '́', '˜': '̃', '¸': '̧', 'ˆ': '̂', '`': '̀', '¨': '̈' };
  const fixText = function (t) { return t.replace(/([´˜¸ˆ`¨])(\S)/g, function (m, a, c) { return c + ACC[a]; }).normalize('NFC'); };
  A.figBuild = function (root, items) {
    return items.map(function (it) {
      let e;
      if (it.t === 'x') {
        e = S('text', { x: it.x, y: it.y, fill: it.c, 'font-family': it.ff + ', serif', 'font-size': it.fs }, root);
        if (it.st) e.setAttribute('font-style', it.st);
        if (it.fw) e.setAttribute('font-weight', it.fw);
        if (it.r) e.setAttribute('transform', 'rotate(' + it.r + ' ' + it.x + ' ' + it.y + ')');
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
    });
  };

  // ---------- utilidades ----------
  function makeRoot(host, D, aria) {
    const sc = +(host.dataset.scale || 1);
    const root = S('svg', { viewBox: '0 0 ' + D.W + ' ' + D.H, role: 'img', 'aria-label': aria });
    root.style.width = (D.W * sc) + 'pt'; root.style.height = (D.H * sc) + 'pt'; root.style.overflow = 'visible';
    host.appendChild(root);
    return root;
  }
  // camadas: base (itens), arestas temporárias abaixo dos nós, efeitos por cima
  function layers(root) {
    const gUnder = S('g', {}, root), gItems = S('g', {}, root), gFx = S('g', {}, root);
    return { under: gUnder, items: gItems, fx: gFx };
  }
  function nums(d) { return (d.match(/-?\d*\.?\d+/g) || []).map(Number); }
  function polyPts(d) { const n = nums(d), p = []; for (let i = 0; i + 1 < n.length; i += 2) p.push([n[i], n[i + 1]]); return p; }
  const center = function (it) { return [(it.b[0] + it.b[2]) / 2, (it.b[1] + it.b[3]) / 2]; };
  const key = function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); };
  function resetEl(e) { e.style.opacity = ''; e.style.display = ''; e.removeAttribute('transform'); e.style.strokeDasharray = ''; e.style.strokeDashoffset = ''; }
  function scaleAt(e, c, s) { e.setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ') scale(' + Math.max(0.001, s) + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')'); }
  function pop(h, els, c, dur) {
    els.forEach(function (e) { resetEl(e); });
    return h.tween(dur || 260, function (e, t) {
      els.forEach(function (el) { scaleAt(el, c, E.back(t)); el.style.opacity = Math.min(1, t * 3); });
    }, E.linear).then(function () { els.forEach(function (el) { el.removeAttribute('transform'); el.style.opacity = ''; }); });
  }
  function traceEl(h, el, dur, ez) {
    const L = el.getTotalLength();
    el.style.strokeDasharray = L + ' ' + (L + 1); el.style.strokeDashoffset = L;
    return h.tween(dur, function (e) { el.style.strokeDashoffset = L * (1 - e); }, ez || E.inOut)
      .then(function () { el.style.strokeDasharray = ''; el.style.strokeDashoffset = ''; });
  }
  function fade(h, els, from, to, dur) {
    return h.tween(dur, function (e) { els.forEach(function (el) { el.style.opacity = lerp(from, to, e); }); });
  }
  function ring(h, g, c, color, r0, r1, dur) {
    const r = S('circle', { cx: c[0], cy: c[1], r: r0, fill: 'none', stroke: color, 'stroke-width': 0.9 }, g);
    return h.tween(dur || 600, function (e) { r.setAttribute('r', lerp(r0, r1, e)); r.setAttribute('opacity', 1 - e); }, E.out)
      .then(function () { r.remove(); });
  }
  // números pt-BR
  const br = function (v, d) { return v.toFixed(d).replace('.', ','); };

  // =====================================================================================================
  // VRP (frames 12–14)
  // =====================================================================================================
  A.define('vrp', function (host) {
    const D = A.figData && A.figData.vrp;
    if (!D) { console.warn('vrp: sem dados'); return { snap: function () {} }; }
    const root = makeRoot(host, D, 'Solução do VRP: destruição e reconstrução');
    const L = layers(root);
    const items = D.items, els = A.figBuild(L.items, items);
    const isRoute = function (i) { return items[i].t === 'p' && items[i].s === GRAY; };
    const isNode = function (i) { return items[i].t === 'p' && items[i].f && !items[i].s; };
    const isRed = function (i) { return items[i].f === RED; };
    const depot = items.findIndex(function (it) { return it.t === 'p' && it.f === '#000000' && it.s; });
    // no VRP3 o PDF desenha os nós reinseridos (vermelhos) por cima dos pretos: tira os pretos repetidos
    function clean(list) {
      const reds = list.filter(function (i) { return isNode(i) && isRed(i); }).map(function (i) { return key(center(items[i])); });
      return list.filter(function (i) { return !(isNode(i) && !isRed(i) && reds.indexOf(key(center(items[i]))) >= 0); });
    }
    const STATES = { vazio: [], VRP1: clean(D.states.VRP1), VRP2: clean(D.states.VRP2), VRP3: clean(D.states.VRP3) };
    const P = {};   // nós por chave de posição
    items.forEach(function (it, i) { if (isNode(i) || i === depot) P[key(center(it))] = center(it); });
    // arestas (não orientadas) das rotas de um estado
    function edges(st) {
      const out = {};
      STATES[st].filter(isRoute).forEach(function (i) {
        const p = polyPts(items[i].d);
        if (/Z\s*$/.test(items[i].d)) p.push(p[0]);
        for (let k = 0; k + 1 < p.length; k++) {
          const a = key(p[k]), b = key(p[k + 1]);
          if (a !== b) out[a < b ? a + '|' + b : b + '|' + a] = [a, b];
        }
      });
      return out;
    }

    function show(list) {
      const on = {}; list.forEach(function (i) { on[i] = true; });
      els.forEach(function (e, i) { resetEl(e); e.style.display = on[i] ? '' : 'none'; e.setAttribute('fill', items[i].f || 'none'); });
    }
    function snap(st) { L.under.textContent = ''; L.fx.textContent = ''; show(STATES[st] || []); }
    const line = function (a, b, g) {
      return S('line', { x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1], stroke: GRAY, 'stroke-width': 0.8, 'stroke-linecap': 'round' }, g || L.under);
    };

    // ---- VRP1: rotas percorridas por veículos ----
    async function build(h) {
      show([]);
      await pop(h, [els[depot]], center(items[depot]), 320);
      const routes = STATES.VRP1.filter(isRoute);
      const nodesAt = {};
      STATES.VRP1.filter(isNode).forEach(function (i) { nodesAt[key(center(items[i]))] = i; });
      await h.all(routes.map(function (ri, k) {
        return h.wait(k * 260).then(function () {
          const el = els[ri]; el.style.display = '';
          const Lt = el.getTotalLength();
          const pts = polyPts(items[ri].d);
          if (/Z\s*$/.test(items[ri].d)) pts.push(pts[0]);
          // comprimento acumulado de cada vértice
          const cum = [0];
          for (let q = 1; q < pts.length; q++) cum.push(cum[q - 1] + Math.hypot(pts[q][0] - pts[q - 1][0], pts[q][1] - pts[q - 1][1]));
          const truck = S('circle', { r: 2.4, fill: BLUE }, L.fx);
          const popped = {};
          el.style.strokeDasharray = Lt + ' ' + (Lt + 1); el.style.strokeDashoffset = Lt;
          return h.tween(1500, function (e) {
            const s = Lt * e;
            el.style.strokeDashoffset = Lt - s;
            const pt = el.getPointAtLength(s);
            truck.setAttribute('cx', pt.x); truck.setAttribute('cy', pt.y);
            for (let q = 1; q < pts.length; q++) {
              const ni = nodesAt[key(pts[q])];
              if (ni !== undefined && !popped[ni] && s >= cum[q] - 0.5) { popped[ni] = true; pop(h, [els[ni]], pts[q], 240).catch(function () {}); els[ni].style.display = ''; }
            }
          }, E.inOut).then(function () {
            el.style.strokeDasharray = ''; el.style.strokeDashoffset = '';
            return h.tween(250, function (e) { truck.setAttribute('opacity', 1 - e); });
          }).then(function () { truck.remove(); });
        });
      }));
    }

    // ---- VRP1 -> VRP2: destruição ----
    async function destroy(h) {
      show(STATES.VRP1);
      const customers = STATES.VRP1.filter(function (i) { return isNode(i); });
      const chosen = STATES.VRP2.filter(function (i) { return isNode(i) && isRed(i); });
      // sorteio: anéis azuis piscam em clientes ao acaso
      let seed = 7;
      const rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let k = 0; k < 10; k++) {
        const i = customers[Math.floor(rnd() * customers.length)];
        const c = center(items[i]);
        const r = S('circle', { cx: c[0], cy: c[1], r: 4.2, fill: 'none', stroke: BLUE, 'stroke-width': 0.9 }, L.fx);
        await h.wait(95);
        r.remove();
      }
      // os escolhidos (15%): anel + ficam vermelhos
      const byKey = {};
      STATES.VRP1.filter(isNode).forEach(function (i) { byKey[key(center(items[i]))] = i; });
      for (const ci of chosen) {
        const c = center(items[ci]), bi = byKey[key(c)];
        ring(h, L.fx, c, RED, 2, 9, 500).catch(function () {});
        await h.tween(220, function (e) { if (bi !== undefined) els[bi].setAttribute('fill', A.mix('#000000', RED, e)); });
        await h.wait(90);
      }
      // arestas: as dos removidos ficam vermelhas tracejadas e somem; as que fecham as rotas são traçadas
      const E1 = edges('VRP1'), E2 = edges('VRP2');
      STATES.VRP1.filter(isRoute).forEach(function (i) { els[i].style.display = 'none'; });
      const lines = {};
      Object.keys(E1).forEach(function (k) { lines[k] = line(E1[k][0], E1[k][1]); });
      const gone = Object.keys(E1).filter(function (k) { return !E2[k]; });
      const added = Object.keys(E2).filter(function (k) { return !E1[k]; });
      gone.forEach(function (k) { lines[k].setAttribute('stroke', RED); lines[k].setAttribute('stroke-dasharray', '2 1.5'); });
      await h.wait(350);
      await fade(h, gone.map(function (k) { return lines[k]; }), 1, 0, 600);
      await h.all(added.map(function (k) { return traceEl(h, line(E2[k][0], E2[k][1]), 600); }));
      await h.wait(200);
    }

    // ---- VRP2 -> VRP3: reconstrução (inserção) ----
    async function repair(h) {
      show(STATES.VRP2);
      STATES.VRP2.filter(isRoute).forEach(function (i) { els[i].style.display = 'none'; });
      const E2 = edges('VRP2'), E3 = edges('VRP3');
      const cur = {};                       // arestas atuais: chave -> elemento
      const ek = function (a, b) { return a < b ? a + '|' + b : b + '|' + a; };
      Object.keys(E2).forEach(function (k) { cur[k] = line(E2[k][0], E2[k][1]); });
      const adj3 = {};
      Object.keys(E3).forEach(function (k) {
        const a = E3[k][0], b = E3[k][1];
        (adj3[a] = adj3[a] || []).push(b); (adj3[b] = adj3[b] || []).push(a);
      });
      const todo = STATES.VRP2.filter(function (i) { return isNode(i) && isRed(i); }).map(function (i) { return key(center(items[i])); });
      const pending = {}; todo.forEach(function (k) { pending[k] = true; });
      // fim da cadeia a partir de r indo para o vizinho n, passando só por removidos ainda não inseridos
      function walk(r, n) {
        let prev = r, x = n, guard = 0;
        while (pending[x] && guard++ < 20) { const nx = (adj3[x] || []).filter(function (y) { return y !== prev; })[0]; if (!nx) break; prev = x; x = nx; }
        return x;
      }
      let left = todo.slice(), guard = 0;
      while (left.length && guard++ < 50) {
        let done = false;
        for (const r of left) {
          const nb = adj3[r] || [];
          if (nb.length !== 2) continue;
          const a = walk(r, nb[0]), b = walk(r, nb[1]);
          const k = ek(a, b);
          if (!cur[k]) continue;
          // r entra na aresta a-b: o meio da aresta é puxado até r
          const pr = P[r], pa = P[a], pb = P[b];
          ring(h, L.fx, pr, BLUE, 2, 8, 500).catch(function () {});
          await h.wait(200);
          cur[k].remove(); delete cur[k];
          const l1 = line(a, a), l2 = line(b, b);
          const m = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
          l1.setAttribute('x1', pa[0]); l1.setAttribute('y1', pa[1]); l2.setAttribute('x1', pb[0]); l2.setAttribute('y1', pb[1]);
          l1.setAttribute('stroke', BLUE); l2.setAttribute('stroke', BLUE);
          await h.tween(650, function (e) {
            const x = lerp(m[0], pr[0], e), y = lerp(m[1], pr[1], e);
            l1.setAttribute('x2', x); l1.setAttribute('y2', y); l2.setAttribute('x2', x); l2.setAttribute('y2', y);
          }, E.back);
          await h.tween(300, function (e) { const c = A.mix(BLUE, GRAY, e); l1.setAttribute('stroke', c); l2.setAttribute('stroke', c); });
          cur[ek(a, r)] = l1; cur[ek(r, b)] = l2;
          delete pending[r]; left = left.filter(function (x) { return x !== r; });
          done = true;
          break;
        }
        if (!done) break;
      }
      await h.wait(250);
    }

    async function play(a, b, h) {
      if (a === 'vazio' && b === 'VRP1') return build(h);
      if (a === 'VRP1' && b === 'VRP2') return destroy(h);
      if (a === 'VRP2' && b === 'VRP3') return repair(h);
    }
    return { snap: snap, play: play };
  });

  // =====================================================================================================
  // SWAP (frame 6)
  // =====================================================================================================
  A.define('swap', function (host) {
    const D = A.figData && A.figData.swap;
    if (!D) { console.warn('swap: sem dados'); return { snap: function () {} }; }
    const root = makeRoot(host, D, 'Vizinhança SWAP em 5 cidades');
    const L = layers(root);
    const items = D.items, els = A.figBuild(L.items, items);
    const circles = [], labels = [], arcs = [];
    items.forEach(function (it, i) {
      if (it.t === 'x') labels.push(i);
      else if (it.f) circles.push(i);
      else arcs.push(i);
    });
    circles.sort(function (a, b) { return items[a].b[0] - items[b].b[0]; });
    labels.sort(function (a, b) { return items[a].b[0] - items[b].b[0]; });
    const cx = circles.map(function (i) { return center(items[i]); });
    const idx = function (x) { let best = 0; cx.forEach(function (c, k) { if (Math.abs(c[0] - x) < Math.abs(cx[best][0] - x)) best = k; }); return best; };
    const arcInfo = {};
    arcs.forEach(function (i) {
      const n = nums(items[i].d);
      const a = idx(n[0]), b = idx(n[n.length - 2]);
      arcInfo[i] = { a: Math.min(a, b), b: Math.max(a, b), top: n[1] < 24 };
    });
    const STATES = { vazio: [], swap1: D.states.swap1, swap2: D.states.swap2, swap3: D.states.swap3, swap4: D.states.swap4 };
    STATES.total = STATES.swap4;
    const COUNT = { vazio: 0, swap1: 0, swap2: 4, swap3: 7, swap4: 10, total: 10 };
    const arcsOf = function (st) { return STATES[st].filter(function (i) { return arcInfo[i]; }).sort(function (p, q) { return arcInfo[p].b - arcInfo[q].b; }); };

    function show(list) {
      const on = {}; list.forEach(function (i) { on[i] = true; });
      els.forEach(function (e, i) { resetEl(e); e.style.display = on[i] ? '' : 'none'; });
    }
    function snap(st) { L.under.textContent = ''; L.fx.textContent = ''; show(STATES[st] || []); }

    // contador de vizinhos à direita da figura (passageiro)
    function counter(start) {
      const t = S('text', { x: D.W + 8, y: 27.5, fill: BLUE, 'font-family': 'LM Sans, sans-serif', 'font-size': 9 }, L.fx);
      const set = function (n) { t.textContent = 'vizinhos: ' + n; };
      set(start);
      return { set: set, el: t };
    }
    // o rótulo de i vai para j (pelo arco) e o de j vem para i (pelo lado oposto), e voltam
    async function swapLabels(h, arcEl, i, j, top) {
      const li = els[labels[i]], lj = els[labels[j]];
      const dx = cx[j][0] - cx[i][0], hgt = (top ? -1 : 1) * Math.min(14, 4 + dx * 0.12);
      const move = function (e) {
        const y = 4 * hgt * e * (1 - e);
        li.setAttribute('transform', 'translate(' + (dx * e) + ' ' + y + ')');
        lj.setAttribute('transform', 'translate(' + (-dx * e) + ' ' + (-y) + ')');
      };
      li.setAttribute('fill', RED); lj.setAttribute('fill', RED);
      await h.tween(520, move, E.inOut);
      await h.wait(260);
      await h.tween(420, function (e) { move(1 - e); }, E.inOut);
      li.removeAttribute('transform'); lj.removeAttribute('transform');
      li.setAttribute('fill', items[labels[i]].c); lj.setAttribute('fill', items[labels[j]].c);
    }

    async function play(a, b, h) {
      if (a === 'vazio') {
        show([]);
        for (let k = 0; k < circles.length; k++) {
          pop(h, [els[circles[k]], els[labels[k]]], cx[k], 260).catch(function () {});
          els[circles[k]].style.display = ''; els[labels[k]].style.display = '';
          await h.wait(120);
        }
        await h.wait(200);
        return;
      }
      if (b === 'total') {
        // os 10 vizinhos: grupos do ponto 1, 2 e 3/4 traçados juntos
        show(STATES.swap4);
        const groups = [arcsOf('swap2'), arcsOf('swap3'), arcsOf('swap4')];
        const ghosts = [];
        const cnt = counter(0); let n = 0;
        arcsOf('swap4').forEach(function (i) { els[i].style.display = 'none'; });
        for (const g of groups) {
          for (const i of g) {
            const el = S('path', { d: items[i].d, fill: 'none', stroke: items[i].s, 'stroke-width': 0.6 }, L.under);
            ghosts.push(el);
            await traceEl(h, el, 260);
            cnt.set(++n);
          }
          await h.wait(220);
        }
        await h.wait(1200);
        arcsOf('swap4').forEach(function (i) { els[i].style.display = ''; els[i].style.opacity = 0; });
        await h.tween(500, function (e) {
          ghosts.forEach(function (gh) { gh.style.opacity = 1 - e; });
          arcsOf('swap4').forEach(function (i) { els[i].style.opacity = e; });
          cnt.el.style.opacity = 1 - e;
        });
        return;
      }
      // swapK -> swapK+1: os arcos antigos somem; os novos são traçados um a um, com a troca dos rótulos
      show(STATES[a]);
      const old = arcsOf(a), neu = arcsOf(b);
      await fade(h, old.map(function (i) { return els[i]; }), 1, 0, 300);
      old.forEach(function (i) { els[i].style.display = 'none'; });
      const cnt = counter(COUNT[a]); let n = COUNT[a];
      for (const i of neu) {
        const el = els[i]; el.style.display = ''; resetEl(el);
        await traceEl(h, el, 380);
        await swapLabels(h, el, arcInfo[i].a, arcInfo[i].b, arcInfo[i].top);
        cnt.set(++n);
        await h.wait(120);
      }
      await h.wait(500);
      await h.tween(400, function (e) { cnt.el.style.opacity = 1 - e; });
    }
    return { snap: snap, play: play };
  });

  // =====================================================================================================
  // PLOT (frame 9: gráfico do pgfplots, página inteira)
  // =====================================================================================================
  A.define('plot', function (host) {
    const D = A.figData && A.figData.plot;
    if (!D) { console.warn('plot: sem dados'); return { snap: function () {} }; }
    const root = makeRoot(host, D, 'Gráfico de f(n) = n(n−1)/2 e g(n) = n²/2');
    const L = layers(root);
    const items = D.items, els = A.figBuild(L.items, items);
    // eixos (medidos no PDF): n = 0..20 -> x 148.17..346.99; f = 0..200 -> y 180.52..52.6
    const X0 = 148.17, X1 = 346.99, Y0 = 180.52, Y1 = 52.6;
    const xOf = function (n) { return X0 + (X1 - X0) * n / 20; }, yOf = function (v) { return Y0 + (Y1 - Y0) * v / 200; };
    const nOf = function (x) { return (x - X0) * 20 / (X1 - X0); };
    // grupos de itens
    const find = function (pred) { const r = []; items.forEach(function (it, i) { if (pred(it, i)) r.push(i); }); return r; };
    const BG = find(function (it) { return it.t === 'p' && it.f === '#ffffff' && it.b[2] - it.b[0] > 400; });
    const GRID = find(function (it) { return it.t === 'p' && it.s === '#bfbfbf'; });
    const TICKS = find(function (it) { return it.t === 'p' && it.s === '#7f807f'; });
    const BOX = find(function (it) { return it.t === 'p' && it.s === '#000000' && !it.f && it.b[3] < 200 && it.b[2] - it.b[0] > 200; });
    const CURVE_F = find(function (it) { return it.t === 'p' && it.s === '#0000ff' && it.b[3] < 200; });
    const CURVE_G = find(function (it) { return it.t === 'p' && it.s === '#ff0000' && it.b[3] < 200; });
    const TICKLAB = find(function (it) { return it.t === 'x' && ((it.b[1] > 195 && it.b[1] < 200) || (it.b[2] < 125 && it.b[0] > 105)); });
    const TITLE = find(function (it) { return it.t === 'x' && it.b[3] < 35; });
    const AXLAB = find(function (it) { return it.t === 'x' && ((it.b[1] > 205 && it.b[3] < 220) || it.b[2] < 101); });
    const LEGEND = find(function (it) { return it.b[1] > 214; });
    const ALL = items.map(function (_, i) { return i; });

    function show(list) {
      const on = {}; list.forEach(function (i) { on[i] = true; });
      els.forEach(function (e, i) { resetEl(e); e.style.display = on[i] ? '' : 'none'; e.removeAttribute('clip-path'); });
      els.forEach(function (e, i) { if (items[i].r) e.setAttribute('transform', 'rotate(' + items[i].r + ' ' + items[i].x + ' ' + items[i].y + ')'); });
    }
    function snap(st) { L.fx.textContent = ''; clipDefs.textContent = ''; show(st === 'plot' ? ALL : BG); }
    const clipDefs = S('defs', {}, root);
    // revela da esquerda para a direita (curva tracejada) com um recorte
    function reveal(h, i, dur, tip) {
      const el = els[i], b = items[i].b, id = 'clp' + i + '_' + Math.round(Math.random() * 1e6);
      const cp = S('clipPath', { id: id }, clipDefs);
      const r = S('rect', { x: b[0] - 2, y: b[1] - 4, width: 0, height: b[3] - b[1] + 8 }, cp);
      el.style.display = ''; el.setAttribute('clip-path', 'url(#' + id + ')');
      let dot = null;
      if (tip) dot = S('circle', { r: 2.2, fill: tip }, L.fx);
      return h.tween(dur, function (e) {
        const x = b[0] - 2 + (b[2] - b[0] + 4) * e;
        r.setAttribute('width', (b[2] - b[0] + 4) * e);
        if (dot) {
          const n = nOf(Math.min(X1, Math.max(X0, x)));
          const v = tip === BLUE_F ? n * (n - 1) / 2 : n * n / 2;
          dot.setAttribute('cx', xOf(n)); dot.setAttribute('cy', yOf(v));
        }
      }, E.inOut).then(function () { el.removeAttribute('clip-path'); cp.remove(); if (dot) dot.remove(); });
    }
    const BLUE_F = '#0000ff', RED_G = '#ff0000';
    async function words(h, list, dur) {
      for (const i of list) {
        els[i].style.display = ''; els[i].style.opacity = 0;
        await h.tween(dur || 70, function (e) { els[i].style.opacity = e; });
      }
    }
    async function play(a, b, h) {
      if (!(a === 'vazio' && b === 'plot')) return;
      show(BG);
      BOX.forEach(function (i) { els[i].style.display = ''; });
      await h.all(BOX.map(function (i) { return traceEl(h, els[i], 600); }));
      GRID.concat(TICKS).forEach(function (i) { els[i].style.display = ''; els[i].style.opacity = 0; });
      await fade(h, GRID.concat(TICKS).map(function (i) { return els[i]; }), 0, 1, 450);
      await h.all([words(h, TICKLAB, 45), words(h, AXLAB, 70)]);
      await words(h, TITLE, 70);
      await h.wait(200);
      await h.all(CURVE_F.map(function (i) { return reveal(h, i, 1500, BLUE_F); }));
      await h.all(CURVE_G.map(function (i) { return reveal(h, i, 1200, RED_G); }));
      const legBox = LEGEND.filter(function (i) { return items[i].t === 'p' && items[i].f; });
      await pop(h, legBox.map(function (i) { return els[i]; }), center(items[legBox[0]] || items[LEGEND[0]]), 280);
      legBox.forEach(function (i) { els[i].style.display = ''; });
      await words(h, LEGEND.filter(function (i) { return legBox.indexOf(i) < 0; }), 35);
      await h.wait(300);
    }

    // ---- leitura com o mouse ----
    host.setAttribute('data-interactive', '');
    const gHover = S('g', { 'pointer-events': 'none', opacity: 0 }, root);
    const vline = S('line', { y1: Y1 - 12.8, y2: Y0, stroke: '#555', 'stroke-width': 0.5, 'stroke-dasharray': '2 1.5' }, gHover);
    const dF = S('circle', { r: 2.2, fill: BLUE_F }, gHover), dG = S('circle', { r: 2.2, fill: RED_G }, gHover);
    const box = S('rect', { x: 0, y: 0, width: 128, height: 44, rx: 2, fill: '#ffffff', 'fill-opacity': 0.92, stroke: '#888', 'stroke-width': 0.4 }, gHover);
    const tl = [0, 1, 2, 3].map(function (k) { return S('text', { 'font-family': 'LM Sans, sans-serif', 'font-size': 7.9, fill: ['#000', BLUE_F, RED_G, BLUE][k] }, gHover); });
    function hover(x) {
      const n = Math.round(Math.max(0, Math.min(20, nOf(x))) * 10) / 10;
      const f = n * (n - 1) / 2, g = n * n / 2;
      const px = xOf(n);
      vline.setAttribute('x1', px); vline.setAttribute('x2', px);
      dF.setAttribute('cx', px); dF.setAttribute('cy', yOf(f)); dG.setAttribute('cx', px); dG.setAttribute('cy', yOf(g));
      const bx = n < 9 ? 176 : 156, by = 58;  // a caixa fica no canto livre do gráfico
      box.setAttribute('x', bx); box.setAttribute('y', by);
      const txt = ['n = ' + br(n, 1), 'f(n) = n(n−1)/2 = ' + br(f, 1), 'g(n) = n²/2 = ' + br(g, 1),
        n >= 1 ? 'f(n)/g(n) = (n−1)/n = ' + br(f / g, 2) : 'f(n)/g(n) → 1 quando n cresce'];
      tl.forEach(function (t, k) { t.setAttribute('x', bx + 5); t.setAttribute('y', by + 10 + k * 10); t.textContent = txt[k]; });
    }
    root.addEventListener('mousemove', function (ev) {
      const pt = root.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
      const p = pt.matrixTransform(root.getScreenCTM().inverse());
      if (p.x >= X0 - 4 && p.x <= X1 + 4 && p.y >= Y1 - 14 && p.y <= Y0 + 14) { hover(p.x); gHover.setAttribute('opacity', 1); }
      else gHover.setAttribute('opacity', 0);
    });
    root.addEventListener('mouseleave', function () { gHover.setAttribute('opacity', 0); });
    return { snap: snap, play: play };
  });

  // =====================================================================================================
  // ROLETA (frame 25, passo extra 3): os pesos novos nas duas roletas (α = 0,2 e α = 0,8)
  // =====================================================================================================
  // Abaixo do texto (que fica igual ao PDF), duas roletas com ρ+ = (3,4; 1; 1; 1; 1) e (1,59; 1; 1; 1; 1): as fatias
  // crescem, as roletas giram e param num operador sorteado; depois 200 sorteios rápidos enchem as barras de
  // frequência. Clicar numa roleta gira de novo e refaz os 200 sorteios.
  A.define('roleta', function (host) {
    const W = 453.543, H = 86;
    const root = S('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Roletas com os novos pesos' });
    root.style.width = W + 'pt'; root.style.height = H + 'pt'; root.style.overflow = 'visible';
    host.appendChild(root);
    host.setAttribute('data-interactive', '');
    const OP1 = '#b6321d', SHADES = ['#b6321d', '#5b8fbf', '#7aa6cf', '#99bddf', '#b8d3ec'];
    const CASES = [{ cx: 66, w: [3.4, 1, 1, 1, 1], a: '0,2' }, { cx: 284, w: [1.59, 1, 1, 1, 1], a: '0,8' }];
    const R = 30, CY = 44, N = 200;
    let seed = 12345;
    const rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const font = { 'font-family': 'LM Sans, sans-serif' };
    const T = function (g, x, y, txt, sz, fill, anchor) {
      const t = S('text', Object.assign({ x: x, y: y, 'font-size': sz || 8.97, fill: fill || '#000', 'text-anchor': anchor || 'start' }, font), g);
      t.textContent = txt; return t;
    };
    const wheels = CASES.map(function (c) {
      const g = S('g', {}, root);
      const tot = c.w.reduce(function (p, q) { return p + q; }, 0);
      const probs = c.w.map(function (v) { return v / tot; });
      const rot = S('g', {}, g);
      const sectors = probs.map(function (p, k) { return S('path', { fill: SHADES[k], stroke: '#fff', 'stroke-width': 0.8 }, rot); });
      const labs = probs.map(function (p, k) { return T(rot, 0, 0, String(k + 1), 7.5, k === 0 ? '#fff' : '#003a66', 'middle'); });
      S('circle', { cx: c.cx, cy: CY, r: R, fill: 'none', stroke: BLUE, 'stroke-width': 1 }, g);
      S('path', { d: 'M' + c.cx + ' ' + (CY - R - 1) + 'l-4 -7h8z', fill: '#222' }, g);   // ponteiro
      const tx = c.cx + R + 12;
      T(g, tx, 12, 'α = ' + c.a + ':  ρ⁺ = (' + c.w.map(function (v) { return String(v).replace('.', ','); }).join('; ') + ')', 8.97, BLUE);
      T(g, tx, 23, 'P(1) = ' + br(probs[0] * 100, 0) + '%', 7.97);
      T(g, tx, 33, 'P(2) = ... = P(5) = ' + br(probs[1] * 100, 1) + '%', 7.97);
      const res = T(g, tx, 44, '', 7.97, OP1);
      const bars = [], cnts = [];
      for (let k = 0; k < 5; k++) {
        T(g, tx + 6 + k * 22, 84, String(k + 1), 7, '#333', 'middle');
        bars.push(S('rect', { x: tx + k * 22, y: 77, width: 12, height: 0, fill: SHADES[k] }, g));
        cnts.push(T(g, tx + 6 + k * 22, 75, '', 6.5, '#333', 'middle'));
      }
      const cap = T(g, tx + 112, 84, '', 7, '#555');
      labs.forEach(function (l) { l._r = true; });
      return { c: c, g: g, rot: rot, sectors: sectors, labs: labs, probs: probs, res: res, bars: bars, cnts: cnts, cap: cap,
        ang: 0, pick: null, cnt: null };
    });
    // desenha as fatias (frac = quanto do círculo já aparece)
    function draw(w, frac) {
      let a0 = -Math.PI / 2;
      w.probs.forEach(function (p, k) {
        const a1 = a0 + 2 * Math.PI * p * frac, large = (a1 - a0) > Math.PI ? 1 : 0;
        const x0 = w.c.cx + R * Math.cos(a0), y0 = CY + R * Math.sin(a0), x1 = w.c.cx + R * Math.cos(a1), y1 = CY + R * Math.sin(a1);
        w.sectors[k].setAttribute('d', frac <= 0 ? '' : 'M' + w.c.cx + ' ' + CY + 'L' + x0 + ' ' + y0 + 'A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + x1 + ' ' + y1 + 'Z');
        const am = (a0 + a1) / 2;
        w.labs[k].setAttribute('x', w.c.cx + R * 0.64 * Math.cos(am)); w.labs[k].setAttribute('y', CY + R * 0.64 * Math.sin(am) + 2.6);
        w.labs[k].style.opacity = frac >= 1 ? 1 : 0;
        a0 = a1;
      });
    }
    // gira a roleta; os números das fatias continuam de pé
    const setRot = function (w, deg) {
      w.ang = deg; w.rot.setAttribute('transform', 'rotate(' + deg + ' ' + w.c.cx + ' ' + CY + ')');
      w.labs.forEach(function (l) { l.setAttribute('transform', 'rotate(' + (-deg) + ' ' + l.getAttribute('x') + ' ' + (+l.getAttribute('y') - 2.6) + ')'); });
    };
    function sample(w) { const u = rnd(); let acc = 0; for (let k = 0; k < 5; k++) { acc += w.probs[k]; if (u < acc) return k; } return 4; }
    // barras e textos a partir do estado guardado (fração e = 0..1 das contagens)
    function stats(w, e) {
      w.res.textContent = w.pick == null ? '' : 'sorteado: operador ' + (w.pick + 1);
      const cnt = w.cnt || [0, 0, 0, 0, 0], mx = N * 0.6;
      cnt.forEach(function (c, k) {
        const v = Math.round(c * e), hh = 28 * v / mx;
        w.bars[k].setAttribute('height', hh); w.bars[k].setAttribute('y', 77 - hh);
        w.cnts[k].setAttribute('y', 75 - hh); w.cnts[k].textContent = w.cnt ? String(v) : '';
      });
      w.cap.textContent = w.cnt ? N + ' sorteios' : '';
    }
    async function spin(h, w) {
      const k = sample(w);
      // para no meio da fatia k (com alguma folga), depois de 3 voltas
      let acc = 0; for (let q = 0; q < k; q++) acc += w.probs[q];
      const target = (acc + w.probs[k] * (0.25 + 0.5 * rnd())) * 360;   // ângulo da fatia sob o ponteiro
      const start = w.ang;
      const end = start - 3 * 360 - (((start + target) % 360) + 360) % 360;
      w.pick = null; stats(w, 1);
      await h.tween(2400, function (e) { setRot(w, lerp(start, end, e)); }, E.out);
      w.pick = k; stats(w, 1);
    }
    async function draws(h, w) {
      const cnt = [0, 0, 0, 0, 0];
      for (let i = 0; i < N; i++) cnt[sample(w)]++;
      w.cnt = cnt;
      await h.tween(1200, function (e) { stats(w, e); });
    }
    function snap(st) {
      root.style.display = st === 'on' ? '' : 'none';
      wheels.forEach(function (w) {
        // aberto direto no passo (ou impresso): mostra um resultado pronto
        if (st === 'on' && !w.cnt) {
          const cnt = [0, 0, 0, 0, 0];
          for (let i = 0; i < N; i++) cnt[sample(w)]++;
          w.cnt = cnt; w.pick = sample(w);
          let acc = 0; for (let q = 0; q < w.pick; q++) acc += w.probs[q];
          w.ang = -(acc + w.probs[w.pick] / 2) * 360;
        }
        draw(w, 1); setRot(w, w.ang); stats(w, 1); w.g.style.opacity = '';
      });
    }
    async function play(a, b, h) {
      if (b !== 'on') return;
      root.style.display = '';
      wheels.forEach(function (w) { w.pick = null; w.cnt = null; setRot(w, 0); draw(w, 0); stats(w, 1); w.g.style.opacity = 0; });
      for (const w of wheels) {
        w.g.style.opacity = 1;
        await h.tween(700, function (e) { draw(w, e); }, E.out);
      }
      await h.all(wheels.map(function (w) { return spin(h, w); }));
      await h.wait(400);
      await h.all(wheels.map(function (w) { return draws(h, w); }));
    }
    // clique numa roleta: gira de novo e refaz os sorteios (fora do roteiro do core)
    const free = {
      tween: function (d, fn, ez) {
        return new Promise(function (res) {
          const t0 = performance.now();
          (function fr(now) { const t = Math.min(1, (now - t0) / d); fn((ez || E.inOut)(t), t); if (t < 1) requestAnimationFrame(fr); else res(); })(t0);
        });
      }
    };
    wheels.forEach(function (w) {
      w.g.style.cursor = 'pointer';
      w.g.addEventListener('click', function () {
        if (w._busy) return; w._busy = true;
        spin(free, w).then(function () { return draws(free, w); }).then(function () { w._busy = false; });
      });
    });
    return { snap: snap, play: play };
  });
})();
