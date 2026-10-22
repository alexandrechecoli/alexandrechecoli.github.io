/* Figuras em camadas: anima a passagem de uma figura do PDF para a seguinte.
 *
 * Os dados vêm de ferramentas/figura_camadas.py (js/anim/dados/<cena>.js): cada figura da sequência
 * é a lista dos desenhos e textos presentes; o que é igual entre figuras é o mesmo item.
 *
 * Uso: <span class="anim" data-anim="fig" data-fig="CENA" data-from="figAnterior" data-state="fig1,fig2">
 *      Estados: os nomes das figuras (ex.: casa_carta3), "vazio" e os extras definidos em SCENES.
 *
 * Ao avançar, o que sai some em fade; o que entra aparece em grupos (desenhos que se sobrepõem):
 *   - traço aberto grande (seta, linha do grafo): é desenhado, e o resto do grupo (ponta da seta,
 *     nós) surge quando o traço passa por ele;
 *   - formas cheias: surgem com leve exagero (nas cenas com "rise", as casas sobem do chão);
 *   - item que troca de cor no mesmo lugar (janela do prédio): troca suave e pulso;
 *   - textos: surgem palavra por palavra (ou como carimbo, onde indicado).
 * Efeitos por cena: ficha percorrendo as setas ("travel"), queda no vão, anel de referência, carimbo.
 */
