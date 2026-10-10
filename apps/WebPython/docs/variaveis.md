# Variáveis de decisão

Nos exemplos desta página, `h` é o modelo criado com `h = highspy.Highs()`.

## Uma variável por vez

### `h.addVariable(lb=0, ub=inf, obj=0, type=kContinuous, name=None)`

Cria uma variável contínua e a devolve, para ser usada nas restrições e no objetivo.

| Argumento | Significado |
|---|---|
| `lb` | Limite inferior. O padrão é `0`, ou seja, a variável já nasce não negativa. |
| `ub` | Limite superior. O padrão é infinito. |
| `obj` | Coeficiente da variável na função objetivo. Normalmente fica em `0`, e o objetivo é escrito depois, em `maximize` ou `minimize`. |
| `type` | Tipo da variável: `highspy.HighsVarType.kContinuous` (padrão) ou `highspy.HighsVarType.kInteger`. |
| `name` | Nome da variável, que aparece em mensagens e ajuda a conferir o modelo. |

```python
x = h.addVariable(lb=0, name="x")            # x >= 0
y = h.addVariable(lb=10, ub=50, name="y")    # 10 <= y <= 50
```

Para uma variável **livre** (que pode ser negativa), o limite inferior precisa ser dito:

```python
z = h.addVariable(lb=-highspy.kHighsInf, name="z")
```

### `h.addIntegral(lb=0, ub=inf, obj=0, name=None)`

Cria uma variável inteira. É o mesmo que `addVariable` com `type=highspy.HighsVarType.kInteger`.

```python
caminhoes = h.addIntegral(lb=0, ub=12, name="caminhoes")
```

### `h.addBinary(obj=0, name=None)`

Cria uma variável binária (0 ou 1), usada para decisões de sim ou não.

```python
abre_fabrica = h.addBinary(name="abre_fabrica")
```

> Um modelo com pelo menos uma variável inteira ou binária deixa de ser PL e passa a ser PLI. O HiGHS percebe isso sozinho e usa *branch-and-bound*.

## Várias variáveis de uma vez

O jeito mais comum é montar um dicionário ou uma lista com o próprio Python:

```python
fabricas = ["Curitiba", "Joinville"]
centros = ["SP", "RJ", "BH"]

# Dicionário indexado por pares (i, j)
x = {(i, j): h.addVariable(lb=0, name=f"x_{i}_{j}")
     for i in fabricas for j in centros}

# Lista de binárias
itens = ["barraca", "lanterna", "livro"]
leva = [h.addBinary(name=item) for item in itens]
```

Depois, `x["Curitiba", "SP"]` e `leva[0]` são as variáveis.

### `h.addVariables(*índices, lb=0, ub=inf, type=kContinuous, name_prefix=None)`

Faz o mesmo em uma chamada. Com listas de índices, devolve um dicionário; com um número, devolve um vetor.

```python
x = h.addVariables(fabricas, centros, lb=0, name_prefix="x")   # x["Curitiba", "SP"]
y = h.addVariables(5, ub=10)                                   # y[0] ... y[4]
```

### `h.addBinaries(*índices)` e `h.addIntegrals(*índices)`

São as versões de `addVariables` para variáveis binárias e inteiras.

```python
leva = h.addBinaries(itens)     # leva["barraca"], leva["lanterna"], ...
```

## Veja também

- [Restrições](restricoes.md)
- [Exemplo: problema de transporte](ex-transporte.md), com variáveis indexadas por pares
- [Exemplo: mochila 0-1](ex-mochila.md), com variáveis binárias
