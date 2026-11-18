# Do modelo matemático ao código

Um modelo escrito no papel se traduz para o `highspy` quase símbolo por símbolo. Esta página mostra a correspondência e a aplica a um modelo completo. Ela usa [dicionários e tuplas](py-dicionarios.md) e [compreensões](py-compreensoes.md); se algum trecho parecer estranho, comece por essas páginas.

## A tabela de tradução

| No papel | No Python |
|---|---|
| Conjunto *I* = {Curitiba, Londrina} | `I = ["Curitiba", "Londrina"]` |
| Conjunto *I* = {1, …, *m*} | `I = range(1, m + 1)` |
| Parâmetro *d*<sub>j</sub> | `d = {"SP": 300, "RJ": 200}`, e o valor é `d[j]` |
| Parâmetro *c*<sub>ij</sub> | `c = {("Curitiba", "SP"): 8, ...}`, e o valor é `c[i, j]` |
| *x*<sub>j</sub> ≥ 0, para *j* ∈ *J* | `x = {j: h.addVariable(lb=0) for j in J}` |
| *x*<sub>ij</sub> ≥ 0, para *i* ∈ *I*, *j* ∈ *J* | `x = {(i, j): h.addVariable(lb=0) for i in I for j in J}` |
| *y*<sub>i</sub> ∈ {0, 1} | `y = {i: h.addBinary() for i in I}` |
| ∑<sub>j ∈ J</sub> *x*<sub>ij</sub> | `sum(x[i, j] for j in J)` |
| ∑<sub>i ∈ I</sub> ∑<sub>j ∈ J</sub> *c*<sub>ij</sub> *x*<sub>ij</sub> | `sum(c[i, j] * x[i, j] for i in I for j in J)` |
| ... ≤ *K*<sub>i</sub>, ∀ *i* ∈ *I* | `for i in I:` e, dentro dele, `h.addConstr(... <= K[i])` |
| ∀ *i*, *j* ∈ *N*, *i* ≠ *j* | `for i in N:`, `for j in N:`, `if i != j:` |
| min (ou max) da expressão | `h.minimize(expressão)` (ou `h.maximize`) |

Duas regras resumem a tabela:

- **cada ∀ vira um `for`** que fica *fora* do `addConstr`, e cada volta do laço cria uma restrição;
- **cada ∑ vira um `sum(... for ...)`** que fica *dentro* da expressão.

## Os conjuntos

Prefira os nomes de verdade (`"Curitiba"`, `"mesa"`) a números: a saída fica legível e não há o risco de trocar o índice. Quando os elementos são mesmo numerados de 1 a *m*, `range(1, m + 1)` gera exatamente 1, 2, …, *m*.

> **Se você vem do VBA:** `For i = 1 To m` é `for i in range(1, m + 1):`. O `range` não inclui o último número, e `range(m)` sozinho começa em **0**: gera 0, 1, …, *m* − 1. Misturar as duas numerações (dados de 1 a *m*, laço de 0 a *m* − 1) dá `KeyError` ou, pior, um modelo que deixa um índice de fora sem dar erro.

## Os parâmetros

Um parâmetro com um índice é um dicionário com os elementos do conjunto como chaves. Com dois índices, a chave é uma tupla. Se os dados forem digitados como tabela (dicionário de dicionários), uma compreensão os converte:

```python
c = {(i, j): tabela[i][j] for i in I for j in J}
```

Se os dados estiverem em um arquivo, veja [Ler dados de arquivos](dados.md).

## As variáveis

Uma variável matemática com índices é um dicionário de variáveis do `highspy`, com as mesmas chaves dos parâmetros. O tipo da variável decide a função (veja [Variáveis de decisão](variaveis.md)):

| No papel | Função |
|---|---|
| *x* ≥ 0 | `h.addVariable(lb=0)` |
| 0 ≤ *x* ≤ *u* | `h.addVariable(lb=0, ub=u)` |
| *x* ∈ ℤ, *x* ≥ 0 | `h.addIntegral(lb=0)` |
| *y* ∈ {0, 1} | `h.addBinary()` |

## As restrições

Uma restrição com ∀ é uma **família** de restrições, e o `for` cria uma de cada vez. Uma restrição sem ∀ é uma só e não leva laço.

O cuidado principal: o índice do ∀ fica **fora** do `sum`, e os índices do ∑ ficam **dentro**. Em ∑<sub>j ∈ J</sub> *x*<sub>ij</sub> ≤ *K*<sub>i</sub>, ∀ *i* ∈ *I*, o *i* é do ∀ e o *j* é do ∑:

```python
for i in I:                                          # ∀ i ∈ I
    h.addConstr(sum(x[i, j] for j in J) <= K[i])     # ∑ em j; o i vem do for de fora
```

Os dois lados podem ter variáveis, como na matemática: `h.addConstr(sum(x[i, j] for j in J) <= K[i] * y[i])` é aceito.

## Exemplo completo: localização de depósitos

Uma empresa pode abrir depósitos em três cidades e precisa atender quatro clientes. Abrir o depósito *i* custa *f*<sub>i</sub> (custo fixo) e ele tem capacidade *K*<sub>i</sub>. O cliente *j* precisa de *d*<sub>j</sub> unidades, e levar uma unidade de *i* até *j* custa *c*<sub>ij</sub>. Quais depósitos abrir, e quanto enviar de cada um a cada cliente, para gastar o mínimo?

