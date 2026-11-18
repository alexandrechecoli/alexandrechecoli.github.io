# Dicionários, tuplas e conjuntos

Nos modelos de otimização, os dados quase nunca são numerados de 1 a *n*: são fábricas, produtos, rotas. O **dicionário** do Python guarda um valor para cada nome, e é a estrutura mais usada para os dados e para as variáveis de um modelo com o `highspy`.

## Criar e consultar um dicionário

Um dicionário é escrito entre chaves, com pares `chave: valor` separados por vírgula:

```python
oferta = {"Curitiba": 350, "Joinville": 250, "Londrina": 300}

print(oferta["Curitiba"])     # 350
oferta["Joinville"] = 280     # altera um valor
oferta["Maringá"] = 120       # chave nova: o par é acrescentado
print(len(oferta))            # 4 pares
print("Londrina" in oferta)   # True: a chave existe
```

> **Se você vem do VBA:** é o `Scripting.Dictionary`, sem precisar de `CreateObject`. O que no VBA se escreve `d.Exists("A")`, `d.Count`, `d.Keys` e `d.Items`, no Python é `"A" in d`, `len(d)`, `d.keys()` e `d.values()`.
>
> ```vb
> Dim oferta As Object
> Set oferta = CreateObject("Scripting.Dictionary")
> oferta("Curitiba") = 350
> oferta("Joinville") = 250
> ```

### Chave que não existe

