/* Pseudocódigos executáveis (aula 10, slides 6 e 57), como o da busca local e o do SA na aula 7.
 *
 * Passo 1 = algoritmo como no PDF. No passo 2 o .algorithm encolhe (scale 0.6, origem no canto) e à direita
 * aparece um painel com a população: cada indivíduo é uma barra (altura = fitness, maior melhor). A cada → uma
 * linha é executada (classe alg-on) e o painel mostra o efeito. Na 1ª iteração, uma linha por passo; depois um
 * passo roda as iterações seguintes até o critério de parada (t = 3) e o último executa o return.
 *
 *   data-kind="pop"  (slide 6, template de algoritmo populacional)
 *      P = P0 (8 indivíduos) · t = 0 · while · P't = Gera-Pop(Pt): 8 novos, cada um a partir de um indivíduo
 *      de Pt · Pt+1 = Seleciona-Pop(Pt ∪ P't): os 8 piores dos 16 saem e os 8 melhores formam Pt+1 · t = t+1
 *   data-kind="ga"   (slide 57, template evolucionário)
 *      P0 = Gere-Pop(): 8 indivíduos ainda não avaliados (?) · Avaliar: o fitness aparece · Selecao: roleta,
 *      12 sorteios (contagem ×n em cada um) · Reproducao: 6 filhos, cada um de um par sorteado (ainda "?") ·
 *      Substituicao: os 2 melhores de Pt ficam, os 6 piores saem e os filhos ocupam as vagas · t = t+1.
 *      Os filhos só são avaliados no Avaliar da iteração seguinte; no return a população final é avaliada.
 *
 * A execução é pré-calculada (semente fixa): cada estado do slide é sempre o mesmo, indo ou voltando.
 * Uso: <section data-steps="9|11"> ... <span class="anim" data-anim="pseudoga" data-kind="pop|ga" data-state="p,s0,…,run,ret">
 * depois do .algorithm.
 */
