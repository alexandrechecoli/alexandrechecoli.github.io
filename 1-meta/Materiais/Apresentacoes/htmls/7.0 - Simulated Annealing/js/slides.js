/* Motor de slides no estilo Beamer.
 *
 * Cada <section class="frame"> é um frame. Overlays seguem a sintaxe do Beamer:
 *   data-on="2-"   -> como \onslide<2->  (invisível, mas ocupa espaço)
 *   data-only="1"  -> como \only<1>     (some e não ocupa espaço)
 * Especificações aceitas: "2", "2-", "1-3", "-2", "1,3-".
 *
 * Eventos disparados em cada <section> (para animações, ver js/anim/):
 *   'enter' {from, step}  -> o frame passou a ser exibido (from = índice do frame anterior)
 *   'step'  {step, prev}  -> mudou o passo de overlay dentro do frame
 *   'leave'               -> o frame deixou de ser exibido
 * Um frame pode definir f._busy() e f._finish(): enquanto houver animação rodando,
 * "avançar" apenas completa a animação.
 *
 * Teclas: → ↓ PageDown Espaço = avançar | ← ↑ PageUp = voltar
 *         Home/End = primeiro/último | número + Enter = ir ao frame
 *         F = tela cheia
 */
(function () {
  'use strict';

  const deck = document.getElementById('deck');
  const frames = Array.from(deck.querySelectorAll(':scope > section.frame'));
  const total = frames.length;
  const author = document.body.dataset.author || '';
  const shortTitle = document.body.dataset.shorttitle || '';

  // ---------- Overlays ----------
  function parseSpec(spec) {
    return spec.split(',').map(function (part) {
      part = part.trim();
      const m = part.match(/^(\d*)\s*(-?)\s*(\d*)$/);
      if (!m) return [1, Infinity];
      const a = m[1] ? +m[1] : 1;
      if (!m[2]) return [a, a];
      return [a, m[3] ? +m[3] : Infinity];
    });
  }
  function inSpec(spec, step) {
    return parseSpec(spec).some(function (r) { return step >= r[0] && step <= r[1]; });
  }
  function specMax(spec) {
    return parseSpec(spec).reduce(function (mx, r) {
      return Math.max(mx, r[0], r[1] === Infinity ? 0 : r[1]);
    }, 1);
  }

  frames.forEach(function (f) {
    let max = 1;
    f.querySelectorAll('[data-on],[data-only]').forEach(function (el) {
      max = Math.max(max, specMax(el.dataset.on || el.dataset.only));
    });
    if (f.dataset.steps) max = Math.max(max, +f.dataset.steps);
    f._steps = max;
  });

  function applyStep(f, step) {
    f.querySelectorAll('[data-on]').forEach(function (el) {
      el.classList.toggle('ov-hidden', !inSpec(el.dataset.on, step));
    });
    f.querySelectorAll('[data-only]').forEach(function (el) {
      el.classList.toggle('ov-gone', !inSpec(el.dataset.only, step));
    });
  }

  // ---------- Rodapé ----------
  frames.forEach(function (f, i) {
    if (f.querySelector(':scope > footer')) return;
    const foot = document.createElement('footer');
    foot.innerHTML =
      '<div class="foot-l">' + author + '</div>' +
      '<div class="foot-r"><span class="foot-title">' + shortTitle + '</span>' +
      '<span class="foot-num">' + (i + 1) + '/' + total + '</span></div>';
    f.appendChild(foot);
  });

  // ---------- Quebra de linha ao estilo TeX ----------
  // O TeX escolhe as quebras de linha minimizando um custo ("demerits"), pode comprimir os
  // espaços entre palavras e hifeniza (padrões do português). O navegador quebra de forma
  // gulosa e só estica. Para cada parágrafo geramos algumas versões (espaços mais estreitos,
  // com/sem hifenização), calculamos o custo TeX de cada uma e ficamos com a melhor.
  const SPACINGS = [0, -0.3, -0.6, -0.9, -1.22];  // pt (o TeX encolhe até 1.21pt)
  const STRETCH = 1.82, SHRINK = 1.23;           // cola do espaço do cmss10 a 10.95pt
  const SHY = '\u00AD';
  let hyph = null;
  if (window.createHyphenator && window.hyphenationPatternsPt) {
    const h = window.createHyphenator(window.hyphenationPatternsPt, { hyphenChar: SHY });
    // TeX/babel português: pelo menos 2 letras antes e 3 depois do hífen.
    // O PDF usa a codificação OT1: letras acentuadas são montadas com \accent e o TeX
    // só hifeniza a parte da palavra ANTES do primeiro acento (ex.: "oti-mização").
    hyph = function (word) {
      const m = word.match(/^[A-Za-z]+/);
      if (!m) return word;
      const w = m[0], rest = word.slice(w.length);
      if (w.length < 5) return word;
      const parts = h(w).split(SHY);
      let out = parts[0];
      for (let i = 1; i < parts.length; i++) {
        const left = out.replace(new RegExp(SHY, 'g'), '').length;
        const right = parts.slice(i).join('').length;
        out += (left >= 2 && right >= 3 ? SHY : '') + parts[i];
      }
      return out + rest;
    };
  }
  function hyphenateText(el) {
    if (!hyph || el._hyph) return;
    el._hyph = true;
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) { return n.parentElement.closest('.katex') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
    });
    const nodes = []; let n;
    while ((n = tw.nextNode())) nodes.push(n);
    nodes.forEach(function (t) {
      t.textContent = t.textContent.replace(/[A-Za-zÀ-ÿ]{5,}/g, hyph);
    });
  }
  function lineBoxes(el, k) {
    // agrupa palavras (e fórmulas) em linhas: [{left, right, n, hyph}]
    const items = [];
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: function (n) {
        if (n.nodeType === 1) {
          if (n.classList.contains('katex')) return NodeFilter.FILTER_ACCEPT;
          if (n !== el && n.matches('ol,ul,p,li,div')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_SKIP;
        }
        return n.parentElement.closest('.katex') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 1) {
        const r = n.getBoundingClientRect(); if (r.width) items.push([r.left, r.right, r.top, false]);
        continue;
      }
      const t = n.textContent, re = /[^\s]+/g; let m;
      while ((m = re.exec(t))) {
        const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
        const rs = Array.prototype.filter.call(rg.getClientRects(), function (r) { return r.width > 0; });
        rs.forEach(function (r, q) { items.push([r.left, r.right, r.top, q < rs.length - 1]); });
      }
    }
    const lines = [];
    items.forEach(function (it) {
      const L = lines[lines.length - 1];
      if (L && Math.abs(L.top - it[2]) < 4 * k) {
        L.left = Math.min(L.left, it[0]); L.right = Math.max(L.right, it[1]); L.n++; L.hyph = it[3];
      } else lines.push({ top: it[2], left: it[0], right: it[1], n: 1, hyph: it[3] });
    });
    return lines;
  }
  function texCost(lines, W, s, k, justified) {
    // devolve [demerits, maior badness das linhas não finais]
    let tot = 0, maxb = 0, prevHyph = false;
    lines.forEach(function (L, i) {
      const sp = Math.max(L.n - 1, 1);
      const nat = (L.right - L.left) - (L.n - 1) * s * k;  // largura com espaços naturais
      const last = i === lines.length - 1;
      let b = 0;
      if (nat > W + 0.2 * k) b = (nat - W) > sp * SHRINK * k ? 1e5 : 100 * Math.pow((nat - W) / (sp * SHRINK * k), 3);
      else if (justified && !last) b = Math.min(1e4, 100 * Math.pow(Math.max(0, W - nat) / (sp * STRETCH * k), 3));
      if (!last) maxb = Math.max(maxb, b);
      let d = Math.pow(10 + b, 2);
      if (L.hyph) d += 50 * 50 + (prevHyph ? 10000 : 0) + (i === lines.length - 2 ? 5000 : 0);
      prevHyph = L.hyph;
      tot += d;
    });
    return [tot, maxb];
  }
  function fitParagraph(el, k) {
    el.style.wordSpacing = ''; el.style.hyphens = '';
    const cs0 = getComputedStyle(el);
    if (cs0.textAlign === 'center') return;
    const lh = parseFloat(cs0.lineHeight) || 14;
    if (el.getBoundingClientRect().height < 1.5 * lh * k * 0.75) return; // uma linha só
    const justified = cs0.textAlign === 'justify';
    el.style.textAlign = 'left';
    const W = el.getBoundingClientRect().width - (parseFloat(cs0.paddingLeft) + parseFloat(cs0.paddingRight)) * k * 0.75;
    const cands = [];
    (justified && hyph ? ['none', 'manual'] : ['none']).forEach(function (hy) {
      el.style.hyphens = hy; el.style.webkitHyphens = hy;
      SPACINGS.forEach(function (s) {
        el.style.wordSpacing = s + 'pt';
        const c = texCost(lineBoxes(el, k), W, s, k, justified);
        cands.push({ s: s, hy: hy, d: c[0], maxb: c[1] });
      });
    });
    // TeX: 1ª passada sem hifenização (tolerância 100), 2ª com hifenização (tolerância 200)
    function pick(list) { return list.reduce(function (a, b) { return b.d < a.d - 1 ? b : a; }, list[0]); }
    let pool = cands.filter(function (c) { return c.hy === 'none' && c.maxb <= 100; });
    if (!pool.length) pool = cands.filter(function (c) { return c.maxb <= 200; });
    if (!pool.length) pool = cands;
    const best = pick(pool);
    el.style.wordSpacing = best.s ? best.s + 'pt' : '';
    el.style.hyphens = best.hy; el.style.webkitHyphens = best.hy;
    el.style.textAlign = '';
  }
  // Fórmula em destaque após linha curta: o TeX usa \abovedisplayshortskip (bem menor)
  function markShortDisplays(f, k) {
    f.querySelectorAll('.eq').forEach(function (eq) {
      eq.classList.remove('short');
      let prev = eq.previousElementSibling;
      if (!prev && eq.parentElement.classList.contains('ov-block')) prev = eq.parentElement.previousElementSibling;
      const first = eq.querySelector('.katex-html');
      if (!first) return;
      const left = first.getBoundingClientRect().left;
      let prevRight = null;
      if (!prev || prev.classList.contains('eq')) prevRight = eq.getBoundingClientRect().left;
      else if (prev.matches('p')) {
        const ls = lineBoxes(prev, k);
        if (ls.length) prevRight = ls[ls.length - 1].right;
      }
      if (prevRight !== null && prevRight + 21.82 * k < left) eq.classList.add('short');
      // fórmula alta: o TeX troca o \baselineskip pelo \lineskip (1pt) e a linha "cresce"
      eq.style.marginTop = ''; eq.style.marginBottom = '';
      const base = eq.getBoundingClientRect().top + 22.385 * k;
      let top = Infinity, bot = -Infinity;
      eq.querySelectorAll('.katex-html > .base').forEach(function (b) {
        const r = b.getBoundingClientRect(); top = Math.min(top, r.top); bot = Math.max(bot, r.bottom);
      });
      if (top === Infinity) return;
      const h = (base - top) / k, dd = (bot - base) / k;
      const extraTop = Math.max(0, 2.4 + h + 1 - 13.55), extraBot = Math.max(0, dd + 7.6 + 1 - 13.55);
      const cs = getComputedStyle(eq);
      if (extraTop > 0.05) eq.style.marginTop = (parseFloat(cs.marginTop) * 0.75 + extraTop) + 'pt';
      if (extraBot > 0.05) eq.style.marginBottom = (parseFloat(cs.marginBottom) * 0.75 + extraBot) + 'pt';
    });
  }
  function texFit(f) {
    if (f._fitted || !fontsReady) return;
    f._fitted = true;
    const k = f.getBoundingClientRect().width / 453.543; // px (na tela) por pt
    f.querySelectorAll('.fc p, .fc li, .fc .alg-body > div').forEach(function (el) {
      // <br> (\\) é tratado pelo texbreak.js como quebra forçada (aula 7, slide 62)
      if (el.closest('.ov-gone') || el.classList.contains('imgs') || el.querySelector('img')) return;
      if (el.closest('.jus')) hyphenateText(el);
      if (!(window.TeXBreak && window.TeXBreak.layout(el, k))) fitParagraph(el, k);
    });
    markShortDisplays(f, k);
    shrinkToFit(f, k);
  }

  // Conteúdo maior que a área do frame: como o TeX, encolhe as colas verticais que têm
  // componente "minus" (topsep do center, itemsep das listas, espaços das fórmulas),
  // proporcionalmente, até o limite de cada uma.
  function shrinkToFit(f, k) {
    const fc = f.querySelector('.fc'); if (!fc) return;
    const kids = Array.prototype.filter.call(fc.children, function (c) { return c.offsetParent !== null; });
    if (!kids.length) return;
    // tolerância de 2pt: o TeX mede até a linha de base + profundidade, não até o fim da caixa de linha
    const over = (kids[kids.length - 1].getBoundingClientRect().bottom - fc.getBoundingClientRect().bottom) / k - 2;
    if (over <= 0.3) return;
    const glue = [];
    fc.querySelectorAll('.center').forEach(function (el) {
      glue.push([el, 'marginTop', 5]);
      // o topsep também vem depois do center (aula 7, slide 16: figura alta seguida de texto)
      if (el.nextElementSibling) glue.push([el, 'marginBottom', 5]);
    });
    fc.querySelectorAll('li + li').forEach(function (el) { glue.push([el, 'marginTop', 1.95]); });
    fc.querySelectorAll('.eq').forEach(function (el) { glue.push([el, 'marginTop', 6]); glue.push([el, 'marginBottom', 6]); });
    const total = glue.reduce(function (a, g) { return a + g[2]; }, 0);
    if (!total) return;
    const r = Math.min(1, over / total);
    glue.forEach(function (g) {
      const cur = parseFloat(getComputedStyle(g[0])[g[1]]) * 0.75; // px -> pt
      g[0].style[g[1]] = (cur - g[2] * r) + 'pt';
    });
  }

  // ---------- Navegação ----------
  let cur = 0, step = 1;
  let fontsReady = false;

  function show(fi, st, noHash) {
    fi = Math.max(0, Math.min(total - 1, fi));
    const f = frames[fi];
    st = Math.max(1, Math.min(f._steps, st));
    if (fi !== cur) {
      frames[cur].classList.remove('active');
      frames[cur].dispatchEvent(new CustomEvent('leave'));
    }
    f.classList.add('active');
    const entering = fi !== cur || !f._seen;
    const from = cur, prevStep = step;
    cur = fi; step = st;
    if (!f._fitted) applyStep(f, 1);   // o ajuste usa o primeiro passo, como referência
    texFit(f);
    applyStep(f, st);
    if (entering) { f._seen = true; f.dispatchEvent(new CustomEvent('enter', { detail: { from: from, step: st } })); }
    else if (st !== prevStep) f.dispatchEvent(new CustomEvent('step', { detail: { step: st, prev: prevStep } }));
    if (!noHash) history.replaceState(null, '', '#' + (fi + 1) + (st > 1 ? '.' + st : ''));
  }
  function next() {
    const fc = frames[cur];
    if (fc._busy && fc._busy()) { fc._finish(); return; }
    if (step < frames[cur]._steps) show(cur, step + 1);
    else if (cur < total - 1) show(cur + 1, 1);
  }
  function prev() {
    if (step > 1) show(cur, step - 1);
    else if (cur > 0) show(cur - 1, frames[cur - 1]._steps);
  }
  function fromHash() {
    const m = location.hash.match(/^#(\d+)(?:\.(\d+))?/);
    if (m) show(+m[1] - 1, m[2] ? +m[2] : 1, true);
    else show(0, 1, true);
  }

  let typed = '';
  document.addEventListener('keydown', function (e) {
    if (e.target.closest('input,textarea,select,[contenteditable]')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (/^\d$/.test(k)) { typed += k; return; }
    if (k === 'Enter' && typed) { show(+typed - 1, 1); typed = ''; e.preventDefault(); return; }
    typed = '';
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { next(); e.preventDefault(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { prev(); e.preventDefault(); }
    else if (k === 'Home') { show(0, 1); e.preventDefault(); }
    else if (k === 'End') { show(total - 1, frames[total - 1]._steps); e.preventDefault(); }
    else if (k === 'f' || k === 'F') {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    }
  });

  // Clique: metade esquerda volta, metade direita avança.
  // Elementos interativos (botões, campos, [data-interactive]) não disparam navegação.
  document.addEventListener('click', function (e) {
    if (e.target.closest('a,button,input,textarea,select,label,[data-interactive]')) return;
    if (e.clientX < window.innerWidth * 0.25) prev(); else next();
  });
  // Roda do mouse: para baixo avança, para cima volta (um passo por "giro").
  // Touchpads mandam muitos eventos seguidos (inclusive por inércia): depois de um passo, os eventos
  // são ignorados até a roda ficar parada por um instante. Componentes que usam a roda (ex.: a bola
  // de localopt.js) chamam preventDefault e não disparam a navegação.
  let wheelAcc = 0, wheelLock = 0, wheelLast = 0;
  document.addEventListener('wheel', function (e) {
    if (e.defaultPrevented || e.ctrlKey) return;            // ctrl+roda = zoom do navegador
    if (e.target.closest('input,textarea,select,[contenteditable]')) return;
    e.preventDefault();
    const now = performance.now(), gap = now - wheelLast;
    wheelLast = now;
    if (now < wheelLock || (wheelLock && gap < 160)) {       // ainda no mesmo gesto
      wheelLock = Math.max(wheelLock, now); return;
    }
    wheelLock = 0;
    if (gap > 300) wheelAcc = 0;
    const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 800 : 1;   // linhas / páginas -> px
    const d = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * unit;
    wheelAcc += d;
    if (Math.abs(wheelAcc) < 40) return;
    if (wheelAcc > 0) next(); else prev();
    wheelAcc = 0; wheelLock = now + 250;
  }, { passive: false });
  window.addEventListener('hashchange', fromHash);

  // ---------- Escala ----------
  const PT = 4 / 3; // 1pt = 4/3 px CSS
  const W = 453.543 * PT, H = 255.118 * PT;
  function fit() {
    const s = Math.min(window.innerWidth / W, window.innerHeight / H);
    deck.style.transform = 'translate(-50%, -50%) scale(' + s + ')';
  }
  window.addEventListener('resize', fit);
  fit();

  // ---------- Fórmulas (KaTeX) ----------
  if (window.renderMathInElement) {
    renderMathInElement(deck, {
      delimiters: [
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false }
      ],
      throwOnError: false
    });
  }

  if (window.Anim) window.Anim.setup();
  fromHash();
  // mostra o slide só quando fontes e quebras de linha estiverem prontas (evita o "pulo" do texto)
  function reveal() { document.documentElement.classList.add('ready'); }
  setTimeout(reveal, 2500);
  // Todas as fontes precisam estar carregadas antes de medir as palavras: o navegador só
  // carrega negrito/itálico/fontes do KaTeX quando aparecem pela primeira vez.
  const FACES = ['400 10pt "LM Sans"', '700 10pt "LM Sans"', 'italic 400 10pt "LM Sans"', 'italic 700 10pt "LM Sans"',
    '10pt "LM Sans 12"', '10pt "LM Sans 9"', '10pt "LM Sans 8"',
    '10pt KaTeX_Main', 'bold 10pt KaTeX_Main', 'italic 10pt KaTeX_Main', 'italic 10pt KaTeX_Math',
    '10pt KaTeX_AMS', '10pt KaTeX_Size1', '10pt KaTeX_Size2', '10pt KaTeX_Size3', '10pt KaTeX_Size4',
    '10pt KaTeX_SansSerif'];
  if (document.fonts && document.fonts.load) {
    Promise.all(FACES.map(function (f) { return document.fonts.load(f).catch(function () {}); }))
      .then(function () { return document.fonts.ready; })
      .then(function () { fontsReady = true; texFit(frames[cur]); reveal(); fitAllIdle(); });
  } else { fontsReady = true; reveal(); }

  // Prepara os demais frames aos poucos (deixa a navegação instantânea e a impressão correta)
  function fitAllIdle() {
    let i = 0;
    const idle = window.requestIdleCallback || function (cb) { return setTimeout(cb, 30); };
    (function tick() {
      idle(function () {
        while (i < total && frames[i]._fitted) i++;
        if (i >= total) return;
        const f = frames[i];
        const was = f.classList.contains('active');
        if (!was) { f.style.visibility = 'hidden'; f.classList.add('active'); }
        applyStep(f, 1); texFit(f); applyStep(f, was ? step : 1);
        if (!was) { f.classList.remove('active'); f.style.visibility = ''; }
        i++; tick();
      });
    })();
  }

  // API mínima para scripts de slides interativos.
  window.Deck = { show: show, next: next, prev: prev, frames: frames,
    get current() { return { frame: cur + 1, step: step }; } };
})();
