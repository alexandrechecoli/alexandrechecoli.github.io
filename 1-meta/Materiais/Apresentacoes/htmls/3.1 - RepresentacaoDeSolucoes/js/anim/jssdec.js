/* Decodificador do job-shop (aula 3.1, frame 43): a representação indireta x = [J2 J1 J3] (prioridade dos jobs) é
 * decodificada operação a operação no Gantt das figuras indirect1…3 do Ipe.
 *
 * Dados: js/anim/dados/jss.js (figura_camadas.py jss … indirect1 indirect2 indirect3; quadro 253.14 × 81.14, entra com
 * scale = 1.1). Só os itens fixos (eixos, marcas, legenda, M1–M3) vêm da figura; as barras são geradas a partir do
 * escalonamento (t = 0 em x = 20.74, 16 por período; faixas M1 / M2 / M3 em y = 56.93 / 36.93 / 16.93, altura 16;
 * job 1 verde #006400, job 2 azul #00008b, job 3 marrom #a52a2a, preenchimento com opacidade 0.3). Os rótulos das
 * barras que existem no PDF ficam na posição do PDF; os outros, centrados.
 *
 * Decodificador: na ordem dos jobs dada por x, cada operação vai para o instante mais cedo possível na máquina
 * (depois da operação anterior do mesmo job, na primeira folga da máquina em que cabe). [J2 J1 J3] → 14 (o PDF).
 * As 6 ordens: J1J2J3 13, J1J3J2 13, J2J1J3 14, J2J3J1 10, J3J1J2 9, J3J2J1 8 (ótimo: a carga da M2 é 8).
 *
 * Uso: três <span class="anim pl jd" data-anim="jssdec"> com as imagens indirect1/2/3 (data-only 1, 2 e 3-).
 *   vazio → i1  (entrada, passo 1): eixos, marcas e legenda se desenham; as operações do J2 entram uma a uma
 *   i1 → i2     (passo 2): as do J1          i2 → i3 (passo 3): as do J3
 *   Cada operação: aparece tracejada na máquina no instante em que o job fica livre, desliza até o instante mais cedo
 *   possível, ganha a cor e o rótulo. Estado final de cada passo = figura do PDF.
 *   i3 → live   (passo 4, acrescentado): o x = [J2 J1 J3] da coluna da direita vira fichas coloridas (arrastar para
 *   reordenar, ou clicar em duas para trocar); cada ordem nova é decodificada (a linha do job e a célula da operação
 *   acendem na tabela); marca vermelha do makespan; embaixo do Gantt, as 6 ordens com o makespan de cada uma
 *   (aparece depois de decodificada; a melhor conhecida fica verde).
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease, lerp = Anim.lerp;
  const FD = Anim.figData || {};
  const RED = '#b6321d';
  const X0 = 20.74, PER = 16, AXB = 72.93, AXT = 8.93;
  const ROWY = { 1: 56.93, 2: 36.93, 3: 16.93 }, BASEY = { 1: 67.85, 2: 47.85, 3: 27.85 };
  const COLOR = { 1: '#006400', 2: '#00008b', 3: '#a52a2a' };
  const tx = function (t) { return X0 + PER * t; };
  // instância (tabela do frame 38): job → [(máquina, duração)]
  const JOBS = { 1: [[1, 2], [2, 3]], 2: [[1, 2], [2, 1], [3, 1]], 3: [[2, 4], [1, 1], [3, 2]] };
  // rótulos das barras do PDF (job, máquina, início) → x
  const LAB = { '2,1,0': 33.86, '2,2,2': 58.23, '2,3,3': 74.23, '1,1,2': 65.0, '1,2,4': 105.0,
    '3,2,7': 162.23, '3,1,11': 202.23, '3,3,12': 226.23 };
  const PDF = [2, 1, 3];
  const ORDERS = [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]];
  const FONT = '"LM Sans 8", "LM Sans", sans-serif';

  function decode(order) {
    const busy = { 1: [], 2: [], 3: [] }, ops = [];
    order.forEach(function (j) {
      let ready = 0;
      JOBS[j].forEach(function (mp, k) {
        const m = mp[0], p = mp[1];
        let t = ready;
        busy[m].slice().sort(function (a, b) { return a[0] - b[0]; }).some(function (iv) {
          if (t + p <= iv[0]) return true;
          t = Math.max(t, iv[1]); return false;
        });
        busy[m].push([t, t + p]);
        ops.push({ j: j, k: k, m: m, r: ready, t0: t, t1: t + p });
        ready = t + p;
      });
    });
    ops.cmax = Math.max.apply(null, ops.map(function (o) { return o.t1; }));
    return ops;
  }
  const key = function (o) { return o.join(''); };
  const known = {};   // makespans já decodificados no passo 4 (ficam enquanto a página estiver aberta)
  known[key(PDF)] = decode(PDF).cmax;

  function mk(it, parent) {
    if (it.t === 'x') {
      const t = S('text', { x: it.x, y: it.y, 'font-size': it.fs, fill: it.c, 'font-family': it.ff }, parent);
      t.textContent = it.tx;
      return t;
    }
    const p = S('path', { d: it.d, fill: it.f || 'none' }, parent);
    if (it.fo !== undefined) p.setAttribute('fill-opacity', it.fo);
    if (it.s) { p.setAttribute('stroke', it.s); p.setAttribute('stroke-width', it.w); p.setAttribute('stroke-linejoin', 'round'); }
    return p;
  }

  // tween próprio (interação do passo 4, fora do Runner do core): cancelável por geração
  function Local() { this.gen = 0; }
  Local.prototype.cancel = function () { this.gen++; };
  Local.prototype.h = function () {
    const self = this, gen = this.gen;
    const live = function () { if (gen !== self.gen) throw 'cancel'; };
    return {
      tween: function (dur, fn, ez) {
        live(); ez = ez || ease.inOut;
        return new Promise(function (res, rej) {
          const t0 = performance.now();
          (function fr(now) {
            if (gen !== self.gen) { rej('cancel'); return; }
            const t = Math.min(1, (now - t0) / dur); fn(ez(t), t);
            if (t < 1) requestAnimationFrame(fr); else res();
          })(t0);
        });
      },
      wait: function (ms) { live(); return new Promise(function (res, rej) { setTimeout(function () { gen !== self.gen ? rej('cancel') : res(); }, ms); }); },
      all: function (l) { return Promise.all(l); }
    };
  };

  Anim.define('jssdec', function (host) {
    const D = FD.jss;
    if (!D) { console.warn('jssdec: faltam os dados (dados/jss.js)'); return { snap: function () {}, play: null }; }
    const frame = host.closest('section');
    const svg = S('svg', { viewBox: '0 0 ' + D.W + ' ' + D.H });
    host.appendChild(svg);
    const OPS = new Set([5, 6, 7, 8, 9, 20, 21, 22, 38, 39, 40, 41, 42, 43, 44, 45]);
    const gBack = S('g', null, svg), gBars = S('g', null, svg), gFront = S('g', null, svg), gTop = S('g', null, svg);
    const st = {};   // itens fixos por índice
    D.items.forEach(function (it, i) { if (!OPS.has(i)) st[i] = mk(it, i < 27 ? gBack : gFront); });
    const range = function (a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
    const AXY = [0, 1], AXX = [27, 28], LEG = range(2, 4).concat(range(32, 37)), MLAB = [29, 30, 31];
    const TICKS = range(10, 19).concat(range(23, 26)), TLAB = range(46, 59);
    const allStatic = Object.keys(st).map(Number);
    const setVis = function (ids, on) { ids.forEach(function (i) { st[i].style.display = on ? '' : 'none'; st[i].style.opacity = ''; st[i].removeAttribute('transform'); }); };
    const op = function (ids, v) { ids.forEach(function (i) { st[i].style.opacity = v; }); };

    // ---------- barras ----------
    function bar(o) {
      const g = S('g', null, gBars);
      const x0 = tx(o.t0), w = PER * (o.t1 - o.t0), y = ROWY[o.m];
      g.rect = S('rect', { x: x0, y: y, width: w, height: 16, fill: COLOR[o.j], 'fill-opacity': 0.3, stroke: '#000', 'stroke-width': 0.8, 'stroke-linejoin': 'round' }, g);
      const lx = LAB[o.j + ',' + o.m + ',' + o.t0];
      g.lab = S('text', { x: lx !== undefined ? lx : x0 + w / 2 - 2.49, y: BASEY[o.m], 'font-size': 9.96, 'font-family': 'KaTeX_Main' }, g);
      g.lab.textContent = o.j;
      return g;
    }
    function drawOps(ops) { while (gBars.firstChild) gBars.removeChild(gBars.firstChild); ops.forEach(bar); }

    // uma operação: fantasma tracejado no instante em que o job fica livre → desliza até o início → cor e rótulo
    async function place(h, o, fast, cell) {
      const g = bar(o), r = g.rect, lab = g.lab;
      const dx = tx(o.r) - tx(o.t0);
      lab.style.opacity = 0;
      r.setAttribute('fill-opacity', 0); r.setAttribute('stroke-dasharray', '1.6 1.2'); r.setAttribute('stroke', COLOR[o.j]);
      g.setAttribute('transform', 'translate(' + dx + ' 0)');
      if (cell) cell(o, true);
      const cx = tx(o.r) + PER * (o.t1 - o.t0) / 2 - dx, cy = ROWY[o.m] + 8;
      await h.tween(fast ? 160 : 260, function (e) {
        g.setAttribute('transform', 'translate(' + dx + ' 0) translate(' + cx + ' ' + cy + ') scale(' + Math.max(0.01, e) + ') translate(' + (-cx) + ' ' + (-cy) + ')');
      }, ease.back);
      g.setAttribute('transform', 'translate(' + dx + ' 0)');
      if (dx < -0.01) {
        await h.wait(fast ? 60 : 140);
        const dur = Math.min(900, Math.max(fast ? 220 : 320, (o.t0 - o.r) * (fast ? 45 : 70)));
        await h.tween(dur, function (e) { g.setAttribute('transform', 'translate(' + dx * (1 - e) + ' 0)'); }, ease.inOut);
      }
      g.removeAttribute('transform');
      r.removeAttribute('stroke-dasharray'); r.setAttribute('stroke', '#000');
      await h.tween(fast ? 160 : 240, function (e) { r.setAttribute('fill-opacity', 0.3 * e); lab.style.opacity = e; });
      lab.style.opacity = '';
      if (cell) cell(o, false);
    }

    // ---------- marca do makespan (passo 4) ----------
    let mark = null;
    function marker(t) {
      if (!mark) {
        mark = S('g', null, gTop);
        S('path', { d: 'M0 ' + (AXT - 1) + 'V' + (AXB + 2), stroke: RED, 'stroke-width': 0.7, 'stroke-dasharray': '2 1.5', fill: 'none' }, mark);
        mark.lb = S('text', { x: 1.6, y: AXT + 1.2, 'font-size': 5.4, fill: RED, 'font-family': FONT }, mark);
      }
      mark.style.display = '';
      mark.t = t; mark.setAttribute('transform', 'translate(' + tx(t) + ' 0)');
      mark.lb.textContent = 'makespan = ' + (Math.round(t * 10) / 10).toString().replace('.', ',');
    }
    const hideMark = function () { if (mark) mark.style.display = 'none'; };

    // ---------- tabela (a do passo 3, que fica visível no passo 4) ----------
    const tabs = frame.querySelectorAll('.scalebox.stab');
    const tab = tabs[tabs.length - 1];
    const tds = tab ? Array.prototype.slice.call(tab.querySelectorAll('.tab > .td')) : [];
    const orig = tds.map(function (d) { return d.style.background; });
    const ROWBG = '#bdd4e6', CELLHL = '#7fa8cc';
    function tableReset() { tds.forEach(function (d, i) { d.style.background = orig[i]; d.style.transition = ''; }); }
    function tableClear() { tds.forEach(function (d, i) { if (i >= 4) { d.style.transition = 'background-color .25s'; d.style.background = '#fff'; } }); }
    function rowOn(j) { for (let c = 0; c < 4; c++) { const d = tds[4 * j + c]; if (d) d.style.background = ROWBG; } }
    function cellHL(o, on) { const d = tds[4 * o.j + 1 + o.k]; if (d) d.style.background = on ? CELLHL : ROWBG; }

    // ---------- passo 4: as células J2 J1 J3 da fórmula viram fichas ----------
    const eq = frame.querySelector('.columns .column:last-child .eq');
    let cells = null, hint = null, row = null, order = PDF.slice(), busyLive = false, liveOn = false;
    const local = new Local();
    const scaleOf = function () { return frame.getBoundingClientRect().width / frame.offsetWidth || 1; };
    function findCells() {
      if (cells || !eq) return cells;
      const cs = Array.prototype.slice.call(eq.querySelectorAll('.col-align-c .pstrut + .mord'));
      if (cs.length !== 3) return null;
      cells = cs.map(function (c) { return { el: c, dig: c.lastElementChild }; });
      return cells;
    }
    function renderCells() {
      if (!findCells()) return;
      cells.forEach(function (c, i) {
        const j = order[i];
        c.dig.textContent = j;
        c.el.style.setProperty('--jc', COLOR[j]);
        c.el.style.transition = ''; c.el.style.transform = '';
        c.el.classList.remove('sel', 'drag');
      });
    }
    function chipsOn(on) {
      if (!findCells()) return;
      cells.forEach(function (c) { c.el.classList.toggle('jd-chip', on); });
      if (on) eq.setAttribute('data-interactive', ''); else eq.removeAttribute('data-interactive');
      if (!on) { order = PDF.slice(); renderCells(); }
    }
    function buildUI() {
      if (row) return;
      hint = document.createElement('div');
      hint.className = 'jd-hint';
      hint.textContent = 'arraste as fichas para mudar a ordem (ou clique em duas para trocá-las)';
      frame.appendChild(hint);
      row = document.createElement('div');
      row.className = 'jd-row'; row.setAttribute('data-interactive', '');
      row.innerHTML = '<span class="jd-rt">ordens:</span>' + ORDERS.map(function (o) {
        return '<button type="button" data-o="' + key(o) + '"><span class="jd-o">' +
          o.map(function (j) { return '<span style="--jc:' + COLOR[j] + '"><i>J</i>' + j + '</span>'; }).join('') +
          '</span><b class="jd-c"></b></button>';
      }).join('');
      frame.appendChild(row);
      row.addEventListener('click', function (e) {
        const b = e.target.closest('button'); if (!b) return;
        order = b.dataset.o.split('').map(Number); renderCells(); runDecode();
      });
      dragSetup();
    }
    function refreshRow() {
      if (!row) return;
      const vals = Object.keys(known).map(function (k) { return known[k]; });
      const best = Math.min.apply(null, vals);
      Array.prototype.forEach.call(row.querySelectorAll('button'), function (b) {
        const k = b.dataset.o, v = known[k];
        b.querySelector('.jd-c').textContent = v === undefined ? '?' : v;
        b.classList.toggle('cur', k === key(order));
        b.classList.toggle('best', v !== undefined && v === best);
      });
    }
    function positionUI() {
      if (!row) return;
      const s = scaleOf(), fr = frame.getBoundingClientRect(), r = host.getBoundingClientRect();
      const fc = frame.querySelector('.fc').getBoundingClientRect(), k = (eq.querySelector('.katex') || eq).getBoundingClientRect();
      row.style.top = ((r.bottom - fr.top) / s + 3) + 'px';
      row.style.left = ((fc.left - fr.left) / s) + 'px';
      row.style.width = (fc.width / s) + 'px';
      hint.style.top = ((k.bottom - fr.top) / s + 4) + 'px';
      hint.style.left = ((k.left + k.width / 2 - fr.left) / s) + 'px';
    }
    function showUI(on) {
      liveOn = on;
      if (on) { buildUI(); row.style.display = hint.style.display = ''; positionUI(); refreshRow(); }
      else if (row) { row.style.display = hint.style.display = 'none'; }
      if (on || cells) chipsOn(on);
    }

    // arrastar (ou clicar em duas fichas para trocar)
    function dragSetup() {
      let drag = null, sel = null;
      const slots = function () {
        const s = scaleOf();
        return cells.map(function (c) { const r = c.el.getBoundingClientRect(); return (r.left + r.width / 2) / s; });
      };
      eq.addEventListener('pointerdown', function (e) {
        if (!liveOn || busyLive && false) return;
        const el = e.target.closest('.jd-chip'); if (!el) return;
        const i0 = cells.findIndex(function (c) { return c.el === el; });
        e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (x) {}
        cells.forEach(function (c) { c.el.style.transition = ''; c.el.style.transform = ''; });
        drag = { el: el, i0: i0, x0: e.clientX, s: scaleOf(), xs: slots(), ni: i0, moved: false };
        el.classList.add('drag');
      });
      eq.addEventListener('pointermove', function (e) {
        if (!drag) return;
        const dx = (e.clientX - drag.x0) / drag.s, xs = drag.xs;
        if (Math.abs(dx) > 3) drag.moved = true;
        if (!drag.moved) return;
        const lo = xs[0] - xs[drag.i0] - 8, hi = xs[2] - xs[drag.i0] + 8;
        const d = Math.max(lo, Math.min(hi, dx));
        drag.el.style.transform = 'translateX(' + d + 'px)';
        // posição nova: o centro mais próximo
        const x = xs[drag.i0] + d;
        let ni = 0; xs.forEach(function (v, i) { if (Math.abs(v - x) < Math.abs(xs[ni] - x)) ni = i; });
        drag.ni = ni;
        const tent = order.slice(), j = tent.splice(drag.i0, 1)[0]; tent.splice(ni, 0, j);
        cells.forEach(function (c, i) {
          if (i === drag.i0) return;
          const to = tent.indexOf(order[i]);
          c.el.style.transition = 'transform .22s'; c.el.style.transform = 'translateX(' + (xs[to] - xs[i]) + 'px)';
        });
      });
      const end = function () {
        if (!drag) return;
        const dr = drag; drag = null;
        dr.el.classList.remove('drag');
        if (dr.moved) {
          sel = null;
          if (dr.ni === dr.i0) { renderCells(); return; }
          const j = order.splice(dr.i0, 1)[0]; order.splice(dr.ni, 0, j);
          dr.el.style.transition = 'transform .15s'; dr.el.style.transform = 'translateX(' + (dr.xs[dr.ni] - dr.xs[dr.i0]) + 'px)';
          setTimeout(function () { renderCells(); runDecode(); }, 160);
          return;
        }
        // clique: seleciona; um segundo clique em outra ficha troca as duas
        if (sel !== null && sel !== dr.i0) {
          const a = sel, b = dr.i0, xs = dr.xs; sel = null;
          cells[a].el.style.transition = cells[b].el.style.transition = 'transform .3s';
          cells[a].el.style.transform = 'translateX(' + (xs[b] - xs[a]) + 'px)';
          cells[b].el.style.transform = 'translateX(' + (xs[a] - xs[b]) + 'px)';
          const t = order[a]; order[a] = order[b]; order[b] = t;
          setTimeout(function () { renderCells(); runDecode(); }, 320);
        } else if (sel === dr.i0) { sel = null; dr.el.classList.remove('sel'); }
        else { sel = dr.i0; cells.forEach(function (c, i) { c.el.classList.toggle('sel', i === sel); }); }
      };
      eq.addEventListener('pointerup', end);
      eq.addEventListener('pointercancel', end);
    }

    async function runDecode() {
      local.cancel(); busyLive = true; refreshRow();
      const h = local.h(), ops = decode(order);
      try {
        const old = Array.prototype.slice.call(gBars.childNodes);
        tableClear();
        await h.tween(260, function (e) { old.forEach(function (g) { g.style.opacity = 1 - e; }); });
        drawOps([]);
        let last = null;
        for (const o of ops) {
          if (o.j !== last) { rowOn(o.j); last = o.j; await h.wait(120); }
          await place(h, o, true, cellHL);
        }
        const tFrom = mark && mark.style.display !== 'none' ? mark.t : ops.cmax;
        await h.tween(450, function (e) { marker(lerp(tFrom, ops.cmax, e)); });
        marker(ops.cmax);
        known[key(order)] = ops.cmax;
        busyLive = false;
        refreshRow();
      } catch (e) {
        if (e !== 'cancel') console.error(e);
      }
    }

    // ---------- estados ----------
    // três instâncias no frame (uma por imagem, data-only 1, 2 e 3-); só a 3ª chega ao passo 4 (live)
    const isLive = (host.dataset.state || '').split(',').indexOf('live') >= 0;
    const PREFIX = { i1: 3, i2: 5, i3: 8 };
    function snap(s) {
      local.cancel(); busyLive = false;
      hideMark();
      if (s === 'vazio') { setVis(allStatic, false); drawOps([]); if (isLive) { showUI(false); tableReset(); } return; }
      setVis(allStatic, true);
      if (s === 'live') {
        const ops = decode(order);
        drawOps(ops); marker(ops.cmax);
        tableReset(); showUI(true); renderCells();
        return;
      }
      if (isLive) { order = PDF.slice(); showUI(false); tableReset(); }
      drawOps(decode(PDF).slice(0, PREFIX[s]));
    }
    async function play(a, b, h) {
      if (b === 'live') {
        order = PDF.slice();
        drawOps(decode(PDF));
        showUI(true); renderCells();
        // as células da fórmula ganham cor (viram fichas), a marca do makespan varre até 14, as ordens entram
        const els = cells ? cells.map(function (c) { return c.el; }) : [];
        els.forEach(function (el) { el.style.setProperty('--ja', 0); });
        row.style.opacity = 0; hint.style.opacity = 0;
        await h.tween(500, function (e) { els.forEach(function (el) { el.style.setProperty('--ja', e); }); });
        els.forEach(function (el) { el.style.removeProperty('--ja'); });
        marker(0);
        await h.tween(800, function (e) { marker(lerp(0, 14, e)); }, ease.out);
        await h.tween(350, function (e) { row.style.opacity = e; hint.style.opacity = e; });
        row.style.opacity = hint.style.opacity = '';
        return;
      }
      const ops = decode(PDF);
      if (a === 'vazio') {
        setVis(allStatic, false); drawOps([]);
        setVis(AXY.concat(AXX), true); op(AXY.concat(AXX), 0);
        await h.tween(500, function (e) {
          op(AXY.concat(AXX), e);
          st[0].setAttribute('transform', 'translate(0 ' + AXB + ') scale(1 ' + Math.max(0.01, e) + ') translate(0 ' + (-AXB) + ')');
          st[27].setAttribute('transform', 'translate(' + X0 + ' 0) scale(' + Math.max(0.01, e) + ' 1) translate(' + (-X0) + ' 0)');
        }, ease.out);
        st[0].removeAttribute('transform'); st[27].removeAttribute('transform'); op(AXY.concat(AXX), '');
        setVis(MLAB, true); op(MLAB, 0);
        await h.tween(300, function (e) { op(MLAB, e); });
        for (let i = 0; i < TICKS.length; i++) {
          setVis([TICKS[i], TLAB[i]], true); op([TICKS[i], TLAB[i]], 0);
          h.tween(200, function (e) { op([TICKS[i], TLAB[i]], e); }).catch(function () {});
          await h.wait(35);
        }
        setVis(LEG, true); op(LEG, 0);
        await h.tween(350, function (e) { op(LEG, e); });
        op(allStatic, '');
      } else {
        setVis(allStatic, true);
        drawOps(ops.slice(0, PREFIX[a]));
      }
      for (const o of ops.slice(PREFIX[a] || 0, PREFIX[b])) await place(h, o, false);
    }
    window.addEventListener('resize', function () { if (liveOn) positionUI(); });
    return { snap: snap, play: play };
  });
})();
