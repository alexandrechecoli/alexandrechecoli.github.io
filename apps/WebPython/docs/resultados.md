# Lendo os resultados

Os resultados ficam disponíveis depois de `maximize`, `minimize` ou `solve` (veja [Função objetivo e resolução](objetivo.md)).

## Status da solução

### `h.getModelStatus()`

Devolve o status com que o solver terminou. Confira o status **antes** de usar qualquer valor.

### `h.modelStatusToString(status)`

Converte o status em texto, para imprimir.

```python
status = h.getModelStatus()
print("Status:", h.modelStatusToString(status))

if status == highspy.HighsModelStatus.kOptimal:
    print("Valor ótimo:", h.getInfo().objective_function_value)
else:
    print("O modelo não tem solução ótima.")
```

| Texto | Constante | Significado |
|---|---|---|
| `Optimal` | `kOptimal` | Solução ótima encontrada. |
| `Infeasible` | `kInfeasible` | Não existe solução que atenda a todas as restrições. |
| `Unbounded` | `kUnbounded` | O objetivo pode melhorar sem limite: falta alguma restrição. |
| `Time limit reached` | `kTimeLimit` | O tempo acabou antes de provar a otimalidade (veja [Opções do solver](opcoes.md)). |

> Em um modelo inviável ou ilimitado, `h.val(x)` não dá erro: devolve `0.0` ou outro número sem significado. Só o status diz se os valores valem.

## Valor da função objetivo

### `h.getInfo().objective_function_value`

O valor ótimo da função objetivo. `h.getObjectiveValue()` devolve o mesmo número.

## Valores das variáveis

### `h.val(variável)`

Valor de uma variável na solução. Também aceita uma expressão, o que evita refazer a conta à mão:

```python
print("Mesas:", h.val(mesas))
print("Horas usadas na marcenaria:", h.val(2 * mesas + cadeiras))
```

### `h.vals(coleção)`

Valores de várias variáveis de uma vez. Com um dicionário de variáveis, devolve um dicionário com as mesmas chaves:

```python
for (i, j), quantidade in h.vals(x).items():
    if quantidade > 1e-6:
        print(i, "->", j, quantidade)
```

`h.variableValue(variável)` é o mesmo que `h.val(variável)`.

### `h.allVariableValues()` e `h.allVariableNames()`

Devolvem os valores e os nomes de todas as variáveis, na ordem em que foram criadas:

```python
for nome, valor in zip(h.allVariableNames(), h.allVariableValues()):
    print(nome, "=", valor)
```

## Comparar números com cuidado

O solver trabalha com números de ponto flutuante: um valor que deveria ser `0` pode sair como `1e-12`, e um binário igual a `1` pode sair como `0.9999999`. Por isso:

- para testar se uma variável contínua é positiva, use `valor > 1e-6` em vez de `valor > 0`;
- para testar se uma binária foi escolhida, use `valor > 0.5` em vez de `valor == 1`.

## Análise de sensibilidade (só em PL)

Para estes resultados, guarde a restrição ao criá-la: `r = h.addConstr(...)`.

### `h.constrValue(restrição)`

Valor do lado esquerdo da restrição na solução. A diferença para o lado direito é a **folga**.

### `h.constrDual(restrição)`

**Preço-sombra** (valor dual) da restrição: quanto o valor ótimo muda para cada unidade a mais no lado direito, enquanto a base ótima não muda. Restrição com folga tem preço-sombra zero.

### `h.variableDual(variável)`

**Custo reduzido** da variável.

```python abrir
import highspy

h = highspy.Highs()
h.silent()  # oculta o log do solver

mesas = h.addVariable(lb=0, name="mesas")
cadeiras = h.addVariable(lb=0, name="cadeiras")

restricoes = {
    "marcenaria": h.addConstr(2 * mesas + cadeiras <= 100, name="marcenaria"),
    "acabamento": h.addConstr(mesas + cadeiras <= 80, name="acabamento"),
    "demanda": h.addConstr(mesas <= 40, name="demanda"),
}

h.maximize(40 * mesas + 30 * cadeiras)

print("Status:", h.modelStatusToString(h.getModelStatus()))
print("Lucro: ", h.getInfo().objective_function_value)
print()
print(f"{'restrição':<12} {'usado':>7} {'preço-sombra':>13}")
for nome, r in restricoes.items():
    print(f"{nome:<12} {h.constrValue(r):>7.1f} {h.constrDual(r):>13.2f}")
```

Na saída, uma hora a mais de marcenaria vale R$ 10 e uma de acabamento vale R$ 20; a restrição de demanda tem folga (20 de 40) e preço-sombra zero.

> Em modelos com variáveis inteiras ou binárias (PLI), preços-sombra e custos reduzidos não têm essa interpretação.

## Informações da resolução de PLI

`h.getInfo()` também traz dados do *branch-and-bound*:

| Campo | Significado |
|---|---|
| `h.getInfo().mip_gap` | Diferença relativa entre a melhor solução e o melhor limite (0 quando a otimalidade foi provada). |
| `h.getInfo().mip_node_count` | Número de nós explorados na árvore. |
