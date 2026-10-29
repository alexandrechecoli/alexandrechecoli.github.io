# Slides Beamer → HTML: contexto da adaptação

Este documento descreve como as apresentações Beamer (LaTeX) do Prof. Alexandre Checoli Choueiri
são convertidas em apresentações HTML/CSS/JS **visualmente idênticas ao PDF** e, depois,
enriquecidas com animações. Serve para dois públicos:

- **para você**: entender a estrutura, converter novas aulas e editar o HTML;
- **para o Claude** (ou outro assistente): ter todo o contexto técnico de uma vez, sem precisar
  redescobrir as medidas e as regras do Beamer. *Ao pedir uma nova conversão, peça para ler este
  arquivo primeiro.*

Aula de referência (onde tudo foi desenvolvido e validado):
`Aulas/5.0 - Algoritmos de solução única - Conceitos/` (125 frames, 145 páginas no PDF).

---

## 1. Visão geral

| Item | Situação |
|---|---|
| Fidelidade | Texto com as **mesmas quebras de linha e hifenização** do PDF; posições a < 1 pt na grande maioria das linhas (máx. ~4 pt) |
| Tema reproduzido | Beamer `Boadilla`, `\usecolortheme[named=MyBlue]{structure}`, 11pt, `aspectratio=169`, rodapé personalizado (autor \| título + n/total) |
| Fontes | Latin Modern Sans (as do LaTeX) para o texto; KaTeX (Computer Modern) para fórmulas |
| Funciona offline | Sim: fontes, KaTeX e hifenização ficam na própria pasta |
| Navegador | Chrome/Edge (testado); Firefox deve funcionar |

### Estrutura da pasta `html/`

```
html/
├── index.html            ← os slides (um <section class="frame"> por frame)  ★ arquivo de trabalho
├── contexto.md           ← este documento
├── css/beamer.css        ← tema Boadilla, todas as medidas em pt
├── js/
│   ├── slides.js         ← navegação, overlays, escala, quebras de linha estilo TeX
│   ├── texbreak.js       ← algoritmo de Knuth–Plass (quebra de parágrafo do TeX)
│   └── anim/             ← animações: core.js (motor) + um arquivo por tipo de figura
├── lib/                  ← KaTeX 0.16.11 e hyphen (padrões de hifenização pt)
├── fonts/                ← Latin Modern Sans (OTF, copiadas do MiKTeX)
├── img/                  ← figuras convertidas (PDF → SVG; superfícies pesadas → PNG 300 dpi)
└── ferramentas/
    ├── tex2html.py           ← conversor .tex → index.html (+ figuras + cópia do motor)
    ├── figura_geometria.py   ← extrai coordenadas de uma figura PDF (para criar animações)
    ├── figura_camadas.py     ← converte uma sequência de figuras PDF em camadas (para fig.js)
    └── verificacao/          ← scripts que comparam o HTML com o PDF
```

> ★ **Depois que um `index.html` recebe animações, ele passa a ser o arquivo de trabalho.**
> Rodar o conversor de novo sobrescreveria as animações (por isso o conversor se recusa a
> sobrescrever sem `--forcar`). Alterações de texto feitas no `.tex` depois disso devem ser
> repassadas à mão para o `index.html`. O `.tex` continua compilando normalmente o PDF.

### Uso em aula

| Tecla / ação | Efeito |
|---|---|
| → ↓ PageDown Espaço Enter, clique no slide | avança (próximo passo de overlay ou próximo frame) |
| ← ↑ PageUp Backspace, clique no quarto esquerdo do slide | volta |
| roda do mouse / touchpad | para baixo avança, para cima volta (um passo por giro; sobre a bola da curva de custo, a roda muda ε) |
| Home / End | primeiro / último frame |
| número + Enter | vai ao frame (ex.: `54` Enter) |
| F | tela cheia |
| R | repete a animação do frame atual |
| → durante uma animação | só completa a animação (não pula o slide) |
| Ctrl+P | imprime/gera PDF: um frame por página, overlays visíveis |

O endereço guarda a posição (`index.html#46.2` = frame 46, passo 2).

---

## 2. Converter uma nova apresentação

### Requisitos (uma vez só)

