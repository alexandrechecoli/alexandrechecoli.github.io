/* A evolução segundo Darwin (aula 10, frames 36–49): o pássaro Antônio, o ciclo da seleção natural numa ilha,
 * o ciclo completo e a população final.
 *
 * Dados (ferramentas/figura_camadas.py): dados/antonio.js (Antonio.pdf), dados/gapass.js (ga_pass1–8, mesma
 * origem; 6 e 7 são mais largas: 8 pássaros), dados/gafinal.js (ga_pass10). Como no PMX, a <img> do PDF fica
 * invisível dentro do host (reserva o espaço) e o SVG por cima; o estado final de cada slide é a figura do PDF.
 *
 * antonio — estados a0 · a1 (frame 36) · a2 (frame 37, mesma figura)
 *   a0→a1  o chão e as pedras surgem (o hachurado do PDF é um padrão que o figura_camadas não lê: redesenhado,
 *          linhas cinza a 60°, recortadas pelo contorno das pedras); o Antônio chega; o alimento cai no vão; os
 *          rótulos entram. O Antônio se inclina duas vezes para bicar: o bico bate nas pedras e não alcança
 *   a1→a2  tenta de novo e aparece, por um momento, "não alcança o alimento: pouco apto"
 * gapass — estados g0 · g1 (38) · g1b (39) · g2 (40) · g3 (41) · g4 (42) · g4b (43) · g5 (44) · g6 (45) · g7 (46) · g8 (47)
 *   g0→g1   a caixa surge e os pássaros chegam voando, um a um, cada um à sua vaga
 *   g1→g1b  cada pássaro pulsa (cada um tem características próprias)
 *   g1b→g2  o fitness de cada um conta de 0% até o valor
 *   g2→g3   um anel salta entre os pássaros (competição) e para nos dois pais; as setas da seleção são traçadas
 *   g3→g4   cópias dos pais descem pelas setas e se juntam; a seta até o filho é traçada e o filho brota
 *   g4→g4b  "?": o filho balança (pode haver mutação)
 *   g4b→g5  a seta da mutação é traçada; a cópia do filho desliza e, com um clarão, vira o mutante
 *   g5→g6   as setas e o filho somem; a caixa alarga e o mutante sobe para a 8ª vaga; o fitness dele conta até 75%
 *   g6→g7   o anel salta entre os pássaros e para no menos apto (20%); o X é carimbado e ele treme
 *   g7→g8   o eliminado cai e some; o 8º desliza para a vaga dele e a caixa volta ao tamanho original
 * ciclo — estados c0 · c1 (48): camada sobre a figura original (a <img> fica visível): uma ficha percorre o
 *   ciclo 3 vezes (população → reprodução → mutação → seleção → volta), cada etapa acende quando a ficha passa,
 *   com um contador de gerações
 * final — estados f0 · f1 (49): a população de ga_pass8 evolui geração a geração até a população final (cada
 *   pássaro se transforma no da figura final e o fitness sobe), com o contador de gerações
 */
