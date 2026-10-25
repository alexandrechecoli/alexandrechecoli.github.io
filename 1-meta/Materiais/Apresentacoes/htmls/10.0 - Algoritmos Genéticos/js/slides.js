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
    f._curStep = step;
    f.querySelectorAll('[data-on]').forEach(function (el) {
      el.classList.toggle('ov-hidden', !inSpec(el.dataset.on, step));
    });
    f.querySelectorAll('[data-only]').forEach(function (el) {
      el.classList.toggle('ov-gone', !inSpec(el.dataset.only, step));
    });
  }

  // ---------- Rodapé ----------
  frames.forEach(function (f, i) {
    if (f.querySelector(':scope > footer') || f.classList.contains('plain')) return;   // [plain]: sem rodapé
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
      if (eq._msd || hidden(eq)) return;
      eq._msd = true;
      eq.classList.remove('short');
      let prev = prevVis(eq);
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
      // .par (conversor, aula 9): a fórmula abre um parágrafo -> o TeX compõe antes uma linha vazia (profundidade 0,
      // largura = recuo 0) e a fórmula é "curta" se começa a mais de 2em da margem (css .eq.par); senão usa as
      // colas normais (.parlong; aula 9, slide 24: fórmula larga numa coluna estreita)
      const par = eq.classList.contains('par');
      eq.classList.remove('parlong');
      if (par && (left - eq.getBoundingClientRect().left) / k <= 21.82) eq.classList.add('parlong');
      // fórmula logo depois de outra: o parágrafo entre elas é vazio (TeX: pre_display_size = -max_dimen) -> sempre curta
      if (!par && prev && prev.classList.contains('eq')) eq.classList.add('short');
      else if (!par && prevRight !== null && prevRight + 21.82 * k < left) eq.classList.add('short');
      // fórmula alta: o TeX troca o \baselineskip pelo \lineskip (1pt) e a linha "cresce"
      eq.style.marginTop = ''; eq.style.marginBottom = '';
      const base = eq.getBoundingClientRect().top + 22.385 * k;
      let top = Infinity, bot = -Infinity;
      eq.querySelectorAll('.katex-html > .base').forEach(function (b) {
        const r = b.getBoundingClientRect(); top = Math.min(top, r.top); bot = Math.max(bot, r.bottom);
      });
      if (top === Infinity) return;
      const h = (base - top) / k, dd = (bot - base) / k;
      // profundidade da linha anterior: 2.4 (calibrado na aula 5), a real se for maior (fórmula inline alta, aula 9)
      let pd = 2.4;
      if (par) pd = 0;
      else if (prev && prev.matches('p')) pd = Math.max(pd, lineHD(lastLineOf(prev)).d);
      eq._dd = dd;
      const extraTop = Math.max(0, pd + h + 1 - 13.55), extraBot = Math.max(0, dd + 7.6 + 1 - 13.55);
      const cs = getComputedStyle(eq);
      if (extraTop > 0.05) eq.style.marginTop = (parseFloat(cs.marginTop) * 0.75 + extraTop) + 'pt';
      // última coisa numa tcolorbox: a caixa fecha na profundidade da fórmula (a cola de baixo some) e o conteúdo
      // termina 9.92pt antes da borda de fora (aula 9, slides 22, 24 e 25); o padding da .tcb é 9.84
      if (eq.parentElement.classList.contains('tcb') && !eq.nextElementSibling) {
        eq.style.marginBottom = (dd + 0.08 - 13.165).toFixed(3) + 'pt';
      } else if (extraBot > 0.05) eq.style.marginBottom = (parseFloat(cs.marginBottom) * 0.75 + extraBot) + 'pt';
    });
  }
  // \Comment do algpseudocode = "\hfill ▷ texto" dentro do parágrafo da linha (aula 8, slide 52, colunas
  // estreitas). Se texto + comentário não cabem, o TeX põe na 1ª linha tantas palavras do comentário quantas
  // couberem (com o \hfill todas as quebras têm badness 0 e vale a mais tardia) e o resto continua na linha
  // de baixo, a partir da margem do algorithmic (recuo do nível 1), sem hifenizar.
  function algWrap(f, k) {
    f.querySelectorAll('.fc .alg-body > div > .alg-cmt').forEach(function (cmt) {
      const el = cmt.parentElement;
      if (el._algWrap) return; el._algWrap = true;
      const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize) * 0.75;
      const er = el.getBoundingClientRect();
      const W = er.width / k - parseFloat(cs.paddingLeft) * 0.75;      // largura útil da 1ª linha (pt)
      // largura do texto antes do comentário
      const rg = document.createRange();
      rg.setStart(el, 0); rg.setEndBefore(cmt);
      const textW = rg.getBoundingClientRect().width / k;
      // espaços entre palavras do texto (fora das fórmulas: o MathML escondido do KaTeX também tem espaços)
      let txt = '';
      (function walkT(n) {
        for (let c = n.firstChild; c && c !== cmt; c = c.nextSibling) {
          if (c.nodeType === 3) txt += c.nodeValue;
          else if (c.classList && c.classList.contains('katex')) txt += 'K';
          else if (c.nodeType === 1) walkT(c);
        }
      })(el);
      const nSpText = (txt.trim().match(/\s+/g) || []).length;
      // palavras do comentário (sequências sem espaço; fórmulas KaTeX contam como caracteres)
      cmt.style.position = 'static'; cmt.style.display = 'inline'; cmt.style.whiteSpace = 'nowrap';
      const A = [];
      (function walk(n) {
        for (let c = n.firstChild; c; c = c.nextSibling) {
          if (c.nodeType === 3) for (let i = 0; i < c.nodeValue.length; i++) A.push({ node: c, off: i, sp: /\s/.test(c.nodeValue[i]) });
          else if (c.classList && c.classList.contains('katex')) A.push({ el: c, sp: false });
          else if (c.nodeType === 1) walk(c);
        }
      })(cmt);
      const words = [];
      let cur = null;
      A.forEach(function (a) { if (a.sp) { cur = null; return; } if (!cur) { cur = { a0: a, a1: a }; words.push(cur); } cur.a1 = a; });
      function pos(a, after) {
        const r = document.createRange();
        if (a.el) { if (after) r.setStartAfter(a.el); else r.setStartBefore(a.el); }
        else r.setStart(a.node, a.off + (after ? 1 : 0));
        return r;
      }
      // borda esquerda/direita do próprio caractere (ou da fórmula)
      function x(a, after) {
        let rr;
        if (a.el) rr = a.el.getBoundingClientRect();
        else { const r = document.createRange(); r.setStart(a.node, a.off); r.setEnd(a.node, a.off + 1); rr = r.getBoundingClientRect(); }
        return (after ? rr.right : rr.left) / k;
      }
      const space = fs * 0.3333, shrink = fs * 0.1111;
      let best = -1;
      if (words.length) {
        const x0 = x(words[0].a0, false);
        for (let j = 0; j < words.length; j++) {
          const wj = x(words[j].a1, true) - x0;            // comentário até a palavra j
          const nat = textW + space + wj, sh = shrink * (nSpText + 1 + j);
          if (nat - sh <= W + 0.1) best = j; else break;
        }
      }
      cmt.style.position = ''; cmt.style.display = ''; cmt.style.whiteSpace = '';
      if (best === words.length - 1) return;               // cabe: comentário alinhado à direita (CSS)
      // o resto vai para uma linha de continuação no recuo do nível 1
      const cut = document.createRange();
      if (best >= 0) cut.setStart(pos(words[best].a1, true).startContainer, pos(words[best].a1, true).startOffset);
      else cut.setStart(cmt, 0);
      cut.setEnd(cmt, cmt.childNodes.length);
      const rest = cut.extractContents();
      const cont = document.createElement('div');
      cont.className = 'l1 alg-cont';
      cont.appendChild(rest);
      // tira o espaço inicial da continuação
      const t0 = cont.firstChild;
      if (t0 && t0.nodeType === 3) t0.nodeValue = t0.nodeValue.replace(/^\s+/, '');
      el.after(cont);
      if (best < 0) cmt.remove();
    });
  }

  // O ajuste é feito com o frame no passo 1. Conteúdo de \only<n> (data-only) que só aparece em passos
  // seguintes fica com display:none no passo 1 e não seria medido (aula 9, slide 23): para esses frames há um
  // passe por passo, e cada elemento é ajustado uma vez só, no 1º passo em que aparece. O encolhimento das
  // colas (shrinkToFit) usa o passo 1.
  function texFit(f) {
    if (f._fitted || !fontsReady) return;
    f._fitted = true;
    const k = f.getBoundingClientRect().width / 453.543; // px (na tela) por pt
    algWrap(f, k);
    const steps = f.querySelector('.fc [data-only]') ? (f._steps || 1) : 1;
    const was = f._curStep || 1;
    for (let st = 1; st <= steps; st++) {
      applyStep(f, st);
      fitVisible(f, k);
      if (st === 1) shrinkToFit(f, k);
    }
    applyStep(f, was);
  }
  // escondido no passo atual: dentro de um \only fora do passo, ou vazio (ex.: <p> só com um \only<4->{...})
  const hidden = function (el) { return !!el.closest('.ov-gone') || el.offsetHeight === 0; };
  // irmão anterior que aparece no passo atual (pula alternativas de \only escondidas)
  function prevVis(el) {
    let p = el.previousElementSibling;
    while (p && p.classList.contains('ov-gone')) p = p.previousElementSibling;
    return p;
  }
  function fitVisible(f, k) {
    f.querySelectorAll('.fc p, .fc li, .fc .alg-body > div').forEach(function (el) {
      // <br> (\\) é tratado pelo texbreak.js como quebra forçada (aula 7, slide 62)
      if (el._fit || hidden(el) || el.classList.contains('imgs') || el.querySelector('img')) return;
      el._fit = true;
      if (el.closest('.jus')) hyphenateText(el);
      if (!(window.TeXBreak && window.TeXBreak.layout(el, k))) fitParagraph(el, k);
    });
    trailingSpace(f, k);
    markShortDisplays(f, k);
    tallLines(f, k);
    lastLineDepth(f);
    sameAsAlternative(f);
  }

  // \only<3>{texto + center} \only<4->{texto + center}: as alternativas são irmãs no HTML (escondidas com
  // display:none), então as regras de espaçamento do css entre irmãos ("center + p"...) erram a partir da 2ª.
  // O 1º elemento de cada alternativa recebe a margem de cima do 1º elemento da 1ª alternativa (aula 9, slide 23).
  function sameAsAlternative(f) {
    f.querySelectorAll('.fc [data-only]').forEach(function (el) {
      if (el._alt || hidden(el)) return;
      el._alt = true;
      const pv = el.previousElementSibling;
      if (!pv || !pv.dataset.only || pv.dataset.only === el.dataset.only) return;
      let first = pv;
      while (first.previousElementSibling && first.previousElementSibling.dataset.only === pv.dataset.only) first = first.previousElementSibling;
      const cls = function (e) { return e.className.replace(/\bov-(gone|hidden)\b/g, '').replace(/\s+/g, ' ').trim(); };
      if (first.tagName !== el.tagName || cls(first) !== cls(el)) return;
      el.style.marginTop = getComputedStyle(first).marginTop;
    });
  }

  // Linhas com fórmula inline alta (aula 9: \dfrac no texto, cases num center): entre duas linhas o TeX põe
  // \baselineskip; se a profundidade da de cima + a altura da de baixo + \lineskip (1pt) passar disso, usa
  // d + h + 1. O CSS supõe sempre 13.55pt (fórmulas inline com altura 0) -> a diferença vira um "strut"
  // invisível no início da linha de baixo.
  function lastLineOf(el) {
    const ls = el.querySelectorAll('.tl');
    return ls.length ? ls[ls.length - 1] : el;
  }
  function lineHD(line) {
    const fs = parseFloat(getComputedStyle(line).fontSize) * 0.75;
    let h = heightOf(line), d = depthOf(line);
    line.querySelectorAll('.katex .strut').forEach(function (s) {
      const t = parseFloat(s.style.height || '0'), v = -parseFloat(s.style.verticalAlign || '0');
      if (t - v > h) h = t - v;
    });
    return { h: h * fs, d: d * fs };
  }
  // li[data-tsp] (conversor, aula 10): o espaço depois do grupo de cor no fim do item não some; se não cabe na
  // última linha (nem encolhido, 0.2222em), o TeX quebra nele e o item ganha uma linha vazia
  function trailingSpace(f, k) {
    f.querySelectorAll('.fc li[data-tsp]').forEach(function (li) {
      if (li._tsp || hidden(li)) return;
      li._tsp = true;
      const ls = Array.prototype.filter.call(li.querySelectorAll('.tl'), function (t) { return t.closest('li') === li; });
      if (!ls.length) return;
      const last = ls[ls.length - 1], fs = parseFloat(getComputedStyle(li).fontSize) * 0.75;
      const lr = li.getBoundingClientRect(), r = last.getBoundingClientRect();
      const spare = (lr.right - parseFloat(getComputedStyle(li).paddingRight) - r.right) / k;
      if (spare >= 0.2222 * fs) return;
      const e = document.createElement('span'); e.className = 'tl tsp'; e.textContent = '​';
      last.after(document.createElement('br'), e);
    });
  }
  function tallLines(f, k) {
    f.querySelectorAll('.fc p').forEach(function (p) {
      if (p._tall || hidden(p) || p.classList.contains('imgs') || p.closest('.eq, .algorithm, .tab, .lst')) return;
      p._tall = true;
      let lines = Array.prototype.slice.call(p.querySelectorAll('.tl'));
      if (!lines.length) { if (!p.querySelector('.katex')) return; lines = [p]; }
      const cs = getComputedStyle(p), LH = parseFloat(cs.lineHeight) * 0.75, fs = parseFloat(cs.fontSize) * 0.75;
      let prevD = null, prevEq = null;
      // linha anterior ao parágrafo: última linha do parágrafo (ou center/ov-block) de antes, ou uma fórmula
      let pe = prevVis(p);
      if (!pe && p.parentElement.matches('.center, .ov-block')) pe = prevVis(p.parentElement);
      if (pe && pe.matches('.center, .ov-block')) pe = pe.lastElementChild;
      if (pe && pe.matches('p') && !pe.classList.contains('imgs')) prevD = lineHD(lastLineOf(pe)).d;
      else if (pe && pe.matches('.eq') && pe._dd !== undefined) prevEq = pe;
      lines.forEach(function (line) {
        const hd = lineHD(line);
        let extra = 0;
        if (prevD !== null) extra = Math.max(0, prevD + hd.h + 1 - LH);
        else if (prevEq) extra = Math.max(0, prevEq._dd + hd.h + 1 - 13.55) - Math.max(0, prevEq._dd + 7.6 + 1 - 13.55);
        if (extra > 0.05) {
          const s = document.createElement('span');
          s.className = 'lstrut';
          s.style.height = (LH / 2 + 0.4225 * fs + extra).toFixed(3) + 'pt';
          line.insertBefore(s, line.firstChild);
        }
        prevD = hd.d; prevEq = null;
      });
    });
    // itens de lista com fórmula alta (aula 10, slide 64: \dfrac): entre a última linha do item anterior (ou do
    // parágrafo antes da lista) e cada linha do item vale a mesma regra do \lineskip
    f.querySelectorAll('.fc li').forEach(function (li) {
      if (li._tall || hidden(li)) return;
      li._tall = true;
      const own = function (el) {
        return Array.prototype.filter.call(el.querySelectorAll('.tl'), function (t) { return t.closest('li') === el; });
      };
      const lines = own(li); if (!lines.length) return;
      const cs = getComputedStyle(li), LH = parseFloat(cs.lineHeight) * 0.75, fs = parseFloat(cs.fontSize) * 0.75;
      let prevD = null;
      const pl = li.previousElementSibling;
      if (pl && pl.matches('li')) {
        const ls = own(pl);
        if (ls.length && !pl.querySelector('ol, ul')) prevD = lineHD(ls[ls.length - 1]).d;
      } else if (!pl) {
        const pe = prevVis(li.parentElement);
        if (pe && pe.matches('p') && !pe.classList.contains('imgs')) prevD = lineHD(lastLineOf(pe)).d;
      }
      lines.forEach(function (line) {
        const hd = lineHD(line);
        const extra = prevD !== null ? Math.max(0, prevD + hd.h + 1 - LH) : 0;
        if (extra > 0.05) {
          const s = document.createElement('span');
          s.className = 'lstrut';
          s.style.height = (LH / 2 + 0.4225 * fs + extra).toFixed(3) + 'pt';
          line.insertBefore(s, line.firstChild);
        }
        prevD = hd.d;
      });
    });
    // block depois de texto: o block é uma vbox alta -> o TeX usa \lineskip, e o topo da barra fica a
    // profundidade da última linha + 7.95pt da linha de base (aulas 5 e 9: 7.93..7.98 em 9 casos). O css (6.7pt)
    // supõe profundidade 2.73 (parêntese); "Conceitos”:" (profundidade 0) fica 2.73pt mais perto
    f.querySelectorAll('.fc .block').forEach(function (b) {
      if (b._bk || hidden(b)) return;
      b._bk = true;
      b.style.marginTop = '';
      let pe = prevVis(b);
      if (pe && pe.matches('.center, .ov-block')) pe = pe.lastElementChild;
      if (!pe || !pe.matches('p') || pe.classList.contains('imgs')) return;
      const d = lineHD(lastLineOf(pe)).d;
      const mt = parseFloat(getComputedStyle(b).marginTop) * 0.75;
      if (Math.abs(d - 2.73) > 0.05) b.style.marginTop = (mt + d - 2.73).toFixed(3) + 'pt';
    });
    // center só com figura depois de texto: a linha da figura é alta -> \lineskip: topo da figura = linha de base +
    // profundidade da linha + 1pt + topsep (6.57) (aula 9, slide 6). O css (p + .center 8.2pt) supõe profundidade
    // 2.73. Alternativas \only<n>{\begin{center}...} são irmãs escondidas: o "p + .center" do css só pega a 1ª.
    f.querySelectorAll('.fc .center').forEach(function (c) {
      if (c._ct || hidden(c) || !c.querySelector(':scope > p.imgs:only-child')) return;
      c._ct = true;
      c.style.marginTop = '';
      const pe = prevVis(c);
      if (!pe || !pe.matches('p') || pe.classList.contains('imgs')) return;
      const d = lineHD(lastLineOf(pe)).d;
      c.style.marginTop = (10.4 + d - 2.73).toFixed(3) + 'pt';
    });
    // columns com uma figura mais larga que a coluna (p.imgs.ovf, aula 10: PMX, OX, substituição): a coluna de
    // texto (texto direto, sem center) fica centrada no TeX pela caixa das letras (topo = linha de base - altura
    // da 1ª linha, fim = última linha de base + profundidade), 11.35pt acima do centro da figura. O flex centra
    // as caixas de linha (13.55pt) no centro da coluna da figura (que inclui a linha vazia de 13.55 acima dela).
    // Coluna de texto dentro de \begin{center}\justifying (ao lado de uma figura): o TeX centra pela caixa das
    // letras com o topsep do center; desce 2.075 - prof./2 em relação ao flex (medido nos frames 27-35 e 48:
    // erro <= 0.31pt). Uma tcolorbox no fim da coluna (\onslide, ocupa espaço) fecha exata: sem a correção da
    // profundidade.
    f.querySelectorAll('.fc .columns').forEach(function (cs) {
      if (cs._ov || hidden(cs) || !cs.querySelector('img')) return;
      cs._ov = true;
      const ovf = !!cs.querySelector('p.imgs.ovf');
      Array.prototype.forEach.call(cs.children, function (col) {
        if (col.querySelector('img') || !col.firstElementChild) return;
        const ls = col.querySelectorAll('.tl'); if (!ls.length) return;
        const last = col.lastElementChild;
        const d = last.matches('.tcb') ? 2.165 : lineHD(lastLineOf(last.matches('p') ? last : col)).d;
        if (col.firstElementChild.matches('p') && ovf) {
          const h1 = lineHD(ls[0]).h;
          const shift = 4.575 + (11.385 - h1) / 2 - (2.165 - d) / 2;
          col.style.marginTop = (-2 * shift).toFixed(3) + 'pt';
        } else if (col.firstElementChild.matches('.center') && !col.firstElementChild.querySelector('img')) {
          col.style.marginTop = (4.15 - d).toFixed(3) + 'pt';
        }
      });
    });
    // título com {\center ...} (aula 10): o título vira um parágrafo sem strut e a barra tem a altura das letras:
    // 3.0 + altura (mín. 0.694em) + profundidade (mín. 1.5pt) + 1.99pt; linha de base a 3.0 + altura do topo
    // (medido no PDF: "Atenção" 15.32, "Conclusão" 14.79, "ATENÇÃO" 18.09)
    f.querySelectorAll('.fc .block-title.tc').forEach(function (t) {
      if (t._tc) return;
      t._tc = true;
      const fs = parseFloat(getComputedStyle(t).fontSize) * 0.75;
      const h = heightOf(t) * fs, d = Math.max(depthOf(t) * fs, 1.5);
      t.style.height = (3.0 + h + d + 1.99).toFixed(3) + 'pt';
      t.style.lineHeight = (2 * (3.0 + h - 0.4225 * fs)).toFixed(3) + 'pt';
    });
    // algorithm (float [H], aula 10): o TeX usa \lineskip antes da caixa alta -> régua de cima = linha de base
    // anterior + profundidade dela + 12.96 (o css, 10.45pt, supõe profundidade 0); régua de baixo = última
    // linha de base + profundidade + 4.37 (aula 9: 4.37 com profundidade 0; aqui "População." 6.49)
    f.querySelectorAll('.fc .algorithm:not(.bare)').forEach(function (a) {
      if (a._ag || hidden(a)) return;
      a._ag = true;
      const pe = prevVis(a);
      if (pe && pe.matches('p') && !pe.classList.contains('imgs')) {
        const d = lineHD(lastLineOf(pe)).d;
        a.style.marginTop = (parseFloat(getComputedStyle(a).marginTop) * 0.75 + d).toFixed(3) + 'pt';
      }
      const body = a.querySelector('.alg-body'), ln = body && body.lastElementChild;
      if (ln) {
        const d = lineHD(ln.querySelector('.tl') || ln).d;
        body.style.paddingBottom = (parseFloat(getComputedStyle(body).paddingBottom) * 0.75 - 0.38 + d).toFixed(3) + 'pt';
      }
    });
    // fim do corpo do block (aula 10): última linha de base + profundidade real + 3.5pt (PDF: "métodos." 3.50,
    // "reprodução)." 6.23); o css dá 6.36 da linha de base ao fim
    f.querySelectorAll('.fc .block-body').forEach(function (bd) {
      if (bd._bb2 || hidden(bd)) return;
      bd._bb2 = true;
      const last = bd.lastElementChild;
      if (!last || !last.matches('p')) return;
      const d = lineHD(lastLineOf(last)).d;
      bd.style.paddingBottom = (parseFloat(getComputedStyle(bd).paddingBottom) * 0.75 + d - 2.86).toFixed(3) + 'pt';
    });
    // 1ª linha do corpo do block: o css supõe altura 0.75em (parêntese, "|"); mais alta ("2^S", aula 9 slide 4:
    // +1.23pt) ou mais baixa (só letras, 0.694em) desloca a linha
    f.querySelectorAll('.fc .block-body').forEach(function (bd) {
      if (bd._bb || hidden(bd)) return;
      bd._bb = true;
      bd.style.paddingTop = '';
      const first = bd.firstElementChild;
      if (!first || !first.matches('p')) return;
      const fl = first.querySelector('.tl') || first;
      const fs = parseFloat(getComputedStyle(fl).fontSize) * 0.75;
      const dh = lineHD(fl).h - 0.75 * fs;
      if (Math.abs(dh) > 0.05) bd.style.paddingTop = (parseFloat(getComputedStyle(bd).paddingTop) * 0.75 + dh).toFixed(3) + 'pt';
    });
  }

  // Profundidade real da última linha (aula Lab3, slide 3): o TeX fecha a tcolorbox (e mede o espaço até
  // uma caixa seguinte) a partir da profundidade da última linha, não de uma linha "padrão". O CSS foi
  // calibrado com linhas que têm g/j/p/q/y (0.1944 em). Profundidades do cmss10 (TFM), em em:
  const DEPTH = { g: 0.1944, j: 0.1944, p: 0.1944, q: 0.1944, y: 0.1944, 'ç': 0.17, 'Ç': 0.17, Q: 0.125,
    ',': 0.125, ';': 0.125, '(': 0.25, ')': 0.25, '[': 0.25, ']': 0.25, '/': 0.25, '|': 0.25 };
  function depthOf(line) {
    let d = 0;
    const tw = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    let t;
    while ((t = tw.nextNode())) {
      if (t.parentElement.closest('.katex')) continue;
      for (const ch of t.nodeValue) if (DEPTH[ch] > d) d = DEPTH[ch];
    }
    line.querySelectorAll('.katex .strut').forEach(function (s) {
      const v = -parseFloat(s.style.verticalAlign || '0'); if (v > d) d = v;   // em
    });
    return d;
  }
  // Altura da 1ª linha (aula 8, slide 18): dentro da tcolorbox a 1ª linha de base fica a "altura da linha"
  // do topo; o CSS supõe 0.694 em (maiúsculas/ascendentes). Maiúscula com acento ("OBSERVAÇÃO") chega a
  // ~0.90 em no PDF (medido: a linha desce 2.28 pt); parênteses 0.75 em.
  const HEIGHT = { '(': 0.75, ')': 0.75, '[': 0.75, ']': 0.75, '/': 0.75, '|': 0.75 };
  'ÀÁÂÃÄÉÊÈÍÌÎÓÔÕÒÖÚÙÛÜ'.split('').forEach(function (c) { HEIGHT[c] = 0.903; });
  function heightOf(line) {
    let h = 0.694;
    const tw = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    let t;
    while ((t = tw.nextNode())) {
      if (t.parentElement.closest('.katex')) continue;
      for (const ch of t.nodeValue) if (HEIGHT[ch] > h) h = HEIGHT[ch];
    }
    return h;
  }
  function lastLineDepth(f) {
    f.querySelectorAll('.fc .tcb').forEach(function (box) {
      if (box._lt || hidden(box)) return;
      let first = box.firstElementChild;
      if (first && first.classList.contains('center')) first = first.firstElementChild || first;
      if (!first) return;
      const fl = first.querySelector('.tl') || first;
      const fsf = parseFloat(getComputedStyle(fl).fontSize) * 0.75;
      const dh = (heightOf(fl) - 0.694) * fsf;
      if (dh > 0.05) box.style.paddingTop = (parseFloat(getComputedStyle(box).paddingTop) * 0.75 + dh) + 'pt';
    });
    f.querySelectorAll('.fc .tcb').forEach(function (box) {
      if (box._lt || hidden(box)) return;
      box._lt = true;
      let p = box.lastElementChild;
      // lista no fim da caixa (aula 10, slide 64: último item com \dfrac): vale a última linha do último item
      while (p && p.matches('ol, ul') && p.lastElementChild) p = p.lastElementChild.querySelector(':scope > ol, :scope > ul') || p.lastElementChild;
      if (!p || (p.tagName !== 'P' && p.tagName !== 'LI')) return;
      const lines = p.querySelectorAll('.tl'), line = lines.length ? lines[lines.length - 1] : p;
      const fs = parseFloat(getComputedStyle(p).fontSize) * 0.75;
      const dd = (0.1944 - depthOf(line)) * fs;
      if (Math.abs(dd) < 0.05) return;
      const pb = parseFloat(getComputedStyle(box).paddingBottom) * 0.75;
      box.style.paddingBottom = (pb - dd) + 'pt';
    });
    // Frame centralizado (aula 8): o conteúdo termina na profundidade real da última linha, o que muda a
    // centralização (slides 5 e 17: última linha sem descendentes -> o PDF fica ~0.9 pt mais baixo)
    if (f._lld || f.classList.contains('t') || f.matches('.sec, .toc, .titlepage')) return;
    f._lld = true;   // só no passo 1 (o valor acumula)
    const fc = f.querySelector('.fc'); if (!fc) return;
    const kids = Array.prototype.filter.call(fc.children, function (c) { return c.offsetParent !== null && !c.classList.contains('anim'); });
    const last = kids[kids.length - 1];
    if (!last || !last.matches('p, ol, ul')) return;
    const lines = last.querySelectorAll('.tl');
    const line = lines.length ? lines[lines.length - 1] : last;
    const fs = parseFloat(getComputedStyle(line).fontSize) * 0.75;
    const dd = (0.1944 - depthOf(line)) * fs;
    if (Math.abs(dd) < 0.05) return;
    const mb = parseFloat(getComputedStyle(last).marginBottom) * 0.75;
    last.style.marginBottom = (mb - dd) + 'pt';
  }

  // Conteúdo maior que a área do frame: como o TeX, encolhe as colas verticais que têm
  // componente "minus" (topsep do center, itemsep das listas, espaços das fórmulas),
  // proporcionalmente, até o limite de cada uma.
  function shrinkToFit(f, k) {
    const fc = f.querySelector('.fc'); if (!fc) return;
    const kids = Array.prototype.filter.call(fc.children, function (c) { return c.offsetParent !== null; });
    if (!kids.length) return;
    // tolerância de 2pt: o TeX mede até a linha de base + profundidade, não até o fim da caixa de linha.
    // tcolorbox no fim (aula Lab3, slides 6 e 24): a borda da caixa é exata e o "after skip" (4.1pt TeX)
    // continua no fim da caixa vertical do frame -> conta 4.08pt e sem tolerância.
    const last = kids[kids.length - 1];
    // (aula 9) com o fim da área útil em y = 239 (css), a tcolorbox no fim fica limitada a 236.04 - 4.08: +2.96
    const extra = last.classList.contains('tcb') ? 4.08 + 2.96 : -2;
    const over = (last.getBoundingClientRect().bottom - fc.getBoundingClientRect().bottom) / k + extra;
    if (over <= 0.3) return;
    const glue = [];
    fc.querySelectorAll('.center').forEach(function (el) {
      glue.push([el, 'marginTop', 5]);
      // o topsep também vem depois do center (aula 7, slide 16: figura alta seguida de texto)
      // ...exceto quando vem uma tcolorbox: o espaço antes dela (before skip, sem "minus") prevalece e
      // não encolhe (aula Lab3, slides 24 e 26: figura alta + caixa, só o espaço de cima encolhe)
      const nx = el.nextElementSibling;
      if (nx && !nx.classList.contains('tcb')) glue.push([el, 'marginBottom', 5]);
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
    '10pt "LM Sans 12"', '10pt "LM Sans 9"', 'italic 10pt "LM Sans 9"', '10pt "LM Sans 8"',
    '10pt KaTeX_Main', 'bold 10pt KaTeX_Main', 'italic 10pt KaTeX_Main', 'italic 10pt KaTeX_Math',
    '10pt KaTeX_AMS', '10pt KaTeX_Size1', '10pt KaTeX_Size2', '10pt KaTeX_Size3', '10pt KaTeX_Size4',
    '10pt KaTeX_SansSerif', '10pt KaTeX_Caligraphic'];
  if (document.fonts && document.fonts.load) {
    // fontes com unicode-range (matemática sans, aula 8): load() precisa de um texto dentro do intervalo
    const RANGED = ['10pt MathSans', '10pt MathSansIt', '10pt MathSansBf'];
    Promise.all(FACES.map(function (f) { return document.fonts.load(f).catch(function () {}); })
      .concat(RANGED.map(function (f) { return document.fonts.load(f, 'a0').catch(function () {}); })))
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
