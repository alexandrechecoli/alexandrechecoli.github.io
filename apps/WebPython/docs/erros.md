# Erros comuns

Quando o código falha, o Python imprime em vermelho um *traceback*. A última linha diz o tipo do erro; as linhas com `File "<exec>", line N` dizem onde ele aconteceu. Clique em uma dessas linhas para ir ao ponto do código. A linha do erro também fica destacada no editor.

## Erros de modelagem com o highspy

### `Exception: Only linear expressions are allowed.`

Duas variáveis de decisão foram multiplicadas (`x * y` ou `x * x`). O modelo deixou de ser linear, e o HiGHS, neste editor, só resolve modelos lineares. Confira se um dos fatores não deveria ser um dado (um número) em vez de uma variável.

### `TypeError: unsupported operand type(s) for /`

Uma variável foi dividida (`x / 2`) ou usada como divisor. Multiplique pelo inverso: `0.5 * x`.

### `TypeError: unsupported operand type(s) for ** or pow()`

Uma variável foi elevada a uma potência (`x ** 2`). Também não é linear.

### `TypeError: '<' not supported between instances of 'highs_var' and 'int'`

A restrição usa desigualdade estrita (`<` ou `>`). Em programação linear só existem `<=`, `>=` e `==`.

### `Exception: Unexpected parameters.`

Uma variável foi multiplicada por um número do numpy, com a variável na frente (`x * valor`). Acontece com dados lidos pelo pandas. Escreva o número primeiro (`valor * x`), converta com `float(valor)`, ou converta a tabela com `.to_dict()` logo depois de ler (veja [Ler dados de arquivos](dados.md)).

### `AttributeError: 'bool' object has no attribute 'bounds'`

O que foi passado a `addConstr` não contém nenhuma variável, e o Python calculou a comparação como verdadeiro ou falso. Causas comuns: um `sum(...)` sobre uma lista vazia, ou uma restrição escrita só com dados (`oferta[i] <= 100`).

### `SyntaxError` em uma restrição com `=`

`h.addConstr(x + y = 10)` usa um `=` só, que é atribuição. A igualdade em restrições é `==`.

## O modelo roda, mas o resultado está errado

### Todos os valores saem zero

- `h.val(...)` foi chamado antes de `maximize` ou `minimize`: o modelo ainda não foi resolvido.
- O status não é `Optimal`. Em um modelo inviável ou ilimitado, os valores não significam nada. Imprima sempre o status (veja [Lendo os resultados](resultados.md)).

### Status `Infeasible`

Não existe solução que atenda a todas as restrições ao mesmo tempo. Para achar a causa:

- confira o sentido das desigualdades (`<=` no lugar de `>=`);
- confira os dados: em um problema de transporte, a oferta total precisa cobrir a demanda total;
- comente as restrições uma a uma (`Ctrl+/`) até o modelo ficar viável: a última comentada participa do conflito.

### Status `Unbounded`

O objetivo pode melhorar sem limite. Em geral falta uma restrição, ou o objetivo está com o sentido trocado (`maximize` em um problema de custo). Lembre também que `lb=-highspy.kHighsInf` cria uma variável sem limite inferior.

### Variável inteira com valor fracionário

A variável foi criada com `addVariable`, que é contínua. Use `addIntegral` ou `addBinary` (veja [Variáveis de decisão](variaveis.md)). O log confirma: um modelo com inteiras começa com `MIP has …`, não com `LP has …`.

### Uma binária escolhida não aparece na listagem

O valor pode ter saído como `0.9999999`. Teste com `h.val(x) > 0.5`, não com `== 1`.

## Erros do Python

### `NameError: name '…' is not defined`

Um nome foi usado sem ter sido criado: erro de digitação, maiúsculas e minúsculas trocadas, ou a linha que cria a variável vem depois da que a usa.

### `IndentationError` e `TabError`

O recuo das linhas está inconsistente. No Python, o que fica dentro de um `for` ou `if` precisa ter o mesmo recuo, por convenção 4 espaços.

### `KeyError: '…'`

A chave não existe no dicionário. Com dados de arquivos, costuma ser diferença de grafia entre os arquivos (`"SP"` em um, `"Sao Paulo"` em outro) ou espaços sobrando no CSV.

### `FileNotFoundError: No such file or directory`

O nome em `open(...)` ou `read_csv(...)` não corresponde a nenhuma aba de dados. O nome precisa ser idêntico ao da aba, com a extensão e respeitando maiúsculas.

### `ModuleNotFoundError: No module named '…'`

O pacote não existe neste editor. Estão disponíveis o `highspy` e os pacotes da distribuição Pyodide, como `numpy` e `pandas`. Outros solvers e bibliotecas de modelagem (Gurobi, PuLP, OR-Tools) não estão.

### `OSError: [Errno 29] I/O error` ao usar `input()`

Não há como digitar dados durante a execução. Coloque os valores no código ou em uma aba de dados.

### Aviso sobre o `scipy.optimize`

O `scipy.optimize` traz uma cópia própria do HiGHS, que entra em conflito com a do `highspy` e trava o Python no navegador. Por isso o editor recusa qualquer código que o importe.

## O Python travou ou está demorando

Um modelo de PLI grande pode levar muito tempo. O botão de parar (ou `Shift+F5`) interrompe a execução e recarrega o Python, o que leva alguns segundos. Para limitar o tempo sem perder a melhor solução encontrada, use `time_limit` (veja [Opções do solver](opcoes.md)).
