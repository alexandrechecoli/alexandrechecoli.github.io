/* Problema da mochila (aula 2, frames 28–29). Trabalha sobre a própria tabela do slide (div.tab).
 *
 * Uso: <span class="anim mo" data-anim="mochila" data-fig="monta|demo" data-state=".."></span>, primeiro filho do
 * div.center da tabela (position:absolute: não mexe no layout; o .fc não ganha filho novo).
 *
 * data-fig="monta" (frame 28; estados por passo: t0 … th tv)
 *   th  passo 6: a tabela entra coluna a coluna (da esquerda para a direita)
 *   tv  passo 7: valores e pesos entram coluna a coluna
 *   tc  (de vazio) frames 36 e 39: a tabela entra coluna a coluna ao chegar no frame
 * data-fig="demo" (frame 29, data-steps="3"; estados plain, s1, s2, demo)
 *   s1    as colunas escolhidas no slide (H₂O, Canivete, PS4) acendem uma a uma
 *   s2    elas piscam junto com a resposta "Capacidade: 130, Utilidade: 50"
 *   demo  passo 3 (novo): a lista some (o espaço fica) e no lugar dela entra a mochila: barra de peso com a
 *         capacidade C = 130, peso e valor totais. Parte da solução do slide (valor 50), tira H₂O, põe Carne e
 *         Arroz: valor 87 (o ótimo, por força bruta nas 2⁸ = 256 combinações). Interativo: clicar numa coluna
 *         põe/tira o item; botões "solução do slide", "guloso (valor/peso)", "ótimo", "limpar".
 */