- **Python 3** com PyMuPDF: `python -m pip install pymupdf`
- **pdftocairo** no PATH (vem com o MiKTeX / TeX Live / Poppler)
- Para verificar (opcional): **Node.js** e, dentro de `ferramentas/verificacao/`, `npm install`
  (instala o `puppeteer-core`, que usa o Chrome/Edge já instalado — não baixa navegador).
  Dica: para não sincronizar ~15 MB no Google Drive, instale fora dele (`npm install puppeteer-core@23.11.1`
  numa pasta qualquer) e aponte a variável `NODE_PATH` para o `node_modules` dessa pasta.

### Passo a passo

```bash
# 1) compile o .tex normalmente (gera o PDF e o .nav, usados na verificação)
pdflatex aula.tex   # duas vezes, como de costume

# 2) converta (o "motor" é copiado da pasta html de referência)
python "<caminho>/html/ferramentas/tex2html.py" aula.tex html
#    -> html/index.html, html/img/..., css/, js/, lib/, fonts/, ferramentas/, contexto.md
#    Leia os AVISOS impressos no fim: comandos/ambientes não suportados, cores desconhecidas,
#    figuras não encontradas. Corrija no .tex ou à mão no index.html.

# 3) abra html/index.html no navegador e confira
```

O conversor lê do preâmbulo: `\title[curto]{longo}`, `\author[curto]{longo}`, `\date{}`,
`\definecolor` (RGB, rgb, HTML, cmyk) e `\graphicspath`. O título curto e o autor curto vão
para o rodapé; o título longo, para a capa.

### Verificar a fidelidade (recomendado)

```bash
cd html/ferramentas/verificacao
pdftoppm -png -r 144 ../../../aula.pdf ref/p                              # PDF -> ref/p-001.png ...
node medir.js ../../index.html ../../../aula.nav medidas.json             # mede todas as linhas
python verificar_linhas.py ../../../aula.pdf medidas.json                 # linhas iguais ao PDF?
python alinhar.py ../../../aula.pdf medidas.json                          # desvio vertical por página
node capturar.js ../../index.html ../../../aula.nav hs                    # capturas do HTML
python comparar.py ref hs sobreposicao                                    # sobreposições + ranking
```

Como ler:

- `verificar_linhas.py` → idealmente só sobram linhas de **dentro de figuras** (rótulos de gráficos).
- `alinhar.py` → `max|dy|` em pt por página; acima de ~3 pt vale olhar a sobreposição.
  "sem par" costuma ser texto de figura; "quebras diferentes" costuma ser artefato (o PDF divide
  linhas em vários trechos), confirme no `verificar_linhas.py`.
- `comparar.py` → em `sobreposicao/o-NNN.png`: **preto** = igual, **vermelho** = só no PDF,
  **ciano** = só no HTML.

---

## 3. Mapeamento LaTeX → HTML

| LaTeX | HTML gerado | Observações |
|---|---|---|
| `\begin{frame}[t]{Título}{Subtítulo}` | `<section class="frame t">` + `<header class="ft">` | `[t]` = topo; sem `[t]` = centralizado. Também `\frametitle`/`\framesubtitle` |
| `\section{X}` | frame de capa de seção (`frame sec`) + item no sumário | `\AtBeginSection` do template; `\subsection` é ignorado |
| `\titlepage` / `\tableofcontents` | `frame titlepage` / `frame toc` | o resto do frame da capa (ex.: figura) vai abaixo da data |
| `\justifying` | classe `jus` no ambiente atual | ver regras de justificação (§4.6) |
| `\begin{tcolorbox}[...]` | `<div class="tcb jus">` | `boxsep=0pt` → `tcb bs0`; corpo sempre justificado |
| `\begin{block}{T}` (e `alertblock`, `exampleblock`) | `.block > .block-title + .block-body` | título com `\textbf` fica em negrito; sem, normal |
| `enumerate` / `itemize` / `\item<2->` / `\item[8]` | `ol.enum` / `ul.itemz` / `li data-on` / `li data-label` | 2º nível em `\small` |
| `\begin{columns}` + `\begin{column}{.5\textwidth}` | `.columns > .column` (largura em pt) | colunas ocupam a largura **do slide** (§4.8) |
| `\begin{center}` | `.center` | só imagens → `p.imgs` (flex) |
| `\includegraphics[scale=s]{f}` | `<img class="ig" style="width:Wpt">` | W = largura natural (CropBox) × s; também `width=..\textwidth`/cm/mm/pt |
| `\includegraphics<1>{f}` | `img data-only="1"` | |
| `$...$`, `equation*`, `equation`, `align*`, `$$` | KaTeX `\(..\)` / `.eq \[..\]` | `equation` numerada → `.eqno` |
| `\onslide<2->{...}`, `\uncover`, `\visible` | `data-on="2-"` (no próprio bloco ou num `span`) | invisível mas ocupa espaço |
| `\only<1>{...}` | `data-only="1"` | não ocupa espaço |
| `\textbf`, `\textit`, `\emph`, `\underline`, `\texttt`, `\textsc` | `b`, `i`, `i`, `u`, `code`, small-caps | `\textbf{\textit{}}` = negrito **reto** (como o cmss) |
| `{\color{MyBlue} ...}`, `\textcolor{c}{..}`, `\alert{}` | `span.c-myblue`, `.c-<nome>`, `.c-alert` | classes de cor extras vão num `<style>` no `index.html` |
| `algorithm` + `algorithmic` (algpseudocode) | `.algorithm` (régua, legenda "Algorithm n", linhas `.l1…l5`) | `\State \While \If \Else \For \Return \Require` ... |
| `"texto"` (babel português) | “texto” | o PDF mostra ”texto” (quirk do babel) — o HTML corrige |
| `\href`, `\url` | `<a>` | |
| `\pause` | **não convertido** (aviso) | use `\onslide<n->{}` no .tex ou `data-on` no HTML |
| `tabular`, `tikzpicture` inline, `\footnote`, `\cite` | **não convertidos** (aviso: "ambiente não suportado") | converter à mão; TikZ: compile como figura PDF à parte |

