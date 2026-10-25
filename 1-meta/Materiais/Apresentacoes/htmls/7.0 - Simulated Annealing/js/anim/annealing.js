/* Annealing (aula 7, slides 20–27): termômetro + caixas de átomos das figuras img/T1…T10.
 *
 * Os elementos são redesenhados a partir da geometria do PDF (js/anim/dados/annealing.js, gerado por
 * ferramentas/figura_annealing.py), então o estado final de cada slide é igual à figura original.
 * Estados: vazio, T1, T2, T3, T4, T6, T9, T10 (nomes das figuras).
 *
 *   vazio → T1  o termômetro surge e o mercúrio sobe (aquecimento); a caixa se desenha e os átomos
 *               brotam muito agitados, com as setas (energia) crescendo
 *   T1 → T2     as reticências surgem uma a uma (o tempo passa, mesma temperatura)
 *   T2 → T3     a caixa de equilíbrio se desenha; cópias dos átomos voam até ela e se reorganizam
 *   T3 → T4     a temperatura é reduzida: o equilíbrio some, o mercúrio desce e os átomos se rearranjam
 *               com setas menores (menos energia)
 *   T4 → T6     como T2 → T3
 *   T6 → T9     o mercúrio desce de novo; os átomos se juntam na grade; no equilíbrio a grade fica perfeita
 *               (núcleos vermelhos: energia mínima)
 *   T9 → T10    resfriamento brusco: o termômetro treme, os átomos "congelam" de repente em aglomerados e
 *               as lacunas (imperfeições) piscam em vermelho
 *
 * Enquanto o slide está na tela, os átomos da caixa "estado inicial" vibram com amplitude proporcional à
 * temperatura (bem menos na caixa de equilíbrio). Para capturas fiéis ao PDF: index.html?estatico
 */
