/* Encolhimento do espaço de busca (aula 3.1, frame 21): ao lado das chaves "Cod. 1 / 2 / 3" (passo 2), uma barra
 * por codificação em escala log, alinhada com a linha do texto, no espaço vazio à direita (x 222–433, y 100–167; o
 * block "Conclusão" do passo 3 começa em 168.7).
 *
 * <span class="anim sb" data-anim="espbusca" data-state="vazio,barras"> filho direto do <section> (fora do .fc: não
 * entra no layout nem no shrinkToFit); o svg cobre o frame inteiro, em pt (viewBox 453.543 × 255.118).
 *   vazio  (passo 1) nada
 *   barras (passo 2, fica no 3) as barras crescem uma a uma com o número contando (escala log, 13.48 pt por década);
 *          depois, tracejado em vermelho, o pedaço que cada codificação corta da anterior (÷ 264 e ÷ 416) e o tempo
 *          para avaliar todas as soluções a 1 milhão por segundo (74 min → 17 s → 0,04 s).
 * Cod. 1 = C(64,8) = 4.426.165.368 (8 casas distintas entre 64; o slide diz "4 bilhões"), Cod. 2 = 8⁸ = 16.777.216,
 * Cod. 3 = 8! = 40.320.
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease;
  const BLUE = '#0061a5', RED = '#b6321d', GRAY = '#777';
  const FONT = '"LM Sans 8", "LM Sans", sans-serif';
  const X0 = 222, PD = 13.48, BH = 7, XV = 357, XT = 433;
  const ROWS = [
    { n: 4426165368, y: 123.28 },
    { n: 16777216, y: 139.54 },
    { n: 40320, y: 155.8 }
  ];
  const RATE = 1e6;
  const len = function (n) { return PD * Math.log10(n); };
  function num(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.', ',') + ' bilhões';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' milhões';
    return Math.round(n).toLocaleString('pt-BR');
  }
  function tempo(n) {
    const s = n / RATE;
    if (s >= 60) return Math.round(s / 60) + ' min';
    if (s >= 1) return Math.round(s) + ' s';
    return s.toFixed(2).replace('.', ',') + ' s';
  }

  Anim.define('espbusca', function (host) {
    const svg = S('svg', { viewBox: '0 0 453.543 255.118' });
    host.appendChild(svg);
    const g = S('g', null, svg);
    const txt = function (x, y, s, attrs, parent) {
      const t = S('text', Object.assign({ x: x, y: y, 'font-size': 6.2, 'font-family': FONT, fill: GRAY }, attrs || {}), parent || g);
      t.textContent = s; return t;
    };
    const head = S('g', null, g);
    txt(X0, 108.2, 'tamanho do espaço de busca (escala log)', null, head);
    txt(XT, 108.2, 'avaliando 10⁶ por segundo', { 'text-anchor': 'end' }, head);
    const R = ROWS.map(function (r) {
      const o = { r: r };
      o.bar = S('rect', { x: X0, y: r.y - BH, width: len(r.n), height: BH, fill: BLUE, 'fill-opacity': 0.75, rx: 0.6 }, g);
      o.val = txt(XV, r.y - 0.6, num(r.n), { fill: '#222', 'font-size': 7 });
      o.t = txt(XT, r.y - 0.6, tempo(r.n), { 'text-anchor': 'end', fill: '#222', 'font-size': 7 });
      return o;
    });
    // o que cada codificação corta da anterior
    const cuts = [1, 2].map(function (i) {
      const a = len(ROWS[i].n), b = len(ROWS[i - 1].n), y = ROWS[i].y;
      const c = S('g', null, g);
      S('rect', { x: X0 + a, y: y - BH, width: b - a, height: BH, fill: RED, 'fill-opacity': 0.08, stroke: RED, 'stroke-width': 0.5, 'stroke-dasharray': '1.5 1' }, c);
      txt(X0 + (a + b) / 2, y - 1.7, '÷ ' + Math.round(ROWS[i - 1].n / ROWS[i].n), { 'text-anchor': 'middle', fill: RED, 'font-size': 5.6 }, c);
      return c;
    });
    const all = function (v) { g.style.display = v ? '' : 'none'; };

    function snap(st) {
      all(st === 'barras');
      [head].concat(cuts).forEach(function (e) { e.style.opacity = ''; });
      R.forEach(function (o) { o.bar.setAttribute('width', len(o.r.n)); o.val.textContent = num(o.r.n); o.t.textContent = tempo(o.r.n); o.val.style.opacity = o.t.style.opacity = ''; });
    }
    async function play(a, b, h) {
      if (b !== 'barras') { snap(b); return; }
      all(true);
      head.style.opacity = 0;
      cuts.forEach(function (c) { c.style.opacity = 0; });
      R.forEach(function (o) { o.bar.setAttribute('width', 0); o.val.style.opacity = 0; o.t.style.opacity = 0; });
      await h.tween(300, function (e) { head.style.opacity = e; });
      for (const o of R) {
        const L = Math.log10(o.r.n);
        o.val.style.opacity = 1;
        await h.tween(900, function (e) {
          o.bar.setAttribute('width', PD * L * e);
          o.val.textContent = num(Math.pow(10, L * e));
        }, ease.out);
        o.val.textContent = num(o.r.n);
        await h.tween(250, function (e) { o.t.style.opacity = e; });
        await h.wait(150);
      }
      for (const c of cuts) await h.tween(350, function (e) { c.style.opacity = e; });
    }
    return { snap: snap, play: play };
  });
})();
