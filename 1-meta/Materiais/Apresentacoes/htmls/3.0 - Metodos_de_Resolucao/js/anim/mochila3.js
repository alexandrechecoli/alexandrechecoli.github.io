/* Problema da mochila (aula 3, frames 17 e 18), adaptado do mochila.js da aula 2 (modo demo; estilos .mo-*).
 * Capacidade 150. A seleção é compartilhada entre os dois frames.
 *
 * data-fig="tab"    (frame 17, data-steps="2", estados vazio,demo): <span class="anim mo3"> como 1º filho do div.center da
 *                   tabela (tamanho zero). Passo 2: abaixo da tabela, a mochila (barra de peso com C = 150, peso, valor).
 *                   Entrada: o guloso (maior valor/peso primeiro) enche a mochila item a item → valor 95, peso 145 (= o
 *                   ótimo, por força bruta nas 2⁸ = 256 combinações). Clicar numa coluna põe/tira o item; botões
 *                   "guloso (valor/peso)", "ótimo", "limpar".
 * data-fig="modelo" (frame 18, data-steps="2", estados vazio,modelo): span absoluto no fim do .fc. Passo 2: o vetor x
 *                   (clicável, 0/1), o valor da função objetivo e a restrição de capacidade conferida (≤ 150 ✓ / ✗).
 */
