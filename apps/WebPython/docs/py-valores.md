# Valores, operações e `print`

Esta página reúne o básico para quem já programou em outra linguagem, em especial no VBA: como criar variáveis, fazer contas, montar textos e mostrar resultados. As diferenças que mais causam erro estão marcadas com **Se você vem do VBA**.

## Variáveis

Uma variável é criada na primeira vez que recebe um valor. Não há `Dim` nem declaração de tipo:

```python
capacidade = 160          # número inteiro (int)
custo_hora = 12.5         # número com casas decimais (float)
produto = "mesa"          # texto (str)
viavel = True             # verdadeiro ou falso (bool)
```

O tipo vem do valor, e a mesma variável pode receber depois um valor de outro tipo. `type(capacidade)` mostra o tipo atual.

Também dá para atribuir vários valores de uma vez, e somar ou subtrair na própria variável:

```python
oferta, demanda = 350, 300
total = 0
total += 50       # o mesmo que total = total + 50
```

> **Se você vem do VBA:** o Python diferencia **maiúsculas de minúsculas**. `Custo`, `custo` e `CUSTO` são três variáveis diferentes; usar uma achando que é a outra dá `NameError`. No VBA, o editor ajusta as maiúsculas sozinho e os três nomes são o mesmo.

## Números e contas

| Operação | Python | VBA | Resultado |
|---|---|---|---|
| Soma, subtração, multiplicação | `7 + 2`, `7 - 2`, `7 * 2` | igual | `9`, `5`, `14` |
| Divisão | `7 / 2` | `7 / 2` | `3.5` (sempre `float`) |
| Divisão inteira | `7 // 2` | `7 \ 2` | `3` |
| Resto da divisão | `7 % 2` | `7 Mod 2` | `1` |
| Potência | `2 ** 3` | `2 ^ 3` | `8` |

> **Se você vem do VBA:** no Python, `^` **não é potência**: é uma operação sobre bits, e `2 ^ 3` dá `1`, sem nenhum erro. Use sempre `**`.

Números muito pequenos ou grandes podem ser escritos em notação científica: `1e-6` é 0,000001 e `2.5e3` é 2500.

O separador decimal é sempre o **ponto**: `12.5`. Uma vírgula cria outra coisa (`12,5` é a tupla `(12, 5)`).

### Arredondamento

Contas com `float` têm pequenos erros de arredondamento, como em qualquer linguagem:

```python
print(0.1 + 0.2)              # 0.30000000000000004
print(round(0.1 + 0.2, 2))    # 0.3
```

É por isso que, ao ler a solução de um modelo, compara-se com uma tolerância (`if h.val(x) > 1e-6`) e não com zero exato (veja [Lendo os resultados](resultados.md)).

### Converter entre tipos

```python
int("12")        # 12: texto para inteiro
float("3.5")     # 3.5: texto para float
str(160)         # "160": número para texto
int(3.9)         # 3: corta as casas decimais, não arredonda
```

`float("3,5")`, com vírgula, dá `ValueError`. Dados digitados no padrão brasileiro precisam trocar a vírgula pelo ponto antes: `float("3,5".replace(",", "."))`.

## Textos

Um texto (`str`) fica entre aspas duplas ou simples: `"mesa"` e `'mesa'` são iguais. Textos se juntam com `+`:

```python
cidade = "Curitiba"
print("Fábrica de " + cidade)       # Fábrica de Curitiba
```

Juntar texto com número dá `TypeError: can only concatenate str (not "int") to str`. Converta com `str()` ou, melhor, use uma f-string.

> **Se você vem do VBA:** a junção de textos é `+`, e não `&`. E o `'` não começa um comentário: ele delimita um texto. O comentário no Python começa com `#`.

### f-strings: texto com valores dentro

Um texto com `f` antes das aspas aceita expressões entre chaves, que são substituídas pelo valor:

```python
produto = "mesa"
lucro = 1234.5
print(f"O lucro com {produto} foi {lucro}")    # O lucro com mesa foi 1234.5
```

Depois de `:`, dentro das chaves, vem o **formato**. Os mais úteis para mostrar resultados:

| Formato | Exemplo | Resultado |
|---|---|---|
| `.2f` (2 casas decimais) | `f"{lucro:.2f}"` | `1234.50` |
| `.0f` (sem casas) | `f"{2.9999999:.0f}"` | `3` |
| `8.2f` (8 posições, alinhado à direita) | `f"{lucro:8.2f}"` | ` 1234.50` |
| `<10` (10 posições, à esquerda) | `f"{produto:<10}"` | `mesa      ` |
| `>10` (10 posições, à direita) | `f"{produto:>10}"` | `      mesa` |
| `.1%` (porcentagem) | `f"{0.256:.1%}"` | `25.6%` |

As f-strings também montam os **nomes** das variáveis e restrições do modelo: `name=f"x_{i}_{j}"`.

## Verdadeiro, falso e comparações

| Python | VBA | Significado |
|---|---|---|
| `True`, `False` | `True`, `False` | Verdadeiro, falso (com a primeira letra maiúscula) |
| `==` | `=` | Igual |
| `!=` | `<>` | Diferente |
| `<`, `<=`, `>`, `>=` | igual | Menor, menor ou igual... |
| `and`, `or`, `not` | `And`, `Or`, `Not` | E, ou, não |

> **Se você vem do VBA:** no Python, `=` só atribui um valor. Para comparar é `==`, e é também o `==` que se usa nas restrições de igualdade do modelo.

As comparações podem ser encadeadas, como na matemática:

```python
x = 15
print(10 <= x <= 40)     # True: o mesmo que 10 <= x and x <= 40
```

`None` é o valor "nada", que uma função devolve quando não tem `return` (veja [Funções, argumentos e módulos](py-funcoes.md)).

## `print`

`print` mostra os valores separados por um espaço e termina a linha:

```python
print("Status:", "Optimal", 42)    # Status: Optimal 42
print()                            # linha em branco
print("a", "b", sep=";")           # a;b
```

Uma linha longa pode ser quebrada **dentro de parênteses, colchetes ou chaves** sem nenhum sinal especial. No VBA seria preciso o ` _` no fim da linha.

O programa abaixo junta o que está nesta página para imprimir uma tabela com colunas alinhadas, do jeito que se costuma mostrar a solução de um modelo:

```python abrir
produtos = ["mesa", "cadeira", "armário"]
preco = [450.0, 120.0, 980.0]
custo = [310.0, 95.5, 640.0]

print(f"{'Produto':<10}{'Preço':>10}{'Custo':>10}{'Margem':>10}")
print("-" * 40)
for k in range(len(produtos)):
    margem = (preco[k] - custo[k]) / preco[k]
    print(f"{produtos[k]:<10}{preco[k]:>10.2f}{custo[k]:>10.2f}{margem:>10.1%}")
```

`"-" * 40` repete o texto 40 vezes. O laço `for` é o assunto da próxima página, [Laços e condições](py-lacos.md).

## Resumo: do VBA ao Python

| VBA | Python |
|---|---|
| `Dim x As Double` e `x = 2.5` | `x = 2.5` |
| `' comentário` | `# comentário` |
| `"a" & "b"` | `"a" + "b"` ou f-string |
| `x ^ 2` | `x ** 2` |
| `a \ b`, `a Mod b` | `a // b`, `a % b` |
| `If a = b`, `If a <> b` | `if a == b`, `if a != b` |
| `CStr(x)`, `CDbl(t)`, `CInt(t)` | `str(x)`, `float(t)`, `int(t)` |
| `Format(x, "0.00")` | `f"{x:.2f}"` |
| `Debug.Print x` ou `MsgBox x` | `print(x)` |
| linha continuada com ` _` | quebra livre dentro de `( )`, `[ ]`, `{ }` |