Figuras: `pdftocairo -svg` (vetorial, idêntico). Se o SVG passar de 1 MB (ex.: superfícies do
pgfplots com milhares de faces) vira **PNG a 300 dpi**. PNG/JPG são copiados.

### Overlays (passos dentro do frame)

- `data-on="2"`, `"2-"`, `"1-3"`, `"-2"`, `"1,3-"` — mesma sintaxe do Beamer.
- O número de passos do frame é o maior número citado; `data-steps="3"` no `<section>` força mais passos
  (usado para passos extras de animação).

---

## 4. Fidelidade ao Beamer: medidas e regras

Tudo em **pt do PDF** (1/72 pol; o TeX usa pt = 1/72.27 pol: 30pt TeX = 29.89 pt PDF). O slide
mede **453.543 × 255.118 pt** e é escalado inteiro com `transform: scale()` (o layout não muda
com o tamanho da janela). As medidas abaixo foram obtidas medindo o PDF com PyMuPDF e
comparando automaticamente com o HTML no Chrome.

### 4.1 Fonte e linha

- Texto: Latin Modern Sans 10 a **10.91 pt**, entrelinha **13.55 pt** (`\baselineskip` 13.6 TeX pt).
- Para esta fonte, a linha de base fica a **L/2 + 0.4225·tamanho** do topo de uma caixa de linha de
  altura L (métricas hhea 1.154 / 0.309). Ex.: L = 13.55 → 11.385 pt.
- Título do frame: LM Sans 12, 14.35 pt, cor MyBlue `#0061A5`, linha de base em **y = 21.1**, x = 8.5.
- Subtítulo: LM Sans 9, 8.97 pt, linha de base em **y = 35.1** (pode descer ~0.8 pt se houver acento
  maiúsculo, como "Ú" — o TeX empurra a caixa; ignorado).
- Rodapé: 12.398 pt de altura; esquerda 0–181.415 pt `#1A71AE` texto branco; direita a partir de
  181.415 pt (largura 317.48, transborda) `#E5EEF5` texto MyBlue; LM Sans 8 a 6.97 pt;
  número com 32.1 pt de espaço antes e 3.1 pt depois.
- Fontes precisam estar **todas carregadas antes de medir** (negrito/itálico/KaTeX só carregam ao
  aparecer). `slides.js` faz `document.fonts.load()` de todas antes de quebrar as linhas.

### 4.2 Área de texto e centralização vertical (código do `beamerbaseframe.sty`)

- Margens: esquerda 29.9 pt, direita 19.85 pt → `\textwidth` = **403.7 pt**.
- Área útil vertical: de **y = 38.9** (com subtítulo; 24.9 só com título; 0 sem título) até **y = 236.0**.
- Frame centralizado `[c]`: o Beamer põe `0pt plus 1fill` **acima** e `0pt plus 1.5fill` **abaixo**
  (não é meio a meio!) → em CSS, `::before{flex:1}` e `::after{flex:1.5}` numa coluna flex.
