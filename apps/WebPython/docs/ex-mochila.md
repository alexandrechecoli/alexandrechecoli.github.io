# Mochila 0-1 (PLI)

[Abrir este exemplo no editor](#exemplo-mochila)

## O problema

Há sete itens para levar em uma viagem, cada um com um valor e um peso, e a mochila aguenta 15 kg. Quais itens levar para ter o maior valor total? Cada item vai inteiro ou não vai.

| Item | Valor | Peso |
|---|---|---|
| barraca | 60 | 9 |
| fogareiro | 35 | 4 |
| lanterna | 20 | 1 |
| câmera | 50 | 3 |
| livro | 10 | 2 |
| casaco | 40 | 5 |
| comida | 55 | 6 |

## O modelo

- **Variáveis:** `x[k]` binária para cada item: 1 se o item vai, 0 se fica.
- **Objetivo:** maximizar a soma de `valor[k] * x[k]`.
- **Restrição:** a soma de `peso[k] * x[k]` não passa da capacidade.

## O código, parte por parte

```python
x = [h.addBinary(name=item) for item in itens]
```

Uma lista com uma [variável binária](variaveis.md) por item, na mesma ordem das listas `itens`, `valor` e `peso`. É a presença de variáveis binárias que faz deste um modelo de PLI.

```python
h.addConstr(sum(p * xi for p, xi in zip(peso, x)) <= capacidade, name="capacidade")
h.maximize(sum(v * xi for v, xi in zip(valor, x)))
```

O `zip` percorre duas listas ao mesmo tempo: a cada volta, `p` é o peso e `xi` é a variável do mesmo item.

```python
for item, p, v, xi in zip(itens, peso, valor, x):
    if h.val(xi) > 0.5:
        print(f"  {item:<10} peso {p:>2}  valor {v:>2}")
```

O teste é `> 0.5`, e não `== 1`: o solver pode devolver `0.9999999` para uma binária igual a 1.

## O resultado

```text
Status: Optimal
Valor total: 165.0
Itens escolhidos:
  lanterna   peso  1  valor 20
  câmera     peso  3  valor 50
  casaco     peso  5  valor 40
  comida     peso  6  valor 55
```

Os itens escolhidos pesam exatamente 15 kg. A barraca, o item de maior valor, fica de fora: sozinha ela ocuparia 9 dos 15 kg.

## O que observar no log

O log começa com `MIP has 1 row; 7 cols; 7 nonzeros; 7 integer variables (7 binary)` e traz a tabela do *branch-and-bound*. Nela, o melhor limite (`BestBound`) parte de 270 e a melhor solução (`BestSol`) vai subindo até as duas colunas se encontrarem em 165. A página [Entender o log do HiGHS](log.md) explica cada coluna.

## Para experimentar

- Troque `h.addBinary(name=item)` por `h.addVariable(lb=0, ub=1, name=item)`. O modelo vira a relaxação linear: o valor sobe e algum item aparece "pela metade".
- Mude a capacidade para 20 e veja se a barraca entra.
- Exija que a lanterna só vá se a barraca for: `h.addConstr(x[2] <= x[0])`.
