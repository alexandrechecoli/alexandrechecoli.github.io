# Mix de produção (PL)

[Abrir este exemplo no editor](#exemplo-mix)

## O problema

Uma marcenaria fabrica mesas e cadeiras e quer saber quanto produzir de cada uma para ter o maior lucro.

| | Mesa | Cadeira | Disponível |
|---|---|---|---|
| Lucro por unidade | R$ 40 | R$ 30 | |
| Horas de marcenaria | 2 | 1 | 100 |
| Horas de acabamento | 1 | 1 | 80 |
| Demanda máxima | 40 | sem limite | |

## O modelo

- **Variáveis:** `mesas` e `cadeiras`, as quantidades produzidas, ambas não negativas.
- **Objetivo:** maximizar `40 mesas + 30 cadeiras`.
- **Restrições:**
  - marcenaria: `2 mesas + cadeiras <= 100`
  - acabamento: `mesas + cadeiras <= 80`
  - demanda: `mesas <= 40`

## O código, parte por parte

```python
h = highspy.Highs()

mesas = h.addVariable(lb=0, name="mesas")
cadeiras = h.addVariable(lb=0, name="cadeiras")
```

Cada [variável de decisão](variaveis.md) do modelo vira uma variável do Python. O `lb=0` é a condição de não negatividade.

```python
h.addConstr(2 * mesas + cadeiras <= 100, name="marcenaria")
h.addConstr(mesas + cadeiras <= 80, name="acabamento")
h.addConstr(mesas <= 40, name="demanda")
```

As [restrições](restricoes.md) são escritas quase como no papel. A demanda máxima também poderia ser um limite da variável: `h.addVariable(lb=0, ub=40, name="mesas")`.

```python
h.maximize(40 * mesas + 30 * cadeiras)
```

`maximize` define o objetivo e [resolve o modelo](objetivo.md). O log do solver é impresso neste ponto.

```python
print("Status:", h.modelStatusToString(h.getModelStatus()))
print("Mesas:   ", h.val(mesas))
print("Cadeiras:", h.val(cadeiras))
print("Lucro:   ", h.getInfo().objective_function_value)
```

## O resultado

```text
Status: Optimal
Mesas:    20.0
Cadeiras: 60.0
Lucro:    2600.0
```

A solução usa todas as horas de marcenaria (2·20 + 60 = 100) e de acabamento (20 + 60 = 80). A demanda de mesas fica com folga: 20 de 40.

## Para experimentar

- Aumente o lucro da mesa para R$ 70 e veja a solução mudar de vértice.
- Acrescente 10 horas de acabamento. O lucro sobe R$ 200, ou R$ 20 por hora: é o preço-sombra da restrição. A página [Lendo os resultados](resultados.md) mostra como obter esse número direto do solver.
- Troque `addVariable` por `addIntegral` e compare o log: o modelo passa a ser `MIP`.
