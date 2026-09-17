# BranchAndBound — visualizador didático de Branch and Bound

## Objetivo
Ferramenta web para ensinar Branch and Bound (B&B) para MIP. O aluno resolve um
modelo interativamente: a cada passo escolhe (1) qual variável fracionária
ramificar e (2) qual nó aberto da árvore explorar em seguida. A árvore é
desenhada graficamente conforme o aluno avança. HiGHS (via WASM) é usado como
motor de LP para resolver a relaxação de cada nó — ele NÃO roda seu próprio
B&B interno; quem decide tudo é o aluno (ou, futuramente, uma regra automática
escolhida).

Projeto irmão de `../WebHighs` (um solver de LP/MIP genérico com editor de
modelos). Não é para reaproveitar a UI dele, só a infraestrutura do HiGHS/WASM
e os padrões de uso da API.

## Decisões de design já tomadas (não rediscutir sem motivo)
1. **Ramificação manual**: dentre as variáveis inteiras com valor fracionário
   na relaxação do nó atual, o aluno escolhe qual será ramificada. O sistema
   cria os dois filhos (piso e teto) a partir dessa escolha.
2. **Seleção de nó manual**: o aluno também escolhe, a cada passo, qual nó
   aberto (fronteira) expandir em seguida — não é DFS/best-first fixo. Isso é
   proposital: a ordem de exploração é ela própria um conceito a ensinar. A
   poda por limite (comparação contra o incumbente) precisa ser correta
   independentemente da ordem escolhida — ordem afeta só eficiência (nº de
   nós), nunca a corretude do resultado.
3. **Limite de tamanho do modelo**: o limite deve ser sobre o número de
   **variáveis inteiras/binárias** (não variáveis totais — contínuas não são
   ramificadas), algo na faixa de 10–15. Além disso, incluir um **teto de
   segurança por número de nós visitados** (ex.: 300–500) independente do
   tamanho do modelo, como proteção contra modelos mal condicionados que
   geram árvores muito maiores que o esperado.
4. Fathoming deve cobrir os três motivos clássicos e o nó deve guardar/exibir
   qual foi aplicado: poda por limite (bound pior que o incumbente), poda por
   inviabilidade (LP da relaxação infactível) e poda por integralidade
   (solução da relaxação já é inteira — candidata a incumbente).

## Ideias ainda não decididas (perguntar ao usuário antes de implementar)
- Modo comparativo pós-hoc: mostrar o que uma regra padrão (mais fracionária,
  pseudo-custo etc.) teria escolhido, sem forçar isso durante a exploração —
  ficou como possível v2, não é escopo inicial.
- Layout gráfico da árvore (biblioteca vs. layout próprio tipo
  Reingold-Tilford) — ainda não escolhido.
- Formato de entrada do modelo (LP text via HiGHS, form programático, ou
  ambos) e biblioteca de exemplos prontos (mochila, atribuição, etc.).
- Feedback de eficiência ao final (nº de nós visitados pelo aluno vs. uma
  estratégia de referência) — mencionado como ideia, não fechado.

## Arquitetura recomendada (validada em conversa, ainda não implementada)
HiGHS é usado só como "calculadora de LP", nunca resolve o MIP sozinho:
1. Carrega o modelo original uma vez (`passModel` ou `createModel`), com a
   integralidade das variáveis inteiras desligada (relaxação contínua).
2. Cada nó da árvore = um conjunto de bounds apertados sobre as variáveis já
   ramificadas em algum ancestral.
3. Para resolver um nó: aplicar os bounds do nó (`changeColBounds`/
   `changeColsBounds`), rodar (`run()`), ler a solução (`getSolution()` /
   `getCols(...)`).
4. Fathom se: infactível, ou objetivo pior que o incumbente, ou solução já
   inteira (vira candidato a incumbente). Senão, é candidato a ramificação —
   aguarda o aluno escolher a variável.

## Arquivos deste repositório
- `vendor/highs.js`, `vendor/highs.wasm` — build oficial do HiGHS em
  WebAssembly, do projeto **highs-js**
  (https://lovasoa.github.io/highs-js/highs.js). É a mesma engine usada em
  `../WebHighs`. Exponibiliza (confirmado via grep no bundle): `passModel`,
  `createModel({format:'lp', data})`, `changeColBounds`/`changeColsBounds`,
  `changeColIntegrality`/`changeColsIntegrality`, `run()`, `getSolution()`,
  `getDimensions()`, `getCols(...)`, `getRowName`/`getColName`,
  `options.set(...)`, `exportSolution()`, `dispose()`, além de uma API de
  callback (`setCallback`/`startCallback`/`stopCallback`) que **não** vamos
  usar (é do B&B interno do HiGHS, que não controlamos — ver decisão de
  arquitetura acima).
- `referencia/lp-solver-webhighs.html` — cópia do app irmão `WebHighs`,
  mantida só como referência de uso real da API (não é para editar nem
  herdar UI dela). Ver especialmente o worker inline por volta da linha 2540
  (`Module({...})`, `highs.createModel(...)`, `model.run()`,
  `model.getSolution()`/`getDimensions()`/`getCols()`, `model.dispose()`) para
  o padrão de chamadas real, e o uso de Web Worker para não travar a UI
  enquanto o WASM resolve.
- `Iniciar BranchAndBound.bat` — sobe um servidor HTTP local na porta 8935
  (porta diferente da do WebHighs, 8934, para poder rodar os dois ao mesmo
  tempo) e abre `index.html` no navegador. **`index.html` ainda não existe**
  — precisa ser criado como parte da implementação.

## Como rodar
`Iniciar BranchAndBound.bat` (requer Python no PATH; serve arquivos estáticos
via `python -m http.server`, necessário porque WASM/Workers exigem HTTP, não
`file://`).
