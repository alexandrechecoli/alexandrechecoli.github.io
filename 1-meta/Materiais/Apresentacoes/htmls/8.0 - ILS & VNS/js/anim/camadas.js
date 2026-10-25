/* Figuras em camadas (aula 8): sequências de figuras do Ipe em que cada figura acrescenta, tira ou troca
 * elementos. Dados em js/anim/dados/NOME.js (ferramentas/figura_camadas.py). O estado final de cada slide é
 * a figura do PDF; a passagem de uma figura para a seguinte é animada a partir da diferença entre elas:
 *
 *   - itens iguais (mesmo estilo e mesma posição, ±0.6 pt) que o Ipe gravou de novo: troca invisível;
 *   - mesmo traço com outro tracejado/espessura (curva ativa ⇄ pontilhada) ou texto trocado no mesmo lugar
 *     ("1" → "3"): troca suave (texto com pulso);
 *   - o que sai: some em fade;
 *   - o que entra, nesta ordem: curvas longas são desenhadas; caixas/círculos grandes aparecem (contorno
 *     desenhado ou crescendo do centro); setas são traçadas e a ponta surge no fim (com uma ficha
 *     percorrendo a seta, se a cena pedir); as bolinhas de uma busca local aparecem em cadeia, a partir do
 *     ponto inicial, com uma ficha "rolando" de uma para a outra; pontos soltos brotam; textos entram
 *     palavra por palavra.
 *
 * Efeitos extras por cena em SCENES (start = ponto de partida das cadeias; nope = ✗ vermelho na solução
 * atual quando a vizinhança não melhora; cycle = ficha dando voltas no ciclo do ILS).
 */
