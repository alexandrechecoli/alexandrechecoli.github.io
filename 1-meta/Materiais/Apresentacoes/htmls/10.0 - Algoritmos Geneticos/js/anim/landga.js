/* Convergência no fitness landscape (aula 10, slide 56): um AG de verdade sobre uma superfície 3D.
 *
 * Passo 1 = figura do PDF (img/fitness_landscape.png, três quadros I, II e III). No passo 2 a figura sai e a
 * demonstração ocupa o .fc (como a do slide 64):
 *   superfície parecida com a da figura (picos e vales em grade, subindo até o canto vermelho), desenhada num
 *   <canvas> com o algoritmo do pintor e o colormap "hot" do pgfplots (como o surface3d da aula 5);
 *   30 indivíduos (pontos azuis) e um AG real: elitismo (2), torneio binário, cruzamento uniforme (cada
 *   coordenada vem de um dos pais), mutação gaussiana. Na troca de geração cada filho sai do lugar do pai;
 *   a fase aparece como na figura: I (população inicial espalhada), II (agrupando-se nos picos) e III
 *   (≥ 80% da população perto do melhor: convergiu).
 * Painel: geração, melhor e média (com o gráfico por geração) e os botões "próxima geração", "▶ rodar" e
 * "↺ nova população". Arrastar a superfície gira a vista; duplo clique volta à vista inicial.
 *
 * Uso: <section data-steps="2"> ... <span class="anim" data-anim="landga" data-state="l1,l2"> no .fc.
 */