(function () {
  'use strict';
  const ITEMS = [
    { n: 'Ipod', v: 10, w: 50 }, { n: 'Abobrinha', v: 8, w: 55 }, { n: 'H₂O', v: 5, w: 60 }, { n: 'Canivete', v: 15, w: 45 },
    { n: 'Carne', v: 25, w: 15 }, { n: 'Arroz', v: 17, w: 25 }, { n: 'Aveia', v: 8, w: 35 }, { n: 'PS4', v: 30, w: 25 }
  ];
  const C = 150;
  const COL = ['#f3c9c4', '#f8ddb0', '#bdd4e6', '#cfe6c6', '#e2d2ee', '#f6d3e3', '#dfe6c0', '#c5e3e8'];
  const sel = new Set();     // compartilhada entre os frames 17 e 18
  const tot = function (s) { let w = 0, v = 0; s.forEach(function (i) { w += ITEMS[i].w; v += ITEMS[i].v; }); return { w: w, v: v }; };
  const OPT = (function () {
    let b = 0, bm = 0;
    for (let m = 0; m < 256; m++) {
      let w = 0, v = 0;
      for (let i = 0; i < 8; i++) if (m & (1 << i)) { w += ITEMS[i].w; v += ITEMS[i].v; }
      if (w <= C && v > b) { b = v; bm = m; }
    }
    const s = []; for (let i = 0; i < 8; i++) if (bm & (1 << i)) s.push(i);
    return { v: b, set: s };
  })();
  const fmt2 = function (x) { return x.toFixed(2).replace('.', ','); };
  const SUB = '₀₁₂₃₄₅₆₇₈₉';
  const listeners = [];
  const changed = function () { listeners.forEach(function (f) { f(); }); };

  Anim.define('mochila3', function (host) { return host.dataset.fig === 'modelo' ? modelo(host) : tabela(host); });

  // ---------- frame 17: a tabela vira a mochila ----------
  function tabela(host) {
    const center = host.parentElement, tab = center.querySelector('.tab');
    const tds = Array.prototype.slice.call(tab.querySelectorAll(':scope > .td'));
    const col = function (j) { return [tds[j], tds[9 + j], tds[18 + j]]; };
    tab.classList.add('mo-anim');
    let cur = null, run = 0, playing = false;
    const pn = document.createElement('div');
    pn.className = 'mo-panel mo3-panel';
    pn.setAttribute('data-interactive', '');
    pn.innerHTML =
      '<div class="mo-top"><span class="mo-title">Mochila (C = 150)</span><span class="mo-btns">' +
      '<button type="button" data-a="guloso">guloso (valor/peso)</button><button type="button" data-a="otimo">ótimo</button>' +
      '<button type="button" data-a="limpar">limpar</button></span></div>' +
      '<div class="mo-barwrap"><div class="mo-bar"></div><div class="mo-cap"><span>C = 150</span></div></div>' +
      '<div class="mo-stats"><span>peso: <b class="mo-w">0</b> / 150</span><span>valor: <b class="mo-v">0</b></span><span class="mo-msg"></span></div>' +
      '<div class="mo-hint">clique nas colunas da tabela para pôr ou tirar um item</div>';
    host.appendChild(pn);
    const bar = pn.querySelector('.mo-bar'), cap = pn.querySelector('.mo-cap'), msg = pn.querySelector('.mo-msg');
    const segs = ITEMS.map(function (it, i) {
      const d = document.createElement('div');
      d.className = 'mo-seg'; d.style.background = COL[i]; d.style.width = '0%';
      d.innerHTML = '<span>' + it.n + ' ' + it.w + '</span>';
      bar.appendChild(d);
      return d;
    });
    let order = [];
    function place() {   // abaixo da tabela, com a largura dela
      pn.style.left = tab.offsetLeft + 'px'; pn.style.width = tab.offsetWidth + 'px';
      pn.style.top = (tab.offsetTop + tab.offsetHeight + 16) + 'px';
    }
    function status() {
      const t = tot(sel);
      if (t.w > C) return ['✗ excede a capacidade em ' + (t.w - C), 'ko'];
      if (!sel.size) return ['', ''];
      if (t.v === OPT.v) return ['✓ ótimo: a melhor das 2⁸ = 256 combinações', 'ok'];
      return ['cabe, mas o ótimo é ' + OPT.v, ''];
    }
    function render(m, cls, flash) {
      order = order.filter(function (i) { return sel.has(i); });
      sel.forEach(function (i) { if (order.indexOf(i) < 0) order.push(i); });
      const t = tot(sel), S = Math.max(C * 1.12, t.w);
      ITEMS.forEach(function (it, i) {
        const d = segs[i];
        if (sel.has(i)) {
          let x = 0; for (let q = 0; q < order.indexOf(i); q++) x += ITEMS[order[q]].w;
          d.style.left = (100 * x / S) + '%'; d.style.width = (100 * it.w / S) + '%'; d.style.opacity = 1;
          d.classList.toggle('mo-over', x + it.w > C);
        } else { d.style.width = '0%'; d.style.opacity = 0; }
        d.classList.toggle('mo-flash', flash === i);
      });
      cap.style.left = (100 * C / S) + '%';
      bar.classList.toggle('over', t.w > C);
      pn.querySelector('.mo-w').textContent = t.w;
      pn.querySelector('.mo-v').textContent = t.v;
      const st = m === undefined ? status() : [m, cls || ''];
      msg.textContent = st[0]; msg.className = 'mo-msg ' + st[1];
      for (let i = 0; i < 8; i++) col(i + 1).forEach(function (c) { c.style.background = sel.has(i) && cur === 'demo' ? COL[i] : ''; });
    }
    listeners.push(function () { if (cur === 'demo') render(); });
    function snap(st) {
      run++; cur = st;
      const on = st === 'demo';
      pn.style.display = on ? '' : 'none'; pn.style.opacity = '';
      tab.classList.toggle('mo-click', on);
      if (on) { tab.setAttribute('data-interactive', ''); place(); render(); }
      else { tab.removeAttribute('data-interactive'); tds.forEach(function (c) { c.style.background = ''; }); }
    }
    function local(script) {
      const id = ++run;
      const h = { wait: function (ms) { return new Promise(function (res, rej) { setTimeout(function () { if (id === run) res(); else rej('x'); }, ms); }); } };
      playing = true;
      script(h).catch(function (e) { if (e !== 'x') console.error(e); }).then(function () { playing = false; });
    }
    async function greedy(h) {
      sel.clear(); render('guloso: maior valor/peso primeiro', '');
      await h.wait(800);
      const idx = ITEMS.map(function (it, i) { return i; }).sort(function (a, b) { return ITEMS[b].v / ITEMS[b].w - ITEMS[a].v / ITEMS[a].w; });
      for (const i of idx) {
        const it = ITEMS[i], t = tot(sel);
        if (t.w + it.w <= C) { sel.add(i); render('põe ' + it.n + ' (valor/peso ' + fmt2(it.v / it.w) + ')', '', i); }
        else render('tenta ' + it.n + ' (' + fmt2(it.v / it.w) + '): ' + (t.w + it.w) + ' > 150 ✗', 'ko');
        await h.wait(900);
      }
      const t = tot(sel);
      render('guloso: valor ' + t.v + ', peso ' + t.w + (t.v === OPT.v ? ' — aqui coincide com o ótimo ✓' : ' — o ótimo é ' + OPT.v), t.v === OPT.v ? 'ok' : '');
      changed();
    }
    pn.addEventListener('click', function (e) {
      const b = e.target.closest('button'); if (!b || cur !== 'demo') return;
      e.stopPropagation();
      if (b.dataset.a === 'otimo') { run++; sel.clear(); OPT.set.forEach(function (i) { sel.add(i); }); render(); changed(); }
      else if (b.dataset.a === 'limpar') { run++; sel.clear(); render(); changed(); }
      else if (b.dataset.a === 'guloso') local(greedy);
    });
    tab.addEventListener('click', function (e) {
      if (cur !== 'demo' || playing) return;
      const td = e.target.closest('.td'); if (!td) return;
      const j = tds.indexOf(td) % 9;
      if (j === 0) return;
      e.stopPropagation();
      run++;
      if (sel.has(j - 1)) sel.delete(j - 1); else sel.add(j - 1);
      render(undefined, undefined, sel.has(j - 1) ? j - 1 : null); changed();
    });
    return {
      snap: snap,
      play: async function (a, b, h) {
        if (b !== 'demo') { snap(b); return; }
        snap('demo'); playing = true;
        pn.style.opacity = 0; pn.style.transition = 'opacity 0.35s'; void pn.offsetWidth; pn.style.opacity = 1;
        try {
          await h.wait(450); pn.style.transition = '';
          sel.clear(); render('guloso: maior valor/peso primeiro', '');
          await h.wait(900);
          const idx = ITEMS.map(function (it, i) { return i; }).sort(function (p, q) { return ITEMS[q].v / ITEMS[q].w - ITEMS[p].v / ITEMS[p].w; });
          for (const i of idx) {
            const it = ITEMS[i], t = tot(sel);
            if (t.w + it.w <= C) { sel.add(i); render('põe ' + it.n + ' (valor/peso ' + fmt2(it.v / it.w) + ')', '', i); }
            else render('tenta ' + it.n + ' (' + fmt2(it.v / it.w) + '): ' + (t.w + it.w) + ' > 150 ✗', 'ko');
            await h.wait(850);
          }
          render(); changed();
        } finally { playing = false; }
      }
    };
  }

  // ---------- frame 18: o modelo avaliado ----------
  function modelo(host) {
    let cur = null;
    const pn = document.createElement('div');
    pn.className = 'mo3-modelo';
    pn.setAttribute('data-interactive', '');
    let xs = '';
    for (let i = 0; i < 8; i++) xs += '<button type="button" data-i="' + i + '"><i>x</i><sub>' + (i + 1) + '</sub> = <b>0</b></button>';
    pn.innerHTML = '<div class="mo3-x"><span class="mo3-lb">clique para trocar:</span>' + xs + '</div>' +
      '<div class="mo3-l"><span class="mo3-lb">objetivo:</span> <span class="mo3-obj"></span></div>' +
      '<div class="mo3-l"><span class="mo3-lb">restrição:</span> <span class="mo3-res"></span></div>';
    host.appendChild(pn);
    const btns = Array.prototype.slice.call(pn.querySelectorAll('button'));
    function render(upTo) {
      const n = upTo === undefined ? 8 : upTo;
      btns.forEach(function (b, i) { const on = sel.has(i); b.querySelector('b').textContent = i < n ? (on ? 1 : 0) : '·'; b.classList.toggle('on', on && i < n); b.style.background = on && i < n ? COL[i] : ''; });
      const ch = []; sel.forEach(function (i) { if (i < n) ch.push(i); }); ch.sort(function (a, b) { return a - b; });
      const v = ch.reduce(function (s, i) { return s + ITEMS[i].v; }, 0), w = ch.reduce(function (s, i) { return s + ITEMS[i].w; }, 0);
      pn.querySelector('.mo3-obj').innerHTML = (ch.length ? ch.map(function (i) { return ITEMS[i].v; }).join(' + ') : '0') + ' = <b>' + v + '</b>';
      const ok = w <= C;
      pn.querySelector('.mo3-res').innerHTML = (ch.length ? ch.map(function (i) { return ITEMS[i].w; }).join(' + ') : '0') + ' = <b>' + w + '</b> ' +
        (ok ? '≤ 150 <span class="ok">✓ cabe (solução factível)</span>' : '> 150 <span class="ko">✗ não cabe (infactível)</span>');
    }
    listeners.push(function () { if (cur === 'modelo') render(); });
    pn.addEventListener('click', function (e) {
      const b = e.target.closest('button'); if (!b || cur !== 'modelo') return;
      e.stopPropagation();
      const i = +b.dataset.i;
      if (sel.has(i)) sel.delete(i); else sel.add(i);
      changed();
    });
    function snap(st) {
      cur = st;
      pn.style.display = st === 'modelo' ? '' : 'none'; pn.style.opacity = '';
      if (st === 'modelo') { if (!sel.size) OPT.set.forEach(function (i) { sel.add(i); }); render(); }
    }
    return {
      snap: snap,
      play: async function (a, b, h) {
        if (b !== 'modelo') { snap(b); return; }
        snap('modelo');
        pn.style.opacity = 0;
        await h.tween(350, function (e) { pn.style.opacity = e; });
        for (let i = 0; i <= 8; i++) { render(i); await h.wait(260); }
        render();
      }
    };
  }
})();