(function () {
  'use strict';
  const A = window.Anim;
  if (!A) return;
  const S = A.svg, E = A.ease, lerp = A.lerp;
  const HI = '#e0a000', RED = '#c0281a', MYBLUE = '#0061a5';
  const rng = function (a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };

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
  // pássaro (ou rota): o corpo é uma peça grande preenchida; as demais peças (olho, listras, pernas, bico, pontos, rota)
  // vão para o corpo mais próximo cuja caixa (folga de 3) as contém — o bico de um pássaro invade a vaga do vizinho
  const isBody = function (it) {
    if (it.t !== 'p' || !it.f || it.s || ['#8b0000', '#ffffff', '#000000'].indexOf(it.f) >= 0) return false;
    const w = it.b[2] - it.b[0], hh = it.b[3] - it.b[1];
    return w > 14 && w < 30 && hh > 14 && hh < 30;
  };
  function groupParts(items, ids) {
    const G = ids.filter(function (i) { return isBody(items[i]); }).map(function (i) { return { body: i, ids: [] }; });
    ids.forEach(function (i) {
      const it = items[i];
      if (it.t !== 'p') return;
      const c = mid(it.b);
      let best = null, bd = Infinity;
      G.forEach(function (g) {
        const q = items[g.body].b;
        if (it.b[0] < q[0] - 3 || it.b[1] < q[1] - 3 || it.b[2] > q[2] + 3 || it.b[3] > q[3] + 3) return;
        const m = mid(q), d = Math.hypot(c[0] - m[0], c[1] - m[1]);
        if (d < bd) { bd = d; best = g; }
      });
      if (best) best.ids.push(i);
    });
    G.forEach(function (g) { g.ids.sort(function (a, b) { return a - b; }); g.bb = bbox(items, g.ids); g.c = mid(g.bb); });
    return G.sort(function (a, b) { return a.c[1] - b.c[1] > 12 ? 1 : b.c[1] - a.c[1] > 12 ? -1 : a.c[0] - b.c[0]; });
  }
  const tf = function (dx, dy, s, c, rot) {
    let t = 'translate(' + dx.toFixed(3) + ' ' + dy.toFixed(3) + ')';
    if (c && ((s != null && s !== 1) || rot)) t += ' translate(' + c[0] + ' ' + c[1] + ')' + (rot ? ' rotate(' + rot.toFixed(2) + ')' : '') + (s != null && s !== 1 ? ' scale(' + Math.max(0.001, s) + ')' : '') + ' translate(' + (-c[0]) + ' ' + (-c[1]) + ')';
    return t;
  };
  function ring(h, parent, b, color, dur, keep) {
    const r = S('rect', { x: b[0] - 1.2, y: b[1] - 1.2, width: b[2] - b[0] + 2.4, height: b[3] - b[1] + 2.4, rx: 2, fill: 'none', stroke: color || HI, 'stroke-width': 0.9, opacity: 0 }, parent);
    return h.tween(dur || 600, function (e) { r.setAttribute('opacity', keep ? Math.min(1, e * 3) : Math.sin(Math.PI * e)); }, E.linear)
      .then(function () { if (!keep) r.remove(); return r; });
  }
  function stroke(h, el, dur) {                         // traça um caminho do início ao fim
    let L = 0;
    try { L = el.getTotalLength(); } catch (e) { L = 0; }
    if (!(L > 0)) { el.setAttribute('opacity', 1); return Promise.resolve(); }
    el.setAttribute('opacity', 1);
    el.style.strokeDasharray = L; el.style.strokeDashoffset = L;
    return h.tween(dur || 450, function (e) { el.style.strokeDashoffset = L * (1 - e); })
      .then(function () { el.style.strokeDasharray = ''; el.style.strokeDashoffset = ''; });
  }
  function pctText(el, v) { el.textContent = Math.round(v) + '%'; }

  // host: a figura do PDF fica invisível; o SVG com o viewBox da figura fica por cima
  function figSvg(host, W, H) { return S('svg', { viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true' }, host); }

  // =====================================================================================================
  // Antônio
  // =====================================================================================================
  A.define('antonio', function (host) {
    const D = A.figData.antonio, items = D.items;
    const svg = figSvg(host, 140.246, 83.576);
    // corpo (gira em torno do quadril) e pernas (só andam)
    const BODY = [0, 1, 2, 3, 4, 5, 6, 7, 15], LEGS = [8, 10, 9, 14], BIRD = BODY.concat(LEGS), HIP = [35, 66];
    const ORDER = rng(0, 26).filter(function (i) { return i !== 12; });
    let L = {};
    function build() {
      svg.textContent = ''; L = { el: {} };
      // pedras: hachurado redesenhado (linhas cinza a 60°, recortadas pelo contorno)
      const cid = 'pedras' + Math.random().toString(36).slice(2);
      S('path', { d: items[13].d + 'Z' }, S('clipPath', { id: cid }, svg));
      L.hatch = S('g', { 'clip-path': 'url(#' + cid + ')' }, svg);
      for (let x = 60; x < 130; x += 4.1) S('line', { x1: x, y1: 60, x2: x + 14.5, y2: 85, stroke: '#8a8a8a', 'stroke-width': 0.85 }, L.hatch);
      ORDER.forEach(function (i) { L.el[i] = item(svg, items[i]); });
      L.fx = S('g', {}, svg);
    }
    const els = function (ids) { return ids.map(function (i) { return L.el[i]; }); };
    // dx: passo à frente; rot: inclinação do corpo (com 5 e 45° o bico encosta nas bordas do vão)
    function pose(dx, rot) {
      els(BODY).forEach(function (e) { e.setAttribute('transform', tf(dx, 0, 1, HIP, rot)); });
      els(LEGS).forEach(function (e) { e.setAttribute('transform', tf(dx, 0)); });
    }
    async function peck(h) {                            // anda, inclina, bate nas pedras, volta
      await h.tween(300, function (e) { pose(5 * e, 0); });
      await h.tween(380, function (e) { pose(5, 45 * e * e); }, E.linear);
      await h.tween(380, function (e) { pose(5, 45 - 5 * Math.abs(Math.sin(e * Math.PI * 3)) * (1 - e)); }, E.linear);
      await h.wait(200);
      await h.tween(450, function (e) { pose(5 * (1 - e), 45 * (1 - e)); }, E.inOut);
      pose(0, 0);
    }
    function note(lines) {                              // aviso passageiro, por cima de tudo
      const g = S('g', { opacity: 0 }, L.fx);
      const box = S('rect', { x: 30, y: 26, width: 80, height: 15.5, rx: 2, fill: '#fff', stroke: '#b6321c', 'stroke-width': 0.6 }, g);
      lines.forEach(function (s, k) {
        const t = S('text', { x: 70, y: 32.4 + k * 6.2, 'text-anchor': 'middle', 'font-size': 5.2, 'font-family': 'KaTeX_Main, serif', fill: '#b6321c' }, g);
        t.textContent = s;
      });
      return g;
    }
    function snap() { build(); }
    async function play(a, b, h) {
      build();
      if (a === 'a0' && b === 'a1') {
        const all = ORDER.map(function (i) { return L.el[i]; }).concat([L.hatch]);
        all.forEach(function (e) { e.setAttribute('opacity', 0); });
        // chão, pedras (sobem do chão) e o hachurado
        L.el[16].setAttribute('opacity', 1);
        await stroke(h, L.el[16], 400);
        L.el[13].setAttribute('opacity', 1); L.hatch.setAttribute('opacity', 1);
        await h.tween(450, function (e) { [L.el[13], L.hatch].forEach(function (x) { x.setAttribute('transform', 'translate(0 83.18) scale(1 ' + Math.max(0.01, e) + ') translate(0 -83.18)'); }); }, E.out);
        [L.el[13], L.hatch].forEach(function (x) { x.removeAttribute('transform'); });
        // o Antônio chega pela esquerda
        await h.tween(700, function (e) { const t = E.out(e); els(BIRD).forEach(function (x) { x.setAttribute('opacity', Math.min(1, 2 * e)); x.setAttribute('transform', tf(-22 * (1 - t), -5 * Math.sin(Math.PI * t), 1)); }); });
        pose(0, 0);
        await h.all([21, 22, 25, 26].map(function (i) { return h.tween(300, function (e) { L.el[i].setAttribute('opacity', e); }); }));
        // o alimento cai no vão
        L.el[11].setAttribute('opacity', 1);
        await h.tween(600, function (e) { L.el[11].setAttribute('transform', 'translate(0 ' + (-40 * (1 - e * e)).toFixed(2) + ')'); }, E.linear);
        await h.tween(160, function (e) { L.el[11].setAttribute('transform', 'translate(0 ' + (-2 * Math.sin(Math.PI * e)).toFixed(2) + ')'); }, E.linear);
        L.el[11].removeAttribute('transform');
        await h.all([19, 20, 24, 17, 18, 23].map(function (i) { return h.tween(300, function (e) { L.el[i].setAttribute('opacity', e); }); }));
        await h.wait(250);
        await peck(h);
        await h.wait(150);
        await peck(h);
        return;
      }
      if (a === 'a1' && b === 'a2') {
        await peck(h);
        const n = note(['o bico não alcança o alimento:', 'Antônio é pouco apto nesta ilha']);
        await h.tween(300, function (e) { n.setAttribute('opacity', e); });
        await h.wait(1800);
        await h.tween(400, function (e) { n.setAttribute('opacity', 1 - e); });
        n.remove();
      }
    }
    return { snap: snap, play: play };
  });

  // =====================================================================================================
  // População na ilha (ga_pass1–8)
  // =====================================================================================================
  const FIG = { g0: null, g1: 'ga_pass1', g1b: 'ga_pass1', g2: 'ga_pass2', g3: 'ga_pass3', g4: 'ga_pass4', g4b: 'ga_pass4', g5: 'ga_pass5', g6: 'ga_pass6', g7: 'ga_pass7', g8: 'ga_pass8' };
  const SLOTS = [rng(25, 37), rng(2, 11), rng(12, 24), rng(38, 47), rng(48, 57), rng(58, 70), rng(71, 83)];
  const LAB = rng(151, 157), FITV = [45, 98, 45, 20, 85, 24, 45];
  const EIGHTH = rng(96, 105), LAB8 = 159, NEW3 = rng(84, 92), LABN3 = 158;
  const XMARK = [106, 107], EYE7 = [108, 109];
  const PARENTS = rng(115, 119), CHILD = rng(120, 129), CHILDA = [130, 131], MUTA = [132, 133], MUT = rng(134, 143);
  const TITLES = { ga_pass1: [149, 150], ga_pass2: [149, 150], ga_pass3: [146, 147, 148], ga_pass4: [145], ga_pass5: [144], ga_pass6: [113, 114], ga_pass7: [110, 111, 112], ga_pass8: [93, 94] };

  A.define('gapass', function (host) {
    const D = A.figData.gapass, items = D.items;
    const wide = host.dataset.wide === '1';
    const svg = figSvg(host, wide ? 172.8 : 152.8, 80.4);
    let L = {};
    const set = function (st) { return FIG[st] ? D.states[FIG[st]] : []; };
    function build(ids) {
      svg.textContent = ''; L = { el: {} };
      L.root = S('g', {}, svg);
      const s = ids.slice().sort(function (x, y) { return x - y; });
      s.forEach(function (i) { L.el[i] = item(L.root, items[i]); });
      L.fx = S('g', {}, L.root);
    }
    const els = function (ids) { return ids.map(function (i) { return L.el[i]; }).filter(Boolean); };
    const show = function (ids, v) { els(ids).forEach(function (e) { e.setAttribute('opacity', v); }); };
    const move = function (ids, dx, dy, s, c, rot) { els(ids).forEach(function (e) { e.setAttribute('transform', tf(dx, dy, s, c, rot)); }); };
    const clear = function (ids) { els(ids).forEach(function (e) { e.removeAttribute('transform'); }); };
    const fade = function (h, ids, a, b, dur) { return h.tween(dur || 350, function (e) { show(ids, lerp(a, b, e)); }); };
    async function popIds(h, ids, dur) {
      const c = mid(bbox(items, ids));
      show(ids, 1);
      await h.tween(dur || 380, function (e) { move(ids, 0, 0, lerp(0.2, 1, E.back(e)), c); }, E.linear);
      clear(ids);
    }
    async function titleSwap(h, from, to) {
      await fade(h, TITLES[from] || [], 1, 0, 250);
      for (const i of TITLES[to] || []) await fade(h, [i], 0, 1, 180);
    }
    async function hop(h, targets, stops) {             // o anel salta entre as vagas e para em cada alvo
      for (const t of targets) {
        let at = Math.floor(Math.random() * 7);
        for (let k = 0; k < stops; k++) { await ring(h, L.fx, bbox(items, SLOTS[at]), HI, 130); at = (at + 1 + Math.floor(Math.random() * 6)) % 7; }
        const r = await ring(h, L.fx, bbox(items, SLOTS[t]), HI, 300, true);
        const c = mid(bbox(items, SLOTS[t]));
        await h.tween(450, function (e) { move(SLOTS[t], 0, 0, 1 + 0.15 * Math.sin(Math.PI * e), c); }, E.linear);
        clear(SLOTS[t]);
        r.dataset.keep = '1';
      }
    }
    // cópia de um grupo (para voar sem tirar o original do lugar)
    function ghost(ids) { const g = S('g', {}, L.fx); ids.forEach(function (i) { item(g, items[i]); }); return g; }

    const PLAYS = {
      'g0>g1': async function (h) {
        show([0, 1], 0); show(TITLES.ga_pass1, 0); SLOTS.forEach(function (s) { show(s, 0); });
        await fade(h, [0, 1], 0, 1, 400);
        for (const i of TITLES.ga_pass1) await fade(h, [i], 0, 1, 200);
        for (let k = 0; k < 7; k++) {
          const ids = SLOTS[k];
          await h.tween(420, function (e) { const t = E.out(e); show(ids, Math.min(1, 3 * e)); move(ids, -45 * (1 - t), -12 * Math.sin(Math.PI * t)); });
          clear(ids);
        }
      },
      'g1>g1b': async function (h) {
        for (let k = 0; k < 7; k++) {
          const c = mid(bbox(items, SLOTS[k]));
          await h.all([ring(h, L.fx, bbox(items, SLOTS[k]), HI, 420), h.tween(420, function (e) { move(SLOTS[k], 0, 0, 1 + 0.14 * Math.sin(Math.PI * e), c); }, E.linear)]);
          clear(SLOTS[k]);
        }
      },
      'g1b>g2': async function (h) {
        show(LAB, 0);
        for (let k = 0; k < 7; k++) {
          const e0 = L.el[LAB[k]];
          e0.setAttribute('opacity', 1);
          await h.tween(380, function (e) { pctText(e0, FITV[k] * e); }, E.out);
          e0.textContent = items[LAB[k]].tx;
        }
      },
      'g2>g3': async function (h) {
        show(PARENTS, 0);
        await titleSwap(h, 'ga_pass2', 'ga_pass3');
        await hop(h, [4, 6], 7);
        // setas: horizontal, depois as verticais até os pais (pontas por último)
        await stroke(h, L.el[119], 450);
        await h.all([stroke(h, L.el[115], 350), stroke(h, L.el[117], 350)]);
        await fade(h, [116, 118], 0, 1, 200);
        L.fx.querySelectorAll('rect').forEach(function (r) { r.remove(); });
      },
      'g3>g4': async function (h) {
        show(CHILD.concat(CHILDA), 0);
        await titleSwap(h, 'ga_pass3', 'ga_pass4');
        // cópias pequenas dos pais descem pelas setas e se juntam no meio da seta horizontal
        const g1 = ghost(SLOTS[4]), g2 = ghost(SLOTS[6]);
        const c1 = mid(bbox(items, SLOTS[4])), c2 = mid(bbox(items, SLOTS[6])), m = [116.4, 56.2];
        await h.tween(700, function (e) {
          g1.setAttribute('transform', tf(lerp(0, 96.4 - c1[0], 0), lerp(0, 56.2 - c1[1], e), 0.55, c1));
          g2.setAttribute('transform', tf(0, lerp(0, 56.2 - c2[1], e), 0.55, c2));
        });
        await h.tween(600, function (e) {
          g1.setAttribute('transform', tf(lerp(96.4 - c1[0], m[0] - c1[0], e), 56.2 - c1[1], 0.55 * (1 - 0.5 * e), c1));
          g2.setAttribute('transform', tf(lerp(136.4 - c2[0], m[0] - c2[0], e), 56.2 - c2[1], 0.55 * (1 - 0.5 * e), c2));
        });
        g1.remove(); g2.remove();
        await stroke(h, L.el[130], 500);
        await fade(h, [131], 0, 1, 150);
        await popIds(h, CHILD, 450);
      },
      'g4>g4b': async function (h) {
        const c = mid(bbox(items, CHILD));
        const q = S('text', { x: c[0], y: 53, 'text-anchor': 'middle', 'font-size': 9, 'font-family': 'KaTeX_Main, serif', fill: RED, 'font-weight': 'bold', opacity: 0 }, L.fx);
        q.textContent = '?';
        await h.tween(250, function (e) { q.setAttribute('opacity', e); });
        await h.tween(1400, function (e) { move(CHILD, 0, 0, 1, [c[0], 78], 9 * Math.sin(e * Math.PI * 6) * (1 - e)); q.setAttribute('transform', 'translate(0 ' + (-2 * Math.abs(Math.sin(e * Math.PI * 4))).toFixed(2) + ')'); }, E.linear);
        clear(CHILD);
        await h.tween(300, function (e) { q.setAttribute('opacity', 1 - e); });
        q.remove();
      },
      'g4b>g5': async function (h) {
        show(MUT.concat(MUTA), 0);
        await titleSwap(h, 'ga_pass4', 'ga_pass5');
        await stroke(h, L.el[132], 400);
        await fade(h, [133], 0, 1, 150);
        const g = ghost(CHILD);
        await h.tween(650, function (e) { g.setAttribute('transform', 'translate(' + (-36 * e).toFixed(2) + ' 0)'); });
        // clarão: o mutante aparece
        const c = mid(bbox(items, MUT));
        const fl = S('circle', { cx: c[0], cy: c[1], r: 2, fill: '#fff6c8', stroke: HI, 'stroke-width': 0.8, opacity: 0.9 }, L.fx);
        show(MUT, 1); g.remove();
        await h.tween(450, function (e) { fl.setAttribute('r', lerp(2, 16, e)); fl.setAttribute('opacity', 0.9 * (1 - e)); }, E.out);
        fl.remove();
        const bc = mid(items[143].b);
        await h.tween(600, function (e) { move([143], 0, 0, 1 + 0.6 * Math.sin(Math.PI * e), bc); }, E.linear);
        clear([143]);
      },
      'g5>g6': async function (h) {
        L.root.setAttribute('transform', 'translate(10 0)');           // ga_pass5 é 20 unidades mais estreita (centrada)
        show(EIGHTH.concat([LAB8, 95]), 0);
        await h.all([fade(h, PARENTS.concat(CHILD, CHILDA, MUTA), 1, 0, 450), titleSwap(h, 'ga_pass5', 'ga_pass6')]);
        // a caixa alarga
        const tmp = S('rect', { x: 0.4, y: 12.2, width: 152, height: 32, fill: 'none', stroke: '#8b0000', 'stroke-width': 0.8 }, L.root);
        show([0], 0);
        await h.tween(500, function (e) { tmp.setAttribute('width', lerp(152, 172, e)); L.root.setAttribute('transform', 'translate(' + (10 * (1 - e)).toFixed(3) + ' 0)'); });
        L.root.removeAttribute('transform');
        tmp.remove(); show([95], 1);
        // o mutante sobe para a 8ª vaga
        await h.tween(800, function (e) { move(MUT, 116 * e, -36 * e - 10 * Math.sin(Math.PI * e)); });
        show(MUT, 0); clear(MUT); show(EIGHTH, 1);
        const lb = L.el[LAB8]; lb.setAttribute('opacity', 1);
        await h.tween(400, function (e) { pctText(lb, 75 * e); }, E.out);
        lb.textContent = items[LAB8].tx;
      },
      'g6>g7': async function (h) {
        show(XMARK.concat(EYE7), 0);
        await titleSwap(h, 'ga_pass6', 'ga_pass7');
        await hop(h, [3], 9);
        L.fx.querySelectorAll('rect').forEach(function (r) { r.remove(); });
        show([39], 0); show(EYE7, 1);
        const c = mid(bbox(items, XMARK));
        show(XMARK, 1);
        await h.tween(320, function (e) { move(XMARK, 0, 0, lerp(2.2, 1, E.out(e)), c); }, E.linear);
        clear(XMARK);
        const ids = SLOTS[3].filter(function (i) { return i !== 39; }).concat(EYE7);
        await h.tween(500, function (e) { move(ids, 1.4 * Math.sin(e * Math.PI * 8) * (1 - e), 0); }, E.linear);
        clear(ids);
      },
      'g7>g8': async function (h) {
        L.root.setAttribute('transform', 'translate(-10 0)');          // ga_pass7 é 20 unidades mais larga
        show(NEW3.concat([LABN3, 0]), 0);
        await titleSwap(h, 'ga_pass7', 'ga_pass8');
        // o eliminado cai
        const out = SLOTS[3].filter(function (i) { return i !== 39; }).concat(EYE7, XMARK, [154]);
        const c = mid(bbox(items, SLOTS[3]));
        await h.tween(700, function (e) { move(out, 0, 34 * e * e, 1, c, 40 * e); show(out, 1 - e); }, E.linear);
        // o 8º desliza para a vaga
        const ids = EIGHTH.concat([LAB8]);
        await h.tween(800, function (e) { move(ids, -80 * e, -6 * Math.sin(Math.PI * e)); });
        show(ids, 0); clear(ids); show(NEW3.concat([LABN3]), 1);
        // a caixa volta ao tamanho original
        const tmp = S('rect', { x: 0.4, y: 12.2, width: 172, height: 32, fill: 'none', stroke: '#8b0000', 'stroke-width': 0.8 }, L.root);
        show([95], 0);
        await h.tween(450, function (e) { tmp.setAttribute('width', lerp(172, 152, e)); L.root.setAttribute('transform', 'translate(' + (-10 * (1 - e)).toFixed(3) + ' 0)'); });
        L.root.removeAttribute('transform');
        tmp.remove(); show([0], 1);
      }
    };
    function snap(st) { build(set(st)); }
    async function play(a, b, h) {
      const f = PLAYS[a + '>' + b];
      if (!f) { snap(b); return; }
      const A0 = set(a), B0 = set(b);
      const U = A0.concat(B0.filter(function (i) { return A0.indexOf(i) < 0; }));
      build(U);
      show(B0.filter(function (i) { return A0.indexOf(i) < 0; }), 0);    // o que entra começa escondido
      await f(h);
      // rede de segurança: o que ainda não entrou aparece; o que não saiu some
      const late = B0.filter(function (i) { return L.el[i] && L.el[i].getAttribute('opacity') === '0'; });
      const gone = A0.filter(function (i) { return B0.indexOf(i) < 0 && L.el[i] && L.el[i].getAttribute('opacity') !== '0'; });
      if (late.length || gone.length) console.debug('gapass', a, b, 'tarde:', late, 'sobra:', gone);
      if (late.length || gone.length) await h.tween(250, function (e) { show(late, e); show(gone, 1 - e); });
    }
    return { snap: snap, play: play };
  });

  // =====================================================================================================
  // Ciclo completo (ga_pass9): camada sobre a figura original
  // =====================================================================================================
  A.define('ciclo', function (host) {
    const svg = figSvg(host, 192.8, 254.95);
    const BOX = [[20.4, 10.6, 172.4, 42.5], [20.4, 62.5, 172.4, 94.5], [20.4, 142.6, 172.4, 174.6], [20.4, 222.6, 192.4, 254.6]];
    // percurso da ficha: desce pela esquerda das caixas (x = 40.4) e volta pela seta da esquerda
    const PATH = [[40.4, 26.6], [40.4, 78.5], [40.4, 158.6], [40.4, 238.6], [20.4, 238.6], [0.4, 238.6], [0.4, 26.6], [20.4, 26.6], [40.4, 26.6]];
    const AT = { 1: 1, 2: 2, 3: 3, 8: 0 };            // ponto do percurso -> caixa que acende
    let L = {};
    function build() { svg.textContent = ''; L.fx = S('g', {}, svg); }
    function snap() { build(); }
    async function play(a, b, h) {
      build();
      if (b !== 'c1') return;
      const cnt = S('text', { x: 192, y: 6, 'text-anchor': 'end', 'font-size': 7, 'font-family': 'KaTeX_Main, serif', fill: MYBLUE, 'font-weight': 'bold' }, L.fx);
      const tok = S('circle', { r: 3.2, fill: MYBLUE, stroke: '#fff', 'stroke-width': 0.8 }, L.fx);
      const light = function (k) {
        const b = BOX[k];
        const r = S('rect', { x: b[0] - 1.5, y: b[1] - 1.5, width: b[2] - b[0] + 3, height: b[3] - b[1] + 3, rx: 2, fill: HI, 'fill-opacity': 0.15, stroke: HI, 'stroke-width': 1.2, opacity: 0 }, L.fx);
        L.fx.insertBefore(r, L.fx.firstChild);
        return h.tween(700, function (e) { r.setAttribute('opacity', Math.sin(Math.PI * e)); }, E.linear).then(function () { r.remove(); });
      };
      const place = function (p) { tok.setAttribute('cx', p[0]); tok.setAttribute('cy', p[1]); };
      place(PATH[0]);
      for (let gen = 1; gen <= 3; gen++) {
        cnt.textContent = 'geração ' + gen;
        await light(0);
        for (let k = 1; k < PATH.length; k++) {
          const p0 = PATH[k - 1], p1 = PATH[k], d = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
          await h.tween(Math.max(120, d * 5.5), function (e) { place([lerp(p0[0], p1[0], e), lerp(p0[1], p1[1], e)]); }, E.inOut);
          if (AT[k] != null && k !== 8) await light(AT[k]);
        }
      }
      await light(0);
      await h.tween(400, function (e) { tok.setAttribute('opacity', 1 - e); });
      tok.remove();
      cnt.textContent = '';
    }
    return { snap: snap, play: play };
  });

  // =====================================================================================================
  // População final (ga_pass10): a população de ga_pass8 evolui até a final
  // =====================================================================================================
  A.define('final', function (host) {
    const D = A.figData.gafinal, items = D.items, G = A.figData.gapass;
    const svg = figSvg(host, 152.8, 42.95);
    const DY = -1.62;                                  // ga_pass8 -> ga_pass10 (mesma escala; a caixa está 1,6 pt acima)
    // vagas da esquerda para a direita (7 pássaros em cada figura)
    const NEW = groupParts(items, items.map(function (it, i) { return i; })).map(function (g) { return g.ids; });
    const OLD = groupParts(G.items, G.states.ga_pass8).filter(function (g) { return g.c[1] > 15; }).map(function (g) { return g.ids; });
    const LABN = rng(83, 89), LABO = [151, 152, 153, 158, 155, 156, 157];
    const OLDV = [45, 98, 45, 75, 85, 24, 45], NEWV = [58, 98, 99, 89, 100, 96, 100];
    let L = {};
    function build() {
      svg.textContent = ''; L = { el: {}, old: [] };
      items.forEach(function (it, i) { L.el[i] = item(svg, it); });
      L.oldG = S('g', { transform: 'translate(0 ' + DY + ')' }, svg);
      L.fx = S('g', {}, svg);
    }
    function snap() { build(); }
    async function play(a, b, h) {
      build();
      if (b !== 'f1') return;
      // começa com a população de ga_pass8 (o título também é o dela)
      const newIds = []; NEW.forEach(function (s) { s.forEach(function (i) { newIds.push(i); }); });
      newIds.concat([81, 82]).forEach(function (i) { L.el[i].setAttribute('opacity', 0); });
      const olds = OLD.map(function (s) { const g = S('g', {}, L.oldG); s.forEach(function (i) { item(g, G.items[i]); }); return g; });
      const oldT = S('g', {}, L.oldG); [93, 94].forEach(function (i) { item(oldT, G.items[i]); });
      LABN.forEach(function (i, k) { L.el[i].textContent = OLDV[k] + '%'; });
      const cnt = S('text', { x: 152, y: 6, 'text-anchor': 'end', 'font-size': 4.6, 'font-family': 'KaTeX_Main, serif', fill: MYBLUE }, L.fx);
      await h.wait(400);
      // gerações: a cada passo um pássaro se transforma e o fitness dele sobe
      const order = [0, 3, 5, 6, 2, 4, 1];
      const done = [false, false, false, false, false, false, false];
      for (let g = 1; g <= 7; g++) {
        const k = order[g - 1], gen = g * 15;
        await h.tween(550, function (e) {
          cnt.textContent = 'geração ' + Math.round(lerp(gen - 15, gen, e));
          olds[k].setAttribute('opacity', 1 - e);
          NEW[k].forEach(function (i) { L.el[i].setAttribute('opacity', e); });
          L.el[LABN[k]].textContent = Math.round(lerp(OLDV[k], NEWV[k], e)) + '%';
        });
        done[k] = true;
        L.el[LABN[k]].textContent = items[LABN[k]].tx;
      }
      await h.tween(450, function (e) { oldT.setAttribute('opacity', 1 - e); [81, 82].forEach(function (i) { L.el[i].setAttribute('opacity', e); }); });
      await h.wait(600);
      await h.tween(400, function (e) { cnt.setAttribute('opacity', 1 - e); });
    }
    return { snap: snap, play: play };
  });

  // =====================================================================================================
  // Pássaros → rotas do TSP (frame 53: ga_generico_pass → ga_tsp_generico; passos 2–6 destacam cada associação)
  // =====================================================================================================
  A.define('avesrotas', function (host) {
    const D = A.figData.avesrotas, items = D.items;
    const svg = figSvg(host, 192.8, 252.601);
    const BIRDS = D.states.ga_generico_pass, TSP = D.states.ga_tsp_generico;
    const DY = -0.936;                                 // na página, a figura do TSP está 0,94 abaixo da dos pássaros
    const rowOf = function (y) { return y < 50 ? 0 : y < 100 ? 1 : y < 135 ? 2 : y < 180 ? 3 : y < 215 ? 4 : 5; };
    // indivíduos agrupados por linha (0 população, 1 reprodução, 2 filho, 3 mutação, 4 filho/mutante, 5 seleção)
    function rows(ids) {
      const R = [[], [], [], [], [], []];
      groupParts(items, ids).forEach(function (g) { g.row = rowOf(items[g.body].b[1]); R[g.row].push(g); });
      R.forEach(function (r) { r.sort(function (a, b) { return a.c[0] - b.c[0]; }); });
      // rótulo de fitness ("nn%") de cada indivíduo: o mais próximo em x, logo acima do corpo
      ids.forEach(function (i) {
        const it = items[i];
        if (it.t !== 'x' || !/%$/.test(it.tx)) return;
        let best = null, bd = Infinity;
        R.forEach(function (r) { r.forEach(function (g) {
          const dy = items[g.body].b[1] - it.b[3];
          if (dy < -3 || dy > 9) return;
          const d = Math.abs(mid(it.b)[0] - g.c[0]);
          if (d < bd) { bd = d; best = g; }
        }); });
        if (best) best.lab = i;
      });
      return R;
    }
    const RB = rows(BIRDS), RT = rows(TSP);
    const inGroup = function (R) { const s = {}; R.forEach(function (r) { r.forEach(function (g) { g.ids.forEach(function (i) { s[i] = 1; }); if (g.lab != null) s[g.lab] = 1; }); }); return s; };
    const GB = inGroup(RB), GT = inGroup(RT);
    const routeOf = function (g) { return g.ids.filter(function (i) { const it = items[i]; return it.s === '#000000' && !it.f; })[0]; };
    // pares pássaro → rota: na mesma ordem; o 7º pássaro das linhas de 7 não tem par; na seleção, o 8º (o mutante) vira o 7º
    function pairs(r) {
      const b = RB[r], t = RT[r], out = [];
      const drop = b.length > t.length ? (r === 5 ? b.length - 2 : b.length - 1) : -1;
      let k = 0;
      b.forEach(function (g, j) { if (j === drop) out.push([g, null]); else out.push([g, t[k++] || null]); });
      for (; k < t.length; k++) out.push([null, t[k]]);
      return out;
    }
    let L = {};
    // camada com os grupos (cada indivíduo num <g>, para mover/escalar inteiro)
    function layer(parent, ids, R, inG, dy) {
      const root = S('g', dy ? { transform: 'translate(0 ' + dy + ')' } : {}, parent);
      const el = {}, gg = new Map();
      // o fundo branco da figura (retângulo do tamanho dela) cobriria a outra camada: fica de fora
      const bg = function (it) { return it.t === 'p' && it.f === '#ffffff' && it.b[2] - it.b[0] > 150; };
      ids.forEach(function (i) { if (!inG[i] && !bg(items[i])) el[i] = item(root, items[i]); });
      R.forEach(function (r) { r.forEach(function (g) {
        const e = S('g', {}, root); g.ids.forEach(function (i) { el[i] = item(e, items[i]); }); gg.set(g, e);
      }); });
      R.forEach(function (r) { r.forEach(function (g) { if (g.lab != null) el[g.lab] = item(root, items[g.lab]); }); });
      return { root: root, el: el, g: gg };
    }
    function build(withBirds) {
      svg.textContent = ''; L = {};
      if (withBirds) L.B = layer(svg, BIRDS, RB, GB, DY);
      L.T = layer(svg, TSP, RT, GT, 0);
      L.fx = S('g', {}, svg);
    }
    const op = function (e, v) { if (e) e.setAttribute('opacity', v); };
    const struct = function (Lr, inG, ids) { return ids.filter(function (i) { return !inG[i] && Lr.el[i]; }).map(function (i) { return Lr.el[i]; }); };

    // um pássaro encolhe e vai até a rota, que brota de onde ele estava; depois a rota é traçada
    async function morph(h, gb, gt) {
      const eb = gb && L.B.g.get(gb), et = gt && L.T.g.get(gt);
      const lb = gb && gb.lab != null ? L.B.el[gb.lab] : null, lt = gt && gt.lab != null ? L.T.el[gt.lab] : null;
      const cb = gb ? [gb.c[0], gb.c[1] + DY] : gt.c, ct = gt ? gt.c : cb;
      const rt = gt && L.T.el[routeOf(gt)];
      op(rt, 0);
      await h.tween(700, function (e) {
        const t1 = Math.min(1, e / 0.6), t2 = Math.max(0, (e - 0.25) / 0.75);
        if (eb) {
          eb.setAttribute('transform', tf((ct[0] - cb[0]) * t1, (ct[1] - cb[1]) * t1, 1 - 0.85 * t1, gb.c));
          op(eb, 1 - t1);
        }
        op(lb, 1 - t1);
        if (et) {
          et.setAttribute('transform', tf((cb[0] - ct[0]) * (1 - t2), (cb[1] - ct[1]) * (1 - t2), 0.15 + 0.85 * E.back(t2), ct));
          op(et, Math.min(1, t2 * 3));
        }
        op(lt, t2);
      }, E.linear);
      if (et) et.removeAttribute('transform');
      if (rt) await stroke(h, rt, 380);
    }

    // ---------- destaques dos passos ----------
    const nearX = function (r, x) { return RT[r].reduce(function (a, g) { return Math.abs(g.c[0] - x) < Math.abs(a.c[0] - x) ? g : a; }); };
    async function pulseG(h, g, amp, dur) {
      const e = L.T.g.get(g);
      await h.tween(dur || 500, function (t) { e.setAttribute('transform', tf(0, 0, 1 + (amp || 0.18) * Math.sin(Math.PI * t), g.c)); }, E.linear);
      e.removeAttribute('transform');
    }
    // setas: linhas traçadas em ordem; pontas (pequenas) aparecem no fim
    async function redraw(h, ids, dur) {
      const small = function (it) { return it.b[2] - it.b[0] < 6 && it.b[3] - it.b[1] < 6; };
      ids.forEach(function (i) { op(L.T.el[i], 0); });
      for (const i of ids) {
        const e = L.T.el[i];
        if (small(items[i])) await h.tween(150, function (t) { op(e, t); });
        else await stroke(h, e, dur || 350);
      }
    }
    function pts(d) { return (d.match(/-?[\d.]+/g) || []).map(Number).reduce(function (a, v, k, arr) { if (k % 2 === 0) a.push([v, arr[k + 1]]); return a; }, []); }
    const near = function (p, q) { return Math.abs(p[0] - q[0]) < 0.3 && Math.abs(p[1] - q[1]) < 0.3; };
    // a rota do filho vai até o mutante e dois vértices trocam de lugar na ordem de visita (mutação por troca)
    async function swapMorph(h, child, mut) {
      const rc = routeOf(child), rm = routeOf(mut);
      const dx = mut.c[0] - child.c[0], dy = mut.c[1] - child.c[1];
      const P = pts(items[rc].d).slice(0, -1).map(function (p) { return [p[0] + dx, p[1] + dy]; });
      const Q = pts(items[rm].d).slice(0, -1);
      let target = null;
      [Q, Q.slice().reverse()].forEach(function (QQ) {
        for (let r = 0; r < QQ.length && !target; r++) {
          const Qr = QQ.slice(r).concat(QQ.slice(0, r));
          const diff = P.filter(function (p, i) { return !near(p, Qr[i]); });
          if (diff.length === 2) target = Qr;
        }
      });
      const path = S('path', { fill: 'none', stroke: '#000', 'stroke-width': 0.4, 'stroke-linejoin': 'round' }, L.fx);
      const draw = function (A2) { path.setAttribute('d', 'M' + A2.map(function (p) { return p[0].toFixed(2) + ' ' + p[1].toFixed(2); }).join('L') + 'Z'); };
      const em = L.T.el[rm];
      op(em, 0);
      await h.tween(700, function (e) { draw(P.map(function (p) { return [p[0] - dx * (1 - e), p[1] - dy * (1 - e)]; })); });
      if (target) {
        const moving = [];
        P.forEach(function (p, i) { if (!near(p, target[i])) moving.push(i); });
        const rings = moving.map(function (i) { return S('circle', { cx: P[i][0], cy: P[i][1], r: 1.8, fill: 'none', stroke: RED, 'stroke-width': 0.5 }, L.fx); });
        await h.wait(250);
        await h.tween(800, function (e) {
          const A2 = P.map(function (p, i) { return [lerp(p[0], target[i][0], e), lerp(p[1], target[i][1], e)]; });
          draw(A2);
          moving.forEach(function (i, k) { rings[k].setAttribute('cx', A2[i][0]); rings[k].setAttribute('cy', A2[i][1]); });
        });
        await h.wait(350);
        rings.forEach(function (r) { r.remove(); });
      }
      op(em, 1); path.remove();
    }

    const STEPS = {
      // indivíduo → solução do TSP: cada rota da população é destacada e traçada de novo
      't1>t2': async function (h) {
        for (const g of RT[0]) {
          const r = L.T.el[routeOf(g)];
          op(r, 0);
          await h.all([ring(h, L.fx, g.bb, HI, 520), stroke(h, r, 420)]);
        }
      },
      // fitness: os valores pulsam, linha a linha
      't2>t3': async function (h) {
        for (const r of [0, 1, 3, 5]) {
          const labs = RT[r].filter(function (g) { return g.lab != null; }).map(function (g) { return g.lab; });
          await h.tween(520, function (t) {
            labs.forEach(function (i) {
              const e = L.T.el[i];
              e.setAttribute('transform', tf(0, 0, 1 + 0.6 * Math.sin(Math.PI * t), mid(items[i].b)));
              e.setAttribute('fill', t > 0.1 && t < 0.85 ? HI : items[i].c);
            });
          }, E.linear);
          labs.forEach(function (i) { L.T.el[i].removeAttribute('transform'); L.T.el[i].setAttribute('fill', items[i].c); });
        }
      },
      // reprodução: os pais são destacados, as setas traçadas e o filho surge
      't3>t4': async function (h) {
        const p1 = nearX(1, 108.4), p2 = nearX(1, 156.4), ch = RT[2][0];
        const arrows = [6, 7, 8];
        arrows.forEach(function (i) { op(L.T.el[i], 0); });
        op(L.T.g.get(ch), 0);
        await h.all([ring(h, L.fx, p1.bb, HI, 700, true), ring(h, L.fx, p2.bb, HI, 700, true), pulseG(h, p1), pulseG(h, p2)]);
        await redraw(h, arrows, 350);
        const e = L.T.g.get(ch), r = L.T.el[routeOf(ch)];
        op(e, 1); op(r, 0);
        await h.tween(380, function (t) { e.setAttribute('transform', tf(0, 0, lerp(0.2, 1, E.back(t)), ch.c)); }, E.linear);
        e.removeAttribute('transform');
        await stroke(h, r, 420);
        await h.wait(300);
        L.fx.textContent = '';
      },
      // mutação: o filho é gerado e, pela seta, dois vértices da rota trocam de posição
      't4>t5': async function (h) {
        const p1 = nearX(3, 116.4), p2 = nearX(3, 156.4);
        const kids = RT[4], ch = kids[kids.length - 1], mu = kids[0];
        [15, 16, 17, 168, 169].forEach(function (i) { op(L.T.el[i], 0); });
        await h.all([ring(h, L.fx, p1.bb, HI, 600), ring(h, L.fx, p2.bb, HI, 600)]);
        await redraw(h, [15, 16, 17], 300);
        await pulseG(h, ch, 0.15, 450);
        await redraw(h, [168, 169], 300);
        await swapMorph(h, ch, mu);
        await h.all([ring(h, L.fx, mu.bb, RED, 700), pulseG(h, mu, 0.15, 700)]);
      },
      // seleção natural: o anel percorre a nova população e marca, por um momento, uma das piores
      't5>t6': async function (h) {
        const row = RT[5];
        await ring(h, L.fx, items[18].b, HI, 700);
        for (const g of row) await ring(h, L.fx, g.bb, HI, 160);
        const worst = row.filter(function (g) { return g.lab != null && items[g.lab].tx === '20%'; });
        const w = worst[worst.length - 1] || row[0], q = w.bb;
        const r = await ring(h, L.fx, q, RED, 300, true);
        const x = S('path', { d: 'M' + (q[0] + 1) + ' ' + (q[1] + 1) + 'L' + (q[2] - 1) + ' ' + (q[3] - 1) + 'M' + (q[2] - 1) + ' ' + (q[1] + 1) + 'L' + (q[0] + 1) + ' ' + (q[3] - 1), stroke: RED, 'stroke-width': 1.4, 'stroke-linecap': 'round', fill: 'none', opacity: 0 }, L.fx);
        await h.tween(300, function (t) { op(x, t); });
        await h.wait(900);
        await h.tween(400, function (t) { op(x, 1 - t); op(r, 1 - t); });
        L.fx.textContent = '';
        await pulseG(h, row[row.length - 1], 0.18, 600);
      }
    };

    function snap(st) {
      svg.textContent = ''; L = {};
      if (st === 'a') { L.B = layer(svg, BIRDS, RB, GB, DY); return; }
      // igual ao PDF, sem o fundo branco (a figura invade a coluna do texto e a camada fica por cima dele)
      TSP.forEach(function (i) { const it = items[i]; if (!(it.t === 'p' && it.f === '#ffffff' && it.b[2] - it.b[0] > 150)) item(svg, it); });
    }
    async function play(a, b, h) {
      if (a === 'a' && b === 't1') {
        build(true);
        const sb = struct(L.B, GB, BIRDS), st = struct(L.T, GT, TSP);
        RT.forEach(function (r) { r.forEach(function (g) { op(L.T.g.get(g), 0); if (g.lab != null) op(L.T.el[g.lab], 0); }); });
        st.forEach(function (e) { op(e, 0); });
        // a estrutura (caixas, setas, títulos) troca primeiro; depois cada pássaro vira uma rota, linha a linha
        await h.tween(600, function (e) { sb.forEach(function (x) { op(x, 1 - e); }); st.forEach(function (x) { op(x, e); }); });
        const all = [];
        for (let r = 0; r < 6; r++) {
          for (const pr of pairs(r)) { all.push(morph(h, pr[0], pr[1])); await h.wait(85); }
          await h.wait(120);
        }
        await h.all(all);
        return;
      }
      const f = STEPS[a + '>' + b];
      build(false);
      if (f) await f(h);
    }
    return { snap: snap, play: play };
  });
})();