- Frame `[t]`: `\vskip .2cm` (5.69 pt) no topo.
- Capa de seção: o template tem `\vfill` extra → proporção 2 : 2.5.
- Se o conteúdo não cabe, o TeX **encolhe as colas** com componente *minus* (topsep do `center`
  até 5 pt, `\itemsep` até 1.95 pt, espaços de fórmulas até 6 pt) proporcionalmente; o
  `shrinkToFit()` do `slides.js` faz o mesmo (tolerância de 2 pt, pois o TeX mede até a
  profundidade da última linha).
- Primeiro parágrafo do frame: `margin-top: -1.2pt` (o TeX põe a 1ª linha de base a ~10.2 pt
  do topo, não a 11.385).

### 4.3 Caixas `tcolorbox` (colframe=MyBlue, colback=white, arc=0.1mm)

- Borda 1.42 pt (0.5 mm) desenhada com `box-shadow: inset` — **bordas CSS são arredondadas para
  pixels inteiros** e deslocam o texto; sombra interna não.
- Padding (incluindo a borda): **6.37 / 15.62 / 9.84 pt** (topo / lados / base). `boxsep=0pt`:
  3.52 / 12.77 / 6.99.
- Espaço antes da caixa: 6.7 pt. Caixa → texto: 3.9 pt. `center` dentro da caixa: sem margens.
- O corpo da tcolorbox é **justificado por padrão** (é um `\parbox`), mesmo sem `\justifying`.

### 4.4 Blocos (`block`, tema Boadilla = rounded + shadow)

- Ultrapassam a área de texto em 4 pt de cada lado; cantos 4 pt; sombra 2.4 pt deslocada.
- Barra de título `#CCDFED`, altura 16.7 pt, 11.96 pt (`\large`), MyBlue, centralizada; corpo `#E6EFF6`.
- Margens: 6.7 pt antes, 5.5 pt depois; bloco → texto: 0; caixa → bloco: 13.8 pt.
- O corpo do bloco **herda** a justificação do frame.

### 4.5 Listas

- Texto do item 21.8 pt à direita da margem; rótulo ("1." em MyBlue, ou quadrado MyBlue 4.1 pt no
  `itemize`) alinhado à direita, 5.4 pt antes do texto.
- Antes da lista 3.05 pt; entre itens 2.95 pt; lista → texto 2.2 pt.
- 2º nível: `\small` (9.96 pt / 11.96 pt), mesmo recuo de 21.8 pt, itens sem espaço extra.
- Itens são **alinhados à esquerda** (o Beamer usa `\raggedright` nas listas), salvo `\justifying`
  dentro da lista.

### 4.6 Quem é justificado

| Contexto | Padrão |
|---|---|
| texto solto no frame | à esquerda (Beamer) — justificado se houver `\justifying` no frame |
| tcolorbox | **justificado** |
| corpo de block | herda do frame |
| listas | à esquerda, salvo `\justifying` dentro da lista |
| colunas | à esquerda (`\raggedright` do Beamer), salvo `\justifying` |

### 4.7 Quebra de linha e hifenização (o ponto mais importante para "ficar igual")

O navegador quebra linhas de forma gulosa; o TeX otimiza o parágrafo inteiro. `js/texbreak.js`
reimplementa o **algoritmo de Knuth–Plass** com as medidas reais das palavras (medidas no navegador,
iguais às do TeX a ±0.1 pt) e "congela" cada linha num `<span class="tl">` com o espaçamento exato.

- Parâmetros do LaTeX: `\pretolerance=100` (1ª passada, sem hifenizar), `\tolerance=200` (2ª, com
  hífens), `\linepenalty=10`, `\hyphenpenalty=50`, `\adjdemerits=10000`, `\doublehyphendemerits=10000`,
  `\finalhyphendemerits=5000`; classes de *fitness*; empate → vence a quebra mais tardia (`<=`).
- Espaço do cmss10: 0.3333 em, estica 0.1667 em, encolhe 0.1111 em; no negrito ×1.1.
  Tolerância de 0.12 pt no limite de encolhimento (erro de medição).
- **`\nonfrenchspacing`** (babel português não liga o frenchspacing): após `. ? !` o espaço ganha
  +0.111 em, estica ×3 e encolhe ×1/3; `:` 2000, `;` 1500, `,` 1250; após maiúscula o fator vira 1000.
  Os espaços afetados viram `<span class="sf" data-sf="3000">`.