(function () {
  'use strict';
  const A = window.Anim;
  const MYBLUE = '#0061a5', RED = '#d0281a';

  // ---------- configuração das cenas ----------
  const SCENES = {
    casas: { scale: 2.0, rise: true, aria: 'Rua com casas vizinhas' },
    predio: { scale: 1.8, aria: 'Prédio com apartamentos vizinhos',
      ref: { states: ['predio3', 'predio4', 'predio5'], box: [16.2, 24.2, 20.2, 28.2] } },   // apartamento do slide anterior
    carta: { scale: 2.0, rise: true, aria: 'O jogo da carta e do vizinho',
      travel: { casa_carta5: { arcs: 'small' } } },
    carta2: { scale: 2.0, rise: true, aria: 'O jogo da carta e do vizinho com um vão entre as casas',
      extra: { esq: { base: 'casa_carta6', keep: function (it) { return it.b[2] < 60; } } },   // só as 3 casas da esquerda e "Você"
      travel: { casa_carta7: { arcs: 'small', fall: true }, casa_carta8: { arcs: 'small' } },
      shake: { casa_carta7: '#ff0000' } },
    mundo: { scale: 1.1, order: 'x', aria: 'O jogo da carta e do vizinho no planeta', stamp: ['mundo4'] }
  };

  const BIG = 0.4;         // traço "grande": ocupa ao menos 40% do grupo
  const area = function (b) { return Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]); };
  // a, b: caixas; touch: se podem se juntar só por encostar na vertical
  function overlaps(a, b, touch) {
    const ix = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), iy = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
    const wa = a[2] - a[0], wb = b[2] - b[0], ha = a[3] - a[1], hb = b[3] - b[1];
    // na horizontal, exige sobreposição real (casas vizinhas só se tocam na parede e ficam separadas);
    // na vertical, formas cheias que se encostam (telhado sobre a casa, beiral) formam um grupo
    if (ix < Math.min(1, 0.3 * Math.min(wa, wb)) - 0.01) return false;
    return touch ? iy >= -0.01 : iy >= Math.min(1, 0.3 * Math.min(ha, hb)) - 0.01;
  }
  const union = function (bs) {
    return bs.reduce(function (u, b) { return [Math.min(u[0], b[0]), Math.min(u[1], b[1]), Math.max(u[2], b[2]), Math.max(u[3], b[3])]; },
      [Infinity, Infinity, -Infinity, -Infinity]);
  };
  const sameBox = function (a, b) { return a.every(function (v, i) { return Math.abs(v - b[i]) < 0.5; }); };

  // desenha os itens de uma figura em camadas dentro de root; devolve os elementos (mesma ordem)
  A.figBuild = function (root, items) {
    return items.map(function (it) {
      let e;
      if (it.t === 'x') {
        e = A.svg('text', { x: it.x, y: it.y, fill: it.c, 'font-family': it.ff + ', serif', 'font-size': it.fs }, root);
        if (it.st) e.setAttribute('font-style', it.st);
        if (it.fw) e.setAttribute('font-weight', it.fw);
        e.textContent = it.tx;
      } else {
        e = A.svg('path', { d: it.d, fill: it.f || 'none' }, root);
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

  A.define('fig', function (host) {
    const name = host.dataset.fig, D = (A.figData || {})[name], C = SCENES[name] || {};
    if (!D) { console.warn('figura em camadas sem dados:', name); return { snap: function () {}, play: null }; }
    const SC = C.scale || 1, items = D.items;
    const root = A.svg('svg', { viewBox: '0 0 ' + D.W + ' ' + D.H, role: 'img', 'aria-label': C.aria || name });
    root.style.width = (D.W * SC) + 'pt'; root.style.height = (D.H * SC) + 'pt';
    host.appendChild(root);

    // estados: figuras + vazio + extras
    const STATES = { vazio: [] };
    Object.keys(D.states).forEach(function (k) { STATES[k] = D.states[k]; });
    Object.keys(C.extra || {}).forEach(function (k) {
      const E = C.extra[k];
      STATES[k] = STATES[E.base].filter(function (i) { return E.keep(items[i]); });
    });

    // ----- elementos -----
    const els = A.figBuild(root, items);
    const gX = A.svg('g', {}, root);   // ficha, anel de referência
    // traço aberto: sem preenchimento (ou com preenchimento de área nula, como as setas do Ipe)
    const isOpen = function (i) { const it = items[i]; return it.t === 'p' && it.s && !it.da && (!it.f || area(it.b) < 0.01); };
    const isText = function (i) { return items[i].t === 'x'; };

    const show = function (i, on) { els[i].style.display = on ? '' : 'none'; };
    function reset(i) {
      const e = els[i];
      e.style.opacity = ''; e.removeAttribute('transform');
      e.style.strokeDasharray = ''; e.style.strokeDashoffset = '';
    }
    function clearX() { while (gX.firstChild) gX.removeChild(gX.firstChild); }

    function snap(st) {
      const on = {}; (STATES[st] || []).forEach(function (i) { on[i] = true; });
      items.forEach(function (_, i) { reset(i); show(i, !!on[i]); });
      clearX();
    }

    // ----- grupos do que entra -----
    function clusters(ids) {
      const parent = ids.map(function (_, k) { return k; });
      const find = function (k) { while (parent[k] !== k) k = parent[k] = parent[parent[k]]; return k; };
      for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
        if (isText(ids[a]) || isText(ids[b])) continue;     // textos: palavra por palavra
        // encostar basta para formas cheias e linhas de área nula; arcos e setas precisam se sobrepor
        const solid = function (i) { return !isOpen(i) || area(items[i].b) < 0.01; };
        if (overlaps(items[ids[a]].b, items[ids[b]].b, solid(ids[a]) && solid(ids[b]))) parent[find(a)] = find(b);
      }
      const g = {};
      ids.forEach(function (id, k) { (g[find(k)] = g[find(k)] || []).push(id); });
      return Object.keys(g).map(function (k) {
        const m = g[k], box = union(m.map(function (i) { return items[i].b; }));
        let strokes = m.filter(function (i) {
          if (!isOpen(i)) return false;
          const b = items[i].b;
          return Math.max(b[2] - b[0], b[3] - b[1]) >= BIG * Math.max(box[2] - box[0], box[3] - box[1]);
        });
        // grupo dominado por formas cheias (casa, envelope) não é "traçado", mesmo tendo linhas
        const maxFill = Math.max.apply(null, [0].concat(m.filter(function (i) { return !isOpen(i) && !isText(i); }).map(function (i) { return area(items[i].b); })));
        if (maxFill > 0.4 * area(box)) strokes = [];
        let rank = 2;
        if (m.every(isText)) rank = C.order === 'x' ? 2 : 3;
        else if (strokes.length) rank = 1;
        else if (C.rise && box[3] >= D.H * 0.6 && area(box) > 40) rank = 0;   // casas: primeiro, subindo do chão
        return { ids: m, box: box, strokes: strokes, rank: rank, text: m.every(isText) };
      }).sort(function (a, b) {
        if (C.order === 'x') return a.rank - b.rank || a.box[0] - b.box[0];
        return a.rank - b.rank || Math.round(a.box[1] / 8) - Math.round(b.box[1] / 8) || a.box[0] - b.box[0];
      });
    }

    function popIn(h, ids, box, dur, rise) {
      const cx = (box[0] + box[2]) / 2, cy = rise ? box[3] : (box[1] + box[3]) / 2;
      ids.forEach(function (i) { reset(i); show(i, true); els[i].style.opacity = 0; });
      return h.tween(dur, function (e, t) {
        const s = Math.max(0.001, e);
        const tr = rise ? 'translate(' + cx + ' ' + cy + ') scale(1 ' + s + ') translate(' + (-cx) + ' ' + (-cy) + ')'
          : 'translate(' + cx + ' ' + cy + ') scale(' + s + ') translate(' + (-cx) + ' ' + (-cy) + ')';
        ids.forEach(function (i) { els[i].setAttribute('transform', tr); els[i].style.opacity = Math.min(1, t * 2.5); });
      }, A.ease.back).then(function () { ids.forEach(reset); });
    }
    function textIn(h, i) {
      reset(i); show(i, true); els[i].style.opacity = 0;
      return h.tween(380, function (e) {
        els[i].style.opacity = e; els[i].setAttribute('transform', 'translate(0 ' + (1.2 * (1 - e)) + ')');
      }, A.ease.out).then(function () { reset(i); });
    }
    // parâmetro (0–1) do ponto do traço mais próximo de (x, y)
    function nearestT(path, L, x, y) {
      let best = 0, bd = Infinity;
      for (let k = 0; k <= 40; k++) {
        const p = path.getPointAtLength(L * k / 40), d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
        if (d < bd) { bd = d; best = k / 40; }
      }
      return best;
    }
    async function traceIn(h, c) {
      const main = c.strokes.slice().sort(function (a, b) { return els[b].getTotalLength() - els[a].getTotalLength(); })[0];
      const pm = els[main], L = pm.getTotalLength(), dur = Math.min(1400, 280 + L * 11);
      const plan = [];
      c.ids.forEach(function (i) {
        reset(i); show(i, true);
        const b = items[i].b;
        if (i === main) { pm.style.strokeDasharray = L; pm.style.strokeDashoffset = L; return; }
        if (isOpen(i) && c.strokes.indexOf(i) >= 0) {   // outro traço grande: começa quando o principal chega ao seu início
          const l = els[i].getTotalLength(), p0 = els[i].getPointAtLength(0);
          els[i].style.strokeDasharray = l; els[i].style.strokeDashoffset = l;
          plan.push({ i: i, kind: 'trace', t: nearestT(pm, L, p0.x, p0.y), l: l });
        } else {
          els[i].style.opacity = 0;
          plan.push({ i: i, kind: 'pop', t: nearestT(pm, L, (b[0] + b[2]) / 2, (b[1] + b[3]) / 2), box: b });
        }
      });
      const started = {};
      await h.tween(dur, function (e) {
        pm.style.strokeDashoffset = L * (1 - e);
        plan.forEach(function (p) {
          if (started[p.i] || e < p.t - 0.02) return;
          started[p.i] = true;
          if (p.kind === 'trace') h.tween(Math.max(250, p.l * 11), function (f) { els[p.i].style.strokeDashoffset = p.l * (1 - f); }, A.ease.linear).catch(function () {});
          else popIn(h, [p.i], p.box, 260, false).catch(function () {});
        });
      }, A.ease.inOut);
      pm.style.strokeDasharray = ''; pm.style.strokeDashoffset = '';
      await h.wait(160);
    }
    function stampIn(h, ids) {
      const box = union(ids.map(function (i) { return items[i].b; })), cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2;
      ids.forEach(function (i) { reset(i); show(i, true); els[i].style.opacity = 0; });
      return h.tween(520, function (e, t) {
        const s = 2.4 - 1.4 * e, r = -9 * (1 - e);
        const tr = 'translate(' + cx + ' ' + cy + ') rotate(' + r + ') scale(' + s + ') translate(' + (-cx) + ' ' + (-cy) + ')';
        ids.forEach(function (i) { els[i].setAttribute('transform', tr); els[i].style.opacity = Math.min(1, t * 3); });
      }, A.ease.out).then(function () {
        return h.tween(360, function (e, t) {
          const dx = 1.2 * Math.sin(t * 5 * Math.PI) * (1 - t);
          ids.forEach(function (i) { els[i].setAttribute('transform', 'translate(' + dx + ' 0)'); });
        }, A.ease.linear);
      }).then(function () { ids.forEach(reset); });
    }

    // ficha percorrendo as setas pequenas (da esquerda para a direita)
    async function travel(h, st, T) {
      const arcs = STATES[st].filter(function (i) {
        const it = items[i];
        return isOpen(i) && it.b[3] < D.H * 0.4 && (it.b[2] - it.b[0]) < D.W * 0.45 && (it.b[2] - it.b[0]) > 8;
      }).sort(function (a, b) { return items[a].b[0] - items[b].b[0]; });
      if (!arcs.length) return;
      const tok = A.svg('circle', { r: 1.6, fill: MYBLUE, opacity: 0 }, gX);
      const p0 = els[arcs[0]].getPointAtLength(0);
      tok.setAttribute('cx', p0.x); tok.setAttribute('cy', p0.y);
      await h.wait(250);
      await h.tween(200, function (e) { tok.setAttribute('opacity', e); });
      for (const a of arcs) {
        const p = els[a], L = p.getTotalLength();
        await h.tween(560, function (e) { const q = p.getPointAtLength(L * e); tok.setAttribute('cx', q.x); tok.setAttribute('cy', q.y); }, A.ease.inOut);
        await h.wait(110);
      }
      if (T.fall) {   // caiu no vão: não há vizinho ali
        const x = +tok.getAttribute('cx'), y = +tok.getAttribute('cy'), yEnd = D.H * 0.8;
        tok.setAttribute('fill', RED);
        await h.tween(650, function (e) { tok.setAttribute('cy', A.lerp(y, yEnd, e * e)); tok.setAttribute('cx', x + 2 * e); }, A.ease.linear);
        await h.tween(300, function (e) { tok.setAttribute('opacity', 1 - e); });
      } else {
        await h.tween(260, function (e) { tok.setAttribute('r', 1.6 + 1.6 * Math.sin(Math.PI * e)); });
        await h.tween(300, function (e) { tok.setAttribute('opacity', 1 - e); });
      }
      tok.remove();
    }
    function refRing(h, box) {
      const r = A.svg('rect', { x: box[0] - 1.4, y: box[1] - 1.4, width: box[2] - box[0] + 2.8, height: box[3] - box[1] + 2.8,
        rx: 1, fill: 'none', stroke: MYBLUE, 'stroke-width': 0.7, opacity: 0 }, gX);
      return h.tween(1300, function (e, t) { r.setAttribute('opacity', Math.abs(Math.sin(t * 2 * Math.PI)) * (t < 0.75 ? 1 : (1 - t) * 4)); }, A.ease.linear)
        .then(function () { r.remove(); });
    }

    async function play(from, to, h) {
      const A0 = {}, B = {};
      (STATES[from] || []).forEach(function (i) { A0[i] = true; });
      (STATES[to] || []).forEach(function (i) { B[i] = true; });
      const gone = Object.keys(A0).map(Number).filter(function (i) { return !B[i]; });
      let added = Object.keys(B).map(Number).filter(function (i) { return !A0[i]; });
      // pares: mesmo lugar, cor diferente (troca suave)
      const pairs = [];
      added = added.filter(function (i) {
        const j = gone.find(function (g) { return items[g].t === items[i].t && sameBox(items[g].b, items[i].b); });
        if (j == null) return true;
        pairs.push([j, i]); return false;
      });
      const paired = {}; pairs.forEach(function (p) { paired[p[0]] = true; });

      // 1) o que sai
      const outs = gone.filter(function (i) { return !paired[i]; });
      if (outs.length) {
        await h.tween(380, function (e) { outs.forEach(function (i) { els[i].style.opacity = 1 - e; }); });
        outs.forEach(function (i) { show(i, false); reset(i); });
        await h.wait(120);
      }
      // 2) anel no elemento de referência (ex.: o apartamento perguntado)
      if (C.ref && C.ref.states.indexOf(to) >= 0) await refRing(h, C.ref.box);
      // 3) trocas de cor no mesmo lugar, com pulso
      if (pairs.length) {
        pairs.forEach(function (p) { reset(p[1]); show(p[1], true); els[p[1]].style.opacity = 0; });
        await h.tween(420, function (e) { pairs.forEach(function (p) { els[p[1]].style.opacity = e; }); });
        pairs.forEach(function (p) { show(p[0], false); reset(p[0]); });
      }
      // 4) o que entra, em grupos
      const stampIds = (C.stamp && C.stamp.indexOf(to) >= 0) ? added.filter(isText) : [];
      const rest = added.filter(function (i) { return stampIds.indexOf(i) < 0; });
      const pulse = pairs.map(function (p) { return p[1]; }).filter(function (i) { return items[i].f !== '#ffffff'; });
      for (const c of clusters(rest)) {
        if (c.text) { for (const i of c.ids) { await textIn(h, i); } continue; }
        if (c.strokes.length) { await traceIn(h, c); continue; }
        if (c.ids.length === 1 && items[c.ids[0]].f && area(c.box) < 30) pulse.push(c.ids[0]);
        await popIn(h, c.ids, c.box, c.rank === 0 ? 420 : 360, c.rank === 0);
        await h.wait(c.rank === 0 ? 40 : 90);
      }
      if (stampIds.length) { await h.wait(150); await stampIn(h, stampIds); }
      // 5) pulso nos elementos pequenos que mudaram (janelas destacadas)
      if (pulse.length && C.ref) {
        await h.tween(520, function (e, t) {
          const s = 1 + 0.35 * Math.sin(Math.PI * t);
          pulse.forEach(function (i) {
            const b = items[i].b, cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
            els[i].setAttribute('transform', 'translate(' + cx + ' ' + cy + ') scale(' + s + ') translate(' + (-cx) + ' ' + (-cy) + ')');
          });
        }, A.ease.linear);
        pulse.forEach(reset);
      }
      // 6) linha vermelha que balança (não há caminho)
      if (C.shake && C.shake[to]) {
        const reds = added.filter(function (i) { return items[i].s === C.shake[to]; });
        if (reds.length) await h.tween(600, function (e, t) {
          const dx = 1.1 * Math.sin(t * 6 * Math.PI) * (1 - t);
          reds.forEach(function (i) { els[i].setAttribute('transform', 'translate(' + dx + ' 0)'); });
        }, A.ease.linear);
        reds.forEach(reset);
      }
      // 7) a ficha percorre as setas
      if (C.travel && C.travel[to]) await travel(h, to, C.travel[to]);
    }

    return { snap: snap, play: play };
  });
})();
