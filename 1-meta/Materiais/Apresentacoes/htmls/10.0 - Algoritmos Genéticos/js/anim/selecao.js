/* Métodos de seleção (aula 10): roleta (frame 68), amostragem estocástica universal (69) e torneio (70–72).
 *
 * As figuras vêm de ferramentas/figura_camadas.py (dados/roleta.js: selection_roleta + selection_roleta_universal;
 * dados/torneio.js: Torneio1–3). Com os valores do PDF, o estado final de cada slide é a figura do PDF; a <img>
 * fica invisível dentro do host (reserva o espaço; o layout não muda) e o SVG fica por cima.
 *
 * Roleta — <span class="anim sel" data-anim="roleta" data-from="r0" data-state="r1,r2">  (frame com data-steps="2")
 *   r0→r1  as rotas surgem; cada fatia "nasce" da sua rota (a rota pulsa e a fatia abre); o marcador cai e a
 *          roleta gira e para: a fatia e a rota escolhidas piscam
 *   r1→r2  o parágrafo sai; as fatias passam às proporções exatas (45 : 20 : 15 = 56,3% · 25% · 18,8%; as do PDF,
 *          desenhadas à mão, têm 57,5% · 28,2% · 14,4%) e surge o painel: "girar" (animado), "girar 100×",
 *          "zerar"; barras com a frequência obtida e a probabilidade esperada de cada rota
 * SUS — data-fig="sus" data-from="r1" data-state="s1,s2"
 *   r1→s1  surgem os outros 3 marcadores (igualmente espaçados) e a roleta gira UMA vez: cada marcador escolhe
 *          um pai (as rotas mostram quantas vezes foram escolhidas)
 *   s1→s2  painel: numa rodada são escolhidos 4 pais; histogramas do nº de vezes que a rota azul (56,3%) é
 *          escolhida por rodada — roleta (4 giros independentes: 0 a 4 vezes) × SUS (1 giro: sempre 2 ou 3);
 *          botões "1 rodada" (anima o giro), "100 rodadas", "zerar"
 * Torneio — data-anim="torneio", estados t0 · t1 (Torneio1) · t2 · t3 · t4 (frame 72 com data-steps="2")
 *   t0→t1  a população surge rota a rota
 *   t1→t2  o sorteio: um anel salta entre as rotas e para numa delas, que desce (cópia) para a caixa; 3 vezes
 *   t2→t3  o pódio sobe e as 3 sobem a ele pela ordem do fitness; a vencedora pulsa
 *   t3→t4  painel: chance de cada rota vencer um torneio com k = 3 (teórica, por enumeração dos 20 trios, com
 *          empates divididos; obtida; e, para comparar, a da roleta), botões "novo torneio" (repete o sorteio e o
 *          pódio na figura), "100 torneios", "zerar". Com k = 3 as duas piores nunca vencem.
 */
