/* Processo de tomada de decisão (aula 3, frames 4–9; figuras decisao1…6 do Ipe em camadas, dados/dec.js,
 * quadro 252.4 × 52.4). Uso: <span class="anim pl" data-anim="decisao" data-from=".." data-state="decisaoN"><img …></span>
 *   vazio → 1   as caixas brotam da esquerda para a direita, as setas se traçam, as setas de "retomar" entram
 *   k → k+1     (frames 5–8) uma ficha sai da etapa anterior pela seta até a próxima; a anterior apaga e a nova
 *               acende (preenchimento e borda grossa) com um pulso; no 8 o "Sol." pulsa na passagem
 *   5 → 6       (frame 9, Retomar) Implementar apaga; três fichas percorrem as setas de retomar e o pontilhado fica
 *               azul atrás de cada uma (máscara), a ponta brota na chegada
 * Estado final = figura do PDF.
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease, lerp = Anim.lerp;
  const FD = Anim.figData || {};
  const GOLD = '#e0a400';
  const ON = { 1: 0, 2: 2, 3: 4, 4: 6 }, OFF = { 1: 1, 2: 3, 3: 5, 4: 7 };   // etapa -> caixa acesa / apagada
  const TEXT = { 1: 27, 2: 28, 3: 29, 4: 30 };
  const ARROW = { 2: [8, 9], 3: [10, 11], 4: [12, 13] };                      // seta que chega na etapa
  const BACK = [[20, 21, 14, 15], [22, 23, 16, 17], [24, 25, 18, 19]];        // retomar: preto (linha, ponta) → azul
  const step = function (st) { const n = +String(st).replace('decisao', ''); return n >= 2 && n <= 5 ? n - 1 : 0; };

  function mk(it, parent) {
    if (it.t === 'x') {
      const t = S('text', { x: it.x, y: it.y, 'font-size': it.fs, 'font-family': it.ff, fill: it.c }, parent);
      // largura do PDF (o navegador não aplica o kerning do TeX, ex.: "Fo" em Formular)
      if (it.tx.length > 1) { t.setAttribute('textLength', (it.b[2] - it.b[0]).toFixed(2)); t.setAttribute('lengthAdjust', 'spacing'); }
      t.textContent = it.tx;
      return t;
    }
    const p = S('path', { d: it.d, fill: it.f || 'none' }, parent);
    if (it.fo !== undefined) p.setAttribute('fill-opacity', it.fo);
    if (it.s) { p.setAttribute('stroke', it.s); p.setAttribute('stroke-width', it.w); if (it.da) p.setAttribute('stroke-dasharray', it.da); }
    return p;
  }

  Anim.define('decisao', function (host) {
    const D = FD.dec;
    if (!D) { console.warn('decisao: faltam os dados (dados/dec.js)'); return { snap: function () {}, play: null }; }
    const IT = D.items;
    const svg = S('svg', { viewBox: '0 0 ' + D.W + ' ' + D.H });
    host.appendChild(svg);
    const defs = S('defs', null, svg), gIt = S('g', null, svg), gFx = S('g', null, svg);
    const els = IT.map(function (it) { return mk(it, gIt); });
    // no Ipe o preenchimento cinza (opacidade 0.3) das caixas é desenhado por cima do nome da etapa (o texto sai
    // acinzentado no PDF): os nomes vão para o início do grupo
    [30, 29, 28, 27].forEach(function (i) { gIt.insertBefore(els[i], gIt.firstChild); });
    const uid = Math.random().toString(36).slice(2);
    const ST = function (s) { return s === 'vazio' ? [] : D.states[s] || []; };

    function reset(i) { const e = els[i]; e.style.opacity = ''; e.removeAttribute('transform'); e.style.strokeDasharray = ''; e.style.strokeDashoffset = ''; e.removeAttribute('mask'); }
    function show(ids, on) { ids.forEach(function (i) { els[i].style.display = on === false ? 'none' : ''; }); }
    function showSet(ids) { const s = new Set(ids); els.forEach(function (e, i) { reset(i); e.style.display = s.has(i) ? '' : 'none'; }); }
    const ctr = function (i) { const b = IT[i].b; return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; };
    function pop(h, ids, c, dur) {
      show(ids);
      return h.tween(dur || 300, function (e, t) {
        ids.forEach(function (i) { els[i].style.opacity = Math.min(1, t * 3); els[i].setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ') scale(' + Math.max(0.001, ease.back(t)) + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')'); });
      }, ease.linear).then(function () { ids.forEach(reset); });
    }
    function trace(h, i, dur) {
      const el = els[i]; show([i]); reset(i);
      const L = el.getTotalLength();
      el.style.strokeDasharray = L + ' ' + (L + 1); el.style.strokeDashoffset = L;
      return h.tween(dur || 260, function (e) { el.style.strokeDashoffset = L * (1 - e); }).then(function () { reset(i); });
    }
    function cross(h, a, b, dur) {   // troca a por b (opacidade cruzada)
      show([a, b]); els[b].style.opacity = 0;
      return h.tween(dur || 400, function (e) { els[a].style.opacity = 1 - e; els[b].style.opacity = e; })
        .then(function () { show([a], false); reset(a); reset(b); });
    }
    function pulse(h, ids, amp, dur) {
      const b = [Infinity, Infinity, -Infinity, -Infinity];
      ids.forEach(function (i) { const q = IT[i].b; b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[2]); b[3] = Math.max(b[3], q[3]); });
      const c = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
      return h.tween(dur || 450, function (e, t) {
        const s = 1 + (amp || 0.08) * Math.sin(Math.PI * t);
        ids.forEach(function (i) { els[i].setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ') scale(' + s + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')'); });
      }, ease.linear).then(function () { ids.forEach(function (i) { els[i].removeAttribute('transform'); }); });
    }
    function token(p) { return S('circle', { cx: p[0], cy: p[1], r: 2.4, fill: GOLD, stroke: '#8a6500', 'stroke-width': 0.3 }, gFx); }
    // ficha ao longo de um caminho; o pontilhado azul é revelado atrás dela por uma máscara
    async function along(h, line, reveal, dur) {
      const path = els[line], L = path.getTotalLength(), p0 = path.getPointAtLength(0);
      const tok = token([p0.x, p0.y]);
      let mp = null;
      if (reveal != null) {
        const m = S('mask', { id: 'dm' + uid + reveal, maskUnits: 'userSpaceOnUse', x: -5, y: -5, width: D.W + 10, height: D.H + 10 }, defs);
        mp = S('path', { d: IT[reveal].d, stroke: '#fff', 'stroke-width': 4, fill: 'none', 'stroke-dasharray': L + ' ' + (L + 1), 'stroke-dashoffset': L }, m);
        show([reveal]); els[reveal].setAttribute('mask', 'url(#' + m.id + ')');
      }
      await h.tween(dur || 700, function (e) {
        const q = path.getPointAtLength(L * e);
        tok.setAttribute('cx', q.x); tok.setAttribute('cy', q.y);
        if (mp) mp.setAttribute('stroke-dashoffset', L * (1 - e));
      }, ease.inOut);
      if (reveal != null) els[reveal].removeAttribute('mask');
      return tok;
    }
    async function fadeTok(h, tok) { await h.tween(200, function (e) { tok.setAttribute('opacity', 1 - e); }); tok.remove(); }

    async function build(h) {   // vazio → decisao1
      for (const k of [1, 2, 3, 4]) {
        await pop(h, [OFF[k], TEXT[k]], ctr(OFF[k]), 300);
        if (ARROW[k + 1]) { await trace(h, ARROW[k + 1][0], 220); await pop(h, [ARROW[k + 1][1]], ctr(ARROW[k + 1][1]), 160); }
      }
      await pop(h, [26], ctr(26), 250);
      for (const b of BACK) {
        show([b[0], b[1]]); els[b[0]].style.opacity = 0; els[b[1]].style.opacity = 0;
        await h.tween(300, function (e) { els[b[0]].style.opacity = e; els[b[1]].style.opacity = e; });
        reset(b[0]); reset(b[1]);
      }
    }
    async function advance(h, from, to) {   // etapa from (0 = nenhuma) → to
      if (from && ARROW[to]) {
        const tok = await along(h, ARROW[to][0], null, 550);
        if (to === 4) pulse(h, [26], 0.4, 450).catch(function () {});
        await fadeTok(h, tok);
      }
      const offs = from ? cross(h, ON[from], OFF[from], 350) : Promise.resolve();
      show([OFF[to]]);
      await h.all([offs, cross(h, OFF[to], ON[to], 400)]);
      const ring = S('rect', { x: IT[ON[to]].b[0], y: IT[ON[to]].b[1], width: IT[ON[to]].b[2] - IT[ON[to]].b[0], height: IT[ON[to]].b[3] - IT[ON[to]].b[1], fill: 'none', stroke: '#00008b', 'stroke-width': 1 }, gFx);
      const c = ctr(ON[to]);
      await h.tween(550, function (e) {
        const s = 1 + 0.25 * e; ring.setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ') scale(' + s + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')'); ring.setAttribute('opacity', 1 - e);
      }, ease.out);
      ring.remove();
    }
    async function retomar(h) {   // decisao5 → decisao6
      await cross(h, ON[4], OFF[4], 400);
      for (const b of BACK) {
        const tok = await along(h, b[0], b[2], 1000);
        show([b[0]], false);
        show([b[1]], false); await pop(h, [b[3]], ctr(b[3]), 220);
        await fadeTok(h, tok);
      }
    }

    function snap(st) { while (gFx.firstChild) gFx.removeChild(gFx.firstChild); showSet(ST(st)); }
    async function play(a, b, h) {
      snap(a);
      if (b === 'decisao1' && a === 'vazio') { showSet([]); await build(h); }
      else if (b === 'decisao6' && a === 'decisao5') await retomar(h);
      else if (step(b) && step(b) === step(a) + 1) await advance(h, step(a), step(b));
      snap(b);
    }
    return { snap: snap, play: play };
  });
})();
