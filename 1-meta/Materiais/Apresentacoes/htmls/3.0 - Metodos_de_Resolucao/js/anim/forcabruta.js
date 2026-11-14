/* Explosão combinatória (aula 3, frames 29 e 31).
 *
 * 1) tsprotas — frame 29, passo 2: figuras TSP1…TSP3 (dados/tsp.js, figura_camadas.py tsp … TSP1 TSP2 TSP3,
 *    quadro 72.8 × 48.8). <span class="anim pl" data-anim="tsprotas" data-fig="TSP1|TSP2|TSP3" data-delay="ms"
 *    data-from="vazio" data-state="vazio,v">. TSP1: os 3 pontos brotam. TSP2 / TSP3: uma ficha percorre a rota
 *    (1→2→3→1 e 1→3→2→1), cada aresta se traça atrás dela e a seta brota; legenda "rota k: …" (fica).
 *
 * 2) forcabruta — frame 31: span.anim.fb (tamanho zero) como 1º filho do div.center da tabela. À direita da tabela,
 *    uma barra por linha com o tempo em escala logarítmica (marcas 1 s, 1 h, 1 ano, 10⁶ anos); à esquerda, painel
 *    "teste outro n" (− / +): (n − 1)! rotas e o tempo da força bruta com 10⁹ somas/s e n somas por rota
 *    (= n!/10⁹ s, o modelo do frame 30), com uma marca na escala. Entrada (de "vazio"): as linhas da tabela
 *    acendem uma a uma e a barra de cada uma cresce; a de 25 em vermelho.
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease, lerp = Anim.lerp;
  const FD = Anim.figData || {};
  const MYBLUE = '#0061a5', RED = '#b22222', GOLD = '#e0a400';
  const CAP = '"LM Sans 8", "LM Sans", sans-serif';

  // ======================= 1) rotas do TSP com 3 pontos =======================
  const PT = { 1: [12.4, 24.4], 2: [60.4, 8.4], 3: [60.4, 40.4] };
  const ROUTE = {   // [de, para, linha, seta]
    TSP2: { lab: 'rota 1:  1 → 2 → 3 → 1', e: [[1, 2, 6, 8], [2, 3, 9, 11], [3, 1, 12, 14]] },
    TSP3: { lab: 'rota 2:  1 → 3 → 2 → 1', e: [[1, 3, 12, 13], [3, 2, 9, 10], [2, 1, 6, 7]] }
  };
  function mk(it, parent) {
    if (it.t === 'x') {
      const t = S('text', { x: it.x, y: it.y, 'font-size': it.fs, 'font-family': it.ff, fill: it.c }, parent);
      if (it.st) t.setAttribute('font-style', it.st);
      t.textContent = it.tx;
      return t;
    }
    const p = S('path', { d: it.d, fill: it.f || 'none' }, parent);
    if (it.fo !== undefined) p.setAttribute('fill-opacity', it.fo);
    if (it.s) { p.setAttribute('stroke', it.s); p.setAttribute('stroke-width', it.w); if (it.lj) p.setAttribute('stroke-linejoin', it.lj); }
    return p;
  }

  Anim.define('tsprotas', function (host) {
    const D = FD.tsp, fig = host.dataset.fig, delay = +(host.dataset.delay || 0);
    if (!D) { console.warn('tsprotas: faltam os dados (dados/tsp.js)'); return { snap: function () {}, play: null }; }
    const svg = S('svg', { viewBox: '0 0 ' + D.W + ' ' + D.H });
    host.appendChild(svg);
    const gIt = S('g', null, svg), gTop = S('g', null, svg);
    const els = D.items.map(function (it) { return mk(it, gIt); });
    const R = ROUTE[fig];
    let label = null;
    function showSet(ids) { const s = new Set(ids); els.forEach(function (e, i) { e.style.display = s.has(i) ? '' : 'none'; e.style.opacity = ''; e.removeAttribute('transform'); }); }
    function show(ids, on) { ids.forEach(function (i) { els[i].style.display = on === false ? 'none' : ''; }); }
    function mkLabel() {
      label = S('text', { x: 3, y: 46, 'font-size': 4.6, 'font-family': CAP, fill: MYBLUE }, gTop);
      label.textContent = R.lab;
      return label;
    }
    function snap(st) {
      while (gTop.firstChild) gTop.removeChild(gTop.firstChild);
      showSet(st === 'v' ? D.states[fig] : []);
      if (st === 'v' && R) mkLabel();
    }
    function pop(h, ids, c, dur) {
      show(ids);
      return h.tween(dur || 320, function (e, t) {
        ids.forEach(function (i) {
          els[i].style.opacity = Math.min(1, t * 2.5);
          els[i].setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ') scale(' + Math.max(0, e) + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')');
        });
      }, ease.back).then(function () { ids.forEach(function (i) { els[i].style.opacity = ''; els[i].removeAttribute('transform'); }); });
    }
    async function play(a, b, h) {
      snap('vazio');
      if (b !== 'v') return;
      const pts = [[0, 15, PT[1]], [fig === 'TSP3' ? 4 : 1, 16, PT[2]], [fig === 'TSP3' ? 5 : 2, fig === 'TSP3' ? 18 : 17, PT[3]]];
      if (delay) await h.wait(delay);
      show([3]); els[3].style.opacity = 0;
      await h.tween(250, function (e) { els[3].style.opacity = e; });
      els[3].style.opacity = '';
      for (const p of pts) { await pop(h, [p[0]], p[2], R ? 200 : 320); show([p[1]]); if (!R) await h.wait(120); }
      if (!R) return;
      const lb = mkLabel(); lb.setAttribute('opacity', 0);
      await h.tween(250, function (e) { lb.setAttribute('opacity', e); });
      const tok = S('circle', { r: 2.2, fill: GOLD, stroke: '#8a6500', 'stroke-width': 0.3 }, gTop);
      tok.setAttribute('cx', PT[1][0]); tok.setAttribute('cy', PT[1][1]);
      for (const e of R.e) {
        const A = PT[e[0]], B = PT[e[1]];
        const ln = S('path', { d: 'M' + A[0] + ' ' + A[1] + 'L' + A[0] + ' ' + A[1], stroke: '#000', 'stroke-width': 0.4, fill: 'none' }, gTop);
        gTop.insertBefore(ln, gTop.firstChild);
        await h.tween(520, function (u) {
          const x = lerp(A[0], B[0], u), y = lerp(A[1], B[1], u);
          ln.setAttribute('d', 'M' + A[0] + ' ' + A[1] + 'L' + x + ' ' + y);
          tok.setAttribute('cx', x); tok.setAttribute('cy', y);
        }, ease.inOut);
        ln.remove(); show([e[2]]);
        await pop(h, [e[3]], B, 200);
      }
      await h.tween(300, function (e) { tok.setAttribute('opacity', 1 - e); });
      tok.remove();
    }
    return { snap: snap, play: play };
  });

  // ======================= 2) tempos da força bruta =======================
  const Y = 365.25 * 86400, UNI = 13.8e9;
  const LMIN = -7, LMAX = 18;                     // escala: 10⁻⁷ s … 10¹⁸ s
  const TABLE = [1.2e-7, 0.004, 22 * 60, 77 * Y, 491.5e6 * Y];   // os tempos da tabela (n = 5 … 25; corrigida, = n!/10⁹ s)
  const TICKS = [[0, '1 s'], [Math.log10(3600), '1 h'], [Math.log10(Y), '1 ano'], [Math.log10(1e6 * Y), '10⁶ anos']];
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  function fact(n) { let f = 1n; for (let i = 2n; i <= BigInt(n); i++) f *= i; return f; }
  function fmtBig(b) {
    const s = b.toString();
    if (s.length <= 12) return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return s[0] + ',' + s.slice(1, 3) + ' × 10' + String(s.length - 1).replace(/\d/g, function (c) { return SUP[c]; });
  }
  function fmtNum(v) { return (v >= 100 ? Math.round(v).toString() : (+v.toPrecision(2)).toString()).replace('.', ','); }
  function fmtTime(sec) {
    if (sec < 1e-3) return 'menos de 1 milissegundo';
    if (sec < 1) return fmtNum(sec * 1000) + ' milissegundos';
    if (sec < 60) return fmtNum(sec) + ' segundos';
    if (sec < 3600) return fmtNum(sec / 60) + ' minutos';
    if (sec < 86400) return fmtNum(sec / 3600) + ' horas';
    if (sec < Y) return fmtNum(sec / 86400) + ' dias';
    const y = sec / Y;
    if (y < 1e3) return fmtNum(y) + (y < 2 ? ' ano' : ' anos');
    if (y < 1e6) return fmtNum(y / 1e3) + ' mil anos';
    if (y < 1e9) return fmtNum(y / 1e6) + ' milhões de anos';
    if (y < UNI) return fmtNum(y / 1e9) + ' bilhões de anos';
    const k = y / UNI;
    return (k < 1e3 ? fmtNum(k) : fmtBig(BigInt(Math.round(k)))) + ' × a idade do universo';
  }
  const secOf = function (n) { return Number(fact(n)) / 1e9; };   // (n−1)! rotas × n somas ÷ 10⁹ somas/s

  Anim.define('forcabruta', function (host) {
    const svg = S('svg', { width: '1pt', height: '1pt', viewBox: '0 0 1 1' });
    svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none';
    host.appendChild(svg);
    const g = S('g', null, svg);
    const center = host.parentElement, tab = center.querySelector('.tab');
    const cells = Array.prototype.slice.call(tab.querySelectorAll('.td'));   // n, tempo, n, tempo, …
    const times = [3, 5, 7, 9, 11].map(function (i) { return cells[i]; });
    let G = null, n = 12, marker = null;

    // painel (HTML, estilos .cx-* da aula 2)
    const pan = document.createElement('div');
    pan.className = 'cx-painel fb-painel';
    pan.setAttribute('data-interactive', '');
    pan.innerHTML = '<div class="cx-lb">teste outro número de cidades:</div>' +
      '<div class="cx-n"><button type="button" data-d="-1">−</button><span>n = <b></b></span><button type="button" data-d="1">+</button></div>' +
      '<div class="cx-lb">rotas: (n − 1)! =</div><div class="cx-big"></div>' +
      '<div class="cx-lb">10⁹ somas/s, n somas por rota:</div><div class="cx-t"></div>';
    host.appendChild(pan);
    pan.addEventListener('click', function (e) {
      const b = e.target.closest('button'); if (!b) return;
      n = Math.max(3, Math.min(60, n + (+b.dataset.d)));
      upd(true);
    });

    function geom() {   // posições (pt) em relação ao host, medidas na tabela já composta
      const k = host.closest('.frame').getBoundingClientRect().width / 453.543;
      const hb = host.getBoundingClientRect(), tb = tab.getBoundingClientRect(), cb = center.getBoundingClientRect();
      const rows = [2, 4, 6, 8, 10].map(function (i) { const r = cells[i].getBoundingClientRect(); return ((r.top + r.bottom) / 2 - hb.top) / k; });
      const head = cells[0].getBoundingClientRect();
      return { x0: (tb.right - hb.left) / k + 14, x1: (cb.right - hb.left) / k - 4, rows: rows,
        head: ((head.top + head.bottom) / 2 - hb.top) / k, bot: (tb.bottom - hb.top) / k, left: (tb.left - hb.left) / k };
    }
    const X = function (sec) { const l = Math.max(LMIN, Math.min(LMAX, Math.log10(sec))); return lerp(G.x0, G.x1, (l - LMIN) / (LMAX - LMIN)); };

    function axis(on) {
      const ax = S('g', { class: 'fb-ax', opacity: on ? 1 : 0 }, g);
      TICKS.forEach(function (t) {
        const x = lerp(G.x0, G.x1, (t[0] - LMIN) / (LMAX - LMIN));
        S('path', { d: 'M' + x + ' ' + (G.head + 3.5) + 'V' + (G.bot - 1), stroke: '#b7cde0', 'stroke-width': 0.35, 'stroke-dasharray': '1 1', fill: 'none' }, ax);
        const tx = S('text', { x: x, y: G.head + 1.8, 'font-size': 4.6, 'font-family': CAP, fill: '#777', 'text-anchor': 'middle' }, ax);
        tx.textContent = t[1];
      });
      const lb = S('text', { x: G.x0, y: G.head - 5.5, 'font-size': 4.6, 'font-family': CAP, fill: '#777' }, ax);
      lb.textContent = 'tempo (escala logarítmica)';
      return ax;
    }
    function bar(i, frac) {
      const y = G.rows[i], w = Math.max(0.6, (X(TABLE[i]) - G.x0) * frac);
      return S('rect', { x: G.x0, y: y - 2.6, width: w, height: 5.2, rx: 0.8, fill: i === 4 ? RED : MYBLUE, 'fill-opacity': i === 4 ? 0.85 : 0.55 }, g);
    }
    function mkMarker() {
      marker = S('g', null, g);
      S('path', { d: 'M0 ' + (G.rows[0] - 5) + 'V' + (G.bot + 2), stroke: GOLD, 'stroke-width': 0.8, fill: 'none' }, marker);
      const t = S('text', { x: 0, y: G.bot + 7.5, 'font-size': 5, 'font-family': CAP, fill: '#8a6500', 'text-anchor': 'middle', 'font-weight': 'bold' }, marker);
      marker._t = t;
    }
    function upd(flash) {
      pan.querySelector('b').textContent = n;
      const big = pan.querySelector('.cx-big');
      big.textContent = fmtBig(fact(n - 1));
      pan.querySelector('.cx-t').textContent = fmtTime(secOf(n));
      if (flash) { big.classList.remove('cx-flash'); void big.offsetWidth; big.classList.add('cx-flash'); }
      if (marker && G) {
        const s = secOf(n), out = Math.log10(s) > LMAX;
        marker.style.transition = flash ? 'transform 0.35s' : '';
        marker.style.transform = 'translate(' + X(s) + 'px, 0)';   // px = unidade do SVG (1 pt aqui)
        marker._t.textContent = 'n = ' + n + (out ? ' →' : '');
        marker._t.setAttribute('text-anchor', X(s) > G.x1 - 10 ? 'end' : 'middle');   // perto da borda: não sai do slide
      }
    }
    function placePanel() {   // à esquerda da tabela, centrado na altura dela
      pan.style.left = '0pt'; pan.style.top = ((G.head + G.bot) / 2) + 'pt';
      pan.style.width = Math.max(70, G.left - 10) + 'pt';
    }
    function snap(st) {
      while (g.firstChild) g.removeChild(g.firstChild);
      times.forEach(function (c) { c.style.opacity = ''; });
      marker = null;
      if (st !== 'b') { pan.style.display = 'none'; return; }
      G = geom();
      axis(true);
      for (let i = 0; i < 5; i++) bar(i, 1);
      mkMarker();
      pan.style.display = ''; pan.style.opacity = ''; placePanel(); upd(false);
    }
    async function play(a, b, h) {
      snap('vazio');
      if (b !== 'b') return;
      G = geom();
      times.forEach(function (c) { c.style.opacity = 0; });
      const ax = axis(false);
      await h.tween(300, function (e) { ax.setAttribute('opacity', e); });
      for (let i = 0; i < 5; i++) {
        const c = times[i], r = bar(i, 0.001);
        h.tween(250, function (e) { c.style.opacity = e; }).catch(function () {});
        const full = X(TABLE[i]) - G.x0;
        await h.tween(i === 4 ? 1100 : 550, function (e) { r.setAttribute('width', Math.max(0.6, full * e)); }, i === 4 ? ease.inOut : ease.out);
        if (i === 4) {   // 470 milhões de anos: a barra pulsa
          await h.tween(450, function (e, t) { r.setAttribute('fill-opacity', 0.85 - 0.45 * Math.sin(Math.PI * t)); }, ease.linear);
        } else await h.wait(120);
      }
      times.forEach(function (c) { c.style.opacity = ''; });
      mkMarker(); placePanel(); upd(false);
      pan.style.display = ''; pan.style.opacity = 0; marker.setAttribute('opacity', 0);
      await h.tween(350, function (e) { pan.style.opacity = e; marker.setAttribute('opacity', e); });
      pan.style.opacity = ''; marker.removeAttribute('opacity');
    }
    return { snap: snap, play: play };
  });
})();