- **Hifenização**: padrões do português (biblioteca `hyphen`, mesmos padrões do TeX), mínimo 2 letras
  antes e 3 depois. **Regra crucial**: o documento usa codificação **OT1** (sem `\usepackage[T1]{fontenc}`),
  então letras acentuadas são montadas com `\accent` e o TeX **só hifeniza a parte da palavra antes do
  primeiro acento** ("oti-mização", "vizi-nhança", "repre-sentação"; nunca "solu-ções").
  ⚠ Se uma apresentação usar `\usepackage[T1]{fontenc}`, essa restrição **não** vale: ajuste a função
  `hyph` em `slides.js` (remover o corte no primeiro caractere acentuado).
- Linhas ragged (à esquerda) usam estiramento infinito: o algoritmo minimiza o número de linhas e
  não comprime espaços sem necessidade.

### 4.8 Colunas

`columns` sem `[onlytextwidth]` coloca as colunas em `\hbox to \textwidth` com `\hskip-\beamer@leftmargin`
e `\hfill` entre elas → **ocupam a largura do papel**, com espaços iguais antes, entre e depois
(`justify-content: space-evenly` com margens negativas). Cada coluna é uma `minipage` que começa com
`\leavevmode\raggedright`. Margem antes das colunas: 13.2 pt.

### 4.9 Fórmulas em destaque

- O TeX põe a linha de base da fórmula a `\abovedisplayskip (11pt) + \baselineskip` = **24.55 pt** da linha
  anterior e a seguinte a 24.55 pt da fórmula. Uma caixa de linha de **35.55 pt** com a fórmula inline
  reproduz isso exatamente (baseline a 22.385 pt do topo).
- Linha anterior curta (termina antes de 2 em à esquerda da fórmula) ou fórmula logo após outra:
  `\abovedisplayshortskip` (0) e `\belowdisplayshortskip` (6.5) → classe `.short` (marcada pelo JS).
- Fórmulas altas (raiz, frações): o TeX troca `\baselineskip` por `\lineskip` (1 pt) — o JS soma a
  diferença como margem.
- Fórmulas **inline** não aumentam a altura da linha (`.katex-html` com altura 0).
- `\text{}` dentro de fórmula usa a fonte **sans** (Beamer com `[onlymath]{serif}`) → convertido para `\textsf{}`.

### 4.10 Algoritmo (`algorithm` + `algpseudocode`)

Régua superior 0.8 pt, régua abaixo da legenda 0.4 pt, régua inferior 0.4 pt (desenhadas com
`linear-gradient`, que não é arredondado para pixels); 11.5 pt antes; recuos 10.9 / 27.3 / 43.7 … pt.

### 4.11 Capa, sumário e capa de seção

- Capa: título 14.35 pt MyBlue, autor e data 10.91 pt, centralizados no eixo do `\textwidth`
  (x = 231.75, não no centro do papel).
- Sumário: círculos MyBlue de 8.5 pt com número branco; linhas de base a 49.6 + 34.3·k.
- Capa de seção: título 14.35 pt MyBlue centralizado no eixo do `\textwidth`.

---

## 5. O motor (`js/`)

### `slides.js`

- Cada `<section class="frame">` é um frame; o rodapé é gerado (`data-author`, `data-shorttitle` no `<body>`).
- Overlays: `data-on` (visibility) e `data-only` (display).
- Escala: `#deck` de 453.543×255.118 pt centralizado e escalado para caber na janela.
- KaTeX renderiza `\(..\)` e `\[..\]` no carregamento.
- Ao mostrar cada frame (e, em segundo plano, todos os demais): hifeniza, quebra as linhas (Knuth–Plass),
  marca fórmulas curtas/altas e encolhe colas se o conteúdo não couber.
- Eventos em cada `<section>`: `enter` `{from, step}`, `step` `{step, prev}`, `leave`.
- `window.Deck`: `show(i, passo)`, `next()`, `prev()`, `frames`, `current`.

### `js/anim/core.js` — animações

Uso no HTML:

```html
<span class="anim" data-anim="cube" data-from="s1" data-state="s2,s2b"></span>
```

- `data-state`: estado da figura em cada passo do frame (o último vale para os seguintes).
- `data-from`: estado em que a figura estava no frame anterior; a animação de entrada parte dele.
- Regras: **anima** só ao avançar com → (do frame anterior, ou para o próximo passo); voltar, pular
  ou imprimir mostra direto o estado final. → durante a animação a completa; R repete;
  "reduzir movimento" do sistema desliga as animações.
