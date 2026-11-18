# Compreensões de listas e dicionários

Uma **compreensão** (*comprehension*) cria uma lista ou um dicionário em uma linha, descrevendo os elementos em vez de acrescentá-los um a um em um laço. Ela lembra a notação de conjuntos da matemática, { 2*p* : *p* ∈ *P* }, e é o recurso do Python que mais aparece nos modelos com o `highspy`: para criar variáveis, somatórios e famílias de restrições.

Não há nada parecido no VBA. Em cada caso abaixo, o laço comum vem antes, para mostrar que a compreensão faz exatamente a mesma coisa.

## Compreensão de lista

Com um laço comum, uma lista nova é criada vazia e preenchida com `append`:

```python
precos = [10, 25, 8]

com_imposto = []
for p in precos:
    com_imposto.append(p * 1.1)
```

A compreensão faz o mesmo em uma linha:

```python
com_imposto = [p * 1.1 for p in precos]
```

Leia como "**p \* 1.1 para cada p em precos**". A expressão do elemento vem primeiro; o `for` vem depois.

> **Se você vem do VBA:** o equivalente seria um `ReDim` e um `For` preenchendo o vetor:
>
> ```vb
> ReDim comImposto(1 To 3)
> For i = 1 To 3
>     comImposto(i) = precos(i) * 1.1
> Next i
> ```

### Com filtro: `if` no fim

Um `if` depois do `for` deixa de fora os elementos que não passam no teste:

```python
caros = [p for p in precos if p > 9]       # [10, 25]
```

Não confunda com o `if ... else` **antes** do `for`, que não filtra: escolhe o valor de cada elemento.

```python
faixa = ["alto" if p > 9 else "baixo" for p in precos]   # ['alto', 'alto', 'baixo']
```

### Com dois `for`

Os `for` são lidos da esquerda para a direita, na mesma ordem em que seriam escritos um dentro do outro:

```python
fabricas = ["Curitiba", "Londrina"]
centros = ["SP", "RJ", "BH"]

rotas = [(i, j) for i in fabricas for j in centros]
```

É o mesmo que:

```python
rotas = []
for i in fabricas:
    for j in centros:
        rotas.append((i, j))
```

O resultado são as 6 rotas, com `Curitiba` primeiro combinada com todos os centros, depois `Londrina`.

## Compreensão de dicionário

Com chaves e com `chave: valor` no lugar do elemento, a compreensão cria um [dicionário](py-dicionarios.md):

```python
estoque_inicial = {i: 0 for i in fabricas}            # {'Curitiba': 0, 'Londrina': 0}

nomes = ["mesa", "cadeira"]
lucros = [120, 40]
lucro = {n: l for n, l in zip(nomes, lucros)}         # {'mesa': 120, 'cadeira': 40}
```

O `zip` percorre duas listas ao mesmo tempo, par a par. `dict(zip(nomes, lucros))` dá o mesmo resultado.

Uma compreensão também converte um dicionário de dicionários (`custo[i][j]`) em um dicionário com chave tupla (`custo[i, j]`):

```python
custo_tabela = {
    "Curitiba": {"SP": 8, "RJ": 14, "BH": 16},
    "Londrina": {"SP": 7, "RJ": 13, "BH": 12},
}

custo = {(i, j): custo_tabela[i][j] for i in fabricas for j in centros}
print(custo["Londrina", "BH"])    # 12
```

## Somatórios: `sum` com um `for` dentro

Sem os colchetes, a compreensão vira uma **expressão geradora**: ela não monta a lista, só entrega os elementos um a um para quem os pede. Dentro de `sum`, é o somatório da matemática:

```python
quantidade = {"SP": 300, "RJ": 200, "BH": 150}

total = sum(quantidade[j] for j in centros)                       # Σ_j q_j
total_rotas = sum(custo[i, j] for i in fabricas for j in centros)  # Σ_i Σ_j c_ij
```

Quando a expressão geradora é o único argumento da função, não precisa de outro par de parênteses: `sum(... for ...)`. `sum([... for ...])`, com colchetes, também funciona, mas monta a lista inteira antes de somar.

