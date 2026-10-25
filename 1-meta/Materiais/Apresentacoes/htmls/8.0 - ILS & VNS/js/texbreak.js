/* Quebra de parágrafos com o algoritmo de Knuth–Plass (o mesmo do TeX).
 *
 * O navegador quebra linhas de forma gulosa e só estica espaços. Aqui medimos a largura
 * real de cada palavra (e de cada pedaço hifenizável) no navegador, escolhemos as quebras
 * minimizando os "demerits" do TeX e "congelamos" o resultado: cada linha vira um
 * <span class="tl"> sem quebra interna, com o espaçamento entre palavras exato da linha.
 *
 * Parâmetros do LaTeX padrão: \pretolerance=100, \tolerance=200, \linepenalty=10,
 * \hyphenpenalty=50, \adjdemerits=10000, \doublehyphendemerits=10000,
 * \finalhyphendemerits=0 (zerado pelo \raggedright do Beamer). Espaço do cmss10: 0.3333em, +0.1667em, -0.1111em.
 */
(function () {
  'use strict';

  const SHY = '­';
  const P = { pretol: 100, tol: 200, linepen: 10, hyphpen: 50, adj: 10000, dblhyph: 10000, finalhyph: 0 };
  // finalhyph = 0: o \raggedright do Beamer zera \finalhyphendemerits e o \justifying (ragged2e) não o restaura
  // (aula 7, slide 68: "resol-ver" na penúltima linha)

  // ---------- leitura do parágrafo como sequência de caixas e espaços ----------
  // Cada átomo é um caractere de texto ou uma fórmula KaTeX inteira.
  function atoms(el) {
    const out = [];
    (function walk(node) {
      for (let c = node.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) {
          const t = c.nodeValue;
          for (let i = 0; i < t.length; i++) out.push({ node: c, off: i, ch: t[i] });
        } else if (c.nodeType === 1) {
          if (c.classList.contains('katex')) out.push({ el: c, ch: 'K' });
          else if (c.matches('br')) out.push({ br: c });   // \\ : quebra forçada (\hfil\break)
          else if (c.matches('img,ol,ul,p,div,li')) out.push({ stop: true });
          else walk(c);
        }
      }
    })(el);
    return out;
  }
  const isSpace = function (ch) { return ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r'; };

  function posBefore(a) {
    return a.el ? { before: a.el } : { node: a.node, off: a.off };
  }
  function posAfter(a) {
    return a.el ? { after: a.el } : { node: a.node, off: a.off + 1 };
  }
  function setStart(rg, p) {
    if (p.before) rg.setStartBefore(p.before); else if (p.after) rg.setStartAfter(p.after); else rg.setStart(p.node, p.off);
  }
  function setEnd(rg, p) {
    if (p.before) rg.setEndBefore(p.before); else if (p.after) rg.setEndAfter(p.after); else rg.setEnd(p.node, p.off);
  }
  function rangeRect(a, b) {
    const rg = document.createRange(); setStart(rg, a); setEnd(rg, b);
    return rg.getBoundingClientRect();
  }

  // ---------- fator de espaço (\nonfrenchspacing) ----------
  // Depois de . ? ! o TeX usa um espaço maior (fator 3000: +0.111em, estica 3x, encolhe 1/3);
  // depois de : ; , os fatores são 2000, 1500 e 1250. Após letra maiúscula o fator fica 1000.
  // Cada espaço afetado é envolvido em <span class="sf" data-sf="...">.
  function markSpaceFactors(el) {
    if (el._sfDone) return; el._sfDone = true;
    const A = atoms(el);
    let sf = 1000; const marks = [];
    for (let i = 0; i < A.length; i++) {
      const a = A[i];
      if (a.stop) break;
      if (a.el || a.br) { sf = 1000; continue; }
      const c = a.ch;
      if (isSpace(c)) {
        if (i > 0 && !A[i - 1].stop && (A[i - 1].el || !isSpace(A[i - 1].ch)) && sf !== 1000 && sf !== 999) marks.push({ a: a, sf: sf });
        continue;
      }
      if (c === SHY || /[)\]”’"']/.test(c)) continue;
      if (/[A-ZÀ-ÖØ-Þ]/.test(c)) sf = 999;
      else if (c === '.' || c === '?' || c === '!') sf = sf < 1000 ? 1000 : 3000;
      else if (c === ':') sf = sf < 1000 ? 1000 : 2000;
      else if (c === ';') sf = sf < 1000 ? 1000 : 1500;
      else if (c === ',') sf = sf < 1000 ? 1000 : 1250;
      else sf = 1000;
    }
    for (let m = marks.length - 1; m >= 0; m--) {
      const a = marks[m].a;
      const t = a.node;
      const mid = a.off > 0 ? t.splitText(a.off) : t;
      mid.splitText(1);
      const sp = document.createElement('span');
      sp.className = 'sf'; sp.dataset.sf = marks[m].sf;
      mid.parentNode.insertBefore(sp, mid); sp.appendChild(mid);
    }
  }
  function sfOf(atom) {
    const p = atom.node && atom.node.parentElement;
    return p && p.classList.contains('sf') ? +p.dataset.sf : 1000;
  }

  // ---------- algoritmo de quebra ----------
  function fitness(r) {
    if (r < -0.5) return 3;          // tight
    if (r <= 0.5) return 2;          // decent
    if (r <= 1) return 1;            // loose
    return 0;                        // very loose
  }

  function breakLines(items, W, ragged, useHyph, tolerance) {
    // items: [{type:'box',w} | {type:'glue',w,st,sh} | {type:'pen',w,p,flag}]
    // pontos de quebra: glue (se precedido de caixa) ou penalidade de hífen; o fim é forçado
    const n = items.length;
    const bps = [];
    for (let i = 0; i < n; i++) {
      const it = items[i];
      if (it.type === 'glue' && i > 0 && items[i - 1].type === 'box') bps.push(i);
      else if (it.type === 'pen' && useHyph) bps.push(i);
    }
    bps.push(n); // fim do parágrafo
    // somas acumuladas
    const sw = [0], sst = [0], ssh = [0];
    for (let i = 0; i < n; i++) {
      const it = items[i];
      sw.push(sw[i] + (it.type === 'pen' ? 0 : it.w));
      // caixas com fórmula também têm cola elástica (espaços de \medmuskip/\thickmuskip, ver mathGlue)
      sst.push(sst[i] + (it.type === 'pen' ? 0 : it.st || 0));
      ssh.push(ssh[i] + (it.type === 'pen' ? 0 : it.sh || 0));
    }
    // início de linha após a quebra b: pula glues/penalidades
    function lineStart(b) {
      let s = b < n ? b + 1 : n;
      while (s < n && items[s].type !== 'box') s++;
      return s;
    }
    // estados: {pos (índice do item de quebra, -1 = início), fit, hyph, dem, prev}
    const start = { pos: -1, s: 0, fit: 2, hyph: false, dem: 0, prev: null, line: 0 };
    let active = [start];
    const all = [];
    for (let bi = 0; bi < bps.length; bi++) {
      const b = bps[bi];
      const last = b === n;
      const isPen = !last && items[b].type === 'pen';
      const best = {};
      const keep = [];
      for (let ai = 0; ai < active.length; ai++) {
        const a = active[ai];
        const s = a.s;
        if (s >= b) { keep.push(a); continue; }
        // largura natural de s até b (excluindo o glue da quebra), + hífen
        let w = sw[b] - sw[s], st = sst[b] - sst[s], sh = ssh[b] - ssh[s];
        if (isPen) w += items[b].w;
        let r, bad;
        const infStretch = ragged || last;
        if (w <= W) {
          if (infStretch) { r = 0; bad = 0; }
          else if (st > 0) { r = (W - w) / st; bad = Math.min(10000, Math.round(100 * r * r * r)); }
          else { r = Infinity; bad = 10000; }
        } else {
          r = sh > 0 ? -(w - W) / sh : -Infinity;
          // tolerância de ~0.1pt para o erro de medição das larguras no navegador
          if (r < -1 && r >= -1 - 0.12 / Math.max(sh, 1e-6)) r = -1;
          bad = r < -1 ? Infinity : Math.round(100 * (-r) * (-r) * (-r));
        }
        // badness do TeX é inteira (aula 8, slide 22: comprimir 6% dá 0.02 -> 0, empata com a outra quebra e
        // vale a mais tardia: "and" fica na 1ª linha)
        if (r < -1) continue;            // não cabe nem comprimindo: não mantém este ativo
        keep.push(a);
        if (bad > tolerance) continue;
        const fit = fitness(infStretch && w <= W ? 0 : r);
        const fitc = infStretch && w <= W ? 2 : fit;
        let d = Math.pow(P.linepen + bad, 2);
        if (isPen) d += P.hyphpen * P.hyphpen;
        if (isPen && a.hyph) d += P.dblhyph;
        if (last && a.hyph) d += P.finalhyph;
        if (Math.abs(fitc - a.fit) > 1) d += P.adj;
        const tot = a.dem + d;
        // empate: como no TeX (d <= mínimo), vale a quebra anterior mais tardia (linhas de cima mais cheias)
        if (!best[fitc] || tot <= best[fitc].dem) {
          best[fitc] = { pos: b, s: lineStart(b), fit: fitc, hyph: isPen, dem: tot, prev: a, r: r, line: a.line + 1 };
        }
      }
      active = keep;
      Object.keys(best).forEach(function (f) { active.push(best[f]); all.push(best[f]); });
      if (!active.length) return null;
    }
    // melhor nó que termina no fim
    let fin = null;
    all.forEach(function (nd) { if (nd.pos === n && (!fin || nd.dem < fin.dem)) fin = nd; });
    if (!fin) return null;
    const lines = [];
    for (let nd = fin; nd.prev; nd = nd.prev) lines.unshift({ from: nd.prev.s, to: nd.pos, r: nd.r, hyph: nd.hyph });
    return lines;
  }

  // ---------- cola das fórmulas inline ----------
  // No TeX os espaços da matemática inline participam da justificação da linha:
  // \medmuskip (operador binário: + −) = 4mu plus 2mu minus 4mu, \thickmuskip (relação: = ≤) = 5mu plus 5mu,
  // \thinmuskip é rígido; 1mu = 1/18 em. O KaTeX desenha esses espaços como .mspace com margin-right
  // 0.2222em / 0.2778em / 0.1667em. (Aula Lab3, slides 9 e 24: o PDF comprime "i + 1" para caber a linha.)
  const MU = { '0.2222': [2, 4], '0.2778': [5, 0] };   // [estica, encolhe] em mu
  function muKind(m) {
    const e = m.dataset.em !== undefined ? +m.dataset.em : parseFloat(m.style.marginRight);
    if (!(e > 0) || !/em$/.test(m.style.marginRight || 'em')) return null;
    m.dataset.em = e;
    return MU[e.toFixed(4)] || null;
  }
  function mathGlue(nodes, fs) {
    let st = 0, sh = 0;
    nodes.forEach(function (k) {
      k.querySelectorAll('.mspace').forEach(function (m) { const g = muKind(m); if (g) { st += g[0]; sh += g[1]; } });
    });
    return { st: st * fs / 18, sh: sh * fs / 18 };
  }
  function setMathGlue(sp, r, fs, just) {
    sp.querySelectorAll('.katex .mspace').forEach(function (m) {
      const g = muKind(m); if (!g) return;
      let d = 0;
      if (just) d = r >= 0 ? r * g[0] : r * g[1];
      else if (r < 0) d = r * g[1];
      if (Math.abs(d) > 0.0005) m.style.marginRight = (+m.dataset.em * fs + d * fs / 18).toFixed(3) + 'pt';
    });
  }

  // ---------- layout de um parágrafo ----------
  // Devolve true se o parágrafo foi congelado com as quebras do TeX.
  function layout(el, k) {
    if (el._texbreak) return true;
    const cs = getComputedStyle(el);
    const align = cs.textAlign;
    if (align !== 'justify' && align !== 'left' && align !== 'start') return false;
    const ragged = align !== 'justify';
    const fs = parseFloat(cs.fontSize) * 0.75; // pt
    const W = el.getBoundingClientRect().width / k - (parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)) * 0.75;

    markSpaceFactors(el);
    const fs0 = parseFloat(cs.fontSize) * 0.75;
    el.querySelectorAll('.sf').forEach(function (s) { s.style.wordSpacing = (+s.dataset.sf >= 2000 ? fs0 * 0.11111 : 0) + 'pt'; });
    const A = atoms(el);
    const stopAt = A.findIndex(function (a) { return a.stop; });
    const AT = stopAt >= 0 ? A.slice(0, stopAt) : A;
    if (stopAt >= 0 && A.slice(stopAt + 1).some(function (a) { return !a.stop && !isSpace(a.ch); })) {
      // conteúdo depois de um bloco aninhado (ex.: texto depois de sublista): não mexe
      if (AT.length === 0) return false;
    }
    // caixas = sequências de não-espaços
    const boxes = [];
    let cur = null, seg = 0;
    AT.forEach(function (a, i) {
      if (a.br) { cur = null; seg++; return; }
      if (!a.el && isSpace(a.ch)) { cur = null; return; }
      if (!cur) { cur = { first: i, last: i, shy: [], seg: seg }; boxes.push(cur); }
      cur.last = i;
      if (!a.el && a.ch === SHY) cur.shy.push(i);
    });
    if (boxes.length < 2) return false;

    // medição numa linha só, sem hifenização visível e sem espaçamento extra
    const saved = { ws: el.style.whiteSpace, wsp: el.style.wordSpacing, hy: el.style.hyphens, ta: el.style.textAlign };
    el.style.whiteSpace = 'nowrap'; el.style.wordSpacing = '0'; el.style.hyphens = 'manual'; el.style.textAlign = 'left';
    const items = [];
    let prevRight = null;
    const hyW = fs * 0.3333;
    const stretch = fs * 0.16667, shrink = fs * 0.11111;
    let prevLast = -1;
    const segStarts = [0];   // índice do 1º item de cada trecho entre quebras forçadas
    boxes.forEach(function (bx, bi) {
      const r = rangeRect(posBefore(AT[bx.first]), posAfter(AT[bx.last]));
      const left = r.left / k, right = r.right / k;
      if (bi > 0 && bx.seg !== boxes[bi - 1].seg) { segStarts.push(items.length); prevRight = null; }
      if (prevRight !== null) {
        let f = 1000;
        for (let q = prevLast + 1; q < bx.first; q++) { const v = sfOf(AT[q]); if (v !== 1000) { f = v; break; } }
        // a cola usa a fonte do caractere anterior: no negrito (cmssbx10) ela é 10% maior
        const pa = AT[prevLast], pe = pa.el || (pa.node && pa.node.parentElement);
        const bold = pe && parseInt(getComputedStyle(pe).fontWeight, 10) >= 600 ? 1.1 : 1;
        items.push({ type: 'glue', w: Math.max(0, left - prevRight), st: bold * stretch * f / 1000, sh: bold * shrink * 1000 / f, sf: f });
      }
      prevLast = bx.last;
      // pedaços entre hífens suaves
      let segStart = left;
      let startAtom = bx.first;
      bx.shy.forEach(function (si) {
        if (si - bx.first < 2 || bx.last - si < 3) return;
        const rr = rangeRect(posBefore(AT[startAtom]), posBefore(AT[si]));
        const segRight = rr.right / k;
        items.push({ type: 'box', w: segRight - segStart, a0: startAtom, a1: si - 1 });
        // hífen no negrito (cmssbx10) é 10% mais largo (aula 7, slide 37: "con-" em negrito)
        const hp = AT[si].node && AT[si].node.parentElement;
        const hb = hp && parseInt(getComputedStyle(hp).fontWeight, 10) >= 600 ? 1.1 : 1;
        items.push({ type: 'pen', w: hyW * hb, p: P.hyphpen, at: si });
        segStart = segRight; startAtom = si + 1;
      });
      const kx = [];
      for (let q = bx.first; q <= bx.last; q++) if (AT[q].el && AT[q].el.classList.contains('katex')) kx.push(AT[q].el);
      const mg = kx.length ? mathGlue(kx, fs) : { st: 0, sh: 0 };
      items.push({ type: 'box', w: right - segStart, a0: startAtom, a1: bx.last, st: mg.st, sh: mg.sh });
      prevRight = right;
    });
    el.style.whiteSpace = saved.ws; el.style.wordSpacing = saved.wsp; el.style.hyphens = saved.hy; el.style.textAlign = saved.ta;

    // TeX: 1ª passada sem hifenização; se não der, 2ª com hifenização
    // Com \\ (quebra forçada) cada trecho é otimizado à parte (a linha antes do \\ tem \hfil),
    // mas a passada vale para o parágrafo todo, como no TeX.
    function breakAll(useHyph, tol) {
      const res = [];
      for (let s = 0; s < segStarts.length; s++) {
        const a = segStarts[s], b = s + 1 < segStarts.length ? segStarts[s + 1] : items.length;
        const ls = breakLines(items.slice(a, b), W, ragged, useHyph, tol);
        if (!ls) return null;
        ls.forEach(function (L, j) {
          res.push({ from: L.from + a, to: L.to + a, r: L.r, hyph: L.hyph, forced: s + 1 < segStarts.length && j === ls.length - 1 });
        });
      }
      return res;
    }
    let lines = breakAll(false, P.pretol);
    if (!lines) lines = breakAll(true, P.tol);
    if (!lines) lines = breakAll(true, 1e9);
    if (!lines) return false;

    // ---------- congela as linhas ----------
    function firstAtom(from) { return items[from].a0; }
    function lastAtom(to) {
      // último átomo da linha: caixa imediatamente antes da quebra
      let j = to - 1;
      while (j >= 0 && items[j].type !== 'box') j--;
      return items[j].a1;
    }
    const spans = [];
    for (let li = lines.length - 1; li >= 0; li--) {
      const L = lines[li];
      const a0 = AT[firstAtom(L.from)];
      const endPos = L.hyph ? posBefore(AT[items[L.to].at]) : posAfter(AT[lastAtom(L.to)]);
      const rg = document.createRange();
      setStart(rg, posBefore(a0));
      setEnd(rg, endPos);
      // nó filho direto de el que contém o início (para não aninhar o span dentro de <b>, etc.)
      let top = rg.startContainer;
      while (top !== el && top.parentNode !== el) top = top.parentNode;
      // se a linha inteira está dentro de um mesmo elemento (cor, overlay...), o span vai dentro dele
      const inside = rg.commonAncestorContainer !== el;
      const frag = rg.extractContents();
      const sp = document.createElement('span');
      sp.className = 'tl';
      sp.appendChild(frag);
      if (L.hyph) sp.appendChild(document.createTextNode('-'));
      let wsp = 0;
      if (!ragged && li < lines.length - 1 && !L.forced) wsp = L.r >= 0 ? L.r * stretch : L.r * shrink;
      else if (L.r < 0) wsp = L.r * shrink;
      if (Math.abs(wsp) > 0.001) sp.style.wordSpacing = wsp.toFixed(3) + 'pt';
      const rr = L.r || 0, just = !ragged && li < lines.length - 1 && !L.forced;
      sp.querySelectorAll('.sf').forEach(function (s) {
        const f = +s.dataset.sf, extra = f >= 2000 ? fs * 0.11111 : 0;
        let add = 0;
        if (just) add = rr >= 0 ? rr * stretch * f / 1000 : rr * shrink * 1000 / f;
        else if (rr < 0) add = rr * shrink * 1000 / f;
        s.style.wordSpacing = (extra + add).toFixed(3) + 'pt';
      });
      setMathGlue(sp, rr, fs, just);
      if (inside || top === el || top.nodeType === 3) rg.insertNode(sp);
      else el.insertBefore(sp, top.nextSibling);
      if (li < lines.length - 1 && !L.forced) sp.after(document.createElement('br'));  // após \\ o <br> original já existe
      spans.unshift(sp);
    }
    // hífens suaves que sobraram entre as linhas não servem mais
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let t; while ((t = tw.nextNode())) if (t.nodeValue.indexOf(SHY) >= 0) t.nodeValue = t.nodeValue.split(SHY).join('');
    el.classList.add('tex-lines');
    el._texbreak = true;
    return true;
  }

  window.TeXBreak = { layout: layout };
})();