(function () {
  'use strict';
  const A = window.Anim;
  if (!A) return;
  const S = A.svg, E = A.ease, lerp = A.lerp;
  const TOKEN = '#0061a5';

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

  // ---------- cenas ----------
  const SCENES = {
    ils: { scale: 1.1, aria: 'Iterated Local Search no fitness landscape', fly: true,
      start: { ILS2: [179, 38], ILS4: [42, 50], ILS6: [95, 76] },
      late: [80, 0, 100, 20] },   // "s_best = s1 -> s3" só muda depois que a busca local chega em s3
    vnd: { scale: 1, aria: 'Dinâmica do VND entre as vizinhanças', fly: true },
    fl: { scale: 0.9, aria: 'VND no fitness landscape', from: [294, 41],
      start: { VND_FL5: [294, 41], VND_FL15: [294, 41] },
      nope: { VND_FL10: true, VND_FL13: true, VND_FL14: true } },
    comp: { scale: 1.1, aria: 'Componentes de design do ILS', byX: true,
      cycle: { componentes: [[30.9, 14.9, 1], [60.9, 16.9], [80.9, 16.9], [150.9, 14.9, 0], [220.9, 16.9], [240.9, 16.9],
        [268.9, 14.9, 6], [268.9, 28.9], [268.9, 40.9], [28.9, 40.9], [28.9, 28.9], [30.9, 14.9, 1]] } }
  };

  // ---------- geometria dos itens ----------
  function nums(d) { return (d.match(/-?\d*\.?\d+/g) || []).map(Number); }
  function info(it) {
    const b = it.b, w = b[2] - b[0], hgt = b[3] - b[1];
    const o = { w: w, h: hgt, max: Math.max(w, hgt), cx: (b[0] + b[2]) / 2, cy: (b[1] + b[3]) / 2 };
    if (it.t === 'p') {
      const n = nums(it.d);
      o.p0 = [n[0], n[1]]; o.p1 = [n[n.length - 2], n[n.length - 1]];
      o.closed = /Z\s*$/.test(it.d) || (Math.abs(o.p0[0] - o.p1[0]) < 0.05 && Math.abs(o.p0[1] - o.p1[1]) < 0.05 && n.length > 4);
      o.open = !!it.s && !o.closed;
      o.mask = o.closed && !it.s && (it.f === '#ffffff') && o.max > 3;
    }
    return o;
  }
  const near = function (a, b, tol) { return Math.abs(a - b) <= tol; };
  function sameBox(a, b, tol) { return near(a.b[0], b.b[0], tol) && near(a.b[1], b.b[1], tol) && near(a.b[2], b.b[2], tol) && near(a.b[3], b.b[3], tol); }
  function sameStyle(a, b) {
    if (a.t !== b.t) return false;
    if (a.t === 'x') return a.tx === b.tx && a.fs === b.fs && a.c === b.c;
    return a.f === b.f && a.s === b.s && a.w === b.w && a.fo === b.fo && a.da === b.da;
  }
  const dist = function (p, q) { return Math.hypot(p[0] - q[0], p[1] - q[1]); };

  A.define('camadas', function (host) {
    const name = host.dataset.fig, D = (A.figData || {})[name], C = SCENES[name] || {};
    if (!D) { console.warn('camadas: sem dados', name); return { snap: function () {} }; }
    const items = D.items, I = items.map(info);
    const SC = +(host.dataset.scale || C.scale || 1);
    const root = S('svg', { viewBox: '0 0 ' + D.W + ' ' + D.H, role: 'img', 'aria-label': C.aria || name });
    root.style.width = (D.W * SC) + 'pt'; root.style.height = (D.H * SC) + 'pt'; root.style.overflow = 'visible';
    host.appendChild(root);
    const els = A.figBuild(root, items);
    const gFx = S('g', {}, root);
    const STATES = { vazio: [] };
    Object.keys(D.states).forEach(function (k) { STATES[k] = D.states[k]; });

    // bolinha de busca local: forma fechada, redonda, preenchida, de 4 a 24 pt
    const isBall = function (i) {
      const it = items[i], f = I[i];
      return it.t === 'p' && !f.open && !f.mask && it.f && f.max >= 4 && f.max < 24 && Math.abs(f.w - f.h) <= 0.15 * f.max;
    };
    const show = function (i, v) { els[i].style.display = v ? '' : 'none'; };
    function reset(i) { const e = els[i]; e.style.opacity = ''; e.style.strokeDasharray = ''; e.style.strokeDashoffset = ''; e.removeAttribute('transform'); e.removeAttribute('clip-path'); if (items[i].r) e.setAttribute('transform', 'rotate(' + items[i].r + ' ' + items[i].x + ' ' + items[i].y + ')'); }
    function snap(st) {
      gFx.textContent = '';
      const on = {}; (STATES[st] || []).forEach(function (i) { on[i] = true; });
      items.forEach(function (_, i) { reset(i); show(i, !!on[i]); });
    }

    // ---------- diferença entre dois estados ----------
    function diff(a, b) {
      const inA = {}, inB = {};
      STATES[a].forEach(function (i) { inA[i] = true; }); STATES[b].forEach(function (i) { inB[i] = true; });
      let ent = STATES[b].filter(function (i) { return !inA[i]; });
      let sai = STATES[a].filter(function (i) { return !inB[i]; });
      const same = [], sw = [];
      // 1) mesmo item gravado de novo
      ent = ent.filter(function (e) {
        const k = sai.findIndex(function (s) { return sameStyle(items[e], items[s]) && sameBox(items[e], items[s], 0.6); });
        if (k < 0) return true;
        same.push([sai[k], e]); sai.splice(k, 1); return false;
      });
      // 2) mesmo traço com outro estilo / texto trocado no mesmo lugar
      ent = ent.filter(function (e) {
        const ie = items[e];
        const k = sai.findIndex(function (s) {
          const is = items[s];
          if (ie.t !== is.t) return false;
          if (ie.t === 'x') return near(ie.x, is.x, 0.8) && near(ie.y, is.y, 0.8) && ie.fs === is.fs;
          return ie.s && ie.s === is.s && I[e].open && I[s].open && I[e].max > 20 && sameBox(ie, is, 1.5);
        });
        if (k < 0) return true;
        sw.push([sai[k], e]); sai.splice(k, 1); return false;
      });
      return { ent: ent, sai: sai, same: same, sw: sw };
    }

    // classifica o que entra
    function classify(ent) {
      const set = {}; ent.forEach(function (i) { set[i] = true; });
      const used = {};
      const opens = ent.filter(function (i) { return items[i].t === 'p' && I[i].open; });
      // pontas: forma pequena (fechada ou aberta) junto ao fim de um traço aberto que também entra
      const heads = {};
      opens.filter(function (i) { return I[i].max >= 6; }).forEach(function (i) {
        const end = I[i].p1;
        ent.forEach(function (j) {
          if (j === i || used[j] || items[j].t !== 'p' || I[j].max >= 8 || I[j].mask) return;
          const b = items[j].b;
          if (end[0] >= b[0] - 1.5 && end[0] <= b[2] + 1.5 && end[1] >= b[1] - 1.5 && end[1] <= b[3] + 1.5) {
            (heads[i] = heads[i] || []).push(j); used[j] = true;
          }
        });
      });
      const out = { masks: [], curves: [], shapes: [], arrows: [], circles: [], dots: [], texts: [], other: [] };
      ent.forEach(function (i) {
        if (used[i]) return;
        const it = items[i], f = I[i];
        if (it.t === 'x') out.texts.push(i);
        else if (f.mask) out.masks.push(i);
        else if (f.open && heads[i]) out.arrows.push({ i: i, heads: heads[i] });
        else if (f.open && f.max >= 40) out.curves.push(i);
        else if (f.open) out.arrows.push({ i: i, heads: [] });
        else if (f.max < 4) out.dots.push(i);
        else if (isBall(i)) out.circles.push(i);
        else out.shapes.push(i);
      });
      return out;
    }

    // ---------- efeitos ----------
    function pop(h, ids, c, dur) {
      ids.forEach(function (i) { show(i, true); reset(i); els[i].style.opacity = 0; });
      return h.tween(dur || 260, function (e, t) {
        const s = Math.max(0.001, E.back(t));
        ids.forEach(function (i) {
          els[i].setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ') scale(' + s + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')');
          els[i].style.opacity = Math.min(1, t * 3);
        });
      }, E.linear).then(function () { ids.forEach(reset); });
    }
    function trace(h, i, dur, onT) {
      const el = els[i]; show(i, true); reset(i);
      const L = el.getTotalLength();
      const da = items[i].da;
      if (da) {   // tracejado/pontilhado: o dasharray já está em uso -> revela da esquerda para a direita (recorte)
        const b = items[i].b, id = 'cl' + Math.random().toString(36).slice(2);
        const cp = S('clipPath', { id: id }, gFx);
        const r = S('rect', { x: b[0] - 2, y: b[1] - 2, width: 0, height: b[3] - b[1] + 4 }, cp);
        el.setAttribute('clip-path', 'url(#' + id + ')');
        return h.tween(dur, function (e) { r.setAttribute('width', (b[2] - b[0] + 4) * e); if (onT) onT(e, el, L); }, E.inOut)
          .then(function () { el.removeAttribute('clip-path'); cp.remove(); reset(i); });
      }
      el.style.strokeDasharray = L + ' ' + (L + 1);
      // curva longa gravada da direita para a esquerda: desenha a partir do fim (sempre da esquerda para a direita)
      const rev = !onT && I[i].max >= 40 && I[i].p0[0] > I[i].p1[0] + 1;
      el.style.strokeDashoffset = rev ? -L : L;
      return h.tween(dur, function (e) { el.style.strokeDashoffset = (rev ? -L : L) * (1 - e); if (onT) onT(e, el, L); }, E.inOut).then(function () { reset(i); });
    }
    function fadeIn(h, ids, dur) {
      ids.forEach(function (i) { show(i, true); reset(i); els[i].style.opacity = 0; });
      return h.tween(dur || 300, function (e) { ids.forEach(function (i) { els[i].style.opacity = e; }); }).then(function () { ids.forEach(reset); });
    }
    function fadeOut(h, ids, dur) {
      return h.tween(dur || 300, function (e) { ids.forEach(function (i) { els[i].style.opacity = 1 - e; }); })
        .then(function () { ids.forEach(function (i) { reset(i); show(i, false); }); });
    }
    function token(r) { return S('circle', { r: r || 1.9, fill: TOKEN, stroke: '#fff', 'stroke-width': 0.5 }, gFx); }
    function ring(h, c, r0, col) {
      const k = S('circle', { cx: c[0], cy: c[1], r: r0, fill: 'none', stroke: col || TOKEN, 'stroke-width': 0.8 }, gFx);
      return h.tween(650, function (e) { k.setAttribute('r', r0 + 7 * e); k.setAttribute('opacity', 1 - e); }, E.out).then(function () { k.remove(); });
    }
    async function words(h, ids, focus) {
      // linhas (mesma linha de base), de cima para baixo; palavras da esquerda para a direita.
      // Textos perto de onde a cadeia terminou ("ótimo local s1") entram antes dos demais.
      const pri = function (i) { return focus && dist(focus, [I[i].cx, I[i].cy]) < 30 ? 0 : 1; };
      const sorted = ids.slice().sort(function (a, b) {
        if (pri(a) !== pri(b)) return pri(a) - pri(b);
        const dy = items[a].y - items[b].y; return Math.abs(dy) > 3 ? dy : items[a].x - items[b].x;
      });
      for (const i of sorted) {
        show(i, true); els[i].style.opacity = 0;
        await h.tween(110, function (e) { els[i].style.opacity = e; els[i].setAttribute('transform', 'translate(0 ' + (1.5 * (1 - e)) + ')'); }, E.out);
        reset(i);
      }
    }
    async function arrow(h, a, fly) {
      let tk = null;
      if (fly && I[a.i].max > 10) tk = token();
      await trace(h, a.i, Math.min(1100, 380 + 4 * I[a.i].max), tk ? function (e, el, L) {
        const p = el.getPointAtLength(L * e); tk.setAttribute('cx', p.x); tk.setAttribute('cy', p.y);
      } : null);
      if (a.heads.length) await pop(h, a.heads, I[a.i].p1, 200);
      if (tk) { const c = I[a.i].p1; await ring(h, c, 1.5); tk.remove(); }
    }
    // cadeia de bolinhas da busca local: vizinho mais próximo a partir do ponto inicial
    function chainOrder(ids, start) {
      const left = ids.slice(), out = [];
      let p = start;
      while (left.length) {
        let k = 0, bd = Infinity;
        left.forEach(function (i, j) { const d = dist(p, [I[i].cx, I[i].cy]); if (d < bd) { bd = d; k = j; } });
        const i = left.splice(k, 1)[0]; out.push(i); p = [I[i].cx, I[i].cy];
      }
      return out;
    }
    function chainStart(a, b, ids) {
      if (C.start && C.start[b]) return C.start[b];
      // continua a cadeia que já está na figura: ponto da cadeia nova mais perto de uma bolinha antiga
      const old = STATES[a].filter(isBall);
      if (!old.length) return [I[ids[0]].cx, I[ids[0]].cy];
      let best = null;
      ids.forEach(function (i) { old.forEach(function (j) { const d = dist([I[i].cx, I[i].cy], [I[j].cx, I[j].cy]); if (!best || d < best[0]) best = [d, [I[j].cx, I[j].cy]]; }); });
      return best[1];
    }
    let lastEnd = null;
    async function chain(h, circles, dots, start) {
      if (!circles.length) return;
      const order = chainOrder(circles, start);
      // pontinhos (centros) vão junto com a bolinha mais próxima
      const att = {}; const loose = [];
      dots.forEach(function (d) {
        let best = null;
        circles.forEach(function (c) { const dd = dist([I[d].cx, I[d].cy], [I[c].cx, I[c].cy]); if (!best || dd < best[0]) best = [dd, c]; });
        if (best && best[0] < 6) (att[best[1]] = att[best[1]] || []).push(d); else loose.push(d);
      });
      order.forEach(function (i) { show(i, false); (att[i] || []).forEach(function (d) { show(d, false); }); });
      const tk = token(2.2);
      let p = start;
      const step = Math.max(45, Math.min(110, 2600 / order.length));
      for (const i of order) {
        const q = [I[i].cx, I[i].cy];
        await h.tween(step, function (e) { tk.setAttribute('cx', lerp(p[0], q[0], e)); tk.setAttribute('cy', lerp(p[1], q[1], e)); }, E.linear);
        pop(h, [i].concat(att[i] || []), q, 220);
        p = q;
      }
      await h.wait(200);
      await ring(h, p, 2.5);
      tk.remove();
      lastEnd = p;
      return loose;
    }
    // posição da solução atual (fim da cadeia) num estado
    function chainEnd(st) {
      const ids = STATES[st].filter(isBall);
      if (!ids.length || !C.from) return null;
      const o = chainOrder(ids, C.from); const i = o[o.length - 1];
      return [I[i].cx, I[i].cy];
    }
    async function nope(h, p) {
      const g = S('g', { stroke: '#c00000', 'stroke-width': 1.3, 'stroke-linecap': 'round' }, gFx);
      S('line', { x1: -3, y1: -3, x2: 3, y2: 3 }, g); S('line', { x1: -3, y1: 3, x2: 3, y2: -3 }, g);
      const c = [p[0] + 7, p[1] - 7];
      await h.tween(260, function (e) { g.setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ') scale(' + Math.max(0.01, E.back(e)) + ')'); }, E.linear);
      await h.wait(700);
      await h.tween(400, function (e) { g.setAttribute('opacity', 1 - e); });
      g.remove();
    }
    async function cycle(h, wps) {
      const tk = token(2.4);
      for (let lap = 0; lap < 2; lap++) {
        for (let k = 0; k + 1 < wps.length; k++) {
          const p = wps[k], q = wps[k + 1];
          const d = dist(p, q);
          await h.tween(Math.max(120, d * 5), function (e) { tk.setAttribute('cx', lerp(p[0], q[0], e)); tk.setAttribute('cy', lerp(p[1], q[1], e)); }, E.inOut);
          if (q[2] != null) {   // passou por uma caixa: ela pulsa
            const b = items[q[2]].b;
            const r = S('rect', { x: b[0], y: b[1], width: b[2] - b[0], height: b[3] - b[1], rx: 4, fill: 'none', stroke: TOKEN, 'stroke-width': 1.2 }, gFx);
            h.tween(500, function (e) {
              const s = 1 + 0.12 * e, cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
              r.setAttribute('transform', 'translate(' + cx + ' ' + cy + ') scale(' + s + ') translate(' + (-cx) + ' ' + (-cy) + ')');
              r.setAttribute('opacity', 1 - e);
            }, E.out).then(function () { r.remove(); });
          }
        }
      }
      tk.remove();
    }

    async function play(a, b, h) {
      if (!STATES[a] || !STATES[b]) return;
      const d = diff(a, b);
      // estado inicial: tudo de a; o que entra começa escondido
      snap(a);
      d.same.forEach(function (p) { show(p[0], false); show(p[1], true); });
      const K = classify(d.ent);
      K.masks.forEach(function (i) { show(i, true); });
      // solução atual que não melhora (✗) antes de trocar de vizinhança
      if (C.nope && C.nope[b]) { const p = chainEnd(a); if (p) await nope(h, p); }
      // sai / troca (trocas dentro de C.late ficam para o fim)
      const inLate = function (p) { const L = C.late, c = I[p[1]]; return L && c.cx >= L[0] && c.cx <= L[2] && c.cy >= L[1] && c.cy <= L[3]; };
      const lateSw = d.sw.filter(inLate);
      const swap = function (p) {
        const o = els[p[0]], n = els[p[1]];
        show(p[1], true); n.style.opacity = 0;
        const isText = items[p[1]].t === 'x';
        return h.tween(isText ? 450 : 650, function (e) { o.style.opacity = 1 - e; n.style.opacity = e; })
          .then(function () { reset(p[0]); show(p[0], false); reset(p[1]); if (isText) return ring(h, [I[p[1]].cx, I[p[1]].cy], 3); });
      };
      lateSw.forEach(function (p) { show(p[1], false); });
      const sw = h.all(d.sw.filter(function (p) { return !inLate(p); }).map(swap));
      const out = fadeOut(h, d.sai.filter(function (i) { return !I[i].mask; }), 350);
      await h.all([sw, out]);
      // entra
      if (C.byX) {   // da esquerda para a direita: caixa (com os textos de dentro) -> seta -> caixa ...
        const seq = [];
        const inside = function (t, sh) { const b = items[sh].b; return I[t].cx > b[0] && I[t].cx < b[2] && I[t].cy > b[1] && I[t].cy < b[3]; };
        let texts = K.texts.slice();
        K.shapes.forEach(function (sh) {
          const mine = texts.filter(function (t) { return inside(t, sh); });
          texts = texts.filter(function (t) { return mine.indexOf(t) < 0; });
          seq.push({ x: items[sh].b[0], run: async function () { await pop(h, [sh], [I[sh].cx, I[sh].cy], 300); await words(h, mine); } });
        });
        K.arrows.forEach(function (ar) { seq.push({ x: I[ar.i].p0[0], run: function () { return arrow(h, ar, false); } }); });
        seq.sort(function (a, b) { return a.x - b.x; });
        for (const q of seq) await q.run();
        await words(h, texts);
        if (C.cycle && C.cycle[b]) { await h.wait(300); await cycle(h, C.cycle[b]); }
        return h.wait(250);
      }
      for (const i of K.curves.sort(function (x, y) { return x - y; })) await trace(h, i, 900);
      for (const i of K.shapes.sort(function (x, y) { return I[x].cx - I[y].cx; })) {
        const it = items[i];
        if (!it.f || it.f === '#ffffff') await trace(h, i, 700); else await pop(h, [i], [I[i].cx, I[i].cy], 300);
      }
      const fly = C.fly && a !== 'vazio';
      for (const ar of K.arrows.sort(function (x, y) { return x.i - y.i; })) await arrow(h, ar, fly);
      let loose = K.dots; lastEnd = null;
      if (K.circles.length) loose = await chain(h, K.circles, K.dots, chainStart(a, b, K.circles));
      else if (K.dots.length > 8) loose = await chain(h, K.dots, [], chainStart(a, b, K.dots));   // marcas do caminho (VND_FL15)
      if (loose && loose.length) await pop(h, loose, [I[loose[0]].cx, I[loose[0]].cy], 260);
      await words(h, K.texts, lastEnd);
      if (lateSw.length) await h.all(lateSw.map(swap));
      if (K.other.length) await fadeIn(h, K.other, 300);
      if (C.cycle && C.cycle[b]) { await h.wait(300); await cycle(h, C.cycle[b]); }
      await h.wait(250);
    }

    return { snap: snap, play: play };
  });
})();
