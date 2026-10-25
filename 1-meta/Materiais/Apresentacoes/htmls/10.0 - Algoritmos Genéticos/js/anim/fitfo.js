/* Avaliação (aula 10, slide 64): do custo z (minimização) ao fitness f (“maior melhor”), passo a passo.
 *
 * O slide só tem texto: o frame ganha passos (data-steps="5"). Passo 1 = PDF. Nos passos 2–5 o conteúdo sai
 * (visibility) e a demonstração ocupa o .fc (como a demo do SA e a do AG):
 *   f2  5 soluções de um problema de minimização: barras do custo z(xᵢ) — menor é melhor. As barras podem ser
 *       arrastadas para mudar os custos (em todos os passos o resto é recalculado)
 *   f3  passo 1 do slide: bᵢ = 1/z(xᵢ). As barras se transformam (a ordem se inverte: o menor custo vira o
 *       maior bᵢ) e a tabela ganha a coluna b
 *   f4  passo 2: fᵢ = bᵢ / Σ b. As barras se normalizam (a soma é 100%) e a tabela ganha a coluna f e as somas
 *   f5  os fᵢ são as fatias da roleta: as barras viram fatias, o marcador cai e a roleta gira e escolhe uma solução
 *       (a linha da tabela acende). Observação: com 1/z, custos parecidos dão chances parecidas (razão das
 *       probabilidades da melhor e da pior = z_max / z_min)
 * Botões: custos de exemplo, "parecidos", "um bem melhor", "sortear" e, no passo 5, "girar".
 *
 * Uso: <span class="anim" data-anim="fitfo" data-state="f1,f2,f3,f4,f5"> no .fc, depois do conteúdo.
 */