(function () {
  'use strict';
  const A = window.Anim;
  if (!A) return;
  const S = A.svg, E = A.ease, lerp = A.lerp;
  const MAIN = 'KaTeX_Main, serif', SANS = 'Verdana, sans-serif';
  const MYBLUE = '#0061a5', DARKRED = '#5c0a0a', DOT = '#0b1773';
  const D2R = Math.PI / 180, AZ0 = 22, EL0 = 24;

  // superfície: tendência crescente em x + picos e vales em grade (5 ao longo de x, 3 ao longo de y)
  const FN = function (x, y) { return 0.9 * x * x + 0.08 * y + 0.22 * Math.sin(5 * Math.PI * x) * Math.cos(2 * Math.PI * y); };
  const NG = 36;                                       // malha NG × NG
  const POP = 30, ELITE = 2, PC = 0.9, PM = 0.2, SIG = 0.03;
  const FMIN = -0.25, FMAX = 1.12;                     // faixa (aprox.) de FN, para as cores e a altura

  // colormap "hot" do pgfplots: azul -> amarelo -> laranja -> vermelho
  function hot(t) {
    t = Math.max(0, Math.min(1, t));
    if (t < 1 / 3) { const s = t * 3; return [s, s, 1 - s]; }
    if (t < 2 / 3) { const s = (t - 1 / 3) * 3; return [1, 1 - 0.5 * s, 0]; }
    const s = (t - 2 / 3) * 3; return [1, 0.5 - 0.5 * s, 0];
  }
  const rgb = function (c, k) { k = k == null ? 1 : k; return 'rgb(' + Math.round(c[0] * 255 * k) + ',' + Math.round(c[1] * 255 * k) + ',' + Math.round(c[2] * 255 * k) + ')'; };
  const fmt = function (v) { return v.toFixed(2).replace('.', ','); };

  A.define('landga', function (host) {
    const frame = host.closest('section'), fc = host.closest('.fc');
    const others = Array.prototype.filter.call(fc.children, function (c) { return c !== host; });
    host.setAttribute('data-interactive', '');
    host.style.cssText = 'position:absolute;left:0;top:0;line-height:0;display:none';
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;cursor:grab;touch-action:none';
    host.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const root = S('svg', { role: 'img', 'aria-label': 'Algoritmo genético convergindo no fitness landscape' });
    root.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none';
    host.appendChild(root);

    let W = 400, H = 220, PW = 280, k = 1;            // tamanho do .fc (pt), largura da área do gráfico, px/pt
    let view = { az: AZ0, el: EL0 }, sc = 100, C = [140, 120];
    const el = {};

    // ---------- malha ----------
    const G = [];
    for (let i = 0; i < NG; i++) { G.push([]); for (let j = 0; j < NG; j++) G[i].push(FN(i / (NG - 1), j / (NG - 1))); }
    // caixa: x de -0,5 a 0,5 (comprimento 1), y de -0,3 a 0,3, z de -0,26 a 0,26
    const BY = 0.3, BZ = 0.26;
    const Wz = function (f) { return ((f - FMIN) / (FMAX - FMIN) - 0.5) * 2 * BZ; };
    function proj(u, v, w) {
      const az = view.az * D2R, el2 = view.el * D2R;
      const xr = u * Math.cos(az) + v * Math.sin(az), yr = -u * Math.sin(az) + v * Math.cos(az);
      return [C[0] + sc * xr, C[1] - sc * (w * Math.cos(el2) + yr * Math.sin(el2))];
    }
    function depth(u, v, w) {                          // maior = mais perto de quem olha
      const az = view.az * D2R, el2 = view.el * D2R;
      const yr = -u * Math.sin(az) + v * Math.cos(az);
      return -yr * Math.cos(el2) + w * Math.sin(el2);
    }
    const UX = function (x) { return x - 0.5; }, VY = function (y) { return (y - 0.5) * 2 * BY; };

    // ---------- AG ----------
    let rnd = Math.random;
    const gauss = function () { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
    let pop = [], gen = 0, hist = [], from = null, tAnim = 1;
    const fit = function (p) { return FN(p[0], p[1]); };
    function newPop() {
      pop = []; for (let i = 0; i < POP; i++) pop.push([rnd(), rnd()]);
      gen = 0; hist = [stats()]; from = null; tAnim = 1;
    }
    function stats() {
      const f = pop.map(fit), best = Math.max.apply(null, f), mean = f.reduce(function (a, b) { return a + b; }, 0) / f.length;
      const bi = f.indexOf(best), b = pop[bi];
      const share = pop.filter(function (p) { return Math.hypot(p[0] - b[0], p[1] - b[1]) < 0.12; }).length / pop.length;
      return { best: best, mean: mean, share: share };
    }
    const phase = function () { return gen === 0 ? 'I' : hist[hist.length - 1].share >= 0.8 ? 'III' : 'II'; };
    function step() {
      const order = pop.map(function (p, i) { return i; }).sort(function (a, b) { return fit(pop[b]) - fit(pop[a]); });
      const tour = function () { const a = Math.floor(rnd() * POP), b = Math.floor(rnd() * POP); return fit(pop[a]) >= fit(pop[b]) ? a : b; };
      const next = [], src = [];
      for (let e = 0; e < ELITE; e++) { next.push(pop[order[e]].slice()); src.push(pop[order[e]].slice()); }
      while (next.length < POP) {
        const a = tour(), b = tour();
        let c = pop[a].slice();
        if (rnd() < PC) c = [rnd() < 0.5 ? pop[a][0] : pop[b][0], rnd() < 0.5 ? pop[a][1] : pop[b][1]];
        c = c.map(function (v) { return Math.max(0, Math.min(1, rnd() < PM ? v + SIG * gauss() : v)); });
        next.push(c); src.push(pop[a].slice());
      }
      from = src; pop = next; gen++; hist.push(stats()); tAnim = 0;
    }

    // ---------- desenho ----------
    function measure() {
      k = frame.getBoundingClientRect().width / 453.543;
      if (!(k > 0) || !fc.offsetParent) return;
      const r = fc.getBoundingClientRect();
      W = r.width / k; H = Math.max(180, r.height / k - 2);
      PW = W - 128;
      // escala: a caixa na vista inicial ocupa a área do gráfico
      const v0 = view; view = { az: AZ0, el: EL0 }; sc = 1; C = [0, 0];
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      [-0.5, 0.5].forEach(function (u) { [-BY, BY].forEach(function (v) { [-BZ, BZ].forEach(function (w) {
        const p = proj(u, v, w); x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]);
      }); }); });
      sc = Math.min((PW - 30) / (x1 - x0), (H - 46) / (y1 - y0));
      C = [18 + (PW - 18) / 2 - sc * (x0 + x1) / 2, 20 + (H - 46) / 2 - sc * (y0 + y1) / 2];
      view = v0;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(PW * k * dpr); canvas.height = Math.round(H * k * dpr);
      canvas.style.width = PW + 'pt'; canvas.style.height = H + 'pt';         // o frame já é escalado (transform)
      ctx.setTransform(k * dpr, 0, 0, k * dpr, 0, 0);
    }
    function drawBox(front) {
      const az = view.az * D2R, el2 = view.el * D2R;
      const Dv = [Math.sin(az) * Math.cos(el2), -Math.cos(az) * Math.cos(el2), Math.sin(el2)];   // direção de quem olha
      const half = [0.5, BY, BZ];
      const faces = [[0, -1], [0, 1], [1, -1], [1, 1], [2, -1], [2, 1]];
      const edges = {};
      faces.forEach(function (fc2) {
        const ax = fc2[0], sg = fc2[1];
        const facing = sg * Dv[ax] > 0;                 // a face está do lado de quem olha
        if (facing !== front) return;
        const o = [0, 1, 2].filter(function (a) { return a !== ax; });
        const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(function (q) {
          const p = [0, 0, 0]; p[ax] = sg * half[ax]; p[o[0]] = q[0] * half[o[0]]; p[o[1]] = q[1] * half[o[1]]; return p;
        });
        for (let i = 0; i < 4; i++) { const a = cs[i], b = cs[(i + 1) % 4]; edges[[a, b].map(String).sort().join('|')] = [a, b]; }
      });
      ctx.strokeStyle = front ? 'rgba(0,0,0,0.55)' : '#000'; ctx.lineWidth = 0.45;
      ctx.beginPath();
      Object.keys(edges).forEach(function (key) {
        const a = proj.apply(null, edges[key][0]), b = proj.apply(null, edges[key][1]);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      });
      ctx.stroke();
    }
    function curPos(i) {
      const p = pop[i];
      if (!from || tAnim >= 1) return p;
      const q = from[i], t = E.inOut(tAnim);
      return [lerp(q[0], p[0], t), lerp(q[1], p[1], t)];
    }
    function draw() {
      if (host.style.display === 'none') return;
      ctx.clearRect(0, 0, PW, H);
      drawBox(false);
      const list = [];
      for (let i = 0; i < NG - 1; i++) for (let j = 0; j < NG - 1; j++) {
        const zc = (G[i][j] + G[i + 1][j] + G[i + 1][j + 1] + G[i][j + 1]) / 4;
        list.push({ q: 1, i: i, j: j, d: depth(UX((i + 0.5) / (NG - 1)), VY((j + 0.5) / (NG - 1)), Wz(zc)), c: hot((zc - FMIN) / (FMAX - FMIN)) });
      }
      for (let n = 0; n < pop.length; n++) {
        const p = curPos(n), z = FN(p[0], p[1]);
        list.push({ q: 0, p: p, w: Wz(z), d: depth(UX(p[0]), VY(p[1]), Wz(z)) + 0.02 });
      }
      list.sort(function (a, b) { return a.d - b.d; });
      ctx.lineJoin = 'round';
      list.forEach(function (o) {
        if (o.q) {
          const i = o.i, j = o.j, u0 = UX(i / (NG - 1)), u1 = UX((i + 1) / (NG - 1)), v0 = VY(j / (NG - 1)), v1 = VY((j + 1) / (NG - 1));
          const p = [proj(u0, v0, Wz(G[i][j])), proj(u1, v0, Wz(G[i + 1][j])), proj(u1, v1, Wz(G[i + 1][j + 1])), proj(u0, v1, Wz(G[i][j + 1]))];
          ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
          for (let m = 1; m < 4; m++) ctx.lineTo(p[m][0], p[m][1]);
          ctx.closePath();
          ctx.fillStyle = rgb(o.c); ctx.fill();
          ctx.strokeStyle = rgb(o.c, 0.8); ctx.lineWidth = 0.25; ctx.stroke();
        } else {
          const s = proj(UX(o.p[0]), VY(o.p[1]), o.w);
          ctx.beginPath(); ctx.arc(s[0], s[1], 1.6, 0, 2 * Math.PI);
          ctx.fillStyle = DOT; ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.35; ctx.stroke();
        }
      });
      drawBox(true);
    }

    // ---------- painel (SVG) ----------
    function text(parent, x, y, s, o) {
      o = o || {};
      const t = S('text', { x: x, y: y, 'font-size': o.fs || 6.5, 'font-family': o.ff || MAIN, fill: o.c || '#222' }, parent);
      if (o.anchor) t.setAttribute('text-anchor', o.anchor);
      if (o.bold) t.setAttribute('font-weight', 'bold');
      if (o.rot) t.setAttribute('transform', 'rotate(-90 ' + x + ' ' + y + ')');
      if (s != null) t.textContent = s;
      return t;
    }
    function button(parent, x, y, w, label, fn) {
      const g = S('g', { style: 'cursor:pointer;pointer-events:all' }, parent);
      const r = S('rect', { x: x, y: y, width: w, height: 11, rx: 2, fill: '#eef3f9', stroke: MYBLUE, 'stroke-width': 0.5 }, g);
      const t = text(g, x + w / 2, y + 7.7, label, { anchor: 'middle', fs: 6.2, c: MYBLUE });
      g.addEventListener('pointerdown', function (ev) { ev.preventDefault(); ev.stopPropagation(); fn(); });
      g.addEventListener('click', function (ev) { ev.stopPropagation(); });
      g.label = t; g.box = r;
      return g;
    }
    const PH = { I: 'população inicial espalhada', II: 'agrupando-se nos picos', III: 'convergiu para um pico' };
    function build() {
      root.textContent = '';
      root.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      root.style.width = W + 'pt'; root.style.height = H + 'pt';
      // rótulos do gráfico (como na figura)
      text(root, PW / 2 + 6, 9, 'Fitness landscape', { ff: SANS, fs: 7.5, anchor: 'middle' });
      el.ph = text(root, PW - 12, 30, 'I', { ff: 'Times New Roman, serif', fs: 17, c: DARKRED, anchor: 'end' });
      const xl = text(root, PW / 2 + 6, H - 6, 'Espaço de busca (s', { ff: SANS, fs: 7, anchor: 'middle' });
      S('tspan', { 'font-size': 5, dy: 1.6 }, xl).textContent = 'i';
      S('tspan', { dy: -1.6 }, xl).textContent = ')';
      const zl = text(root, 9, H / 2 - 6, 'Z(s', { ff: SANS, fs: 7, anchor: 'middle', rot: true });
      S('tspan', { 'font-size': 5, dy: 1.6 }, zl).textContent = 'i';
      S('tspan', { dy: -1.6 }, zl).textContent = ')';
      // painel
      const x = PW + 8, pw = W - x;
      text(root, x, 10, 'AG no fitness landscape', { fs: 7.5, bold: true, c: MYBLUE });
      text(root, x, 19, '30 indivíduos · torneio · cruzamento', { fs: 5.4, c: '#555' });
      text(root, x, 25.5, 'uniforme · mutação gaussiana · elitismo', { fs: 5.4, c: '#555' });
      el.gen = text(root, x, 40, '', { fs: 8, bold: true });
      el.best = text(root, x, 50, '', { fs: 6.3 });
      el.mean = text(root, x, 58, '', { fs: 6.3 });
      el.phT = text(root, x, 69, '', { fs: 6.3, c: DARKRED });
      // gráfico melhor/média por geração
      const gx = x + 10, gy = 78, gw = pw - 14, gh = 46;
      el.chart = { x: gx, y: gy, w: gw, h: gh };
      S('path', { d: 'M' + gx + ' ' + gy + 'V' + (gy + gh) + 'H' + (gx + gw), fill: 'none', stroke: '#000', 'stroke-width': 0.4 }, root);
      text(root, gx - 2, gy + 4, 'f', { fs: 5.5, anchor: 'end', ff: 'KaTeX_Math, serif' });
      text(root, gx + gw, gy + gh + 6.5, 'geração', { fs: 5, anchor: 'end', c: '#555' });
      el.lBest = S('path', { fill: 'none', stroke: '#c0281a', 'stroke-width': 0.8 }, root);
      el.lMean = S('path', { fill: 'none', stroke: MYBLUE, 'stroke-width': 0.8 }, root);
      S('path', { d: 'M' + gx + ' ' + (gy + gh + 13) + 'h7', stroke: '#c0281a', 'stroke-width': 0.8 }, root);
      text(root, gx + 9, gy + gh + 15, 'melhor', { fs: 5.2 });
      S('path', { d: 'M' + (gx + 36) + ' ' + (gy + gh + 13) + 'h7', stroke: MYBLUE, 'stroke-width': 0.8 }, root);
      text(root, gx + 45, gy + gh + 15, 'média', { fs: 5.2 });
      // botões
      const by = Math.min(H - 42, gy + gh + 24);
      button(root, x, by, pw - 2, 'próxima geração', function () { stop(); advance(); });
      el.run = button(root, x, by + 14, pw - 2, '▶ rodar', function () { if (running) stop(); else start(); });
      button(root, x, by + 28, pw - 2, '↺ nova população', function () { stop(); newPop(); refresh(); draw(); });
      text(root, PW / 2 + 6, H - 15, 'arraste para girar · duplo clique: vista inicial', { fs: 4.8, c: '#999', anchor: 'middle' });
      refresh();
    }
    function refresh() {
      const s = hist[hist.length - 1], ph = phase();
      el.gen.textContent = 'geração ' + gen;
      el.best.textContent = 'melhor f = ' + fmt(s.best);
      el.mean.textContent = 'média f = ' + fmt(s.mean);
      el.phT.textContent = ph + ': ' + PH[ph];
      if (el.ph.textContent !== ph) el.ph.textContent = ph;
      const c = el.chart, n = Math.max(10, hist.length - 1);
      const X = function (g) { return c.x + c.w * g / n; }, Y = function (v) { return c.y + c.h * (1 - (v - FMIN) / (FMAX - FMIN)); };
      el.lBest.setAttribute('d', hist.map(function (h2, g) { return (g ? 'L' : 'M') + X(g).toFixed(2) + ' ' + Y(h2.best).toFixed(2); }).join(''));
      el.lMean.setAttribute('d', hist.map(function (h2, g) { return (g ? 'L' : 'M') + X(g).toFixed(2) + ' ' + Y(h2.mean).toFixed(2); }).join(''));
    }

    // ---------- animação própria (fora do runner do core: é interativa) ----------
    let animGen = 0, running = false;
    function advance() {
      step(); refresh();
      const g = ++animGen, t0 = performance.now();
      (function fr(now) {
        if (g !== animGen) return;
        tAnim = Math.min(1, (now - t0) / 650);
        draw();
        if (tAnim < 1) requestAnimationFrame(fr);
        else if (running) setTimeout(function () { if (running && g === animGen) advance(); }, 350);
      })(t0);
    }
    function start() { running = true; el.run.label.textContent = '❚❚ pausar'; advance(); }
    function stop() { running = false; animGen++; tAnim = 1; if (el.run) el.run.label.textContent = '▶ rodar'; }

    // girar com o mouse
    let drag = null;
    canvas.addEventListener('pointerdown', function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      drag = { x: ev.clientX, y: ev.clientY, az: view.az, el: view.el };
      canvas.setPointerCapture(ev.pointerId); canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', function (ev) {
      if (!drag) return;
      view.az = drag.az - (ev.clientX - drag.x) * 0.4;
      view.el = Math.max(5, Math.min(85, drag.el + (ev.clientY - drag.y) * 0.3));
      draw();
    });
    const endDrag = function () { drag = null; canvas.style.cursor = 'grab'; };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('click', function (ev) { ev.stopPropagation(); });
    canvas.addEventListener('dblclick', function (ev) { ev.stopPropagation(); view = { az: AZ0, el: EL0 }; draw(); });

    // ---------- estados ----------
    function place(on) {
      others.forEach(function (c) { c.style.visibility = on ? 'hidden' : ''; c.style.opacity = ''; });
      host.style.display = on ? '' : 'none';
    }
    function show() { place(true); measure(); build(); draw(); }
    function snap(st) {
      stop();
      if (st === 'l1') { place(false); host.style.opacity = ''; return; }
      if (!pop.length) newPop();
      show(); host.style.opacity = '';
    }
    async function play(a, b, h) {
      stop();
      if (b !== 'l2') { snap(b); return; }
      newPop(); view = { az: AZ0, el: EL0 };
      others.forEach(function (c) { c.style.visibility = ''; });
      await h.tween(400, function (e) { others.forEach(function (c) { c.style.opacity = 1 - e; }); });
      others.forEach(function (c) { c.style.visibility = 'hidden'; c.style.opacity = ''; });
      host.style.opacity = 0; show();
      // entrada: a superfície gira até a vista inicial
      await h.tween(1200, function (e) {
        host.style.opacity = Math.min(1, e * 3);
        view = { az: AZ0 - 70 * (1 - e), el: EL0 + 10 * (1 - e) };
        draw();
      });
      view = { az: AZ0, el: EL0 }; draw();
    }
    window.addEventListener('resize', function () { if (host.style.display !== 'none') { measure(); build(); draw(); } });
    return { snap: snap, play: play };
  });
})();