Ler uma chave que não está no dicionário dá `KeyError` (veja [Erros comuns](erros.md#keyerror)). Quando faz sentido um valor padrão, use `get`:

```python
print(oferta.get("Cascavel", 0))   # 0, sem erro
```

As chaves diferenciam maiúsculas, minúsculas e acentos: `"Maringá"` e `"Maringa"` são chaves diferentes.

## Percorrer um dicionário

O `for` sobre um dicionário passa pelas **chaves**, na ordem em que foram incluídas:

```python
for cidade in oferta:
    print(cidade, oferta[cidade])
```

Para receber a chave e o valor juntos, use `items()`:

```python
for cidade, quantidade in oferta.items():
    print(f"{cidade}: {quantidade} unidades")

print("Oferta total:", sum(oferta.values()))
```

| Método | Devolve |
|---|---|
| `d.keys()` | As chaves (é o que o `for` percorre quando nada é dito) |
| `d.values()` | Os valores |
| `d.items()` | Os pares `(chave, valor)` |

## Tuplas: índices com mais de uma posição

Uma **tupla** é uma sequência entre parênteses que não pode ser alterada depois de criada: `("Curitiba", "SP")`. Por isso ela pode ser chave de dicionário, e é assim que se guarda um dado com dois índices, como o custo *c*<sub>ij</sub> de cada rota:

```python
custo = {
    ("Curitiba", "SP"): 8,  ("Curitiba", "RJ"): 14,
    ("Londrina", "SP"): 7,  ("Londrina", "RJ"): 13,
}

print(custo["Curitiba", "RJ"])     # 14
print(custo[("Curitiba", "RJ")])   # o mesmo: os parênteses são opcionais dentro dos colchetes
```

Ao percorrer, a tupla pode ser desmontada direto no `for`:

```python
for (i, j), c in custo.items():
    print(f"{i} -> {j}: custo {c}")
```

Uma **lista** não pode ser chave, porque pode ser alterada: `custo[["Curitiba", "SP"]]` dá `TypeError: unhashable type: 'list'`.

### Dicionário de dicionários

Outra forma de guardar dados com dois índices é um dicionário dentro do outro. É mais fácil de digitar, porque fica com cara de tabela:

```python
custo = {
    "Curitiba": {"SP": 8, "RJ": 14},
    "Londrina": {"SP": 7, "RJ": 13},
}

print(custo["Curitiba"]["RJ"])     # 14: dois pares de colchetes
```

As duas formas funcionam. A chave tupla (`custo[i, j]`) combina com o jeito de indexar as variáveis (`x[i, j]`); o dicionário de dicionários (`custo[i][j]`) é o usado no [exemplo de transporte](ex-transporte.md). Uma [compreensão](py-compreensoes.md) converte um no outro em uma linha.

## Lista ou dicionário?

A lista (entre colchetes) é indexada por posição, e a primeira posição é **0**:

```python
produtos = ["mesa", "cadeira", "armário"]
print(produtos[0])    # mesa
print(produtos[-1])   # armário: índices negativos contam do fim
```

> **Se você vem do VBA:** no VBA um vetor costuma começar em 1 (`Dim v(1 To 3)`). No Python, a lista sempre começa em 0, e `range(3)` gera 0, 1 e 2. Essa diferença é a fonte mais comum de `IndexError` e de restrições que pulam o primeiro ou o último índice.

Use **lista** para os conjuntos do modelo (a lista de fábricas, de produtos) e para sequências em que só a ordem importa. Use **dicionário** para os dados e as variáveis indexadas por esses conjuntos (`oferta[i]`, `x[i, j]`). Assim o código não depende de lembrar que "a fábrica 2 é Londrina".

## Conjuntos (`set`)

Um conjunto guarda elementos sem repetição. É útil para eliminar duplicados e para testar se um elemento pertence a ele:

```python
rotas_proibidas = {("Curitiba", "RJ"), ("Londrina", "POA")}

print(("Curitiba", "RJ") in rotas_proibidas)        # True
print(set(["SP", "RJ", "SP", "BH"]))                # sem o SP repetido
```

A ordem em que um conjunto é percorrido não é garantida. Para os conjuntos de índices do modelo, prefira listas: a saída sai sempre na mesma ordem.

Cuidado com `{}`: chaves vazias criam um **dicionário** vazio. Um conjunto vazio é `set()`.

## Variáveis do highspy em um dicionário

As variáveis de decisão também ficam em um dicionário, com as mesmas chaves dos dados. O programa abaixo junta tudo: dados em dicionários, uma variável por produto e a leitura dos resultados com `items()`.

```python abrir
import highspy

produtos = ["mesa", "cadeira", "armário"]

lucro = {"mesa": 120, "cadeira": 30, "armário": 230}        # R$ por unidade
horas = {"mesa": 3, "cadeira": 1, "armário": 5}             # horas de marcenaria por unidade
demanda_max = {"mesa": 30, "cadeira": 80, "armário": 10}    # unidades vendáveis

h = highspy.Highs()
h.setOptionValue("output_flag", False)   # sem o log do solver

# Uma variável por produto, guardada com o nome do produto como chave
x = {}
for p in produtos:
    x[p] = h.addVariable(lb=0, ub=demanda_max[p], name=f"x_{p}")

h.addConstr(sum(horas[p] * x[p] for p in produtos) <= 160, name="marcenaria")

h.maximize(sum(lucro[p] * x[p] for p in produtos))

print("Lucro ótimo:", h.getInfo().objective_function_value)
for p, var in x.items():
    print(f"{p:<8} {h.val(var):6.1f}")
```

O mesmo dicionário `x` poderia ser criado em uma linha, com uma [compreensão](py-compreensoes.md): `x = {p: h.addVariable(lb=0, ub=demanda_max[p]) for p in produtos}`.

## Resumo: do VBA ao Python

| VBA | Python |
|---|---|
| `Set d = CreateObject("Scripting.Dictionary")` | `d = {}` |
| `d("A") = 350` ou `d.Add "A", 350` | `d["A"] = 350` |
| `d.Exists("A")` | `"A" in d` |
| `d.Count` | `len(d)` |
| `For Each k In d.Keys` | `for k in d:` |
| `d.Items` | `d.values()` |
| `Dim v(1 To 3)` | `v = [0, 0, 0]` (posições 0, 1 e 2) |
| `UBound(v)` | `len(v) - 1` |
