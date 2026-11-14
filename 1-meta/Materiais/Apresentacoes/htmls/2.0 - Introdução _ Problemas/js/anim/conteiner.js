/* Carregamento de contêiner em 3D (aula 2, frames 46–48): substitui a imagem img/CLP.png.
 *
 * Uso: <span class="anim ct" data-anim="conteiner" data-from=".." data-state=".." [data-info]><img … CLP.png></span>
 * A <img> fica invisível (reserva o espaço, 2:1); um <canvas> por cima desenha a cena.
 *
 * Instância fixa (semente 1195769): contêiner 12 × 4 × 4 e caixas de lados 1, 1.5, 2 ou 2.5 até 95% do volume (37 caixas).
 * Carregamento: heurística de pontos extremos (Crainic et al.), caixas por volume decrescente, cada uma no ponto
 * extremo de menor (x, z, y) — o contêiner é enchido "em paredes", da boca para o fundo —, nas 6 orientações e com
 * apoio mínimo de 70% da base; pontos extremos também projetados para baixo. Resultado: 34 caixas, 93% do volume;
 * as 3 que não cabem ficam fora, no chão, à direita.
 * Desenho: perspectiva, faces sombreadas (luz fixa), ordem de pintura por ordenação topológica das caixas (caixas
 * alinhadas aos eixos e sem sobreposição: há sempre um eixo que as separa; a mais distante da câmera nesse eixo
 * vem antes). Piso e paredes (fundo e lateral) entram na ordenação como caixas finas.
 *
 * Estados: vazio (contêiner vazio), cheio. vazio → cheio: as caixas entram uma a uma, na ordem do carregamento
 * (descem do alto), com o contador; no fim, as que não couberam aparecem do lado de fora.
 * Interação: arrastar gira a câmera; duplo clique volta à vista inicial. data-info: mostra o contador.
 */
