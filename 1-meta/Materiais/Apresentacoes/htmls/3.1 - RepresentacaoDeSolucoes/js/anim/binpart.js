/* Bin-packing: ABBA e BAAB são a mesma partição (aula 3.1, frame 29). Acrescentado no espaço vazio à direita das
 * fórmulas (x ≥ 280; L = [0,1,2,3] em y 98–108, ABBA em 150–159, BAAB em 183–193, "Indica…" começa em 203).
 *
 * <span class="anim sb" data-anim="binpart" data-from="vazio" data-state="itens,abba,baab"> filho do <section>.
 *   itens (passo 1): os itens 0–3 aparecem como peças ao lado de L.
 *   abba  (passo 2): duas caixas surgem (etiquetas A e B); cada letra de ABBA acende na fórmula e o item
 *         correspondente voa para a caixa; peças e letras ganham a cor do grupo ({0,3} verde, {1,2} roxo).
 *   baab  (passo 3): as letras de BAAB acendem com as mesmas cores (é a mesma partição); as etiquetas das caixas giram
 *         e trocam A ↔ B, os itens não se mexem; "mesma partição: {0, 3} e {1, 2}" e "só os nomes das caixas mudam".
 * As letras são as da própria fórmula (KaTeX, .mathnormal): só a cor muda.
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease, lerp = Anim.lerp;
  const FONT = '"LM Sans 8", "LM Sans", sans-serif';
  const G1 = { c: '#1a7f37', f: '#cfe6c6' }, G2 = { c: '#7b3fa0', f: '#e6d6f0' };
  const GRP = [G1, G2, G2, G1];               // item → grupo
  const ABBA = 'ABBA', BAAB = 'BAAB';
  const T = 12;                                // lado da peça
  const ROW = function (i) { return [292 + i * 16, 96.5]; };   // peças ao lado de L
  const BIN = [{ x: 303, y: 150, w: 48, h: 46 }, { x: 371, y: 150, w: 48, h: 46 }];
  const SLOT = function (b, k) { return [BIN[b].x + 7 + k * 21, BIN[b].y + BIN[b].h - T - 4]; };
  const PLACE = { 0: [0, 0], 3: [0, 1], 1: [1, 0], 2: [1, 1] };   // item → (caixa, posição)

  Anim.define('binpart', function (host) {
    const frame = host.closest('section');
    const svg = S('svg', { viewBox: '0 0 453.543 255.118' });
    host.appendChild(svg);
    const root = S('g', null, svg), gBin = S('g', null, root), gIt = S('g', null, root), gCap = S('g', null, root);
    const bins = BIN.map(function (b, i) {
      const g = S('g', null, gBin);
      S('path', { d: 'M' + b.x + ' ' + b.y + 'V' + (b.y + b.h) + 'H' + (b.x + b.w) + 'V' + b.y, fill: 'none', stroke: '#444', 'stroke-width': 1, 'stroke-linejoin': 'round' }, g);
      g.tag = S('text', { x: b.x + b.w / 2, y: b.y + 15, 'text-anchor': 'middle', 'font-size': 11, 'font-family': 'KaTeX_Math', fill: '#333' }, g);
      g.tag.textContent = 'AB'[i];
      return g;
    });
    const items = [0, 1, 2, 3].map(function (i) {
      const g = S('g', null, gIt);
      g.r = S('rect', { width: T, height: T, rx: 1.6, fill: '#fff', stroke: '#555', 'stroke-width': 0.7 }, g);
      const t = S('text', { x: T / 2, y: T / 2 + 2.6, 'text-anchor': 'middle', 'font-size': 7.5, 'font-family': 'KaTeX_Main' }, g);
      t.textContent = i;
      return g;
    });
    const cap = S('g', null, gCap);
    (function () {
      const t = S('text', { x: 303, y: 139.2, 'font-size': 6.6, 'font-family': FONT, fill: '#444' }, cap);
      const add = function (s, col, b) { const sp = S('tspan', { fill: col || '#444' }, t); if (b) sp.setAttribute('font-weight', 700); sp.textContent = s; };
      add('mesma partição: '); add('{0, 3}', G1.c, true); add(' e '); add('{1, 2}', G2.c, true);
      const t2 = S('text', { x: 303, y: 146.6, 'font-size': 5.6, 'font-family': FONT, fill: '#777' }, cap);
      t2.textContent = 'só os nomes das caixas mudam';
    })();
    const at = function (g, p, s) { g.setAttribute('transform', 'translate(' + p[0] + ' ' + p[1] + ')' + (s && s !== 1 ? ' scale(' + s + ')' : '')); };
    const color = function (i, on) { items[i].r.setAttribute('fill', on ? GRP[i].f : '#fff'); items[i].r.setAttribute('stroke', on ? GRP[i].c : '#555'); };

    // letras das fórmulas ABBA / BAAB
    function letters(word) {
      const eq = Array.prototype.find.call(frame.querySelectorAll('.eq'), function (e) {
        const k = e.querySelector('.katex-html'); return k && k.textContent.replace(/\s/g, '') === word;
      });
      if (!eq) return [];
      // o KaTeX junta letras iguais seguidas num só span ("BB"): separa em um span por letra (mesma classe)
      Array.prototype.slice.call(eq.querySelectorAll('.katex-html .mathnormal')).forEach(function (el) {
        const t = el.textContent; if (t.length < 2) return;
        const mr = el.style.marginRight; el.style.marginRight = '';
        for (let i = 0; i < t.length; i++) {
          const c = el.cloneNode(false); c.textContent = t[i];
          if (i === t.length - 1 && mr) c.style.marginRight = mr;
          el.parentNode.insertBefore(c, el);
        }
        el.remove();
      });
      return Array.prototype.slice.call(eq.querySelectorAll('.katex-html .mathnormal'));
    }
    const LA = letters(ABBA), LB = letters(BAAB);
    function paint(L, on) { L.forEach(function (el, i) { el.style.color = on ? GRP[i].c : ''; el.style.transition = 'color .25s'; }); }

    function layout(st) {
      root.style.display = st === 'vazio' ? 'none' : '';
      const packed = st === 'abba' || st === 'baab';
      gBin.style.display = packed ? '' : 'none';
      items.forEach(function (g, i) { at(g, packed ? SLOT(PLACE[i][0], PLACE[i][1]) : ROW(i)); color(i, packed); g.style.opacity = ''; });
      bins.forEach(function (b, i) { b.tag.textContent = st === 'baab' ? 'BA'[i] : 'AB'[i]; b.tag.removeAttribute('transform'); b.style.opacity = ''; });
      cap.style.display = st === 'baab' ? '' : 'none'; cap.style.opacity = '';
      paint(LA, packed); paint(LB, st === 'baab');
    }
    async function play(a, b, h) {
      if (b === 'itens') {
        layout('itens');
        items.forEach(function (g) { g.style.opacity = 0; });
        for (let i = 0; i < 4; i++) {
          const g = items[i], p = ROW(i);
          h.tween(300, function (e) { g.style.opacity = Math.min(1, e * 2); at(g, [p[0] + T / 2 * (1 - e), p[1] + T / 2 * (1 - e)], Math.max(0.01, e)); }, ease.back).catch(function () {});
          await h.wait(110);
        }
        await h.wait(300);
        return;
      }
      if (b === 'abba') {
        layout('itens');
        gBin.style.display = '';
        bins.forEach(function (g) { g.style.opacity = 0; });
        await h.tween(350, function (e) { bins.forEach(function (g) { g.style.opacity = e; }); });
        for (let i = 0; i < 4; i++) {
          const el = LA[i]; if (el) { el.style.transition = 'color .2s'; el.style.color = GRP[i].c; }
          const p0 = ROW(i), p1 = SLOT(PLACE[i][0], PLACE[i][1]);
          await h.tween(650, function (e) {
            at(items[i], [lerp(p0[0], p1[0], e), lerp(p0[1], p1[1], e) - Math.sin(Math.PI * e) * 14]);
          }, ease.inOut);
          color(i, true);
          await h.wait(120);
        }
        return;
      }
      if (b === 'baab') {
        layout('abba');
        // as letras de BAAB acendem: mesmas cores de ABBA, posição a posição
        for (let i = 0; i < 4; i++) { const el = LB[i]; if (el) { el.style.transition = 'color .2s'; el.style.color = GRP[i].c; } await h.wait(260); }
        // as etiquetas giram e trocam
        await h.tween(320, function (e) { bins.forEach(function (g) { const bx = +g.tag.getAttribute('x'), by = +g.tag.getAttribute('y') - 4; g.tag.setAttribute('transform', 'translate(' + bx + ' ' + by + ') scale(' + Math.max(0.01, 1 - e) + ' 1) translate(' + (-bx) + ' ' + (-by) + ')'); }); }, ease.inOut);
        bins.forEach(function (g, i) { g.tag.textContent = 'BA'[i]; });
        await h.tween(320, function (e) { bins.forEach(function (g) { const bx = +g.tag.getAttribute('x'), by = +g.tag.getAttribute('y') - 4; g.tag.setAttribute('transform', 'translate(' + bx + ' ' + by + ') scale(' + Math.max(0.01, e) + ' 1) translate(' + (-bx) + ' ' + (-by) + ')'); }); }, ease.inOut);
        bins.forEach(function (g) { g.tag.removeAttribute('transform'); });
        // os itens não saem do lugar: um pulso confirma
        await h.tween(450, function (e) { const s = 1 + 0.12 * Math.sin(Math.PI * e); items.forEach(function (g, i) { const p = SLOT(PLACE[i][0], PLACE[i][1]); at(g, [p[0] - (s - 1) * T / 2, p[1] - (s - 1) * T / 2], s); }); });
        items.forEach(function (g, i) { at(g, SLOT(PLACE[i][0], PLACE[i][1])); });
        cap.style.display = ''; cap.style.opacity = 0;
        await h.tween(400, function (e) { cap.style.opacity = e; });
        cap.style.opacity = '';
        return;
      }
      layout(b);
    }
    return { snap: layout, play: play };
  });
})();
