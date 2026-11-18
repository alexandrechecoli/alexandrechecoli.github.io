# Exportar o modelo (.lp)

O HiGHS consegue gravar o modelo montado pelo código em um arquivo **.lp**, um formato de texto que mostra o objetivo, as restrições e os limites das variáveis do jeito que se escreve no papel. Exportar serve para:

- conferir se o modelo montado pelos laços é o que você pretendia (um índice trocado aparece logo);
- comparar com a formulação matemática do problema;
- resolver o mesmo modelo em outro solver (Gurobi, CPLEX, SCIP, GLPK e o próprio HiGHS leem `.lp`).

## Gravar o arquivo

### `h.writeModel(nome_do_arquivo)`

Grava o modelo como ele está no momento da chamada. O formato vem da extensão do nome:

| Nome | Formato |
|---|---|
| `"modelo.lp"` | LP, legível, o mais indicado para conferir o modelo. |
| `"modelo.mps"` | MPS, em colunas fixas, aceito por praticamente todo solver. |

Qualquer outra extensão (por exemplo `"modelo.txt"`) não grava nada: a chamada devolve `HighsStatus.kError`, sem interromper o programa.

```python
h.writeModel("modelo.lp")
```

> Neste editor, o arquivo `.lp` **não vira uma aba**: só viram abas os arquivos terminados em `.txt`, `.csv`, `.tsv`, `.json` ou `.dat` (veja [Leitura e escrita em arquivos](arquivos.md)). As duas próximas seções mostram como ver o conteúdo e como levá-lo ao seu computador.

## Ver o modelo na saída

Depois de gravar, basta ler o arquivo e imprimir:

```python
h.writeModel("modelo.lp")
print(open("modelo.lp", encoding="utf-8").read())
```

## Levar o arquivo para o computador

Copie o conteúdo para um arquivo `.txt`. Ao fim da execução, ele aparece como uma aba de dados (`modelo_lp.txt`), que pode ser baixada com **Salvar**:

```python
h.writeModel("modelo.lp")
with open("modelo.lp", encoding="utf-8") as origem, open("modelo_lp.txt", "w", encoding="utf-8") as destino:
    destino.write(origem.read())
```

No computador, renomeie o arquivo baixado para `modelo.lp` antes de abri-lo em outro solver.

> Não renomeie a aba para `modelo.lp` dentro do editor: sem uma extensão de dados, ela passa a ser uma aba de código Python.

## Exportar antes de resolver

`maximize` e `minimize` definem o objetivo **e já resolvem** o modelo (veja [Função objetivo e resolução](objetivo.md)). Chamar `writeModel` depois deles funciona, porque o objetivo continua no modelo, mas o solver já rodou. Para gravar o modelo **antes** de resolver, por exemplo para conferir um modelo grande sem esperar a resolução, defina o objetivo com `setObjective` e resolva depois com `solve`.

### `h.setObjective(expressão, sense=...)`

Define a função objetivo **sem** resolver. O sentido é `highspy.ObjSense.kMaximize` ou `highspy.ObjSense.kMinimize`.

```python abrir
import highspy

h = highspy.Highs()
h.silent()  # oculta o log do solver

mesas = h.addVariable(lb=0, name="mesas")
cadeiras = h.addVariable(lb=0, name="cadeiras")

h.addConstr(2 * mesas + cadeiras <= 100, name="marcenaria")
h.addConstr(mesas + cadeiras <= 80, name="acabamento")
h.addConstr(mesas <= 40, name="demanda")

# Define o objetivo sem resolver
h.setObjective(40 * mesas + 30 * cadeiras, sense=highspy.ObjSense.kMaximize)

# Grava e mostra o modelo
h.writeModel("modelo.lp")
print(open("modelo.lp", encoding="utf-8").read())

# Agora resolve
h.solve()
print("Status:", h.modelStatusToString(h.getModelStatus()))
print("Lucro: ", h.getInfo().objective_function_value)
```

```text
\ File written by HiGHS .lp file handler
max
 obj: +40 mesas +30 cadeiras 
st
 marcenaria: +2 mesas +1 cadeiras <= +100
 acabamento: +1 mesas +1 cadeiras <= +80
 demanda: +1 mesas <= +40
bounds
end

Status: Optimal
Lucro:  2600.0
```

## Como ler o arquivo .lp

| Trecho | Significado |
|---|---|
| `\ ...` | Comentário. |
| `max` ou `min` | Sentido do objetivo. |
| `obj: ...` | A função objetivo. |
| `st` | *subject to* (sujeito a): começa a lista de restrições, cada uma com o nome dado em `name=`. |
| `bounds` | Limites das variáveis. O limite padrão (`0 <= x`, sem limite superior) não aparece; `free` indica uma variável sem limites (`lb=-highspy.kHighsInf`). |
| `bin` | Variáveis binárias. |
| `gen` | Variáveis inteiras (*general integers*). |
| `semi` | Variáveis semicontínuas. O HiGHS escreve a seção mesmo vazia, em modelos com inteiras. |
| `end` | Fim do arquivo. |

Em um modelo de PLI, por exemplo com três binárias e uma inteira entre 0 e 10, o fim do arquivo fica assim:

```text
bounds
 x0 <= 1
 x1 <= 1
 x2 <= 1
 y <= 10
bin
 x0
 x1
 x2
gen
 y
semi
end
```

## Dê nomes às variáveis e às restrições

Sem `name=`, o HiGHS inventa nomes como `c_ekk0` para as variáveis e `r0` para as restrições, e o arquivo fica difícil de conferir. Nesse caso `writeModel` grava o arquivo, mas devolve `HighsStatus.kWarning`. Com variáveis indexadas, inclua os índices no nome:

```python
x = {(i, j): h.addVariable(lb=0, name=f"x_{i}_{j}") for i in fabricas for j in centros}

for i in fabricas:
    h.addConstr(sum(x[i, j] for j in centros) <= oferta[i], name=f"oferta_{i}")
```

Evite espaços e acentos nos nomes: no formato LP o espaço separa os termos, e outros solvers podem recusar caracteres acentuados.