- Elementos clicáveis/arrastáveis precisam de `data-interactive` (para o clique não avançar o slide).

Um componente é registrado assim:

```js
Anim.define('nome', function (host, opts) {
  // monte o SVG/canvas dentro de host
  return {
    snap: function (estado) { /* desenha o estado final, sem animar */ },
    play: async function (de, para, h) {
      // h.tween(ms, function (e, t) {...}, Anim.ease.inOut)  -> Promise
      // h.wait(ms), h.all([...])
    }
  };
});
```

Utilitários: `Anim.svg(tag, attrs, pai)`, `Anim.ease.{linear,inOut,out,back}`, `Anim.lerp`, `Anim.mix(cor1, cor2, t)`.
Cuidados: no `snap`, **zere tudo** que a animação possa ter deixado (opacidades, transformações),
porque a animação pode ser interrompida a qualquer momento.

### Componentes existentes (aula de referência)

| Arquivo | `data-anim` | Slides | O que faz |
|---|---|---|---|
| `cube.js` | `cube` | 54–62 | cubo das soluções binárias (flip): vizinhos brotam com o bit trocado em destaque, carta percorre o caminho, arestas de ε=2; clique num vértice mostra a vizinhança |
| `ciclo.js` | `ciclo` | 6–9, 40–43 | ciclo gerar → selecionar (figura principios_S): no 6 a figura se monta e o ciclo roda; 7/40 geração (soluções saem de s pela seta e viram candidatos); 8 reposição (candidato escolhido volta a s); 9 memória (histórico guardado e consultado); 41 transformações locais (cópia de s no conjunto, raios até cada candidato); 42 idem + conjunto destacado como vizinhas de s. Estado final = figura original |
| `continuo.js` | `continuo` | 47–48 | vizinhança de raio ε: eixos e s1 se montam; no 48 surgem soluções no plano, o raio gira desenhando o disco e as de dentro ficam azuis; arrastar a ponta do raio muda ε |
| `landscape.js` | `landscape` | 120 | busca local (melhor vizinho num raio de 10 pt ao longo da curva) em cada forma de landscape: o Vale chega ao fundo, os rugosos ficam presos; as bolinhas ficam nos ótimos locais (vermelhas) com o rastro; clicar num painel solta outra bolinha |
| `fig.js` + `dados/*.js` | `fig` (`data-fig` = `casas`, `predio`, `carta`, `carta2`, `mundo`) | 13–37 | figuras em camadas: a passagem de uma figura do PDF para a seguinte é animada a partir da diferença entre elas (casas sobem do chão, setas são traçadas com a ponta surgindo no fim, textos surgem palavra por palavra, janela que muda de cor troca suave com pulso); efeitos por cena: anel no apartamento de referência (prédio), ficha percorrendo os saltos e caindo no vão (carta), carimbo "NÃO É UMA VIZINHANÇA ACEITÁVEL!!" (mundo) |
| `swap.js` | `tsp3`, `tspswap`, `ksA`, `ksB`, `ksC`, `viz` | 64–91 | grafos de vizinhança com o operador swap (TSP e mochila): o hexágono do TSP com 3 cidades cresce camada por camada; vizinhos de (1,2,3,4) brotam e os dois elementos trocados mudam de lugar no rótulo; ficha percorre os caminhos contando os movimentos; clique num nó mostra a vizinhança. **Corrige o PDF**: o vizinho swap(1,2) é (2,1,3,4) (no Ipe estava (2,1,4,3)) e o caminho do slide 71 tem 4 movimentos (por paridade, não existe caminho com 3). Mochila: vizinhos de (0,1,1,0) e de (1,1,1,0) brotam com os bits trocando de lugar; caixa "????" surge na aresta e balança no slide 76; no 79 os dois grafos entram deslizando e depois ganham contornos e arco. Mantém, como no PDF, o nó (0,1,1,0) entre os vizinhos de (0,1,1,0) (swap(1,4) troca dois zeros). Vizinhanças/infactibilidade (`viz`, 82–91): N1 e N2 crescem a partir de um nó, sobrepõem-se e se desconectam; infactíveis ficam vermelhos com um pulso; a ficha percorre o caminho de 4 movimentos e depois o atalho de 2 pelo nó infactível; no 91 a aresta que liga o ótimo à parte factível some |
| `localopt.js` | `localopt` | 95–103 | curva de custo, bola de vizinhança deslizando, ótimos locais marcados por varredura; arrastar a bola / roda do mouse muda ε |
| `flgraph.js` | `flgraph` | 108–111 | grafo do espaço de busca "deita" no piso; custos crescem; soluções sobem à altitude |
| `surface3d.js` | `surface3d`, `corte2d`, `reveal` | 112–119 | superfícies do pgfplots em 3D ao vivo (girar com o mouse, duplo clique volta), entrada girando, malha→superfície, busca local na malha, plano de corte + curva; no 119 o plano e a curva ficam ao vivo no estado final (`cut`) e o gráfico 2D (`corte2d`) é a curva verdadeira f(x, y do corte), traçada junto com a do 3D sobre os eixos de `img/search_space3_eixos.svg`; no estado `cut` o plano pode ser arrastado e o gráfico 2D acompanha (escala vertical fixa = faixa de z da superfície); o plano volta ao lugar ao sair do slide |

