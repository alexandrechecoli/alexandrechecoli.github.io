/* Animações da aula 9 (LNS & ALNS). Dados das figuras em js/anim/dados/{swap,vrp,plot}.js
 * (ferramentas/figura_camadas.py). O estado final de cada passo é a figura do PDF.
 *
 *   swap  (frame 8; estados vazio, swap1..swap4, total)
 *         os 5 pontos brotam; a cada passo os arcos de SWAP do ponto da vez são traçados um a um e os dois
 *         rótulos trocam de lugar seguindo o arco (o vizinho) e voltam, com um contador de vizinhos;
 *         "total" (passo 5, junto com a caixa 4 + 3 + 3 = 10): os 10 arcos aparecem juntos, por grupo
 *   vrp   (frames 19–21; estados vazio, VRP1, VRP2, VRP3)
 *         VRP1: o depósito surge e cada rota é percorrida por um veículo; os clientes surgem quando ele passa.
 *         VRP2 (destruição): sorteio — clientes piscam ao acaso até parar nos removidos, que ficam vermelhos;
 *         as arestas deles ficam vermelhas tracejadas e somem, e as rotas se fecham sem eles.
 *         VRP3 (reconstrução): cada cliente removido é reinserido: a aresta onde ele entra "estica" até ele
 *         (elástico) e vira duas.
 *   plot  (frame 11, slide [plain] com o gráfico do pgfplots; estados vazio, plot)
 *         moldura, grade e eixos; título; f(n) é desenhada com um ponto na ponta, depois g(n) tracejada;
 *         a legenda entra. Interativo: com o mouse sobre o gráfico, uma linha vertical mostra n, f(n), g(n) e
 *         a razão f(n)/g(n) = (n−1)/n, que tende a 1 (por isso f(n) = O(n²)).
 *   dyna  (frame 12; estados vazio, ex, simples, compostos) SWAP composto: exemplo SWAP(1,2) + SWAP(3,5) e os 15
 *         vizinhos de 5 pontos em miniatura (10 simples + 5 pares independentes)
 *   dynacont (frame 13; estados vazio, n2..n5) todos os vizinhos para n = 2..5, com simples + compostos = total
 *   cresc (frame 14, [plain]; estados vazio, lin, zoom) SWAP × SWAP composto no mesmo gráfico; "zoom" afasta o
 *         eixo y até 600.000. Interativo: valores e razão sob o mouse
 *   roleta (frame 37, passo extra 3)
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
  // VRP (frames 19–21)
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
  // PLOT (frame 11: gráfico do pgfplots, página inteira)
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
  // ROLETA (frame 37, passo extra 3): os pesos novos nas duas roletas (α = 0,2 e α = 0,8)
  // =====================================================================================================
  // Abaixo do texto (que fica igual ao PDF), duas roletas com ρ+ = (1; 1; 3,4; 1; 1) e (1; 1; 1,6; 1; 1): as fatias
  // crescem, as roletas giram e param num operador sorteado; depois 200 sorteios rápidos enchem as barras de
  // frequência. Clicar numa roleta gira de novo e refaz os 200 sorteios.
  A.define('roleta', function (host) {
    const W = 453.543, H = 86;
    const root = S('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Roletas com os novos pesos' });
    root.style.width = W + 'pt'; root.style.height = H + 'pt'; root.style.overflow = 'visible';
    host.appendChild(root);
    host.setAttribute('data-interactive', '');
    const OP1 = '#b6321d', BLUES = ['#5b8fbf', '#7aa6cf', '#99bddf', '#b8d3ec'];
    const HI = 2;   // operador de reconstrução usado (b = 2): o único cujo peso mudou
    const SHADES = [0, 1, 2, 3, 4].map(function (k) { return k === HI ? OP1 : BLUES[k < HI ? k : k - 1]; });
    const CASES = [{ cx: 66, w: [1, 1, 3.4, 1, 1], a: '0,2' }, { cx: 270, w: [1, 1, 1.6, 1, 1], a: '0,8' }];
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
      const labs = probs.map(function (p, k) { return T(rot, 0, 0, String(k), 7.5, k === HI ? '#fff' : '#003a66', 'middle'); });
      S('circle', { cx: c.cx, cy: CY, r: R, fill: 'none', stroke: BLUE, 'stroke-width': 1 }, g);
      S('path', { d: 'M' + c.cx + ' ' + (CY - R - 1) + 'l-4 -7h8z', fill: '#222' }, g);   // ponteiro
      const tx = c.cx + R + 12;
      T(g, tx, 12, 'α = ' + c.a + ':  ρ⁺ = (' + c.w.map(function (v) { return String(v).replace('.', ','); }).join('; ') + ')', 8.97, BLUE);
      T(g, tx, 23, 'P(' + HI + ') = ' + br(probs[HI] * 100, 1) + '%', 7.97);
      T(g, tx, 33, 'demais operadores: ' + br(probs[0] * 100, 1) + '%', 7.97);
      const res = T(g, tx, 44, '', 7.97, OP1);
      const bars = [], cnts = [];
      for (let k = 0; k < 5; k++) {
        T(g, tx + 6 + k * 20, 84, String(k), 7, '#333', 'middle');
        bars.push(S('rect', { x: tx + k * 20, y: 77, width: 12, height: 0, fill: SHADES[k] }, g));
        cnts.push(T(g, tx + 6 + k * 20, 75, '', 6.5, '#333', 'middle'));
      }
      const cap = T(g, tx + 100, 84, '', 7, '#555');
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
      w.res.textContent = w.pick == null ? '' : 'sorteado: operador ' + w.pick;
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

  // ---------- texto "matemático" em SVG (partes com fontes do KaTeX / LM Sans) ----------
  // parts: [texto, tipo, cor?]; tipo: 's' LM Sans, 'r' KaTeX_Main, 'i' KaTeX_Math itálico, 'sup' / 'supi' expoente,
  // 'gap' espaço horizontal de `texto` pt
  function rich(parent, x, y, parts, opt) {
    opt = opt || {};
    const fs = opt.fs || 10.91, t = S('text', { x: x, y: y, 'font-size': fs, fill: opt.fill || '#000', 'text-anchor': opt.anchor || 'start' }, parent);
    if (opt.rot) t.setAttribute('transform', 'rotate(' + opt.rot + ' ' + x + ' ' + y + ')');
    let raised = 0;
    parts.forEach(function (p) {
      const k = p[1], sup = k === 'sup' || k === 'supi';
      if (k === 'gap') { S('tspan', { dx: p[0] }, t).textContent = ' '; return; }
      const sp = S('tspan', {}, t);
      sp.setAttribute('font-family', k === 's' ? 'LM Sans, sans-serif' : (k === 'i' || k === 'supi') ? 'KaTeX_Math, serif' : 'KaTeX_Main, serif');
      if (k === 'i' || k === 'supi') sp.setAttribute('font-style', 'italic');
      if (sup) sp.setAttribute('font-size', fs * 0.73);
      const want = sup ? -fs * 0.36 : 0;
      if (want !== raised) { sp.setAttribute('dy', want - raised); raised = want; }
      if (p[2]) sp.setAttribute('fill', p[2]);
      sp.textContent = p[0];
    });
    return t;
  }
  const milhar = function (v) { return Math.round(v).toLocaleString('pt-BR'); };

  // =====================================================================================================
  // DYNA (frame 12: SWAP composto — vários SWAPs independentes num só movimento; estados vazio, ex, simples,
  // compostos)
  // =====================================================================================================
  // À esquerda, o exemplo SWAP(1,2) + SWAP(3,5): os pontos brotam, os arcos são traçados e os rótulos trocam de
  // lugar ao mesmo tempo (e voltam). À direita, os 15 vizinhos de 5 pontos em miniatura: os 10 SWAPs simples
  // (azul) e os 5 pares de SWAPs independentes (vermelho).
  A.define('dyna', function (host) {
    const W = 400, H = 66, sc = +(host.dataset.scale || 1);
    const root = S('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Os 15 vizinhos do SWAP composto com 5 pontos' });
    root.style.width = (W * sc) + 'pt'; root.style.height = (H * sc) + 'pt'; root.style.overflow = 'visible';
    host.appendChild(root);
    const RED2 = '#b6321d', FILL = '#0061a5';
    const arcD = function (x1, x2, y, h, up) {
      const k = 1.33 * h * (up ? -1 : 1), d = (x2 - x1) / 3;
      return 'M' + x1 + ' ' + y + 'C' + (x1 + d) + ' ' + (y + k) + ' ' + (x2 - d) + ' ' + (y + k) + ' ' + x2 + ' ' + y;
    };
    const bez = function (x1, x2, y, h, up, t) {   // ponto do arco acima em t (controles na mesma altura)
      const k = 1.33 * h * (up ? -1 : 1), d = (x2 - x1) / 3, u = 1 - t;
      return [u * u * u * x1 + 3 * u * u * t * (x1 + d) + 3 * u * t * t * (x2 - d) + t * t * t * x2, y + 3 * u * t * k];
    };
    // ---- exemplo grande ----
    const EX = [14, 38, 62, 86, 110], EY = 36, ER = 10, PAIRS = [[1, 2], [3, 5]];
    const gEx = S('g', {}, root);
    const exArcs = PAIRS.map(function (p) {
      return S('path', { d: arcD(EX[p[0] - 1], EX[p[1] - 1], EY - ER, 4 + 3 * (p[1] - p[0]), true), fill: 'none', stroke: RED2, 'stroke-width': 0.8 }, gEx);
    });
    const exNodes = EX.map(function (x, k) {
      const g = S('g', {}, gEx);
      S('circle', { cx: x, cy: EY, r: ER, fill: FILL, 'fill-opacity': 0.3, stroke: '#000', 'stroke-width': 1 }, g);
      return g;
    });
    const exLabs = EX.map(function (x, k) {
      const t = S('text', { x: x, y: EY + 3.6, 'font-family': 'KaTeX_Main, serif', 'font-size': 10.5, 'text-anchor': 'middle' }, gEx);
      t.textContent = String(k + 1); return t;
    });
    const exCap = rich(gEx, EX[2], 62, [['SWAP(1,2) + SWAP(3,5)', 's']], { fs: 7.97, fill: RED2, anchor: 'middle' });
    function exReset() {
      exLabs.forEach(function (t, k) { t.setAttribute('x', EX[k]); t.setAttribute('y', EY + 3.6); t.style.opacity = ''; });
      exArcs.forEach(function (a) { a.style.strokeDasharray = ''; a.style.strokeDashoffset = ''; a.style.display = ''; });
      exNodes.forEach(function (g) { resetEl(g); });
      exCap.style.opacity = '';
    }
    // ---- miniaturas: os 15 vizinhos ----
    const MOVES = [[[1, 2]], [[1, 3]], [[1, 4]], [[1, 5]], [[2, 3]], [[2, 4]], [[2, 5]], [[3, 4]], [[3, 5]], [[4, 5]],
      [[1, 2], [3, 4]], [[1, 2], [3, 5]], [[1, 2], [4, 5]], [[1, 3], [4, 5]], [[2, 3], [4, 5]]];
    const GX = 142, PX = 52, RY = [18, 39, 60], DS = 9, DR = 3.2;
    const cells = MOVES.map(function (mv, m) {
      const row = m < 5 ? 0 : m < 10 ? 1 : 2, x0 = GX + (m % 5) * PX + DR, y = RY[row];
      const g = S('g', {}, root);
      const dots = [0, 1, 2, 3, 4].map(function (k) {
        return S('circle', { cx: x0 + k * DS, cy: y, r: DR, fill: FILL, 'fill-opacity': 0.3, stroke: '#000', 'stroke-width': 0.6 }, g);
      });
      const arcs = mv.map(function (p) {
        return S('path', { d: arcD(x0 + (p[0] - 1) * DS, x0 + (p[1] - 1) * DS, y - DR, 2 + 1.6 * (p[1] - p[0]), true),
          fill: 'none', stroke: m < 10 ? FILL : RED2, 'stroke-width': 0.9 }, g);
      });
      return { g: g, dots: dots, arcs: arcs };
    });
    const LV = { vazio: 0, ex: 1, simples: 2, compostos: 3 };
    function snap(st) {
      const lv = LV[st] || 0;
      exReset(); gEx.style.display = lv >= 1 ? '' : 'none';
      cells.forEach(function (c, m) {
        c.g.style.display = (m < 10 ? lv >= 2 : lv >= 3) ? '' : 'none'; c.g.style.opacity = '';
        c.arcs.forEach(function (a) { a.style.strokeDasharray = ''; a.style.strokeDashoffset = ''; });
      });
    }
    async function swapLabs(h, back) {
      await h.tween(900, function (e) {
        PAIRS.forEach(function (p) {
          const i = p[0] - 1, j = p[1] - 1, hh = 7 + 5 * (j - i);
          const a = bez(EX[i], EX[j], EY, hh, true, back ? 1 - e : e), b = bez(EX[j], EX[i], EY, hh, false, back ? 1 - e : e);
          exLabs[i].setAttribute('x', a[0]); exLabs[i].setAttribute('y', a[1] + 3.6);
          exLabs[j].setAttribute('x', b[0]); exLabs[j].setAttribute('y', b[1] + 3.6);
        });
      });
    }
    async function cellIn(h, c, dur) {
      c.g.style.display = ''; c.g.style.opacity = 0;
      c.arcs.forEach(function (a) { const L = a.getTotalLength(); a.style.strokeDasharray = L + ' ' + (L + 1); a.style.strokeDashoffset = L; });
      await h.tween(dur * 0.4, function (e) { c.g.style.opacity = e; });
      await h.all(c.arcs.map(function (a) { return traceEl(h, a, dur * 0.6); }));
    }
    async function play(a, b, h) {
      const la = LV[a] || 0, lb = LV[b] || 0;
      if (la < 1 && lb >= 1) {
        gEx.style.display = ''; exArcs.forEach(function (x) { x.style.display = 'none'; });
        exLabs.forEach(function (t) { t.style.opacity = 0; }); exCap.style.opacity = 0;
        exNodes.forEach(function (g) { g.style.opacity = 0; });
        for (let k = 0; k < 5; k++) {
          await pop(h, [exNodes[k]], [EX[k], EY], 200);
          exLabs[k].style.opacity = '';
        }
        await h.wait(200);
        for (const x of exArcs) { x.style.display = ''; await traceEl(h, x, 450); }
        await fade(h, [exCap], 0, 1, 300);
        await h.wait(250);
        await swapLabs(h, false);
        await h.wait(900);
        await swapLabs(h, true);
      }
      if (la < 2 && lb >= 2) for (let m = 0; m < 10; m++) await cellIn(h, cells[m], 260);
      if (la < 3 && lb >= 3) {
        for (let m = 10; m < 15; m++) {
          await cellIn(h, cells[m], 520);
          await ring(h, root, [GX + (m % 5) * PX + DR + 2 * DS, RY[2]], RED2, 8, 26, 350);
        }
      }
    }
    return { snap: snap, play: play };
  });

  // =====================================================================================================
  // DYNACONT (frame 13: contagem dos vizinhos do SWAP composto para n = 2..5; estados vazio, n2, n3, n4, n5)
  // =====================================================================================================
  // Uma linha por n: rótulo, todos os vizinhos em miniatura (simples em azul, compostos em vermelho, como no
  // frame 10) e a conta simples + compostos = total. Cada passo acrescenta a linha do n seguinte.
  A.define('dynacont', function (host) {
    const NS = [2, 3, 4, 5], W = 400, sc = +(host.dataset.scale || 1);
    const RED2 = '#b6321d', FILL = '#0061a5';
    const DS = 6, DR = 2.3, PX = 36, GX = 46, PER = 8, LH = 21;
    const arcD = function (x1, x2, y, h) { const k = -1.33 * h, d = (x2 - x1) / 3; return 'M' + x1 + ' ' + y + 'C' + (x1 + d) + ' ' + (y + k) + ' ' + (x2 - d) + ' ' + (y + k) + ' ' + x2 + ' ' + y; };
    // todos os conjuntos não vazios de SWAPs independentes (trechos [i,j] disjuntos): simples primeiro
    function allMoves(n) {
      const out = [];
      (function rec(start, cur) {
        for (let i = start; i < n; i++) for (let j = i + 1; j <= n; j++) {
          const nx = cur.concat([[i, j]]); out.push(nx); rec(j + 1, nx);
        }
      })(1, []);
      return out.sort(function (a, b) {
        if (a.length !== b.length) return a.length - b.length;
        for (let k = 0; k < a.length; k++) { if (a[k][0] !== b[k][0]) return a[k][0] - b[k][0]; if (a[k][1] !== b[k][1]) return a[k][1] - b[k][1]; }
        return 0;
      });
    }
    let y = 14;
    const rowsLayout = NS.map(function (n) {
      const mv = allMoves(n), lines = Math.ceil(mv.length / PER), ys = [];
      for (let l = 0; l < lines; l++) ys.push(y + l * LH);
      y += lines * LH;
      return { n: n, mv: mv, ys: ys };
    });
    const H = y - LH + 8;
    const root = S('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Vizinhos do SWAP composto para n = 2, 3, 4 e 5' });
    root.style.width = (W * sc) + 'pt'; root.style.height = (H * sc) + 'pt'; root.style.overflow = 'visible';
    host.appendChild(root);
    const rows = rowsLayout.map(function (r) {
      const g = S('g', {}, root), mid = (r.ys[0] + r.ys[r.ys.length - 1]) / 2 + 3.6;
      const simp = r.mv.filter(function (m) { return m.length === 1; }).length, comp = r.mv.length - simp;
      const lab = rich(g, 0, mid, [['n', 'i'], [' = ' + r.n, 'r']], { fs: 10.91 });
      const cnt = rich(g, W, mid, [[String(simp), 'r', FILL], [' + ', 'r'], [String(comp), 'r', RED2], [' = ', 'r'], [String(r.mv.length), 'r']],
        { fs: 10.91, anchor: 'end' });
      const cells = r.mv.map(function (m, k) {
        const x0 = GX + (k % PER) * PX + DR, yy = r.ys[Math.floor(k / PER)], cg = S('g', {}, g);
        for (let p = 0; p < r.n; p++) S('circle', { cx: x0 + p * DS, cy: yy, r: DR, fill: FILL, 'fill-opacity': 0.3, stroke: '#000', 'stroke-width': 0.5 }, cg);
        const arcs = m.map(function (s) {
          return S('path', { d: arcD(x0 + (s[0] - 1) * DS, x0 + (s[1] - 1) * DS, yy - DR, 1.8 + 1.4 * (s[1] - s[0])), fill: 'none',
            stroke: m.length === 1 ? FILL : RED2, 'stroke-width': 0.8 }, cg);
        });
        return { g: cg, arcs: arcs };
      });
      return { g: g, lab: lab, cnt: cnt, cells: cells };
    });
    const LV = { vazio: -1, n2: 0, n3: 1, n4: 2, n5: 3 };
    function snap(st) {
      const lv = LV[st] == null ? -1 : LV[st];
      rows.forEach(function (r, i) {
        r.g.style.display = i <= lv ? '' : 'none';
        [r.lab, r.cnt].forEach(function (e) { e.style.opacity = ''; });
        r.cells.forEach(function (c) {
          c.g.style.opacity = '';
          c.arcs.forEach(function (a) { a.style.strokeDasharray = ''; a.style.strokeDashoffset = ''; });
        });
      });
    }
    async function rowIn(h, r) {
      r.g.style.display = '';
      r.cnt.style.opacity = 0; r.lab.style.opacity = 0;
      r.cells.forEach(function (c) { c.g.style.opacity = 0; });
      await fade(h, [r.lab], 0, 1, 250);
      const dur = r.cells.length > 8 ? 170 : 300;
      for (const c of r.cells) {
        c.arcs.forEach(function (a) { const L = a.getTotalLength(); a.style.strokeDasharray = L + ' ' + (L + 1); a.style.strokeDashoffset = L; });
        await h.tween(dur * 0.35, function (e) { c.g.style.opacity = e; });
        await h.all(c.arcs.map(function (a) { return traceEl(h, a, dur * 0.65); }));
      }
      await fade(h, [r.cnt], 0, 1, 300);
    }
    async function play(a, b, h) {
      const la = LV[a] == null ? -1 : LV[a], lb = LV[b] == null ? -1 : LV[b];
      for (let i = la + 1; i <= lb; i++) await rowIn(h, rows[i]);
    }
    return { snap: snap, play: play };
  });

  // =====================================================================================================
  // CRESC (frame 14, slide [plain]: SWAP × SWAP composto no mesmo gráfico; estados vazio, lin, zoom)
  // =====================================================================================================
  // Mesma moldura e escala do gráfico do frame 9 (n = 0..20, f = 0..200). "lin": a curva quadrática é traçada e a
  // exponencial sai pelo topo do gráfico perto de n = 9. "zoom": o eixo y se afasta até 600.000 e a quadrática vira
  // uma linha no chão; os valores em n = 20 aparecem. Interativo: com o mouse, os dois tamanhos e a razão entre eles.
  A.define('cresc', function (host) {
    const W = 453.543, H = 255.118;
    const root = S('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Tamanho das vizinhanças SWAP e SWAP composto em função de n' });
    root.style.width = W + 'pt'; root.style.height = H + 'pt'; root.style.overflow = 'visible';
    host.appendChild(root);
    const BX0 = 128.28, BX1 = 366.92, BY0 = 193.4, BY1 = 39.81;          // moldura (como no frame 9)
    const X0 = 148.17, X1 = 346.99, Y0 = 180.52, Y1 = 52.6, NMAX = 20;   // n = 0..20; f = 0..ymax
    const YLIN = 200, YBIG = 600000, C_SW = '#0000ff', C_DY = '#ff0000';
    const fSw = function (n) { return n * (n - 1) / 2; }, fDy = function (n) { return Math.pow(2, n - 1) - 1; };
    let ymax = YLIN;
    const xOf = function (n) { return X0 + (X1 - X0) * n / NMAX; }, nOf = function (x) { return (x - X0) * NMAX / (X1 - X0); };
    const yOf = function (v) { return Y0 + (Y1 - Y0) * v / ymax; };
    const nice = function (r) { const m = Math.pow(10, Math.floor(Math.log10(r))), q = r / m; return (q < 1.5 ? 1 : q < 3 ? 2 : q < 7 ? 5 : 10) * m; };
    const labW = function (s) { return s.replace(/\D/g, '').length * 5.45 + (s.length - s.replace(/\D/g, '').length) * 3.03; };

    const uid = 'cr' + Math.round(Math.random() * 1e6), defs = S('defs', {}, root);
    S('rect', { x: BX0, y: BY1, width: BX1 - BX0, height: BY0 - BY1 }, S('clipPath', { id: uid }, defs));
    S('rect', { x: 0, y: 0, width: W, height: H, fill: '#ffffff' }, root);
    const gGrid = S('g', {}, root), gYlab = S('g', {}, root), gX = S('g', {}, root);
    const gCurves = S('g', { 'clip-path': 'url(#' + uid + ')' }, root);
    const pSw = S('path', { fill: 'none', stroke: C_SW, 'stroke-width': 0.797, 'stroke-linejoin': 'round' }, gCurves);
    const pDy = S('path', { fill: 'none', stroke: C_DY, 'stroke-width': 0.797, 'stroke-linejoin': 'round' }, gCurves);
    const box = S('path', { d: 'M' + BX0 + ' ' + BY0 + 'H' + BX1 + 'V' + BY1 + 'H' + BX0 + 'Z', fill: 'none', stroke: '#000', 'stroke-width': 0.398 }, root);
    const gAnn = S('g', {}, root), gFx = S('g', {}, root);

    // eixo x, títulos e legenda (fixos)
    [0, 5, 10, 15, 20].forEach(function (n) {
      S('text', { x: xOf(n), y: 204.27, 'font-family': 'KaTeX_Main, serif', 'font-size': 10.91, 'text-anchor': 'middle' }, gX).textContent = String(n);
    });
    rich(gX, (BX0 + BX1) / 2, 216.44, [['n', 'i']], { anchor: 'middle' });
    const yTitle = rich(gYlab, 0, 0, [['f', 'i'], ['(', 'r'], ['n', 'i'], [')', 'r']], { anchor: 'middle' });
    const title = rich(root, (BX0 + BX1) / 2, 27.27, [['Ordem de crescimento: ', 's'], ['O', 'i'], ['(', 'r'], ['n', 'i'], ['2', 'sup'],
      [')', 'r'], [' × ', 'r'], ['O', 'i'], ['(', 'r'], ['2', 'r'], ['n', 'supi'], [')', 'r']], { anchor: 'middle' });
    // legenda: [amostra da linha] texto   [amostra] texto, centrada; larguras medidas com canvas (funciona com o
    // frame escondido), refeitas quando as fontes terminam de carregar
    const gLeg = S('g', {}, root), LEG_Y = 235.6, LINE = 20, PAD = 4, SEP = 16;
    const legBox = S('rect', { x: 0, y: 222.2, width: 10, height: 20, fill: '#ffffff', stroke: '#000', 'stroke-width': 0.398 }, gLeg);
    const ENTRIES = [
      { c: C_SW, parts: [['SWAP:  ', 's'], ['n', 'i'], ['(', 'r'], ['n', 'i'], [' − 1)/2', 'r']] },
      { c: C_DY, parts: [['SWAP composto:  ', 's'], ['2', 'r'], ['n', 'supi'], ['−1', 'sup'], [' − 1', 'r']] }];
    ENTRIES.forEach(function (en) {
      en.line = S('path', { stroke: en.c, 'stroke-width': 0.797, fill: 'none' }, gLeg);
      en.txt = rich(gLeg, 0, LEG_Y, en.parts);
      en.txt.style.whiteSpace = 'pre';
    });
    const ctx = document.createElement('canvas').getContext('2d');
    function partsWidth(parts, fs) {
      let w = 0;
      parts.forEach(function (p) {
        const k = p[1], it = k === 'i' || k === 'supi', sz = (k === 'sup' || k === 'supi') ? fs * 0.73 : fs;
        ctx.font = (it ? 'italic ' : '') + sz + 'px ' + (k === 's' ? '"LM Sans"' : it ? 'KaTeX_Math' : 'KaTeX_Main');
        w += ctx.measureText(p[0]).width;
      });
      return w;
    }
    function layoutLegend() {
      const ws = ENTRIES.map(function (en) { return partsWidth(en.parts, 10.91); });
      const total = ENTRIES.length * (LINE + PAD) + ws[0] + ws[1] + SEP;
      let x = (BX0 + BX1) / 2 - total / 2;
      legBox.setAttribute('x', x - 6); legBox.setAttribute('width', total + 12);
      ENTRIES.forEach(function (en, k) {
        en.line.setAttribute('d', 'M' + x + ' ' + (LEG_Y - 3.6) + 'h' + LINE);
        en.txt.setAttribute('x', x + LINE + PAD);
        x += LINE + PAD + ws[k] + SEP;
      });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutLegend);

    // eixo y, grade e curvas para o ymax atual
    function curve(f, n0) {
      const pts = [];
      for (let i = 0; i <= 400; i++) {
        const n = n0 + (NMAX - n0) * i / 400, v = f(n);
        pts.push(xOf(n).toFixed(2) + ' ' + yOf(v).toFixed(2));
        if (v > ymax * 1.15) break;   // já saiu pelo topo: o resto fica fora do recorte
      }
      return 'M' + pts.join('L');
    }
    function render() {
      gGrid.textContent = '';
      Array.prototype.slice.call(gYlab.querySelectorAll('.yt')).forEach(function (t) { t.remove(); });
      const G = { stroke: '#bfbfbf', 'stroke-width': 0.398 }, TK = { stroke: '#7f807f', 'stroke-width': 0.199 };
      [0, 5, 10, 15, 20].forEach(function (n) {
        const x = xOf(n);
        S('path', Object.assign({ d: 'M' + x + ' ' + BY0 + 'V' + BY1 }, G), gGrid);
        S('path', Object.assign({ d: 'M' + x + ' ' + BY0 + 'v-4.25M' + x + ' ' + BY1 + 'v4.25' }, TK), gGrid);
      });
      const step = nice(ymax / 4);
      let wmax = 0;
      for (let k = 0; ; k++) {
        const v = k * step, y = yOf(v);
        if (y < BY1 + 2) break;
        S('path', Object.assign({ d: 'M' + BX0 + ' ' + y + 'H' + BX1 }, G), gGrid);
        S('path', Object.assign({ d: 'M' + BX0 + ' ' + y + 'h4.25M' + BX1 + ' ' + y + 'h-4.25' }, TK), gGrid);
        const s = milhar(v), t = S('text', { class: 'yt', x: 124.45, y: y + 3.52, 'font-family': 'KaTeX_Main, serif', 'font-size': 10.91, 'text-anchor': 'end' }, gYlab);
        t.textContent = s; wmax = Math.max(wmax, labW(s));
      }
      const yx = 124.45 - wmax - 10.2, yy = (Y0 + Y1) / 2;
      yTitle.setAttribute('x', yx); yTitle.setAttribute('y', yy); yTitle.setAttribute('transform', 'rotate(-90 ' + yx + ' ' + yy + ')');
      pSw.setAttribute('d', curve(fSw, 0));
      pDy.setAttribute('d', curve(fDy, 1));
    }
    // valores em n = 20 (depois do zoom)
    function annotate() {
      gAnn.textContent = '';
      const xs = xOf(20);
      [[fDy(20), C_DY, -4, 3.2], [fSw(20), C_SW, -4, -5]].forEach(function (a) {
        const y = yOf(a[0]);
        S('circle', { cx: xs, cy: y, r: 2, fill: a[1] }, gAnn);
        S('text', { x: xs + a[2], y: y + a[3], fill: a[1], 'font-family': 'KaTeX_Main, serif', 'font-size': 8.97, 'text-anchor': 'end' }, gAnn).textContent = milhar(a[0]);
      });
    }
    const PARTS = [gGrid, gYlab, gX, title, box, gLeg];
    function snap(st) {
      gFx.textContent = '';
      ymax = st === 'zoom' ? YBIG : YLIN;
      render(); layoutLegend();
      const on = st === 'lin' || st === 'zoom';
      PARTS.concat([gCurves]).forEach(function (e) { e.style.display = on ? '' : 'none'; e.style.opacity = ''; });
      [pSw, pDy].forEach(function (p) { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; });
      if (st === 'zoom') { annotate(); gAnn.style.display = ''; gAnn.style.opacity = ''; } else gAnn.style.display = 'none';
    }
    function traceTip(h, p, dur, color) {
      const L = p.getTotalLength(), dot = S('circle', { r: 2.2, fill: color }, gFx);
      p.style.strokeDasharray = L + ' ' + (L + 1); p.style.strokeDashoffset = L;
      return h.tween(dur, function (e) {
        p.style.strokeDashoffset = L * (1 - e);
        const q = p.getPointAtLength(L * e);
        dot.setAttribute('cx', q.x); dot.setAttribute('cy', Math.max(BY1, q.y));
      }, E.inOut).then(function () { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; dot.remove(); });
    }
    async function play(a, b, h) {
      if (a === 'vazio' && (b === 'lin' || b === 'zoom')) {
        snap('lin');
        PARTS.forEach(function (e) { e.style.opacity = 0; });
        [pSw, pDy].forEach(function (p) { p.style.strokeDasharray = '1 100000'; p.style.strokeDashoffset = 1; });
        box.style.opacity = ''; await traceEl(h, box, 600);
        await fade(h, [gGrid], 0, 1, 400);
        await fade(h, [gX, gYlab], 0, 1, 400);
        await fade(h, [title], 0, 1, 350);
        await traceTip(h, pSw, 1500, C_SW);
        await traceTip(h, pDy, 1300, C_DY);
        await fade(h, [gLeg], 0, 1, 350);
        if (b === 'lin') return;
        await h.wait(500);
        a = 'lin';
      }
      if (a === 'lin' && b === 'zoom') {
        gAnn.style.display = 'none';
        await h.tween(3000, function (e) { ymax = YLIN * Math.pow(YBIG / YLIN, e); render(); }, E.inOut);
        ymax = YBIG; render(); annotate();
        gAnn.style.display = ''; await fade(h, [gAnn], 0, 1, 400);
      }
    }

    // ---- leitura com o mouse ----
    host.setAttribute('data-interactive', '');
    const gHov = S('g', { 'pointer-events': 'none', opacity: 0 }, root);
    const vline = S('line', { y1: BY1, y2: BY0, stroke: '#555', 'stroke-width': 0.5, 'stroke-dasharray': '2 1.5' }, gHov);
    const dS = S('circle', { r: 2.2, fill: C_SW }, gHov), dD = S('circle', { r: 2.2, fill: C_DY }, gHov);
    const hb = S('rect', { x: 133, y: 45, width: 88, height: 44, rx: 2, fill: '#ffffff', 'fill-opacity': 0.92, stroke: '#888', 'stroke-width': 0.4 }, gHov);
    const tl = [0, 1, 2, 3].map(function (k) {
      return S('text', { x: 138, y: 55 + k * 10, 'font-family': 'LM Sans, sans-serif', 'font-size': 7.9, fill: ['#000', C_SW, C_DY, BLUE][k] }, gHov);
    });
    function hover(x) {
      const n = Math.max(1, Math.min(NMAX, Math.round(nOf(x)))), s = fSw(n), d = fDy(n), px = xOf(n);
      vline.setAttribute('x1', px); vline.setAttribute('x2', px);
      dS.setAttribute('cx', px); dS.setAttribute('cy', yOf(s));
      dD.setAttribute('cx', px); dD.setAttribute('cy', yOf(d)); dD.style.display = yOf(d) < BY1 ? 'none' : '';
      const txt = ['n = ' + n, 'SWAP: ' + milhar(s), 'composto: ' + milhar(d),
        s > 0 ? 'composto / SWAP ≈ ' + (d / s).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : 'composto / SWAP: —'];
      tl.forEach(function (t, k) { t.textContent = txt[k]; });
      let w = 0; tl.forEach(function (t) { try { w = Math.max(w, t.getComputedTextLength()); } catch (e) { } });
      hb.setAttribute('width', Math.max(70, w + 10));
    }
    root.addEventListener('mousemove', function (ev) {
      if (gCurves.style.display === 'none') return;
      const pt = root.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
      const p = pt.matrixTransform(root.getScreenCTM().inverse());
      if (p.x >= BX0 && p.x <= BX1 && p.y >= BY1 && p.y <= BY0) { hover(p.x); gHov.setAttribute('opacity', 1); }
      else gHov.setAttribute('opacity', 0);
    });
    root.addEventListener('mouseleave', function () { gHov.setAttribute('opacity', 0); });
    return { snap: snap, play: play };
  });
})();
