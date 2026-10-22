/* Núcleo das animações dos slides.
 *
 * Uso no HTML:  <div class="anim" data-anim="NOME" data-from="estadoAnterior" data-state="estado1,estado2,...">
 *   - data-state: estado da figura em cada passo do frame (um por passo; o último vale para os seguintes)
 *   - data-from:  estado da figura no frame anterior (a animação de entrada parte dele)
 *
 * Cada tipo de animação é registrado com Anim.define(NOME, fabrica). A fábrica recebe
 * (host, opts) e devolve um objeto com:
 *   snap(estado)                 desenha o estado final, sem animar
 *   play(de, para, h)            anima de um estado a outro; h = { tween, wait, all } (assíncronos)
 *
 * Regras:
 *   - Ao avançar (→) para o frame seguinte ou para o próximo passo, anima.
 *   - Ao voltar, pular para outro frame ou imprimir, mostra direto o estado final.
 *   - Apertar → durante uma animação apenas a completa. A tecla R repete a animação de entrada.
 *   - Respeita "reduzir movimento" do sistema operacional.
 */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const registry = {};

  // ---------- utilidades ----------
  function svg(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const ease = {
    linear: function (t) { return t; },
    inOut: function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    back: function (t) { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  };
  const lerp = function (a, b, t) { return a + (b - a) * t; };
  function mix(c1, c2, t) { // cores '#rrggbb'
    const a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
    const r = Math.round(lerp(a >> 16, b >> 16, t)), g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t)), bl = Math.round(lerp(a & 255, b & 255, t));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }

  // ---------- execução cancelável ----------
  const CANCEL = { cancelled: true };
  function Runner() { this.gen = 0; this.busy = false; }
  Runner.prototype.run = function (script) {
    const self = this, gen = ++this.gen;
    this.busy = true;
    const live = function () { if (gen !== self.gen) throw CANCEL; };
    const h = {
      tween: function (dur, fn, ez) {
        live();
        ez = ez || ease.inOut;
        return new Promise(function (resolve, reject) {
          const t0 = performance.now();
          (function frame(now) {
            if (gen !== self.gen) { reject(CANCEL); return; }
            const t = Math.min(1, (now - t0) / dur);
            fn(ez(t), t);
            if (t < 1) requestAnimationFrame(frame); else resolve();
          })(t0);
        });
      },
      wait: function (ms) {
        live();
        return new Promise(function (resolve, reject) {
          setTimeout(function () { if (gen !== self.gen) reject(CANCEL); else resolve(); }, ms);
        });
      },
      all: function (list) { return Promise.all(list); }
    };
    return Promise.resolve().then(function () { return script(h); })
      .catch(function (e) { if (e !== CANCEL) console.error(e); })
      .then(function () { if (gen === self.gen) self.busy = false; });
  };
  Runner.prototype.cancel = function () { this.gen++; this.busy = false; };

  // ---------- ligação com os frames ----------
  function setup() {
    const frames = Array.prototype.slice.call(document.querySelectorAll('#deck > section.frame'));
    frames.forEach(function (f, fi) {
      const hosts = Array.prototype.slice.call(f.querySelectorAll('[data-anim]'));
      if (!hosts.length) return;
      const items = hosts.map(function (host) {
        const def = registry[host.dataset.anim];
        if (!def) { console.warn('animação desconhecida:', host.dataset.anim); return null; }
        const states = (host.dataset.state || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        const inst = def(host, { states: states, from: host.dataset.from || null });
        const it = { host: host, inst: inst, states: states, from: host.dataset.from || null, runner: new Runner(), cur: null };
        it.stateAt = function (step) { return states[Math.min(step, states.length) - 1]; };
        it.snap = function (st) { it.runner.cancel(); it.cur = st; inst.snap(st); };
        it.play = function (a, b) {
          if (reduce || !inst.play || a === b) { it.snap(b); return; }
          inst.snap(a); it.cur = b;
          it.runner.run(function (h) { return inst.play(a, b, h); })
            .then(function () { if (!it.runner.busy && it.cur === b) inst.snap(b); });
        };
        it.snap(it.stateAt(1));
        return it;
      }).filter(Boolean);

      f._busy = function () { return items.some(function (it) { return it.runner.busy; }); };
      f._finish = function () { items.forEach(function (it) { if (it.runner.busy) it.snap(it.cur); }); };
      f._replay = function () {
        items.forEach(function (it) { const st = it.stateAt(Deck.current.step); it.play(it.from || st, st); });
      };

      f.addEventListener('enter', function (e) {
        const d = e.detail || {};
        items.forEach(function (it) {
          const target = it.stateAt(d.step || 1);
          // animação de entrada só no fluxo natural: vindo do frame anterior, no 1º passo
          if (d.from === fi - 1 && (d.step || 1) === 1 && it.from) it.play(it.from, target);
          else it.snap(target);
        });
      });
      f.addEventListener('step', function (e) {
        const d = e.detail || {};
        items.forEach(function (it) {
          const target = it.stateAt(d.step);
          if (d.step === d.prev + 1) it.play(it.stateAt(d.prev), target);
          else it.snap(target);
        });
      });
      f.addEventListener('leave', function () {
        items.forEach(function (it) { it.snap(it.stateAt(1)); });
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'r' || e.key === 'R') {
        const f = document.querySelector('#deck > section.frame.active');
        if (f && f._replay) { f._replay(); e.preventDefault(); }
      }
    });
  }

  window.Anim = {
    define: function (name, factory) { registry[name] = factory; },
    svg: svg, ease: ease, lerp: lerp, mix: mix, reduce: reduce,
    setup: setup
  };
})();