(function () {
  'use strict';
  const A = window.Anim, S = A.svg, E = A.ease, lerp = A.lerp, D = window.ANNEALING_DATA;
  if (!A || !D) return;
  const RED = '#8b0000', MAIN = 'KaTeX_Main, serif', MATH = 'KaTeX_Math, serif', SC = 1.2, DX = 84;
  const AMP = { 1: 0.42, 2: 0.24, 3: 0.09 };          // vibração (pt) por temperatura
  const STATIC = /[?&]estatico\b/.test(location.search) || A.reduce;
  const quiet = function () {};
  const clamp01 = function (t) { return Math.max(0, Math.min(1, t)); };

  // ---------- modelo de cada figura ----------
  function model(name) {
    const d = D[name];
    if (!d) return null;
    const atoms = d.atoms.map(function (a) { return { x: a.x, y: a.y, box: a.box, core: 0, coreFill: RED, arrs: [] }; });
    d.cores.forEach(function (c) { atoms[c.atom].core = c.r; atoms[c.atom].coreFill = c.fill; });
    d.arrows.forEach(function (r) {
      atoms[r.atom].arrs.push({ x1: r.dx1, y1: r.dy1, x2: r.dx2, y2: r.dy2, head: r.head ? 1 : 0, w: r.w });
    });
    return { name: name, H: d.H, digit: +(d.texts.find(function (t) { return /^\d$/.test(t.t); }) || { t: 1 }).t,
      merc: d.merc, nbox: d.boxes.length, ndots: d.dots.length, atoms: atoms };
  }
  function copyAtom(a) {
    return { x: a.x, y: a.y, box: a.box, core: a.core, coreFill: a.coreFill, sc: 1, op: 1,
      arrs: a.arrs.map(function (r) { return { x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2, head: r.head, w: r.w }; }) };
  }
  // pares mais próximos (guloso); off = deslocamento aplicado aos alvos antes de medir
  function match(src, tgt, off) {
    const pairs = [];
    src.forEach(function (a, i) {
      tgt.forEach(function (b, j) { pairs.push([Math.hypot(a.x - (b.x - off), a.y - b.y), i, j]); });
    });
    pairs.sort(function (p, q) { return p[0] - q[0]; });
    const si = {}, tj = {}, res = [];
    pairs.forEach(function (p) { if (!(p[1] in si) && !(p[2] in tj)) { si[p[1]] = 1; tj[p[2]] = 1; res.push([p[1], p[2]]); } });
    return { pairs: res, lostSrc: src.map(function (_, i) { return i; }).filter(function (i) { return !(i in si); }),
      newTgt: tgt.map(function (_, j) { return j; }).filter(function (j) { return !(j in tj); }) };
  }

  A.define('annealing', function (host) {
    const states = (host.dataset.state || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    const last = model(states[states.length - 1]) || model('T1');
    const W = 185.201, H = last.H;
    const root = S('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Annealing: temperatura e arranjo dos átomos' });
    root.style.width = (W * SC) + 'pt'; root.style.height = (H * SC) + 'pt';
    host.appendChild(root);
    const frame = host.closest('section');

    // ---------- termômetro (ordem de desenho do PDF) ----------
    const gTherm = S('g', {}, root);
    D.T1.static.forEach(function (s) {
      const e = S('path', { d: s.d, fill: s.fill || 'none', 'stroke-width': s.w }, gTherm);
      if (s.stroke) e.setAttribute('stroke', s.stroke);
      if (s.eo) e.setAttribute('fill-rule', 'evenodd');
      if (s.cap === 1) e.setAttribute('stroke-linecap', 'round');
    });
    const M0 = D.T1.merc;
    const merc = S('rect', { x: M0.x0, width: M0.x1 - M0.x0, y: M0.y0, height: M0.y1 - M0.y0, fill: RED }, gTherm);
    D.T1.ticks.forEach(function (t) { S('path', { d: t.d, stroke: '#000', 'stroke-width': t.w, fill: 'none' }, gTherm); });
    const tT = S('text', { x: 1, y: 12.196, 'font-size': 9.963, 'font-family': MATH, 'font-style': 'italic', fill: '#000' }, gTherm);
    tT.textContent = 'T';
    const tDig = S('text', { x: 6.822, y: 13.69, 'font-size': 6.974, 'font-family': MAIN, fill: '#000' }, gTherm);
    const tDig2 = S('text', { x: 6.822, y: 13.69, 'font-size': 6.974, 'font-family': MAIN, fill: '#000' }, gTherm);
    const ice = S('circle', { cx: 17, cy: 68.2, r: 6.94, fill: '#3a8fd6', opacity: 0 }, gTherm);   // flash do resfriamento brusco

    // ---------- caixas, reticências, textos ----------
    const boxes = [D.T1.boxes[0], D.T3.boxes[1]].map(function (b) {
      return S('path', { d: b.d, fill: 'none', stroke: '#000', 'stroke-width': b.w }, root);
    });
    const dots = D.T2.dots.map(function (p) { return S('circle', { cx: p.x, cy: p.y, r: p.r, fill: '#000' }, root); });
    function word(t) {
      const e = S('text', { x: t.x, y: t.y, 'font-size': t.size, 'font-family': MAIN, fill: '#000' }, root);
      e.textContent = t.t; return e;
    }
    const txIni = D.T1.texts.filter(function (t) { return t.t === 'estado' || t.t === 'inicial'; }).map(word);
    const txEq = D.T3.texts.filter(function (t) { return t.t === 'equilibrio'; }).map(word);
    const gRing = S('g', {}, root), gArr = S('g', {}, root), gFx = S('g', {}, root);

    // ---------- átomos ----------
    let atoms = [], cur = null, heat = 1, running = false;
    function mkEls(a) {
      a.gr = S('g', {}, gRing);
      S('circle', { r: 1.5, fill: 'none', stroke: '#000', 'stroke-width': 0.6 }, a.gr);
      a.ce = S('circle', { r: 0, fill: a.coreFill }, a.gr);
      a.ga = S('g', {}, gArr);
      a.lines = []; a.heads = [];
    }
    function rmEls(a) { a.gr.remove(); a.ga.remove(); }
    function render(a, ox, oy) {
      const x = a.x + (ox || 0), y = a.y + (oy || 0);
      const tr = 'translate(' + x.toFixed(3) + ' ' + y.toFixed(3) + ')' + (a.sc !== 1 ? ' scale(' + Math.max(0.001, a.sc).toFixed(3) + ')' : '');
      a.gr.setAttribute('transform', tr); a.ga.setAttribute('transform', tr);
      a.gr.style.opacity = a.op === 1 ? '' : a.op; a.ga.style.opacity = a.op === 1 ? '' : a.op;
      a.ce.setAttribute('r', Math.max(0, a.core)); a.ce.setAttribute('fill', a.coreFill);
      while (a.lines.length < a.arrs.length) {
        a.lines.push(S('line', { stroke: RED, 'stroke-width': 0.4 }, a.ga));
        a.heads.push(S('polygon', { fill: RED, stroke: RED, 'stroke-width': 0.4 }, a.ga));
      }
      a.lines.forEach(function (l, k) {
        const r = a.arrs[k], h = a.heads[k];
        if (!r) { l.style.display = 'none'; h.style.display = 'none'; return; }
        const vx = r.x2 - r.x1, vy = r.y2 - r.y1, L = Math.hypot(vx, vy);
        l.style.display = L < 0.02 ? 'none' : '';
        l.setAttribute('x1', r.x1); l.setAttribute('y1', r.y1); l.setAttribute('x2', r.x2); l.setAttribute('y2', r.y2);
        if (r.head > 0.01 && L > 0.05) {
          const ux = vx / L, uy = vy / L, hl = Math.min(3, L) * r.head, hw = hl / 3;
          const bx = r.x2 - ux * hl, by = r.y2 - uy * hl;
          h.setAttribute('points', [r.x2, r.y2, bx - uy * hw, by + ux * hw, bx + uy * hw, by - ux * hw].map(function (v) { return v.toFixed(3); }).join(' '));
          h.style.display = '';
        } else h.style.display = 'none';
      });
    }
    function phase(i) { return [i * 2.399 % 6.283, i * 1.731 % 6.283, 2.1 + (i * 0.618 % 1) * 1.6, 2.5 + (i * 0.381 % 1) * 1.7]; }
    function renderAll(now) {
      const amp = (STATIC || !cur || !active()) ? 0 : (AMP[cur.digit] || 0) * heat, t = (now || performance.now()) / 1000;
      atoms.forEach(function (a, i) {
        if (!amp) { render(a, 0, 0); return; }
        const p = a.ph || (a.ph = phase(i)), k = a.box === 1 ? 0.3 : 1;
        render(a, amp * k * Math.sin(p[2] * t + p[0]), amp * k * Math.sin(p[3] * t + p[1]));
      });
    }
    function active() { return frame && frame.classList.contains('active') && !printing; }
    let raf = 0, printing = false;
    function loop(now) { raf = 0; renderAll(now); if (active() && !STATIC) raf = requestAnimationFrame(loop); }
    function startLoop() { if (!raf && !STATIC && active()) raf = requestAnimationFrame(loop); }
    if (frame) {
      frame.addEventListener('enter', function () { setTimeout(startLoop, 0); });
      frame.addEventListener('leave', function () { if (raf) cancelAnimationFrame(raf); raf = 0; setTimeout(function () { renderAll(); }, 0); });
    }
    window.addEventListener('beforeprint', function () { printing = true; renderAll(); });
    window.addEventListener('afterprint', function () { printing = false; startLoop(); });

    function setAtoms(list) { atoms.forEach(rmEls); atoms = list; atoms.forEach(mkEls); }
    function vis(e, on) { e.style.display = on ? '' : 'none'; e.style.opacity = ''; }
    function setMerc(y0) { merc.setAttribute('y', y0); merc.setAttribute('height', Math.max(0, M0.y1 - y0)); }

    function snap(name) {
      gFx.textContent = '';
      const m = model(name);
      cur = m; heat = 1;
      root.querySelectorAll('[transform]').forEach(function (e) { if (e.parentNode !== gRing && e.parentNode !== gArr) e.removeAttribute('transform'); });
      [gTherm].concat(boxes, dots, txIni, txEq).forEach(function (e) { e.style.strokeDasharray = ''; e.style.strokeDashoffset = ''; });
      ice.setAttribute('opacity', 0); tDig2.style.display = 'none';
      vis(gTherm, !!m);
      Array.prototype.forEach.call(gTherm.children, function (e) { if (e !== tDig2) { e.style.opacity = ''; e.style.display = ''; } });
      boxes.forEach(function (b, i) { vis(b, !!m && i < m.nbox); });
      dots.forEach(function (d, i) { vis(d, !!m && i < m.ndots); d.removeAttribute('transform'); });
      txIni.forEach(function (t) { vis(t, !!m); });
      txEq.forEach(function (t) { vis(t, !!m && m.nbox > 1); });
      if (m) { setMerc(m.merc.y0); tDig.textContent = String(m.digit); tDig.style.opacity = ''; tDig.removeAttribute('transform'); }
      setAtoms(m ? m.atoms.map(copyAtom) : []);
      renderAll();
      startLoop();
    }

    // ---------- pequenas animações ----------
    function fade(h, els, a, b, dur) {
      els.forEach(function (e) { e.style.display = ''; e.style.opacity = a; });
      return h.tween(dur, function (e) { els.forEach(function (x) { x.style.opacity = lerp(a, b, e); }); })
        .then(function () { els.forEach(function (x) { x.style.opacity = b === 1 ? '' : b; if (b === 0) x.style.display = 'none'; }); });
    }
    function trace(h, el, dur) {
      el.style.display = ''; el.style.opacity = '';
      const L = el.getTotalLength();
      el.style.strokeDasharray = L + ' ' + (L + 1); el.style.strokeDashoffset = L;
      return h.tween(dur, function (e) { el.style.strokeDashoffset = L * (1 - e); })
        .then(function () { el.style.strokeDasharray = ''; el.style.strokeDashoffset = ''; });
    }
    async function wordsIn(h, list, dur) {
      for (const w of list) {
        w.style.display = ''; w.style.opacity = 0;
        await h.tween(dur, function (e) { w.style.opacity = e; w.setAttribute('transform', 'translate(0 ' + (1.2 * (1 - e)) + ')'); }, E.out);
        w.style.opacity = ''; w.removeAttribute('transform');
      }
    }
    function stagger(h, n, dur, gap, fn, ez) {     // n itens, cada um com dur ms, começando a cada gap ms
      const total = dur + gap * Math.max(0, n - 1);
      return h.tween(total, function (_, t) {
        const ms = t * total;
        for (let i = 0; i < n; i++) fn(i, (ez || E.inOut)(clamp01((ms - i * gap) / dur)));
        renderAll();
      }, E.linear);
    }
    async function mercTo(h, m, dur, ez) {
      const y0 = +merc.getAttribute('y'), y1 = m.merc.y0, same = +tDig.textContent === m.digit;
      if (!same) { tDig2.textContent = String(m.digit); tDig2.style.display = ''; }
      await h.tween(dur, function (e, t) {
        setMerc(lerp(y0, y1, e));
        if (!same) {
          tDig.style.opacity = 1 - clamp01(t * 2); tDig.setAttribute('transform', 'translate(0 ' + (-2 * clamp01(t * 2)) + ')');
          const u = clamp01(t * 2 - 1);
          tDig2.style.opacity = u; tDig2.setAttribute('transform', 'translate(0 ' + (2 * (1 - u)) + ')');
        }
      }, ez || E.inOut);
      tDig.textContent = String(m.digit); tDig.style.opacity = ''; tDig.removeAttribute('transform'); tDig2.style.display = 'none';
    }
    function heatTo(h, v, dur) { const v0 = heat; return h.tween(dur, function (e) { heat = lerp(v0, v, e); }, E.inOut); }

    // átomos novos brotam (anel com "overshoot") e as setas crescem a partir do centro
    async function popIn(h, list, gap) {
      list.sort(function (p, q) { return p.y - q.y || p.x - q.x; });
      list.forEach(function (a) {
        a.tg = a.arrs.map(function (r) { return Object.assign({}, r); });
        a.sc = 0; a.arrs.forEach(function (r) { r.x2 = r.x1; r.y2 = r.y1; });
      });
      await stagger(h, list.length, 380, gap, function (i, e) { list[i].sc = E.back(e); }, E.linear);
      await stagger(h, list.length, 420, gap * 0.5, function (i, e) {
        const a = list[i];
        a.arrs.forEach(function (r, k) { const q = a.tg[k]; r.x2 = lerp(q.x1, q.x2, e); r.y2 = lerp(q.y1, q.y2, e); });
      }, E.out);
    }

    // transforma os átomos `src` (objetos vivos) nos alvos `tgt` (do modelo): casa os mais próximos,
    // os que sobram encolhem e somem, os que faltam brotam. arc = altura do arco (voo entre caixas)
    async function morph(h, src, tgt, opts) {
      opts = opts || {};
      const off = opts.off || 0, mm = match(src, tgt, off);
      const moves = mm.pairs.map(function (p) {
        const a = src[p[0]], b = tgt[p[1]];
        const n = Math.max(a.arrs.length, b.arrs.length);
        const z = function (r) { return r || { x1: 0, y1: 0, x2: 0, y2: 0, head: 0, w: 0.4 }; };
        while (a.arrs.length < n) a.arrs.push(z(null));
        return { a: a, b: b, x0: a.x, y0: a.y, c0: a.core, f0: a.coreFill,
          r0: a.arrs.map(function (r) { return Object.assign({}, r); }), r1: a.arrs.map(function (_, k) { return z(b.arrs[k]); }) };
      });
      moves.sort(function (p, q) { return (p.b.x + p.b.y * 0.3) - (q.b.x + q.b.y * 0.3); });
      const lost = mm.lostSrc.map(function (i) { return src[i]; });
      const born = mm.newTgt.map(function (j) {
        const a = copyAtom(tgt[j]); mkEls(a); atoms.push(a); return a;
      });
      born.forEach(function (a) { a.sc = 0; a.ph = phase(atoms.length + 7); });
      const dur = opts.dur || 900, gap = opts.gap != null ? opts.gap : 900 / Math.max(8, moves.length), arc = opts.arc || 0;
      const ez = opts.ease || E.inOut;
      const jobs = [stagger(h, moves.length, dur, gap, function (i, e) {
        const m = moves[i], a = m.a;
        a.x = lerp(m.x0, m.b.x, e); a.y = lerp(m.y0, m.b.y, e) - arc * Math.sin(Math.PI * e);
        a.core = lerp(m.c0, m.b.core, e); if (m.b.core) a.coreFill = m.b.coreFill;
        a.box = e > 0.5 ? m.b.box : a.box;
        a.arrs.forEach(function (r, k) {
          const p = m.r0[k], q = m.r1[k];
          r.x1 = lerp(p.x1, q.x1, e); r.y1 = lerp(p.y1, q.y1, e); r.x2 = lerp(p.x2, q.x2, e); r.y2 = lerp(p.y2, q.y2, e);
          r.head = lerp(p.head, q.head, e);
        });
      }, ez)];
      if (lost.length) jobs.push(h.tween(dur * 0.6, function (e) { lost.forEach(function (a) { a.sc = 1 - e; a.op = 1 - e; }); renderAll(); }));
      if (born.length) jobs.push(h.wait(dur * 0.35).then(function () {
        return stagger(h, born.length, 420, Math.min(40, 600 / born.length), function (i, e) { born[i].sc = E.back(e); }, E.linear);
      }));
      await h.all(jobs);
      lost.forEach(function (a) { rmEls(a); atoms.splice(atoms.indexOf(a), 1); });
    }

    // cópias dos átomos da caixa inicial voam até a caixa de equilíbrio e se reorganizam
    async function flow(h, tgtModel) {
      const src = atoms.filter(function (a) { return a.box === 0; });
      const copies = src.map(function (a) {
        const c = copyAtom(a); c.box = 0; c.ph = a.ph; mkEls(c); atoms.push(c); return c;
      });
      const tgt = tgtModel.atoms.filter(function (a) { return a.box === 1; });
      await morph(h, copies, tgt, { off: DX, dur: 1150, arc: 9, gap: Math.min(45, 1000 / Math.max(1, copies.length)) });
    }

    // ---------- passagem de um estado a outro ----------
    async function play(a, b, h) {
      const m0 = model(a), m1 = model(b);
      if (!m1) return;
      running = true;
      try {
        // entrada (slide 20): termômetro, aquecimento, caixa e átomos agitados
        if (!m0) {
          vis(gTherm, true); setMerc(M0.y1); tDig.style.opacity = 0;
          const parts = Array.prototype.slice.call(gTherm.children).filter(function (e) { return e !== merc && e !== ice && e !== tDig && e !== tDig2; });
          await fade(h, parts, 0, 1, 450);
          await h.all([mercTo(h, m1, 1100, E.out), h.tween(1100, function (e) { tDig.style.opacity = clamp01(e * 2 - 1); })]);
          await trace(h, boxes[0], 650);
          heat = 3.2;
          const list = m1.atoms.filter(function (x) { return x.box === 0; }).map(copyAtom);
          atoms.forEach(rmEls); atoms = list; list.forEach(mkEls); renderAll();
          await popIn(h, list.slice(), 45);
          await h.all([wordsIn(h, txIni, 230), heatTo(h, 1, 1600)]);
          cur = m1;
          return;
        }
        cur = m0;
        const brusco = a === 'T9' && b === 'T10';
        // o que sai: equilíbrio e reticências (a temperatura caiu: o processo recomeça do estado inicial)
        const resetEq = !brusco && m0.nbox > 1 && (m1.nbox < 2 || m0.digit !== m1.digit);
        const outs = [];
        if (resetEq) outs.push(boxes[1], txEq[0]);
        dots.forEach(function (d, i) { if (i < m0.ndots && (resetEq || i >= m1.ndots)) outs.push(d); });
        const goneAtoms = resetEq ? atoms.filter(function (x) { return x.box === 1; }) : [];
        if (outs.length || goneAtoms.length) {
          await h.all([fade(h, outs, 1, 0, 450), h.tween(450, function (e) { goneAtoms.forEach(function (x) { x.op = 1 - e; }); renderAll(); })]);
          goneAtoms.forEach(function (x) { rmEls(x); atoms.splice(atoms.indexOf(x), 1); });
        }
        if (brusco) {
          // resfriamento brusco: flash azul no bulbo e o termômetro treme
          await h.tween(650, function (e, t) {
            ice.setAttribute('opacity', 0.75 * Math.sin(Math.PI * t));
            gTherm.setAttribute('transform', 'translate(' + (0.9 * Math.sin(t * 40) * (1 - t)).toFixed(3) + ' 0)');
          }, E.linear);
          gTherm.removeAttribute('transform');
          // todos os átomos "congelam" de repente nas posições do material imperfeito
          const s0 = atoms.filter(function (x) { return x.box === 0; }), s1 = atoms.filter(function (x) { return x.box === 1; });
          const t0 = m1.atoms.filter(function (x) { return x.box === 0; }), t1 = m1.atoms.filter(function (x) { return x.box === 1; });
          await h.all([morph(h, s0, t0, { dur: 380, gap: 4, ease: E.out }), morph(h, s1, t1, { dur: 380, gap: 4, ease: E.out })]);
          cur = m1;
          await cracks(h, b);
          return;
        }
        // a temperatura muda: o mercúrio desce e os átomos da caixa inicial se rearranjam
        if (m0.digit !== m1.digit) {
          await h.all([mercTo(h, m1, 1000), heatTo(h, 1.6, 500)]);
          cur = m1;
        }
        const s0 = atoms.filter(function (x) { return x.box === 0; }), t0 = m1.atoms.filter(function (x) { return x.box === 0; });
        if (differs(s0, t0)) await h.all([morph(h, s0, t0, { dur: 1000 }), heatTo(h, 1, 1200)]);
        else heat = 1;
        cur = m1;
        // reticências: o tempo passa
        for (let i = resetEq ? 0 : m0.ndots; i < m1.ndots; i++) {
          const d = dots[i]; d.style.display = ''; d.style.opacity = '';
          await h.tween(260, function (e) {
            d.setAttribute('transform', 'translate(' + D.T2.dots[i].x + ' ' + D.T2.dots[i].y + ') scale(' + E.back(e) + ') translate(' + (-D.T2.dots[i].x) + ' ' + (-D.T2.dots[i].y) + ')');
          }, E.linear);
          d.removeAttribute('transform');
        }
        // equilíbrio
        if (m1.nbox > 1 && (m0.nbox < 2 || resetEq)) {
          await trace(h, boxes[1], 600);
          await flow(h, m1);
          await wordsIn(h, txEq, 260);
          if (m1.atoms.some(function (x) { return x.box === 1 && x.core; })) await glow(h);
        }
      } finally { running = false; }
    }
    function differs(src, tgt) {
      if (src.length !== tgt.length) return true;
      const mm = match(src, tgt, 0);
      return mm.pairs.some(function (p) { return Math.hypot(src[p[0]].x - tgt[p[1]].x, src[p[0]].y - tgt[p[1]].y) > 0.01; });
    }
    // grade perfeita: um brilho percorre os núcleos (energia mínima)
    function glow(h) {
      const list = atoms.filter(function (x) { return x.box === 1 && x.core; }).sort(function (p, q) { return (p.x + p.y) - (q.x + q.y); });
      const base = list.map(function (x) { return x.core; });
      return stagger(h, list.length, 380, 14, function (i, e) { list[i].core = base[i] * (1 + 0.9 * Math.sin(Math.PI * e)); }, E.linear);
    }
    // lacunas da grade (imperfeições) piscam em vermelho e somem
    async function cracks(h, name) {
      const m = model(name), pts = [];
      [0, 1].forEach(function (bx) {
        const at = m.atoms.filter(function (x) { return x.box === bx; });
        const xs = at.map(function (x) { return x.x; }), ys = at.map(function (x) { return x.y; });
        const x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
        for (let x = x0; x <= x1 + 0.01; x += 4) for (let y = y0; y <= y1 + 0.01; y += 4) {
          if (at.some(function (p) { return Math.abs(p.x - x) < 0.5 && Math.abs(p.y - y) < 0.5; })) continue;
          const occ = function (dx, dy) { return at.some(function (p) { return Math.abs(p.x - x - dx) < 0.5 && Math.abs(p.y - y - dy) < 0.5; }); };
          // fissura: lacuna com átomos dos dois lados (horizontal ou vertical, até 2 casas)
          const side = function (dx, dy) { return occ(dx, dy) || occ(2 * dx, 2 * dy); };
          if ((side(4, 0) && side(-4, 0)) || (side(0, 4) && side(0, -4))) pts.push([x, y]);
        }
      });
      const els = pts.map(function (p) {
        return S('circle', { cx: p[0], cy: p[1], r: 1.5, fill: 'none', stroke: '#d0281a', 'stroke-width': 0.5, 'stroke-dasharray': '0.8 0.6', opacity: 0 }, gFx);
      });
      await h.tween(1500, function (e, t) {
        const v = Math.sin(Math.PI * Math.min(1, t * 1.1)) * (0.65 + 0.35 * Math.sin(t * 6 * Math.PI));
        els.forEach(function (c) { c.setAttribute('opacity', Math.max(0, v).toFixed(3)); });
      }, E.linear);
      gFx.textContent = '';
    }

    return { snap: snap, play: play };
  });
})();
