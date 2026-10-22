/* Superfícies 3D do fitness landscape (slides 112–119), no lugar das imagens do pgfplots.
 *
 * Parado, o slide mostra a imagem original (img/Graficos/plot*.png). A mesma superfície é
 * desenhada ao vivo num <canvas> com a projeção exata do pgfplots (deduzida dos cantos da
 * caixa no PDF, vista padrão 25°/30°), então a troca imagem <-> canvas é imperceptível.
 *
 * Uso: <span class="anim" data-anim="surface3d" data-plot="plot2" data-state="img"><img ...></span>
 * Estados:
 *   img    imagem original (padrão)
 *   spin   (entrada) a superfície gira até a vista padrão e vira a imagem
 *   mesh   (entrada) começa como malha com nós (plot1) e vira a superfície
 *   nocut  (entrada, plot5) sem o plano; o plano de corte e a curva de interseção aparecem
 *   walk   uma busca local desce pela malha, de vizinho em vizinho (plot1.1)
 * Interação: arrastar gira a superfície; duplo clique volta à vista original.
 */
(function () {
  'use strict';
  const A = window.Anim;
  const D2R = Math.PI / 180;
  const AZ0 = 25, EL0 = 30;

  // ---------- funções e malhas (iguais aos arquivos plot*.txt) ----------
  const sinsin = function (x, y) { return Math.sin(x * D2R) * Math.sin(y * D2R); };
  const tilted = function (x, y) { return sinsin(x, y) + Math.pow(x / 500, 2) + Math.pow(y / 900, 2); };
  const LBL_CM = function (o) { // rótulos dos gráficos do pgfplots (fonte Computer Modern)
    const t = o || {}, xx = t.xx || 40.06, xy = t.xy || 198.47, tx = t.tx || 85.53;
    return [
      { s: 'Fitness', x: tx, y: 20.2, f: 'main', z: 9.96 },
      { s: 'landscape', x: tx + 34.28, y: 20.2, f: 'main', z: 9.96 },
      { s: 'Espaço', x: xx, y: xy, f: 'main', z: 9.96 },
      { s: 'de', x: xx + 33.95, y: xy, f: 'main', z: 9.96 },
      { s: 'busca', x: xx + 47.23, y: xy, f: 'main', z: 9.96 },
      { s: '(', x: xx + 74.97, y: xy, f: 'main', z: 9.96 },
      { s: 's', x: (t.xx || 40.06) + 78.84, y: t.xy || 198.47, f: 'math', z: 9.96 },
      { s: 'i', x: (t.xx || 40.06) + 83.51, y: (t.xy || 198.47) + 1.5, f: 'math', z: 6.97 },
      { s: ')', x: (t.xx || 40.06) + 86.83, y: t.xy || 198.47, f: 'main', z: 9.96 },
      { s: 'Z', x: 20.75, y: t.zy || 138.16, f: 'math', z: 9.96, rot: true },
      { s: '(', x: 20.75, y: (t.zy || 138.16) - 7.52, f: 'main', z: 9.96, rot: true },
      { s: 's', x: 20.75, y: (t.zy || 138.16) - 11.39, f: 'math', z: 9.96, rot: true },
      { s: 'i', x: 22.25, y: (t.zy || 138.16) - 16.06, f: 'math', z: 6.97, rot: true },
      { s: ')', x: 20.75, y: (t.zy || 138.16) - 19.38, f: 'main', z: 9.96, rot: true }
    ];
  };
  const LBL_V = function (k, o) { // versões editadas (Verdana), escaladas por k
    return [
      { s: 'Fitness landscape', x: o.t[0], y: o.t[1], f: 'verdana', z: 20.96 * k, w: 164.32 * k },
      { s: 'Espaço de busca (s', x: o.x[0], y: o.x[1], f: 'verdana', z: 20.96 * k, w: o.x[2] - o.x[0] },
      { s: 'i', x: o.x[2], y: o.x[1] + 3.15 * k, f: 'verdana', z: 14.67 * k },
      { s: ')', x: o.x[3], y: o.x[1], f: 'verdana', z: 20.96 * k },
      { s: 'Z(s', x: o.z[0], y: o.z[1], f: 'verdana', z: 20.96 * k, rot: true, w: o.z[1] - o.z[2] },
      { s: 'i', x: o.z[0] + 3.14 * k, y: o.z[2], f: 'verdana', z: 14.67 * k, rot: true },
      { s: ')', x: o.z[0], y: o.z[3], f: 'verdana', z: 20.96 * k, rot: true }
    ];
  };
  const PLOTS = {
    plot1: { W: 232.94, H: 214.24, fn: sinsin, dom: 360, n: 30, style: 'mesh', lw: 0.3985,
      A: [26.76, 169.4], B: [159.22, 191.67], D: [88.53, 121.63], T: [26.76, 79.41], labels: LBL_CM() },
    'plot1.1': { W: 441.83, H: 395.34, fn: sinsin, dom: 360, n: 30, style: 'mesh', lw: 0.8385,
      A: [28.57, 329.85], B: [307.27, 376.71], D: [158.53, 229.33], T: [28.57, 140.5],
      labels: LBL_V(1, { t: [152.22, 15.93], x: [56.55, 391.01, 232.26, 239.24], z: [15.93, 264.11, 230.33, 223.35] }) },
    plot2: { W: 231.15, H: 214.24, fn: sinsin, dom: 360, n: 30, style: 'surf', lw: 0.3985,
      A: [26.76, 169.4], B: [159.22, 191.67], D: [88.53, 121.63], T: [26.76, 79.41], labels: LBL_CM() },
    plot3: { W: 231.66, H: 214.47, fn: sinsin, dom: 900, n: 60, style: 'surf', lw: 0.3985,
      A: [26.76, 169.6], B: [159.57, 191.93], D: [88.69, 121.7], T: [26.76, 79.53],
      labels: LBL_CM({ tx: 85.79, xx: 40.24, xy: 198.69, zy: 138.32 }) },
    plot4: { W: 231.66, H: 216.04, fn: tilted, dom: 900, n: 60, style: 'surf', lw: 0.3985,
      A: [26.76, 171.17], B: [159.57, 193.49], D: [88.69, 123.27], T: [26.76, 79.53],
      labels: LBL_CM({ tx: 85.79, xx: 40.24, xy: 200.26, zy: 139.11 }) },
    plot5: { W: 463.36, H: 421.53, fn: tilted, dom: 900, n: 60, style: 'surf', lw: 0.8856,
      A: [30.18, 352.3], B: [325.3, 401.91], D: [167.79, 245.85], T: [30.18, 148.67],
      labels: LBL_V(22.14 / 20.96, { t: [161.34, 16.82], x: [60.12, 416.96, 245.7, 253.07], z: [16.82, 281.06, 245.37, 238.0] }),
      cutY: 0.502 }
  };

  // colormap "hot" do pgfplots: azul -> amarelo -> laranja -> vermelho
  function hot(t) {
    t = Math.max(0, Math.min(1, t));
    if (t < 1 / 3) { const s = t * 3; return [s, s, 1 - s]; }
    if (t < 2 / 3) { const s = (t - 1 / 3) * 3; return [1, 1 - 0.5 * s, 0]; }
    const s = (t - 2 / 3) * 3; return [1, 0.5 - 0.5 * s, 0];
  }
  const rgb = function (c, k) { k = k == null ? 1 : k; return 'rgb(' + Math.round(c[0] * 255 * k) + ',' + Math.round(c[1] * 255 * k) + ',' + Math.round(c[2] * 255 * k) + ')'; };

  A.define('surface3d', function (host) {
    const P = PLOTS[host.dataset.plot];
    const img = host.querySelector('img');
    host.classList.add('s3d');
    host.setAttribute('data-interactive', '');
    const canvas = document.createElement('canvas');
    canvas.className = 's3d-canvas';
    host.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // ----- malha -----
    const N = P.n, G = [];
    let zmin = Infinity, zmax = -Infinity;
    for (let i = 0; i < N; i++) {
      G.push([]);
      for (let j = 0; j < N; j++) {
        const x = P.dom * i / (N - 1), y = P.dom * j / (N - 1), z = P.fn(x, y);
        G[i].push(z); zmin = Math.min(zmin, z); zmax = Math.max(zmax, z);
      }
    }
    // ----- projeção do pgfplots -----
    const ex = [P.B[0] - P.A[0], P.B[1] - P.A[1]], ey = [P.D[0] - P.A[0], P.D[1] - P.A[1]], ez = [P.T[0] - P.A[0], P.T[1] - P.A[1]];
    const sx = ex[0] / Math.cos(AZ0 * D2R), sy = ex[1] / (Math.sin(AZ0 * D2R) * Math.sin(EL0 * D2R));
    const kz = -ez[1] / (sy * Math.cos(EL0 * D2R));
    const C = [P.A[0] + (ex[0] + ey[0] + ez[0]) / 2, P.A[1] + (ex[1] + ey[1] + ez[1]) / 2];
    const f = P.lw / 0.3985; // fator de escala das versões ampliadas
    let view = { az: AZ0, el: EL0 };
    function proj(u, v, w) { // u, v, w em [-0.5, 0.5]
      const az = view.az * D2R, el = view.el * D2R;
      return [C[0] + sx * (u * Math.cos(az) + v * Math.sin(az)),
        C[1] - sy * (-u * Math.sin(az) * Math.sin(el) + v * Math.cos(az) * Math.sin(el) + w * kz * Math.cos(el))];
    }
    function depth(u, v, w) {
      const az = view.az * D2R, el = view.el * D2R;
      return u * Math.sin(az) * Math.cos(el) - v * Math.cos(az) * Math.cos(el) + w * kz * Math.sin(el);
    }
    const U = function (i) { return i / (N - 1) - 0.5; };
    // o pgfplots amplia o eixo z em 10% do intervalo dos dados, de cada lado
    const zr = zmax - zmin, zlo = zmin - 0.1 * zr;
    const Wz = function (z) { return (z - zlo) / (1.2 * zr) - 0.5; };

    // ----- canvas no tamanho da imagem, em resolução de tela -----
    function sizeCanvas() {
      const r = img.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const pw = Math.max(1, Math.round(r.width * dpr)), ph = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
      ctx.setTransform(pw / P.W, 0, 0, ph / P.H, 0, 0);
    }

    // ----- desenho -----
    const FONTS = { main: 'KaTeX_Main, serif', math: 'italic 1em KaTeX_Math, serif', verdana: 'Verdana, sans-serif' };
    function drawLabels() {
      ctx.fillStyle = '#000';
      P.labels.forEach(function (l) {
        ctx.save();
        ctx.font = (l.f === 'math' ? 'italic ' : '') + l.z + 'px ' + (l.f === 'math' ? 'KaTeX_Math, serif' : FONTS[l.f]);
        ctx.translate(l.x, l.y); if (l.rot) ctx.rotate(-Math.PI / 2);
        if (l.w) { const m = ctx.measureText(l.s).width; if (m > 0) ctx.scale(l.w / m, 1); }
        ctx.fillText(l.s, 0, 0);
        ctx.restore();
      });
    }
    function drawBox() {
      const az = view.az * D2R, el = view.el * D2R;
      const Dv = [Math.sin(az) * Math.cos(el), -Math.cos(az) * Math.cos(el), Math.sin(el)];
      const faces = [[[-1, 0, 0], 0, -0.5], [[1, 0, 0], 0, 0.5], [[0, -1, 0], 1, -0.5], [[0, 1, 0], 1, 0.5], [[0, 0, -1], 2, -0.5], [[0, 0, 1], 2, 0.5]];
      const edges = {};
      faces.forEach(function (fc) {
        const n = fc[0];
        if (n[0] * Dv[0] + n[1] * Dv[1] + n[2] * kz * Dv[2] >= 0) return; // face da frente: não desenha
        const ax = fc[1], val = fc[2], others = [0, 1, 2].filter(function (a) { return a !== ax; });
        const corners = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(function (q) {
          const p = [0, 0, 0]; p[ax] = val; p[others[0]] = q[0]; p[others[1]] = q[1]; return p;
        });
        for (let k = 0; k < 4; k++) {
          const a = corners[k], b = corners[(k + 1) % 4], key = [a, b].map(String).sort().join('|');
          edges[key] = [a, b];
        }
      });
      ctx.strokeStyle = '#000'; ctx.lineWidth = P.lw;
      ctx.beginPath();
      Object.keys(edges).forEach(function (k) {
        const a = proj.apply(null, edges[k][0]), b = proj.apply(null, edges[k][1]);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      });
      ctx.stroke();
    }
    function drawSurface(opt) {
      opt = opt || {};
      const meshT = opt.mesh == null ? (P.style === 'mesh' ? 1 : 0) : opt.mesh; // 1 = malha com nós, 0 = superfície
      const quads = [];
      for (let i = 0; i < N - 1; i++) for (let j = 0; j < N - 1; j++) {
        const zc = (G[i][j] + G[i + 1][j] + G[i + 1][j + 1] + G[i][j + 1]) / 4;
        quads.push({ i: i, j: j, d: depth(U(i + 0.5), U(j + 0.5), Wz(zc)), c: hot((zc - zmin) / (zmax - zmin)) });
      }
      quads.sort(function (a, b) { return a.d - b.d; });
      ctx.lineWidth = P.lw; ctx.lineJoin = 'round';
      quads.forEach(function (q) {
        const i = q.i, j = q.j;
        const p = [proj(U(i), U(j), Wz(G[i][j])), proj(U(i + 1), U(j), Wz(G[i + 1][j])),
          proj(U(i + 1), U(j + 1), Wz(G[i + 1][j + 1])), proj(U(i), U(j + 1), Wz(G[i][j + 1]))];
        ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
        for (let k = 1; k < 4; k++) ctx.lineTo(p[k][0], p[k][1]);
        ctx.closePath();
        if (meshT < 1) {
          ctx.globalAlpha = 1 - meshT; ctx.fillStyle = rgb(q.c); ctx.fill();
          ctx.strokeStyle = rgb(q.c, 0.8); ctx.stroke();
        }
        if (meshT > 0) { ctx.globalAlpha = meshT; ctx.strokeStyle = 'rgb(0,179,0)'; ctx.stroke(); }
        ctx.globalAlpha = 1;
      });
      if (meshT > 0) { // nós (marcas do scatter), coloridos pelo custo
        const pts = [];
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) pts.push({ i: i, j: j, d: depth(U(i), U(j), Wz(G[i][j])) });
        pts.sort(function (a, b) { return a.d - b.d; });
        ctx.globalAlpha = meshT;
        pts.forEach(function (m) {
          const z = G[m.i][m.j], c = hot((z - zmin) / (zmax - zmin)), p = proj(U(m.i), U(m.j), Wz(z));
          ctx.beginPath(); ctx.arc(p[0], p[1], 1.99 * f, 0, 2 * Math.PI);
          ctx.fillStyle = rgb(c); ctx.fill(); ctx.strokeStyle = rgb(c, 0.8); ctx.stroke();
        });
        ctx.globalAlpha = 1;
      }
    }
    function curvePoints(t) { // curva de interseção com o plano y = cutY (fração t desenhada)
      const pts = [], M = 120, v = P.cutY - 0.5, y = P.dom * P.cutY;
      for (let k = 0; k <= M * t; k++) {
        const x = P.dom * k / M;
        pts.push(proj(k / M - 0.5, v, Wz(P.fn(x, y))));
      }
      return pts;
    }
    function drawCut(o) { // plano vertical y = cutY e a curva de interseção
      const v = P.cutY - 0.5;
      if (o.plane > 0) {
        const c = [proj(-0.5, v, -0.5), proj(0.5, v, -0.5), proj(0.5, v, 0.5), proj(-0.5, v, 0.5)];
        ctx.globalAlpha = 0.18 * o.plane; ctx.fillStyle = '#431111';
        ctx.beginPath(); c.forEach(function (p, k) { if (k) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 0.6 * o.plane; ctx.strokeStyle = '#431111'; ctx.lineWidth = 1.417; ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (o.curve > 0) {
        const pts = curvePoints(o.curve);
        ctx.strokeStyle = '#421111'; ctx.lineWidth = 1.9; ctx.lineJoin = 'round';
        ctx.beginPath(); pts.forEach(function (p, k) { if (k) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke();
      }
    }
    // caminho da busca local (desenhado por cima da imagem ou da superfície)
    function drawWalk(path, upto) {
      if (!path) return;
      const pts = path.map(function (q) { return proj(U(q[0]), U(q[1]), Wz(G[q[0]][q[1]])); });
      const n = Math.min(path.length - 1, upto);
      ctx.strokeStyle = '#0061a5'; ctx.lineWidth = 1.2 * f; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      const whole = Math.floor(n);
      for (let k = 1; k <= whole; k++) ctx.lineTo(pts[k][0], pts[k][1]);
      let head = pts[whole];
      if (n > whole && whole + 1 < pts.length) {
        const a = pts[whole], b = pts[whole + 1], t = n - whole;
        head = [A.lerp(a[0], b[0], t), A.lerp(a[1], b[1], t)];
        ctx.lineTo(head[0], head[1]);
      }
      ctx.stroke();
      // nós visitados
      for (let k = 0; k <= whole; k++) {
        ctx.beginPath(); ctx.arc(pts[k][0], pts[k][1], 2.1 * f, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 0.9 * f; ctx.strokeStyle = '#0061a5'; ctx.stroke();
      }
      // solução atual
      ctx.beginPath(); ctx.arc(head[0], head[1], 3.2 * f, 0, 2 * Math.PI);
      ctx.fillStyle = '#0061a5'; ctx.fill(); ctx.lineWidth = 0.8 * f; ctx.strokeStyle = '#fff'; ctx.stroke();
    }
    // busca local: desce para o melhor vizinho (4 vizinhos da malha) até não haver melhora
    function localSearch(i, j) {
      const path = [[i, j]];
      for (;;) {
        let best = null;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          const a = i + d[0], b = j + d[1];
          if (a < 0 || b < 0 || a >= N || b >= N) return;
          if (G[a][b] < G[i][j] - 1e-9 && (!best || G[a][b] < G[best[0]][best[1]])) best = [a, b];
        });
        if (!best) return path;
        i = best[0]; j = best[1]; path.push([i, j]);
      }
    }
    const WALK = P.style === 'mesh' ? localSearch(Math.round(N * 0.42), Math.round(N * 0.12)) : null;

    // live: desenha tudo no canvas (a imagem fica escondida); overlay: só o caminho sobre a imagem
    let live = false, walkUpto = -1, cutState = null, meshBlend = null;
    function render() {
      sizeCanvas();
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.restore();
      if (live) {
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, P.W, P.H);
        drawBox();
        drawSurface({ mesh: meshBlend });
        if (cutState) drawCut(cutState);
        drawLabels();
      }
      if (walkUpto >= 0) drawWalk(WALK, walkUpto);
    }
    function setLive(on) {
      live = on;
      img.style.visibility = on ? 'hidden' : '';
      canvas.style.display = (on || walkUpto >= 0) ? 'block' : 'none';
      render();
    }

    // ----- estados -----
    let state = 'img';
    function snap(name) {
      state = name;
      view = { az: AZ0, el: EL0 }; cutState = null; meshBlend = null;
      walkUpto = name === 'walk' && WALK ? WALK.length - 1 : -1;
      setLive(false);
    }
    async function play(from, to, h) {
      if (from === 'spin') {
        setLive(true);
        const a0 = AZ0 - 115, e0 = 62;
        await h.tween(2200, function (e) { view = { az: A.lerp(a0, AZ0, e), el: A.lerp(e0, EL0, e) }; render(); }, A.ease.inOut);
      } else if (from === 'mesh') {
        meshBlend = 1; setLive(true);
        await h.wait(500);
        await h.tween(1600, function (e) { meshBlend = 1 - e; render(); }, A.ease.inOut);
      } else if (from === 'nocut') {
        cutState = { plane: 0, curve: 0 }; setLive(true);
        await h.wait(400);
        await h.tween(700, function (e) { cutState.plane = e; render(); });
        await h.tween(1400, function (e) { cutState.curve = e; render(); }, A.ease.inOut);
        await h.wait(300);
      } else if (to === 'walk' && WALK) {
        canvas.style.display = 'block';
        for (let k = 0; k < WALK.length - 1; k++) {
          await h.tween(480, function (e) { walkUpto = k + e; render(); }, A.ease.inOut);
          await h.wait(140);
        }
        walkUpto = WALK.length - 1; render();
      }
    }

    // ----- interação: girar com o mouse -----
    let drag = null;
    host.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, y: e.clientY, az: view.az, el: view.el };
      host.setPointerCapture(e.pointerId); e.preventDefault();
    });
    host.addEventListener('pointermove', function (e) {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!live && Math.abs(dx) + Math.abs(dy) < 3) return;
      if (!live) setLive(true);
      const k = 300 / host.getBoundingClientRect().width;
      view = { az: drag.az - dx * k, el: Math.max(-5, Math.min(89, drag.el + dy * k * 0.6)) };
      render();
    });
    host.addEventListener('pointerup', function () { drag = null; });
    host.addEventListener('dblclick', function () {
      if (!live) return;
      const v0 = { az: view.az, el: view.el }, t0 = performance.now();
      (function step(now) { // volta suavemente à vista original
        const t = Math.min(1, (now - t0) / 700), e = A.ease.inOut(t);
        view = { az: A.lerp(v0.az, AZ0, e), el: A.lerp(v0.el, EL0, e) }; render();
        if (t < 1) requestAnimationFrame(step); else setLive(false);
      })(t0);
    });

    host._live = setLive; // usado nos testes automáticos
    return { snap: snap, play: play };
  });

  // Revela uma figura da esquerda para a direita (curva 2D do corte), após um atraso
  A.define('reveal', function (host) {
    const delay = +(host.dataset.delay || 0);
    function snap() { host.style.clipPath = ''; }
    async function play(from, to, h) {
      host.style.clipPath = 'inset(0 100% 0 0)';
      await h.wait(delay);
      await h.tween(1400, function (e) { host.style.clipPath = 'inset(0 ' + (100 * (1 - e)) + '% 0 0)'; }, A.ease.inOut);
      host.style.clipPath = '';
    }
    return { snap: snap, play: play };
  });
})();
