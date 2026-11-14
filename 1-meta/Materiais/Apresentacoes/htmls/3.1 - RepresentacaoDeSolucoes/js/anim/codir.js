/* Codificações diretas com o operador de movimento de cada uma (aula 3.1, frames 5–8): figuras rep_binario,
 * rep_discreto, rep_reais e rep_permutacao do Ipe em camadas (dados/codir.js, figura_camadas.py; quadro 193.2 × 177.2,
 * scale 1; vetor com células de 16 a partir de x0, y 144.6–160.6). A figura é redesenhada igual; as partes que mudam
 * (valores do vetor, ligações da designação, rota) são geradas. Painel pequeno à direita da figura (fora da moldura).
 *
 * <span class="anim pl" data-anim="codir" data-fig="bin|disc|real|perm" data-from="vazio" data-state="v"><img …></span>
 *   bin   clicar num bit inverte o bit (vira); painel: itens escolhidos (mochila).
 *   disc  clicar num valor troca o valor (1 → 2 → … → 5 → 1) e a ligação do desenho vai para o novo destino; painel: se
 *         ainda serve para designação (sem valores repetidos).
 *   real  arrastar um valor para cima/baixo muda o valor (0,1 a cada 4 px); painel: f(x, y, z, h, i) ao vivo.
 *   perm  clicar em dois valores troca os dois (swap) e a rota do desenho muda; painel: comprimento da rota e o ótimo.
 *   Entrada (de vazio): o operador é demonstrado uma vez e volta ao valor do PDF; o painel aparece.
 *   "↺ como no slide" volta aos valores do PDF.
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease, lerp = Anim.lerp;
  const FD = Anim.figData || {};
  const RED = '#b6321d', HL = '#bdd4e6';
  const FONT = '"LM Sans 8", "LM Sans", sans-serif';
  const CFG = {
    bin: { data: 'rep_binario', x0: 16.6, vals: [1, 0, 0, 0, 1, 0, 0, 1, 0, 1], txt: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21] },
    disc: { data: 'rep_discreto', x0: 52.6, vals: [1, 5, 2, 4, 3], txt: [22, 23, 24, 25, 26], edges: [7, 10, 8, 9, 21] },
    real: { data: 'rep_reais', x0: 52.6, vals: [1.0, 2.8, 5.5, 4.1, 9.9], txt: [8, 30, 31, 32, 33] },
    perm: { data: 'rep_permutacao', x0: 52.6, vals: [1, 5, 2, 4, 3], txt: [23, 24, 25, 26, 27], tour: 12 }
  };
  const CITY = { 1: [32.6, 96.6], 2: [64.6, 52.6], 3: [156.6, 60.6], 4: [80.6, 124.6], 5: [108.6, 88.6] };
  const NODE_Y = function (k) { return 60.6 + 12 * (k - 1); };
  const fixText = function (t) {
    return t.replace(/¸c˜ao/g, 'ção').replace(/¸c˜oes/g, 'ções').replace(/´a/g, 'á').replace(/´e/g, 'é').replace(/´ı/g, 'í').replace(/´o/g, 'ó');
  };
  const fmtR = function (v) { return v.toFixed(1); };
  const pt = function (v, d) { return v.toFixed(d).replace('.', ',').replace('-', '−'); };
  const fOf = function (v) { return 2 * v[0] + v[0] * v[1] - 3 * Math.pow(v[2], 3) + v[3] / v[4]; };
  const tourLen = function (o) { let L = 0; for (let i = 0; i < o.length; i++) { const a = CITY[o[i]], b = CITY[o[(i + 1) % o.length]]; L += Math.hypot(a[0] - b[0], a[1] - b[1]); } return L; };
  const BEST = (function () {   // menor rota de 5 pontos (força bruta, começando no 1)
    let best = Infinity;
    (function go(pre, rest) {
      if (!rest.length) { best = Math.min(best, tourLen(pre)); return; }
      rest.forEach(function (r, i) { go(pre.concat([r]), rest.slice(0, i).concat(rest.slice(i + 1))); });
    })([1], [2, 3, 4, 5]);
    return best;
  })();

  function mk(it, parent) {
    if (it.t === 'x') {
      const t = S('text', { x: it.x, y: it.y, 'font-size': it.fs, fill: it.c, 'font-family': it.ff }, parent);
      t.textContent = fixText(it.tx); return t;
    }
    const p = S('path', { d: it.d, fill: it.f || 'none' }, parent);
    if (it.fo !== undefined) p.setAttribute('fill-opacity', it.fo);
    if (it.s) { p.setAttribute('stroke', it.s); p.setAttribute('stroke-width', it.w); p.setAttribute('stroke-linejoin', 'round'); }
    return p;
  }

  Anim.define('codir', function (host) {
    const kind = host.dataset.fig, C = CFG[kind], D = FD[C.data], frame = host.closest('section');
    if (!D) { console.warn('codir: faltam os dados (dados/codir.js)'); return { snap: function () {}, play: null }; }
    const IT = D.items, n = C.vals.length;
    const svg = S('svg', { viewBox: '0 0 ' + D.W + ' ' + D.H });
    host.appendChild(svg);
    const gHl = S('g', null, svg), gIt = S('g', null, svg), gDyn = S('g', null, svg), gHit = S('g', null, svg);
    const dyn = new Set(C.txt.concat(C.edges || [], C.tour !== undefined ? [C.tour] : []));
    // fundo das células (destaque) atrás de tudo
    const cellBg = C.vals.map(function (v, i) { return S('rect', { x: C.x0 + 16 * i, y: 144.6, width: 16, height: 16, fill: HL, opacity: 0 }, gHl); });
    IT.forEach(function (it, i) { if (!dyn.has(i)) mk(it, gIt); });
    const texts = C.txt.map(function (i) { return mk(IT[i], gDyn); });
    let vals = C.vals.slice(), sel = -1;
    const edges = C.edges ? C.edges.map(function (i) { return mk(IT[i], gDyn); }) : null;
    const tour = C.tour !== undefined ? mk(IT[C.tour], gDyn) : null;

    function setText(i) {
      const it = IT[C.txt[i]], t = texts[i], v = vals[i];
      const s = kind === 'real' ? fmtR(v) : String(v);
      t.textContent = s;
      if (v === C.vals[i]) { t.setAttribute('x', it.x); t.removeAttribute('text-anchor'); }
      else { t.setAttribute('x', C.x0 + 16 * i + 8); t.setAttribute('text-anchor', 'middle'); }
    }
    function edgeD(i, yR) { return 'M56.6 ' + NODE_Y(i + 1) + 'L136.6 ' + yR; }
    function tourD(o) { return 'M' + o.concat([o[0]]).map(function (c) { return CITY[c][0] + ' ' + CITY[c][1]; }).join('L'); }
    function render() {
      for (let i = 0; i < n; i++) setText(i);
      if (edges) edges.forEach(function (e, i) { e.setAttribute('d', edgeD(i, NODE_Y(vals[i]))); });
      if (tour) tour.setAttribute('d', tourD(vals));
      cellBg.forEach(function (r, i) { r.setAttribute('opacity', i === sel ? 1 : 0); });
      panelUpdate();
    }

    // ---------- painel ----------
    let pnl = null;
    const TITLE = { bin: 'Operador: inverter um bit', disc: 'Operador: trocar um valor', real: 'Operador: alterar um valor', perm: 'Operador: trocar dois (swap)' };
    const HINT = { bin: 'clique num bit', disc: 'clique num valor (1 → … → 5)', real: 'arraste um valor ↕', perm: 'clique em dois valores' };
    function buildPanel() {
      if (pnl) return;
      pnl = document.createElement('div');
      pnl.className = 'cd-pnl'; pnl.setAttribute('data-interactive', '');
      pnl.innerHTML = '<b>' + TITLE[kind] + '</b><span class="cd-h">' + HINT[kind] + '</span><span class="cd-r"></span>' +
        '<button type="button">↺ como no slide</button>';
      frame.appendChild(pnl);
      pnl.querySelector('button').addEventListener('click', function () { vals = C.vals.slice(); sel = -1; render(); });
    }
    function panelUpdate() {
      if (!pnl) return;
      const r = pnl.querySelector('.cd-r');
      if (kind === 'bin') {
        const it = vals.map(function (v, i) { return v ? i + 1 : 0; }).filter(Boolean);
        r.innerHTML = 'itens na mochila: <b>' + (it.length ? it.join(', ') : 'nenhum') + '</b><br>vizinhos (1 bit): ' + n;
      } else if (kind === 'disc') {
        const dup = vals.filter(function (v, i) { return vals.indexOf(v) !== i; });
        r.innerHTML = 'x = (' + vals.join(',') + ')<br>' + (dup.length
          ? 'designação: <span class="ko">✗ o ' + dup[0] + ' se repete</span><br><span class="cd-n">(localização: ✓)</span>'
          : 'designação: <span class="ok">✓ sem repetição</span>');
      } else if (kind === 'real') {
        r.innerHTML = 'f(x, y, z, h, i) =<br><b>' + pt(fOf(vals), 2) + '</b>';
      } else {
        const L = tourLen(vals), best = Math.abs(L - BEST) < 0.01;
        r.innerHTML = 'rota ' + vals.concat([vals[0]]).join('→') + '<br>comprimento: <b' + (best ? ' class="ok"' : '') + '>' + pt(L, 1) + '</b><br><span class="cd-n">(menor possível: ' + pt(BEST, 1) + ')</span>';
      }
    }
    function positionPanel() {
      if (!pnl) return;
      const s = frame.getBoundingClientRect().width / frame.offsetWidth || 1, fr = frame.getBoundingClientRect(), r = host.getBoundingClientRect();
      const k = r.width / D.W;
      pnl.style.left = ((r.right - fr.left) / s + 8) + 'px';
      pnl.style.top = ((r.top - fr.top + 92 * k) / s) + 'px';
    }

    // ---------- interação ----------
    let busy = false;
    async function anim(dur, fn) {   // tween simples (interação, fora do Runner do core)
      return new Promise(function (res) {
        const t0 = performance.now();
        (function fr(now) { const t = Math.min(1, (now - t0) / dur); fn(ease.inOut(t)); if (t < 1) requestAnimationFrame(fr); else res(); })(t0);
      });
    }
    async function flipBit(i, tw) {
      const t = texts[i], c = [C.x0 + 16 * i + 8, 152.6];
      cellBg[i].setAttribute('opacity', 1);
      await tw(170, function (e) { t.setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ') scale(1 ' + Math.max(0.02, 1 - e) + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')'); });
      vals[i] = 1 - vals[i]; setText(i);
      await tw(170, function (e) { t.setAttribute('transform', 'translate(' + c[0] + ' ' + c[1] + ') scale(1 ' + Math.max(0.02, e) + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')'); });
      t.removeAttribute('transform');
      await tw(300, function (e) { cellBg[i].setAttribute('opacity', 1 - e); });
      panelUpdate();
    }
    async function setDisc(i, v, tw) {
      const y0 = NODE_Y(vals[i]), y1 = NODE_Y(v);
      cellBg[i].setAttribute('opacity', 1);
      vals[i] = v; setText(i); panelUpdate();
      edges[i].setAttribute('stroke', RED); edges[i].setAttribute('stroke-width', 1.2);
      await tw(380, function (e) { edges[i].setAttribute('d', edgeD(i, lerp(y0, y1, e))); });
      await tw(300, function (e) { cellBg[i].setAttribute('opacity', 1 - e); });
      edges[i].setAttribute('stroke', '#000'); edges[i].setAttribute('stroke-width', 0.8);
    }
    async function swap(a, b, tw) {
      const ta = texts[a], tb = texts[b], dx = 16 * (b - a);
      cellBg[a].setAttribute('opacity', 1); cellBg[b].setAttribute('opacity', 1);
      await tw(420, function (e) {
        ta.setAttribute('transform', 'translate(' + dx * e + ' ' + (-6 * Math.sin(Math.PI * e)) + ')');
        tb.setAttribute('transform', 'translate(' + (-dx * e) + ' ' + (6 * Math.sin(Math.PI * e)) + ')');
      });
      ta.removeAttribute('transform'); tb.removeAttribute('transform');
      const t = vals[a]; vals[a] = vals[b]; vals[b] = t; sel = -1;
      for (let i = 0; i < n; i++) setText(i);
      // a rota nova se traça
      tour.setAttribute('d', tourD(vals)); tour.setAttribute('stroke', RED); tour.setAttribute('stroke-width', 0.9);
      const L = tour.getTotalLength ? tour.getTotalLength() : 500;
      tour.setAttribute('stroke-dasharray', L); tour.setAttribute('stroke-dashoffset', L);
      panelUpdate();
      await tw(600, function (e) { tour.setAttribute('stroke-dashoffset', L * (1 - e)); });
      tour.removeAttribute('stroke-dasharray'); tour.removeAttribute('stroke-dashoffset');
      await tw(300, function (e) { cellBg[a].setAttribute('opacity', 1 - e); cellBg[b].setAttribute('opacity', 1 - e); });
      tour.setAttribute('stroke', '#000'); tour.setAttribute('stroke-width', 0.4);
    }
    async function setReal(i, v, dur, tw) {
      const v0 = vals[i];
      cellBg[i].setAttribute('opacity', 1);
      await tw(dur, function (e) { vals[i] = Math.round(lerp(v0, v, e) * 10) / 10; setText(i); panelUpdate(); });
      vals[i] = v; setText(i); panelUpdate();
      await tw(300, function (e) { cellBg[i].setAttribute('opacity', 1 - e); });
    }
    const local = function (d, f) { return anim(d, f); };
    for (let i = 0; i < n; i++) {
      const r = S('rect', { x: C.x0 + 16 * i, y: 144.6, width: 16, height: 16, fill: '#fff', 'fill-opacity': 0, class: 'cd-hit' + (kind === 'real' ? ' cd-drag' : '') }, gHit);
      if (kind === 'real') {
        let drag = null;
        r.addEventListener('pointerdown', function (e) { e.preventDefault(); try { r.setPointerCapture(e.pointerId); } catch (x) {} drag = { y: e.clientY, v: vals[i], s: frame.getBoundingClientRect().width / frame.offsetWidth || 1 }; cellBg[i].setAttribute('opacity', 1); });
        r.addEventListener('pointermove', function (e) {
          if (!drag) return;
          const dy = (drag.y - e.clientY) / drag.s;
          vals[i] = Math.max(0, Math.min(99.9, Math.round((drag.v + Math.round(dy / 4) * 0.1) * 10) / 10)); setText(i); panelUpdate();
        });
        const end = function () { if (!drag) return; drag = null; cellBg[i].setAttribute('opacity', 0); };
        r.addEventListener('pointerup', end); r.addEventListener('pointercancel', end);
        r.addEventListener('click', function (e) { e.stopPropagation(); });
      } else {
        r.addEventListener('click', async function (e) {
          e.stopPropagation();
          if (busy) return;
          busy = true;
          try {
            if (kind === 'bin') await flipBit(i, local);
            else if (kind === 'disc') await setDisc(i, vals[i] % 5 + 1, local);
            else if (kind === 'perm') {
              if (sel < 0) { sel = i; cellBg[i].setAttribute('opacity', 1); }
              else if (sel === i) { sel = -1; cellBg[i].setAttribute('opacity', 0); }
              else await swap(sel, i, local);
            }
          } finally { busy = false; }
        });
      }
    }

    function snap(st) {
      vals = C.vals.slice(); sel = -1;
      if (edges) edges.forEach(function (e) { e.setAttribute('stroke', '#000'); e.setAttribute('stroke-width', 0.8); });
      if (tour) { tour.setAttribute('stroke', '#000'); tour.setAttribute('stroke-width', 0.4); tour.removeAttribute('stroke-dasharray'); }
      texts.forEach(function (t) { t.removeAttribute('transform'); });
      const on = st !== 'vazio';
      host.toggleAttribute('data-interactive', on);
      if (on) { buildPanel(); pnl.style.display = ''; pnl.style.opacity = ''; positionPanel(); }
      else if (pnl) pnl.style.display = 'none';
      render();
    }
    async function play(a, b, h) {
      snap(b);
      pnl.style.opacity = 0;
      await h.wait(350);
      const tw = function (d, f) { return h.tween(d, f); };
      if (kind === 'bin') { await flipBit(1, tw); await h.wait(500); await flipBit(1, tw); }
      else if (kind === 'disc') { await setDisc(2, 3, tw); await h.wait(500); await setDisc(2, 2, tw); }
      else if (kind === 'real') { await setReal(2, 2.0, 700, tw); await h.wait(400); await setReal(2, 5.5, 700, tw); }
      else { await swap(1, 3, tw); await h.wait(500); await swap(1, 3, tw); }
      await h.tween(350, function (e) { pnl.style.opacity = e; });
      pnl.style.opacity = '';
    }
    window.addEventListener('resize', function () { if (pnl && pnl.style.display !== 'none') positionPanel(); });
    return { snap: snap, play: play };
  });
})();