(function () {
  'use strict';
  const A = window.Anim;
  if (!A) return;
  const S = A.svg, E = A.ease, lerp = A.lerp;
  const MAIN = 'KaTeX_Main, serif', MATH = 'KaTeX_Math, serif';
  const MYBLUE = '#0061a5', GRAY = '#888', HI = '#e0a000';
  const COLS = ['#3b6fb6', '#c0504d', '#4f9a4f', '#e08a00', '#8064a2'];
  const N = 5, ZMAX = 250, ZMIN = 20;
  const fmt = function (v, d) { return v.toFixed(d == null ? 0 : d).replace('.', ','); };
  const PRESETS = { exemplo: [120, 150, 90, 200, 160], parecidos: [150, 160, 145, 170, 155], melhor: [200, 210, 40, 190, 220] };

  A.define('fitfo', function (host) {
    const frame = host.closest('section'), fc = host.closest('.fc');
    const others = Array.prototype.filter.call(fc.children, function (c) { return c !== host; });
    host.setAttribute('data-interactive', '');
    host.style.cssText = 'position:absolute;left:0;top:0;line-height:0;display:none';
    const W = 403.7;
    let H = 200;
    const root = S('svg', { role: 'img', 'aria-label': 'Do custo ao fitness: b = 1/z e f = b / soma' });
    host.appendChild(root);
    let Z = PRESETS.exemplo.slice(), cur = 'f1', rot = 0, picked = -1;
    const el = {};
    const CH = { x0: 30, x1: 236, y0: 44, y1: 0 };
    let view = 'z';                                    // o que as barras mostram: 'z', 'b' ou 'f'

    // ---------- utilidades ----------
    function text(parent, x, y, s, o) {
      o = o || {};
      const t = S('text', { x: x, y: y, 'font-size': o.fs || 6.5, 'font-family': o.math ? MATH : MAIN, fill: o.c || '#222' }, parent);
      if (o.math) t.setAttribute('font-style', 'italic');
      if (o.anchor) t.setAttribute('text-anchor', o.anchor);
      if (o.bold) t.setAttribute('font-weight', 'bold');
      if (s != null) t.textContent = s;
      return t;
    }
    // texto com '$x$' em itálico matemático e '_{$i$}' subscrito
    function rich(parent, x, y, s, o) {
      const t = text(parent, x, y, null, o), fs = (o && o.fs) || 6.5;
      let down = 0;
      s.split(/(_\{[^}]*\})/).forEach(function (part) {
        if (!part) return;
        const sub = /^_\{/.test(part);
        if (sub) part = part.slice(2, -1);
        part.split('$').forEach(function (seg, k) {
          if (!seg) return;
          const at = k % 2 ? { 'font-family': MATH, 'font-style': 'italic' } : {};
          if (sub) { at['font-size'] = fs * 0.7; if (!down) { at.dy = fs * 0.25; down = fs * 0.25; } }
          else if (down) { at.dy = -down; down = 0; }
          S('tspan', at, t).textContent = seg;
        });
      });
      return t;
    }
    const halo = function (t, w) { t.setAttribute('stroke', '#fff'); t.setAttribute('stroke-width', w || 1.6); t.setAttribute('paint-order', 'stroke'); t.setAttribute('stroke-linejoin', 'round'); return t; };
    function button(parent, x, y, w, label, fn) {
      const g = S('g', { style: 'cursor:pointer' }, parent);
      S('rect', { x: x, y: y, width: w, height: 10, rx: 2, fill: '#eef3f9', stroke: MYBLUE, 'stroke-width': 0.5 }, g);
      text(g, x + w / 2, y + 7.1, label, { anchor: 'middle', fs: 6, c: MYBLUE });
      g.addEventListener('pointerdown', function (ev) { ev.preventDefault(); ev.stopPropagation(); fn(); });
      g.addEventListener('click', function (ev) { ev.stopPropagation(); });
      return g;
    }
    const B = function () { return Z.map(function (z) { return 1 / z; }); };
    const F = function () { const b = B(), s = b.reduce(function (a, v) { return a + v; }, 0); return b.map(function (v) { return v / s; }); };
    const vals = function (v) { return v === 'z' ? Z.slice() : v === 'b' ? B() : F(); };
    const top = function (v) { const a = vals(v); return v === 'z' ? ZMAX : Math.max.apply(null, a) * 1.15; };
    const lvl = function (st) { return { f1: 1, f2: 2, f3: 3, f4: 4, f5: 5 }[st]; };

    // ---------- montagem ----------
    function measure() {
      const k = frame.getBoundingClientRect().width / 453.543;
      if (!(k > 0) || !fc.offsetParent) return;
      H = Math.max(170, fc.getBoundingClientRect().height / k - 2);
    }
    function build(st) {
      root.textContent = '';
      root.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      root.style.width = W + 'pt'; root.style.height = H + 'pt';
      CH.y1 = H - 50;
      const L = lvl(st);
      text(root, 0, 8, 'Do custo ao fitness: 5 soluções de um problema de minimização', { fs: 7.5, bold: true, c: MYBLUE });
      el.formula = S('g', {}, root);
      // gráfico
      el.chart = S('g', {}, root);
      el.axis = S('path', { d: 'M' + CH.x0 + ' ' + CH.y0 + 'V' + CH.y1 + 'H' + CH.x1, fill: 'none', stroke: '#000', 'stroke-width': 0.45 }, el.chart);
      el.axLab = text(el.chart, CH.x0 - 3, CH.y0 - 3, '', { fs: 5.8, anchor: 'start' });
      el.axTop = text(el.chart, CH.x0 - 2, CH.y0 + 4, '', { fs: 5.2, anchor: 'end', c: '#555' });
      text(el.chart, CH.x0 - 2, CH.y1, '0', { fs: 5.2, anchor: 'end', c: '#555' });
      const bw = 24, gap = (CH.x1 - CH.x0) / N;
      el.bars = []; el.bl = []; el.xl = [];
      for (let i = 0; i < N; i++) {
        const x = CH.x0 + gap * i + (gap - bw) / 2;
        const r = S('rect', { x: x, y: CH.y1, width: bw, height: 0, fill: COLS[i], 'fill-opacity': 0.75, stroke: COLS[i], 'stroke-width': 0.5 }, el.chart);
        el.bars.push(r);
        el.bl.push(halo(text(el.chart, x + bw / 2, CH.y1 - 2, '', { fs: 5.8, anchor: 'middle', c: '#222' })));
        el.xl.push(rich(el.chart, x + bw / 2 - 3, CH.y1 + 7.5, '$x$_{' + (i + 1) + '}', { fs: 6.6 }));
        dragBar(r, i);
      }
      el.bx = function (i) { return CH.x0 + gap * i + (gap - bw) / 2; }; el.bw = bw;
      el.hint = text(el.chart, (CH.x0 + CH.x1) / 2, CH.y1 + 16, '', { fs: 5.3, anchor: 'middle', c: GRAY });
      // roleta (passo 5)
      el.pie = S('g', {}, root);
      el.pc = [(CH.x0 + CH.x1) / 2, (CH.y0 + CH.y1) / 2]; el.pr = Math.min(52, (CH.y1 - CH.y0) / 2);
      // tabela
      const TX = 256;
      el.table = S('g', {}, root);
      S('rect', { x: TX - 4, y: CH.y0 - 10, width: W - TX + 4, height: 82, rx: 2, fill: '#f6f8fc', stroke: '#c9d6ea', 'stroke-width': 0.5 }, el.table);
      const cx = [TX + 6, TX + 38, TX + 80, TX + 118];
      rich(el.table, cx[0] - 4, CH.y0, 'sol.', { fs: 6.2, bold: true });
      rich(el.table, cx[1] - 10, CH.y0, '$z$($x$_{$i$})', { fs: 6.2 });
      el.hb = rich(el.table, cx[2] - 13, CH.y0, '$b$_{$i$} = 1/$z$', { fs: 6.2 });
      el.hf = rich(el.table, cx[3] - 12, CH.y0, '$f$_{$i$} = $b$_{$i$}/Σ$b$', { fs: 6.2 });
      el.rows = [];
      for (let i = 0; i < N; i++) {
        const y = CH.y0 + 11 + 10.5 * i;
        const hl = S('rect', { x: TX - 2, y: y - 7.5, width: W - TX, height: 10, rx: 1.5, fill: HI, 'fill-opacity': 0, }, el.table);
        S('rect', { x: cx[0] - 4, y: y - 5.5, width: 5, height: 5, fill: COLS[i], 'fill-opacity': 0.75 }, el.table);
        rich(el.table, cx[0] + 3, y, '$x$_{' + (i + 1) + '}', { fs: 6.2 });
        el.rows.push({ hl: hl, z: text(el.table, cx[1] + 12, y, '', { fs: 6.2, anchor: 'end' }), b: text(el.table, cx[2] + 18, y, '', { fs: 6.2, anchor: 'end' }), f: text(el.table, cx[3] + 22, y, '', { fs: 6.2, anchor: 'end' }) });
      }
      const ys = CH.y0 + 11 + 10.5 * N + 1;
      S('line', { x1: TX, x2: W - 4, y1: ys - 7.5, y2: ys - 7.5, stroke: '#99a', 'stroke-width': 0.4 }, el.table);
      el.sumL = rich(el.table, cx[0] - 4, ys, 'Σ', { fs: 6.2, bold: true });
      el.sb = text(el.table, cx[2] + 18, ys, '', { fs: 6.2, anchor: 'end', bold: true });
      el.sf = text(el.table, cx[3] + 22, ys, '', { fs: 6.2, anchor: 'end', bold: true });
      // botões
      const by = CH.y0 + 80;
      text(root, TX - 4, by - 2.5, 'custos:', { fs: 5.8, c: '#555' });
      button(root, TX - 4, by, 32, 'exemplo', function () { setZ(PRESETS.exemplo); });
      button(root, TX + 30.5, by, 36, 'parecidos', function () { setZ(PRESETS.parecidos); });
      button(root, TX + 69, by, 47, 'um bem melhor', function () { setZ(PRESETS.melhor); });
      button(root, TX + 118.5, by, 29, 'sortear', function () { setZ(Z.map(function () { return Math.round(60 + Math.random() * 170); })); });
      el.spinB = button(root, TX - 4, by + 13, 60, '↻ girar a roleta', function () { spinOwn(); });
      el.note = S('g', {}, root);
      // legenda
      el.cap = S('g', {}, root);
      draw(st);
    }

    // ---------- desenho ----------
    function setFormula(L) {
      el.formula.textContent = '';
      const s = {
        2: 'custo $z$($x$_{$i$}): menor é melhor — mas a seleção precisa de “maior melhor”',
        3: 'passo 1:   $b$_{$i$} = 1 / $z$($x$_{$i$})   (o inverso do custo)',
        4: 'passo 2:   $f$_{$i$} = $b$_{$i$} / Σ_{$j$} $b$_{$j$}   (divide pela soma: Σ $f$ = 100%)',
        5: 'os $f$_{$i$} são as fatias da roleta:   P(escolher $x$_{$i$}) = $f$_{$i$}'
      }[L] || '';
      rich(el.formula, 0, 22, s, { fs: 8.4, c: '#222' });
    }
    function setCaption(L) {
      el.cap.textContent = '';
      const f = F(), zs = Z.slice(), ib = zs.indexOf(Math.min.apply(null, zs)), iw = zs.indexOf(Math.max.apply(null, zs));
      const lines = {
        2: ['A melhor solução é a de menor custo ($x$_{' + (ib + 1) + '}, $z$ = ' + Z[ib] + '). Mas a roleta dá mais chance a quem tem o MAIOR valor:',
            'é preciso transformar o custo num fitness “maior melhor”. (Arraste as barras para mudar os custos.)'],
        3: ['O inverso troca a ordem: o menor custo vira o maior $b$ ($x$_{' + (ib + 1) + '}) e o maior custo, o menor ($x$_{' + (iw + 1) + '}).',
            'Os $b$_{$i$} ainda não somam 1: não dá para usá-los direto como probabilidades.'],
        4: ['Dividindo pela soma, os $f$_{$i$} somam 100%: são as probabilidades de seleção. $x$_{' + (ib + 1) + '} tem ' + fmt(f[ib] * 100, 1) + '% e $x$_{' + (iw + 1) + '}, ' + fmt(f[iw] * 100, 1) + '%.',
            'Razão melhor / pior = $z$_{max} / $z$_{min} = ' + fmt(Z[iw] / Z[ib], 2) + ': com 1/$z$, custos parecidos dão chances parecidas (pressão de seleção fraca).'],
        5: ['A melhor tem a maior fatia, mas todas podem ser escolhidas — é a ideia da seleção (slides 66–68).',
            'Razão melhor / pior = $z$_{max} / $z$_{min} = ' + fmt(Z[iw] / Z[ib], 2) + '.   Gire a roleta para sortear um pai.']
      }[L] || ['', ''];
      lines.forEach(function (s, k) { rich(el.cap, 0, H - 22 + 8.5 * k, s, { fs: 6.3, c: '#333' }); });
    }
    function barsTo(v, hs) {                            // altura de cada barra (pt) para a vista v
      const a = vals(v), t = top(v), Hc = CH.y1 - CH.y0;
      return hs || a.map(function (x) { return Hc * x / t; });
    }
    function setBars(heights, v) {
      const a = vals(v);
      heights.forEach(function (h, i) {
        el.bars[i].setAttribute('y', CH.y1 - h); el.bars[i].setAttribute('height', Math.max(0, h));
        el.bl[i].setAttribute('y', CH.y1 - h - 2);
        el.bl[i].textContent = v === 'z' ? String(Z[i]) : v === 'b' ? fmt(a[i] * 1000, 2) : fmt(a[i] * 100, 1) + '%';
      });
      el.axLab.textContent = v === 'z' ? 'custo z' : v === 'b' ? 'b = 1/z (×1000)' : 'f (%)';
      el.axTop.textContent = v === 'z' ? String(ZMAX) : v === 'b' ? fmt(top(v) * 1000, 1) : fmt(top(v) * 100) + '%';
      el.hint.textContent = view === 'z' && lvl(cur) === 2 ? 'arraste as barras para mudar os custos' : 'arraste as barras: muda o custo z';
    }
    function setTable(L) {
      const b = B(), f = F();
      el.rows.forEach(function (r, i) {
        r.z.textContent = String(Z[i]);
        r.b.textContent = L >= 3 ? fmt(b[i], 4) : '';
        r.f.textContent = L >= 4 ? fmt(f[i] * 100, 1) + '%' : '';
        r.hl.setAttribute('fill-opacity', i === picked && L >= 5 ? 0.35 : 0);
      });
      el.hb.style.display = L >= 3 ? '' : 'none'; el.hf.style.display = L >= 4 ? '' : 'none';
      el.sb.textContent = L >= 3 ? fmt(b.reduce(function (a, v) { return a + v; }, 0), 4) : '';
      el.sf.textContent = L >= 4 ? '100%' : '';
      el.sumL.style.display = L >= 3 ? '' : 'none';
    }
    function arc(c, r, a0, a1) {
      const p = function (a) { return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]; }, s = p(a0), e = p(a1);
      return 'M' + c[0] + ' ' + c[1] + 'L' + s[0].toFixed(2) + ' ' + s[1].toFixed(2) + 'A' + r + ' ' + r + ' 0 ' + (a1 - a0 > Math.PI ? 1 : 0) + ' 1 ' + e[0].toFixed(2) + ' ' + e[1].toFixed(2) + 'Z';
    }
    function drawPie(frac) {                             // frac: quanto de cada fatia já abriu (0..1)
      el.pie.textContent = '';
      const f = F(), c = el.pc, r = el.pr;
      const g = el.pieG = S('g', { transform: 'rotate(' + rot.toFixed(2) + ' ' + c[0] + ' ' + c[1] + ')' }, el.pie);
      let a = -Math.PI / 2;
      f.forEach(function (v, i) {
        const span = 2 * Math.PI * v, e = frac == null ? 1 : Math.max(0, Math.min(1, frac * N - i));
        if (e > 0) S('path', { d: arc(c, r, a, a + span * e), fill: COLS[i], 'fill-opacity': 0.75, stroke: '#fff', 'stroke-width': 0.6 }, g);
        if (e >= 1) {
          const m = a + span / 2, lx = c[0] + r * 0.62 * Math.cos(m), ly = c[1] + r * 0.62 * Math.sin(m);
          const t = rich(g, lx - 4, ly + 2, '$x$_{' + (i + 1) + '}', { fs: 6.2 });
          t.setAttribute('transform', 'rotate(' + (-rot).toFixed(2) + ' ' + lx + ' ' + ly + ')');
          halo(t, 1.4);
        }
        a += span;
      });
      // marcador à direita, apontando para o centro
      const mx = c[0] + r + 2, my = c[1];
      el.marker = S('path', { d: 'M' + mx + ' ' + my + 'L' + (mx + 7) + ' ' + (my - 3.5) + 'L' + (mx + 7) + ' ' + (my + 3.5) + 'Z', fill: '#333', 'fill-opacity': 0.85 }, el.pie);
    }
    function sliceAt() {                                 // fatia sob o marcador (ângulo 0) com a rotação atual
      const f = F();
      let phi = ((0 - rot * Math.PI / 180 + Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI), acc = 0;
      for (let i = 0; i < N; i++) { acc += 2 * Math.PI * f[i]; if (phi < acc) return i; }
      return N - 1;
    }
    function draw(st) {
      const L = lvl(st);
      view = L <= 2 ? 'z' : L === 3 ? 'b' : 'f';
      setFormula(L); setCaption(L); setTable(L);
      el.chart.style.display = L === 5 ? 'none' : '';
      el.spinB.style.display = L === 5 ? '' : 'none';
      if (L === 5) drawPie(); else { el.pie.textContent = ''; setBars(barsTo(view), view); }
    }
    function setZ(z) { Z = z.map(function (v) { return Math.max(ZMIN, Math.min(ZMAX, Math.round(v))); }); picked = -1; if (host.style.display !== 'none') draw(cur); }

    // arrastar uma barra muda o custo (em qualquer vista, a barra arrastada é o custo z)
    function dragBar(r, i) {
      r.style.cursor = 'ns-resize';
      let on = false;
      const yOf = function (ev) { const m = root.getScreenCTM(); if (!m) return null; const p = root.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; return p.matrixTransform(m.inverse()).y; };
      r.addEventListener('pointerdown', function (ev) { ev.preventDefault(); ev.stopPropagation(); on = true; r.setPointerCapture(ev.pointerId); });
      r.addEventListener('pointermove', function (ev) {
        if (!on) return;
        const y = yOf(ev); if (y == null) return;
        const frac = (CH.y1 - y) / (CH.y1 - CH.y0);
        let z;
        if (view === 'z') z = frac * ZMAX;
        else {   // nas vistas b e f, subir a barra = diminuir o custo (valor proporcional a 1/z)
          const t = top(view), v = Math.max(1e-6, frac * t), others = Z.filter(function (_, j) { return j !== i; });
          if (view === 'b') z = 1 / v;
          else { const so = others.reduce(function (a, q) { return a + 1 / q; }, 0); z = (1 - Math.min(0.95, v)) / (Math.min(0.95, v) * so); }
        }
        Z[i] = Math.max(ZMIN, Math.min(ZMAX, Math.round(z)));
        draw(cur);
      });
      const end = function () { on = false; };
      r.addEventListener('pointerup', end); r.addEventListener('pointercancel', end);
      r.addEventListener('click', function (ev) { ev.stopPropagation(); });
    }

    // ---------- giro (botão) ----------
    let spinGen = 0;
    function spinOwn() {
      const g = ++spinGen, from = rot, to = rot + 720 + Math.random() * 360, t0 = performance.now(), dur = A.reduce ? 0 : 2400;
      picked = -1; setTable(5);
      (function fr(now) {
        if (g !== spinGen) return;
        const t = dur ? Math.min(1, (now - t0) / dur) : 1, e = 1 - Math.pow(1 - t, 3);
        rot = lerp(from, to, e); drawPie();
        if (t < 1) requestAnimationFrame(fr);
        else { rot = to % 360; picked = sliceAt(); drawPie(); setTable(5); }
      })(t0);
    }

    // ---------- estados ----------
    function place(on) {
      others.forEach(function (c) { c.style.visibility = on ? 'hidden' : ''; c.style.opacity = ''; });
      host.style.display = on ? '' : 'none';
    }
    function snap(st) {
      spinGen++; cur = st;
      if (st === 'f1') { place(false); root.style.opacity = ''; return; }
      place(true); measure(); build(st); root.style.opacity = '';
    }
    async function play(a, b, h) {
      spinGen++; cur = b;
      const La = lvl(a), Lb = lvl(b);
      if (Lb === 1) { snap(b); return; }
      if (La === 1 && Lb === 2) {
        others.forEach(function (c) { c.style.visibility = ''; });
        await h.tween(400, function (e) { others.forEach(function (c) { c.style.opacity = 1 - e; }); });
        others.forEach(function (c) { c.style.visibility = 'hidden'; c.style.opacity = ''; });
        host.style.display = ''; measure(); build('f2'); root.style.opacity = 0;
        const hs = barsTo('z');
        setBars(hs.map(function () { return 0; }), 'z');
        await h.tween(300, function (e) { root.style.opacity = e; });
        await h.tween(700, function (e) { setBars(hs.map(function (x, i) { return x * Math.max(0, Math.min(1, e * 1.6 - i * 0.15)); }), 'z'); });
        setBars(hs, 'z');
        return;
      }
      if (Lb === La + 1 && (Lb === 3 || Lb === 4)) {
        place(true); measure(); build(a);
        const v0 = La === 2 ? 'z' : 'b', v1 = Lb === 3 ? 'b' : 'f';
        const h0 = barsTo(v0), h1 = barsTo(v1);
        setFormula(Lb); setCaption(Lb); view = v1;
        // as barras mudam de altura uma a uma; a coluna nova da tabela aparece junto
        const col = Lb === 3 ? 'b' : 'f', bb = B(), ff = F();
        el.rows.forEach(function (r) { r[col].textContent = ''; });
        (Lb === 3 ? el.hb : el.hf).style.display = '';
        if (Lb === 3) el.sumL.style.display = '';
        await h.tween(900, function (e) {
          setBars(h0.map(function (x, i) { const t = Math.max(0, Math.min(1, e * 1.8 - i * 0.2)); return lerp(x, h1[i], E.inOut(t)); }), e < 0.5 ? v0 : v1);
          el.rows.forEach(function (r, i) {
            if (e * 1.8 - i * 0.2 >= 0.5) r[col].textContent = col === 'b' ? fmt(bb[i], 4) : fmt(ff[i] * 100, 1) + '%';
          });
        }, E.linear);
        draw(b);
        if (Lb === 3) await h.tween(300, function (e) { el.sb.setAttribute('opacity', e); });
        else await h.tween(300, function (e) { el.sf.setAttribute('opacity', e); });
        return;
      }
      if (La === 4 && Lb === 5) {
        place(true); measure(); build('f4');
        setFormula(5); setCaption(5);
        // as barras deitam numa faixa única (100%) e a faixa vira a roleta
        const f = F(), y = CH.y1 - 14, w = CH.x1 - CH.x0;
        const from = el.bars.map(function (r) { return [+r.getAttribute('x'), +r.getAttribute('y'), +r.getAttribute('width'), +r.getAttribute('height')]; });
        let acc = 0;
        const to = f.map(function (v) { const r = [CH.x0 + acc * w, y, v * w, 12]; acc += v; return r; });
        el.bl.forEach(function (t) { t.style.display = 'none'; });
        await h.tween(800, function (e) {
          el.bars.forEach(function (r, i) {
            const q = from[i].map(function (v, k) { return lerp(v, to[i][k], e); });
            r.setAttribute('x', q[0]); r.setAttribute('y', q[1]); r.setAttribute('width', q[2]); r.setAttribute('height', q[3]);
          });
        });
        await h.wait(250);
        await h.tween(300, function (e) { el.chart.setAttribute('opacity', 1 - e); });
        el.chart.style.display = 'none'; el.chart.removeAttribute('opacity');
        rot = 0;
        await h.tween(900, function (e) { drawPie(e); }, E.linear);
        drawPie(); el.spinB.style.display = '';
        setTable(5);
        // a roleta gira uma vez
        const r0 = rot, r1 = rot + 720 + Math.random() * 360;
        await h.tween(2400, function (e) { rot = lerp(r0, r1, e); drawPie(); }, function (t) { return 1 - Math.pow(1 - t, 3); });
        rot = r1 % 360; picked = sliceAt(); drawPie(); setTable(5);
        return;
      }
      snap(b);
    }
    return { snap: snap, play: play };
  });
})();
