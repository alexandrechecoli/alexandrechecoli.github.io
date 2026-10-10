# Primeiros passos

O WebPython é um editor de Python que roda inteiro no navegador. Ele já vem com o `highspy`, a interface em Python do solver **HiGHS**, que resolve problemas de Programação Linear (PL) e Programação Linear Inteira (PLI).

## Como usar o editor

- Escreva o código na aba à esquerda e clique no triângulo verde, no canto direito da linha de abas, para executar. A saída aparece na aba **Saída** deste painel.
- Cada aba é um arquivo independente. O botão `+` cria uma aba de código; `+ dados` cria uma aba de dados (veja [Leitura e escrita em arquivos](arquivos.md) e [Ler dados de arquivos](dados.md)).
- Duplo clique no nome da aba renomeia. O código fica guardado no navegador; use **Salvar** para ter uma cópia em arquivo.
- O menu **Exemplos…** abre modelos prontos. Cada um tem uma página explicando o modelo, na seção "Exemplos comentados" do índice desta ajuda.

| Atalho | O que faz |
|---|---|
| `F5` ou `Ctrl+Enter` | Executa a aba de código |
| `Shift+F5` | Interrompe a execução |
| `F1` | Abre a ajuda da palavra sob o cursor |
| `Ctrl+S` | Salva a aba em arquivo |
| `Alt+N` | Nova aba de código |
| `Ctrl+/` | Comenta ou descomenta as linhas |
| `Ctrl+F`, `Ctrl+H` | Buscar, substituir |
| `Ctrl+Espaço` | Autocompletar |

## Roteiro de um modelo

Todo modelo com o `highspy` segue os mesmos cinco passos:

1. criar o modelo com `highspy.Highs()`;
2. criar as [variáveis de decisão](variaveis.md);
3. adicionar as [restrições](restricoes.md);
4. definir a [função objetivo](objetivo.md), o que já resolve o modelo;
5. [ler os resultados](resultados.md).

```python abrir
import highspy

# 1. Modelo
h = highspy.Highs()

# 2. Variáveis de decisão
x = h.addVariable(lb=0, name="x")
y = h.addVariable(lb=0, name="y")

# 3. Restrições
h.addConstr(x + 2 * y <= 14, name="r1")
h.addConstr(3 * x - y >= 0, name="r2")
h.addConstr(x - y <= 2, name="r3")

# 4. Função objetivo (maximize já resolve o modelo)
h.maximize(3 * x + 4 * y)

# 5. Resultados
print()
print("Status:", h.modelStatusToString(h.getModelStatus()))
print("x =", h.val(x))
print("y =", h.val(y))
print("Valor ótimo:", h.getInfo().objective_function_value)
```

O texto que aparece antes dos seus `print` é o log do solver. Para saber o que ele diz, veja [Entender o log do HiGHS](log.md); para ocultá-lo, veja [Opções do solver](opcoes.md).

## O que este editor não faz

- `input()` não funciona: não há como digitar dados durante a execução. Coloque os dados no código ou em [abas de dados](dados.md).
- O `scipy.optimize` não está disponível, porque entra em conflito com o `highspy` no navegador.
- Uma aba de código não importa outra aba de código.
- Pacotes como `pandas` e `numpy` funcionam, mas são baixados na primeira vez que aparecem em um `import` (alguns segundos).
