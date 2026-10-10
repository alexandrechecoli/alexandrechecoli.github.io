# Restrições

Nos exemplos desta página, `h` é o modelo e `x`, `y` são [variáveis](variaveis.md) já criadas.

## Uma restrição

### `h.addConstr(expressão, name=None)`

Adiciona uma restrição linear ao modelo. A expressão é escrita como na matemática, com `<=`, `>=` ou `==`:

```python
h.addConstr(2 * x + y <= 100, name="marcenaria")
h.addConstr(x + y >= 20, name="demanda_minima")
h.addConstr(x - 3 * y == 0, name="proporcao")
```

Também é possível limitar a expressão dos dois lados:

```python
h.addConstr(10 <= x + y <= 40, name="faixa")
```

O `name` é opcional, mas vale a pena: é com ele que você reconhece a restrição depois.

`addConstr` devolve a restrição criada. Guarde-a em uma variável do Python se for consultar a folga ou o preço-sombra dela depois (veja [Lendo os resultados](resultados.md)):

```python
r_marcenaria = h.addConstr(2 * x + y <= 100, name="marcenaria")
```

## Somatórios

Para somar muitas variáveis, use o `sum` do Python com um laço dentro:

```python
# Tudo o que sai da fábrica i não passa da oferta dela
for i in fabricas:
    h.addConstr(sum(x[i, j] for j in centros) <= oferta[i], name=f"oferta_{i}")
```

Com coeficientes, multiplique dentro do `sum`:

```python
h.addConstr(sum(peso[k] * leva[k] for k in itens) <= capacidade, name="capacidade")
```

### `h.qsum(itens)`

Faz o mesmo que `sum`, mais rápido em somas com milhares de termos. Nos modelos de aula, a diferença não aparece.

```python
h.addConstr(h.qsum(x[i, j] for j in centros) <= oferta[i])
```

## Várias restrições de uma vez

### `h.addConstrs(expressões)`

Recebe um gerador de restrições e adiciona todas. Equivale ao laço com `addConstr`.

```python
h.addConstrs(sum(x[i, j] for i in fabricas) >= demanda[j] for j in centros)
```

## O que não é permitido

- **Desigualdade estrita** (`<` ou `>`): não existe em programação linear. Use `<=` ou `>=`.
- **Produto de variáveis** (`x * y`) ou potências: o modelo deixa de ser linear, e o `highspy` responde `Only linear expressions are allowed`.
- **Dividir uma variável** (`x / 2`): dá `TypeError`. Multiplique pelo inverso: `0.5 * x` ou `(1 / 2) * x`.
- **Variável vezes número do numpy** (`x * numpy.int64(3)`): dá o erro `Unexpected parameters`. Escreva o número primeiro (`3 * x`) ou converta com `int()` ou `float()`. Isso costuma aparecer com dados lidos pelo pandas; veja [Ler dados de arquivos](dados.md).

A página [Erros comuns](erros.md) explica essas e outras mensagens.
