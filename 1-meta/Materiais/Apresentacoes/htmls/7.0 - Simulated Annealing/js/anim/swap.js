/* Grafos de vizinhança com o operador swap (slides "Exemplo TSP" e "Exemplo mochila").
 *
 * Geometria copiada das figuras originais (Ipe), em pt. Cada figura é um data-anim:
 *
 *   tsp3     (img/tsp1–4)  TSP com 3 cidades: hexágono com as 6 permutações (tsp1 está deslocada
 *            0.6 pt em relação às demais; usa-se o quadro de tsp2–4)
 *            t0 vazio · t1 (1,2,3) · t2 + vizinhos de (1,2,3) · t3 + vizinhos de (2,1,3) e 321–231 · t4 completo
 *   tspswap  (img/tsp_swap1–4)  vizinhança de (1,2,3,4) com 4 cidades
 *            w0 vazio · w1 (1,2,3,4) · w2 + 6 vizinhos · w3 dois caminhos de 2 movimentos até (1,3,4,2)
 *            · w4 caminho com 4 movimentos
 *            Correção em relação ao PDF: o vizinho swap(1,2) é (2,1,3,4) (no Ipe estava (2,1,4,3), que não
 *            é vizinho), e o caminho longo passa por um nó novo (2,1,4,3): 4 movimentos. Por paridade, todo
 *            caminho entre (1,2,3,4) e (1,3,4,2) tem número par de swaps.
 *   ksA      (img/knapsack1–3)  mochila: vizinhança de (0,1,1,0)
 *            k0 vazio · k1 (0,1,1,0) · k2 + vizinhos · k3 + "????" e (1,1,1,0) · k3n idem, "????" balança
 *            (como no PDF, o grafo inclui um nó (0,1,1,0), resultado de swap(1,4), que troca dois zeros)
 *   ksB      (img/knapsack4–5)  vizinhança de (1,1,1,0): b0 vazio · b1 (1,1,1,0) · b2 + vizinhos
 *   ksC      (img/knapsack6–7)  os dois grafos lado a lado, sem rótulos:
 *            c0 vazio · c1 grafos (entram deslizando) · c2 + contornos e arco
 *   viz      (img/vizinhanca1–9)  grafos genéricos sem rótulos (vizinhança = arestas do grafo):
 *            v1 N1 · v2 N2 · v3 N1 e N2 sobrepostos · v4 N2 desconectado · v5 N1 com infactíveis em vermelho
 *            · v6 + "Sol. inicial/ótima" · v7 caminho de 4 movimentos · v8 atalho de 2 por um nó infactível
 *            · v9 sem a aresta h–j: o ótimo só é alcançável por nós infactíveis (que pulsam)
 *
 * Ao surgir um vizinho, o rótulo nasce igual ao do nó de origem e os dois elementos trocados mudam
 * de posição (um por cima, outro por baixo). Clicar num nó mostra sua vizinhança swap (nas figuras
 * sem rótulos, mostra também os rótulos do nó e dos vizinhos).
 */