---

## 6. Como criar uma nova animação a partir de uma figura

1. **Extraia a geometria** da figura PDF original:
   `python ferramentas/figura_geometria.py img/minhafigura.pdf`
   → círculos (nós), linhas/curvas com cor, espessura e tracejado, textos com fonte, tamanho e
   linha de base, em pt com origem no canto superior esquerdo (igual ao SVG).
2. Monte o SVG com `viewBox="0 0 W H"` (W×H = tamanho natural) e largura `W × scale` pt (o `scale`
   do `\includegraphics`). Use as mesmas espessuras e cores → o estado final fica idêntico à figura.
   Rótulos: `KaTeX_Main` (Computer Modern/Latin Modern Roman) e `KaTeX_Math` itálico para variáveis.
   Anel de nó típico do Ipe: `circle r=0.93 fill=#fff stroke-width=0.54` (anel de 1.2 / 0.66).
3. Defina os **estados** (um por figura do PDF, e estados extras para passos novos) e escreva `snap`
   e `play` (o `play` anima a diferença entre dois estados).
4. No `index.html`, troque o `<img>` por `<span class="anim" data-anim="..." data-from=".." data-state="..">`
   e inclua o `<script src="js/anim/arquivo.js">` (o conversor inclui automaticamente os arquivos de `js/anim/`).
5. **Teste**: `node ferramentas/verificacao/filmar.js index.html <frame-anterior> ArrowRight 250 12 quadros x,y,w,h`
   e `python ferramentas/verificacao/tira.py quadros tira.png 4`; confirme o estado final com
   `capturar.js` + `comparar.py`.

Padrões que funcionaram bem: ao avançar, o que é novo **aparece em sequência** (aresta cresce, nó "brota"
com leve *overshoot* `ease.back`, rótulo surge); destaques temporários em cor e negrito que voltam ao normal;
transições entre frames vizinhos com a mesma figura em vez de troca seca; passos extras via `data-steps`.

### Sequências de figuras quase iguais (`fig.js`)

Quando uma figura do PDF vira outra acrescentando ou tirando elementos (setas, rótulos, destaques),
não é preciso redesenhar nada:

```bash
cd img   # pasta das figuras PDF
python ../html/ferramentas/figura_camadas.py CENA ../html/js/anim/dados/CENA.js fig1.pdf fig2.pdf fig3.pdf
```

- As figuras precisam ter o **mesmo quadro** (o Ipe desenha um retângulo branco em volta; é o caso aqui).
- O script lista, para cada figura, os itens que entram (+) e saem (−) — confira se a diferença faz sentido.
- No `index.html`: `<script src="js/anim/dados/CENA.js">` antes de `fig.js`, e no frame
  `<span class="anim" data-anim="fig" data-fig="CENA" data-from="fig1" data-state="fig2">`
  (estados = nomes das figuras, mais `vazio`).
- Em `SCENES` (no topo de `fig.js`): `scale` (= `scale` do `\includegraphics`), `rise` (casas sobem do chão),
  `order: 'x'` (tudo da esquerda para a direita), e efeitos: `ref`, `travel`, `shake`, `stamp`, estados `extra`.
- Os dados ficam em `js/anim/dados/` (específicos desta aula; o conversor não os inclui em outras aulas).

### Gráficos do pgfplots em 3D (`surface3d.js`)

