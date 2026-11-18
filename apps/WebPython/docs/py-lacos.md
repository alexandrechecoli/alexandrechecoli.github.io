# Laços e condições

Num modelo de otimização, os laços criam as famílias de restrições ("para todo *i*") e percorrem a solução para imprimi-la. Esta página mostra o `if`, o `for` e o `while` do Python, comparados com os do VBA.

## O recuo é a sintaxe

No Python não existe `End If`, `Next` nem `Loop`. O que fica **dentro** de um `if` ou de um `for` é o que está recuado em relação a ele, e o bloco acaba na primeira linha que volta ao recuo de antes. A linha que abre o bloco termina com `:`.

```python
for i in range(3):
    print("dentro do laço", i)      # recuada: repete 3 vezes
    print("ainda dentro")
print("fora do laço")               # sem recuo: roda uma vez, no fim
```

O recuo padrão é de **4 espaços** (o editor já insere 4 ao apertar Tab). Recuos inconsistentes dão `IndentationError`; esquecer o `:` dá `SyntaxError: expected ':'`.

> **Se você vem do VBA:** no VBA o recuo é só estética e o bloco acaba em `End If` ou `Next`. No Python, mudar o recuo muda o programa: uma linha recuada a mais ou a menos entra ou sai do laço, sem dar erro.

## `if`, `elif`, `else`

```python
estoque = 35

if estoque == 0:
    print("sem estoque")
elif estoque < 50:
    print("estoque baixo")
else:
    print("estoque normal")
```

`elif` é o `ElseIf` do VBA. Não há `Then` nem `End If`. Para várias alternativas, como um `Select Case`, use uma sequência de `elif`.

## `for`: percorrer uma coleção

O `for` do Python percorre os elementos de uma coleção, como o `For Each` do VBA:

```python
produtos = ["mesa", "cadeira", "armário"]

for p in produtos:
    print(p)
```

Para percorrer números, use `range`:

| Python | Gera | VBA equivalente |
|---|---|---|
| `range(5)` | 0, 1, 2, 3, 4 | `For i = 0 To 4` |
| `range(1, 6)` | 1, 2, 3, 4, 5 | `For i = 1 To 5` |
| `range(0, 10, 2)` | 0, 2, 4, 6, 8 | `For i = 0 To 8 Step 2` |
| `range(5, 0, -1)` | 5, 4, 3, 2, 1 | `For i = 5 To 1 Step -1` |

> **Se você vem do VBA:** o número final do `range` **não entra**. `For i = 1 To 5` é `range(1, 6)`. E `range(5)` começa em **0**.

Nos modelos, prefira percorrer os próprios elementos (`for p in produtos`) a percorrer posições (`for k in range(len(produtos))`). O código fica mais curto e não há como errar o índice.

### `enumerate`: posição e elemento juntos

Quando a posição também é necessária, `enumerate` entrega as duas coisas:

```python
for k, p in enumerate(produtos):
    print(k, p)            # 0 mesa, 1 cadeira, 2 armário

for k, p in enumerate(produtos, start=1):
    print(f"{k}. {p}")     # numerado a partir de 1
```

### `zip`: duas listas ao mesmo tempo

```python
precos = [450, 120, 980]

for p, preco in zip(produtos, precos):
    print(f"{p}: R$ {preco}")
```

### Laços dentro de laços

Um laço dentro do outro percorre todas as combinações, como o "para todo *i*, para todo *j*" do modelo:

```python
fabricas = ["Curitiba", "Londrina"]
centros = ["SP", "RJ", "BH"]

for i in fabricas:
    for j in centros:
        print(i, "->", j)        # 2 × 3 = 6 rotas
```

