# Função objetivo e resolução

## Definir o objetivo e resolver

### `h.maximize(expressão)`

Define a função objetivo como a expressão dada, a ser maximizada, e **resolve o modelo** em seguida.

```python
h.maximize(40 * mesas + 30 * cadeiras)
```

### `h.minimize(expressão)`

O mesmo, minimizando.

```python
h.minimize(sum(custo[i][j] * x[i, j] for i in fabricas for j in centros))
```

> `maximize` e `minimize` já executam o solver. Por isso devem vir **depois** de todas as variáveis e restrições, e não é preciso chamar mais nada para resolver.

Quando a chamada termina, o modelo está resolvido e os resultados podem ser lidos (veja [Lendo os resultados](resultados.md)). O log do solver é impresso nesse momento; para ocultá-lo, veja [Opções do solver](opcoes.md).

## Resolver de novo

### `h.solve()`

Resolve o modelo outra vez com o objetivo já definido. Serve para quando o modelo muda depois da primeira resolução, por exemplo ao acrescentar uma restrição para ver o efeito dela.

```python
h.maximize(40 * mesas + 30 * cadeiras)
print("Lucro original:", h.getInfo().objective_function_value)

h.addConstr(cadeiras <= 50, name="limite_cadeiras")
h.solve()
print("Lucro com o limite:", h.getInfo().objective_function_value)
```

`h.run()` faz o mesmo que `h.solve()`.

## Cuidados

- Um modelo tem uma única função objetivo. Chamar `maximize` duas vezes troca o objetivo, não soma.
- Antes de usar os valores, confira se o status é `Optimal`. Um modelo inviável ou ilimitado também "termina", e os valores lidos nesse caso não significam nada.
