/* Árvores de vizinhos: busca local x SA (aula 7, slides 39–54; figuras img/vizinho1…15 e 18).
 *
 * Uso: <span class="anim" data-anim="viztree" data-fig="vizls|vizsa|viz18" data-from=".." data-state="vizinhoN">
 * Dados: js/anim/dados/vizls.js (vizinho1–8), vizsa.js (vizinho9–15), viz18.js — gerados por
 * figura_camadas.py com --alinhar (o Ipe recortou cada figura com uma caixa um pouco diferente).
 *
 * Transições (a partir da diferença entre as figuras):
 *   - nó novo: a aresta é traçada a partir do nó que o gerou, a ponta da seta surge e o nó brota no fim dela;
 *   - item que só troca de cor (aceite, em vermelho): troca suave e pulso em volta do nó;
 *   - reticências (o processo continua): pontos surgem um a um.
 * À esquerda da figura, um painel (fora da figura do PDF; fica também no estado final) diz o que aconteceu:
 *   busca local: f do vizinho comparado com f da solução atual (✗ pior / ✓ melhor) e a substituição;
 *   SA: vizinho pior → sorteio: a barra [0, 1] enche até p, u cai na barra; u < p aceita, u > p rejeita;
 *       vizinho melhor → p = 1, aceito direto.
 */