Para percorrer um dicionário (as chaves, os valores ou os pares), veja [Dicionários, tuplas e conjuntos](py-dicionarios.md#percorrer-um-dicionario).

### A variável do laço continua existindo

Depois do laço, a variável fica com o último valor:

```python
for i in fabricas:
    pass               # pass: um bloco que não faz nada
print(i)               # Londrina
```

Isso esconde um erro comum na tradução de modelos: usar `i` fora do laço achando que ele vale "todos os *i*". Veja [Do modelo matemático ao código](py-papel-codigo.md#erros-frequentes-na-traducao).

## `while`, `break` e `continue`

O `while` repete enquanto a condição for verdadeira. Nos modelos ele é raro; aparece em heurísticas e em algoritmos que se repetem até parar de melhorar.

```python
saldo = 1000.0
meses = 0
while saldo < 2000:
    saldo *= 1.05        # rende 5% ao mês
    meses += 1
print(meses, "meses")    # 15 meses
```

| Python | VBA | Efeito |
|---|---|---|
| `while condição:` | `Do While condição ... Loop` | Repete enquanto a condição valer |
| `break` | `Exit For`, `Exit Do` | Sai do laço |
| `continue` | (não há) | Pula para a próxima volta do laço |

```python
for p, preco in zip(produtos, precos):
    if preco > 500:
        continue          # ignora os produtos caros
    print(p)
```

## Com o highspy: um `if` dentro do `for`

O programa abaixo é um **planejamento de produção** em quatro meses: em cada mês a fábrica produz até 160 unidades, e o que sobra fica em estoque para o mês seguinte, a um custo de R$ 3 por unidade por mês. O balanço de cada mês é

estoque do mês anterior + produção do mês − demanda do mês = estoque no fim do mês

e o "mês anterior" do primeiro mês é o estoque inicial, um número, não uma variável. O `if` dentro do `for` trata esse caso.

```python abrir
import highspy

meses = ["jan", "fev", "mar", "abr"]
demanda = {"jan": 100, "fev": 150, "mar": 200, "abr": 120}
custo_producao = {"jan": 10, "fev": 12, "mar": 11, "abr": 15}   # R$ por unidade
capacidade = 160          # unidades por mês
custo_estoque = 3         # R$ por unidade guardada de um mês para o outro
estoque_inicial = 0

h = highspy.Highs()
h.setOptionValue("output_flag", False)

producao = {}
estoque = {}
for t in meses:
    producao[t] = h.addVariable(lb=0, ub=capacidade, name=f"prod_{t}")
    estoque[t] = h.addVariable(lb=0, name=f"estoque_{t}")

# Balanço de cada mês
for k, t in enumerate(meses):
    if k == 0:
        anterior = estoque_inicial            # primeiro mês: um número
    else:
        anterior = estoque[meses[k - 1]]      # demais meses: a variável do mês anterior
    h.addConstr(anterior + producao[t] - demanda[t] == estoque[t], name=f"balanco_{t}")

h.minimize(sum(custo_producao[t] * producao[t] + custo_estoque * estoque[t] for t in meses))

print("Custo total:", h.getInfo().objective_function_value)
print(f"{'Mês':<5}{'Demanda':>9}{'Produção':>10}{'Estoque':>9}")
for t in meses:
    print(f"{t:<5}{demanda[t]:>9}{h.val(producao[t]):>10.0f}{h.val(estoque[t]):>9.0f}")
```

Em março a demanda (200) passa da capacidade (160), então o modelo produz a mais em janeiro e fevereiro e guarda. Mude a capacidade ou o custo de estoque e veja a produção se deslocar entre os meses.

## Resumo: do VBA ao Python

| VBA | Python |
|---|---|
| `If c Then ... ElseIf ... Else ... End If` | `if c:` ... `elif ...:` ... `else:` |
| `For i = 1 To n ... Next i` | `for i in range(1, n + 1):` |
| `For i = 1 To n Step 2` | `for i in range(1, n + 1, 2):` |
| `For Each p In produtos ... Next` | `for p in produtos:` |
| `Do While c ... Loop` | `while c:` |
| `Exit For` / `Exit Do` | `break` |
| `Select Case` | sequência de `if` / `elif` |
| bloco termina em `End If` / `Next` | bloco termina quando o recuo volta |
