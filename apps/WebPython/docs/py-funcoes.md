# Funções, argumentos e módulos

Esta página explica três coisas que aparecem em toda linha de um modelo com o `highspy`: chamar funções com **argumentos nomeados** (`lb=0, name="x"`), usar os **métodos** de um objeto (`h.addVariable`) e **importar** módulos (`import highspy`). Também mostra como escrever as suas próprias funções, o que serve, por exemplo, para resolver o mesmo modelo com vários cenários de dados.

## Escrever uma função

Uma função é definida com `def`, recebe parâmetros entre parênteses e devolve um resultado com `return`:

```python
def custo_total(quantidade, custo_unitario, custo_fixo):
    return custo_fixo + quantidade * custo_unitario

print(custo_total(100, 12.5, 800))    # 2050.0
```

O corpo da função é o bloco recuado depois do `:`, como nos [laços](py-lacos.md). Uma função sem `return` devolve `None`.

> **Se você vem do VBA:** o Python não separa `Function` e `Sub`: as duas são `def`. O resultado é devolvido com `return valor`, e não atribuindo ao nome da função (`CustoTotal = ...`). O `return` também encerra a função na hora, como um `Exit Function`.

Uma função pode devolver vários valores de uma vez, separados por vírgula. Quem chama recebe cada um em uma variável:

```python
def faixa(valores):
    return min(valores), max(valores)

menor, maior = faixa([8, 14, 16, 10])
print(menor, maior)    # 8 16
```

### Variáveis de dentro e de fora

As variáveis criadas dentro de uma função só existem lá dentro e somem quando ela termina. A função consegue **ler** as variáveis do programa, mas o jeito mais claro é passar tudo o que ela usa como parâmetro: assim dá para chamá-la com outros dados.

## Valores padrão e argumentos nomeados

Um parâmetro pode ter um **valor padrão**, usado quando ele não é informado na chamada:

```python
def preco_final(preco, desconto=0, imposto=0.25):
    return preco * (1 - desconto) * (1 + imposto)

preco_final(100)                   # 125.0: desconto 0 e imposto 0.25
preco_final(100, 0.2)              # 100.0: desconto 0.2, pela posição
preco_final(100, imposto=0)        # 100: só o imposto, pelo nome
```

Na última chamada, `imposto=0` é um **argumento nomeado**: ele diz a qual parâmetro o valor vai, sem depender da posição e sem precisar informar os que vêm antes. É exatamente o que se faz com o `highspy`:

```python
x = h.addVariable(lb=0, ub=50, name="x")
y = h.addVariable(name="y", lb=10)        # a ordem dos nomeados não importa
z = h.addVariable()                       # tudo no padrão: lb=0, ub=infinito, sem nome
```

`addVariable` tem vários parâmetros com valor padrão (veja [Variáveis de decisão](variaveis.md)), e os nomes deixam claro o que cada número significa. Compare `h.addVariable(0, 50)` com `h.addVariable(lb=0, ub=50)`.

Duas regras:

- os argumentos pela posição vêm **antes** dos nomeados. `preco_final(desconto=0.2, 100)` dá `SyntaxError: positional argument follows keyword argument`;
- o nome precisa ser exatamente o do parâmetro. `h.addVariable(lower=0)` dá um `TypeError` que diz `unexpected keyword argument 'lower'`.

> **Se você vem do VBA:** é o mesmo que os argumentos nomeados com `:=` do VBA, como em `Range("A1").Sort Key1:=Range("A1"), Order1:=xlAscending`. No Python o sinal é só `=`.

## Objetos e métodos

`h = highspy.Highs()` cria um **objeto**: o modelo. As funções que pertencem a ele, chamadas de **métodos**, são escritas depois de um ponto: `h.addVariable(...)`, `h.addConstr(...)`, `h.maximize(...)`. Cada objeto guarda o seu estado, então dois modelos criados com `Highs()` são independentes.

Os valores do Python também têm métodos:

```python
nome = "  Curitiba "
print(nome.strip().upper())      # CURITIBA: tira os espaços e passa para maiúsculas

produtos = ["mesa"]
produtos.append("cadeira")       # acrescenta à lista
```

> **Se você vem do VBA:** é a mesma ideia de `Worksheets("Plan1").Range("A1").Value` ou `ActiveSheet.Cells(1, 1).ClearContents`: o objeto, um ponto e o que se quer fazer com ele.

## Módulos: `import`

Um **módulo** é um arquivo de funções prontas. `import` o carrega, e as funções dele são usadas com o nome do módulo e um ponto:

```python
import math

print(math.sqrt(2))      # 1.4142135623730951
print(math.ceil(4.2))    # 5: arredonda para cima (quantos caminhões para 4,2 cargas?)
print(math.floor(4.8))   # 4: arredonda para baixo
print(math.inf)          # infinito
```

Outras formas:

| Forma | Uso |
|---|---|
| `import math` | `math.sqrt(2)` |
| `from math import sqrt, ceil` | `sqrt(2)`, `ceil(4.2)`, sem o `math.` |
| `import pandas as pd` | `pd.read_csv(...)`: um apelido mais curto |

O `highspy` é um módulo como os outros: `import highspy` e, depois, `highspy.Highs()`. Neste editor, módulos como `pandas` e `numpy` são baixados na primeira vez que aparecem em um `import` (veja [Primeiros passos](inicio.md)).

## Com o highspy: um modelo dentro de uma função

Colocar o modelo inteiro dentro de uma função deixa resolvê-lo várias vezes, com dados diferentes, para comparar cenários. O programa abaixo resolve uma **mochila 0-1** (escolher itens sem passar do peso máximo, com o maior valor possível) para quatro capacidades diferentes. Cada chamada cria um modelo novo com `highspy.Highs()`.

```python abrir
import highspy

itens = ["barraca", "lanterna", "fogareiro", "livro", "saco de dormir"]
peso = {"barraca": 5, "lanterna": 1, "fogareiro": 3, "livro": 2, "saco de dormir": 4}
valor = {"barraca": 10, "lanterna": 3, "fogareiro": 7, "livro": 2, "saco de dormir": 9}


def resolve_mochila(capacidade, itens, peso, valor):
    """Resolve a mochila 0-1 e devolve o valor ótimo e a lista de itens escolhidos."""
    h = highspy.Highs()
    h.setOptionValue("output_flag", False)

    leva = {i: h.addBinary(name=f"leva_{i}") for i in itens}
    h.addConstr(sum(peso[i] * leva[i] for i in itens) <= capacidade, name="capacidade")
    h.maximize(sum(valor[i] * leva[i] for i in itens))

    escolhidos = [i for i in itens if h.val(leva[i]) > 0.5]
    return h.getInfo().objective_function_value, escolhidos


print(f"{'Capacidade':>10}  {'Valor':>5}  Itens")
for cap in [6, 8, 10, 12]:
    melhor, escolhidos = resolve_mochila(cap, itens, peso, valor)
    print(f"{cap:>10}  {melhor:>5.0f}  {', '.join(escolhidos)}")
```

O texto entre três aspas logo abaixo do `def` é a **docstring**: a descrição da função, para quem for ler o código. `", ".join(lista)` junta os textos de uma lista, separados por vírgula e espaço.

## Resumo: do VBA ao Python

| VBA | Python |
|---|---|
| `Function F(a, b) ... F = valor ... End Function` | `def f(a, b):` ... `return valor` |
| `Sub S(a) ... End Sub` | `def s(a):` (sem `return`) |
| `Optional b As Double = 0` | `def f(a, b=0):` |
| `Exit Function` | `return` |
| `F(1, b:=2)` | `f(1, b=2)` |
| `objeto.Metodo arg` | `objeto.metodo(arg)` (sempre com parênteses) |
| `Application.WorksheetFunction.RoundUp(x, 0)` | `math.ceil(x)` |
| `Sqr(x)` | `math.sqrt(x)` |