`max`, `min`, `any` e `all` recebem expressões geradoras do mesmo jeito:

```python
mais_cara = max(custo[i, j] for i in fabricas for j in centros)   # 16
```

## Com o highspy

As três aplicações que aparecem em quase todo modelo:

```python
# 1. Uma variável para cada rota
x = {(i, j): h.addVariable(lb=0, name=f"x_{i}_{j}") for i in fabricas for j in centros}

# 2. Somatório no objetivo e nas restrições
h.minimize(sum(custo[i, j] * x[i, j] for i in fabricas for j in centros))

# 3. Uma restrição por centro (veja addConstrs em Restrições)
h.addConstrs(sum(x[i, j] for i in fabricas) >= quantidade[j] for j in centros)
```

E, depois de resolver, para filtrar a solução:

```python
usadas = [(i, j) for (i, j), var in x.items() if h.val(var) > 1e-6]
```

O programa abaixo é um problema de **designação**: três funcionários, três tarefas, cada funcionário faz exatamente uma tarefa e cada tarefa é feita por exatamente um funcionário. As variáveis são binárias, criadas por uma compreensão de dicionário, e o resultado é filtrado por uma compreensão de lista.

```python abrir
import highspy

funcionarios = ["Ana", "Bruno", "Carla"]
tarefas = ["relatório", "planilha", "apresentação"]

# Tempo (em horas) que cada funcionário leva em cada tarefa
tempo_tabela = {
    "Ana":   {"relatório": 9, "planilha": 2, "apresentação": 7},
    "Bruno": {"relatório": 6, "planilha": 4, "apresentação": 3},
    "Carla": {"relatório": 5, "planilha": 8, "apresentação": 1},
}

# Compreensão de dicionário: de tempo_tabela[f][t] para tempo[f, t]
tempo = {(f, t): tempo_tabela[f][t] for f in funcionarios for t in tarefas}

h = highspy.Highs()
h.setOptionValue("output_flag", False)

# Uma binária por par (funcionário, tarefa)
x = {(f, t): h.addBinary(name=f"x_{f}_{t}") for f in funcionarios for t in tarefas}

# Cada funcionário faz uma tarefa; cada tarefa é feita por um funcionário
h.addConstrs(sum(x[f, t] for t in tarefas) == 1 for f in funcionarios)
h.addConstrs(sum(x[f, t] for f in funcionarios) == 1 for t in tarefas)

h.minimize(sum(tempo[f, t] * x[f, t] for f in funcionarios for t in tarefas))

# Compreensão de lista com filtro: só os pares escolhidos
escolhidos = [(f, t) for (f, t), var in x.items() if h.val(var) > 0.5]

print("Tempo total:", h.getInfo().objective_function_value, "horas")
for f, t in escolhidos:
    print(f"{f:<6} -> {t} ({tempo[f, t]} h)")
```

O teste `> 0.5`, e não `== 1`, é o jeito seguro de ler uma binária: o solver pode devolver `0.9999999` em vez de `1`.

## Colchetes, chaves e parênteses

| Escrita | Cria |
|---|---|
| `[x * 2 for x in v]` | lista |
| `{k: 0 for k in v}` | dicionário |
| `{x * 2 for x in v}` | conjunto (sem `:`) |
| `(x * 2 for x in v)` ou `sum(x * 2 for x in v)` | expressão geradora: entrega os valores um a um, sem guardar |

## Quando usar um laço comum

A compreensão serve para **criar** uma coleção a partir de outra. Quando o corpo do laço faz várias coisas, imprime ou tem vários `if`, o laço comum é mais legível. Para imprimir a solução, por exemplo, use `for` e não uma compreensão.

Nas restrições, as duas formas são equivalentes, e o laço tem a vantagem de deixar dar um nome a cada restrição:

```python
for j in centros:
    h.addConstr(sum(x[i, j] for i in fabricas) >= quantidade[j], name=f"demanda_{j}")
```

Para traduzir um modelo inteiro, com cada Σ e cada ∀, veja [Do modelo matemático ao código](py-papel-codigo.md).
