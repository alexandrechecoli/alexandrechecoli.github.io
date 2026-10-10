# Entender o log do HiGHS

Ao resolver um modelo, o HiGHS imprime um relatório em inglês antes dos seus `print`. Ele serve para conferir se o modelo montado é o que você pretendia e para ver como a resolução andou. Para ocultá-lo, use `h.silent()` (veja [Opções do solver](opcoes.md)).

## O começo, igual em PL e PLI

```text
LP has 3 rows; 2 cols; 5 nonzeros
Coefficient ranges:
  Matrix [1e+00, 2e+00]
  Cost   [3e+01, 4e+01]
  Bound  [0e+00, 0e+00]
  RHS    [4e+01, 1e+02]
Presolving model
2 rows, 2 cols, 4 nonzeros  0s
```

| Trecho | Significado |
|---|---|
| `LP has …` ou `MIP has …` | Tipo do modelo: `LP` é PL; `MIP` é PLI (há variáveis inteiras ou binárias). |
| `rows` | Número de restrições. |
| `cols` | Número de variáveis. |
| `nonzeros` | Coeficientes diferentes de zero nas restrições. |
| `Coefficient ranges` | Menor e maior valor absoluto dos coeficientes das restrições (`Matrix`), do objetivo (`Cost`), dos limites das variáveis (`Bound`) e dos lados direitos (`RHS`). |
| `Presolving model` | O *presolve* simplifica o modelo antes de resolver: remove restrições redundantes e fixa variáveis. As linhas seguintes mostram o tamanho depois da simplificação. |

> A primeira linha é a conferência mais útil: se você esperava 7 restrições e o log diz `3 rows`, alguma restrição não foi adicionada.

## O fim, em um modelo de PL

```text
Model status        : Optimal
Simplex   iterations: 2
Objective value     :  2.6000000000e+03
HiGHS run time      :          0.01
```

| Trecho | Significado |
|---|---|
| `Model status` | `Optimal`, `Infeasible` (inviável) ou `Unbounded` (ilimitado). |
| `Simplex iterations` | Número de iterações do método simplex. |
| `Objective value` | Valor ótimo, em notação científica: `2.6e+03` é 2600. |
| `HiGHS run time` | Tempo de resolução, em segundos. |

## O meio, em um modelo de PLI

Em PLI aparece a tabela do *branch-and-bound*, com uma linha a cada avanço:

```text
        Nodes      |    B&B Tree     |            Objective Bounds              |
Src  Proc. InQueue |  Leaves   Expl. | BestBound       BestSol              Gap |
 S       0       0         0   0.00%   270             160               68.75%
 T       0       0         0   0.00%   168             165                1.82%
         1       0         1 100.00%   165             165                0.00%
```

| Coluna | Significado |
|---|---|
| `Src` | Letra que indica de onde veio uma nova melhor solução (a legenda é impressa logo acima da tabela). Linha sem letra é só acompanhamento. |
| `Proc.` | Nós da árvore já processados. |
| `InQueue` | Nós esperando para serem explorados. |
| `Leaves`, `Expl.` | Folhas da árvore e fração da árvore já explorada. |
| `BestBound` | Melhor limite: nenhuma solução pode ser melhor que isso. Vem das relaxações lineares. |
| `BestSol` | Melhor solução inteira encontrada até o momento. |
| `Gap` | Distância relativa entre `BestSol` e `BestBound`. Quando chega a zero, a otimalidade está provada. |

Em um problema de maximização, `BestBound` vai descendo e `BestSol` vai subindo até se encontrarem; na minimização, o contrário.

## O fim, em um modelo de PLI

```text
Solving report
  Status            Optimal
  Primal bound      165
  Dual bound        165
  Gap               0% (tolerance: 0.01%)
  Timing            0.27
  Nodes             1
```

| Trecho | Significado |
|---|---|
| `Status` | `Optimal`, `Infeasible`, `Time limit reached` etc. |
| `Primal bound` | Valor da melhor solução inteira encontrada. |
| `Dual bound` | Melhor limite provado. |
| `Gap` | Diferença relativa entre os dois, e a tolerância usada para parar. |
| `Timing` | Tempo de resolução, em segundos. |
| `Nodes` | Nós explorados na árvore. |

## Cores na saída

Este editor colore as linhas do log: o cabeçalho do HiGHS, os títulos de seção, as linhas da tabela com nova melhor solução, `Optimal` em verde e `Infeasible` ou `Unbounded` em vermelho. As mensagens de erro do Python também saem em vermelho.