(function () {
  'use strict';
  const A = window.Anim;
  if (!A) return;
  const S = A.svg, E = A.ease, lerp = A.lerp;
  const MAIN = 'KaTeX_Main, serif', MATH = 'KaTeX_Math, serif';
  const MYBLUE = '#0061a5', BAR = '#9cc3e6', HI = '#e0a000', RED = '#c0281a', GREEN = '#169b3a', GRAY = '#9a9a9a';
  const SC = 0.6, TMAX = 3;
  const VW = 150, VH = 152;                            // viewBox do painel
  const X0 = 16, SW = (VW - X0) / 8, BW = 10.5, YP = 70, YC = 132, BH = 40;
  const ACT = {
    pop: ['create', 't', 'while', 'gen', 'select', 't', 'end', 'ret'],
    ga: ['create', 't', 'while', 'eval', 'sel', 'repro', 'subst', 't', 'end', 'ret']
  };

  // ---------- simulação (pré-calculada) ----------
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const clampV = function (v) { return Math.max(3, Math.min(99, Math.round(v))); };
  function simulate(kind) {
    const rnd = mulberry(kind === 'ga' ? 11 : 5), ri = function (a, b) { return a + Math.floor(rnd() * (b - a + 1)); };
    const ind = {}; let uid = 0;
    const mk = function (v, known, from) { const o = { id: uid++, v: v, from: from || null }; ind[o.id] = o; o.known0 = known; return o.id; };
    const scenes = [];
    let P = [], C = [], t = 0, known = {}, sel = {}, chk = null, best = null;
    const push = function (line) {
      scenes.push({ line: line, P: P.slice(), C: C.slice(), t: t, known: Object.assign({}, known), sel: Object.assign({}, sel), chk: chk, best: best });
      chk = null;
    };
    const val = function (id) { return ind[id].v; };
    if (kind === 'pop') {
      for (let i = 0; i < 8; i++) { const id = mk(ri(12, 62), true); P.push(id); known[id] = 1; }
      push(0); push(1);
      for (;;) {
        chk = t < TMAX; push(2);
        if (!chk && t >= TMAX) break;
        C = [];
        for (let i = 0; i < 8; i++) { const p = P[ri(0, 7)]; const id = mk(clampV(val(p) + ri(-18, 22)), true, [p]); C.push(id); known[id] = 1; }
        push(3);
        const U = P.concat(C).sort(function (a, b) { return val(b) - val(a); });
        P = U.slice(0, 8); C = []; push(4);
        t++; push(5);
      }
      push(6);
      best = P.slice().sort(function (a, b) { return val(b) - val(a); })[0]; push(7);
    } else {
      for (let i = 0; i < 8; i++) P.push(mk(ri(10, 60), false));
      push(0); push(1);
      for (;;) {
        chk = t < TMAX; push(2);
        if (!chk && t >= TMAX) break;
        P.forEach(function (id) { known[id] = 1; }); push(3);
        // roleta: 12 sorteios (6 pares)
        const tot = P.reduce(function (a, id) { return a + val(id); }, 0), picks = [];
        for (let k = 0; k < 12; k++) {
          let r = rnd() * tot, j = 0;
          while (j < P.length - 1 && (r -= val(P[j])) > 0) j++;
          picks.push(P[j]); sel[P[j]] = (sel[P[j]] || 0) + 1;
        }
        sel.picks = picks; push(4);
        C = [];
        for (let k = 0; k < 6; k++) {
          const a = picks[2 * k], b = picks[2 * k + 1];
          C.push(mk(clampV((val(a) + val(b)) / 2 + ri(-6, 16)), false, [a, b]));
        }
        push(5);
        const elite = P.slice().sort(function (a, b) { return val(b) - val(a); }).slice(0, 2);
        P = elite.concat(C); C = []; sel = {}; push(6);
        t++; push(7);
      }
      push(8);
      P.forEach(function (id) { known[id] = 1; });
      best = P.slice().sort(function (a, b) { return val(b) - val(a); })[0]; push(9);
    }
    return { scenes: scenes, ind: ind };
  }

  A.define('pseudoga', function (host) {
    const kind = host.dataset.kind === 'ga' ? 'ga' : 'pop';
    const frame = host.closest('section'), fc = host.closest('.fc'), alg = frame.querySelector('.algorithm');
    const lines = Array.prototype.slice.call(alg.querySelectorAll('.alg-body > div'));
    alg.style.transformOrigin = '0 0';
    const SIM = simulate(kind), SCN = SIM.scenes, IND = SIM.ind;
    const nFirst = kind === 'pop' ? 6 : 8;              // estados s0…s(n−1): a 1ª iteração, linha a linha
    const idxRet = SCN.length - 1, idxEnd = SCN.length - 2;
    const sceneOf = function (st) { if (st === 'ret') return idxRet; if (st === 'run') return idxEnd; const m = /^s(\d+)$/.exec(st); return m ? +m[1] : -1; };
    host.style.cssText = 'position:absolute;display:none;line-height:0';
    const svg = S('svg', { viewBox: '0 0 ' + VW + ' ' + VH, preserveAspectRatio: 'xMinYMin meet', role: 'img', 'aria-label': 'Execução do pseudocódigo numa população' }, host);
    let L = {};

    function layout() {
      let x = 0, y = 0, e = alg;
      while (e && e !== fc) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
      const left = x + alg.offsetWidth * SC + 12, top = y + 2;
      const w = fc.clientWidth - left, h = fc.clientHeight - top;
      host.style.left = left + 'px'; host.style.top = top + 'px';
      svg.style.width = w + 'px'; svg.style.height = h + 'px';
    }
    function hl(i) { lines.forEach(function (l, k) { l.classList.toggle('alg-on', k === i); }); }
    function text(parent, x, y, s, o) {
      o = o || {};
      const t = S('text', { x: x, y: y, 'font-size': o.fs || 6, 'font-family': o.math ? MATH : MAIN, fill: o.c || '#222' }, parent);
      if (o.math) t.setAttribute('font-style', 'italic');
      if (o.anchor) t.setAttribute('text-anchor', o.anchor);
      if (o.bold) t.setAttribute('font-weight', 'bold');
      if (s != null) t.textContent = s;
      return t;
    }
    // rótulo Pt / P't com subscrito
    function rowLabel(y, prime) {
      const t = text(L.root, 0, y, null, { fs: 7.5, math: true });
      S('tspan', {}, t).textContent = 'P';
      if (prime) S('tspan', { 'font-family': MAIN, 'font-style': 'normal' }, t).textContent = '′';
      S('tspan', { 'font-size': 5, dy: 2 }, t).textContent = 't';
    }
    const barH = function (id, kn) { return kn ? Math.max(2, BH * IND[id].v / 100) : 12; };
    const slotX = function (i) { return X0 + i * SW + (SW - BW) / 2; };
    function posOf(sc, id) {
      let i = sc.P.indexOf(id); if (i >= 0) return [slotX(i), YP];
      i = sc.C.indexOf(id); if (i >= 0) return [slotX(i), YC];
      return null;
    }
    // um indivíduo: barra + valor (ou "?")
    function indEl(id, kn) {
      const g = S('g', {}, L.inds);
      g._r = S('rect', { x: 0, width: BW, rx: 0.8 }, g);
      g._t = text(g, BW / 2, 0, '', { fs: 5.4, anchor: 'middle' });
      setBar(g, id, kn ? 1 : 0, kn ? IND[id].v : null);
      L.el[id] = g;
      return g;
    }
    function setBar(g, id, k, shown) {                 // k: 0 = não avaliado, 1 = avaliado (pode interpolar)
      const h = lerp(12, Math.max(2, BH * IND[id].v / 100), k);
      g._r.setAttribute('y', -h); g._r.setAttribute('height', h);
      g._r.setAttribute('fill', k >= 1 ? BAR : k <= 0 ? '#eee' : A.mix('#eeeeee', BAR, k));
      g._r.setAttribute('stroke', k >= 0.5 ? MYBLUE : GRAY); g._r.setAttribute('stroke-width', 0.45);
      g._r.setAttribute('stroke-dasharray', k <= 0 ? '1 0.8' : '');
      g._t.setAttribute('y', -h - 1.6);
      g._t.textContent = shown == null ? '?' : String(Math.round(shown));
      g._t.setAttribute('fill', shown == null ? GRAY : '#222');
    }
    const place = function (g, p, s) { g.setAttribute('transform', 'translate(' + p[0].toFixed(2) + ' ' + p[1].toFixed(2) + ')' + (s && s !== 1 ? ' translate(' + BW / 2 + ' 0) scale(' + Math.max(0.001, s) + ') translate(' + (-BW / 2) + ' 0)' : '')); };

    function draw(sc) {
      svg.textContent = ''; L = { el: {} };
      L.root = S('g', {}, svg);
      // cabeçalho: t, critério de parada, melhor
      L.tT = text(L.root, 0, 8, '', { fs: 8, math: true });
      L.crit = text(L.root, VW, 8, 'pare quando t = ' + TMAX, { fs: 5.6, anchor: 'end', c: '#555' });
      L.chk = S('g', {}, L.root);
      L.bestT = text(L.root, 0, 19, '', { fs: 5.8, c: '#444' });
      rowLabel(YP - 12, false); rowLabel(YC - 12, true);
      S('path', { d: 'M' + X0 + ' ' + YP + 'H' + VW, stroke: '#000', 'stroke-width': 0.35 }, L.root);
      S('path', { d: 'M' + X0 + ' ' + YC + 'H' + VW, stroke: '#000', 'stroke-width': 0.35 }, L.root);
      if (kind === 'ga') text(L.root, VW, VH - 2, '? = ainda não avaliado', { fs: 5, anchor: 'end', c: GRAY });
      L.fx = S('g', {}, L.root);
      L.inds = S('g', {}, L.root);
      L.badges = S('g', {}, L.root);
      L.top = S('g', {}, L.root);
      if (!sc) return;
      setT(sc.t);
      sc.P.concat(sc.C).forEach(function (id) { place(indEl(id, !!sc.known[id]), posOf(sc, id)); });
      Object.keys(sc.sel).forEach(function (id) { if (id !== 'picks') badge(+id, sc.sel[id], sc); });
      setBest(sc);
      if (sc.chk != null) mark(sc.chk);
      if (sc.best != null) bestRing(sc.best, sc, 1);
    }
    function setT(t) { L.tT.textContent = ''; S('tspan', {}, L.tT).textContent = 't'; S('tspan', { 'font-family': MAIN, 'font-style': 'normal' }, L.tT).textContent = ' = ' + t; }
    function setBest(sc) {
      const ks = sc.P.filter(function (id) { return sc.known[id]; });
      L.bestT.textContent = ks.length ? 'melhor: ' + Math.max.apply(null, ks.map(function (id) { return IND[id].v; })) : '';
    }
    function badge(id, n, sc) {
      const p = posOf(sc, id); if (!p) return null;
      const old = L.badges.querySelector('[data-id="' + id + '"]'); if (old) old.remove();
      const t = text(L.badges, p[0] + BW / 2, YP + 6.5, '×' + n, { fs: 5.4, anchor: 'middle', c: '#b36b00', bold: true });
      t.setAttribute('data-id', id);
      return t;
    }
    function mark(ok) {
      L.chk.textContent = '';
      const x = VW - 60, y = 5.5;
      if (ok) return S('path', { d: 'M' + (x - 2.4) + ' ' + y + 'l1.6 1.8l3.2-4', fill: 'none', stroke: GREEN, 'stroke-width': 0.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, L.chk);
      return S('path', { d: 'M' + (x - 2.2) + ' ' + (y - 2.2) + 'l4.4 4.4M' + (x + 2.2) + ' ' + (y - 2.2) + 'l-4.4 4.4', stroke: RED, 'stroke-width': 0.9, 'stroke-linecap': 'round' }, L.chk);
    }
    function bestRing(id, sc, o) {
      const p = posOf(sc, id), h = barH(id, true);
      const r = S('rect', { x: p[0] - 1.6, y: p[1] - h - 9, width: BW + 3.2, height: h + 10.6, rx: 1.5, fill: 'none', stroke: HI, 'stroke-width': 0.9, opacity: o }, L.top);
      return r;
    }
    function cross(p, h) {
      const cx = p[0] + BW / 2, cy = p[1] - h / 2, d = 4;
      return S('path', { d: 'M' + (cx - d) + ' ' + (cy - d) + 'L' + (cx + d) + ' ' + (cy + d) + 'M' + (cx + d) + ' ' + (cy - d) + 'L' + (cx - d) + ' ' + (cy + d), stroke: RED, 'stroke-width': 1.1, 'stroke-linecap': 'round', fill: 'none' }, L.top);
    }
    function ring(h, p, hh, color, dur) {
      const r = S('rect', { x: p[0] - 1.4, y: p[1] - hh - 8.5, width: BW + 2.8, height: hh + 10, rx: 1.5, fill: 'none', stroke: color || HI, 'stroke-width': 0.8, opacity: 0 }, L.top);
      return h.tween(dur || 400, function (e) { r.setAttribute('opacity', Math.sin(Math.PI * e)); }, E.linear).then(function () { r.remove(); });
    }
    function link(a, b, ha) {                          // linha do pai (topo da barra em Pt) ao filho (em P't)
      return S('path', { d: 'M' + (a[0] + BW / 2) + ' ' + (a[1] + 1) + 'C' + (a[0] + BW / 2) + ' ' + (a[1] + 22) + ' ' + (b[0] + BW / 2) + ' ' + (b[1] - 46) + ' ' + (b[0] + BW / 2) + ' ' + (b[1] - 15), fill: 'none', stroke: '#b36b00', 'stroke-width': 0.5, opacity: 0.9 }, L.fx);
    }

    // ---------- transições ----------
    async function trans(h, a, b, fast) {
      const sa = SCN[a], sb = SCN[b], act = ACT[kind][sb.line], sp = fast ? 0.45 : 1;
      const D = function (ms) { return Math.max(60, ms * sp); };
      hl(sb.line);
      if (act === 'create') {
        draw(Object.assign({}, sb, { P: [], C: [] })); setT('');
        L.tT.textContent = '';
        for (let i = 0; i < sb.P.length; i++) {
          const id = sb.P[i], g = indEl(id, !!sb.known[id]), p = posOf(sb, id);
          await h.tween(D(170), function (e) { place(g, p, E.back(e)); }, E.linear);
          place(g, p);
        }
        setBest(sb);
        return;
      }
      draw(sa);
      if (act === 't') {
        setT(sb.t);
        await h.tween(D(450), function (e) { L.tT.setAttribute('transform', 'translate(0 8) scale(' + (1 + 0.35 * Math.sin(Math.PI * e)) + ') translate(0 -8)'); }, E.linear);
        L.tT.removeAttribute('transform');
        return;
      }
      if (act === 'while') {
        await h.tween(D(300), function (e) { L.crit.setAttribute('fill', A.mix('#555555', sb.chk ? GREEN : RED, Math.sin(Math.PI * Math.min(1, e * 1.5)))); });
        const m = mark(sb.chk); m.setAttribute('opacity', 0);
        await h.tween(D(300), function (e) { m.setAttribute('opacity', e); });
        L.crit.setAttribute('fill', '#555');
        return;
      }
      if (act === 'end') { await h.wait(D(250)); return; }
      if (act === 'eval') {
        const ids = sb.P.filter(function (id) { return !sa.known[id]; });
        for (const id of ids) {
          const g = L.el[id];
          await h.tween(D(260), function (e) { setBar(g, id, e, IND[id].v * e); });
          setBar(g, id, 1, IND[id].v);
        }
        setBest(sb);
        return;
      }
      if (act === 'sel') {                            // roleta: cada sorteio acende o indivíduo e soma na contagem
        const cnt = {};
        for (const id of sb.sel.picks) {
          cnt[id] = (cnt[id] || 0) + 1;
          const p = posOf(sa, id);
          await ring(h, p, barH(id, true), HI, D(260));
          const bt = badge(id, cnt[id], sa);
          await h.tween(D(120), function (e) { bt.setAttribute('opacity', e); });
        }
        return;
      }
      if (act === 'repro' || act === 'gen') {        // cada filho aparece em P't, ligado ao(s) pai(s)
        for (let i = 0; i < sb.C.length; i++) {
          const id = sb.C[i], par = IND[id].from, p = posOf(sb, id);
          const ls = par.map(function (q) { return link(posOf(sa, q), p, barH(q, true)); });
          ls.forEach(function (l) { l.setAttribute('opacity', 0); });
          await h.all(par.map(function (q) { return ring(h, posOf(sa, q), barH(q, true), HI, D(320)); }).concat([h.tween(D(320), function (e) { ls.forEach(function (l) { l.setAttribute('opacity', e); }); })]));
          const g = indEl(id, !!sb.known[id]);
          await h.tween(D(200), function (e) { place(g, p, E.back(e)); }, E.linear);
          place(g, p);
          await h.tween(D(150), function (e) { ls.forEach(function (l) { l.setAttribute('opacity', 1 - e); }); });
          ls.forEach(function (l) { l.remove(); });
        }
        return;
      }
      if (act === 'select' || act === 'subst') {     // os que não ficam recebem um ✗ e saem; os outros vão para Pt+1
        L.badges.textContent = '';
        const all = sa.P.concat(sa.C), dead = all.filter(function (id) { return sb.P.indexOf(id) < 0; });
        const xs = dead.map(function (id) { return cross(posOf(sa, id), barH(id, !!sa.known[id])); });
        xs.forEach(function (x) { x.setAttribute('opacity', 0); });
        await h.tween(D(450), function (e) { xs.forEach(function (x) { x.setAttribute('opacity', e); }); });
        await h.wait(D(250));
        await h.tween(D(400), function (e) {
          dead.forEach(function (id) { L.el[id].setAttribute('opacity', 1 - e); });
          xs.forEach(function (x) { x.setAttribute('opacity', 1 - e); });
        });
        const mv = sb.P.map(function (id) { return [id, posOf(sa, id), posOf(sb, id)]; });
        await h.tween(D(650), function (e) {
          mv.forEach(function (m) { const g = L.el[m[0]]; place(g, [lerp(m[1][0], m[2][0], e), lerp(m[1][1], m[2][1], e)]); });
        });
        setBest(sb);
        return;
      }
      if (act === 'ret') {
        const ids = sb.P.filter(function (id) { return !sa.known[id]; });
        if (ids.length) {
          await h.tween(D(450), function (e) { ids.forEach(function (id) { setBar(L.el[id], id, e, IND[id].v * e); }); });
          ids.forEach(function (id) { setBar(L.el[id], id, 1, IND[id].v); });
          setBest(sb);
        }
        const r = bestRing(sb.best, sb, 0), g = L.el[sb.best], p = posOf(sb, sb.best);
        await h.tween(D(700), function (e) { r.setAttribute('opacity', Math.min(1, e * 2)); place(g, p, 1 + 0.25 * Math.sin(Math.PI * e)); }, E.linear);
        place(g, p);
      }
    }

    // ---------- estados ----------
    let scaled = false;
    function setScaled(on) { alg.style.transform = on ? 'scale(' + SC + ')' : ''; scaled = on; }
    function snap(st) {
      if (st === 'p') { setScaled(false); host.style.display = 'none'; hl(-1); return; }
      setScaled(true); host.style.display = ''; layout();
      const i = sceneOf(st);
      draw(SCN[i]); hl(SCN[i].line);
      svg.style.opacity = '';
    }
    async function play(a, b, h) {
      const ia = sceneOf(a), ib = sceneOf(b);
      if (a === 'p' && b === 's0') {
        hl(-1); host.style.display = 'none';
        await h.tween(500, function (e) { alg.style.transform = 'scale(' + lerp(1, SC, e) + ')'; });
        setScaled(true); host.style.display = ''; layout();
        draw(null); svg.style.opacity = 0;
        await h.tween(250, function (e) { svg.style.opacity = e; });
        svg.style.opacity = '';
        await trans(h, -1, 0);
        return;
      }
      if (ia < 0 || ib < 0 || ib < ia) { snap(b); return; }
      setScaled(true); host.style.display = ''; layout();
      if (b === 'run') {                              // as iterações seguintes, mais rápidas, até o end while
        for (let k = ia; k < ib; k++) await trans(h, k, k + 1, true);
        return;
      }
      if (ib === ia + 1) { await trans(h, ia, ib); return; }
      snap(b);
    }
    return { snap: snap, play: play };
  });
})();