(function () {
  'use strict';
  const ease = Anim.ease, lerp = Anim.lerp;
  const ITEMS = [
    { n: 'Ipod', v: 10, w: 50 }, { n: 'Abobrinha', v: 8, w: 55 }, { n: 'H₂O', v: 5, w: 60 }, { n: 'Canivete', v: 15, w: 45 },
    { n: 'Carne', v: 25, w: 15 }, { n: 'Arroz', v: 17, w: 25 }, { n: 'Aveia', v: 8, w: 35 }, { n: 'PS4', v: 30, w: 25 }
  ];
  const C = 130, HL = '#bdd4e6';
  const COL = ['#f3c9c4', '#f8ddb0', '#bdd4e6', '#cfe6c6', '#e2d2ee', '#f6d3e3', '#dfe6c0', '#c5e3e8'];
  const SLIDE = [2, 3, 7];                       // H₂O, Canivete, PS4 (valor 50)
  const sel = new Set([3, 4, 5, 7]);             // estado da demo (começa no ótimo: Canivete, Carne, Arroz, PS4)
  const tot = function (s) { let w = 0, v = 0; s.forEach(function (i) { w += ITEMS[i].w; v += ITEMS[i].v; }); return { w: w, v: v }; };
  const BEST = (function () {
    let b = 0;
    for (let m = 0; m < 256; m++) {
      let w = 0, v = 0;
      for (let i = 0; i < 8; i++) if (m & (1 << i)) { w += ITEMS[i].w; v += ITEMS[i].v; }
      if (w <= C && v > b) b = v;
    }
    return b;
  })();
  const fmt2 = function (x) { return x.toFixed(2).replace('.', ','); };

  function cellsOf(host) {
    const fr = host.closest('section'), tab = fr.querySelector('.tab');
    const tds = Array.prototype.slice.call(tab.querySelectorAll(':scope > .td'));
    const m = /repeat\((\d+)/.exec(tab.style.gridTemplateColumns || ''), n = m ? +m[1] : 9, rows = Math.round(tds.length / n);
    return { fr: fr, tab: tab, tds: tds, n: n,
      col: function (j) { const c = []; for (let r = 0; r < rows; r++) c.push(tds[r * n + j]); return c; } };
  }

  Anim.define('mochila', function (host) {
    return host.dataset.fig === 'demo' ? demo(host) : monta(host);
  });

  // ---------- frame 28: a tabela se monta coluna a coluna ----------
  function monta(host) {
    const T = cellsOf(host);
    function clear() {
      T.tds.forEach(function (c) {
        c.style.opacity = ''; c.style.transform = '';
        c.querySelectorAll('span').forEach(function (s) { s.style.opacity = ''; });
      });
    }
    async function stagger(h, groups, set) {   // um grupo por coluna, 90 ms entre colunas
      const D = 380, G = 90, total = (groups.length - 1) * G + D;
      await h.tween(total, function (e, t) {
        const now = t * total;
        groups.forEach(function (g, k) { set(g, Math.max(0, Math.min(1, (now - k * G) / D))); });
      }, ease.linear);
    }
    return {
      snap: clear,
      play: async function (a, b, h) {
        if (b === 'th' || b === 'tc') {
          const groups = []; for (let j = 0; j < T.n; j++) groups.push(T.col(j));
          await stagger(h, groups, function (g, u) {
            const e = ease.out(u);
            g.forEach(function (c) { c.style.opacity = e; c.style.transform = 'translateY(' + (-(1 - e) * 4) + 'pt)'; });
          });
        } else if (b === 'tv') {
          const groups = []; for (let j = 1; j < T.n; j++) groups.push(T.col(j).slice(1).map(function (c) { return c.querySelector('span'); }).filter(Boolean));
          await stagger(h, groups, function (g, u) { g.forEach(function (s) { s.style.opacity = ease.out(u); }); });
        }
        clear();
      }
    };
  }

  // ---------- frame 29: a solução do slide e a demo ----------
  function demo(host) {
    const T = cellsOf(host);
    const ol = T.fr.querySelector('.fc > ol.enum');
    const orig = T.tds.map(function (c) { return c.style.background; });
    T.tab.classList.add('mo-anim');
    let cur = null, run = 0, playing = false;

    // painel (no lugar da lista)
    const pn = document.createElement('div');
    pn.className = 'mo-panel';
    pn.setAttribute('data-interactive', '');
    pn.innerHTML =
      '<div class="mo-top"><span class="mo-title">Mochila (C = 130)</span><span class="mo-btns">' +
      '<button type="button" data-a="slide">solução do slide</button><button type="button" data-a="guloso">guloso (valor/peso)</button>' +
      '<button type="button" data-a="otimo">ótimo</button><button type="button" data-a="limpar">limpar</button></span></div>' +
      '<div class="mo-barwrap"><div class="mo-bar"></div><div class="mo-cap"><span>C = 130</span></div></div>' +
      '<div class="mo-stats"><span>peso: <b class="mo-w">0</b> / 130</span><span>valor: <b class="mo-v">0</b></span><span class="mo-msg"></span></div>' +
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
    let order = [];   // ordem em que os itens entraram (para a barra)

    function place() {   // o painel ocupa o lugar da lista
      host.style.left = ol.offsetLeft + 'px'; host.style.top = ol.offsetTop + 'px';
      host.style.width = ol.offsetWidth + 'px'; host.style.height = ol.offsetHeight + 'px';
    }
    function status(s) {
      const t = tot(s);
      if (t.w > C) return ['✗ excede a capacidade em ' + (t.w - C), 'ko'];
      if (!s.size) return ['', ''];
      if (t.v === BEST) return ['✓ ótimo: a melhor das 2⁸ = 256 combinações', 'ok'];
      return ['cabe, mas o ótimo é ' + BEST, ''];
    }
    function render(m, cls, flash) {
      order = order.filter(function (i) { return sel.has(i); });
      sel.forEach(function (i) { if (order.indexOf(i) < 0) order.push(i); });
      const t = tot(sel), S = Math.max(C * 1.12, t.w);
      let acc = 0;
      ITEMS.forEach(function (it, i) {
        const d = segs[i];
        if (sel.has(i)) {
          const k = order.indexOf(i);
          let x = 0; for (let q = 0; q < k; q++) x += ITEMS[order[q]].w;
          d.style.left = (100 * x / S) + '%'; d.style.width = (100 * it.w / S) + '%'; d.style.opacity = 1;
          d.classList.toggle('mo-over', x + it.w > C);
          acc += it.w;
        } else { d.style.width = '0%'; d.style.opacity = 0; }
        d.classList.toggle('mo-flash', flash === i);
      });
      cap.style.left = (100 * C / S) + '%';
      bar.classList.toggle('over', t.w > C);
      pn.querySelector('.mo-w').textContent = t.w;
      pn.querySelector('.mo-v').textContent = t.v;
      const st = m === undefined ? status(sel) : [m, cls || ''];
      msg.textContent = st[0]; msg.className = 'mo-msg ' + st[1];
      // colunas da tabela com a cor do item
      for (let i = 0; i < 8; i++) T.col(i + 1).forEach(function (c) { c.style.background = sel.has(i) ? COL[i] : ''; });
    }
    function setBg(mode) {
      T.tds.forEach(function (c, k) { c.style.background = mode === 'plain' ? '' : orig[k]; });
    }

    function snap(st) {
      run++; cur = st;
      const isDemo = st === 'demo';
      ol.style.transition = ''; ol.style.opacity = '';
      ol.style.visibility = isDemo ? 'hidden' : '';
      pn.style.display = isDemo ? '' : 'none'; pn.style.opacity = '';
      T.tab.classList.toggle('mo-click', isDemo);
      if (isDemo) { T.tab.setAttribute('data-interactive', ''); place(); render(); }
      else { T.tab.removeAttribute('data-interactive'); setBg(st); }
      T.col(0).concat(T.tds).forEach(function (c) { c.style.filter = ''; });
    }

    // execução própria (botões), cancelada por qualquer snap
    function local(script) {
      const id = ++run;
      const h = { wait: function (ms) { return new Promise(function (res, rej) { setTimeout(function () { if (id === run) res(); else rej('x'); }, ms); }); } };
      playing = true;
      script(h).catch(function (e) { if (e !== 'x') console.error(e); }).then(function () { playing = false; });
    }
    async function greedy(h) {
      sel.clear(); render('guloso: maior valor/peso primeiro', '');
      await h.wait(700);
      const idx = ITEMS.map(function (it, i) { return i; }).sort(function (a, b) { return ITEMS[b].v / ITEMS[b].w - ITEMS[a].v / ITEMS[a].w; });
      for (const i of idx) {
        const it = ITEMS[i], t = tot(sel);
        if (t.w + it.w <= C) { sel.add(i); render('põe ' + it.n + ' (valor/peso ' + fmt2(it.v / it.w) + ')', ''); }
        else { render('tenta ' + it.n + ' (' + fmt2(it.v / it.w) + '): ' + (t.w + it.w) + ' > 130 ✗', 'ko'); }
        await h.wait(950);
      }
      const t = tot(sel);
      render('guloso: valor ' + t.v + (t.v === BEST ? ' — aqui coincide com o ótimo' : ' — o ótimo é ' + BEST), t.v === BEST ? 'ok' : '');
    }
    async function toSlideThenBest(h) {   // animação de entrada do passo 3
      sel.clear(); SLIDE.forEach(function (i) { sel.add(i); }); order = SLIDE.slice();
      render('solução do slide: peso 130, valor 50. Dá para melhorar?', '');
      await h.wait(1600);
      sel.delete(2); render('tira H₂O (peso 60, valor 5)', '', null); await h.wait(1100);
      sel.add(4); render('põe Carne (peso 15, valor 25)', '', 4); await h.wait(1000);
      sel.add(5); render('põe Arroz (peso 25, valor 17)', '', 5); await h.wait(1000);
      render();
    }
    pn.addEventListener('click', function (e) {
      const b = e.target.closest('button'); if (!b || cur !== 'demo') return;
      if (b.dataset.a === 'slide') { run++; sel.clear(); SLIDE.forEach(function (i) { sel.add(i); }); render(); }
      else if (b.dataset.a === 'otimo') { run++; sel.clear(); [3, 4, 5, 7].forEach(function (i) { sel.add(i); }); render(); }
      else if (b.dataset.a === 'limpar') { run++; sel.clear(); render(); }
      else if (b.dataset.a === 'guloso') local(greedy);
    });
    T.tab.addEventListener('click', function (e) {
      if (cur !== 'demo' || playing) return;
      const td = e.target.closest('.td'); if (!td) return;
      const k = T.tds.indexOf(td), j = k % 9;
      if (j === 0) return;
      run++;
      if (sel.has(j - 1)) sel.delete(j - 1); else sel.add(j - 1);
      render(undefined, undefined, sel.has(j - 1) ? j - 1 : null);
    });

    async function highlight(h) {   // as colunas do slide acendem uma a uma
      setBg('plain');
      await h.wait(200);
      for (const i of SLIDE) {
        T.col(i + 1).forEach(function (c) { c.style.background = HL; });
        await h.wait(380);
      }
    }
    return {
      snap: snap,
      play: async function (a, b, h) {
        playing = true;
        try {
          if (b === 's1' || (a === 'plain' && b !== 'plain')) await highlight(h);
          if (b === 's2') {
            const cs = []; SLIDE.forEach(function (i) { cs.push.apply(cs, T.col(i + 1)); });
            await h.tween(900, function (e, t) {
              const k = Math.sin(Math.PI * t * 2) ** 2;
              cs.forEach(function (c) { c.style.filter = 'brightness(' + (1 - 0.18 * k) + ')'; });
            }, ease.linear);
          }
          if (b === 'demo') {
            ol.style.transition = 'opacity 0.35s'; ol.style.opacity = 0;
            await h.wait(380);
            ol.style.visibility = 'hidden';
            place(); pn.style.display = ''; pn.style.opacity = 0;
            T.tab.classList.add('mo-click'); T.tab.setAttribute('data-interactive', '');
            sel.clear(); SLIDE.forEach(function (i) { sel.add(i); }); order = SLIDE.slice(); render('', '');
            pn.style.transition = 'opacity 0.35s'; void pn.offsetWidth; pn.style.opacity = 1;
            await h.wait(400);
            pn.style.transition = '';
            await toSlideThenBest(h);
          }
        } finally { playing = false; }
      }
    };
  }
})();
