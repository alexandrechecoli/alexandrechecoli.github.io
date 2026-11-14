/* Problema de designação (aula 2, frames 68–70): figuras alocacao1…3 do Ipe.
 *
 * Uso: <span class="anim al" data-anim="designacao" data-from=".." data-state=".."><img … alocacaoN.svg></span>
 * A <img> do PDF fica visível; o SVG por cima (mesmo quadro: 240.8 × 244.8, ou 241.77 no alocacao3) desenha os
 * efeitos. Quando os soldados precisam se mexer, a <img> some e o SVG mostra img/alocacao1.svg (grade, números e os
 * soldados da coluna da esquerda) + os soldados designados (img/soldado.png, extraído do PDF) + os círculos.
 *
 * Estados:
 *   a1   (de vazio) frame 68: cada soldado varre a sua linha (consegue executar as 4 tarefas)
 *   a2   frame 69: uma cópia de cada soldado voa até a tarefa designada (o número da célula pulsa)
 *   a3   frame 70, passo 1: os círculos vermelhos aparecem um a um e a soma se monta: 2 + 4 + 3 + 3 = 12
 *   opt  frame 70, passo 2 (data-steps="2"): busca local por trocas — a melhor troca (soldados 1 e 4) leva a 19;
 *        nenhuma troca de dois soldados melhora 19 (ótimo local); a melhor das 4! = 24 designações soma 20 (três
 *        soldados mudam juntos). Interativo: clicar em dois soldados troca as tarefas deles; botões.
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease, lerp = Anim.lerp;
  const A = [[3, 2, 3, 7], [4, 3, 3, 5], [1, 7, 3, 3], [3, 5, 1, 3]];   // aptidão[soldado][tarefa]
  const SLIDE = [1, 0, 2, 3], OPT = [3, 2, 1, 0];
  const H = 244.802, SOLD = 'img/soldado.png', BASE1 = 'img/alocacao1.svg', BASE2 = 'img/alocacao2.svg';
  const RED = '#b6321d', CIRC = '#8b0000', MYBLUE = '#0061a5', GREEN = '#1a7f37', GRAY = '#666666';
  const FONT = '"LM Sans 8", "LM Sans", sans-serif';
  const perm = OPT.slice();   // designação mostrada no passo 2 (guardada entre visitas)
  const sum = function (p) { return p.reduce(function (s, t, i) { return s + A[i][t]; }, 0); };
  const BEST = (function () {
    let b = 0;
    (function rec(p, used) {
      if (p.length === 4) { b = Math.max(b, sum(p)); return; }
      for (let t = 0; t < 4; t++) if (!used[t]) { used[t] = 1; p.push(t); rec(p, used); p.pop(); used[t] = 0; }
    })([], []);
    return b;
  })();
  // geometria do Ipe: célula do soldado i na tarefa t; ícone de 40.96; número no canto; círculo do alocacao3
  const cellX = function (t) { return 48.4 + 48 * t; }, cellY = function (i) { return 48.4 + 48 * i; };
  const icon = function (i, t) { return [t < 0 ? 3.92 : 51.92 + 48 * t, 51.92 + 48 * i]; };   // t = −1: coluna da esquerda
  const circ = function (i, t) { return [91.45 + 48 * t, 57.33 + 48 * i]; };
  // pré-carrega as imagens (troca sem piscar)
  [SOLD, BASE1, BASE2].forEach(function (u) { const im = new Image(); im.src = u; });

  Anim.define('designacao', function (host) {
    const img = host.querySelector('img');
    const W = /alocacao3/.test(img.getAttribute('src')) ? 241.77 : 240.8;
    const svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H });
    host.appendChild(svg);
    const gBase = S('g', null, svg), gFx = S('g', null, svg), gSol = S('g', { 'data-interactive': '' }, svg), gTop = S('g', null, svg);
    const gPan = S('g', { 'data-interactive': '' }, svg);
    let cur = null, gen = 0, playing = false, pick = null;

    function empty(g) { while (g.firstChild) g.removeChild(g.firstChild); }
    function base(href) {   // figura de fundo dentro do SVG (a <img> some)
      empty(gBase);
      if (!href) { img.style.visibility = ''; return; }
      S('image', { href: href, x: 0, y: 0, width: 240.8, height: H }, gBase);
      img.style.visibility = 'hidden';
    }
    function text(x, y, s, size, color, o, parent) {
      const t = S('text', Object.assign({ x: x, y: y, 'font-size': size, fill: color, 'font-family': FONT }, o || {}), parent || gPan);
      t.textContent = s;
      return t;
    }
    function soldier(i, t, parent) {
      const p = icon(i, t);
      const g = S('g', { class: 'al-sol' }, parent || gSol);
      S('image', { href: SOLD, x: 0, y: 0, width: 40.96, height: 40.96 }, g);
      g.setAttribute('transform', 'translate(' + p[0] + ' ' + p[1] + ')');
      g._i = i;
      return g;
    }
    function ring(i, t, parent) {
      const c = circ(i, t);
      return S('circle', { cx: c[0], cy: c[1], r: 5.66, fill: 'none', stroke: CIRC, 'stroke-width': 0.8 }, parent || gTop);
    }
    function popEl(h, el, dur, cx, cy) {
      if (cx === undefined) { const b = el.getBBox(); cx = b.x + b.width / 2; cy = b.y + b.height / 2; }
      const bt = el.getAttribute('transform') || '';
      el.setAttribute('opacity', 0);
      return h.tween(dur || 380, function (e, t) {
        el.setAttribute('opacity', Math.min(1, t * 2.5));
        el.setAttribute('transform', 'translate(' + cx + ' ' + cy + ') scale(' + Math.max(0, e) + ') translate(' + (-cx) + ' ' + (-cy) + ') ' + bt);
      }, ease.back).then(function () { el.setAttribute('transform', bt); el.removeAttribute('opacity'); });
    }
    function pulseAt(h, x, y, color) {
      const c = S('circle', { cx: x, cy: y, r: 3, fill: 'none', stroke: color || MYBLUE, 'stroke-width': 1.2 }, gFx);
      return h.tween(600, function (e) { c.setAttribute('r', lerp(3, 16, e)); c.setAttribute('opacity', 1 - e); }, ease.out)
        .then(function () { c.remove(); }, function (x) { c.remove(); throw x; });
    }

    // ---------- painel à direita da figura ----------
    const PX = W + 20;
    function panel(st) {
      empty(gPan);
      const p = st === 'opt' ? perm : SLIDE, s = sum(p);
      const o = {};
      text(PX, 70, 'soma das aptidões', 13, GRAY);
      o.expr = text(PX, 93, '', 17, '#222');
      setExpr(o.expr, p, 4);
      if (st === 'opt') {
        o.msg = text(PX, 114, '', 12.5, GRAY);
        o.msg2 = text(PX, 129, '', 12.5, GRAY);
        setMsg(o, statusOf(p));
        o.btns = buttons();
        text(PX, 222, 'clique em dois soldados', 10, '#888');
        text(PX, 234, 'para trocar as tarefas', 10, '#888');
      }
      return o;
    }
    function setExpr(el, p, upto) {   // upto: quantos termos mostrar
      while (el.firstChild) el.removeChild(el.firstChild);
      const terms = p.slice(0, upto).map(function (t, i) { return A[i][t]; });
      const ts = S('tspan', null, el); ts.textContent = terms.join(' + ');
      if (upto === 4) {
        const eq = S('tspan', { 'font-weight': 700, fill: sum(p) === BEST ? GREEN : MYBLUE }, el);
        eq.textContent = ' = ' + sum(p);
      }
    }
    function statusOf(p) {
      const s = sum(p);
      if (s === BEST) return ['✓ a melhor das 4! = 24', 'designações', GREEN];
      if (!bestSwap(p)) return ['nenhuma troca de dois', 'soldados melhora: ótimo local', RED];
      return ['dá para melhorar', 'trocando tarefas', GRAY];
    }
    function setMsg(o, m) { o.msg.textContent = m[0]; o.msg2.textContent = m[1]; o.msg.setAttribute('fill', m[2]); o.msg2.setAttribute('fill', m[2]); }
    function bestSwap(p) {   // melhor troca de tarefas entre dois soldados (ou null)
      let b = null, bs = sum(p);
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
        const q = p.slice(); q[i] = p[j]; q[j] = p[i];
        if (sum(q) > bs) { bs = sum(q); b = [i, j]; }
      }
      return b;
    }
    function buttons() {
      const list = [['designação do slide', 'slide'], ['melhor troca', 'troca'], ['ótimo', 'otimo']];
      list.forEach(function (b, k) {
        const g = S('g', { class: 'al-btn' }, gPan);
        S('rect', { x: PX, y: 146 + k * 21, width: 108, height: 17, rx: 2.5, fill: '#fff', stroke: '#b7cde0', 'stroke-width': 0.9 }, g);
        text(PX + 54, 158.5 + k * 21, b[0], 11, MYBLUE, { 'text-anchor': 'middle' }, g);
        g.addEventListener('click', function (ev) { ev.stopPropagation(); if (!playing && cur === 'opt') action(b[1]); });
      });
    }

    // ---------- desenho do passo 2 ----------
    let sols = [];
    function drawOpt() {
      base(BASE1);
      empty(gSol); empty(gTop); empty(gFx);
      sols = perm.map(function (t, i) { return soldier(i, t); });
      sols.forEach(function (g) { g.addEventListener('click', onSoldier); });
      perm.forEach(function (t, i) { ring(i, t); });
    }
    function snap(st) {
      gen++; cur = st; pick = null;
      empty(gFx); empty(gSol); empty(gTop); empty(gPan);
      if (st === 'opt') { drawOpt(); panel('opt'); }
      else { base(null); if (st === 'a3') panel('a3'); }
    }

    // move os soldados para a designação q (trocas animadas em arco)
    async function moveTo(h, q, dur) {
      const from = perm.slice();
      const movers = [];
      for (let i = 0; i < 4; i++) if (from[i] !== q[i]) movers.push(i);
      gTop.querySelectorAll('circle').forEach(function (c) { c.setAttribute('opacity', 0.25); });
      await h.tween(dur || 900, function (e) {
        movers.forEach(function (i) {
          const a = icon(i, from[i]), b = icon(i, q[i]);
          const x = lerp(a[0], b[0], e), y = lerp(a[1], b[1], e) - Math.sin(Math.PI * e) * 14;
          sols[i].setAttribute('transform', 'translate(' + x + ' ' + y + ')');
        });
      }, ease.inOut);
      for (let i = 0; i < 4; i++) perm[i] = q[i];
      empty(gTop); perm.forEach(function (t, i) { ring(i, t); });
      await h.all(movers.map(function (i) { const c = circ(i, perm[i]); return pulseAt(h, c[0], c[1], CIRC); }));
    }
    function refreshPanel(m) {
      const ts = gPan.querySelectorAll('text'), o = { expr: ts[1], msg: ts[2], msg2: ts[3] };
      setExpr(o.expr, perm, 4);
      setMsg(o, m || statusOf(perm));
    }

    // execução própria (botões e cliques), cancelada por qualquer snap
    function local(script) {
      const g0 = ++gen, X = {};
      const h = {
        tween: function (dur, fn, ez) {
          ez = ez || ease.inOut;
          return new Promise(function (res, rej) {
            const t0 = performance.now();
            (function fr(now) {
              if (g0 !== gen) { rej(X); return; }
              const t = Math.min(1, (now - t0) / dur); fn(ez(t), t);
              if (t < 1) requestAnimationFrame(fr); else res();
            })(t0);
          });
        },
        wait: function (ms) { return new Promise(function (res, rej) { setTimeout(function () { if (g0 !== gen) rej(X); else res(); }, ms); }); },
        all: function (l) { return Promise.all(l); }
      };
      playing = true;
      script(h).catch(function (e) { if (e !== X) console.error(e); }).then(function () { playing = false; });
    }
    function action(a) {
      local(async function (h) {
        if (a === 'slide') { await moveTo(h, SLIDE); refreshPanel(); }
        else if (a === 'otimo') { await moveTo(h, OPT); refreshPanel(); }
        else if (a === 'troca') {
          const b = bestSwap(perm);
          if (!b) { refreshPanel(); return; }
          const q = perm.slice(); q[b[0]] = perm[b[1]]; q[b[1]] = perm[b[0]];
          refreshPanel(['troca soldados ' + (b[0] + 1) + ' e ' + (b[1] + 1), sum(perm) + ' → ' + sum(q), MYBLUE]);
          await moveTo(h, q); await h.wait(500); refreshPanel();
        }
      });
    }
    function onSoldier(ev) {
      ev.stopPropagation();
      if (playing || cur !== 'opt') return;
      const i = ev.currentTarget._i;
      if (pick === null) {
        pick = i;
        const p = icon(i, perm[i]);
        S('rect', { x: p[0] - 2, y: p[1] - 2, width: 45, height: 45, rx: 3, fill: 'none', stroke: MYBLUE, 'stroke-width': 1.5, class: 'al-pick' }, gFx);
        return;
      }
      empty(gFx);
      const j = pick; pick = null;
      if (j === i) return;
      const q = perm.slice(); q[i] = perm[j]; q[j] = perm[i];
      local(async function (h) { await moveTo(h, q, 700); refreshPanel(); });
    }

    // ---------- transições ----------
    async function play(a, b, h) {
      playing = true;
      try {
        if (b === 'a1') {   // cada soldado varre a sua linha
          for (let i = 0; i < 4; i++) {
            const band = S('rect', { x: 48.4, y: cellY(i) + 0.4, width: 0, height: 47.2, fill: MYBLUE, 'fill-opacity': 0.13 }, gFx);
            await h.all([pulseAt(h, 24.4, cellY(i) + 24, MYBLUE), h.tween(520, function (e) { band.setAttribute('width', 192 * e); }, ease.inOut)]);
            h.tween(500, function (e) { band.setAttribute('fill-opacity', 0.13 * (1 - e)); }).then(function () { band.remove(); }, function () {});
          }
          await h.wait(450);
        }
        if (b === 'a2') {   // os soldados vão às tarefas
          base(BASE1);
          for (let i = 0; i < 4; i++) {
            const g = soldier(i, -1), a0 = icon(i, -1), a1 = icon(i, SLIDE[i]);
            await h.tween(650, function (e) {
              g.setAttribute('transform', 'translate(' + lerp(a0[0], a1[0], e) + ' ' + (lerp(a0[1], a1[1], e) - Math.sin(Math.PI * e) * 16) + ')');
            }, ease.inOut);
            const c = circ(i, SLIDE[i]);
            pulseAt(h, c[0], c[1], MYBLUE).catch(function () {});
            await h.wait(120);
          }
          await h.wait(400);
        }
        if (b === 'a3' || (b === 'opt' && a !== 'a3')) {   // círculos e soma
          base(BASE2);
          const o = panel('a3');
          setExpr(o.expr, SLIDE, 0);
          for (let i = 0; i < 4; i++) {
            const c = circ(i, SLIDE[i]), r = ring(i, SLIDE[i]);
            await h.all([popEl(h, r, 380, c[0], c[1]), h.wait(250)]);
            setExpr(o.expr, SLIDE, i + 1);
            await h.wait(200);
          }
          if (b === 'a3') await h.wait(300);
          else { await h.wait(700); snap('a3'); }
        }
        if (b === 'opt') {   // passo 2: busca local por trocas
          for (let i = 0; i < 4; i++) perm[i] = SLIDE[i];
          empty(gPan); drawOpt(); panel('opt');
          refreshPanel(['trocar as tarefas de dois', 'soldados melhora a soma?', GRAY]);
          await h.wait(1300);
          const q = perm.slice(); q[0] = perm[3]; q[3] = perm[0];   // melhor troca: soldados 1 e 4 (12 → 19)
          refreshPanel(['melhor troca: soldados 1 e 4', '12 → 19', MYBLUE]);
          await moveTo(h, q, 1000);
          refreshPanel();
          await h.wait(2000);
          refreshPanel(['…mas a melhor das 24', 'designações soma ' + BEST, MYBLUE]);
          await h.wait(1300);
          await moveTo(h, OPT, 1100);
          refreshPanel();
          await h.wait(300);
        }
      } finally { playing = false; }
    }

    return { snap: snap, play: play };
  });
})();