**Variáveis:** *y*<sub>i</sub> = 1 se o depósito *i* for aberto (binária); *x*<sub>ij</sub> = quantidade enviada de *i* a *j* (contínua, ≥ 0).

| | No papel | No Python |
|---|---|---|
| Objetivo | min ∑<sub>i</sub> *f*<sub>i</sub> *y*<sub>i</sub> + ∑<sub>i</sub> ∑<sub>j</sub> *c*<sub>ij</sub> *x*<sub>ij</sub> | `h.minimize(sum(f[i] * y[i] for i in I) + sum(c[i, j] * x[i, j] for i in I for j in J))` |
| Demanda | ∑<sub>i</sub> *x*<sub>ij</sub> = *d*<sub>j</sub>, ∀ *j* ∈ *J* | `for j in J:` → `h.addConstr(sum(x[i, j] for i in I) == d[j])` |
| Capacidade | ∑<sub>j</sub> *x*<sub>ij</sub> ≤ *K*<sub>i</sub> *y*<sub>i</sub>, ∀ *i* ∈ *I* | `for i in I:` → `h.addConstr(sum(x[i, j] for j in J) <= K[i] * y[i])` |

A restrição de capacidade faz duas coisas: limita o que sai de um depósito aberto e, com *y*<sub>i</sub> = 0, proíbe enviar qualquer coisa de um depósito fechado.

```python abrir
import highspy

# Conjuntos
I = ["Curitiba", "Ponta Grossa", "Maringá"]               # depósitos candidatos
J = ["Londrina", "Cascavel", "Guarapuava", "Paranaguá"]   # clientes

# Parâmetros
f = {"Curitiba": 5000, "Ponta Grossa": 3500, "Maringá": 3000}   # custo fixo de abrir
K = {"Curitiba": 500, "Ponta Grossa": 300, "Maringá": 400}      # capacidade
d = {"Londrina": 150, "Cascavel": 120, "Guarapuava": 100, "Paranaguá": 130}   # demanda

tabela = {   # custo por unidade transportada
    "Curitiba":     {"Londrina": 12, "Cascavel": 15, "Guarapuava": 8, "Paranaguá": 3},
    "Ponta Grossa": {"Londrina": 9,  "Cascavel": 11, "Guarapuava": 5, "Paranaguá": 6},
    "Maringá":      {"Londrina": 3,  "Cascavel": 6,  "Guarapuava": 9, "Paranaguá": 14},
}
c = {(i, j): tabela[i][j] for i in I for j in J}

h = highspy.Highs()
h.setOptionValue("output_flag", False)

# Variáveis: y_i binária, x_ij >= 0
y = {i: h.addBinary(name=f"abre_{i}") for i in I}
x = {(i, j): h.addVariable(lb=0, name=f"x_{i}_{j}") for i in I for j in J}

# Demanda: soma em i de x_ij = d_j, para todo j
for j in J:
    h.addConstr(sum(x[i, j] for i in I) == d[j], name=f"demanda_{j}")

# Capacidade: soma em j de x_ij <= K_i * y_i, para todo i
for i in I:
    h.addConstr(sum(x[i, j] for j in J) <= K[i] * y[i], name=f"capacidade_{i}")

# Objetivo: custo fixo + custo de transporte
h.minimize(sum(f[i] * y[i] for i in I) + sum(c[i, j] * x[i, j] for i in I for j in J))

print("Status:", h.modelStatusToString(h.getModelStatus()))
print("Custo total:", h.getInfo().objective_function_value)
print()
for i in I:
    if h.val(y[i]) > 0.5:
        print(f"Abrir {i}:")
        for j in J:
            if h.val(x[i, j]) > 1e-6:
                print(f"    {h.val(x[i, j]):5.0f} unidades para {j}")
```

## Erros frequentes na tradução

### O índice do ∀ dentro do `sum`

```python
# Errado: cadê o "para todo i"?
h.addConstr(sum(x[i, j] for i in I for j in J) <= K[i] * y[i])
```

Aqui o *i* foi parar dentro do `sum`, e sobrou uma restrição só, em vez de uma por depósito. Pior: o `K[i]` de fora não é o *i* do `sum`. Se um `for i in I` apareceu antes no programa, o Python ainda conhece o último valor de `i` e usa esse, **sem dar erro**. Se não apareceu, dá `NameError: name 'i' is not defined`.

### Esquecer o ∀

Uma única restrição `h.addConstr(sum(x[i, j] for i in I for j in J) == sum(d.values()))` garante que o total enviado é igual à demanda total, mas não que **cada** cliente recebe a sua parte. O modelo roda e o resultado sai errado. Conte as restrições: o modelo de localização tem 4 de demanda (uma por cliente) e 3 de capacidade (uma por depósito).

### Numeração de 1 a *m* com `range(m)`

`range(m)` gera 0, …, *m* − 1. Se os dados foram digitados com as chaves 1, …, *m*, o laço pede a chave 0, que não existe, e dá `KeyError: 0`. Use `range(1, m + 1)`, ou, melhor, percorra as próprias chaves: `for i in d:`.

### `=` no lugar de `==`

Na restrição de igualdade, o sinal é `==`. Com `=`, o Python acusa `SyntaxError` (veja [Erros comuns](erros.md)).

> **Se você vem do VBA:** no VBA o `=` serve para atribuir e para comparar. No Python, `=` só atribui; para comparar (e nas restrições de igualdade) é `==`. Da mesma forma, `<>` vira `!=`, e `And`, `Or`, `Not` viram `and`, `or`, `not`.