- A projeção do pgfplots (vista padrão `view={25}{30}`) é deduzida dos **cantos da caixa** no PDF
  (A = (xmin,ymin,zmin), B = (xmax,ymin,zmin), D = (xmin,ymax,zmin), T = (xmin,ymin,zmax)):
  `sx = (B−A).x / cos25°`, `sy = (B−A).y / (sin25°·sin30°)`, `kz = −(T−A).y / (sy·cos30°)`;
  centro da caixa = A + (ex+ey+ez)/2. Com isso a renderização ao vivo coincide com a imagem.
- O pgfplots **amplia o eixo z em 10% do intervalo dos dados** de cada lado (x e y não).
- Colormap padrão `hot`: azul → amarelo → laranja → vermelho (3 trechos iguais); cor da face = média
  dos 4 cantos; aresta = 80% da cor (`mapped color!80!black`), 0.3985 pt.
- Desenho em `<canvas>` com algoritmo do pintor; caixa: arestas das faces de trás.
- Parado, mostra a **imagem original**; o canvas só aparece ao girar/animar (troca imperceptível).
- Para um gráfico novo: acrescente uma entrada em `PLOTS` (função, domínio, amostras, estilo `surf`/`mesh`,
  cantos A/B/D/T lidos com `figura_geometria.py`, rótulos com posições do PDF).

---

## 7. Armadilhas conhecidas

- **Não rode o conversor sobre um `index.html` com animações** (ele se recusa sem `--forcar`).
- Bordas CSS finas são arredondadas para pixels inteiros → use `box-shadow: inset` ou `linear-gradient`.
- Margens em contêineres flex **não colapsam** (como as colas do TeX, que somam) — o layout usa flex de propósito.
- `getTotalLength()`/medidas em elementos com `display:none` dão 0: meça só com o frame visível.
- Medir texto antes de todas as fontes carregarem dá larguras erradas (fonte reserva) — sempre esperar `document.fonts.load`.
- SVG em `<img>` recorta conteúdo fora da CropBox; o `\includegraphics` do LaTeX não recorta.
- Ao inserir componentes por script, cuidado com imagens repetidas (a mesma figura em vários frames):
  embrulhe **a ocorrência certa** (já aconteceu de embrulhar duas vezes a mesma).
- **(Para o Claude)** no Bash deste ambiente (Git Bash no Windows), `\\` dentro de comandos pode virar `\`
  antes de chegar ao Python/sed — isso já corrompeu comentários (`\a` → caractere BEL). Para editar código com
  barras invertidas, use as ferramentas Edit/Write, ou `bytes([92])` no Python.
- **(Para o Claude)** saída do Python no Windows: use `PYTHONIOENCODING=utf-8`; leia JSON com `encoding='utf-8'`.
- PDF de referência renderizado pelo poppler mostra linhas pontilhadas finas mais apagadas do que o navegador —
  diferença só de renderização.

---

## 8. Se a próxima apresentação for diferente

| Mudança no .tex | O que ajustar |
|---|---|
| outra cor de estrutura | `--myblue` (e tons derivados: `--foot-l` = rodapé esquerdo, `--foot-r`, `--block-title`, `--block-body`) em `beamer.css` |
| outro tema Beamer (não Boadilla) | rodapé, blocos, títulos e capas mudam — medir o PDF novo (`python ferramentas/figura_geometria.py aula.pdf:5` lista cores, retângulos e textos da página 5) e recalibrar `beamer.css` |
| `aspectratio` ≠ 169 ou fonte ≠ 11pt | dimensões do slide, `--textwidth`, tamanhos e entrelinhas: recalibrar a partir do PDF |
| `\usepackage[T1]{fontenc}` | desligar a regra "hifenizar só antes do primeiro acento" (`hyph` em `slides.js`) |
| `\frenchspacing` | desligar `markSpaceFactors` em `texbreak.js` |
| idioma ≠ português | trocar `lib/hyphen/pt.js` pelos padrões do idioma (pacote npm `hyphen`) e `lang` no `<html>` |
| margens diferentes (`\setbeamersize`) | `.fc` left/right e `TEXTWIDTH` em `tex2html.py` |

---

## 9. Pedido sugerido ao Claude para uma nova aula

> "Leia `html/contexto.md` da aula *5.0 - Algoritmos de solução única - Conceitos*. Converta a
> apresentação `<arquivo>.tex` desta pasta para HTML com `ferramentas/tex2html.py`, verifique a
> fidelidade com os scripts de `ferramentas/verificacao/` e corrija o que for preciso. Depois,
> proponha animações para as figuras que mais ganham com movimento."
