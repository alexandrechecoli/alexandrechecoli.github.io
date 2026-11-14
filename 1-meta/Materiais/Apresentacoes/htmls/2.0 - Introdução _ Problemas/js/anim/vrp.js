/* Roteirização de veículos (aula 2, frames 16–26): figuras vrp1…vrp8 do Ipe em camadas.
 *
 * Dados: js/anim/dados/vrp.js (ferramentas/figura_camadas.py vrp … vrp1 vrp2 vrp4 vrp5 vrp6 vrp7 vrp8; textos em Iwona,
 * fonts/iwona-regular.otf). Cada estado mostra os itens da figura do PDF; o que a animação acrescenta (painéis,
 * horários, custos) fica por cima.
 *
 * Uso: <span class="anim vr" data-anim="vrp" data-from=".." data-state=".."><img ... vrpN.svg></span>
 *
 * Estados (figura do PDF entre parênteses):
 *   v1 (vrp1)  depósito e clientes surgem
 *   v2 (vrp2)  um caminhão percorre depósito → C1 → C2 → C3 → depósito traçando a rota
 *   v4 (vrp4)  a rota sai; caixas de demanda e o caminhão com a capacidade entram
 *   v5 (vrp5)  dois caminhões saem juntos do depósito e enchem (5+3 = 80%, 10 = 100%)
 *   v5obj      + painel: nº de veículos e distância total (as rotas acendem e a distância soma)
 *   v5cap      + um caminhão só tenta atender todos: 18 un > 10 un (excede a capacidade)
 *   v6 (vrp6)  as caixas crescem com tempo de serviço (TS) e janela de tempo (JT)
 *   v6tw       relógio: os caminhões saem às 08:00 (tudo dentro da janela) e às 08:45 (C2 fora da janela);
 *              painel com o horário de saída (− / +, ▶ simula de novo)
 *   v7 (vrp7)  frota heterogênea: os dois tipos de caminhão entram pela direita
 *   v7cost     + custo por unidade de capacidade de cada tipo
 *   v8 (vrp8)  o caminhão grande faz a rota sozinho (25% → 40% → 90%) e o custo é comparado (R$ 35 × R$ 40)
 *
 * Frames 37–38 (BPP dentro do VRP, vrp4 na escala 0.5):
 *   v4 (de vazio)  depósito, clientes, demandas e o caminhão com a capacidade surgem
 *   g4   1ª parte = BPP: à direita da figura, dois veículos (mochilas de capacidade 10); as demandas voam das caixas
 *        para dentro deles por First-Fit (C3 não cabe no 1º: 18 > 10, vai para o 2º); clientes ganham a cor do grupo
 *   r4   2ª parte: a rota de cada grupo (as rotas do vrp5: D → C1 → C2 → D e D → C3 → D) com os caminhões
 *   No frame 38 (data-steps="3") o item da lista correspondente fica azul (classe vr-on).
 */
