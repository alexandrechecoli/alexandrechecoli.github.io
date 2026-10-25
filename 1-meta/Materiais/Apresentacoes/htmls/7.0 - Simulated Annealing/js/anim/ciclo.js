/* Ciclo gerar candidatos → selecionar solução (img/principios_S, slides 6–9 e 40–43).
 *
 * A figura é desenhada a partir de js/anim/dados/principios.js (ferramentas/figura_camadas.py) com
 * A.figBuild (fig.js). O estado final é sempre a figura original; o que muda é a animação de entrada:
 *   e0 → ciclo   a figura se monta e o ciclo roda uma vez (geração e seleção)
 *   f → gera     geração: soluções saem de s pela seta "gerar" e viram os candidatos
 *   f → sel      reposição: um candidato é escolhido e volta pela seta "selecionar" até s
 *   f → mem      memória: o histórico de s é guardado e consultado na geração e na seleção
 *   f → local    transformações locais: uma cópia de s entra no conjunto e cada candidato nasce dela
 *   f → viz      idem, e o conjunto de candidatos se destaca como "soluções vizinhas de s"
 * Uso: <span class="anim" data-anim="ciclo" data-scale="1" data-from="f" data-state="gera">
 */
(function () {
  'use strict';
  const A = window.Anim;
  const BLACK = '#000000', MYBLUE = '#0061a5', GRAY = '#d3d3d3', LIGHT = '#c4d9ea';

  // índices dos itens (ordem de js/anim/dados/principios.js)
  const BOX = 0, CIRCLE = 1, S = 8, GEN = [9, 10], SEL = [11, 12, 13, 14];
  const T_TITLE = [23, 24], T_MEM = 25, T_GEN = [26, 27], T_SEL = [28, 29];
  const CANDS = [[2, 15, 105, 46.17], [21, 22, 129, 38.17], [4, 16, 165, 50.17], [6, 17, 141, 62.17],
    [3, 18, 117, 78.17], [5, 20, 177, 78.17], [7, 19, 153, 102.17]];        // [anel, miolo, x, y]
  const SP = [17, 58.17];                       // centro de s
  const GEN_A = [21, 46.17], GEN_B = [85, 10.17], SEL_A = [85, 106.17], SEL_B = [21, 70.17];
  const CHOSEN = 3;                             // candidato escolhido na reposição
  const GHOST = [125, 58.17];                   // cópia de s dentro do conjunto (lugar vazio)

  A.define('ciclo', function (host) {
    const D = A.figData.principios, SC = +(host.dataset.scale || 1);
    const root = A.svg('svg', { viewBox: '0 0 ' + D.W + ' ' + D.H, role: 'img',
      'aria-label': 'Ciclo de uma heurística de solução única: gerar candidatos e selecionar a nova solução' });
    root.style.width = (D.W * SC) + 'pt'; root.style.height = (D.H * SC) + 'pt';
    host.appendChild(root);
    const els = A.figBuild(root, D.items);
    const gX = A.svg('g', {}, root);
    const ALL = D.items.map(function (_, i) { return i; });
    const orig = D.items.map(function (it) { return { f: it.f, s: it.s, c: it.c }; });

    function reset(i) {
      const e = els[i];
      e.style.opacity = ''; e.style.display = ''; e.removeAttribute('transform');
      e.style.strokeDasharray = ''; e.style.strokeDashoffset = '';
      if (orig[i].f) e.setAttribute('fill', orig[i].f);
      if (orig[i].s) e.setAttribute('stroke', orig[i].s);
      if (orig[i].c) e.setAttribute('fill', orig[i].c);
    }
    function snap(st) {
      ALL.forEach(reset);
      while (gX.firstChild) gX.removeChild(gX.firstChild);
      if (st === 'e0') ALL.forEach(function (i) { els[i].style.display = 'none'; });
    }

    // ----- utilidades -----
    const scaleAt = function (c, s) { return 'translate(' + c[0] + ' ' + c[1] + ') scale(' + Math.max(0.001, s) + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')'; };
    const center = function (i) { const b = D.items[i].b; return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; };
    function tint(ids, k) {   // preto → azul (texto, traço e preenchimento pretos)
      ids.forEach(function (i) {
        const c = A.mix(BLACK, MYBLUE, k), o = orig[i];
        if (o.c === BLACK) els[i].setAttribute('fill', c);
        if (o.s === BLACK) els[i].setAttribute('stroke', c);
        if (o.f === BLACK) els[i].setAttribute('fill', c);
      });
    }
    const tintTo = function (h, ids, a, b, ms) { return h.tween(ms || 300, function (e) { tint(ids, A.lerp(a, b, e)); }); };
    function pop(h, ids, c, ms) {
      ids.forEach(function (i) { els[i].style.display = ''; els[i].style.opacity = 0; });
      return h.tween(ms || 320, function (e, t) {
        ids.forEach(function (i) { els[i].setAttribute('transform', scaleAt(c, e)); els[i].style.opacity = Math.min(1, t * 2.5); });
      }, A.ease.back).then(function () { ids.forEach(function (i) { els[i].removeAttribute('transform'); els[i].style.opacity = ''; }); });
    }
    function fadeIn(h, ids, ms) {
      ids.forEach(function (i) { els[i].style.display = ''; els[i].style.opacity = 0; });
      return h.tween(ms || 350, function (e) { ids.forEach(function (i) { els[i].style.opacity = e; }); })
        .then(function () { ids.forEach(function (i) { els[i].style.opacity = ''; }); });
    }
    function trace(h, line, head, ms) {
      const p = els[line], L = p.getTotalLength();
      p.style.display = ''; p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
      head.forEach(function (i) { els[i].style.display = 'none'; });
      return h.tween(ms || 500, function (e) { p.style.strokeDashoffset = L * (1 - e); })
        .then(function () { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; return pop(h, head, center(head[0]), 220); });
    }
    function dot(r, color) { return A.svg('circle', { r: r || 2.2, fill: color || MYBLUE, opacity: 0 }, gX); }
    // move um ponto por uma sequência de pontos (velocidade constante)
    function travel(h, d, pts, ms) {
      let L = 0; const seg = [];
      for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
      d.setAttribute('opacity', 1);
      return h.tween(ms, function (e) {
        let s = L * e, k = 0;
        while (k < seg.length - 1 && s > seg[k]) { s -= seg[k]; k++; }
        const t = seg[k] ? Math.min(1, s / seg[k]) : 1, a = pts[k], b = pts[k + 1];
        d.setAttribute('cx', A.lerp(a[0], b[0], t)); d.setAttribute('cy', A.lerp(a[1], b[1], t));
      }, A.ease.inOut);
    }
    function pulseS(h) {
      return h.tween(600, function (e, t) {
        els[S].setAttribute('transform', scaleAt(SP, 1 + 0.6 * Math.sin(Math.PI * t)));
        tint([S], Math.sin(Math.PI * t));
      }, A.ease.linear).then(function () { reset(S); });
    }

    // ----- etapas -----
    async function generate(h, opts) {
      opts = opts || {};
      await tintTo(h, GEN.concat(T_GEN), 0, 1);
      // os candidatos somem e são gerados de novo, um a um, a partir de s
      const cs = CANDS.map(function (c) { return [c[0], c[1]]; }).reduce(function (a, b) { return a.concat(b); }, []);
      await h.tween(250, function (e) { cs.forEach(function (i) { els[i].style.opacity = 1 - e; }); });
      cs.forEach(function (i) { els[i].style.display = 'none'; els[i].style.opacity = ''; });
      const jobs = CANDS.map(function (c, k) {
        return h.wait(k * 230).then(function () {
          const d = dot(1.8);
          const start = opts.from || SP, path = opts.from ? [opts.from, [c[2], c[3]]] : [SP, GEN_A, GEN_B, [c[2], c[3]]];
          d.setAttribute('cx', start[0]); d.setAttribute('cy', start[1]);
          return travel(h, d, path, opts.from ? 420 : 900).then(function () {
            d.remove();
            return pop(h, [c[0], c[1]], [c[2], c[3]], 300);
          });
        });
      });
      await h.all(jobs);
      await h.wait(200);
      await tintTo(h, GEN.concat(T_GEN), 1, 0, 400);
    }
    async function select(h) {
      await tintTo(h, SEL.concat(T_SEL), 0, 1);
      const c = CANDS[CHOSEN], others = CANDS.filter(function (_, k) { return k !== CHOSEN; });
      // destaca o escolhido e esmaece os outros
      await h.tween(400, function (e) {
        others.forEach(function (o) { els[o[0]].style.opacity = els[o[1]].style.opacity = 1 - 0.65 * e; });
        els[c[1]].setAttribute('fill', A.mix('#ffffff', MYBLUE, e));
        els[c[0]].setAttribute('transform', scaleAt([c[2], c[3]], 1 + 0.4 * e));
        els[c[1]].setAttribute('transform', scaleAt([c[2], c[3]], 1 + 0.4 * e));
      });
      await h.wait(250);
      const d = dot(2.2); d.setAttribute('cx', c[2]); d.setAttribute('cy', c[3]);
      await travel(h, d, [[c[2], c[3]], SEL_A, SEL_B, SP], 1100);
      d.remove();
      await pulseS(h);   // s' passa a ser a solução atual
      await h.tween(450, function (e) {
        others.forEach(function (o) { els[o[0]].style.opacity = els[o[1]].style.opacity = 0.35 + 0.65 * e; });
        els[c[1]].setAttribute('fill', A.mix(MYBLUE, '#ffffff', e));
        els[c[0]].setAttribute('transform', scaleAt([c[2], c[3]], 1.4 - 0.4 * e));
        els[c[1]].setAttribute('transform', scaleAt([c[2], c[3]], 1.4 - 0.4 * e));
      });
      CANDS.forEach(function (o) { reset(o[0]); reset(o[1]); });
      await tintTo(h, SEL.concat(T_SEL), 1, 0, 400);
    }
    async function memory(h) {
      await tintTo(h, [BOX, T_MEM], 0, 1);
      const boxL = [33, 58.17], boxR = [81, 58.17], boxC = [57, 58.17];
      const bump = function () {
        return h.tween(300, function (e, t) {
          const tr = scaleAt(boxC, 1 + 0.08 * Math.sin(Math.PI * t));
          els[BOX].setAttribute('transform', tr); els[T_MEM].setAttribute('transform', tr);
        }, A.ease.linear);
      };
      // guarda o histórico: três soluções passam de s para a memória
      for (let k = 0; k < 3; k++) {
        const d = dot(1.6); d.setAttribute('cx', SP[0]); d.setAttribute('cy', SP[1]);
        await travel(h, d, [SP, boxL, boxC], 480);
        d.remove(); await bump();
      }
      // consulta: a memória alimenta a geração e a seleção
      await tintTo(h, GEN.concat(SEL), 0, 1, 250);
      const g = dot(1.6), s = dot(1.6);
      g.setAttribute('cx', boxC[0]); g.setAttribute('cy', boxC[1]); s.setAttribute('cx', boxC[0]); s.setAttribute('cy', boxC[1]);
      await h.all([travel(h, g, [boxC, [57, 50.17], [53, 28.17], GEN_B, [105, 46.17]], 1000),
        travel(h, s, [boxC, [57, 66.17], [53, 88.17], SEL_B, SP], 1000)]);
      g.remove(); s.remove();
      await pulseS(h);
      await h.wait(150);
      await h.all([tintTo(h, GEN.concat(SEL), 1, 0, 400), tintTo(h, [BOX, T_MEM], 1, 0, 400)]);
      reset(BOX); reset(T_MEM);
    }
    async function local(h, viz) {
      // uma cópia de s entra no conjunto; cada candidato nasce de uma pequena transformação dela
      const ghost = A.svg('circle', { r: 3.4, fill: 'none', stroke: MYBLUE, 'stroke-width': 1.2, opacity: 0, cx: SP[0], cy: SP[1] }, gX);
      await tintTo(h, GEN, 0, 1, 250);
      ghost.setAttribute('opacity', 1);
      await travel(h, ghost, [SP, GEN_A, GEN_B, GHOST], 1000);
      await tintTo(h, GEN, 1, 0, 300);
      const spokes = [];
      for (const c of CANDS) {
        const ln = A.svg('line', { x1: GHOST[0], y1: GHOST[1], x2: GHOST[0], y2: GHOST[1], stroke: MYBLUE, 'stroke-width': 0.7, opacity: 0.8 }, gX);
        gX.insertBefore(ln, ghost);
        spokes.push(ln);
        await h.tween(260, function (e) { ln.setAttribute('x2', A.lerp(GHOST[0], c[2], e)); ln.setAttribute('y2', A.lerp(GHOST[1], c[3], e)); });
        await h.tween(220, function (e, t) {
          const tr = scaleAt([c[2], c[3]], 1 + 0.5 * Math.sin(Math.PI * t));
          els[c[0]].setAttribute('transform', tr); els[c[1]].setAttribute('transform', tr);
        }, A.ease.linear);
      }
      CANDS.forEach(function (o) { reset(o[0]); reset(o[1]); });
      if (viz) {   // o conjunto inteiro: soluções vizinhas de s
        await h.wait(200);
        await h.tween(600, function (e) { els[CIRCLE].setAttribute('fill', A.mix(GRAY, LIGHT, e)); tint(T_TITLE, e); });
        await h.wait(1100);
        await h.tween(600, function (e) { els[CIRCLE].setAttribute('fill', A.mix(LIGHT, GRAY, e)); tint(T_TITLE, 1 - e); });
        reset(CIRCLE); T_TITLE.forEach(reset);
      } else await h.wait(900);
      await h.tween(500, function (e) { spokes.forEach(function (l) { l.setAttribute('opacity', 0.8 * (1 - e)); }); ghost.setAttribute('opacity', 1 - e); });
      spokes.forEach(function (l) { l.remove(); }); ghost.remove();
    }
    async function build(h) {
      ALL.forEach(function (i) { els[i].style.display = 'none'; });
      await pop(h, [S], SP, 380);
      await h.all([trace(h, GEN[0], [GEN[1]], 520), h.wait(200).then(function () { return fadeIn(h, T_GEN); })]);
      await pop(h, [CIRCLE], [141, 58.17], 480);
      await fadeIn(h, T_TITLE, 300);
      for (const c of CANDS) { await pop(h, [c[0], c[1]], [c[2], c[3]], 220); }
      await h.all([trace(h, SEL[2], [SEL[3]], 520), h.wait(200).then(function () { return fadeIn(h, T_SEL); })]);
      await fadeIn(h, [SEL[0], SEL[1]], 1);
      await fadeIn(h, [BOX, T_MEM], 400);
      await h.wait(500);
    }

    async function play(from, to, h) {
      snap(from);
      if (to === 'ciclo') { if (from === 'e0') await build(h); await generate(h); await select(h); }
      else if (to === 'gera') await generate(h);
      else if (to === 'sel') await select(h);
      else if (to === 'mem') await memory(h);
      else if (to === 'local') await local(h, false);
      else if (to === 'viz') await local(h, true);
    }

    return { snap: snap, play: play };
  });
})();