(function () {
  'use strict';
  const A = window.Anim;
  if (!A) return;
  const S = A.svg, E = A.ease, lerp = A.lerp;
  const RED = '#d0281a', GREEN = '#169b3a', DRED = '#8b0000', NAVY = '#00008b', GRAY = '#777';
  const MAIN = 'KaTeX_Main, serif', MATH = 'KaTeX_Math, serif';

  const SCENES = {
    vizls: { scale: 1.3, px: -66, py: 40, aria: 'Árvore de vizinhos da busca local' },
    vizsa: { scale: 1.2, px: -70, py: 36, aria: 'Árvore de vizinhos do Simulated Annealing' },
    viz18: { scale: 1.3, first: 1, aria: 'Vizinhos e a diferença ΔE' }
  };
  const WORSE = { t: '✗ pior', c: RED }, BETTER = { t: '✓ melhor!', c: GREEN };
  const PANEL = {
    vizinho1: ['solução atual:', '$s_1$,  $f = 80$'],
    vizinho2: ['$f(s_2) = 90 > 80$', WORSE],
    vizinho3: ['$f(s_3) = 95 > 80$', WORSE],
    vizinho4: ['$f(s_4) = 78 < 80$', BETTER],
    vizinho5: ['$s ← s_4$', '$f$: 80 → 78', { t: 'vizinho aceito', c: DRED }],
    vizinho6: ['$f(s_5) = 82 > 78$', WORSE],
    vizinho7: ['$f(s_6) = 75 < 78$', BETTER],
    vizinho8: ['$s ← s_6$', '$f$: 78 → 75', { t: '... até nenhum', c: GRAY }, { t: 'vizinho ser melhor', c: GRAY }],
    vizinho9: ['solução atual:', '$s_1$,  $f = 80$'],
    vizinho10: ['$f(s_2) = 95 > 80$', 'pior → sorteio', { bar: 0.56, u: 0.71 }, { t: '$u = 0,71 > p$  ✗', c: RED }],
    vizinho11: ['$f(s_3) = 82 > 80$', 'pior → sorteio', { bar: 0.92, u: 0.40 }, { t: '$u = 0,40 < p$  ✓', c: GREEN }],
    vizinho12: ['$s ← s_3$', { t: 'aceito, mesmo', c: DRED }, { t: 'sendo pior!', c: DRED }],
    vizinho13: ['$f(s_4) = 84 > 82$', 'pior → sorteio', { bar: 0.45, u: 0.63 }, { t: '$u = 0,63 > p$  ✗', c: RED }],
    vizinho14: ['$f(s_5) = 81 < 82$', 'melhor → $p = 1$', { t: '✓ aceito direto', c: GREEN }],
    vizinho15: ['$s ← s_5$', { t: 'vizinho aceito', c: DRED }]
  };
  const FS = 6.6, LH = 8.8, BARW = 50;

  A.define('viztree', function (host) {
    const name = host.dataset.fig, D = (A.figData || {})[name], C = SCENES[name] || {};
    if (!D) { console.warn('viztree: sem dados', name); return { snap: function () {} }; }
    const W = D.W, H = D.H, items = D.items;
    const root = S('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': C.aria || name });
    root.style.width = (W * C.scale) + 'pt'; root.style.height = (H * C.scale) + 'pt'; root.style.overflow = 'visible';
    host.appendChild(root);
    const gItems = S('g', {}, root), gFx = S('g', {}, root), gPanel = S('g', {}, root);
    const els = A.figBuild(gItems, items);

    // ---------- classificação dos itens ----------
    const isBox = function (it) { return it.t === 'p' && it.f === NAVY && it.b[3] - it.b[1] > 15; };
    const isLine = function (it) { return it.t === 'p' && (Math.abs(it.b[0] - it.b[2]) < 0.1 || Math.abs(it.b[1] - it.b[3]) < 0.1) && !/C/.test(it.d); };
    const isHead = function (it) { return it.t === 'p' && !isBox(it) && !isLine(it) && !/C/.test(it.d) && it.b[2] - it.b[0] < 4 && it.b[3] - it.b[1] < 4; };
    const isDot = function (it) { return it.t === 'p' && /C/.test(it.d) && it.b[2] - it.b[0] < 2; };
    const inBox = function (b, it) { return it.t === 'x' && it.x >= b[0] - 0.5 && it.x <= b[2] && it.y >= b[1] && it.y <= b[3] + 1; };
    const onBorder = function (b, p) {
      const inX = p[0] >= b[0] - 0.6 && p[0] <= b[2] + 0.6, inY = p[1] >= b[1] - 0.6 && p[1] <= b[3] + 0.6;
      return inX && inY && (Math.abs(p[0] - b[0]) < 0.6 || Math.abs(p[0] - b[2]) < 0.6 || Math.abs(p[1] - b[1]) < 0.6 || Math.abs(p[1] - b[3]) < 0.6);
    };
    const ends = function (it) { const n = it.d.match(/-?\d+(\.\d+)?/g).map(Number); return [[n[0], n[1]], [n[n.length - 2], n[n.length - 1]]]; };
    const sameBox = function (a, b) { return a.every(function (v, i) { return Math.abs(v - b[i]) < 0.3; }); };

    const show = function (i, on) { els[i].style.display = on ? '' : 'none'; };
    function reset(i) { const e = els[i]; e.style.opacity = ''; e.removeAttribute('transform'); }
    function setVisible(ids) {
      const on = {}; ids.forEach(function (i) { on[i] = true; });
      items.forEach(function (_, i) { reset(i); show(i, !!on[i]); });
    }

    // ---------- painel ----------
    function rich(parent, x, y, spec, fs) {
      const str = typeof spec === 'string' ? spec : spec.t;
      const t = S('text', { x: x, y: y, 'font-size': fs || FS, fill: spec.c || '#000', 'font-family': MAIN }, parent);
      str.split('$').forEach(function (seg, k) {
        if (!seg) return;
        if (k % 2 === 0) { S('tspan', {}, t).textContent = seg; return; }
        // matemática: letras em itálico, _x = índice
        const re = /([A-Za-z])(?:_(\w))?|([^A-Za-z]+)/g; let m;
        while ((m = re.exec(seg))) {
          if (m[3]) { S('tspan', { 'font-family': MAIN }, t).textContent = m[3]; continue; }
          S('tspan', { 'font-family': MATH, 'font-style': 'italic' }, t).textContent = m[1];
          if (m[2]) {
            S('tspan', { 'font-size': (fs || FS) * 0.7, dy: 1.2, 'font-family': MAIN }, t).textContent = m[2];
            S('tspan', { dy: -1.2, 'font-size': fs || FS }, t).textContent = ' ';
          }
        }
      });
      return t;
    }
    function bar(parent, x, y, p, u, prog) {   // prog: {fill 0..1, u 0..1 (posição), show u}
      const g = S('g', {}, parent);
      S('rect', { x: x, y: y - 3, width: BARW, height: 3.4, fill: '#fff', stroke: '#000', 'stroke-width': 0.3 }, g);
      const fill = S('rect', { x: x, y: y - 3, width: 0, height: 3.4, fill: NAVY, 'fill-opacity': 0.35 }, g);
      const pl = S('line', { x1: x, y1: y - 4, x2: x, y2: y + 1, stroke: NAVY, 'stroke-width': 0.6 }, g);
      const pt = rich(g, x, y - 4.8, '$p$', 5.4); pt.setAttribute('fill', NAVY); pt.setAttribute('text-anchor', 'middle');
      [0, 1].forEach(function (v) { const tt = rich(g, x + v * BARW, y + 5.4, String(v), 4.6); tt.setAttribute('text-anchor', 'middle'); tt.setAttribute('fill', GRAY); });
      const um = S('g', {}, g);
      S('path', { d: 'M0 -1.2L-1.3 -3.4L1.3 -3.4Z', fill: RED }, um);
      S('line', { x1: 0, y1: -1.2, x2: 0, y2: 0.4, stroke: RED, 'stroke-width': 0.6 }, um);
      const ul = rich(um, 0, -4.2, '$u$', 5.4); ul.setAttribute('fill', RED); ul.setAttribute('text-anchor', 'middle');
      g.set = function (f, uu, uy) {
        fill.setAttribute('width', BARW * p * f);
        const xp = x + BARW * p * f; pl.setAttribute('x1', xp); pl.setAttribute('x2', xp); pt.setAttribute('x', xp);
        um.style.display = uu == null ? 'none' : '';
        if (uu != null) um.setAttribute('transform', 'translate(' + (x + BARW * uu) + ' ' + (y - 3 - (uy || 0)) + ')');
      };
      g.set(prog ? prog.fill : 1, prog ? prog.u : u, 0);
      return g;
    }
    // desenha o painel do estado; devolve as linhas (para animar)
    function panel(st) {
      gPanel.textContent = '';
      const spec = PANEL[st];
      if (!spec || C.px == null) return [];
      const lines = [];
      let y = C.py;
      spec.forEach(function (l) {
        if (l.bar != null) { y += 5; const b = bar(gPanel, C.px + 2, y, l.bar, l.u); b.spec = l; lines.push(b); y += LH + 1; return; }
        lines.push(rich(gPanel, C.px, y, l)); y += LH;
      });
      return lines;
    }

    function snap(st) { gFx.textContent = ''; setVisible(D.states[st] || []); panel(st); }

    // ---------- animação ----------
    function pop(h, ids, c, dur) {
      ids.forEach(function (i) { show(i, true); reset(i); });
      return h.tween(dur || 320, function (e, t) {
        const s = Math.max(0.001, E.back(t));
        ids.forEach(function (i) {
          els[i].setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ') scale(' + s + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')');
          els[i].style.opacity = Math.min(1, t * 3);
        });
      }, E.linear).then(function () { ids.forEach(reset); });
    }
    function traceFrom(h, i, p0, p1, dur) {   // traça a linha i de p0 para p1 (cópia temporária)
      const it = items[i];
      const tmp = S('line', { x1: p0[0], y1: p0[1], x2: p0[0], y2: p0[1], stroke: it.s, 'stroke-width': it.w, 'stroke-linecap': 'butt' }, gFx);
      return h.tween(dur, function (e) { tmp.setAttribute('x2', lerp(p0[0], p1[0], e)); tmp.setAttribute('y2', lerp(p0[1], p1[1], e)); }, E.inOut)
        .then(function () { tmp.remove(); show(i, true); });
    }
    function fadeEls(h, list, a, b, dur) {
      list.forEach(function (x) { x.style.opacity = a; });
      return h.tween(dur, function (e) { list.forEach(function (x) { x.style.opacity = lerp(a, b, e); }); });
    }
    function pulse(h, b, color) {
      const r = S('rect', { x: b[0], y: b[1], width: b[2] - b[0], height: b[3] - b[1], rx: 4, fill: 'none', stroke: color, 'stroke-width': 1 }, gFx);
      const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
      return h.tween(750, function (e) {
        const s = 1 + 0.35 * e;
        r.setAttribute('transform', 'translate(' + cx + ' ' + cy + ') scale(' + s + ') translate(' + (-cx) + ' ' + (-cy) + ')');
        r.setAttribute('opacity', 1 - e);
      }, E.out).then(function () { r.remove(); });
    }

    async function animPanel(h, st) {
      const old = [].slice.call(gPanel.childNodes);
      if (old.length) await fadeEls(h, old, 1, 0, 250);
      const lines = panel(st);
      lines.forEach(function (l) { l.style.opacity = 0; });
      for (const l of lines) {
        if (l.spec && l.spec.bar != null) {
          const u = l.spec.u;
          l.style.opacity = 1; l.set(0, null);
          await h.tween(450, function (e) { l.set(e, null); }, E.out);
          // u "roda" pela barra e para no valor sorteado
          await h.tween(900, function (e) {
            const uu = e < 1 ? (0.5 + 0.5 * Math.sin(e * 9 + 1)) * (1 - e) + u * e : u;
            l.set(1, Math.max(0, Math.min(1, uu)), 2.5 * (1 - e));
          }, E.out);
          continue;
        }
        await h.tween(220, function (e) { l.style.opacity = e; l.setAttribute('transform', 'translate(0 ' + (1.5 * (1 - e)) + ')'); }, E.out);
        l.removeAttribute('transform');
      }
    }

    async function play(a, b, h) {
      const on0 = a === 'vazio' ? [] : (D.states[a] || []), on1 = D.states[b] || [];
      const entering = on1.filter(function (i) { return on0.indexOf(i) < 0; });
      const leaving = on0.filter(function (i) { return on1.indexOf(i) < 0; });
      setVisible(on0);
      if (a === 'vazio') panel(null);
      // trocas de cor (mesma geometria)
      const swaps = [];
      entering.forEach(function (i) {
        const j = leaving.filter(function (k) { return items[k].t === items[i].t && sameBox(items[k].b, items[i].b); })[0];
        if (j != null) swaps.push([j, i]);
      });
      const swapIn = swaps.map(function (s) { return s[1]; }), swapOut = swaps.map(function (s) { return s[0]; });
      let todo = entering.filter(function (i) { return swapIn.indexOf(i) < 0; });
      const gone = leaving.filter(function (i) { return swapOut.indexOf(i) < 0; });
      todo.forEach(function (i) { show(i, false); });
      if (gone.length) await fadeEls(h, gone.map(function (i) { return els[i]; }), 1, 0, 300).then(function () { gone.forEach(function (i) { show(i, false); reset(i); }); });

      // painel: some o anterior agora; o novo entra depois dos nós (precisa do f do vizinho)
      const oldP = [].slice.call(gPanel.childNodes);
      const fadeOld = oldP.length ? fadeEls(h, oldP, 1, 0, 250) : Promise.resolve();

      // nós novos, cada um pela sua aresta
      // ordem: cada nó novo entra quando o nó do outro lado da sua aresta já está na tela
      // (sem nenhum nó na tela, começa por C.first ou pelo primeiro)
      let pending = todo.filter(function (i) { return isBox(items[i]); });
      const visBoxes = on0.filter(function (i) { return isBox(items[i]); });
      const edgeOf = function (bb) {
        return todo.filter(function (i) {
          if (!isLine(items[i])) return false;
          const pe = ends(items[i]), k = onBorder(bb, pe[0]) ? 0 : (onBorder(bb, pe[1]) ? 1 : -1);
          return k >= 0 && visBoxes.some(function (v) { return onBorder(items[v].b, pe[1 - k]); });
        })[0];
      };
      while (pending.length) {
        let bi = pending.filter(function (i) { return edgeOf(items[i].b) != null; })[0];
        if (bi == null) bi = pending.indexOf(C.first) >= 0 ? C.first : pending[0];
        pending = pending.filter(function (i) { return i !== bi; });
        const bb = items[bi].b;
        const texts = todo.filter(function (i) { return inBox(bb, items[i]); })
          .sort(function (p, q) { return items[p].y - items[q].y || items[p].x - items[q].x; });
        const edge = edgeOf(bb);
        let tip = [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2];
        if (edge != null) {
          const pe = ends(items[edge]);
          const near = onBorder(bb, pe[0]) ? 0 : 1;
          const p1 = pe[near], p0 = pe[1 - near];
          await traceFrom(h, edge, p0, p1, 380);
          tip = p1;
          const head = todo.filter(function (i) { return isHead(items[i]) && Math.hypot((items[i].b[0] + items[i].b[2]) / 2 - p1[0], (items[i].b[1] + items[i].b[3]) / 2 - p1[1]) < 3; })[0];
          if (head != null) { await pop(h, [head], p1, 200); todo = todo.filter(function (i) { return i !== head; }); }
          todo = todo.filter(function (i) { return i !== edge; });
        }
        await pop(h, [bi], tip, 380);
        for (const ti of texts) {
          show(ti, true); els[ti].style.opacity = 0;
          await h.tween(110, function (e) { els[ti].style.opacity = e; });
          reset(ti);
        }
        todo = todo.filter(function (i) { return i !== bi && texts.indexOf(i) < 0; });
        visBoxes.push(bi);
      }
      await fadeOld;
      gPanel.textContent = '';
      const panelRun = animPanel(h, b);
      // trocas de cor + pulso no nó que muda
      if (swaps.length) {
        const pul = swaps.filter(function (s) { return isBox(items[s[1]]); }).map(function (s) { return items[s[1]].b; });
        swaps.forEach(function (s) { show(s[1], true); els[s[1]].style.opacity = 0; });
        await h.all([h.tween(500, function (e) {
          swaps.forEach(function (s) { els[s[1]].style.opacity = e; els[s[0]].style.opacity = 1 - e; });
        })].concat(pul.map(function (bx) { return h.wait(150).then(function () { return pulse(h, bx, DRED); }); })));
        swaps.forEach(function (s) { reset(s[1]); reset(s[0]); show(s[0], false); });
      }
      // o resto: pontas de seta, reticências, retângulos, cota e fórmula
      const heads = todo.filter(function (i) { return isHead(items[i]); });
      for (const i of heads) await pop(h, [i], [(items[i].b[0] + items[i].b[2]) / 2, (items[i].b[1] + items[i].b[3]) / 2], 220);
      const dots = todo.filter(function (i) { return isDot(items[i]); });
      for (const i of dots) await pop(h, [i], [(items[i].b[0] + items[i].b[2]) / 2, (items[i].b[1] + items[i].b[3]) / 2], 140);
      const rest = todo.filter(function (i) { return heads.indexOf(i) < 0 && dots.indexOf(i) < 0; });
      const shapes = rest.filter(function (i) { return items[i].t === 'p'; }), txt = rest.filter(function (i) { return items[i].t === 'x'; });
      for (const i of shapes) {
        const el = els[i]; show(i, true);
        if (items[i].da) { await fadeEls(h, [el], 0, 1, 400); reset(i); continue; }
        const L = el.getTotalLength();
        el.style.strokeDasharray = L + ' ' + (L + 1); el.style.strokeDashoffset = L;
        await h.tween(450, function (e) { el.style.strokeDashoffset = L * (1 - e); }, E.inOut);
        el.style.strokeDasharray = ''; el.style.strokeDashoffset = '';
      }
      txt.sort(function (p, q) { return items[p].x - items[q].x; });
      for (const i of txt) {
        show(i, true); els[i].style.opacity = 0;
        await h.tween(90, function (e) { els[i].style.opacity = e; });
        reset(i);
      }
      await panelRun;
    }

    return { snap: snap, play: play };
  });
})();
