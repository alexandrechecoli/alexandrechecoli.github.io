/* =============================================================
   roadmap.js — trilha interativa da disciplina
   -------------------------------------------------------------
   Uso na página (já inserido no prog-linear.html):

     <section class="content-section container">
       <h2 class="section-header">O CAMINHO DA DISCIPLINA</h2>
       <div id="roadmap"></div>
     </section>

   e, antes de fechar o body, os dois scripts.

   O script injeta o próprio CSS (classes "rmp-") e monta tudo
   dentro da div. Se falhar, a div fica vazia e o resto da página
   continua funcionando normalmente.

   Paleta herdada do seu style.css:
     #15153f  navbar e rodapé  -> marcos (provas e chegada)
     #6059d4  partículas do grafo de fundo -> progresso
     #f7f7fc  fundo dos cards no mobile
     #dddcee  bordas dos cards no mobile
     #1a1a3e  títulos
     #4f4b75  hover da navbar -> texto secundário
   Para retematizar, edite as variáveis no início do CSS abaixo.
   ============================================================= */

(function () {
  "use strict";

  var MONTAGEM = "#roadmap";
  var CHAVE = "roadmap-pl-v1";

  var MODULOS = { 1: "Modelar", 2: "Resolver", 3: "Interpretar" };

  /* ---------- estilos ------------------------------------- */

  var CSS = [
    '.rmp{--rmp-ink:#1a1a3e;--rmp-ink2:#4f4b75;--rmp-paper:#f7f7fc;--rmp-card:#fff;',
    '--rmp-line:#dddcee;--rmp-accent:#6059d4;--rmp-fundo:#15153f;',
    'font-family:Raleway,system-ui,-apple-system,"Segoe UI",sans-serif;',
    'color:var(--rmp-ink);margin:.5em 0 1.5em;line-height:1.55;text-align:left;font-size:16px}',

    /* o site aplica font-family no seletor universal, que vence a heranca;
       por isso repetimos a familia (com reserva) tambem nos filhos */
    '.rmp,.rmp *{font-family:Raleway,system-ui,-apple-system,"Segoe UI",Arial,sans-serif}',
    '.rmp *{box-sizing:border-box}',
    /* a página aumenta a primeira letra de todo parágrafo; aqui não */
    '.rmp p::first-letter{font-size:100%;color:inherit}',

    '.rmp-topo{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;',
    'flex-wrap:wrap;margin-bottom:.55rem}',
    '.rmp-ajuda{font-size:14px;color:var(--rmp-ink2);margin:0;max-width:56ch}',
    '.rmp-contador{font-size:13px;color:var(--rmp-ink2);white-space:nowrap}',
    '.rmp-zerar{background:none;border:0;padding:0 0 0 .5rem;font:inherit;font-size:13px;',
    'color:var(--rmp-ink2);text-decoration:underline;cursor:pointer}',

    /* placa opaca: o grafo animado passa por baixo, nunca por dentro */
    '.rmp-quadro{background:var(--rmp-card);border:1px solid var(--rmp-line);border-radius:14px;',
    'box-shadow:0 2px 14px rgba(21,21,63,.10);overflow:hidden}',
    '.rmp-tela{background:var(--rmp-paper);border-bottom:1px solid var(--rmp-line);padding:.25rem .25rem 0}',
    '.rmp-svg{display:block;width:100%;height:auto}',

    '.rmp-trilha{fill:none;stroke:var(--rmp-line);stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round}',
    '.rmp-trilha-feita{fill:none;stroke:var(--rmp-accent);stroke-width:3.5;stroke-linejoin:round;',
    'stroke-linecap:round;opacity:.9}',

    '.rmp-node{cursor:pointer;outline:none}',
    '.rmp-forma{fill:var(--rmp-card);stroke:var(--rmp-ink2);stroke-width:1.6;transition:fill .18s,stroke .18s}',
    '.rmp-num{font-size:11px;font-weight:600;fill:var(--rmp-ink2);text-anchor:middle;',
    'dominant-baseline:central;pointer-events:none}',
    '.rmp-rot{font-size:11.5px;fill:var(--rmp-ink2);text-anchor:middle;pointer-events:none;',
    'stroke:var(--rmp-paper);stroke-width:3.5;paint-order:stroke fill}',
    '.rmp-anel{fill:none;stroke:var(--rmp-accent);stroke-width:1.5;opacity:0}',
    '.rmp-node:hover .rmp-forma{stroke:var(--rmp-accent)}',
    '.rmp-node:hover .rmp-rot{fill:var(--rmp-ink)}',
    '.rmp-node:focus-visible .rmp-anel{opacity:1;stroke-dasharray:3 3}',
    '.rmp-node[data-sel="1"] .rmp-anel{opacity:1;stroke-dasharray:none}',
    '.rmp-node[data-sel="1"] .rmp-rot{fill:var(--rmp-ink);font-weight:600}',
    '.rmp-node[data-feito="1"] .rmp-forma{fill:var(--rmp-accent);stroke:var(--rmp-accent)}',
    '.rmp-node[data-feito="1"] .rmp-num{fill:#fff}',
    /* provas e chegada usam o navy da navbar: marco, não etapa */
    '.rmp-node[data-tipo="prova"] .rmp-forma,.rmp-node[data-tipo="chegada"] .rmp-forma{stroke:var(--rmp-fundo)}',
    '.rmp-node[data-tipo="prova"] .rmp-num,.rmp-node[data-tipo="chegada"] .rmp-num{fill:var(--rmp-fundo)}',
    '.rmp-node[data-tipo="prova"][data-feito="1"] .rmp-forma,',
    '.rmp-node[data-tipo="chegada"][data-feito="1"] .rmp-forma{fill:var(--rmp-fundo);stroke:var(--rmp-fundo)}',

    '.rmp-painel{padding:1.1rem 1.35rem 1.35rem;display:grid;gap:1.1rem 2rem;',
    'grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);opacity:1;transition:opacity .16s ease}',
    '.rmp-painel.rmp-troca{opacity:0}',
    '@media screen and (max-width:768px){.rmp-painel{grid-template-columns:1fr;padding:1rem}}',

    '.rmp-etapa{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--rmp-accent);',
    'margin:0 0 .3rem;font-weight:600}',
    '.rmp-p-titulo{font-size:20px;font-weight:600;margin:0 0 .5rem;color:var(--rmp-ink);',
    'letter-spacing:normal;text-align:left}',
    '.rmp-texto{margin:0 0 1rem;max-width:58ch;font-size:16px;font-weight:400;color:#0a0a0a}',
    '.rmp-feito{background:none;border:1.5px solid var(--rmp-fundo);border-radius:20px;',
    'padding:.4rem 1.1rem;font:inherit;font-size:12px;font-weight:700;letter-spacing:.03em;',
    'color:var(--rmp-fundo);cursor:pointer}',
    '.rmp-feito:hover{background:var(--rmp-paper)}',
    '.rmp-feito[aria-pressed="true"]{background:var(--rmp-accent);border-color:var(--rmp-accent);color:#fff}',

    '.rmp-mat-tit{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--rmp-ink2);',
    'margin:.2rem 0 .55rem;font-weight:600}',
    '.rmp-mats{list-style:none;margin:0;padding:0;display:grid;gap:.4rem}',
    '.rmp-mat{display:flex;align-items:baseline;gap:.55rem;padding:.5rem .65rem;',
    'border:1px solid var(--rmp-line);border-radius:12px;background:var(--rmp-paper)}',
    '.rmp-mat a{color:var(--rmp-ink);text-decoration:none;font-size:15px;font-weight:500}',
    '.rmp-mat a:hover{color:var(--rmp-accent);text-decoration:underline}',
    '.rmp-tag{flex:0 0 auto;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;',
    'color:#fff;background:var(--rmp-fundo);border-radius:10px;padding:.15rem .55rem}',
    '.rmp-tag[data-t="gabarito"],.rmp-tag[data-t="handout"]{background:var(--rmp-ink2)}',
    '.rmp-tag[data-t="ferramenta"],.rmp-tag[data-t="extra"]{background:var(--rmp-accent)}',
    '.rmp-verlista{background:none;border:0;padding:0;margin-left:auto;font:inherit;font-size:12px;',
    'color:var(--rmp-ink2);text-decoration:underline;cursor:pointer;flex:0 0 auto;white-space:nowrap}',
    '.rmp-verlista:hover{color:var(--rmp-accent)}',
    '.rmp-vazio{font-size:15px;color:var(--rmp-ink2);margin:0}',

    '.rmp-flash{animation:rmp-flash 1.8s ease-out}',
    '@keyframes rmp-flash{0%,55%{background:#e9e7fb}100%{background:transparent}}',
    '@media (prefers-reduced-motion:reduce){.rmp-flash{animation:none;outline:2px solid var(--rmp-accent)}',
    '.rmp-forma{transition:none}.rmp-painel{transition:none}}'
  ].join("");

  var TAGS = {
    apresentacao: "Apresentação",
    handout: "Handout",
    lista: "Lista",
    gabarito: "Gabarito",
    ferramenta: "Ferramenta",
    extra: "Extra"
  };

  var SVGNS = "http://www.w3.org/2000/svg";

  /* ---------- utilidades ---------------------------------- */

  function el(tag, attrs, texto) {
    var n = document.createElement(tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (texto != null) n.textContent = texto;
    return n;
  }

  function svg(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    return n;
  }

  function lerProgresso() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE)) || {};
    } catch (e) {
      return {};
    }
  }

  function salvarProgresso(p) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(p));
    } catch (e) {
      /* modo privado: funciona, só não lembra do progresso */
    }
  }

  /* o endereço vem do link que já existe na página; a url é reserva */
  function endereco(mat) {
    if (mat.ref) {
      var alvo = document.getElementById(mat.ref);
      if (alvo && alvo.getAttribute("href")) return alvo.getAttribute("href");
    }
    return mat.url ? encodeURI(mat.url) : null;
  }

  function quebrar(texto, maxChars) {
    var palavras = String(texto).split(" ");
    var linhas = [""];
    for (var i = 0; i < palavras.length; i++) {
      var tent = linhas[linhas.length - 1] ? linhas[linhas.length - 1] + " " + palavras[i] : palavras[i];
      if (tent.length <= maxChars || !linhas[linhas.length - 1]) linhas[linhas.length - 1] = tent;
      else linhas.push(palavras[i]);
      if (linhas.length === 2 && linhas[1].length > maxChars) break;
    }
    return linhas.slice(0, 2);
  }

  /* ---------- aplicação ----------------------------------- */

  function iniciar() {
    var raiz = document.querySelector(MONTAGEM);
    var dados = window.ROADMAP_PL;
    if (!raiz || !dados || !dados.length) return;

    var estilo = el("style");
    estilo.textContent = CSS;
    document.head.appendChild(estilo);

    var progresso = lerProgresso();
    var selecionado = 0;
    var nodes = [];

    raiz.className = "rmp";
    raiz.innerHTML = "";

    var topo = el("div", { "class": "rmp-topo" });
    topo.appendChild(el("p", { "class": "rmp-ajuda" },
      "Cada vértice é uma etapa do semestre. Clique para ver o que se aprende ali e chegar direto ao material."));
    var contador = el("div", { "class": "rmp-contador" });
    var zerar = el("button", { "class": "rmp-zerar", type: "button" }, "zerar");
    zerar.addEventListener("click", function () {
      progresso = {};
      salvarProgresso(progresso);
      nodes.forEach(function (g) { g.setAttribute("data-feito", "0"); });
      atualizarContador();
      desenharTrilhaFeita();
      montarPainel(selecionado);
    });
    topo.appendChild(contador);
    raiz.appendChild(topo);

    var quadro = el("div", { "class": "rmp-quadro" });
    var tela = el("div", { "class": "rmp-tela" });
    var painel = el("div", { "class": "rmp-painel", "aria-live": "polite" });
    quadro.appendChild(tela);
    quadro.appendChild(painel);
    raiz.appendChild(quadro);

    var trilhaFeita, pontos = [];

    function desenhar() {
      var largura = Math.max(280, tela.clientWidth - 8);
      /* a margem lateral precisa caber metade do rótulo mais largo */
      var padX = Math.max(46, Math.min(64, largura * 0.06));
      var util = Math.max(200, largura - padX * 2);
      var porLinha = Math.max(2, Math.min(6, Math.floor(util / 130) + 1));
      var linhas = Math.ceil(dados.length / porLinha);
      var vao = porLinha > 1 ? util / (porLinha - 1) : 0;
      var alturaLinha = 116;
      var topo0 = 46;
      var altura = topo0 + (linhas - 1) * alturaLinha + 74;

      pontos = dados.map(function (d, i) {
        var l = Math.floor(i / porLinha);
        var c = i % porLinha;
        if (l % 2 === 1) c = porLinha - 1 - c;
        var onda = vao > 150 ? (i % 2 ? 9 : -9) : 0;
        return { x: padX + c * vao, y: topo0 + l * alturaLinha + onda };
      });

      tela.innerHTML = "";
      var s = svg("svg", {
        "class": "rmp-svg",
        viewBox: "0 0 " + largura + " " + altura,
        role: "group",
        "aria-label": "Trilha da disciplina: " + dados.length + " etapas"
      });

      var d = pontos.map(function (p, i) { return (i ? "L" : "M") + p.x + " " + p.y; }).join(" ");
      s.appendChild(svg("path", { "class": "rmp-trilha", d: d }));
      trilhaFeita = svg("path", { "class": "rmp-trilha-feita", d: "" });
      s.appendChild(trilhaFeita);

      nodes = [];
      var numero = 0;
      dados.forEach(function (item, i) {
        var p = pontos[i];
        var eParada = item.tipo === "parada";
        if (eParada) numero++;

        var g = svg("g", {
          "class": "rmp-node",
          tabindex: "0",
          role: "button",
          "data-i": i,
          "data-tipo": item.tipo,
          "data-feito": progresso[item.id] ? "1" : "0",
          "aria-label": item.titulo
        });
        g.appendChild(svg("circle", { cx: p.x, cy: p.y, r: 24, fill: "transparent" }));
        g.appendChild(svg("circle", { "class": "rmp-anel", cx: p.x, cy: p.y, r: 21 }));

        if (item.tipo === "prova") {
          g.appendChild(svg("rect", {
            "class": "rmp-forma", x: p.x - 12, y: p.y - 12, width: 24, height: 24, rx: 3,
            transform: "rotate(45 " + p.x + " " + p.y + ")"
          }));
        } else {
          g.appendChild(svg("circle", {
            "class": "rmp-forma", cx: p.x, cy: p.y, r: item.tipo === "chegada" ? 16 : 14
          }));
        }

        var t = svg("text", { "class": "rmp-num", x: p.x, y: p.y });
        t.textContent = eParada ? String(numero) : (item.tipo === "prova" ? "P" : "\u2605");
        g.appendChild(t);

        var rot = svg("text", { "class": "rmp-rot", x: p.x, y: p.y + 30 });
        quebrar(item.curto, Math.max(9, Math.floor(vao / 6.4))).forEach(function (linha, k) {
          var ts = svg("tspan", { x: p.x, dy: k ? "1.15em" : "0" });
          ts.textContent = linha;
          rot.appendChild(ts);
        });
        g.appendChild(rot);

        g.addEventListener("click", function () { abrir(i); });
        g.addEventListener("keydown", function (ev) {
          var k = ev.key;
          if (k === "Enter" || k === " ") { ev.preventDefault(); abrir(i); }
          else if (k === "ArrowRight" || k === "ArrowDown") { ev.preventDefault(); foco(i + 1); }
          else if (k === "ArrowLeft" || k === "ArrowUp") { ev.preventDefault(); foco(i - 1); }
          else if (k === "Home") { ev.preventDefault(); foco(0); }
          else if (k === "End") { ev.preventDefault(); foco(dados.length - 1); }
        });

        nodes.push(g);
        s.appendChild(g);
      });

      tela.appendChild(s);
      marcarSelecao();
      desenharTrilhaFeita();
    }

    function foco(i) {
      if (i < 0 || i >= nodes.length) return;
      nodes[i].focus();
      abrir(i);
    }

    /* o trecho percorrido acende até a última etapa concluída */
    function desenharTrilhaFeita() {
      if (!trilhaFeita) return;
      var ultima = -1;
      dados.forEach(function (d, i) { if (progresso[d.id]) ultima = i; });
      if (ultima < 1) { trilhaFeita.setAttribute("d", ""); return; }
      trilhaFeita.setAttribute("d", pontos.slice(0, ultima + 1).map(function (p, i) {
        return (i ? "L" : "M") + p.x + " " + p.y;
      }).join(" "));
    }

    function marcarSelecao() {
      nodes.forEach(function (g, i) {
        if (i === selecionado) g.setAttribute("data-sel", "1");
        else g.removeAttribute("data-sel");
      });
    }

    function atualizarContador() {
      var total = dados.filter(function (d) { return d.tipo === "parada"; }).length;
      var feitas = dados.filter(function (d) { return d.tipo === "parada" && progresso[d.id]; }).length;
      contador.textContent = feitas + " de " + total + " paradas concluídas";
      if (feitas) contador.appendChild(zerar);
    }

    function irParaLista(ref) {
      var alvo = document.getElementById(ref);
      if (!alvo) return;
      var linha = alvo.closest(".tour-row") || alvo.closest("li,tr,p,div") || alvo;
      var suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      alvo.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "center" });
      linha.classList.remove("rmp-flash");
      void linha.offsetWidth;
      linha.classList.add("rmp-flash");
      setTimeout(function () { linha.classList.remove("rmp-flash"); }, 2000);
    }

    function montarPainel(i) {
      var item = dados[i];
      painel.innerHTML = "";

      var col1 = el("div");
      var numParada = dados.slice(0, i + 1).filter(function (d) { return d.tipo === "parada"; }).length;
      var totalParadas = dados.filter(function (d) { return d.tipo === "parada"; }).length;
      var bloco = "Módulo " + item.modulo + " · " + MODULOS[item.modulo];
      var etapa = item.tipo === "parada" ? bloco + " · parada " + numParada + " de " + totalParadas
        : item.tipo === "prova" ? bloco + " · avaliação"
          : bloco + " · fim do caminho";
      col1.appendChild(el("p", { "class": "rmp-etapa" }, etapa));
      col1.appendChild(el("h3", { "class": "rmp-p-titulo" }, item.titulo));
      col1.appendChild(el("p", { "class": "rmp-texto" }, item.texto));

      var feito = !!progresso[item.id];
      var botao = el("button", {
        "class": "rmp-feito", type: "button", "aria-pressed": feito ? "true" : "false"
      }, feito ? "CONCLUÍDA" : "MARCAR COMO CONCLUÍDA");
      botao.addEventListener("click", function () {
        if (progresso[item.id]) delete progresso[item.id];
        else progresso[item.id] = 1;
        salvarProgresso(progresso);
        nodes[i].setAttribute("data-feito", progresso[item.id] ? "1" : "0");
        atualizarContador();
        desenharTrilhaFeita();
        montarPainel(i);
      });
      col1.appendChild(botao);
      painel.appendChild(col1);

      var col2 = el("div");
      if (!item.materiais || !item.materiais.length) {
        col2.appendChild(el("p", { "class": "rmp-vazio" },
          "Sem material próprio: revise as paradas anteriores."));
      } else {
        col2.appendChild(el("p", { "class": "rmp-mat-tit" }, "Material desta parada"));
        var ul = el("ul", { "class": "rmp-mats" });
        item.materiais.forEach(function (mat) {
          var href = endereco(mat);
          if (!href) return;
          var li = el("li", { "class": "rmp-mat" });
          li.appendChild(el("span", { "class": "rmp-tag", "data-t": mat.tipo }, TAGS[mat.tipo] || "Material"));
          li.appendChild(el("a", { href: href, target: "_blank", rel: "noopener" }, mat.rotulo));
          if (mat.ref && document.getElementById(mat.ref)) {
            var b = el("button", { "class": "rmp-verlista", type: "button" }, "ver na lista");
            b.addEventListener("click", function () { irParaLista(mat.ref); });
            li.appendChild(b);
          }
          ul.appendChild(li);
        });
        col2.appendChild(ul);
      }
      painel.appendChild(col2);
    }

    var trocando;
    function abrir(i) {
      var mudou = i !== selecionado;
      selecionado = i;
      marcarSelecao();

      var reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (mudou && !reduz && painel.childNodes.length) {
        clearTimeout(trocando);
        painel.classList.add("rmp-troca");
        trocando = setTimeout(function () {
          montarPainel(i);
          painel.classList.remove("rmp-troca");
        }, 140);
      } else {
        montarPainel(i);
      }

      try {
        history.replaceState(null, "", "#parada/" + dados[i].id);
      } catch (e) { /* sem suporte: o link direto só não atualiza */ }
    }

    function daHash() {
      var m = /^#parada\/(.+)$/.exec(location.hash);
      if (!m) return 0;
      var alvo = decodeURIComponent(m[1]);
      for (var i = 0; i < dados.length; i++) if (dados[i].id === alvo) return i;
      return 0;
    }

    desenhar();
    selecionado = daHash();
    atualizarContador();
    montarPainel(selecionado);
    marcarSelecao();

    window.addEventListener("hashchange", function () { abrir(daHash()); });

    var t;
    window.addEventListener("resize", function () {
      clearTimeout(t);
      t = setTimeout(function () { desenhar(); }, 150);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
