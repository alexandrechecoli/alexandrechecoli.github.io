/* 8 rainhas interativo (aula 3.1, frame 20, passo 2 acrescentado).
 *
 * <span class="anim pl" data-anim="rainhas" data-state="fig,live"><img xadrez6.svg (scale 0.95)></span>
 *   fig   (passo 1) a figura do PDF (a própria imagem).
 *   live  (passo 2) a imagem some aos poucos; fica o tabuleiro da esquerda, redesenhado igual (casas creme #ffffe0 e
 *         verdes #006400 a 50%, números verdes, rainha do Ipe: 7 caminhos, molde relativo ao canto da casa), com a
 *         solução do slide x = (6,2,1,4,7,2,6,6). Clicar numa casa põe/tira uma rainha (até 8). Pares que se atacam:
 *         linha vermelha entre as duas. No lugar do tabuleiro da direita, um painel com a mesma posição nas 3
 *         codificações (o que cada uma não consegue representar fica em vermelho) e o tamanho do espaço de busca:
 *           Cod. 1 coordenadas (coluna, linha)       C(64,8) ≈ 4,4 bilhões (qualquer posição)
 *           Cod. 2 vetor: linha da rainha em cada coluna   8⁸ ≈ 16,8 milhões (1 rainha por coluna)
 *           Cod. 3 permutação                            8! = 40.320 (1 por coluna e 1 por linha; falta a diagonal)
 *         Botões: exemplo do slide, a permutação do slide (6,4,7,2,8,3,5,1), "uma solução" (percorre as 92), limpar.
 * Geometria (figura xadrez6, quadro 281.2 × 156.4): casa (c, r) com canto em x = 9 + 16(c−1), y = 0.2 + 16(8−r).
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease;
  const CREAM = '#ffffe0', GREEN = '#006400', DRED = '#8b0000';
  const QUEEN = ['M4.43 13.67L4.43 14.87L11.62 14.87L11.62 13.67L4.43 13.67',
    'M5.62 13.67L3.23 6.47L5.62 8.87L4.43 4.07L6.82 7.67L8.02 1.67L9.23 7.67L11.62 4.07L10.43 8.87L12.82 6.47L10.43 13.67',
    'M3.88 6.47C3.88 6.11 3.59 5.81 3.23 5.81C2.86 5.81 2.57 6.11 2.57 6.47C2.57 6.84 2.86 7.13 3.23 7.13C3.59 7.13 3.88 6.84 3.88 6.47',
    'M5.09 4.07C5.09 3.71 4.79 3.41 4.43 3.41C4.06 3.41 3.76 3.71 3.76 4.07C3.76 4.44 4.06 4.73 4.43 4.73C4.79 4.73 5.09 4.44 5.09 4.07',
    'M8.68 1.67C8.68 1.31 8.39 1.01 8.02 1.01C7.66 1.01 7.37 1.31 7.37 1.67C7.37 2.04 7.66 2.33 8.02 2.33C8.39 2.33 8.68 2.04 8.68 1.67',
    'M12.29 4.07C12.29 3.71 11.99 3.41 11.62 3.41C11.26 3.41 10.96 3.71 10.96 4.07C10.96 4.44 11.26 4.73 11.62 4.73C11.99 4.73 12.29 4.44 12.29 4.07',
    'M13.49 6.47C13.49 6.11 13.19 5.81 12.82 5.81C12.46 5.81 12.16 6.11 12.16 6.47C12.16 6.84 12.46 7.13 12.82 7.13C13.19 7.13 13.49 6.84 13.49 6.47'];
  const W = 281.2, H = 156.4;
  const cx = function (c) { return 9 + 16 * (c - 1); }, cy = function (r) { return 0.2 + 16 * (8 - r); };
  const SLIDE = [6, 2, 1, 4, 7, 2, 6, 6], PERM = [6, 4, 7, 2, 8, 3, 5, 1];
  const fromVec = function (v) { return v.map(function (r, i) { return [i + 1, r]; }); };
  // as 92 soluções (backtracking), em ordem lexicográfica do vetor por coluna
  const SOLS = (function () {
    const out = [], v = [];
    (function go(c) {
      if (c === 8) { out.push(v.slice()); return; }
      for (let r = 1; r <= 8; r++) {
        if (v.some(function (q, i) { return q === r || Math.abs(q - r) === c - i; })) continue;
        v.push(r); go(c + 1); v.pop();
      }
    })(0);
    return out;
  })();
  const fmt = function (n) { return n.toLocaleString('pt-BR'); };

  Anim.define('rainhas', function (host) {
    const frame = host.closest('section'), img = host.querySelector('img');
    const svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H });
    host.appendChild(svg);
    const gBoard = S('g', null, svg), gHit = S('g', null, svg), gLines = S('g', { 'pointer-events': 'none' }, svg), gQ = S('g', { 'pointer-events': 'none' }, svg);
    for (let r = 1; r <= 8; r++) for (let c = 1; c <= 8; c++) {
      S('rect', { x: cx(c), y: cy(r), width: 16, height: 16, fill: (c + r) % 2 ? CREAM : GREEN, 'fill-opacity': (c + r) % 2 ? 1 : 0.5 }, gBoard);
      const hit = S('rect', { x: cx(c), y: cy(r), width: 16, height: 16, fill: '#fff', 'fill-opacity': 0, class: 'rh-cell' }, gHit);
      hit.dataset.c = c; hit.dataset.r = r;
    }
    for (let i = 1; i <= 8; i++) {
      const t1 = S('text', { x: 1.0, y: 124.2 - 16 * (i - 1), 'font-size': 9.96, fill: GREEN, 'font-family': 'KaTeX_Main' }, gBoard); t1.textContent = i;
      const t2 = S('text', { x: 13.0 + 16 * (i - 1), y: 136.2, 'font-size': 9.96, fill: GREEN, 'font-family': 'KaTeX_Main' }, gBoard); t2.textContent = i;
    }
    svg.style.display = 'none';

    let Q = fromVec(SLIDE), solIx = -1, pnl = null, live = false;
    const has = function (c, r) { return Q.findIndex(function (q) { return q[0] === c && q[1] === r; }); };
    function queen(c, r, parent) {
      const g = S('g', { transform: 'translate(' + cx(c) + ' ' + cy(r) + ')' }, parent);
      QUEEN.forEach(function (d) { S('path', { d: d, fill: '#000', 'fill-rule': 'evenodd' }, g); });
      return g;
    }
    function attacks() {
      const pairs = [];
      for (let i = 0; i < Q.length; i++) for (let j = i + 1; j < Q.length; j++) {
        const a = Q[i], b = Q[j];
        if (a[0] === b[0] || a[1] === b[1] || Math.abs(a[0] - b[0]) === Math.abs(a[1] - b[1])) pairs.push([a, b]);
      }
      return pairs;
    }
    function draw(popAt) {
      while (gQ.firstChild) gQ.removeChild(gQ.firstChild);
      while (gLines.firstChild) gLines.removeChild(gLines.firstChild);
      Q.forEach(function (q) {
        const g = queen(q[0], q[1], gQ);
        if (popAt && popAt[0] === q[0] && popAt[1] === q[1]) {
          g.style.transformOrigin = '8px 8px';
          g.animate([{ transform: 'translate(' + cx(q[0]) + 'px,' + cy(q[1]) + 'px) scale(0.2)', opacity: 0 },
            { transform: 'translate(' + cx(q[0]) + 'px,' + cy(q[1]) + 'px)', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.3,1.6,.5,1)' });
        }
      });
      const P = attacks();
      P.forEach(function (p) {
        const l = S('line', { x1: cx(p[0][0]) + 8, y1: cy(p[0][1]) + 8, x2: cx(p[1][0]) + 8, y2: cy(p[1][1]) + 8,
          stroke: DRED, 'stroke-width': 1.1, 'stroke-opacity': 0.75, 'stroke-linecap': 'round' }, gLines);
        if (popAt) l.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
      });
      panelUpdate(P);
    }

    // ---------- painel ----------
    function buildPanel() {
      if (pnl) return;
      pnl = document.createElement('div');
      pnl.className = 'rh-pnl'; pnl.setAttribute('data-interactive', '');
      pnl.innerHTML =
        '<div class="rh-st"></div>' +
        '<div class="rh-cod"><div class="rh-h"><b>Cod. 1</b> coordenadas (coluna, linha)<span class="rh-sz">C(64,8) ≈ 4,4 bilhões</span></div><div class="rh-v rh-v1"></div><div class="rh-m rh-m1"></div></div>' +
        '<div class="rh-cod"><div class="rh-h"><b>Cod. 2</b> linha da rainha de cada coluna<span class="rh-sz">8⁸ ≈ 16,8 milhões</span></div><div class="rh-v rh-v2"></div><div class="rh-m rh-m2"></div></div>' +
        '<div class="rh-cod"><div class="rh-h"><b>Cod. 3</b> permutação<span class="rh-sz">8! = 40.320</span></div><div class="rh-v rh-v3"></div><div class="rh-m rh-m3"></div></div>' +
        '<div class="rh-btns"><button type="button" data-a="slide">exemplo do slide</button><button type="button" data-a="perm">permutação do slide</button>' +
        '<button type="button" data-a="sol">uma solução</button><button type="button" data-a="limpar">limpar</button></div>' +
        '<div class="rh-hint">clique nas casas para pôr ou tirar uma rainha</div>';
      frame.appendChild(pnl);
      pnl.addEventListener('click', function (e) {
        const b = e.target.closest('button'); if (!b) return;
        const a = b.dataset.a;
        if (a === 'slide') Q = fromVec(SLIDE);
        else if (a === 'perm') Q = fromVec(PERM);
        else if (a === 'limpar') Q = [];
        else if (a === 'sol') { solIx = (solIx + 1) % SOLS.length; Q = fromVec(SOLS[solIx]); b.textContent = 'solução ' + (solIx + 1) + '/92'; }
        if (a !== 'sol') { const sb = pnl.querySelector('[data-a="sol"]'); sb.textContent = 'uma solução'; }
        draw(null);
        gQ.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 250 });
      });
    }
    const span = function (t, cls) { return '<span class="' + (cls || '') + '">' + t + '</span>'; };
    function panelUpdate(P) {
      if (!pnl) return;
      const n = Q.length, sorted = Q.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
      const byCol = {}, byRow = {};
      Q.forEach(function (q) { (byCol[q[0]] = byCol[q[0]] || []).push(q[1]); (byRow[q[1]] = byRow[q[1]] || []).push(q[0]); });
      const diag = P.filter(function (p) { return p[0][0] !== p[1][0] && p[0][1] !== p[1][1]; }).length;
      const st = pnl.querySelector('.rh-st');
      if (n === 8 && !P.length) st.innerHTML = '<span class="ok">✓ solução: nenhuma rainha ataca outra</span>';
      else st.innerHTML = 'rainhas: <b>' + n + '</b>/8 · pares que se atacam: <b class="' + (P.length ? 'ko' : '') + '">' + P.length + '</b>';
      // Cod. 1
      pnl.querySelector('.rh-v1').innerHTML = 'x = (' + (n ? sorted.map(function (q) { return '(' + q[0] + ',' + q[1] + ')'; }).join(',') : '') + ')';
      pnl.querySelector('.rh-m1').innerHTML = n === 8 ? '<span class="ok">✓ representa qualquer posição</span>' : 'faltam ' + (8 - n) + ' rainha' + (8 - n > 1 ? 's' : '');
      // Cod. 2: uma rainha por coluna
      const v2 = [], bad2 = [];
      for (let c = 1; c <= 8; c++) {
        const rs = byCol[c] || [];
        if (rs.length === 1) v2.push(span(rs[0]));
        else { v2.push(span(rs.length ? rs.join('/') : '–', 'ko-b')); bad2.push(c); }
      }
      pnl.querySelector('.rh-v2').innerHTML = 'x = (' + v2.join(',') + ')';
      const two = bad2.filter(function (c) { return (byCol[c] || []).length > 1; }), none = bad2.filter(function (c) { return !(byCol[c] || []).length; });
      pnl.querySelector('.rh-m2').innerHTML = bad2.length
        ? '<span class="ko">✗ não representa: ' + [two.length ? (two.length > 1 ? 'colunas ' : 'coluna ') + two.join(', ') + ' com 2 ou mais rainhas' : '',
          none.length ? (none.length > 1 ? 'colunas ' : 'coluna ') + none.join(', ') + ' vazia' + (none.length > 1 ? 's' : '') : ''].filter(Boolean).join('; ') + '</span>'
        : '<span class="ok">✓ uma rainha por coluna</span>';
      // Cod. 3: permutação (o vetor da Cod. 2 sem linhas repetidas)
      const v3 = [];
      let rep = [];
      for (let c = 1; c <= 8; c++) {
        const rs = byCol[c] || [];
        if (rs.length !== 1) { v3.push(span(rs.length ? rs.join('/') : '–', 'ko-b')); continue; }
        const dup = byRow[rs[0]].length > 1;
        if (dup && rep.indexOf(rs[0]) < 0) rep.push(rs[0]);
        v3.push(span(rs[0], dup ? 'ko-b' : ''));
      }
      pnl.querySelector('.rh-v3').innerHTML = 'x = (' + v3.join(',') + ')';
      rep.sort();
      let m3;
      if (bad2.length) m3 = '<span class="ko">✗ nem é um vetor da Cod. 2</span>';
      else if (rep.length) m3 = '<span class="ko">✗ não é permutação: ' + (rep.length > 1 ? 'linhas ' : 'linha ') + rep.join(', ') + ' repetida' + (rep.length > 1 ? 's' : '') + '</span>';
      else m3 = '<span class="ok">✓ permutação</span> · só falta conferir as diagonais: ' +
        (diag ? '<b class="ko">' + diag + (diag > 1 ? ' pares' : ' par') + '</b>' : '<b class="ok">nenhum par</b>') +
        ' <span class="rh-n">(92 das 40.320 são soluções)</span>';
      pnl.querySelector('.rh-m3').innerHTML = m3;
    }
    function positionPanel() {
      if (!pnl) return;
      const s = frame.getBoundingClientRect().width / frame.offsetWidth || 1;
      const fr = frame.getBoundingClientRect(), r = host.getBoundingClientRect(), fc = frame.querySelector('.fc').getBoundingClientRect();
      const k = r.width / W;   // px por unidade da figura
      const left = (r.left + 147 * k - fr.left) / s;
      pnl.style.left = left + 'px';
      pnl.style.top = ((r.top - fr.top) / s) + 'px';
      pnl.style.width = ((fc.right - fr.left) / s + 6 - left) + 'px';
      pnl.style.height = (140 * k / s) + 'px';
    }

    // ---------- clique no tabuleiro ----------
    svg.addEventListener('click', function (e) {
      if (!live) return;
      const cell = e.target.closest('.rh-cell'); if (!cell) return;
      e.stopPropagation();
      const c = +cell.dataset.c, r = +cell.dataset.r, i = has(c, r);
      if (i >= 0) { Q.splice(i, 1); draw(null); }
      else if (Q.length >= 8) { flash(); return; }
      else { Q.push([c, r]); draw([c, r]); }
      const sb = pnl && pnl.querySelector('[data-a="sol"]'); if (sb) sb.textContent = 'uma solução';
    });
    function flash() {
      const st = pnl && pnl.querySelector('.rh-st'); if (!st) return;
      st.innerHTML = '<span class="ko">já há 8 rainhas: tire uma antes</span>';
      setTimeout(function () { if (live) draw(null); }, 1400);
    }

    function setLive(on) {
      live = on;
      host.toggleAttribute('data-interactive', on);
      host.classList.toggle('rh-on', on);
      svg.style.display = on ? '' : 'none';
      img.style.visibility = on ? 'hidden' : 'visible';
      img.style.opacity = ''; img.style.position = img.style.zIndex = '';
      if (on) { buildPanel(); pnl.style.display = ''; positionPanel(); draw(null); }
      else if (pnl) pnl.style.display = 'none';
    }
    function snap(st) {
      if (st !== 'live') { Q = fromVec(SLIDE); solIx = -1; if (pnl) pnl.querySelector('[data-a="sol"]').textContent = 'uma solução'; }
      setLive(st === 'live');
    }
    async function play(a, b, h) {
      if (b !== 'live') { snap(b); return; }
      Q = fromVec(SLIDE);
      setLive(true);
      // a imagem (por cima) some: à esquerda fica o tabuleiro igual; à direita entra o painel; as linhas de ataque se traçam
      img.style.visibility = 'visible'; img.style.position = 'relative'; img.style.zIndex = 1;   // no fluxo, por cima do svg
      pnl.style.opacity = 0; gLines.style.opacity = 0;
      await h.tween(600, function (e) { img.style.opacity = 1 - e; });
      img.style.visibility = 'hidden'; img.style.opacity = ''; img.style.position = img.style.zIndex = '';
      await h.tween(400, function (e) { pnl.style.opacity = e; }, ease.out);
      pnl.style.opacity = '';
      const ls = Array.prototype.slice.call(gLines.childNodes);
      ls.forEach(function (l) { const len = Math.hypot(l.x2.baseVal.value - l.x1.baseVal.value, l.y2.baseVal.value - l.y1.baseVal.value); l.setAttribute('stroke-dasharray', len); l.setAttribute('stroke-dashoffset', len); l.len = len; });
      gLines.style.opacity = '';
      await h.tween(700, function (e) { ls.forEach(function (l) { l.setAttribute('stroke-dashoffset', l.len * (1 - e)); }); });
      ls.forEach(function (l) { l.removeAttribute('stroke-dasharray'); l.removeAttribute('stroke-dashoffset'); });
    }
    window.addEventListener('resize', function () { if (live) positionPanel(); });
    return { snap: snap, play: play };
  });
})();
