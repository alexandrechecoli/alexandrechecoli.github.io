# Opções do solver

As opções mudam o comportamento do HiGHS. Devem ser definidas **antes** de `maximize`, `minimize` ou `solve`.

## Ocultar o log

### `h.silent()`

Desliga o log do solver. A saída passa a ter só o que o seu código imprime.

```python
h = highspy.Highs()
h.silent()
```

`h.setOptionValue("output_flag", False)` faz o mesmo.

> Enquanto estiver montando o modelo, deixe o log ligado: ele mostra o número de linhas e colunas, e isso ajuda a perceber uma restrição esquecida. Veja [Entender o log do HiGHS](log.md).

## Outras opções

### `h.setOptionValue(nome, valor)`

Define uma opção pelo nome.

| Opção | Valor | Efeito |
|---|---|---|
| `"output_flag"` | `True` ou `False` | Liga ou desliga o log. |
| `"time_limit"` | segundos | Interrompe a resolução ao atingir o tempo. O status passa a ser `Time limit reached`. |
| `"mip_rel_gap"` | fração (ex.: `0.01`) | Em PLI, para quando a diferença entre a melhor solução e o melhor limite fica abaixo desse valor. O padrão é `0.0001` (0,01%). |
| `"presolve"` | `"on"` ou `"off"` | Liga ou desliga a simplificação do modelo antes da resolução. Desligar serve para estudar o método, não para ganhar tempo. |

```python
h.setOptionValue("time_limit", 30)      # no máximo 30 segundos
h.setOptionValue("mip_rel_gap", 0.01)   # aceita solução a até 1% do ótimo
```

Um nome de opção que não existe não interrompe o programa: a chamada apenas devolve `HighsStatus.kError`, e o HiGHS segue com o valor padrão. Confira a grafia.

## Sobre o limite de tempo

Neste editor, o botão de parar (ou `Shift+F5`) interrompe a execução, mas recarrega o Python inteiro e descarta o que já foi calculado. Em um modelo de PLI demorado, é melhor definir `time_limit`: o solver para sozinho e, se alguma solução viável já tiver sido encontrada, ela continua disponível em `h.val(...)`. Com um limite curto demais, o solver pode parar sem solução nenhuma; nesse caso o valor do objetivo sai como `inf`.
