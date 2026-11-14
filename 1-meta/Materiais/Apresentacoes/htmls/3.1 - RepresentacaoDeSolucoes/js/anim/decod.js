/* Decodificador (aula 3.1, frames 35 e 36): figura decodificador do Ipe (dados/decod.js, figura_camadas.py; quadro
 * 181.8 × 61.3, scale 1.3) + acréscimos nas margens (a figura vai de x = 113.6 a 349.9 no frame; a tcolorbox começa
 * em y = 128.9).
 *
 * <span class="anim pl" data-anim="decod" data-fig="det|est" data-from=".." data-state="det|est"><img …></span>
 *   det (frame 35, de vazio) determinístico: a ficha [J2 J1 J3] sai da Representação, segue a seta curva, entra no
 *       Decodificador (que pulsa e "trabalha"), sai como um mini-Gantt pela outra seta até a Solução e vai para a coluna
 *       de resultados à direita, com o makespan (C = 14). Roda duas vezes: o mesmo resultado.
 *   est (frame 36, de det) estocástico: a mesma entrada, três decodificações, três soluções diferentes (C = …).
 *   Nos dois, o botão "decodificar de novo" (margem esquerda) roda mais uma vez (a coluna guarda as 3 últimas).
 * Os mini-Gantts são a instância do JSS (frame 38) decodificada como no jssdec.js; no estocástico, cada execução
 * sorteia a ordem em que as operações empatadas entram (ilustrado sorteando uma das 6 ordens, diferente da anterior).
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease, lerp = Anim.lerp;
  const FD = Anim.figData || {};
  const RED = '#b6321d', BLUE = '#0061a5';
  const FONT = '"LM Sans 8", "LM Sans", sans-serif';
  const FIX = { 7: 'Representação', 8: '(codificação)', 9: 'Solução' };
  const COLOR = { 1: '#006400', 2: '#00008b', 3: '#a52a2a' };
  const JOBS = { 1: [[1, 2], [2, 3]], 2: [[1, 2], [2, 1], [3, 1]], 3: [[2, 4], [1, 1], [3, 2]] };
  const ORDERS = [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]];
  function decode(order) {
    const busy = { 1: [], 2: [], 3: [] }, ops = [];
    order.forEach(function (j) {
      let ready = 0;
      JOBS[j].forEach(function (mp) {
        const m = mp[0], p = mp[1];
        let t = ready;
        busy[m].slice().sort(function (a, b) { return a[0] - b[0]; }).some(function (iv) { if (t + p <= iv[0]) return true; t = Math.max(t, iv[1]); return false; });
        busy[m].push([t, t + p]); ops.push({ j: j, m: m, t0: t, t1: t + p }); ready = t + p;
      });
    });
    ops.cmax = Math.max.apply(null, ops.map(function (o) { return o.t1; }));
    return ops;
  }
  // curvas das setas da figura (cúbicas)
  const C1 = [[32.9, 28.4], [32.9, 15.07], [40.9, 8.4], [56.9, 8.4]];
  const C2 = [[124.9, 8.4], [138.23, 8.4], [144.9, 15.07], [144.9, 28.4]];
  function bez(c, t) {
    const u = 1 - t;
    return [0, 1].map(function (k) { return u * u * u * c[0][k] + 3 * u * u * t * c[1][k] + 3 * u * t * t * c[2][k] + t * t * t * c[3][k]; });
  }
  const GW = 36, GH = 15;                       // mini-Gantt
  const SLOT = function (k) { return [188, 2 + k * 20]; };

  function Local() { this.gen = 0; }
  Local.prototype.cancel = function () { this.gen++; };
  Local.prototype.h = function () {
    const self = this, gen = this.gen;
    return {
      tween: function (dur, fn, ez) {
        if (gen !== self.gen) return Promise.reject('cancel');
        ez = ez || ease.inOut;
        return new Promise(function (res, rej) {
          const t0 = performance.now();
          (function fr(now) {
            if (gen !== self.gen) { rej('cancel'); return; }
            const t = Math.min(1, (now - t0) / dur); fn(ez(t), t);
            if (t < 1) requestAnimationFrame(fr); else res();
          })(t0);
        });
      },
      wait: function (ms) { return new Promise(function (res, rej) { setTimeout(function () { gen !== self.gen ? rej('cancel') : res(); }, ms); }); },
      all: function (l) { return Promise.all(l); }
    };
  };

  function mk(it, parent) {
    if (it.t === 'x') {
      const t = S('text', { x: it.x, y: it.y, 'font-size': it.fs, fill: it.c, 'font-family': it.ff }, parent);
      t.textContent = it.tx; return t;
    }
    const p = S('path', { d: it.d, fill: it.f || 'none' }, parent);
    if (it.fo !== undefined) p.setAttribute('fill-opacity', it.fo);
    if (it.s) { p.setAttribute('stroke', it.s); p.setAttribute('stroke-width', it.w); p.setAttribute('stroke-linejoin', 'round'); }
    return p;
  }

  Anim.define('decod', function (host) {
    const D = FD.decod, fig = host.dataset.fig, frame = host.closest('section');
    if (!D) { console.warn('decod: faltam os dados (dados/decod.js)'); return { snap: function () {}, play: null }; }
    const svg = S('svg', { viewBox: '0 0 ' + D.W + ' ' + D.H });
    host.appendChild(svg);
    const gIt = S('g', null, svg), gOut = S('g', null, svg), gTok = S('g', null, svg);
    const els = D.items.map(function (it, i) { const e = mk(it, gIt); if (FIX[i]) e.textContent = FIX[i]; return e; });
    const DEC = [2, 10], DC = [90.9, 8.4];
    const cap = S('text', { x: 245.5, y: -3, 'text-anchor': 'end', 'font-size': 5.4, 'font-family': FONT, fill: fig === 'est' ? RED : BLUE, 'font-weight': 700 }, svg);
    cap.textContent = fig === 'est' ? 'mesma entrada → soluções diferentes' : 'mesma entrada → mesma solução';
    let outs = [], last = 2, btn = null, live = false;
    const local = new Local();

    function gantt(order, parent) {
      const ops = decode(order), k = GW / 14;
      const g = S('g', null, parent);
      S('rect', { width: GW, height: GH, fill: '#fff', stroke: '#888', 'stroke-width': 0.4, rx: 1 }, g);
      ops.forEach(function (o) { S('rect', { x: o.t0 * k, y: 1 + (3 - o.m) * 4.5, width: (o.t1 - o.t0) * k, height: 4, fill: COLOR[o.j], 'fill-opacity': 0.55 }, g); });
      const t = S('text', { x: GW + 2.5, y: GH / 2 + 2, 'font-size': 5.4, 'font-family': FONT, fill: '#333' }, g);
      t.textContent = 'C = ' + ops.cmax;
      return g;
    }
    function chip(parent) {
      const g = S('g', null, parent);
      S('rect', { x: -14, y: -4.2, width: 28, height: 8.4, rx: 1.5, fill: '#fff', stroke: BLUE, 'stroke-width': 0.6 }, g);
      const t = S('text', { y: 1.9, 'text-anchor': 'middle', 'font-size': 5.6, 'font-family': 'KaTeX_Main' }, g);
      [[2, '[J2 '], [1, 'J1 '], [3, 'J3]']].forEach(function (p) { const s = S('tspan', { fill: COLOR[p[0]] }, t); s.textContent = p[1]; });
      return g;
    }
    const place = function (g, p, s) { g.setAttribute('transform', 'translate(' + p[0] + ' ' + p[1] + ')' + (s !== undefined ? ' scale(' + s + ')' : '')); };
    function nextOrder() {
      if (fig !== 'est') return [2, 1, 3];
      let i; do { i = Math.floor(Math.random() * 6); } while (i === last); last = i;
      return ORDERS[i];
    }
    function layoutOuts() { outs.forEach(function (g, k) { place(g, SLOT(k)); }); }

    // uma decodificação: ficha → decodificador → mini-Gantt → coluna de resultados
    async function run(h, order) {
      const c = chip(gTok);
      await h.tween(650, function (e) { place(c, bez(C1, e)); }, ease.inOut);
      // dentro do decodificador: some, a caixa pulsa com reticências
      c.remove();
      const dots = S('text', { x: DC[0], y: 24, 'text-anchor': 'middle', 'font-size': 7, 'font-family': FONT, fill: '#555' }, gTok);
      await h.tween(700, function (e, t) {
        const s = 1 + 0.05 * Math.sin(t * Math.PI * 4);
        DEC.forEach(function (i) { els[i].setAttribute('transform', 'translate(' + DC[0] + ' ' + DC[1] + ') scale(' + s + ') translate(' + (-DC[0]) + ' ' + (-DC[1]) + ')'); });
        dots.textContent = '·'.repeat(1 + Math.floor(t * 3.99));
      }, ease.linear);
      DEC.forEach(function (i) { els[i].removeAttribute('transform'); });
      dots.remove();
      const g = gantt(order, gTok);
      await h.tween(650, function (e) { const p = bez(C2, e); place(g, [p[0] - GW * 0.25, p[1] - GH * 0.25], 0.5); }, ease.inOut);
      // vai para a coluna: entra no topo, as outras descem (fica com as 3 últimas)
      const from = bez(C2, 1);
      if (outs.length === 3) { const o = outs.pop(); o.remove(); }
      const olds = outs.slice();
      gOut.appendChild(g);
      await h.tween(500, function (e) {
        const s = lerp(0.5, 1, e), to = SLOT(0);
        place(g, [lerp(from[0] - GW * 0.25, to[0], e), lerp(from[1] - GH * 0.25, to[1], e)], s);
        olds.forEach(function (o, k) { const a = SLOT(k), b = SLOT(k + 1); place(o, [a[0], lerp(a[1], b[1], e)]); });
      }, ease.inOut);
      outs.unshift(g); layoutOuts();
    }

    function button(on) {
      if (on && !btn) {
        btn = document.createElement('div');
        btn.className = 'dc-btn'; btn.setAttribute('data-interactive', '');
        btn.innerHTML = '<button type="button">▶ decodificar de novo</button><div class="dc-hint">' +
          (fig === 'est' ? 'cada execução sorteia<br>a ordem das operações<br>empatadas' : 'decodificador<br>determinístico') + '</div>';
        frame.appendChild(btn);
        btn.querySelector('button').addEventListener('click', async function () {
          local.cancel(); while (gTok.firstChild) gTok.removeChild(gTok.firstChild);
          DEC.forEach(function (i) { els[i].removeAttribute('transform'); });
          try { await run(local.h(), nextOrder()); } catch (e) { if (e !== 'cancel') console.error(e); }
        });
      }
      if (btn) {
        btn.style.display = on ? '' : 'none';
        if (on) {
          const s = frame.getBoundingClientRect().width / frame.offsetWidth || 1, fr = frame.getBoundingClientRect(), r = host.getBoundingClientRect();
          btn.style.left = ((fr.left + 32 * fr.width / 453.543 - fr.left) / s) + 'px';
          btn.style.top = ((r.top - fr.top) / s + r.height / s * 0.42) + 'px';
        }
      }
    }
    function reset() {
      local.cancel();
      while (gTok.firstChild) gTok.removeChild(gTok.firstChild);
      while (gOut.firstChild) gOut.removeChild(gOut.firstChild);
      outs = [];
      DEC.forEach(function (i) { els[i].removeAttribute('transform'); });
    }
    function filled(n) {   // estado final: n resultados na coluna
      reset();
      const seq = fig === 'est' ? [[3, 2, 1], [2, 3, 1], [1, 2, 3]] : [[2, 1, 3], [2, 1, 3]];
      seq.slice(0, n).forEach(function (o) { const g = gantt(o, gOut); outs.push(g); });
      layoutOuts();
    }
    function snap(st) {
      live = st !== 'vazio';
      svg.style.display = '';
      if (!live) { reset(); cap.style.display = 'none'; button(false); return; }
      filled(fig === 'est' ? 3 : 2);
      cap.style.display = ''; cap.style.opacity = '';
      button(true);
    }
    async function play(a, b, h) {
      if (b === 'vazio') { snap(b); return; }
      reset(); cap.style.display = ''; cap.style.opacity = 0; button(false);
      const seq = fig === 'est' ? [[1, 2, 3], [2, 3, 1], [3, 2, 1]] : [[2, 1, 3], [2, 1, 3]];
      await h.wait(250);
      for (const o of seq) { await run(h, o); await h.wait(200); }
      await h.tween(350, function (e) { cap.style.opacity = e; });
      cap.style.opacity = '';
      button(true);
    }
    window.addEventListener('resize', function () { if (live && btn && btn.style.display !== 'none') button(true); });
    return { snap: snap, play: play };
  });
})();