(function () {
  'use strict';
  const A = window.Anim;
  const BLACK = '#000000', NAVY = '#00008b', DARKRED = '#8b0000', BRICK = '#d0281a', MYBLUE = '#0061a5', WHITE = '#ffffff';
  // larguras do KaTeX_Main (em em): '(' e ')' 0.389, ',' 0.278, algarismos 0.5
  const slotEm = function (i) { return 0.389 + i * 0.778; };
  const commaEm = function (i) { return 0.889 + i * 0.778; };
  const labelEm = function (n) { return 0.778 + n * 0.5 + (n - 1) * 0.278; };

  const ckey = function (a, b) { return a < b ? a + '-' + b : b + '-' + a; };
  const diff = function (a, b) { const d = []; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d.push(i); return d; };

  function polyLen(pts) {
    let L = 0;
    for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return L;
  }
  function polyAt(pts, s) { // pontos da polilinha até o comprimento s
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (s <= l) { const t = l ? s / l : 1; out.push([A.lerp(a[0], b[0], t), A.lerp(a[1], b[1], t)]); return out; }
      s -= l; out.push(b);
    }
    return out;
  }
  const ptsAttr = function (pts) { return pts.map(function (p) { return p[0].toFixed(3) + ',' + p[1].toFixed(3); }).join(' '); };

  // ---------- figuras ----------
  const RING_BIG = { r: 2.5, sw: 1 }, RING_KS = { r: 2.4, sw: 1.2 }, RING_SMALL = { r: 0.93, sw: 0.54 };
  // rótulo abaixo do nó, como nas figuras da mochila (linha de base 8.04 pt abaixo, à esquerda 8.67 pt)
  function ksNodes(P) { const n = {}; for (const k in P) { const p = P[k]; n[k] = { p: p, l: [p[0] - 8.67, p[1] + 8.04] }; } return n; }

  const FIGS = {
    tsp3: {
      W: 105.016, H: 72.4, SCALE: 1.7, fs: 4.98, ring: RING_BIG, edge: { c: NAVY, w: 0.8 },
      aria: 'Grafo da vizinhança swap das permutações de 3 cidades',
      nodes: {
        '123': { p: [36.82, 60.2], l: [25.0, 68.9] }, '132': { p: [68.82, 60.2], l: [65.0, 68.9] },
        '213': { p: [20.82, 36.2], l: [1.0, 36.9] }, '312': { p: [84.82, 36.2], l: [89.0, 36.9] },
        '231': { p: [36.82, 12.2], l: [29.0, 4.9] }, '321': { p: [68.82, 12.2], l: [65.0, 4.9] }
      },
      states: (function () {
        // 'a-b': a aresta cresce a partir de a (se ambos já existem) — ordem = ordem na animação
        const E2 = ['123-213', '123-321', '123-132'];             // swap(1,2), swap(1,3), swap(2,3)
        const E3 = E2.concat(['213-312', '213-231', '321-231']);
        const E4 = E3.concat(['132-312', '321-312', '132-231']);
        const V = ['123', '213', '321', '132', '312', '231'];
        return {
          t0: { V: [], E: [] }, t1: { V: ['123'], E: [] },
          t2: { V: V.slice(0, 4), E: E2 }, t3: { V: V, E: E3 }, t4: { V: V, E: E4 }
        };
      })()
    },
    tspswap: {
      W: 133.2536, H: 61.756, SCALE: 1.7, fs: 4.98, ring: RING_BIG, edge: { c: NAVY, w: 0.8 },
      aria: 'Vizinhança swap da permutação (1,2,3,4) e caminhos até (1,3,4,2)',
      nodes: (function () {
        const n = {}, P = {
          '1234': [53.91, 23.84], '2134': [17.91, 3.84], '3214': [17.91, 23.84], '4231': [17.91, 43.84],
          '1324': [89.91, 3.84], '1432': [89.91, 23.84], '1243': [89.91, 43.84], '1342': [121.91, 3.84]
        };
        // caixa 20×8 logo abaixo do nó; rótulo com a linha de base 9.39 pt abaixo do nó
        for (const k in P) { const p = P[k]; n[k] = { p: p, box: [p[0] - 10.05, p[1] + 4.07], l: [p[0] - 9.19, p[1] + 9.39] }; }
        // nó novo (correção): na linha de baixo do caminho, com a caixa acima, alinhada às de baixo
        n['2143'] = { p: [53.91, 59.84], box: [43.86, 47.91], l: [44.72, 53.23] };
        return n;
      })(),
      // arestas que não são retas (sentido: do primeiro para o segundo nó da chave)
      poly: {
        '2134-2143': [[17.91, 3.84], [1.91, 3.84], [1.91, 59.84], [53.91, 59.84]],
        '1243-2143': [[89.91, 43.84], [89.91, 59.84], [53.91, 59.84]]
      },
      states: (function () {
        const N = ['2134', '3214', '4231', '1324', '1432', '1243'];
        const E2 = N.map(function (v) { return '1234-' + v; });
        const V2 = ['1234'].concat(N);
        return {
          w0: { V: [], E: [] }, w1: { V: ['1234'], E: [] },
          w2: { V: V2, E: E2 },
          w3: { V: V2.concat(['1342']), E: E2.concat(['1324-1342', '1243-1342']), hl: ['1234', '1342'],
            red: ['1234-1324', '1324-1342', '1234-1243', '1243-1342'],
            paths: [['1234', '1324', '1342'], ['1234', '1243', '1342']] },
          w4: { V: V2.concat(['1342', '2143']), E: E2.concat(['1243-1342', '2134-2143', '2143-1243']), hl: ['1234', '1342'],
            red: ['1234-2134', '2134-2143', '2143-1243', '1243-1342'],
            paths: [['1234', '2134', '2143', '1243', '1342']] }
        };
      })()
    },
    ksA: {
      W: 88.4, H: 64.399, SCALE: 1.9, fs: 4.98, ring: RING_KS, edge: { c: BLACK, w: 0.4 },
      aria: 'Vizinhança swap da solução (0,1,1,0) da mochila',
      nodes: (function () {
        const n = ksNodes({ '0110': [44.2, 20.2], '1010': [12.2, 4.2], '1100': [12.2, 20.2], '0110b': [12.2, 36.2],
          '0011': [76.2, 20.2], '0101': [76.2, 36.2], '1110': [44.2, 52.2] });
        n['0110b'].lab = '0110'; n['0110b'].sw = [0, 3];   // swap(1,4): troca dois zeros
        return n;
      })(),
      decos: {
        // caixa "????" sobre a aresta (0,1,1,0)–(1,1,1,0); surge quando a aresta termina de crescer
        q: { kind: 'pop', c: [44.36, 37.33], edge: '0110-1110', make: function (g) {
          A.svg('rect', { x: 38.64, y: 33.82, width: 11.08, height: 6.75, fill: WHITE }, g);
          const r = A.svg('rect', { x: 38.85, y: 33.98, width: 11.03, height: 6.71, fill: NAVY, 'fill-opacity': 0.3, stroke: BLACK, 'stroke-width': 0.4 }, g);
          const t = A.svg('text', { x: 39.33, y: 39.44, 'font-family': 'KaTeX_Main, serif', 'font-size': 4.98 }, g);
          t.textContent = '????';
          return { tint: function (k) { r.setAttribute('fill', A.mix(NAVY, BRICK, k)); } };
        } }
      },
      states: (function () {
        const N = ['1010', '1100', '0110b', '0011', '0101'];       // swap(1,2), (1,3), (1,4), (2,4), (3,4)
        const E2 = N.map(function (v) { return '0110-' + v; });
        const V2 = ['0110'].concat(N);
        return {
          k0: { V: [], E: [] }, k1: { V: ['0110'], E: [] }, k2: { V: V2, E: E2 },
          k3: { V: V2.concat(['1110']), E: E2.concat(['0110-1110']), deco: ['q'] },
          k3n: { V: V2.concat(['1110']), E: E2.concat(['0110-1110']), deco: ['q'], shake: 'q' }
        };
      })()
    },
    ksB: {
      W: 88.4, H: 44.399, SCALE: 2.0, fs: 4.98, ring: RING_KS, edge: { c: BLACK, w: 0.4 },
      aria: 'Vizinhança swap da solução (1,1,1,0) da mochila',
      nodes: ksNodes({ '1110': [44.2, 20.2], '0111': [12.2, 20.2], '1011': [12.2, 4.2], '1101': [76.2, 20.2] }),
      states: {
        b0: { V: [], E: [] }, b1: { V: ['1110'], E: [] },
        b2: { V: ['1110', '0111', '1011', '1101'], E: ['1110-0111', '1110-1011', '1110-1101'] }  // swap(1,4), (2,4), (3,4)
      }
    },
    ksC: {
      W: 86.577, H: 36.769, SCALE: 2.5, fs: 3.2, ring: RING_SMALL, edge: { c: NAVY, w: 0.4 }, hideLabels: true,
      aria: 'Os grafos de vizinhança de (1,1,1,0) e de (0,1,1,0) lado a lado',
      groups: { L: -34, R: 34 },          // deslocamento horizontal de entrada de cada grafo
      nodes: (function () {
        const P = {
          L1110: [24.2, 20.2], L1011: [8.2, 12.2], L0111: [8.2, 20.2], L1101: [40.2, 20.2],
          R0110: [64.2, 20.2], R1010: [48.2, 12.2], R1100: [48.2, 20.2], R0110b: [48.2, 28.2], R0011: [80.2, 20.2], R0101: [80.2, 28.2]
        };
        const n = {};
        for (const k in P) {
          const p = P[k], w = labelEm(4) * 3.2;
          n[k] = { p: p, lab: k.slice(1, 5), grp: k[0], l: [Math.min(86.4 - w, Math.max(0.2, p[0] - w / 2)), p[1] - 2.3] };
        }
        return n;
      })(),
      decos: {
        blobL: { kind: 'fade', under: true, c: [22, 19], make: function (g) {
          A.svg('path', { d: 'M4.20,12.20 C8.20,8.20 12.20,8.20 15.53,8.86 C18.87,9.53 21.53,10.86 23.53,12.20 C25.53,13.53 26.87,14.86 28.20,15.53 C29.53,16.20 30.87,16.20 32.87,16.20 C34.87,16.20 37.53,16.20 39.27,16.46 C41.01,16.73 41.82,17.26 42.38,18.01 C42.95,18.75 43.26,19.70 43.33,20.47 C43.39,21.24 43.20,21.85 42.95,22.27 C42.69,22.70 42.38,22.95 41.87,23.24 C41.37,23.52 40.67,23.84 40.04,23.96 C39.41,24.09 38.84,24.03 38.16,23.90 C37.48,23.77 36.69,23.58 36.17,23.44 C35.64,23.30 35.39,23.21 34.96,23.33 C34.54,23.46 33.94,23.80 33.40,24.07 C32.86,24.34 32.39,24.53 31.85,24.93 C31.31,25.32 30.71,25.92 29.97,26.41 C29.22,26.90 28.34,27.28 27.22,27.63 C26.09,27.98 24.74,28.30 23.82,28.45 C22.90,28.61 22.43,28.61 22.09,28.58 C21.76,28.55 21.57,28.49 20.61,28.53 C19.64,28.58 17.90,28.74 16.61,28.68 C15.31,28.61 14.46,28.33 13.75,27.89 C13.03,27.44 12.47,26.84 11.77,26.18 C11.07,25.51 10.25,24.79 9.46,24.44 C8.67,24.09 7.91,24.12 7.20,24.09 C6.49,24.06 5.83,23.96 5.16,23.63 C4.50,23.30 3.83,22.73 3.22,22.04 C2.60,21.34 2.03,20.52 1.75,19.58 C1.46,18.65 1.46,17.61 1.70,16.74 C1.94,15.87 2.41,15.17 2.70,14.68 C2.98,14.19 3.07,13.91 4.20,12.20 Z',
            fill: NAVY, 'fill-opacity': 0.1, stroke: NAVY, 'stroke-width': 0.4, 'stroke-dasharray': '1 3' }, g);
        } },
        blobR: { kind: 'fade', under: true, c: [65, 21], make: function (g) {
          A.svg('path', { d: 'M54.49,8.22 C47.38,7.65 46.43,9.02 45.79,10.15 C45.16,11.28 44.85,12.17 44.97,12.94 C45.10,13.72 45.67,14.38 46.24,14.94 C46.81,15.49 47.38,15.93 47.47,16.49 C47.57,17.04 47.18,17.70 46.77,18.32 C46.36,18.94 45.92,19.51 45.73,20.11 C45.54,20.71 45.60,21.34 45.70,21.86 C45.79,22.38 45.92,22.79 46.17,23.30 C46.43,23.81 46.81,24.41 46.85,24.90 C46.90,25.39 46.62,25.77 46.21,26.35 C45.79,26.94 45.26,27.73 45.22,28.56 C45.19,29.40 45.67,30.29 46.47,31.06 C47.28,31.84 48.42,32.50 49.78,33.01 C51.14,33.51 52.72,33.86 54.11,33.20 C55.50,32.53 56.70,30.86 58.46,29.80 C60.21,28.74 62.52,28.30 64.24,28.15 C65.97,28.01 67.11,28.17 68.42,28.47 C69.73,28.77 71.22,29.21 72.66,29.80 C74.09,30.38 75.49,31.11 77.00,31.39 C78.52,31.68 80.17,31.52 81.27,31.22 C82.38,30.92 82.95,30.48 83.36,29.70 C83.77,28.93 84.02,27.82 83.83,26.97 C83.64,26.11 83.01,25.51 83.04,24.63 C83.07,23.74 83.77,22.57 84.21,21.29 C84.66,20.01 84.85,18.62 84.28,17.42 C83.71,16.22 82.38,15.21 80.32,14.57 C78.27,13.94 75.49,13.69 73.27,14.11 C71.06,14.54 69.41,15.65 67.79,15.74 C66.16,15.84 64.54,14.92 62.86,12.99 C61.18,11.06 59.42,8.12 54.49,8.22 Z',
            fill: NAVY, 'fill-opacity': 0.1, stroke: NAVY, 'stroke-width': 0.4, 'stroke-dasharray': '1 3' }, g);
        } },
        arc: { kind: 'draw', make: function (g) {
          A.svg('path', { d: 'M22.46,11.05 C34.94,-1.62 55.33,-1.77 68.00,10.71 C69.13,11.82 70.17,13.01 71.12,14.28',
            fill: 'none', stroke: NAVY, 'stroke-width': 0.4 }, g);
        } }
      },
      states: (function () {
        const V = ['L1110', 'L1011', 'L0111', 'L1101', 'R0110', 'R1010', 'R1100', 'R0110b', 'R0011', 'R0101'];
        const E = ['L1110-L1011', 'L1110-L0111', 'L1110-L1101',
          'R0110-R1010', 'R0110-R1100', 'R0110-R0110b', 'R0110-R0011', 'R0110-R0101'];
        return {
          c0: { V: [], E: [] }, c1: { V: V, E: E, enter: 'slide' },
          c2: { V: V, E: E, deco: ['blobL', 'blobR', 'arc'] }
        };
      })()
    },
    viz: {
      // img/vizinhanca1–9: grafos genéricos (sem rótulos), N1 em azul e N2 em vermelho
      W: 88.4, H: 48.4, SCALE: 2.5, fs: 3, ring: RING_SMALL, edge: { c: NAVY, w: 0.4 }, noLabels: true, adj: 'edges', tempo: 0.6,
      mark: { tok: 1.0, cr: 1.9, cfs: 2.7 },
      aria: 'Grafos de vizinhança N1 e N2, soluções infactíveis e caminhos até a solução ótima',
      nodes: (function () {
        const n = {}, P1 = { a: [12.2, 12.2], b: [12.2, 40.2], c: [20.2, 28.2], d: [28.2, 16.2], e: [28.2, 4.2], f: [28.2, 40.2],
          g: [4.2, 24.2], h: [44.2, 32.2], i: [44.2, 44.2], j: [52.2, 8.2], k: [60.2, 24.2] };
        const P2 = { p: [12.2, 20.2], q: [12.2, 32.2], r: [20.2, 36.2], s: [28.2, 8.2], t: [4.2, 40.2], u: [40.2, 20.2],
          w1: [44.2, 8.2], w2: [56.2, 20.2], x1: [48.2, 36.2], x2: [56.2, 28.2], x3: [64.2, 32.2] };
        for (const k in P1) n[k] = { p: P1[k], c: NAVY };
        for (const k in P2) n[k] = { p: P2[k], c: DARKRED };
        return n;
      })(),
      ecol: function (k) { return /^[p-x]/.test(k) ? DARKRED : NAVY; },   // arestas de N2 (nós p…x) em vermelho
      decos: (function () {
        function N(g, y, color, sub) {
          const t = A.svg('text', { x: 69.93, y: y, fill: color, 'font-family': 'KaTeX_Math, serif', 'font-style': 'italic', 'font-size': 6.28 }, g);
          t.textContent = 'N';
          const s = A.svg('text', { x: 75.08, y: y + 0.7, fill: color, 'font-family': 'KaTeX_Main, serif', 'font-size': 4.18 }, g);
          s.textContent = sub;
        }
        function T(g, x, y, s) { const t = A.svg('text', { x: x, y: y, 'font-family': 'KaTeX_Main, serif', 'font-size': 2.87 }, g); t.textContent = s; }
        return {
          n1: { kind: 'fade', c: [73, 5], make: function (g) { N(g, 7.42, NAVY, '1'); } },
          n2: { kind: 'fade', c: [73, 13], make: function (g) { N(g, 15.42, DARKRED, '2'); } },
          si: { kind: 'pop', c: [8, 8], make: function (g) { T(g, 5.46, 7.19, 'Sol.'); T(g, 5.46, 10.01, 'inicial'); } },
          so: { kind: 'pop', c: [55, 4.5], make: function (g) { T(g, 48.54, 5.54, 'Sol.'); T(g, 54.6, 5.54, 'ótima'); } }
        };
      })(),
      states: (function () {
        const V1 = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'];
        // ordem de crescimento: busca em largura a partir de a
        const E1 = ['a-c', 'a-d', 'a-e', 'a-g', 'c-b', 'c-f', 'd-i', 'd-j', 'e-j', 'g-b', 'g-k', 'f-h', 'f-i', 'h-j', 'j-k'];
        const V2 = ['p', 'q', 'r', 's', 't', 'u'], E2 = ['p-q', 'p-s', 'p-u', 'q-r', 'q-t', 'r-u', 's-u'];
        const V2x = V2.concat(['w1', 'w2', 'x1', 'x2', 'x3']), E2x = E2.concat(['w1-w2', 'x1-x2', 'x2-x3']);
        const bad = ['d', 'e', 'k'], lab = ['n1', 'si', 'so'];
        const E9 = E1.filter(function (k) { return k !== 'h-j'; });
        return {
          v0: { V: [], E: [] },
          v1: { V: V1, E: E1, deco: ['n1'] },
          v2: { V: V2, E: E2, deco: ['n2'] },
          v3: { V: V1.concat(V2), E: E1.concat(E2), deco: ['n1', 'n2'], fadeIn: true },
          v4: { V: V2x, E: E2x, deco: ['n2'] },
          v5: { V: V1, E: E1, deco: ['n1'], bad: bad, fadeIn: true },
          v6: { V: V1, E: E1, deco: lab, bad: bad, pulse: ['a', 'j'] },
          v7: { V: V1, E: E1, deco: lab, bad: bad, red: ['a-c', 'c-f', 'f-h', 'h-j'], paths: [['a', 'c', 'f', 'h', 'j']] },
          v8: { V: V1, E: E1, deco: lab, bad: bad, red: ['a-e', 'e-j'], paths: [['a', 'e', 'j']] },
          v9: { V: V1, E: E9, deco: lab, bad: bad, pulse: bad }
        };
      })()
    }
  };

  function factory(F) {
    return function (host) {
      const FS = F.fs, poly = F.poly || {}, decos = F.decos || {};
      const slotX = function (i) { return slotEm(i) * FS; }, commaX = function (i) { return commaEm(i) * FS; };
      const root = A.svg('svg', { viewBox: '0 0 ' + F.W + ' ' + F.H, role: 'img', 'aria-label': F.aria });
      root.style.width = (F.W * F.SCALE) + 'pt'; root.style.height = (F.H * F.SCALE) + 'pt';
      host.appendChild(root);
      const gHi = A.svg('g', {}, root);       // destaques da interação
      const gDU = A.svg('g', {}, root);       // decorações por baixo (contornos)
      const gMain = A.svg('g', {}, root);
      const gDO = A.svg('g', {}, root);       // decorações por cima (caixa "????", arco)
      const gX = A.svg('g', {}, root);        // ficha e contadores de movimentos
      // camadas por grupo (nas figuras com dois grafos, cada um pode se mover inteiro)
      const groups = {};
      function lay(grp) {
        grp = grp || '';
        if (!groups[grp]) {
          const c = A.svg('g', {}, gMain);
          groups[grp] = { c: c, E: A.svg('g', {}, c), O: A.svg('g', {}, c), B: A.svg('g', {}, c), V: A.svg('g', {}, c),
            L: A.svg('g', { 'font-family': 'KaTeX_Main, serif', 'font-size': FS }, c) };
        }
        return groups[grp];
      }

      const NODES = F.nodes, ALLV = Object.keys(NODES);
      const lab = function (v) { return NODES[v].lab || v; };
      const T = F.tempo || 1;                                    // fator de duração do crescimento
      const MK = F.mark || { tok: 1.7, cr: 2.5, cfs: 3.6 };      // ficha e contadores
      const ecol = function (k) { return F.ecol ? F.ecol(k) : F.edge.c; };
      const ncol = function (v, S) { return S && S.bad && S.bad.indexOf(v) >= 0 ? DARKRED : (NODES[v].c || BLACK); };
      const allE = {};
      Object.keys(F.states).forEach(function (s) { F.states[s].E.forEach(function (k) { const ab = k.split('-'); allE[ckey(ab[0], ab[1])] = true; }); });

      function edgePts(a, b) { // pontos da aresta no sentido a → b
        const k = a + '-' + b, r = b + '-' + a;
        if (poly[k]) return poly[k];
        if (poly[r]) return poly[r].slice().reverse();
        return [NODES[a].p, NODES[b].p];
      }
      // índices trocados de a para b (ou o swap declarado no nó, quando ele não muda nada)
      function swapIdx(a, b) {
        const d = diff(lab(a), lab(b));
        if (d.length === 2) return d;
        if (d.length === 0 && NODES[b].sw) return NODES[b].sw;
        return null;
      }
      const isNb = function (u, v) {
        if (F.adj === 'edges') return F.states[state].E.some(function (k) { const ab = k.split('-'); return ckey(ab[0], ab[1]) === ckey(u, v); });
        return diff(lab(u), lab(v)).length === 2;
      };

      // ----- elementos -----
      const edges = {}, verts = {}, boxes = {}, labels = {}, dec = {};
      Object.keys(allE).forEach(function (k) {
        const ab = k.split('-');
        edges[k] = A.svg('polyline', { points: ptsAttr(edgePts(ab[0], ab[1])), fill: 'none', stroke: ecol(k), 'stroke-width': F.edge.w },
          lay(NODES[ab[0]].grp).E);
      });
      ALLV.forEach(function (v) {
        const N = NODES[v], Lg = lay(N.grp);
        const g = A.svg('g', { class: 'tsp-v', 'data-interactive': '' }, Lg.V);
        A.svg('circle', { r: Math.max(4.5, F.ring.r * 2.4), fill: 'transparent' }, g);   // área de clique maior
        g._ring = A.svg('circle', { r: F.ring.r, fill: WHITE, stroke: ncol(v), 'stroke-width': F.ring.sw }, g);
        g.addEventListener('click', function (e) { e.stopPropagation(); toggleFocus(v); });
        verts[v] = g;
        if (N.box) boxes[v] = A.svg('rect', { x: N.box[0], y: N.box[1], width: 20, height: 8, fill: WHITE, stroke: BLACK, 'stroke-width': 0.4 }, Lg.B);
        if (F.noLabels) { labels[v] = A.svg('g', {}, Lg.L); labels[v]._d = []; labels[v].style.display = 'none'; return; }
        // rótulo: um <text> por caractere, para os elementos poderem trocar de lugar
        const t = A.svg('g', F.hideLabels ? { stroke: WHITE, 'stroke-width': 0.8, 'paint-order': 'stroke' } : {}, Lg.L);
        const n = lab(v).length, x0 = N.l[0], y0 = N.l[1];
        const ch = function (s, x) { const e = A.svg('text', { x: x0 + x, y: y0 }, t); e.textContent = s; return e; };
        ch('(', 0);
        for (let i = 0; i < n - 1; i++) ch(',', commaX(i));
        ch(')', slotX(n - 1) + 0.5 * FS);
        t._d = [];
        for (let i = 0; i < n; i++) t._d.push(ch('', slotX(i)));
        t._x0 = x0; t._y0 = y0;
        labels[v] = t;
      });
      Object.keys(decos).forEach(function (k) {
        const g = A.svg('g', {}, decos[k].under ? gDU : gDO);
        dec[k] = { g: g, api: decos[k].make(g) || {} };
      });
      const token = A.svg('circle', { r: MK.tok, fill: MYBLUE, opacity: 0 }, gX);

      let state = null, focus = null;
      const show = function (el, on) { el.style.display = on ? '' : 'none'; };
      const place = function (v, s) { const p = NODES[v].p; verts[v].setAttribute('transform', 'translate(' + p[0] + ' ' + p[1] + ')' + (s != null ? ' scale(' + Math.max(0.001, s) + ')' : '')); };
      const boxFill = function (k) { return A.mix(WHITE, NAVY, 0.3 * k); };   // azul com opacidade 0.3, como no PDF
      const scaleAt = function (c, s) { return 'translate(' + c[0] + ' ' + c[1] + ') scale(' + Math.max(0.001, s) + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')'; };

      function setLabel(v, perm) { // reescreve o rótulo, sem destaques
        const t = labels[v];
        t._d.forEach(function (d, i) {
          d.textContent = perm[i];
          d.setAttribute('x', t._x0 + slotX(i)); d.setAttribute('y', t._y0);
          d.removeAttribute('fill'); d.removeAttribute('font-weight');
        });
      }
      function setEdge(k, color, frac, from) { // frac do comprimento, crescendo a partir de "from"
        const ab = k.split('-'), a = from || ab[0], b = a === ab[0] ? ab[1] : ab[0];
        const pts = edgePts(a, b);
        edges[k].setAttribute('points', ptsAttr(frac >= 1 ? pts : polyAt(pts, polyLen(pts) * frac)));
        if (color) edges[k].setAttribute('stroke', color);
      }
      function resetDeco(k, on) {
        const d = dec[k]; show(d.g, on);
        d.g.removeAttribute('transform'); d.g.style.opacity = '';
        if (d.api.tint) d.api.tint(0);
        const p = d.g.querySelector('path');
        if (p && decos[k].kind === 'draw') { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; }
      }

      // ----- estado final, sem animação -----
      function snap(name) {
        const S = F.states[name]; state = name;
        clearFocus();
        const inE = {}; S.E.forEach(function (k) { const ab = k.split('-'); inE[ckey(ab[0], ab[1])] = true; });
        const red = {}; (S.red || []).forEach(function (k) { const ab = k.split('-'); red[ckey(ab[0], ab[1])] = true; });
        Object.keys(edges).forEach(function (k) {
          show(edges[k], !!inE[k]); setEdge(k, red[k] ? DARKRED : ecol(k), 1); edges[k].style.opacity = '';
        });
        ALLV.forEach(function (v) {
          const on = S.V.indexOf(v) >= 0;
          show(verts[v], on); show(labels[v], on && !F.hideLabels && !F.noLabels); place(v);
          verts[v].style.opacity = ''; labels[v].style.opacity = '';
          verts[v]._ring.setAttribute('stroke', ncol(v, S));
          setLabel(v, lab(v));
          if (boxes[v]) {
            show(boxes[v], on); boxes[v].style.opacity = '';
            boxes[v].setAttribute('fill', boxFill(S.hl && S.hl.indexOf(v) >= 0 ? 1 : 0));
          }
        });
        Object.keys(groups).forEach(function (g) { groups[g].c.removeAttribute('transform'); groups[g].c.style.opacity = ''; });
        Object.keys(dec).forEach(function (k) { resetDeco(k, !!(S.deco && S.deco.indexOf(k) >= 0)); });
        Object.keys(groups).forEach(function (g) { const O = groups[g].O; while (O.firstChild) O.removeChild(O.firstChild); });
        clearCounters();
        token.setAttribute('opacity', 0);
      }

      // ----- peças da animação -----
      async function swapDigits(h, v, idx) {
        // os dois elementos nas posições idx trocam de lugar (um por cima, outro por baixo)
        const t = labels[v], i = idx[0], j = idx[1];
        const di = t._d[i], dj = t._d[j], xi = t._x0 + slotX(i), xj = t._x0 + slotX(j), y = t._y0, arc = 0.48 * FS;
        [di, dj].forEach(function (d) { d.setAttribute('fill', BRICK); d.setAttribute('font-weight', 'bold'); });
        await h.wait(180);
        await h.tween(560, function (e) {
          const a = arc * Math.sin(Math.PI * e);
          di.setAttribute('x', A.lerp(xi, xj, e)); di.setAttribute('y', y - a);
          dj.setAttribute('x', A.lerp(xj, xi, e)); dj.setAttribute('y', y + a);
        });
        t._d[i] = dj; t._d[j] = di;
        fadeDigits(h, [di, dj], BRICK).catch(function () {});
      }
      function fadeDigits(h, ds, color) {
        return h.wait(900).then(function () {
          ds.forEach(function (d) { d.removeAttribute('font-weight'); });
          return h.tween(500, function (e) { ds.forEach(function (d) { d.setAttribute('fill', A.mix(color, BLACK, e)); }); });
        }).then(function () { ds.forEach(function (d) { d.removeAttribute('fill'); }); });
      }
      function flashDigits(h, v, from, color) { // destaca, no rótulo de v, os elementos que diferem de "from"
        if (F.noLabels) return Promise.resolve();
        const ds = diff(lab(from), lab(v)).map(function (i) { return labels[v]._d[i]; });
        ds.forEach(function (d) { d.setAttribute('fill', color); d.setAttribute('font-weight', 'bold'); });
        return fadeDigits(h, ds, color);
      }
      async function popVertex(h, v, from, hl) {
        const idx = from && !F.noLabels ? swapIdx(from, v) : null;
        show(verts[v], true); show(labels[v], !F.hideLabels && !F.noLabels);
        setLabel(v, idx ? lab(from) : lab(v));
        labels[v].style.opacity = 0;
        if (boxes[v]) { show(boxes[v], true); boxes[v].style.opacity = 0; boxes[v].setAttribute('fill', boxFill(hl ? 1 : 0)); }
        await h.tween(340 * Math.max(T, 0.8), function (e, t) {
          place(v, e);
          const o = Math.min(1, t * 1.6);
          labels[v].style.opacity = o; if (boxes[v]) boxes[v].style.opacity = o;
        }, A.ease.back);
        place(v);
        if (idx && !F.hideLabels) await swapDigits(h, v, idx);
      }
      function growEdge(h, k, from, color, dur, onTip) {
        const ab = k.split('-'), b = from === ab[0] ? ab[1] : ab[0];
        const pts = edgePts(from, b), L = polyLen(pts);
        edges[k].style.opacity = ''; setEdge(k, color, 0, from); show(edges[k], true);
        return h.tween(dur || 400, function (e) {
          const q = polyAt(pts, L * e);
          edges[k].setAttribute('points', ptsAttr(q));
          if (onTip) onTip(q[q.length - 1]);
        });
      }
      function paintOver(h, k, from, dur, onTip) { // traço vermelho percorre uma aresta já existente
        const ab = k.split('-'), b = from === ab[0] ? ab[1] : ab[0];
        const pts = edgePts(from, b), L = polyLen(pts);
        const O = lay(NODES[ab[0]].grp).O;
        const o = A.svg('polyline', { fill: 'none', stroke: DARKRED, 'stroke-width': F.edge.w }, O);
        return h.tween(dur, function (e) {
          const q = polyAt(pts, L * e);
          o.setAttribute('points', ptsAttr(q));
          if (onTip) onTip(q[q.length - 1]);
        }).then(function () { edges[k].setAttribute('stroke', DARKRED); O.removeChild(o); });
      }
      const counters = [];
      function clearCounters() { counters.forEach(function (c) { c.remove(); }); counters.length = 0; }
      function addCounter(h, k, from, n) { // número do movimento, no meio da aresta
        const ab = k.split('-'), b = from === ab[0] ? ab[1] : ab[0];
        const pts = edgePts(from, b), q = polyAt(pts, polyLen(pts) / 2), m = q[q.length - 1];
        const g = A.svg('g', { transform: 'translate(' + m[0] + ' ' + m[1] + ')' }, gX);
        A.svg('circle', { r: MK.cr, fill: WHITE, stroke: MYBLUE, 'stroke-width': MK.cr * 0.2 }, g);
        const t = A.svg('text', { x: 0, y: MK.cfs * 0.35, 'text-anchor': 'middle', fill: MYBLUE, 'font-weight': 'bold',
          'font-family': 'KaTeX_Main, serif', 'font-size': MK.cfs }, g);
        t.textContent = n;
        counters.push(g);
        return h.tween(260, function (e) { g.setAttribute('transform', 'translate(' + m[0] + ' ' + m[1] + ') scale(' + Math.max(0.001, e) + ')'); }, A.ease.back);
      }
      function enterDeco(h, k) {
        const D = decos[k], d = dec[k];
        resetDeco(k, true);
        if (D.kind === 'pop') {
          return h.tween(380, function (e, t) { d.g.setAttribute('transform', scaleAt(D.c, e)); d.g.style.opacity = Math.min(1, t * 2); }, A.ease.back)
            .then(function () { d.g.removeAttribute('transform'); });
        }
        if (D.kind === 'draw') {
          const p = d.g.querySelector('path'), L = p.getTotalLength();
          p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
          return h.tween(800, function (e) { p.style.strokeDashoffset = L * (1 - e); })
            .then(function () { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; });
        }
        return h.tween(550, function (e) { d.g.setAttribute('transform', scaleAt(D.c, 0.9 + 0.1 * e)); d.g.style.opacity = e; }, A.ease.out)
          .then(function () { d.g.removeAttribute('transform'); });
      }

      async function play(from, to, h) {
        const S0 = F.states[from], S = F.states[to];
        const norm = function (list) { const o = {}; (list || []).forEach(function (k) { const ab = k.split('-'); o[ckey(ab[0], ab[1])] = true; }); return o; };
        const E0 = norm(S0.E), E1 = norm(S.E), R0 = norm(S0.red), R1 = norm(S.red);
        const D0 = S0.deco || [], D1 = S.deco || [];
        const newPaths = S.paths && S.paths !== S0.paths;

        // 0) entrada deslizando: cada grafo chega inteiro do seu lado
        if (S.enter === 'slide' && !S0.V.length) {
          snap(to);
          const gs = Object.keys(F.groups);
          gs.forEach(function (g) { groups[g].c.style.opacity = 0; });
          await h.all(gs.map(function (g, i) {
            const c = groups[g].c, dx = F.groups[g];
            return h.wait(i * 350).then(function () {
              return h.tween(900, function (e, t) {
                c.setAttribute('transform', 'translate(' + dx * (1 - e) + ' 0)'); c.style.opacity = Math.min(1, t * 1.8);
              }, A.ease.out);
            });
          }));
          return;
        }

        // 1) o que sai: arestas, nós e decorações que não existem mais; caminhos antigos voltam à cor normal
        const outs = [];
        Object.keys(E0).forEach(function (k) {
          if (!E1[k]) outs.push(h.tween(450, function (e) { edges[k].style.opacity = 1 - e; }));
          else if (R0[k] && (newPaths || !R1[k])) outs.push(h.tween(450, function (e) { edges[k].setAttribute('stroke', A.mix(DARKRED, ecol(k), e)); }));
        });
        S0.V.forEach(function (v) {
          if (S.V.indexOf(v) >= 0) return;
          outs.push(h.tween(450, function (e) { verts[v].style.opacity = labels[v].style.opacity = 1 - e; if (boxes[v]) boxes[v].style.opacity = 1 - e; }));
        });
        D0.forEach(function (k) { if (D1.indexOf(k) < 0) outs.push(h.tween(450, function (e) { dec[k].g.style.opacity = 1 - e; })); });
        const hl0 = S0.hl || [], hl1 = S.hl || [];
        ALLV.forEach(function (v) {
          if (!boxes[v] || S0.V.indexOf(v) < 0 || S.V.indexOf(v) < 0) return;
          const a = hl0.indexOf(v) >= 0 ? 1 : 0, b = hl1.indexOf(v) >= 0 ? 1 : 0;
          if (a !== b) outs.push(h.tween(450, function (e) { boxes[v].setAttribute('fill', boxFill(A.lerp(a, b, e))); }));
        });
        if (outs.length) {
          await h.all(outs);
          Object.keys(E0).forEach(function (k) { if (!E1[k]) { show(edges[k], false); edges[k].style.opacity = ''; } });
          S0.V.forEach(function (v) { if (S.V.indexOf(v) < 0) { show(verts[v], false); show(labels[v], false); if (boxes[v]) show(boxes[v], false); } });
          D0.forEach(function (k) { if (D1.indexOf(k) < 0) resetDeco(k, false); });
          await h.wait(150);
        }

        // 1b) "não": a decoração balança e fica vermelha por um instante
        if (S.shake && !S0.shake && D0.indexOf(S.shake) >= 0) {
          const d = dec[S.shake];
          await h.wait(250);
          await h.tween(900, function (e, t) {
            d.g.setAttribute('transform', 'translate(' + (1.6 * Math.sin(t * 6 * Math.PI) * (1 - t)) + ' 0)');
            if (d.api.tint) d.api.tint(Math.sin(Math.PI * t));
          }, A.ease.linear);
          resetDeco(S.shake, true);
        }

        const have = {}; S0.V.forEach(function (v) { if (S.V.indexOf(v) >= 0) have[v] = true; });
        const done = {}; Object.keys(E0).forEach(function (k) { if (E1[k]) done[k] = true; });
        const decoDone = {}; D0.forEach(function (k) { if (D1.indexOf(k) >= 0) decoDone[k] = true; });

        // 2a) entrada por esmaecimento: tudo o que é novo aparece junto
        if (S.fadeIn) {
          const nv = S.V.filter(function (v) { return !have[v]; });
          const ne = Object.keys(E1).filter(function (k) { return !done[k]; });
          nv.forEach(function (v) { show(verts[v], true); place(v); verts[v].style.opacity = 0; verts[v]._ring.setAttribute('stroke', NODES[v].c || BLACK); have[v] = true; });
          ne.forEach(function (k) { show(edges[k], true); setEdge(k, ecol(k), 1); edges[k].style.opacity = 0; done[k] = true; });
          await h.tween(700, function (e) {
            nv.forEach(function (v) { verts[v].style.opacity = e; });
            ne.forEach(function (k) { edges[k].style.opacity = e; });
          });
          nv.forEach(function (v) { verts[v].style.opacity = ''; });
          ne.forEach(function (k) { edges[k].style.opacity = ''; });
        }

        // 2b) arestas novas fora dos caminhos: o vizinho "brota" no fim da aresta
        const onPath = {};
        if (S.paths) S.paths.forEach(function (p) { for (let i = 1; i < p.length; i++) onPath[ckey(p[i - 1], p[i])] = true; });
        for (const e of S.E) {
          const ab = e.split('-'), k = ckey(ab[0], ab[1]);
          if (done[k] || onPath[k]) continue;
          const origin = have[ab[0]] || !have[ab[1]] ? ab[0] : ab[1], target = origin === ab[0] ? ab[1] : ab[0];
          done[k] = true;
          if (!have[origin]) { have[origin] = true; await popVertex(h, origin, null, hl1.indexOf(origin) >= 0); }  // componente nova
          await growEdge(h, k, origin, R1[k] ? DARKRED : ecol(k), 380 * T);
          for (const dk of D1) {   // decoração presa a esta aresta (ex.: "????")
            const ek = decos[dk].edge && decos[dk].edge.split('-');
            if (!decoDone[dk] && ek && ckey(ek[0], ek[1]) === k) { decoDone[dk] = true; await enterDeco(h, dk); await h.wait(200); }
          }
          if (!have[target]) { have[target] = true; await popVertex(h, target, origin, hl1.indexOf(target) >= 0); await h.wait(120 * T); }
          else if (!F.hideLabels && !F.noLabels) { flashDigits(h, target, origin, BRICK).catch(function () {}); await h.wait(260); }
        }

        // 2c) nós que passam a ser infactíveis ficam vermelhos, um a um, com um pulso
        for (const v of (S.bad || [])) {
          if (S0.bad && S0.bad.indexOf(v) >= 0 && have[v]) continue;
          const c0 = NODES[v].c || BLACK;
          await h.tween(520, function (e, t) {
            verts[v]._ring.setAttribute('stroke', A.mix(c0, DARKRED, Math.min(1, t * 1.6)));
            place(v, 1 + 0.9 * Math.sin(Math.PI * t));
          });
          place(v); verts[v]._ring.setAttribute('stroke', DARKRED);
          await h.wait(150);
        }
        for (const v of S.V) if (!have[v] && !S.paths) { have[v] = true; await popVertex(h, v, null, hl1.indexOf(v) >= 0); }

        // 3) caminhos: a ficha percorre cada um, contando os movimentos
        if (newPaths) {
          for (const v of S.V) {   // início do caminho (e nós soltos)
            if (have[v] || S.paths.some(function (p) { return p.indexOf(v) > 0; })) continue;
            have[v] = true; await popVertex(h, v, null, hl1.indexOf(v) >= 0);
          }
          for (let pi = 0; pi < S.paths.length; pi++) {
            const path = S.paths[pi];
            if (pi > 0) {
              await h.wait(700);
              const cs = counters.slice();
              await h.tween(350, function (e) { cs.forEach(function (c) { c.style.opacity = 1 - e; }); });
              clearCounters();
            }
            const p0 = NODES[path[0]].p;
            token.setAttribute('cx', p0[0]); token.setAttribute('cy', p0[1]);
            await h.tween(200, function (e) { token.setAttribute('opacity', e); });
            const tip = function (q) { token.setAttribute('cx', q[0]); token.setAttribute('cy', q[1]); };
            for (let i = 1; i < path.length; i++) {
              const a = path[i - 1], b = path[i], k = ckey(a, b);
              const dur = Math.max(520, polyLen(edgePts(a, b)) * 9);
              if (done[k]) await paintOver(h, k, a, dur, tip);
              else { done[k] = true; await growEdge(h, k, a, R1[k] ? DARKRED : ecol(k), dur, tip); }
              addCounter(h, k, a, i).catch(function () {});
              if (!have[b]) { have[b] = true; await popVertex(h, b, a, hl1.indexOf(b) >= 0); }
              else { flashDigits(h, b, a, BRICK).catch(function () {}); await h.wait(450); }
            }
            await h.tween(250, function (e) { token.setAttribute('opacity', 1 - e); });
          }
          await h.wait(1600);
          const cs = counters.slice();
          await h.tween(500, function (e) { cs.forEach(function (c) { c.style.opacity = 1 - e; }); });
          clearCounters();
        }

        // 4) decorações restantes, em ordem
        for (const dk of D1) if (!decoDone[dk]) { decoDone[dk] = true; await enterDeco(h, dk); await h.wait(150); }

        // 5) pulso de destaque (ex.: solução inicial e ótima; nós infactíveis que fazem a ponte)
        if (S.pulse && S.pulse !== S0.pulse) {
          await h.wait(200);
          for (let r = 0; r < 2; r++) {
            await h.tween(560, function (e, t) { S.pulse.forEach(function (v) { place(v, 1 + 1.1 * Math.sin(Math.PI * t)); }); }, A.ease.linear);
            await h.wait(120);
          }
          S.pulse.forEach(function (v) { place(v); });
        }
      }

      // ----- interação: vizinhança swap de um nó -----
      function clearFocus() {
        focus = null;
        while (gHi.firstChild) gHi.removeChild(gHi.firstChild);
        ALLV.forEach(function (v) {
          verts[v]._ring.setAttribute('fill', WHITE);
          labels[v]._d.forEach(function (d) { d.removeAttribute('fill'); });
          if (F.hideLabels) show(labels[v], false);
        });
      }
      function toggleFocus(v) {
        if (focus === v) { clearFocus(); return; }
        clearFocus(); focus = v;
        verts[v]._ring.setAttribute('fill', MYBLUE);
        if (F.hideLabels) { show(labels[v], true); labels[v].style.opacity = ''; }
        const p = NODES[v].p, k = F.ring.r / 2.5;   // destaque proporcional ao tamanho do nó
        F.states[state].V.forEach(function (u) {
          if (u === v || !isNb(u, v)) return;
          const q = NODES[u].p;
          A.svg('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: MYBLUE, 'stroke-width': 2.6 * Math.max(k, 0.5),
            'stroke-linecap': 'round', opacity: 0.35 }, gHi);
          A.svg('circle', { cx: q[0], cy: q[1], r: 4.2 * Math.max(k, 0.5), fill: MYBLUE, opacity: 0.25 }, gHi);
          if (F.hideLabels) { show(labels[u], true); labels[u].style.opacity = ''; }
          if (!F.noLabels) diff(lab(u), lab(v)).forEach(function (i) { labels[u]._d[i].setAttribute('fill', BRICK); });
        });
      }
      root.addEventListener('click', function () { if (focus) clearFocus(); });

      return { snap: snap, play: play };
    };
  }

  Object.keys(FIGS).forEach(function (name) { A.define(name, factory(FIGS[name])); });
})();