(function () {
  'use strict';
  const A = window.Anim;
  if (!A) return;
  const S = A.svg, E = A.ease, lerp = A.lerp;
  const RED = '#8b0000', BLUE = '#00008b', GREEN = '#006400', HI = '#e0a000', MYBLUE = '#0061a5', GRAY = '#888';
  const MAIN = 'KaTeX_Main, serif';
  const fmt = function (v, d) { return v.toFixed(d == null ? 0 : d).replace('.', ','); };

  // ---------- figuras em camadas ----------
  const ACC = { '´': '́', '˜': '̃', '¸': '̧', 'ˆ': '̂', '`': '̀', '¨': '̈' };
  const fixText = function (t) { return t.replace(/([´˜¸ˆ`¨])(\S)/g, function (m, a, c) { return c + ACC[a]; }).normalize('NFC'); };
  function item(root, it) {
    let e;
    if (it.t === 'x') {
      e = S('text', { x: it.x, y: it.y, fill: it.c, 'font-family': it.ff + ', serif', 'font-size': it.fs }, root);
      if (it.st) e.setAttribute('font-style', it.st);
      if (it.fw) e.setAttribute('font-weight', it.fw);
      e.textContent = fixText(it.tx);
    } else {
      e = S('path', { d: it.d, fill: it.f || 'none' }, root);
      if (it.fo != null) e.setAttribute('fill-opacity', it.fo);
      if (it.eo) e.setAttribute('fill-rule', 'evenodd');
      if (it.s) {
        e.setAttribute('stroke', it.s); e.setAttribute('stroke-width', it.w);
        if (it.so != null) e.setAttribute('stroke-opacity', it.so);
        if (it.da) e.setAttribute('stroke-dasharray', it.da);
        if (it.lc) e.setAttribute('stroke-linecap', it.lc);
        if (it.lj) e.setAttribute('stroke-linejoin', it.lj);
      }
    }
    return e;
  }
  const ctr = function (it) { return [(it.b[0] + it.b[2]) / 2, (it.b[1] + it.b[3]) / 2]; };
  function scaleAbout(el, x, y, s) { el.setAttribute('transform', 'translate(' + x + ',' + y + ') scale(' + Math.max(0.001, s) + ') translate(' + (-x) + ',' + (-y) + ')'); }
  function popIn(h, el, c, dur) {
    el.setAttribute('opacity', 0);
    return h.tween(dur || 320, function (e) { el.setAttribute('opacity', Math.min(1, e * 1.6)); scaleAbout(el, c[0], c[1], lerp(0.3, 1, E.back(e))); }, E.linear)
      .then(function () { el.removeAttribute('transform'); });
  }
  function pulse(h, el, c, amp, dur) {
    return h.tween(dur || 500, function (e) { scaleAbout(el, c[0], c[1], 1 + (amp || 0.15) * Math.sin(Math.PI * e)); }, E.linear)
      .then(function () { el.removeAttribute('transform'); });
  }
  function ring(h, parent, bb, color, dur, keep) {   // contorno arredondado que acende (e apaga, se !keep)
    const r = S('rect', { x: bb[0] - 1.2, y: bb[1] - 1.2, width: bb[2] - bb[0] + 2.4, height: bb[3] - bb[1] + 2.4, rx: 2, fill: 'none', stroke: color || HI, 'stroke-width': 0.9, opacity: 0 }, parent);
    return h.tween(dur || 600, function (e) { r.setAttribute('opacity', keep ? Math.min(1, e * 3) : Math.sin(Math.PI * e)); }, E.linear)
      .then(function () { if (!keep) r.remove(); return r; });
  }

  // execução própria (botões dos painéis): cancelável, como o Runner do core
  function Own() {
    let gen = 0;
    const self = { busy: false };
    self.cancel = function () { gen++; self.busy = false; };
    self.run = function (script) {
      const g = ++gen; self.busy = true;
      const live = function () { if (g !== gen) throw self; };
      const h = {
        tween: function (dur, fn, ez) {
          live(); ez = ez || E.inOut;
          return new Promise(function (res, rej) {
            const t0 = performance.now();
            (function fr(now) {
              if (g !== gen) { rej(self); return; }
              const t = Math.min(1, (now - t0) / dur); fn(ez(t), t);
              if (t < 1) requestAnimationFrame(fr); else res();
            })(t0);
          });
        },
        wait: function (ms) { live(); return new Promise(function (res, rej) { setTimeout(function () { if (g !== gen) rej(self); else res(); }, ms); }); },
        all: function (l) { return Promise.all(l); }
      };
      return Promise.resolve().then(function () { return script(h); })
        .catch(function (e) { if (e !== self) console.error(e); })
        .then(function () { if (g === gen) self.busy = false; });
    };
    return self;
  }
  // h que só executa o fim de cada tween (sem animação: "reduzir movimento")
  const INSTANT = { tween: function (d, fn) { fn(1, 1); return Promise.resolve(); }, wait: function () { return Promise.resolve(); }, all: function (l) { return Promise.all(l); } };

  // ---------- painel abaixo da figura (passo 2): ocupa o lugar do parágrafo ----------
  function Panel(host, height) {
    const fc = host.closest('.fc'), frame = host.closest('section'), fig = host.closest('.center') || host;
    const div = document.createElement('div');
    div.className = 'sel-panel'; div.setAttribute('data-interactive', '');
    div.style.cssText = 'position:absolute;left:0;display:none;line-height:0';
    fc.appendChild(div);
    const svg = S('svg', { viewBox: '0 0 403.7 ' + height }, div);
    svg.style.width = '403.7pt'; svg.style.height = height + 'pt'; svg.style.overflow = 'visible'; svg.style.display = 'block';
    const P = { div: div, svg: svg, offX: 0, sc: 1 };
    const others = function () { return Array.prototype.filter.call(fc.children, function (c) { return c !== fig && c !== div; }); };
    P.place = function () {
      const k = frame.getBoundingClientRect().width / 453.543;
      if (!(k > 0)) return;
      const hb = host.getBoundingClientRect(), fb = fc.getBoundingClientRect();
      div.style.top = ((hb.bottom - fb.top) / k + 5) + 'pt';
      P.offX = (hb.left - fb.left) / k;
      P.sc = hb.width / k;
    };
    P.show = function (on, fade) {
      others().forEach(function (c) { c.style.visibility = on ? 'hidden' : ''; c.style.opacity = ''; });
      div.style.display = on ? '' : 'none'; div.style.opacity = '';
      if (on) P.place();
    };
    P.fadeIn = function (h) {
      const os = others();
      os.forEach(function (c) { c.style.visibility = ''; });
      return h.tween(400, function (e) { os.forEach(function (c) { c.style.opacity = 1 - e; }); })
        .then(function () {
          os.forEach(function (c) { c.style.visibility = 'hidden'; c.style.opacity = ''; });
          div.style.display = ''; P.place(); div.style.opacity = 0;
          return h.tween(400, function (e) { div.style.opacity = e; });
        });
    };
    return P;
  }
  function text(parent, x, y, s, o) {
    o = o || {};
    const t = S('text', { x: x, y: y, 'font-size': o.fs || 6.3, 'font-family': MAIN, fill: o.c || '#222' }, parent);
    if (o.anchor) t.setAttribute('text-anchor', o.anchor);
    if (o.bold) t.setAttribute('font-weight', 'bold');
    if (o.it) t.setAttribute('font-style', 'italic');
    if (s != null) t.textContent = s;
    return t;
  }
  function button(parent, x, y, w, label, fn) {
    const g = S('g', { style: 'cursor:pointer' }, parent);
    S('rect', { x: x, y: y, width: w, height: 10, rx: 2, fill: '#eef3f9', stroke: MYBLUE, 'stroke-width': 0.5 }, g);
    text(g, x + w / 2, y + 7.1, label, { anchor: 'middle', fs: 6.1, c: MYBLUE });
    g.addEventListener('pointerdown', function (ev) { ev.preventDefault(); ev.stopPropagation(); fn(); });
    g.addEventListener('click', function (ev) { ev.stopPropagation(); });
    return g;
  }
  function figSvg(host, D) {
    const svg = S('svg', { viewBox: '0 0 ' + D.W + ' ' + D.H, 'aria-hidden': 'true' }, host);
    return svg;
  }

  // =====================================================================================================
  // Roleta e SUS
  // =====================================================================================================
  const C0 = [92.40, 16.84], R0 = 16.0;
  const NAMES = ['blue', 'red', 'green'];                       // rotas da esquerda para a direita
  const COL = { blue: BLUE, red: RED, green: GREEN }, FOP = { blue: 0.3, red: 0.5, green: 0.5 };
  const FIT = { blue: 45, red: 20, green: 15 };
  const PSEL = { blue: 45 / 80, red: 20 / 80, green: 15 / 80 };
  // fatias (graus, eixo y para baixo): as do PDF e as exatas (mantém a borda vermelho/azul em 88,03°)
  const ANG_PDF = { red: [-13.44, 88.03], green: [-65.06, -13.44], blue: [88.03, 294.94] };
  const ANG_EX = { red: [-1.97, 88.03], green: [-69.47, -1.97], blue: [88.03, 290.53] };
  const MK0 = -45.24;                                           // ângulo do marcador original
  const TOURS = [[1, 2, 3, 4, 5, 6, 19], [7, 8, 9, 10, 11, 12, 20], [13, 14, 15, 16, 17, 18, 21]];
  const LABELS = [30, 31, 32], MARKS = [26, 28, 29, 27];        // marcadores: −45°, 45°, 135°, −135°
  const rad = function (a) { return a * Math.PI / 180; };
  const pt = function (a, r) { return [C0[0] + (r || R0) * Math.cos(rad(a)), C0[1] + (r || R0) * Math.sin(rad(a))]; };
  function arc(a0, a1) {
    const s = pt(a0), e = pt(a1);
    return 'M' + C0[0] + ' ' + C0[1] + 'L' + s[0].toFixed(3) + ' ' + s[1].toFixed(3) + 'A' + R0 + ' ' + R0 + ' 0 ' + (a1 - a0 > 180 ? 1 : 0) + ' 1 ' + e[0].toFixed(3) + ' ' + e[1].toFixed(3) + 'Z';
  }
  const norm = function (a) { return ((a % 360) + 360) % 360; };
  function under(ang, rot, mk) {                                // fatia sob o marcador (ângulo mk) com a roleta girada rot
    const phi = norm(mk - rot);
    for (const n of NAMES) { const s = ang[n]; if (norm(phi - s[0]) < s[1] - s[0]) return n; }
    return 'blue';
  }
  const binom = function (n, k, p) { let c = 1; for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1); return c * Math.pow(p, k) * Math.pow(1 - p, n - k); };

  A.define('roleta', function (host) {
    const sus = host.dataset.fig === 'sus';
    const D = A.figData.roleta, frame = host.closest('section');
    // os dois PDFs têm a mesma origem mas alturas diferentes (os marcadores de baixo da SUS)
    const svg = figSvg(host, sus ? { W: 109.158, H: 34.064 } : { W: 109.142, H: 33.526 });
    const own = Own();
    let rot = 0, ang = JSON.parse(JSON.stringify(ANG_PDF)), cur = null;
    const L = {};
    const stats = { n: 0, cnt: { blue: 0, red: 0, green: 0 }, rounds: 0, hr: [0, 0, 0, 0, 0], hs: [0, 0, 0, 0, 0], lastR: null, lastS: null };
    const panel = Panel(host, sus ? 82 : 70);

    function build() {
      svg.textContent = '';
      const items = D.items;
      L.base = S('g', {}, svg);
      L.box = item(L.base, items[0]);
      L.tours = TOURS.map(function (ids) { const g = S('g', {}, L.base); ids.forEach(function (i) { item(g, items[i]); }); return g; });
      L.tc = TOURS.map(function (ids) { return ctr(items[ids[0]]); });
      L.tb = TOURS.map(function (ids) { return items[ids[0]].b; });
      L.labels = LABELS.map(function (i) { return item(L.base, items[i]); });
      L.wheel = S('g', {}, svg);
      L.redLine = S('line', { x1: C0[0], y1: C0[1], stroke: RED, 'stroke-width': 0.4 }, L.wheel);
      L.slices = {};
      ['red', 'blue', 'green'].forEach(function (n) {
        L.slices[n] = S('path', { fill: COL[n], 'fill-opacity': FOP[n], stroke: '#000', 'stroke-width': 0.4 }, L.wheel);
      });
      L.marks = (sus ? MARKS : [MARKS[0]]).map(function (i) { return item(svg, items[i]); });
      L.fx = S('g', {}, svg);
      drawWheel(); setRot(rot);
    }
    function drawWheel() {
      NAMES.forEach(function (n) { L.slices[n].setAttribute('d', arc(ang[n][0], ang[n][1])); });
      const p = pt(ang.blue[0]); L.redLine.setAttribute('x2', p[0]); L.redLine.setAttribute('y2', p[1]);
    }
    function setRot(r) { rot = r; L.wheel.setAttribute('transform', 'rotate(' + r.toFixed(3) + ' ' + C0[0] + ' ' + C0[1] + ')'); }
    const mks = function () { return sus ? [0, 1, 2, 3].map(function (k) { return MK0 + 90 * k; }) : [MK0]; };

    // gira até um ângulo aleatório (2 a 3 voltas); devolve as fatias sob os marcadores
    async function spin(h, dur) {
      const from = rot, to = rot + 720 + Math.random() * 360;
      await h.tween(dur || 2400, function (e) { setRot(lerp(from, to, e)); }, function (t) { return 1 - Math.pow(1 - t, 3); });
      setRot(norm(to));
      return mks().map(function (m) { return under(ang, rot, m); });
    }
    async function showPicks(h, picks) {             // as fatias e as rotas escolhidas piscam (e quantas vezes)
      const counts = {}; picks.forEach(function (n) { counts[n] = (counts[n] || 0) + 1; });
      const jobs = [];
      Object.keys(counts).forEach(function (n) {
        const i = NAMES.indexOf(n);
        jobs.push(pulse(h, L.slices[n], C0, 0.08, 700));
        jobs.push(ring(h, L.fx, L.tb[i], HI, 1400));
        if (sus) {
          const t = text(L.fx, L.tc[i][0], L.tb[i][3] + 3.4, counts[n] + '×', { anchor: 'middle', fs: 3.4, c: COL[n], bold: true });
          jobs.push(h.wait(1400).then(function () { t.remove(); }));
        }
      });
      await h.all(jobs);
    }

    // ---------- painel ----------
    function buildPanel() {
      const P = panel.svg; P.textContent = '';
      if (!sus) {
        text(P, 0, 7, 'Roleta: frequência de escolha', { fs: 7.4, bold: true, c: MYBLUE });
        button(P, 175, 0, 34, 'girar', function () { act(1, true); });
        button(P, 212, 0, 46, 'girar 100×', function () { act(100, false); });
        button(P, 261, 0, 30, 'zerar', function () { reset(); });
        L.pN = text(P, 296, 7.1, '', { fs: 6.1, c: '#444' });
        const BX = 150, BW = 170;
        L.pRows = NAMES.map(function (n, i) {
          const y = 20 + 14 * i;
          S('rect', { x: 0, y: y - 6, width: 7, height: 7, fill: COL[n], 'fill-opacity': FOP[n] + 0.2, stroke: COL[n], 'stroke-width': 0.4 }, P);
          text(P, 10, y, 'fitness ' + FIT[n] + ' → P = ' + FIT[n] + '/80 = ' + fmt(PSEL[n] * 100, 1) + '%', { fs: 6.1 });
          S('rect', { x: BX, y: y - 6.5, width: BW, height: 8, fill: '#f4f6fa', stroke: '#ccd', 'stroke-width': 0.3 }, P);
          const bar = S('rect', { x: BX, y: y - 6.5, width: 0, height: 8, fill: COL[n], 'fill-opacity': FOP[n] + 0.15 }, P);
          const ex = BX + BW * PSEL[n];
          S('line', { x1: ex, x2: ex, y1: y - 8, y2: y + 2.5, stroke: '#000', 'stroke-width': 0.7 }, P);
          const ob = text(P, BX + BW + 5, y, '', { fs: 6.1, c: COL[n] });
          return { bar: bar, ob: ob };
        });
        text(P, 150, 60, '0%', { fs: 5, c: GRAY, anchor: 'middle' }); text(P, 320, 60, '100%', { fs: 5, c: GRAY, anchor: 'middle' });
        text(P, 0, 68, 'barra: frequência obtida · traço preto: probabilidade (fitness / soma). Quanto mais giros, mais a frequência se aproxima de P.', { fs: 5.6, c: '#555' });
      } else {
        text(P, 0, 7, 'Uma rodada = escolher 4 pais. Quantas vezes a rota azul (P = 56,3%) é escolhida por rodada?', { fs: 6.8, bold: true, c: MYBLUE });
        button(P, 0, 11, 36, '1 rodada', function () { act(1, true); });
        button(P, 39, 11, 48, '100 rodadas', function () { act(100, false); });
        button(P, 90, 11, 30, 'zerar', function () { reset(); });
        L.pN = text(P, 126, 18.1, '', { fs: 6.1, c: '#444' });
        L.hist = [hist(P, 0, 'Roleta: 4 giros independentes', 'r'), hist(P, 205, 'SUS: 1 giro, 4 marcadores igualmente espaçados', 's')];
        L.pLast = text(P, 0, 78.5, '', { fs: 5.6, c: '#444' });
      }
    }
    function hist(P, x0, title, key) {
      text(P, x0, 30, title, { fs: 6.2, bold: true, c: '#333' });
      const H0 = 63, HH = 25, BW = 18, GP = 5, bars = [], tx = [];
      const theo = key === 'r' ? [0, 1, 2, 3, 4].map(function (k) { return binom(4, k, PSEL.blue); }) : [0, 0, 0.75, 0.25, 0];
      for (let k = 0; k <= 4; k++) {
        const x = x0 + 4 + k * (BW + GP);
        bars.push(S('rect', { x: x, y: H0, width: BW, height: 0, fill: BLUE, 'fill-opacity': 0.35 }, P));
        S('rect', { x: x, y: H0 - HH * theo[k], width: BW, height: HH * theo[k], fill: 'none', stroke: '#000', 'stroke-width': 0.5, 'stroke-dasharray': '1.4 0.9' }, P);
        tx.push(text(P, x + BW / 2, H0 - 1.5, '', { fs: 5, anchor: 'middle', c: BLUE }));
        text(P, x + BW / 2, H0 + 6.3, String(k), { fs: 5.6, anchor: 'middle' });
      }
      const xe = x0 + 4 + 5 * (BW + GP);
      S('line', { x1: x0 + 1, x2: xe - GP + 2, y1: H0, y2: H0, stroke: '#000', 'stroke-width': 0.4 }, P);
      const mean = text(P, xe + 2, 42, '', { fs: 5.5, c: '#333' });
      text(P, xe + 2, 48.5, 'esperada: 2,25', { fs: 5.5, c: '#333' });
      const sd = text(P, xe + 2, 55, '', { fs: 5.5, c: '#333' });
      text(P, xe + 2, 62, 'pontilhado: teórico', { fs: 4.8, c: GRAY });
      return { bars: bars, tx: tx, H0: H0, HH: HH, mean: mean, sd: sd, key: key };
    }
    function refreshPanel() {
      if (!sus) {
        L.pN.textContent = stats.n ? 'giros: ' + stats.n : '';
        NAMES.forEach(function (n, i) {
          const f = stats.n ? stats.cnt[n] / stats.n : 0;
          L.pRows[i].bar.setAttribute('width', 170 * f);
          L.pRows[i].ob.textContent = stats.n ? 'obtido: ' + fmt(f * 100, 1) + '% (' + stats.cnt[n] + ')' : 'obtido: —';
        });
      } else {
        L.pN.textContent = stats.rounds ? 'rodadas: ' + stats.rounds : '';
        L.hist.forEach(function (H) {
          const arr = H.key === 'r' ? stats.hr : stats.hs, n = stats.rounds;
          let m = 0, m2 = 0;
          arr.forEach(function (c, k) {
            const f = n ? c / n : 0;
            H.bars[k].setAttribute('y', H.H0 - H.HH * f); H.bars[k].setAttribute('height', H.HH * f);
            H.tx[k].textContent = n && c ? fmt(f * 100) + '%' : '';
            H.tx[k].setAttribute('y', H.H0 - H.HH * f - 1.5);
            m += k * c; m2 += k * k * c;
          });
          if (n) { m /= n; m2 /= n; }
          H.mean.textContent = n ? 'média: ' + fmt(m, 2) : 'média: —';
          H.sd.textContent = n ? 'desvio padrão: ' + fmt(Math.sqrt(Math.max(0, m2 - m * m)), 2) : '';
        });
        const nm = { blue: 'azul', red: 'vermelha', green: 'verde' };
        L.pLast.textContent = stats.lastS ? 'última rodada — roleta: ' + stats.lastR.map(function (n) { return nm[n]; }).join(', ')
          + ' · SUS: ' + stats.lastS.map(function (n) { return nm[n]; }).join(', ') : '';
      }
    }
    function reset() {
      own.cancel();
      stats.n = 0; stats.cnt = { blue: 0, red: 0, green: 0 }; stats.rounds = 0; stats.hr = [0, 0, 0, 0, 0]; stats.hs = [0, 0, 0, 0, 0]; stats.lastR = stats.lastS = null;
      L.fx.textContent = '';
      refreshPanel();
    }
    const draw1 = function () { const u = Math.random() * 360; return under(ANG_EX, 0, u); };   // um giro (fatias exatas)
    function record(picksS) {
      if (!sus) { picksS.forEach(function (n) { stats.cnt[n]++; stats.n++; }); return; }
      const picksR = [draw1(), draw1(), draw1(), draw1()];
      stats.hr[picksR.filter(function (n) { return n === 'blue'; }).length]++;
      stats.hs[picksS.filter(function (n) { return n === 'blue'; }).length]++;
      stats.rounds++; stats.lastR = picksR; stats.lastS = picksS;
    }
    function act(times, animate) {
      if (times === 1 && animate && !A.reduce) {
        own.run(async function (h) {
          L.fx.textContent = '';
          const picks = await spin(h, 2000);
          record(picks); refreshPanel();
          await showPicks(h, picks);
        });
        return;
      }
      own.cancel(); L.fx.textContent = '';
      for (let t = 0; t < times; t++) {
        const r0 = Math.random() * 360;
        record(mks().map(function (m) { return under(ANG_EX, r0, m); }));
      }
      setRot(Math.random() * 360);
      refreshPanel();
    }

    // ---------- estados ----------
    function snap(st) {
      own.cancel(); cur = st;
      const step2 = st === 'r2' || st === 's2';
      ang = JSON.parse(JSON.stringify(step2 ? ANG_EX : ANG_PDF));
      // (a rotação fica onde o último giro parou; ao entrar no frame pela animação, a roleta volta à do PDF)
      build();
      if (st === 'r0') { svg.textContent = ''; }
      panel.show(step2);
      if (step2) { buildPanel(); refreshPanel(); }
    }
    async function play(a, b, h) {
      own.cancel(); cur = b;
      if (a === 'r0' && b === 'r1') {
        rot = 0; ang = JSON.parse(JSON.stringify(ANG_PDF)); build(); panel.show(false);
        const hideList = [L.box].concat(L.tours, L.labels, L.marks);
        hideList.forEach(function (e) { e.setAttribute('opacity', 0); });
        NAMES.forEach(function (n) { L.slices[n].setAttribute('opacity', 0); });
        L.redLine.setAttribute('opacity', 0);
        await h.tween(300, function (e) { L.box.setAttribute('opacity', e); });
        for (let i = 0; i < 3; i++) await h.all([popIn(h, L.tours[i], L.tc[i], 380), h.wait(120).then(function () { return popIn(h, L.labels[i], ctr(D.items[LABELS[i]]), 300); })]);
        await h.wait(200);
        // cada fatia nasce da sua rota
        for (const n of ['blue', 'red', 'green']) {
          const i = NAMES.indexOf(n), s = ang[n];
          L.slices[n].setAttribute('opacity', 1);
          await h.all([
            pulse(h, L.tours[i], L.tc[i], 0.18, 650),
            h.tween(650, function (e) { L.slices[n].setAttribute('d', arc(s[0], lerp(s[0] + 0.5, s[1], e))); })
          ]);
          if (n === 'blue') L.redLine.setAttribute('opacity', 1);
        }
        drawWheel();
        await popIn(h, L.marks[0], ctr(D.items[MARKS[0]]), 400);
        await h.wait(300);
        const picks = await spin(h, 2600);
        await showPicks(h, picks);
        return;
      }
      if (a === 'r1' && b === 's1') {
        rot = 0; ang = JSON.parse(JSON.stringify(ANG_PDF)); build(); panel.show(false);
        for (let k = 1; k < 4; k++) L.marks[k].setAttribute('opacity', 0);
        for (let k = 1; k < 4; k++) await popIn(h, L.marks[k], ctr(D.items[MARKS[k]]), 320);
        await h.wait(300);
        const picks = await spin(h, 2600);
        await showPicks(h, picks);
        return;
      }
      if ((a === 'r1' && b === 'r2') || (a === 's1' && b === 's2')) {
        build(); panel.show(false);
        const from = JSON.parse(JSON.stringify(ang));
        buildPanel(); refreshPanel();
        await h.all([
          panel.fadeIn(h),
          h.tween(700, function (e) {
            NAMES.forEach(function (n) { ang[n] = [lerp(from[n][0], ANG_EX[n][0], e), lerp(from[n][1], ANG_EX[n][1], e)]; });
            drawWheel();
          })
        ]);
        return;
      }
      snap(b);
    }
    frame.addEventListener('leave', function () { own.cancel(); });
    window.addEventListener('resize', function () { if (cur === 'r2' || cur === 's2') panel.place(); });
    return { snap: snap, play: play };
  });

  // =====================================================================================================
  // Torneio
  // =====================================================================================================
  const TFIT = [45, 20, 45, 20, 100, 24];
  const TK = 3;
  let PICK = [0, 3, 5];                                         // sorteio do PDF: 45%, 20% (a 4ª), 24%
  // probabilidade de vencer (trios sem repetição, empates divididos) e, para comparar, a da roleta
  const PWIN = (function () {
    const p = [0, 0, 0, 0, 0, 0]; let n = 0;
    for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) for (let c = b + 1; c < 6; c++) {
      const tr = [a, b, c], m = Math.max(TFIT[a], TFIT[b], TFIT[c]), w = tr.filter(function (i) { return TFIT[i] === m; });
      w.forEach(function (i) { p[i] += 1 / w.length; }); n++;
    }
    return p.map(function (v) { return v / n; });
  })();
  const SUMF = TFIT.reduce(function (s, v) { return s + v; }, 0);
  function order(pick) {                                        // do melhor para o pior (empate: sorteio)
    return pick.slice().sort(function (x, y) { return TFIT[y] - TFIT[x] || (Math.random() - 0.5); });
  }
  let ORDER = [0, 5, 3];                                        // PDF: 1º 45% (a 1ª), 2º 24%, 3º 20% (a 4ª)

  A.define('torneio', function (host) {
    const D = A.figData.torneio, frame = host.closest('section');
    const svg = figSvg(host, D), own = Own();
    const st = D.states, items = D.items;
    // grupos: rotas da população (fundo cinza, pontos e traço), rótulos, vagas da caixa e do pódio
    const inT1 = function (i) { return st.Torneio1.indexOf(i) >= 0; };
    const bgs = items.map(function (it, i) { return i; }).filter(function (i) { return inT1(i) && items[i].f === '#d3d3d3'; })
      .sort(function (x, y) { return items[x].b[0] - items[y].b[0]; });
    const POP = bgs.map(function (bi) {
      const b = items[bi].b, ids = [bi];
      items.forEach(function (it, i) {
        if (i === bi || !inT1(i) || it.t !== 'p' || it.f === '#d3d3d3' || it.b[3] > 32) return;
        const c = ctr(it);
        if (c[0] >= b[0] && c[0] <= b[2] && c[1] >= b[1] && c[1] <= b[3]) ids.push(i);
      });
      return { ids: ids, c: ctr(items[bi]), b: b };
    });
    const LAB = items.map(function (it, i) { return i; }).filter(function (i) { return inT1(i) && items[i].t === 'x'; })
      .sort(function (x, y) { return items[x].b[0] - items[y].b[0]; });
    const SLOT = [44, 51, 58].map(function (i) { return ctr(items[i]); });
    const POD = [74, 88, 81].map(function (i) { return ctr(items[i]); });   // 1º, 2º, 3º
    const T2 = [0, 65, 67, 68, 107, 108, 109, 110, 111], T3 = [66, 69, 70, 112, 113, 114, 115];
    const BARS = [72, 73, 71], NUMS = [104, 105, 106];                    // 1º, 2º, 3º
    let cur = null;
    const L = {};
    const stats = { n: 0, win: [0, 0, 0, 0, 0, 0] };
    const panel = Panel(host, 45);

    function copyTour(parent, j, to, withLabel) {             // cópia da rota j com o centro em "to"
      const g = S('g', {}, parent), dx = to[0] - POP[j].c[0], dy = to[1] - POP[j].c[1];
      g.setAttribute('transform', 'translate(' + dx.toFixed(3) + ' ' + dy.toFixed(3) + ')');
      POP[j].ids.forEach(function (i) { item(g, items[i]); });
      if (withLabel) item(g, items[LAB[j]]);
      g.dx = dx; g.dy = dy;
      return g;
    }
    function build(state) {
      svg.textContent = '';
      L.box = item(svg, items[1]);
      L.pop = POP.map(function (P) { const g = S('g', {}, svg); P.ids.forEach(function (i) { item(g, items[i]); }); return g; });
      L.lab = LAB.map(function (i) { return item(svg, items[i]); });
      L.t2 = S('g', {}, svg); L.t3 = S('g', {}, svg);
      T2.forEach(function (i) { item(L.t2, items[i]); });
      T3.forEach(function (i) { item(L.t3, items[i]); });
      L.bars = BARS.map(function (i) { return item(L.t3, items[i]); });
      L.nums = NUMS.map(function (i) { return item(L.t3, items[i]); });
      const pick = PICK.slice().sort(function (x, y) { return x - y; });
      L.slots = S('g', {}, svg);
      L.slotT = pick.map(function (j, k) { return copyTour(L.slots, j, SLOT[k], true); });
      L.podT = S('g', {}, svg);
      L.pod = ORDER.map(function (j, k) { return copyTour(L.podT, j, POD[k], false); });
      L.fx = S('g', {}, svg);
      const lv = { t0: 0, t1: 1, t2: 2, t3: 3, t4: 3 }[state];
      if (lv < 1) { L.box.style.display = 'none'; L.pop.concat(L.lab).forEach(function (e) { e.style.display = 'none'; }); }
      if (lv < 2) { L.t2.style.display = 'none'; L.slots.style.display = 'none'; }
      if (lv < 3) { L.t3.style.display = 'none'; L.podT.style.display = 'none'; }
    }

    // ---------- animações ----------
    async function lottery(h) {                             // o anel salta entre as rotas e para em cada sorteada
      const pick = PICK.slice().sort(function (x, y) { return x - y; });
      const order0 = PICK.slice();                          // ordem do sorteio
      L.slotT.forEach(function (g) { g.style.display = 'none'; });
      L.slots.style.display = '';
      for (const j of order0) {
        let at = Math.floor(Math.random() * 6);
        const hops = 6 + Math.floor(Math.random() * 4);
        for (let k = 0; k < hops; k++) {
          await ring(h, L.fx, POP[at].b, HI, 150);
          at = (at + 1 + Math.floor(Math.random() * 5)) % 6;
        }
        const r = await ring(h, L.fx, POP[j].b, HI, 300, true);
        await pulse(h, L.pop[j], POP[j].c, 0.15, 400);
        const k = pick.indexOf(j), g = L.slotT[k], tx = g.dx, ty = g.dy;
        g.style.display = '';
        await h.tween(650, function (e) {
          g.setAttribute('transform', 'translate(' + lerp(0, tx, e).toFixed(3) + ' ' + lerp(0, ty, e).toFixed(3) + ')');
        });
        r.remove();
      }
    }
    async function podium(h) {
      L.t3.style.display = ''; L.podT.style.display = '';
      L.pod.forEach(function (g) { g.style.display = 'none'; });
      const bx = [L.t3.children[0], L.t3.children[1], L.t3.children[2]].concat(Array.prototype.slice.call(L.t3.querySelectorAll('text')).filter(function (t) { return L.nums.indexOf(t) < 0; }));
      bx.forEach(function (e) { e.setAttribute('opacity', 0); });
      L.bars.concat(L.nums).forEach(function (e) { e.setAttribute('opacity', 0); });
      await h.tween(450, function (e) { bx.forEach(function (x) { x.setAttribute('opacity', e); }); });
      // as barras sobem do chão (3º, 2º, 1º)
      for (const k of [2, 1, 0]) {
        const b = items[BARS[k]].b, bar = L.bars[k];
        bar.setAttribute('opacity', 1);
        await h.tween(350, function (e) { scaleAboutY(bar, b[3], Math.max(0.01, e)); }, E.out);
        bar.removeAttribute('transform');
        L.nums[k].setAttribute('opacity', 1);
      }
      // cada rota sobe ao seu lugar (do 3º ao 1º), partindo da caixa
      const pick = PICK.slice().sort(function (x, y) { return x - y; });
      for (const k of [2, 1, 0]) {
        const j = ORDER[k], g = L.pod[k], s = pick.indexOf(j);
        const from = [L.slotT[s].dx + POP[j].c[0], L.slotT[s].dy + POP[j].c[1]], to = POD[k];
        g.style.display = '';
        await h.tween(700, function (e) {
          const x = lerp(from[0], to[0], e), y = lerp(from[1], to[1], e) - 8 * Math.sin(Math.PI * e);
          g.setAttribute('transform', 'translate(' + (x - POP[j].c[0]).toFixed(3) + ' ' + (y - POP[j].c[1]).toFixed(3) + ')');
        });
        g.setAttribute('transform', 'translate(' + g.dx.toFixed(3) + ' ' + g.dy.toFixed(3) + ')');
      }
      // a vencedora pulsa
      const wb = POP[ORDER[0]].b, pb = [wb[0] + L.pod[0].dx, wb[1] + L.pod[0].dy, wb[2] + L.pod[0].dx, wb[3] + L.pod[0].dy];
      await h.all([ring(h, L.fx, pb, HI, 1200), h.tween(900, function (e) {
        const s = 1 + 0.12 * Math.sin(Math.PI * e * 2);
        L.pod[0].setAttribute('transform', 'translate(' + L.pod[0].dx + ' ' + L.pod[0].dy + ') translate(' + POP[ORDER[0]].c[0] + ' ' + POP[ORDER[0]].c[1] + ') scale(' + s + ') translate(' + (-POP[ORDER[0]].c[0]) + ' ' + (-POP[ORDER[0]].c[1]) + ')');
      }, E.linear)]);
      L.pod[0].setAttribute('transform', 'translate(' + L.pod[0].dx.toFixed(3) + ' ' + L.pod[0].dy.toFixed(3) + ')');
    }
    function scaleAboutY(el, yb, s) { el.setAttribute('transform', 'translate(0 ' + yb + ') scale(1 ' + s + ') translate(0 ' + (-yb) + ')'); }

    // ---------- painel ----------
    function buildPanel() {
      const P = panel.svg; P.textContent = '';
      button(P, 0, 0, 44, 'novo torneio', function () { newTournament(); });
      button(P, 0, 12, 44, '100 torneios', function () { many(100); });
      button(P, 0, 24, 44, 'zerar', function () { own.cancel(); stats.n = 0; stats.win = [0, 0, 0, 0, 0, 0]; refreshPanel(); });
      L.pN = text(P, 0, 43, '', { fs: 5.6, c: '#444' });
      L.cols = POP.map(function (Pp, j) {
        const w = 15;
        const cx = panel.offX + Pp.c[0] / D.W * panel.sc;
        const H0 = 30, HH = 26;
        S('rect', { x: cx - w / 2, y: H0 - HH, width: w, height: HH, fill: '#f4f6fa', stroke: '#dde', 'stroke-width': 0.3 }, P);
        const bar = S('rect', { x: cx - w / 2, y: H0, width: w, height: 0, fill: RED, 'fill-opacity': 0.45 }, P);
        const yt = H0 - HH * PWIN[j] / 0.6;
        S('line', { x1: cx - w / 2 - 1.5, x2: cx + w / 2 + 1.5, y1: yt, y2: yt, stroke: '#000', 'stroke-width': 0.8 }, P);
        const yr = H0 - HH * (TFIT[j] / SUMF) / 0.6;
        S('line', { x1: cx - w / 2 - 1.5, x2: cx + w / 2 + 1.5, y1: yr, y2: yr, stroke: '#9aa', 'stroke-width': 0.7, 'stroke-dasharray': '1.5 0.8' }, P);
        const tt = text(P, cx, H0 + 6, 'teórico ' + fmt(PWIN[j] * 100, 1) + '%', { fs: 4.9, anchor: 'middle' });
        const ob = text(P, cx, H0 + 12, '', { fs: 4.9, anchor: 'middle', c: RED });
        const ro = text(P, cx, H0 + 17.5, 'roleta ' + fmt(TFIT[j] / SUMF * 100, 1) + '%', { fs: 4.6, anchor: 'middle', c: '#8a9a9a' });
        return { bar: bar, ob: ob, H0: H0, HH: HH, tt: tt, ro: ro };
      });
      const lx = panel.offX + panel.sc + 4;
      text(P, lx, 6, 'chance de vencer', { fs: 5.4, bold: true, c: MYBLUE });
      text(P, lx, 12, 'um torneio (k = 3)', { fs: 5.4, bold: true, c: MYBLUE });
      S('rect', { x: lx, y: 15.5, width: 6, height: 4, fill: RED, 'fill-opacity': 0.45 }, P); text(P, lx + 8, 19.3, 'obtido', { fs: 5 });
      S('line', { x1: lx, x2: lx + 6, y1: 23.5, y2: 23.5, stroke: '#000', 'stroke-width': 0.8 }, P); text(P, lx + 8, 25.3, 'teórico', { fs: 5 });
      S('line', { x1: lx, x2: lx + 6, y1: 29, y2: 29, stroke: '#9aa', 'stroke-width': 0.7, 'stroke-dasharray': '1.5 0.8' }, P); text(P, lx + 8, 30.8, 'roleta', { fs: 5 });
    }
    function refreshPanel() {
      L.pN.textContent = stats.n ? stats.n + ' torneios' : '';
      L.cols.forEach(function (c, j) {
        const f = stats.n ? stats.win[j] / stats.n : 0, hh = c.HH * Math.min(1, f / 0.6);
        c.bar.setAttribute('y', c.H0 - hh); c.bar.setAttribute('height', hh);
        c.ob.textContent = stats.n ? 'obtido ' + fmt(f * 100, 1) + '%' : 'obtido —';
      });
    }
    function draw() {
      const all = [0, 1, 2, 3, 4, 5];
      for (let i = 5; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); const x = all[i]; all[i] = all[k]; all[k] = x; }
      return all.slice(0, TK);
    }
    function many(n) {
      own.cancel();
      for (let t = 0; t < n; t++) { const o = order(draw()); stats.win[o[0]]++; stats.n++; }
      refreshPanel();
    }
    function newTournament() {
      PICK = draw(); ORDER = order(PICK);
      stats.win[ORDER[0]]++; stats.n++;
      if (A.reduce) { build('t4'); refreshPanel(); return; }
      own.run(async function (h) {
        build('t1'); L.t2.style.display = '';
        await lottery(h);
        await podium(h);
        refreshPanel();
      });
      refreshPanel();
    }

    // ---------- estados ----------
    function snap(s) {
      own.cancel(); cur = s;
      build(s);
      panel.show(s === 't4');
      if (s === 't4') { buildPanel(); refreshPanel(); }
    }
    async function play(a, b, h) {
      own.cancel(); cur = b;
      if (a === 't0' && b === 't1') {
        build('t1'); panel.show(false);
        L.pop.concat(L.lab).forEach(function (e) { e.setAttribute('opacity', 0); });
        L.box.setAttribute('opacity', 0);
        await h.tween(300, function (e) { L.box.setAttribute('opacity', e); });
        for (let j = 0; j < 6; j++) await h.all([popIn(h, L.pop[j], POP[j].c, 360), h.wait(100).then(function () { return popIn(h, L.lab[j], ctr(items[LAB[j]]), 260); })]);
        return;
      }
      if (a === 't1' && b === 't2') {
        build('t2'); panel.show(false);
        L.slotT.forEach(function (g) { g.style.display = 'none'; });
        const parts = Array.prototype.slice.call(L.t2.children);
        parts.forEach(function (e) { e.setAttribute('opacity', 0); });
        await h.tween(450, function (e) { parts.forEach(function (x) { x.setAttribute('opacity', e); }); });
        await lottery(h);
        return;
      }
      if (a === 't2' && b === 't3') {
        build('t2'); panel.show(false);
        await podium(h);
        return;
      }
      if (a === 't3' && b === 't4') {
        build('t3');
        panel.show(false); panel.place(); buildPanel(); refreshPanel();
        await panel.fadeIn(h);
        return;
      }
      snap(b);
    }
    frame.addEventListener('leave', function () { own.cancel(); });
    window.addEventListener('resize', function () { if (cur === 't4') { panel.place(); buildPanel(); refreshPanel(); } });
    return { snap: snap, play: play };
  });
})();
