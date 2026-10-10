# Problema de transporte (PL)

[Abrir este exemplo no editor](#exemplo-transporte)

## O problema

Três fábricas abastecem quatro centros de distribuição. Cada fábrica tem uma oferta máxima, cada centro tem uma demanda a atender, e cada rota tem um custo por unidade transportada. Quanto enviar por cada rota para gastar o mínimo?

## O modelo

- **Conjuntos:** fábricas `i` e centros `j`.
- **Variáveis:** `x[i, j]`, a quantidade enviada da fábrica `i` ao centro `j`, não negativa.
- **Objetivo:** minimizar a soma de `custo[i][j] * x[i, j]` em todas as rotas.
- **Restrições:**
  - oferta: para cada fábrica `i`, a soma de `x[i, j]` nos centros não passa de `oferta[i]`;
  - demanda: para cada centro `j`, a soma de `x[i, j]` nas fábricas é pelo menos `demanda[j]`.

## O código, parte por parte

```python
fabricas = ["Curitiba", "Joinville", "Londrina"]
centros = ["SP", "RJ", "BH", "POA"]

oferta = {"Curitiba": 350, "Joinville": 250, "Londrina": 300}
demanda = {"SP": 300, "RJ": 200, "BH": 150, "POA": 250}

custo = {
    "Curitiba":  {"SP": 8,  "RJ": 14, "BH": 16, "POA": 10},
    "Joinville": {"SP": 10, "RJ": 16, "BH": 18, "POA": 7},
    "Londrina":  {"SP": 7,  "RJ": 13, "BH": 12, "POA": 15},
}
```

Os dados ficam em listas e dicionários, separados do modelo. As listas `fabricas` e `centros` são os conjuntos de índices; `custo["Curitiba"]["SP"]` é o custo da rota.

```python
x = {(i, j): h.addVariable(lb=0, name=f"x_{i}_{j}")
     for i in fabricas for j in centros}
```

Um dicionário com uma [variável](variaveis.md) para cada par (fábrica, centro): 3 × 4 = 12 variáveis. Depois disso, `x["Curitiba", "SP"]` é a variável da rota Curitiba → SP.

```python
for i in fabricas:
    h.addConstr(sum(x[i, j] for j in centros) <= oferta[i], name=f"oferta_{i}")

for j in centros:
    h.addConstr(sum(x[i, j] for i in fabricas) >= demanda[j], name=f"demanda_{j}")
```

Cada laço cria uma família de [restrições](restricoes.md): uma por fábrica e uma por centro, 7 no total. O `sum` com o `for` dentro é o somatório do modelo.

```python
h.minimize(sum(custo[i][j] * x[i, j] for i in fabricas for j in centros))
```

O objetivo percorre todas as rotas. `minimize` já [resolve o modelo](objetivo.md).

```python
for (i, j), var in x.items():
    quantidade = h.val(var)
    if quantidade > 1e-6:
        print(f"{i:>10} -> {j:<4} {quantidade:6.0f}")
```

Só as rotas usadas são impressas. A comparação com `1e-6`, e não com `0`, evita listar rotas com valores como `1e-12`, que são zero com erro de arredondamento.

## O resultado

```text
Status: Optimal
Custo total: 8600.0

  Curitiba -> SP      150
  Curitiba -> RJ      200
 Joinville -> POA     250
  Londrina -> SP      150
  Londrina -> BH      150
```

A oferta total (900) é igual à demanda total (900), então todas as fábricas enviam tudo o que têm.

## Para experimentar

- Aumente a demanda de SP para 400. A demanda total passa da oferta e o status vira `Infeasible`.
- Reduza a demanda de POA para 150 e veja qual fábrica fica com sobra.
- Proíba a rota Curitiba → RJ com `h.addConstr(x["Curitiba", "RJ"] == 0)` e compare o custo.
- O exemplo [Transporte com arquivos de dados (CSV)](ex-transporte-csv.md) é este mesmo modelo, com os dados em abas de dados.