(function () {
  'use strict';
  const ease = Anim.ease, lerp = Anim.lerp;
  const L = 12, W = 4, H = 4, EPS = 1e-6;
  const PAL = ['#a95756', '#b46c4d', '#5f9e5b', '#b3b29a', '#9fb0b0', '#7b8696', '#5f8fb0', '#1a7f78', '#9a9a9a', '#c08a92', '#55606e', '#9db08a'];

  // ---------- instância e carregamento (uma vez, ao carregar a página) ----------
  let seed = 1195769;   // escolhida entre 400 sementes: 34 de 37 caixas, 93% do volume
  const rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const SIZES = [1, 1.5, 1.5, 2, 2, 2.5];
  const BOXES = [];
  (function () {
    let v = 0, k = 0;
    while (v < L * W * H * 0.95) {
      const d = [SIZES[Math.floor(rnd() * SIZES.length)], SIZES[Math.floor(rnd() * SIZES.length)], SIZES[Math.floor(rnd() * SIZES.length)]];
      BOXES.push({ d: d, c: PAL[Math.floor(rnd() * PAL.length)], id: k++ });
      v += d[0] * d[1] * d[2];
    }
  })();
  const overlap = function (a, b) {
    return a.x < b.x + b.dx - EPS && b.x < a.x + a.dx - EPS && a.y < b.y + b.dy - EPS && b.y < a.y + a.dy - EPS && a.z < b.z + b.dz - EPS && b.z < a.z + a.dz - EPS;
  };
  const PLACED = [], OUT = [];
  (function pack() {
    const order = BOXES.slice().sort(function (a, b) { return b.d[0] * b.d[1] * b.d[2] - a.d[0] * a.d[1] * a.d[2] || b.d[2] - a.d[2]; });
    let eps = [[0, 0, 0]];
    order.forEach(function (bx) {
      eps.sort(function (p, q) { return p[0] - q[0] || p[2] - q[2] || p[1] - q[1]; });
      const d = bx.d, ors = [[d[0], d[1], d[2]], [d[1], d[0], d[2]], [d[0], d[2], d[1]], [d[2], d[0], d[1]], [d[1], d[2], d[0]], [d[2], d[1], d[0]]];
      let best = null;
      for (const p of eps) {
        for (const o of ors) {
          const c = { x: p[0], y: p[1], z: p[2], dx: o[0], dy: o[1], dz: o[2] };
          if (c.x + c.dx > L + EPS || c.y + c.dy > W + EPS || c.z + c.dz > H + EPS) continue;
          if (PLACED.some(function (q) { return overlap(c, q); })) continue;
          if (c.z > EPS) {   // apoio: área da base sobre topos de caixas na altura z
            let sup = 0;
            PLACED.forEach(function (q) {
              if (Math.abs(q.z + q.dz - c.z) > EPS) return;
              const ox = Math.min(c.x + c.dx, q.x + q.dx) - Math.max(c.x, q.x), oy = Math.min(c.y + c.dy, q.y + q.dy) - Math.max(c.y, q.y);
              if (ox > 0 && oy > 0) sup += ox * oy;
            });
            if (sup < 0.7 * c.dx * c.dy - EPS) continue;
          }
          best = c; break;
        }
        if (best) break;
      }
      if (!best) { OUT.push(bx); return; }
      best.c = bx.c; best.id = bx.id;
      PLACED.push(best);
      eps = eps.filter(function (p) { return !(p[0] === best.x && p[1] === best.y && p[2] === best.z); });
      // novos pontos extremos: à frente, ao lado, em cima e, projetados para baixo, à frente e ao lado
      const topAt = function (x, y, z) {
        let t = 0;
        PLACED.forEach(function (q) { if (x > q.x - EPS && x < q.x + q.dx - EPS && y > q.y - EPS && y < q.y + q.dy - EPS && q.z + q.dz <= z + EPS) t = Math.max(t, q.z + q.dz); });
        return t;
      };
      [[best.x + best.dx, best.y, best.z], [best.x, best.y + best.dy, best.z], [best.x, best.y, best.z + best.dz],
        [best.x + best.dx, best.y, topAt(best.x + best.dx, best.y, best.z)], [best.x, best.y + best.dy, topAt(best.x, best.y + best.dy, best.z)]].forEach(function (p) {
        if (p[0] < L - EPS && p[1] < W - EPS && p[2] < H - EPS && !eps.some(function (q) { return q[0] === p[0] && q[1] === p[1] && q[2] === p[2]; })) eps.push(p);
      });
      // pontos extremos que caíram dentro de alguma caixa não servem mais
      eps = eps.filter(function (p) { return !PLACED.some(function (q) { return p[0] > q.x - EPS && p[0] < q.x + q.dx - EPS && p[1] > q.y - EPS && p[1] < q.y + q.dy - EPS && p[2] > q.z - EPS && p[2] < q.z + q.dz - EPS; }); });
    });
    // as que não couberam: em fileiras no chão, à direita do contêiner
    let x = L + 1.2, y = 0, rowD = 0;
    OUT.forEach(function (bx) {
      const dx = Math.max(bx.d[0], bx.d[1]), dy = Math.min(bx.d[0], bx.d[1]);
      if (x + dx > L + 1.2 + 7.5) { x = L + 1.2; y += rowD + 0.4; rowD = 0; }
      bx.pos = { x: x, y: y, z: 0, dx: dx, dy: dy, dz: bx.d[2], c: bx.c, id: bx.id, out: true };
      x += dx + 0.4; rowD = Math.max(rowD, dy);
    });
  })();
  const VOL = PLACED.reduce(function (s, b) { return s + b.dx * b.dy * b.dz; }, 0);
  if (typeof module !== 'undefined') { module.exports = { BOXES: BOXES, PLACED: PLACED, OUT: OUT, VOL: VOL, L: L, W: W, H: H }; return; }

  // ---------- desenho ----------
  const WALLS = [
    { x: 0, y: 0, z: -0.06, dx: L, dy: W, dz: 0.06, c: '#d9d9d9', wall: true },        // piso
    { x: 0, y: W, z: 0, dx: L, dy: 0.06, dz: H, c: '#6e6e6e', wall: true },            // lateral do fundo
    { x: L, y: 0, z: 0, dx: 0.06, dy: W, dz: H, c: '#7a7a7a', wall: true }             // parede do fim
  ];
  const LIGHT = (function () { const v = [-0.35, -0.55, 1]; const n = Math.hypot(v[0], v[1], v[2]); return v.map(function (a) { return a / n; }); })();
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = function (c) { return Math.max(0, Math.min(255, Math.round(c * k))); };
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  }
  const VIEW0 = { yaw: -2.42, pitch: 0.42, dist: 30 };
  (function () { const m = /[?&]ctv=([-\d.]+),([-\d.]+)/.exec(location.search); if (m) { VIEW0.yaw = +m[1]; VIEW0.pitch = +m[2]; } })();
  const TARGET = [L / 2 + 2.6, W / 2 + 1.2, 1.2];

  Anim.define('conteiner', function (host) {
    const cv = document.createElement('canvas');
    cv.setAttribute('data-interactive', '');
    host.appendChild(cv);
    const info = host.hasAttribute('data-info') ? document.createElement('div') : null;
    if (info) { info.className = 'ct-info'; host.appendChild(info); }
    const ctx = cv.getContext('2d');
    const view = { yaw: VIEW0.yaw, pitch: VIEW0.pitch, dist: VIEW0.dist };
    let scene = [], fit = null, cur = null;

    function camera() {
      const cp = Math.cos(view.pitch);
      const C = [TARGET[0] + view.dist * cp * Math.cos(view.yaw), TARGET[1] + view.dist * cp * Math.sin(view.yaw), TARGET[2] + view.dist * Math.sin(view.pitch)];
      let f = [TARGET[0] - C[0], TARGET[1] - C[1], TARGET[2] - C[2]];
      const nf = Math.hypot(f[0], f[1], f[2]); f = f.map(function (a) { return a / nf; });
      let r = [f[1] * 1 - 0, 0 - f[0] * 1, 0];   // f × (0,0,1)
      const nr = Math.hypot(r[0], r[1], r[2]); r = r.map(function (a) { return a / nr; });
      const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
      return { C: C, f: f, r: r, u: u };
    }
    function proj(cam, p) {
      const v = [p[0] - cam.C[0], p[1] - cam.C[1], p[2] - cam.C[2]];
      const zc = v[0] * cam.f[0] + v[1] * cam.f[1] + v[2] * cam.f[2];
      return [(v[0] * cam.r[0] + v[1] * cam.r[1] + v[2] * cam.r[2]) / zc, (v[0] * cam.u[0] + v[1] * cam.u[1] + v[2] * cam.u[2]) / zc];
    }
    function size() {
      const w = host.clientWidth, h = host.clientHeight, k = 3;
      if (cv.width !== Math.round(w * k)) { cv.width = Math.round(w * k); cv.height = Math.round(h * k); }
      return { w: cv.width, h: cv.height };
    }
    function computeFit() {   // escala e centro fixos, calculados na vista inicial
      const v0 = { yaw: view.yaw, pitch: view.pitch };
      view.yaw = VIEW0.yaw; view.pitch = VIEW0.pitch;
      const cam = camera(), pts = [];
      const all = WALLS.concat(PLACED, OUT.map(function (b) { return b.pos; }));
      all.forEach(function (b) { corners(b).forEach(function (c) { pts.push(proj(cam, c)); }); });
      const xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
      fit = { x0: Math.min.apply(null, xs), x1: Math.max.apply(null, xs), y0: Math.min.apply(null, ys), y1: Math.max.apply(null, ys) };
      view.yaw = v0.yaw; view.pitch = v0.pitch;
    }
    function corners(b) {
      const r = [];
      for (let i = 0; i < 8; i++) r.push([b.x + (i & 1 ? b.dx : 0), b.y + (i & 2 ? b.dy : 0), b.z + (i & 4 ? b.dz : 0)]);
      return r;
    }
    // ordem de pintura: a antes de b se a está do lado de lá de um eixo que separa as duas
    function behind(a, b, C) {
      const lo = [a.x, a.y, a.z], hi = [a.x + a.dx, a.y + a.dy, a.z + a.dz], blo = [b.x, b.y, b.z], bhi = [b.x + b.dx, b.y + b.dy, b.z + b.dz];
      for (let k = 0; k < 3; k++) {
        if (hi[k] <= blo[k] + EPS) return C[k] > blo[k] ? 1 : -1;   // a no lado baixo
        if (bhi[k] <= lo[k] + EPS) return C[k] < lo[k] ? 1 : -1;    // a no lado alto
      }
      return 0;
    }
    function order(list, C) {
      const n = list.length, indeg = new Array(n).fill(0), out = list.map(function () { return []; });
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const s = behind(list[i], list[j], C);
        if (s > 0) { out[i].push(j); indeg[j]++; } else if (s < 0) { out[j].push(i); indeg[i]++; }
      }
      const d = list.map(function (b) { return Math.hypot(b.x + b.dx / 2 - C[0], b.y + b.dy / 2 - C[1], b.z + b.dz / 2 - C[2]); });
      const res = [], used = new Array(n).fill(false);
      for (let step = 0; step < n; step++) {
        let pick = -1;
        for (let i = 0; i < n; i++) if (!used[i] && indeg[i] === 0 && (pick < 0 || d[i] > d[pick])) pick = i;
        if (pick < 0) for (let i = 0; i < n; i++) if (!used[i] && (pick < 0 || d[i] > d[pick])) pick = i;   // ciclo: a mais distante
        used[pick] = true; res.push(list[pick]);
        out[pick].forEach(function (j) { indeg[j]--; });
      }
      return res;
    }
    const FACES = [[0, 2, 6, 4, [-1, 0, 0]], [1, 3, 7, 5, [1, 0, 0]], [0, 1, 5, 4, [0, -1, 0]], [2, 3, 7, 6, [0, 1, 0]], [0, 1, 3, 2, [0, 0, -1]], [4, 5, 7, 6, [0, 0, 1]]];
    function draw() {
      const sz = size(), cam = camera();
      if (!fit) computeFit();
      const m = 0.04, s = Math.min(sz.w * (1 - 2 * m) / (fit.x1 - fit.x0), sz.h * (1 - 2 * m) / (fit.y1 - fit.y0));
      const ox = sz.w / 2 - s * (fit.x0 + fit.x1) / 2, oy = sz.h / 2 + s * (fit.y0 + fit.y1) / 2;
      const P = function (p) { const q = proj(cam, p); return [ox + s * q[0], oy - s * q[1]]; };
      ctx.clearRect(0, 0, sz.w, sz.h);
      const list = order(WALLS.concat(scene), cam.C);
      ctx.lineJoin = 'round';
      list.forEach(function (b) {
        const cs = corners(b), alpha = b.a === undefined ? 1 : b.a;
        if (alpha <= 0) return;
        ctx.globalAlpha = alpha;
        FACES.forEach(function (F) {
          const n = F[4], c = cs[F[0]];
          const ctr = [b.x + b.dx / 2 + n[0] * b.dx / 2, b.y + b.dy / 2 + n[1] * b.dy / 2, b.z + b.dz / 2 + n[2] * b.dz / 2];
          if (n[0] * (cam.C[0] - ctr[0]) + n[1] * (cam.C[1] - ctr[1]) + n[2] * (cam.C[2] - ctr[2]) <= 0) return;
          const k = 0.72 + 0.4 * Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
          ctx.beginPath();
          for (let q = 0; q < 4; q++) { const p = P(cs[F[q]]); if (q) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }
          ctx.closePath();
          ctx.fillStyle = shade(b.c, k); ctx.fill();
          ctx.strokeStyle = b.wall ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.45)'; ctx.lineWidth = sz.w / 1400; ctx.stroke();
        });
      });
      ctx.globalAlpha = 1;
      // arestas do contêiner por cima (como na figura)
      const E = [[0, 0, 0, L, 0, 0], [0, W, 0, L, W, 0], [0, 0, H, L, 0, H], [0, W, H, L, W, H], [0, 0, 0, 0, W, 0], [L, 0, 0, L, W, 0], [0, 0, H, 0, W, H], [L, 0, H, L, W, H],
        [0, 0, 0, 0, 0, H], [L, 0, 0, L, 0, H], [0, W, 0, 0, W, H], [L, W, 0, L, W, H]];
      ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = sz.w / 900;
      E.forEach(function (e) { const a = P([e[0], e[1], e[2]]), b = P([e[3], e[4], e[5]]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); });
    }
    function setInfo(n, v, outN) {
      if (!info) return;
      info.textContent = 'caixas carregadas: ' + n + ' de ' + BOXES.length + ' · volume ocupado: ' + Math.round(100 * v / (L * W * H)) + '%' +
        (outN ? ' · ' + outN + ' não couberam' : '');
    }
    function full() {
      scene = PLACED.map(function (b) { return Object.assign({}, b); }).concat(OUT.map(function (b) { return Object.assign({}, b.pos); }));
      setInfo(PLACED.length, VOL, OUT.length);
    }
    function snap(st) {
      cur = st;
      if (st === 'vazio') { scene = []; setInfo(0, 0); } else full();
      draw();
    }

    // girar arrastando; duplo clique volta à vista inicial
    cv.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      cv.setPointerCapture(ev.pointerId);
      const x0 = ev.clientX, y0 = ev.clientY, v0 = { yaw: view.yaw, pitch: view.pitch };
      const mv = function (e) {
        view.yaw = v0.yaw - (e.clientX - x0) * 0.008;
        view.pitch = Math.max(0.05, Math.min(1.45, v0.pitch + (e.clientY - y0) * 0.008));
        draw();
      };
      const up = function () { cv.removeEventListener('pointermove', mv); cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', up); };
      cv.addEventListener('pointermove', mv); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    });
    cv.addEventListener('dblclick', function () { view.yaw = VIEW0.yaw; view.pitch = VIEW0.pitch; draw(); });
    window.addEventListener('resize', function () { if (cur) draw(); });

    async function play(a, b, h) {
      if (b !== 'cheio') return;
      scene = []; setInfo(0, 0); draw();
      await h.wait(300);
      const items = PLACED.map(function (bx) { return Object.assign({}, bx, { a: 0 }); });
      scene = items.slice();
      const N = items.length, GAP = 75, FALL = 380, total = (N - 1) * GAP + FALL;
      let v = 0;
      await h.tween(total, function (e, t) {
        const now = t * total;
        let n = 0; v = 0;
        items.forEach(function (it, k) {
          const u = Math.max(0, Math.min(1, (now - k * GAP) / FALL)), base = PLACED[k];
          it.a = u <= 0 ? 0 : Math.min(1, u * 3);
          it.z = base.z + (1 - ease.out(u)) * 1.6;
          if (u >= 1) { n++; v += base.dx * base.dy * base.dz; }
        });
        setInfo(n, v);
        draw();
      }, ease.linear);
      // as que não couberam aparecem do lado de fora
      const outs = OUT.map(function (bx) { return Object.assign({}, bx.pos, { a: 0 }); });
      scene = scene.concat(outs);
      await h.tween(500, function (e) { outs.forEach(function (o) { o.a = e; }); draw(); });
      setInfo(PLACED.length, VOL, OUT.length);
    }

    return { snap: snap, play: play };
  });
})();