(function () {
  'use strict';
  const S = Anim.svg, ease = Anim.ease, lerp = Anim.lerp, mix = Anim.mix;
  const DATA = Anim.figData && Anim.figData.vrp;
  if (!DATA) { console.warn('vrp: faltam os dados (js/anim/dados/vrp.js)'); return; }
  const IT = DATA.items, W = DATA.W, H = DATA.H;
  const FONT = '"LM Sans 8", "LM Sans", sans-serif';
  const IWONA = '"Iwona", "LM Sans", sans-serif';
  const RED = '#b6321d', GREEN = '#1a7f37', MYBLUE = '#0061a5', GRAY = '#666666';
  const range = function (a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };

  // ---------- grupos de itens (ids de dados/vrp.js) ----------
  const G = {
    depot: [0, 105], cli: [[1, 106], [2, 108], [3, 107]],
    dem4: [[9, 110, 111], [10, 112, 113], [11, 114, 115]],
    dem5: [[5, 110, 111], [6, 112, 113], [7, 114, 115]],
    capTruck: range(12, 20), capBox: [21, 165, 166],
    tr80: range(35, 43).concat([116]), ann5: [87, 88, 162, 163, 164], tr100: range(44, 52).concat([117]),
    tr80b: range(53, 61).concat([121]),
    box6: [4, 62, 63],
    txt6: [[122, 118, 119, 120], [136, 133, 134, 135], [142, 139, 140, 141]],
    leg6: range(123, 130),
    small: range(64, 72), sbox: [73, 145, 146, 143, 144], big: range(75, 84), bbox: [74, 149, 150, 147, 148],
    ann7: [85, 86].concat(range(151, 161)),
    tr90: range(94, 103).concat([109])
  };
  // arestas [linha, seta], na ordem do percurso (as linhas já vão da origem ao destino)
  const E = {
    v2: [[22, 24], [26, 28], [89, 91], [92, 104]],
    a5: [[8, 24], [25, 28], [29, 30]], b5: [[31, 32], [33, 34]],
    v8: [[22, 23], [26, 27], [89, 90], [92, 93]]
  };
  const P = { D: [96.2, 128.2], C1: [16.2, 96.2], C2: [176.2, 64.2], C3: [112.2, 208.2] };
  const CLI = ['C1', 'C2', 'C3'];
  // caminhões do PDF usados como modelo do que anda: c = centro, body = centro da carroceria (onde vai o %)
  const TRUCK = {
    small: { ids: range(12, 20), c: [239.6, 139.7], body: [234.6, 138.6] },
    big: { ids: range(75, 84), c: [279.6, 162.6], body: [274.5, 161.5] }
  };
  const BASE = { vazio: null, v1: 'vrp1', v2: 'vrp2', v4: 'vrp4', v5: 'vrp5', v5obj: 'vrp5', v5cap: 'vrp5',
    v6: 'vrp6', v6tw: 'vrp6', v7: 'vrp7', v7cost: 'vrp7', v8: 'vrp8', g4: 'vrp4', r4: 'vrp4' };
  // itens de outras figuras mostrados num estado (r4: rotas e caminhões do vrp5 sobre o vrp4)
  const EXTRA_IDS = { r4: [8, 24, 25, 28, 29, 30, 31, 32, 33, 34].concat(range(35, 52), [116, 117]) };
  // BPP: dois veículos (x), largura, fundo, 10 unidades de altura por un de demanda; cores dos grupos
  const BIN = { x: [350, 412], w: 40, bot: 230, u: 10, cap: 10 };
  const GRP = [{ f: '#d6e6f4', s: MYBLUE }, { f: '#fbe6c8', s: '#c0730f' }];
  const FF = [{ c: 'C1', d: 5, box: 9, bin: 0 }, { c: 'C2', d: 3, box: 10, bin: 0 }, { c: 'C3', d: 10, box: 11, bin: 1, tryFirst: 0 }];

  // janelas de tempo (minutos desde 00:00) e tempos de serviço da figura; 4 pt de rota = 1 minuto
  const TW = { C1: [480, 570, 10], C2: [510, 583, 7], C3: [480, 763, 7] };
  const PT_MIN = 4;
  const tw = { dep: 525 };   // horário de saída mostrado no frame 23 (08:45 depois da animação)
  const hhmm = function (m) { m = Math.floor(m + 1e-6); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  const fmt = function (v) { return v.toFixed(1).replace('.', ','); };

  function key(it) { return it.t === 'x' ? 'x' + it.tx + '@' + it.x + ',' + it.y : 'p' + it.b.join(','); }

  // ---------- desenho de um item ----------
  function mk(it, parent) {
    if (it.t === 'x') {
      const ff = it.ff === 'Iwona' ? IWONA : it.ff;
      const t = S('text', { x: it.x, y: it.y, 'font-size': it.fs, 'font-family': ff, fill: it.c }, parent);
      if (it.st) t.setAttribute('font-style', it.st);
      if (it.fw) t.setAttribute('font-weight', it.fw);
      if (it.r) t.setAttribute('transform', 'rotate(' + it.r + ' ' + it.x + ' ' + it.y + ')');
      else if (/\s/.test(it.tx.trim())) { t.setAttribute('textLength', (it.b[2] - it.b[0]).toFixed(2)); t.setAttribute('lengthAdjust', 'spacing'); }
      t.textContent = it.tx;
      t._bt = t.getAttribute('transform') || '';
      return t;
    }
    const p = S('path', { d: it.d, fill: it.f || 'none' }, parent);
    if (it.fo !== undefined) p.setAttribute('fill-opacity', it.fo);
    if (it.eo) p.setAttribute('fill-rule', 'evenodd');
    if (it.s) {
      p.setAttribute('stroke', it.s); p.setAttribute('stroke-width', it.w);
      if (it.so !== undefined) p.setAttribute('stroke-opacity', it.so);
      if (it.da) p.setAttribute('stroke-dasharray', it.da);
      if (it.lc) p.setAttribute('stroke-linecap', it.lc);
      if (it.lj) p.setAttribute('stroke-linejoin', it.lj);
    }
    p._bt = '';
    return p;
  }
  function bboxOf(ids) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    ids.forEach(function (i) { const b = IT[i].b; x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]); });
    return [x0, y0, x1, y1];
  }

  Anim.define('vrp', function (host) {
    const svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H });
    host.appendChild(svg);
    const gIt = S('g', null, svg), gTop = S('g', null, svg), gX = S('g', null, svg);
    const els = IT.map(function (it) { return mk(it, gIt); });
    let cur = null, gen = 0, playing = false;

    // ---------- estado ----------
    function resetEl(e) {
      e.style.opacity = '';
      if (e._bt) e.setAttribute('transform', e._bt); else e.removeAttribute('transform');
      if (e._dash) { e.style.strokeDasharray = ''; e.style.strokeDashoffset = ''; e._dash = false; }
      if (e._col) { e.setAttribute('stroke', e._col[0]); e.setAttribute('stroke-width', e._col[1]); e._col = null; }
    }
    function showBase(base) {
      const set = new Set(base ? DATA.states[base] : []);
      els.forEach(function (e, i) { resetEl(e); e.style.display = set.has(i) ? '' : 'none'; });
    }
    function empty(g) { while (g.firstChild) g.removeChild(g.firstChild); }
    function snap(st) {
      gen++; cur = st;
      showBase(BASE[st]);
      if (EXTRA_IDS[st]) show(EXTRA_IDS[st]);
      empty(gTop); empty(gX);
      extras(st);
      markList(st);
    }
    // frame 38: o item da lista da parte em andamento fica azul
    function markList(st) {
      const sec = host.closest('section'), lis = sec ? sec.querySelectorAll('.fc ul.itemz > li') : [];
      if (lis.length !== 2 || BASE[st] !== 'vrp4') return;
      lis[0].classList.toggle('vr-on', st === 'g4');
      lis[1].classList.toggle('vr-on', st === 'r4');
    }
    const vis = function (i) { return els[i].style.display !== 'none'; };
    const show = function (ids, on) { ids.forEach(function (i) { els[i].style.display = on === false ? 'none' : ''; if (on !== false) els[i].style.opacity = ''; }); };

    // ---------- textos e painéis acrescentados ----------
    function text(x, y, str, size, color, o, parent) {
      const t = S('text', Object.assign({ x: x, y: y, 'font-size': size, fill: color, 'font-family': FONT }, o || {}), parent || gX);
      t.textContent = str;
      return t;
    }
    function routeLen(ids) { return ids.reduce(function (s, e) { return s + els[e[0]].getTotalLength(); }, 0); }
    const UNIT = 16;   // grade do Ipe (os pontos estão a múltiplos de 16 pt)
    function extras(st) {
      const out = {};
      if (st === 'v5obj' || st === 'v5cap') {
        out.n = text(204, 104, 'veículos: 2', 9, MYBLUE);
        out.d = text(204, 116, 'distância total: ' + fmt((routeLen(E.a5) + routeLen(E.b5)) / UNIT), 9, MYBLUE);
      }
      if (st === 'v5cap') {
        out.ok = text(204, 134, '✓ 8 un e 10 un ≤ 10 un', 8, GREEN);
        out.ko = text(204, 145, '✗ um veículo só: 18 un > 10 un', 8, RED);
      }
      if (st === 'v6tw') { out.tw = twPanel(); twMarks(results(tw.dep)); }
      if (st === 'v7cost') {
        out.s = text(251, 90, 'R$ 2,00 por un', 7.5, MYBLUE, { 'text-anchor': 'end' });
        out.b = text(251, 142, 'R$ 1,75 por un', 7.5, MYBLUE, { 'text-anchor': 'end' });
      }
      if (st === 'g4' || st === 'r4') out.bins = bins(true);
      if (st === 'v8') {
        out.a = text(196, 108, '2 pequenos: R$ 20 + R$ 20 = R$ 40', 7.5, GRAY);
        out.b = text(196, 120, '1 grande: R$ 35 ✓', 8.5, GREEN, { 'font-weight': 700 });
      }
      return out;
    }

    // ---------- BPP (frame 38) ----------
    const binTop = BIN.bot - BIN.cap * BIN.u;
    function bins(full) {   // os dois veículos; full: com as demandas já dentro e os clientes coloridos
      const g = S('g', null, gX), o = { g: g, occ: [], blocks: {} };
      text((BIN.x[0] + BIN.x[1] + BIN.w) / 2, BIN.bot + 33, '1ª parte: agrupar = BPP', 13, MYBLUE, { 'text-anchor': 'middle', 'font-weight': 700 }, g);
      BIN.x.forEach(function (x, j) {
        S('rect', { x: x, y: binTop, width: BIN.w, height: BIN.cap * BIN.u, fill: '#fff', stroke: '#333', 'stroke-width': 1.2 }, g);
        text(x + BIN.w / 2, BIN.bot + 15, 'veículo ' + (j + 1), 12, '#333', { 'text-anchor': 'middle' }, g);
        o.occ.push(text(x + BIN.w / 2, binTop - 6, '0%', 12, '#333', { 'text-anchor': 'middle', 'font-weight': 700 }, g));
      });
      text(BIN.x[0] - 5, binTop + 9, 'C = 10', 11, GRAY, { 'text-anchor': 'end' }, g);
      S('path', { d: 'M' + (BIN.x[0] - 4) + ' ' + binTop + 'H' + BIN.x[0], stroke: GRAY, 'stroke-width': 0.8 }, g);
      if (full) {
        const lvl = [0, 0];
        FF.forEach(function (it) {
          o.blocks[it.c] = block(g, it, BIN.x[it.bin], BIN.bot - (lvl[it.bin] + it.d) * BIN.u, it.bin);
          lvl[it.bin] += it.d;
          ring(it.c, it.bin, g);
        });
        lvl.forEach(function (v, j) { o.occ[j].textContent = occTxt(v); });
      }
      return o;
    }
    const occTxt = function (v) { return Math.round(100 * v / BIN.cap) + '%'; };
    function block(g, it, x, y, grp) {
      const b = S('g', null, g);
      const r = S('rect', { x: x, y: y, width: BIN.w, height: it.d * BIN.u, stroke: '#333', 'stroke-width': 0.8 }, b);
      const t = text(0, 0, it.c + ' · ' + it.d, 11, '#222', { 'text-anchor': 'middle', 'dominant-baseline': 'central' }, b);
      const o = { g: b, r: r, t: t };
      o.set = function (x, y, w, hh) {
        r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', w); r.setAttribute('height', hh);
        t.setAttribute('x', x + w / 2); t.setAttribute('y', y + hh / 2);
      };
      o.color = function (gi) { r.setAttribute('fill', gi === null ? '#eeeeee' : GRP[gi].f); r.setAttribute('stroke', gi === null ? '#333' : GRP[gi].s); };
      o.set(x, y, BIN.w, it.d * BIN.u); o.color(grp);
      return o;
    }
    function ring(c, gi, parent) {
      return S('circle', { cx: P[c][0], cy: P[c][1], r: 6.5, fill: 'none', stroke: GRP[gi].s, 'stroke-width': 1.8 }, parent || gX);
    }

    // ---------- peças de animação ----------
    const tf = function (e, pre) { e.setAttribute('transform', (pre + ' ' + (e._bt || '')).trim()); };
    function fade(h, ids, to, dur) {
      ids.forEach(function (i) { els[i].style.display = ''; });
      const from = to ? 0 : 1;
      return h.tween(dur || 300, function (e) { ids.forEach(function (i) { els[i].style.opacity = lerp(from, to, e); }); })
        .then(function () { ids.forEach(function (i) { if (!to) els[i].style.display = 'none'; els[i].style.opacity = ''; }); });
    }
    function fadeEls(h, list, to, dur) {
      const from = to ? 0 : 1;
      return h.tween(dur || 300, function (e) { list.forEach(function (el) { el.style.opacity = lerp(from, to, e); }); })
        .then(function () { if (!to) list.forEach(function (el) { el.remove(); }); });
    }
    function pop(h, ids, dur) {   // brota a partir do centro do grupo
      const b = bboxOf(ids), cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
      ids.forEach(function (i) { els[i].style.display = ''; els[i].style.opacity = 0; });
      return h.tween(dur || 380, function (e, t) {
        ids.forEach(function (i) {
          els[i].style.opacity = Math.min(1, t * 2.5);
          tf(els[i], 'translate(' + cx + ' ' + cy + ') scale(' + Math.max(0, e) + ') translate(' + (-cx) + ' ' + (-cy) + ')');
        });
      }, ease.back).then(function () { ids.forEach(function (i) { resetEl(els[i]); }); });
    }
    function popEl(h, el, dur) {
      const bb = el.getBBox(), cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
      el.setAttribute('opacity', 0);
      return h.tween(dur || 380, function (e, t) {
        el.setAttribute('opacity', Math.min(1, t * 2.5));
        el.setAttribute('transform', 'translate(' + cx + ' ' + cy + ') scale(' + Math.max(0, e) + ') translate(' + (-cx) + ' ' + (-cy) + ')');
      }, ease.back).then(function () { el.removeAttribute('transform'); el.removeAttribute('opacity'); });
    }
    function slide(h, ids, dx, dy, dur) {   // entra deslocado (dx, dy) e vai para o lugar
      ids.forEach(function (i) { els[i].style.display = ''; });
      return h.tween(dur || 520, function (e, t) {
        ids.forEach(function (i) { els[i].style.opacity = Math.min(1, t * 2); tf(els[i], 'translate(' + (dx * (1 - e)) + ' ' + (dy * (1 - e)) + ')'); });
      }, ease.out).then(function () { ids.forEach(function (i) { resetEl(els[i]); }); });
    }
    async function words(h, ids, gap) {   // textos um a um
      for (const i of ids) { await h.wait(gap || 70); fade(h, [i], 1, 220).catch(function () {}); }
      await h.wait(220);
    }
    function ripple(h, p, color, r1) {
      const c = S('circle', { cx: p[0], cy: p[1], r: 2, fill: 'none', stroke: color || MYBLUE, 'stroke-width': 1 }, gTop);
      return h.tween(560, function (e) { c.setAttribute('r', lerp(2, r1 || 12, e)); c.setAttribute('opacity', 1 - e); }, ease.out)
        .then(function () { c.remove(); }, function (x) { c.remove(); throw x; });
    }
    function pulse(h, ids, dur) {
      const b = bboxOf(ids), cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
      return h.tween(dur || 520, function (e, t) {
        const s = 1 + 0.18 * Math.sin(Math.PI * t);
        ids.forEach(function (i) { tf(els[i], 'translate(' + cx + ' ' + cy + ') scale(' + s + ') translate(' + (-cx) + ' ' + (-cy) + ')'); });
      }, ease.linear).then(function () { ids.forEach(function (i) { resetEl(els[i]); }); });
    }
    function line(id) {   // linha que se revela do início ao fim: set(t)
      const el = els[id], L = el.getTotalLength();
      el.style.display = ''; el._dash = true;
      el.style.strokeDasharray = L + ' ' + L;
      const set = function (t) { el.style.strokeDashoffset = L * (1 - t); };
      set(0);
      return { set: set, done: function () { resetEl(el); } };
    }

    // caminhão que anda: um clone do caminhão do PDF + o rótulo de ocupação (Iwona branco, como na figura)
    function truck(kind, o) {
      o = o || {};
      const k = TRUCK[kind], g = S('g', null, gTop);
      k.ids.forEach(function (i) { mk(IT[i], g); });
      const lab = S('text', { 'font-size': 7.2, 'font-family': IWONA, fill: '#fff', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, gTop);
      const lift = o.lift || 0, sc = o.scale || 1;   // centro do caminhão sobre a linha
      const tr = { g: g, lab: lab, x: k.c[0], y: k.c[1], th: 0 };
      tr.place = function (x, y, th) {
        tr.x = x; tr.y = y; tr.th = th;
        const flip = Math.abs(th) > Math.PI / 2 + 1e-6, phi = th + (flip ? Math.PI : 0), deg = phi * 180 / Math.PI;
        g.setAttribute('transform', 'translate(' + x + ' ' + y + ') rotate(' + deg + ')' + (flip ? ' scale(-1 1)' : '') +
          ' translate(0 ' + lift + ') scale(' + sc + ') translate(' + (-k.c[0]) + ' ' + (-k.c[1]) + ')');
        // posição da carroceria no mundo (para o rótulo não ficar espelhado)
        let lx = (k.body[0] - k.c[0]) * sc, ly = (k.body[1] - k.c[1]) * sc + lift;
        if (flip) lx = -lx;
        const c = Math.cos(phi), s = Math.sin(phi);
        lab.setAttribute('x', 0); lab.setAttribute('y', 0);
        lab.setAttribute('transform', 'translate(' + (x + lx * c - ly * s) + ' ' + (y + lx * s + ly * c) + ') rotate(' + deg + ')');
      };
      tr.label = function (s, col) { lab.textContent = s; lab.setAttribute('fill', col || '#fff'); };
      tr.remove = function () { g.remove(); lab.remove(); };
      tr.opacity = function (v) { g.setAttribute('opacity', v); lab.setAttribute('opacity', v); };
      tr.place(k.c[0], k.c[1], 0);
      return tr;
    }
    function angleAt(el, s, L) {
      const a = el.getPointAtLength(Math.max(0, s - 0.6)), b = el.getPointAtLength(Math.min(L, s + 0.6));
      return Math.atan2(b.y - a.y, b.x - a.x);
    }
    // anda sobre a linha id (revelando-a se reveal) e faz a seta brotar na chegada
    async function drive(h, tr, edge, o) {
      o = o || {};
      const el = els[edge[0]], L = el.getTotalLength();
      const ln = o.reveal ? line(edge[0]) : null;
      if (o.reveal) els[edge[1]].style.display = 'none';
      await h.tween(o.ms || (180 + L * 7.5), function (e) {
        const p = el.getPointAtLength(L * e);
        tr.place(p.x, p.y, angleAt(el, L * e, L));
        if (ln) ln.set(e);
        if (o.onT) o.onT(e);
      }, ease.inOut);
      if (ln) { ln.done(); pop(h, [edge[1]], 260).catch(function () {}); }
    }
    function turn(a, b) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
    // vai em linha reta até um ponto: vira para lá, anda de frente e, na chegada, vira para o ângulo th
    async function glide(h, tr, to, th, ms) {
      const x0 = tr.x, y0 = tr.y, t0 = tr.th, hd = Math.atan2(to[1] - y0, to[0] - x0);
      const d1 = turn(t0, hd), d2 = turn(hd, th);
      await h.tween(260, function (e) { tr.place(x0, y0, t0 + d1 * e); }, ease.inOut);
      await h.tween(ms || 600, function (e) { tr.place(lerp(x0, to[0], e), lerp(y0, to[1], e), hd); }, ease.inOut);
      await h.tween(260, function (e) { tr.place(to[0], to[1], hd + d2 * e); }, ease.inOut);
    }
    function dirTo(edge) { const el = els[edge[0]]; return angleAt(el, 0.6, el.getTotalLength()); }
    const pct = function (v, cap) { return Math.round(100 * v / cap) + '%'; };

    // ---------- janelas de tempo (frame 23) ----------
    function results(dep) {
      // A: D → C1 → C2 → D; B: D → C3 → D. Quem chega fora da janela não é atendido (sem tempo de serviço)
      const routes = [[[8, 'C1'], [25, 'C2'], [29, 'D']], [[31, 'C3'], [33, 'D']]];
      const res = {}, plans = [];
      routes.forEach(function (r) {
        let t = dep; const segs = [];
        r.forEach(function (s) {
          const dur = els[s[0]].getTotalLength() / PT_MIN;
          segs.push({ id: s[0], t0: t, t1: t + dur, to: s[1] });
          t += dur;
          if (s[1] !== 'D') {
            const w = TW[s[1]], ok = t >= w[0] - 1e-6 && t <= w[1] + 1e-6;
            res[s[1]] = { t: t, ok: ok, early: t < w[0] };
            if (ok) { segs.push({ wait: true, t0: t, t1: t + w[2] }); t += w[2]; }
          }
        });
        plans.push({ segs: segs, end: t });
      });
      return { res: res, plans: plans, end: Math.max(plans[0].end, plans[1].end) };
    }
    const MARK = {
      C1: { x: 0, y: 111, a: 'start' }, C2: { x: 182, y: 70, a: 'start' }, C3: { x: 121, y: 202, a: 'start' }
    };
    function twMark(c, r, parent) {
      const g = S('g', null, parent || gX), col = r.ok ? GREEN : RED, m = MARK[c];
      S('circle', { cx: P[c][0], cy: P[c][1], r: 4, fill: 'none', stroke: col, 'stroke-width': 0.9 }, g);
      text(m.x, m.y, hhmm(r.t) + (r.ok ? ' ✓' : ' ✗'), 7.5, col, { 'text-anchor': m.a, 'font-weight': 700 }, g);
      if (!r.ok) text(m.x, m.y + 8, r.early ? 'antes de ' + hhmm(TW[c][0]) : 'depois de ' + hhmm(TW[c][1]), 6.2, col, { 'text-anchor': m.a }, g);
      return g;
    }
    function twMarks(R, parent) { CLI.forEach(function (c) { twMark(c, R.res[c], parent); }); }
    let twp = null;
    function twPanel() {
      const g = S('g', { 'data-interactive': '', class: 'vr-tw' }, gX);
      const x = 216;
      const t1 = text(x + 30, 100, 'saída do depósito', 6.5, GRAY, { 'text-anchor': 'middle' }, g);
      const big = text(x + 30, 116, hhmm(tw.dep), 14, MYBLUE, { 'text-anchor': 'middle', 'font-weight': 700 }, g);
      function btn(bx, by, label, fn) {
        const b = S('g', { class: 'vr-btn' }, g);
        S('rect', { x: bx, y: by, width: 11, height: 11, rx: 1.5, fill: '#fff', stroke: '#b7cde0', 'stroke-width': 0.6 }, b);
        text(bx + 5.5, by + 8.3, label, 8, MYBLUE, { 'text-anchor': 'middle', 'font-weight': 700 }, b);
        b.addEventListener('click', function (ev) { ev.stopPropagation(); if (!playing) fn(); });
        return b;
      }
      btn(x - 6, 106.5, '−', function () { setDep(tw.dep - 15); });
      btn(x + 55, 106.5, '+', function () { setDep(tw.dep + 15); });
      const run = S('g', { class: 'vr-btn' }, g);
      S('rect', { x: x + 6, y: 122, width: 48, height: 11, rx: 1.5, fill: '#fff', stroke: '#b7cde0', 'stroke-width': 0.6 }, run);
      text(x + 30, 130.2, '▶ simular', 7, MYBLUE, { 'text-anchor': 'middle' }, run);
      run.addEventListener('click', function (ev) {
        ev.stopPropagation(); if (playing) return;
        local(function (h) { return simulate(h, [tw.dep]); });
      });
      twp = { g: g, t1: t1, big: big };
      return twp;
    }
    function setDep(m) { tw.dep = Math.max(390, Math.min(600, m)); snap(cur); }
    // relógio correndo: os dois caminhões saem juntos, cada cliente é marcado na chegada
    async function simulate(h, deps) {
      const statics = G.tr80b.concat(G.tr100).filter(vis);
      statics.forEach(function (i) { els[i].style.opacity = 0.2; });
      for (let r = 0; r < deps.length; r++) {
        const dep = deps[r], R = results(dep);
        empty(gX); twPanel(); tw.dep = dep;
        twp.t1.textContent = 'relógio'; twp.big.textContent = hhmm(dep);
        const marks = S('g', null, gX), done = {};
        const trs = R.plans.map(function () { const t = truck('small'); t.place(P.D[0], P.D[1], 0); return t; });
        trs.forEach(function (t) { t.opacity(0); });
        await h.all(trs.map(function (t) { return h.tween(250, function (e) { t.opacity(e); }); }));
        const span = R.end - dep;
        await h.tween(span * 28, function (e) {
          const m = dep + span * e;
          twp.big.textContent = hhmm(m);
          R.plans.forEach(function (pl, k) {
            const t = trs[k];
            let seg = pl.segs[pl.segs.length - 1];
            for (const s of pl.segs) { if (m <= s.t1) { seg = s; break; } }
            if (seg.wait) return;
            const el = els[seg.id], L = el.getTotalLength(), u = Math.max(0, Math.min(1, (m - seg.t0) / (seg.t1 - seg.t0)));
            const p = el.getPointAtLength(L * u);
            t.place(p.x, p.y, angleAt(el, L * u, L));
          });
          CLI.forEach(function (c) {
            if (!done[c] && m >= R.res[c].t) {
              done[c] = true;
              twMark(c, R.res[c], marks);
              ripple(h, P[c], R.res[c].ok ? GREEN : RED, 14).catch(function () {});
            }
          });
        }, ease.linear);
        await h.all(trs.map(function (t) { return h.tween(250, function (e) { t.opacity(1 - e); }); }));
        trs.forEach(function (t) { t.remove(); });
        twp.t1.textContent = 'saída do depósito'; twp.big.textContent = hhmm(dep);
        if (r < deps.length - 1) await h.wait(900);
      }
      statics.forEach(function (i) { els[i].style.opacity = ''; });
    }
    // execução própria (botão ▶), cancelada por qualquer snap
    function local(script) {
      const g0 = ++gen;
      const live = function () { if (g0 !== gen) throw local.X; };
      const h = {
        tween: function (dur, fn, ez) {
          live(); ez = ez || ease.inOut;
          return new Promise(function (res, rej) {
            const t0 = performance.now();
            (function fr(now) {
              if (g0 !== gen) { rej(local.X); return; }
              const t = Math.min(1, (now - t0) / dur); fn(ez(t), t);
              if (t < 1) requestAnimationFrame(fr); else res();
            })(t0);
          });
        },
        wait: function (ms) { live(); return new Promise(function (res, rej) { setTimeout(function () { if (g0 !== gen) rej(local.X); else res(); }, ms); }); },
        all: function (l) { return Promise.all(l); }
      };
      playing = true;
      Promise.resolve().then(function () { return script(h); })
        .catch(function (e) { if (e !== local.X) console.error(e); })
        .then(function () { playing = false; if (g0 === gen) snap(cur); });
    }
    local.X = { cancelled: true };

    // ---------- transições ----------
    // itens que só mudam de espessura/estilo entre figuras (mesma geometria) trocam sem animar
    function swapSame(a, b) {
      const A = new Set(DATA.states[a]), B = new Set(DATA.states[b]);
      const leave = {}; A.forEach(function (i) { if (!B.has(i)) leave[key(IT[i])] = i; });
      B.forEach(function (i) {
        if (A.has(i)) return;
        const k = key(IT[i]);
        if (leave[k] !== undefined) { els[leave[k]].style.display = 'none'; els[i].style.display = ''; }
      });
    }
    async function play(a, b, h) {
      playing = true;
      try {
        const ba = BASE[a], bb = BASE[b];
        // o que a animação acrescentou no estado anterior sai
        const keepX = (a === 'v5obj' && b === 'v5cap') || (a === 'g4' && b === 'r4');
        if (gX.firstChild && !keepX) await fadeEls(h, Array.prototype.slice.call(gX.children), 0, 250);
        if (ba && bb && ba !== bb) swapSame(ba, bb);
        const fn = SCRIPTS[a + '>' + b] || SCRIPTS[(ba || 'vazio') + '>' + bb];
        const shown = fn ? await fn(h, a, b) : false;   // true: o script já mostrou os acréscimos de b
        // rede de segurança: o que nenhum passo tratou entra/sai em fade
        if (bb) {
          const want = new Set(DATA.states[bb].concat(EXTRA_IDS[b] || [])), inn = [], out = [];
          els.forEach(function (e, i) { const v = vis(i); if (want.has(i) && !v) inn.push(i); if (!want.has(i) && v) out.push(i); });
          if (inn.length || out.length) await h.all([fade(h, inn, 1, 250), fade(h, out, 0, 250)]);
        }
        const x = extras(b);
        if (!shown) {
          for (const k in x) if (x[k] && x[k].tagName === 'text') popEl(h, x[k], 380).catch(function () {});
          if (Object.keys(x).length) await h.wait(420);
        }
      } finally { playing = false; }
    }

    const SCRIPTS = {
      // 16: depósito e clientes surgem
      'vazio>vrp1': async function (h) {
        showBase(null);
        await h.all([pop(h, G.depot, 420), ripple(h, P.D, MYBLUE, 14)]);
        for (const c of G.cli) { await h.wait(120); pop(h, c, 380).catch(function () {}); }
        await h.wait(420);
        await ripple(h, P.D, MYBLUE, 16);
      },
      // 17: um caminhão percorre a rota toda, saindo e voltando ao depósito
      'vrp1>vrp2': async function (h) {
        E.v2.forEach(function (e) { show(e, false); });
        const t = truck('small'); t.opacity(0); t.place(P.D[0], P.D[1], dirTo(E.v2[0]));
        await h.all([h.tween(260, function (e) { t.opacity(e); }), ripple(h, P.D)]);
        const to = [P.C1, P.C2, P.C3, P.D];
        for (let k = 0; k < E.v2.length; k++) {
          await drive(h, t, E.v2[k], { reveal: true });
          ripple(h, to[k], k < 3 ? GREEN : MYBLUE).catch(function () {});
        }
        await h.wait(250);
        await h.tween(260, function (e) { t.opacity(1 - e); });
        t.remove();
      },
      // 18: a rota sai; demandas e o caminhão com a capacidade entram
      'vrp2>vrp4': async function (h) {
        await fade(h, [].concat.apply([], E.v2), 0, 350);
        for (const d of G.dem4) { await h.all([pop(h, d, 400), h.wait(200)]); }
        await slide(h, G.capTruck, 70, 0, 650);
        await pop(h, G.capBox, 400);
      },
      // 19: frota ilimitada: dois caminhões saem juntos e enchem conforme coletam
      'vrp4>vrp5': async function (h) {
        const cap = truck('small');
        show(G.capTruck, false);
        await fade(h, G.capBox, 0, 250);
        await glide(h, cap, P.D, dirTo(E.a5[0]), 650);
        const tb = truck('small'); tb.place(P.D[0], P.D[1], dirTo(E.b5[0]));
        cap.label('0%'); tb.label('0%');
        E.a5.concat(E.b5).forEach(function (e) { show(e, false); });
        await ripple(h, P.D);
        const box5 = { C1: G.dem5[0], C2: G.dem5[1], C3: G.dem5[2] };
        const runA = async function () {
          await drive(h, cap, E.a5[0], { reveal: true }); cap.label('50%'); pulse(h, box5.C1).catch(function () {}); ripple(h, P.C1, GREEN).catch(function () {});
          await drive(h, cap, E.a5[1], { reveal: true }); cap.label('80%'); pulse(h, box5.C2).catch(function () {}); ripple(h, P.C2, GREEN).catch(function () {});
          await drive(h, cap, E.a5[2], { reveal: true });
        };
        const runB = async function () {
          await h.wait(350);
          await drive(h, tb, E.b5[0], { reveal: true }); tb.label('100%'); pulse(h, box5.C3).catch(function () {}); ripple(h, P.C3, GREEN).catch(function () {});
          await drive(h, tb, E.b5[1], { reveal: true });
        };
        await h.all([runA(), runB()]);
        await h.wait(200);
        await h.tween(280, function (e) { cap.opacity(1 - e); tb.opacity(1 - e); });
        cap.remove(); tb.remove();
        await pop(h, G.tr80, 420);
        await pop(h, G.tr100, 420);
        await fade(h, G.ann5, 1, 400);
      },
      // 37: a figura do vrp4 se monta (vindo da tabela do frame 36)
      'vazio>vrp4': async function (h) {
        showBase(null);
        await h.all([pop(h, G.depot, 420), ripple(h, P.D, MYBLUE, 14)]);
        for (const c of G.cli) { await h.wait(100); pop(h, c, 360).catch(function () {}); }
        await h.wait(360);
        for (const d of G.dem4) { await h.all([pop(h, d, 400), h.wait(180)]); }
        await slide(h, G.capTruck, 70, 0, 600);
        await pop(h, G.capBox, 400);
        await h.all([pulse(h, [].concat.apply([], G.dem4), 600), pulse(h, G.capBox, 600)]);
      },
      // 38, passo 2: agrupar = BPP (First-Fit na ordem C1, C2, C3)
      'v4>g4': async function (h) {
        const o = bins(false);
        o.g.setAttribute('opacity', 0);
        await h.tween(400, function (e) { o.g.setAttribute('opacity', e); });
        o.g.removeAttribute('opacity');
        const lvl = [0, 0];
        for (let k = 0; k < FF.length; k++) {
          const it = FF[k], b0 = IT[it.box].b, blk = block(o.g, it, b0[0], b0[1], null);
          blk.set(b0[0], b0[1], b0[2] - b0[0], b0[3] - b0[1]);
          await pulse(h, G.dem4[k], 420);
          const fly = async function (j) {   // voa até o topo da pilha do veículo j
            const x1 = BIN.x[j], y1 = BIN.bot - (lvl[j] + it.d) * BIN.u, w1 = BIN.w, h1 = it.d * BIN.u;
            await h.tween(750, function (e) {
              blk.set(lerp(b0[0], x1, e), lerp(b0[1], y1, e), lerp(b0[2] - b0[0], w1, e), lerp(b0[3] - b0[1], h1, e));
            }, ease.inOut);
            return [x1, y1, w1, h1];
          };
          if (it.tryFirst !== undefined) {
            // tenta o 1º veículo: passa da capacidade
            const at = await fly(it.tryFirst);
            blk.r.setAttribute('fill', '#f6d2cc'); blk.r.setAttribute('stroke', RED);
            const msg = text(BIN.x[0] + BIN.w / 2, at[1] - 8, (lvl[0] + it.d) + ' > 10 ✗', 12, RED, { 'text-anchor': 'middle', 'font-weight': 700 }, o.g);
            o.occ[0].setAttribute('opacity', 0);
            await h.tween(600, function (e, t) { blk.set(at[0] + Math.sin(t * Math.PI * 8) * 3 * (1 - t), at[1], at[2], at[3]); }, ease.linear);
            await h.wait(500);
            msg.remove(); o.occ[0].removeAttribute('opacity'); blk.color(null);
            const x0 = at[0], y0 = at[1], x1 = BIN.x[it.bin], y1 = BIN.bot - (lvl[it.bin] + it.d) * BIN.u;
            await h.tween(700, function (e) { blk.set(lerp(x0, x1, e), lerp(y0, y1, e), BIN.w, at[3]); }, ease.inOut);
          } else {
            await fly(it.bin);
          }
          lvl[it.bin] += it.d;
          blk.color(it.bin);
          o.occ[it.bin].textContent = occTxt(lvl[it.bin]);
          const rg = ring(it.c, it.bin, o.g);
          await h.all([popEl(h, rg, 380), popEl(h, o.occ[it.bin], 320), ripple(h, P[it.c], GRP[it.bin].s, 14)]);
        }
        empty(gX);
        return true;
      },
      // 38, passo 3: a rota de cada grupo
      'g4>r4': async function (h) {
        const ta = truck('small'), tb = truck('small');
        ta.place(P.D[0], P.D[1], dirTo(E.a5[0])); tb.place(P.D[0], P.D[1], dirTo(E.b5[0]));
        ta.label('0%'); tb.label('0%'); ta.opacity(0); tb.opacity(0);
        await h.all([h.tween(300, function (e) { ta.opacity(e); tb.opacity(e); }), ripple(h, P.D)]);
        const runA = async function () {
          await drive(h, ta, E.a5[0], { reveal: true }); ta.label('50%'); ripple(h, P.C1, GRP[0].s).catch(function () {});
          await drive(h, ta, E.a5[1], { reveal: true }); ta.label('80%'); ripple(h, P.C2, GRP[0].s).catch(function () {});
          await drive(h, ta, E.a5[2], { reveal: true });
        };
        const runB = async function () {
          await h.wait(300);
          await drive(h, tb, E.b5[0], { reveal: true }); tb.label('100%'); ripple(h, P.C3, GRP[1].s).catch(function () {});
          await drive(h, tb, E.b5[1], { reveal: true });
        };
        await h.all([runA(), runB()]);
        await h.tween(280, function (e) { ta.opacity(1 - e); tb.opacity(1 - e); });
        ta.remove(); tb.remove();
        await pop(h, G.tr80, 400);
        await pop(h, G.tr100, 400);
        return true;
      },
      'v4>r4': async function (h) {   // R no passo 3
        await SCRIPTS['v4>g4'](h);
        extras('g4');
        return SCRIPTS['g4>r4'](h);
      },
      // 20: objetivo duplo: nº de veículos e distância
      'v5>v5obj': async function (h) {
        empty(gX);
        const n = text(204, 104, 'veículos: 0', 9, MYBLUE), d = text(204, 116, 'distância total: 0,0', 9, MYBLUE);
        await h.all([popEl(h, n), popEl(h, d)]);
        const trs = [G.tr80, G.tr100];
        for (let k = 0; k < 2; k++) { n.textContent = 'veículos: ' + (k + 1); await h.all([pulse(h, trs[k], 520), popEl(h, n, 300)]); }
        let acc = 0;
        for (const e of E.a5.concat(E.b5)) {
          const el = els[e[0]], L = el.getTotalLength();
          el._col = [el.getAttribute('stroke'), el.getAttribute('stroke-width')];
          await h.tween(160 + L * 3.5, function (u) {
            el.setAttribute('stroke', mix('#000000', MYBLUE, Math.min(1, u * 3)));
            el.setAttribute('stroke-width', 0.8 + 1.0 * Math.sin(Math.PI * u));
            d.textContent = 'distância total: ' + fmt((acc + L * u) / UNIT);
          }, ease.inOut);
          acc += L;
          resetEl(el);
        }
        d.textContent = 'distância total: ' + fmt(acc / UNIT);
        empty(gX);
        return true;
      },
      // 21: um caminhão só não dá conta: excede a capacidade
      'v5obj>v5cap': async function (h) {
        const ghost = truck('small'); ghost.opacity(0); ghost.place(P.D[0], P.D[1], dirTo(E.a5[0])); ghost.label('0%');
        const dim = G.tr80.concat(G.tr100);
        await h.all([h.tween(300, function (e) { ghost.opacity(e); dim.forEach(function (i) { els[i].style.opacity = 1 - 0.75 * e; }); })]);
        await drive(h, ghost, E.a5[0]); ghost.label('50%'); ripple(h, P.C1, GREEN).catch(function () {});
        await drive(h, ghost, E.a5[1]); ghost.label('80%'); ripple(h, P.C2, GREEN).catch(function () {});
        // C2 → C3 não existe na figura: tracejado vermelho provisório
        const tmp = S('path', { d: 'M176.2 64.2L112.2 208.2', fill: 'none', stroke: RED, 'stroke-width': 0.8, 'stroke-dasharray': '3 2' }, gTop);
        gTop.insertBefore(tmp, gTop.firstChild);
        const L = tmp.getTotalLength();
        await h.tween(180 + L * 7.5, function (e) { const p = tmp.getPointAtLength(L * e); ghost.place(p.x, p.y, angleAt(tmp, L * e, L)); }, ease.inOut);
        ghost.label('180%', '#ffd0c8');
        ripple(h, P.C3, RED, 16).catch(function () {});
        const x0 = ghost.x;
        await h.tween(600, function (e, t) { ghost.place(x0 + Math.sin(t * Math.PI * 8) * 2.2 * (1 - t), ghost.y, ghost.th); }, ease.linear);
        const msg = text(P.C3[0] + 10, P.C3[1] - 26, '18 un > 10 un', 8, RED, { 'font-weight': 700 }, gTop);
        await popEl(h, msg, 380);
        await h.wait(900);
        await h.tween(350, function (e) {
          ghost.opacity(1 - e); tmp.setAttribute('opacity', 1 - e); msg.setAttribute('opacity', 1 - e);
          dim.forEach(function (i) { els[i].style.opacity = 0.25 + 0.75 * e; });
        });
        ghost.remove(); tmp.remove(); msg.remove();
        dim.forEach(function (i) { els[i].style.opacity = ''; });
        empty(gX);
        const x = extras('v5cap');
        x.ok.setAttribute('opacity', 0); x.ko.setAttribute('opacity', 0);
        await h.all([popEl(h, x.ok, 380), pulse(h, G.tr80), pulse(h, G.tr100)]);
        await popEl(h, x.ko, 380);
        empty(gX);
        return true;
      },
      // 22: as caixas crescem com TS e JT; o caminhão de 80% se ajeita; legenda
      'vrp5>vrp6': async function (h) {
        await fade(h, G.ann5, 0, 250);
        // caminhão 80%: mesma figura 8 pt à direita e 4 pt acima
        show(G.tr80, false);
        const trMove = slide(h, G.tr80b, -8, 4, 600);
        const olds = G.dem5.map(function (d) { return d[0]; });
        // texto "Dem." / "(Nun)" que muda de lugar desliza
        const moves = [[112, 131], [113, 132], [114, 137], [115, 138]];
        moves.forEach(function (m) { show([m[0]], false); });
        const slides = moves.map(function (m) { return slide(h, [m[1]], IT[m[0]].x - IT[m[1]].x, IT[m[0]].y - IT[m[1]].y, 650); });
        // caixa nova cresce a partir da antiga
        const grow = G.box6.map(function (nb, k) {
          const o = IT[olds[k]].b, n = IT[nb].b, el = els[nb];
          el.style.display = '';
          const sx = (o[2] - o[0]) / (n[2] - n[0]), sy = (o[3] - o[1]) / (n[3] - n[1]);
          return h.tween(650, function (e) {
            const kx = lerp(sx, 1, e), ky = lerp(sy, 1, e), tx = lerp(o[0], n[0], e), ty = lerp(o[1], n[1], e);
            tf(el, 'translate(' + tx + ' ' + ty + ') scale(' + kx + ' ' + ky + ') translate(' + (-n[0]) + ' ' + (-n[1]) + ')');
            els[olds[k]].style.opacity = 1 - e;
          }, ease.inOut).then(function () { resetEl(el); show([olds[k]], false); });
        });
        await h.all(grow.concat(slides, [trMove]));
        for (const t of G.txt6) await words(h, t, 90);
        await words(h, G.leg6, 50);
      },
      // 23: relógio — saída às 08:00 (tudo na janela) e às 08:45 (C2 depois da janela)
      'v6>v6tw': async function (h) {
        await simulate(h, [480, 525]);
        tw.dep = 525;
        empty(gX);
        return true;
      },
      // 24: frota heterogênea
      'vrp6>vrp7': async function (h) {
        await h.all([fade(h, G.leg6, 0, 300), fade(h, G.tr80b, 0, 300), fade(h, G.tr100, 0, 300)]);
        await slide(h, G.small, 60, 0, 600); await pop(h, G.sbox, 380);
        await slide(h, G.big, 60, 0, 600); await pop(h, G.bbox, 380);
        const arrow = line(85);
        await h.tween(450, function (e) { arrow.set(e); }); arrow.done();
        await pop(h, [86], 250);
        await words(h, G.ann7.slice(2), 45);
      },
      // 25: custo por unidade de capacidade
      'v7>v7cost': async function (h) {
        const x = extras('v7cost');
        x.s.setAttribute('opacity', 0); x.b.setAttribute('opacity', 0);
        await h.all([pulse(h, G.small.concat(G.sbox), 600)]);
        await popEl(h, x.s);
        await h.all([pulse(h, G.big.concat(G.bbox), 600)]);
        await popEl(h, x.b);
        empty(gX);
        return true;
      },
      // 26: o caminhão grande faz tudo sozinho
      'vrp7>vrp8': async function (h) {
        const gone = G.small.concat(G.sbox, G.bbox, G.ann7, [29, 30, 31, 32, 33, 34]).filter(vis);
        const big = truck('big');
        show(G.big, false);
        await fade(h, gone, 0, 350);
        await glide(h, big, P.D, dirTo(E.v8[0]), 800);
        big.label('0%');
        E.v8.slice(2).forEach(function (e) { show(e, false); });
        await ripple(h, P.D);
        const loads = [[5, P.C1], [8, P.C2], [18, P.C3]];
        for (let k = 0; k < 4; k++) {
          await drive(h, big, E.v8[k], { reveal: k >= 2, ms: k < 2 ? 900 : undefined });
          if (k < 3) { big.label(pct(loads[k][0], 20)); ripple(h, loads[k][1], GREEN).catch(function () {}); }
        }
        await ripple(h, P.D);
        await h.tween(280, function (e) { big.opacity(1 - e); });
        big.remove();
        await pop(h, G.tr90, 420);
      }
    };

    return {
      snap: function (st) { snap(st); },
      play: play
    };
  });
})();
