# Decomposição de Benders

> Cada bloco de teoria é seguido imediatamente por sua aplicação num exemplo numérico pequeno o bastante para ser feito à mão. Todos os números foram verificados por implementação.

---

## Parte 0 — O problema que vamos carregar o material inteiro

Antes da teoria, o exemplo. Assim cada conceito novo já nasce com um lugar para pousar.

**Localização de instalações (facility location) sem capacidade.**

Temos 2 locais candidatos para abrir depósitos e 3 clientes que precisam ser atendidos.

| | Custo fixo de abrir |
|---|---|
| Depósito 1 | 4 |
| Depósito 2 | 3 |

| Custo de atender | Cliente A | Cliente B | Cliente C |
|---|---|---|---|
| do Depósito 1 | 1 | 3 | 6 |
| do Depósito 2 | 5 | 2 | 2 |

Formulação:

$$\min_{y,x}\; \underbrace{\sum_i f_i y_i}_{\text{abrir}} + \underbrace{\sum_{i,j} c_{ij} x_{ij}}_{\text{atender}}$$

sujeito a

$$\sum_i x_{ij} = 1 \;\;\forall j, \qquad x_{ij} \le y_i \;\;\forall i,j, \qquad x \ge 0,\;\; y \in \{0,1\}^2$$

Aqui $y_i$ = abrir ou não o depósito $i$; $x_{ij}$ = fração da demanda do cliente $j$ atendida por $i$.

Como só há 4 combinações de $y$, sabemos a resposta por força bruta: o ótimo custa **12**, atingido tanto por $y=(0,1)$ quanto por $y=(1,1)$. Guarde esse número — ele é o gabarito contra o qual Benders vai ser conferido.

---

## Parte 1 — Teoria: a estrutura de variáveis complicadoras

Benders só faz sentido quando o problema tem a forma

$$\min_{x,y}\; c^Ty + f^Tx \quad \text{s.a.}\quad Ay \ge b,\;\; By + Cx \ge d,\;\; y \in Y,\; x \ge 0$$

onde $y$ são as **variáveis complicadoras** — fixá-las torna o resto fácil — e $x$ as variáveis fáceis.

A ideia é reescrever o problema como

$$\min_{y \in Y}\; \Big\{ c^Ty + \mathcal{Q}(y) \Big\}, \qquad \mathcal{Q}(y) = \min_{x \ge 0}\{ f^Tx : Cx \ge d - By \}$$

$\mathcal{Q}(y)$ é a **função valor do subproblema**. Não temos fórmula fechada para ela, mas — e esse é o ponto central — ela é **convexa e linear por partes** em $y$ quando o subproblema é um LP. Logo pode ser aproximada por baixo por um envelope de hiperplanos. Cada hiperplano é um **corte de Benders**.

O algoritmo alterna:

1. **Mestre**: resolve $\min\{c^Ty + \eta\}$ com os cortes acumulados. Dá um **limite inferior (LB)**.
2. **Subproblema**: fixa $\bar y$, resolve o LP, gera um corte novo. Dá um **limite superior (UB)**.
3. Repete até $UB - LB \le \varepsilon$.

### Por que um limite é inferior e o outro superior

Os dois lados não são metades simétricas do mesmo cálculo. O mestre resolve um problema **relaxado sobre todos os $y$**; o subproblema **avalia exatamente um $y$**. Essa assimetria é a fonte dos dois limites.

**O mestre é otimista.** Todo corte $\eta \ge (d - By)^T\bar u$ vale para *todo* $y$, não só para o $\bar y$ que o gerou (é o que a Parte 2 vai provar). Logo, se $\eta_k(y)$ é o máximo dos cortes acumulados até a iteração $k$, vale

$$\eta_k(y) \le \mathcal{Q}(y) \qquad \forall y$$

O mestre minimiza $c^Ty + \eta_k(y)$, uma função que está por baixo de $c^Ty + \mathcal{Q}(y)$ em toda parte. Minimizar uma função menor devolve um valor menor: $LB_k \le z^*$.

A leitura geométrica é a mesma: o problema verdadeiro minimiza sobre o epígrafo $\{(y,t) : t \ge \mathcal{Q}(y)\}$, e o mestre substitui esse conjunto por um poliedro que o **contém**, definido por finitos hiperplanos. Região viável maior, mínimo menor. Os cortes de factibilidade não estragam o argumento porque só removem valores de $y$ para os quais o problema original é genuinamente inviável — o ótimo nunca é cortado fora.

**O subproblema é pessimista.** Aqui não há relaxação nenhuma. Fixa-se $\bar y$, resolve-se o LP e obtém-se $\bar x$. O par $(\bar y, \bar x)$ é uma solução **viável do problema original completo**, com $y$ inteiro e todas as restrições satisfeitas. E o custo de qualquer solução viável é, por definição, maior ou igual ao da melhor:

$$c^T\bar y + \mathcal{Q}(\bar y) \;\ge\; z^*$$

Dois detalhes que costumam passar batido:

- $UB$ é o **melhor encontrado até agora**, $UB_k = \min_{j \le k}\{c^T\bar y_j + \mathcal{Q}(\bar y_j)\}$. É só por isso que ele nunca sobe. Uma iteração pode perfeitamente produzir um custo pior que o UB corrente — nesse caso o UB simplesmente não é atualizado.
- Iteração com subproblema inviável não produz UB nenhum. Enquanto isso acontecer, $UB = \infty$: ainda não existe solução viável conhecida.

**O gap é o erro da aproximação no ponto escolhido.** Essa é a leitura que amarra tudo. Na iteração $k$ o mestre devolve o par $(\bar y_k, \eta_k)$, e:

$$\underbrace{c^T\bar y_k + \mathcal{Q}(\bar y_k)}_{\text{custo real desse } \bar y} \;-\; \underbrace{(c^T\bar y_k + \eta_k)}_{LB_k} \;=\; \mathcal{Q}(\bar y_k) - \eta_k$$

O termo $c^T\bar y_k$ cancela. O que sobra é exatamente **quanto o envelope de cortes subestima $\mathcal{Q}$ no ponto que o próprio mestre escolheu**. O gap reportado, $UB_k - LB_k$, é menor ou igual a isso, já que o UB pode vir de uma iteração anterior melhor.

Parar com $UB - LB \le \varepsilon$ não é, portanto, dois números se encontrando por coincidência: é a afirmação de que a aproximação já ficou exata onde ela importa. E como o corte gerado na iteração $k$ é apertado em $\bar y_k$ — toca $\mathcal{Q}$ exatamente ali —, o mestre não consegue devolver aquele mesmo $\bar y$ de novo com um $\eta$ otimista demais. Com $Y$ finito, é isso que garante terminação em número finito de iterações.

> **Detalhe de implementação:** o $\eta \ge 0$ do mestre inicial não é decoração. Sem algum limite inferior para $\eta$, o mestre da primeira iteração é ilimitado e $LB = -\infty$. Usa-se 0 quando os custos de recurso são não-negativos, ou qualquer bound válido conhecido.

### Aplicando ao exemplo

Quem são os complicadores? As binárias $y$. Se eu decidir quais depósitos abrir, o que sobra é:

$$\mathcal{Q}(\bar y) = \min_x \sum_{ij} c_{ij}x_{ij} \;\;\text{s.a.}\;\; \sum_i x_{ij} = 1,\;\; x_{ij} \le \bar y_i,\;\; x \ge 0$$

um LP puro — na verdade, trivial: cada cliente vai ao depósito aberto mais barato. Fixar $y$ eliminou toda a combinatória. **Essa é exatamente a condição que autoriza Benders.**

---

## Parte 1.5 — Diagnóstico visual: o modelo completo em blocos

O argumento acima foi verbal. Existe um teste mais confiável: **escrever a matriz de coeficientes inteira e olhar para ela.** Se a estrutura de Benders existir, ela salta aos olhos — desde que as variáveis e restrições estejam na ordem certa.

### O modelo escrito por extenso

São 8 variáveis e 9 restrições. Objetivo:

$$\min\; 4y_1 + 3y_2 + 1x_{1A} + 5x_{2A} + 3x_{1B} + 2x_{2B} + 6x_{1C} + 2x_{2C}$$

Restrições:

$$
\begin{array}{llll}
\text{(atrib. A)} & x_{1A} + x_{2A} = 1 &\quad \text{(lig. 1A)} & x_{1A} - y_1 \le 0 \\
\text{(atrib. B)} & x_{1B} + x_{2B} = 1 &\quad \text{(lig. 2A)} & x_{2A} - y_2 \le 0 \\
\text{(atrib. C)} & x_{1C} + x_{2C} = 1 &\quad \text{(lig. 1B)} & x_{1B} - y_1 \le 0 \\
& &\quad \text{(lig. 2B)} & x_{2B} - y_2 \le 0 \\
& &\quad \text{(lig. 1C)} & x_{1C} - y_1 \le 0 \\
& &\quad \text{(lig. 2C)} & x_{2C} - y_2 \le 0
\end{array}
$$

### A matriz, ordenada para revelar a estrutura

A ordenação é o truque. Colunas: primeiro as complicadoras $y$, depois as variáveis $x$ **agrupadas por cliente**. Linhas: agrupadas pelo mesmo critério.

| | $y_1$ | $y_2$ | $x_{1A}$ | $x_{2A}$ | $x_{1B}$ | $x_{2B}$ | $x_{1C}$ | $x_{2C}$ | | RHS |
|---|---|---|---|---|---|---|---|---|---|---|
| **custo** | 4 | 3 | 1 | 5 | 3 | 2 | 6 | 2 | | |
| atrib. A | · | · | **1** | **1** | · | · | · | · | = | 1 |
| lig. 1A | −1 | · | **1** | · | · | · | · | · | ≤ | 0 |
| lig. 2A | · | −1 | · | **1** | · | · | · | · | ≤ | 0 |
| atrib. B | · | · | · | · | **1** | **1** | · | · | = | 1 |
| lig. 1B | −1 | · | · | · | **1** | · | · | · | ≤ | 0 |
| lig. 2B | · | −1 | · | · | · | **1** | · | · | ≤ | 0 |
| atrib. C | · | · | · | · | · | · | **1** | **1** | = | 1 |
| lig. 1C | −1 | · | · | · | · | · | **1** | · | ≤ | 0 |
| lig. 2C | · | −1 | · | · | · | · | · | **1** | ≤ | 0 |

*(pontos = zeros, omitidos para deixar o padrão visível)*

### Lendo a estrutura

Três fatos ficam evidentes só de olhar:

**1. As colunas de $y$ são densas; as de $x$ são esparsas e agrupadas.** As colunas $y_1$ e $y_2$ tocam linhas espalhadas pelos três grupos — elas *acoplam* tudo. As colunas de $x$ ficam confinadas ao seu grupo. Isso é a assinatura de variável complicadora: **poucas colunas com entradas espalhadas por todos os blocos.**

**2. O bloco de $x$ é diagonal por blocos.** Ignorando as duas primeiras colunas, sobra:

$$
C = \begin{bmatrix} C_A & & \\ & C_B & \\ & & C_C \end{bmatrix}, \qquad
C_A = C_B = C_C = \begin{bmatrix} 1 & 1 \\ 1 & 0 \\ 0 & 1 \end{bmatrix}
$$

Três blocos idênticos, sem nada fora da diagonal. **Fixando $y$, o subproblema se parte em 3 LPs independentes — um por cliente.** É por isso que a solução do subproblema é aquela regra trivial "cada cliente vai ao depósito aberto mais barato": os clientes não se falam.

**3. $y$ aparece só na coluna, nunca multiplicando $x$.** Ao fixar $y = \bar y$, os termos $-y_i$ migram para o lado direito:

$$x_{1A} \le \bar y_1, \quad x_{2A} \le \bar y_2, \quad \dots$$

O RHS vira $d - B\bar y$ e a matriz $C$ fica intacta. **Esse é o requisito da Parte 2** (região viável do dual independente de $y$), agora visível como um fato geométrico da matriz, não como uma afirmação abstrata.

### O formato canônico

O que vimos instancia o gabarito de Benders:

$$
\left[\begin{array}{c|c} A & 0 \\ \hline B & C \end{array}\right]
\begin{bmatrix} y \\ x \end{bmatrix}
\;\gtrless\;
\begin{bmatrix} b \\ d \end{bmatrix}
$$

| Bloco | O que é | No nosso exemplo |
|---|---|---|
| $A$ | restrições só de $y$ → **ficam no mestre** | vazio (só $y \in \{0,1\}^2$) |
| $\mathbf{0}$ | **tem que ser zero** — se não for, não é Benders | ✓ |
| $B$ | acoplamento de $y$ nas linhas do subproblema | as entradas $-1$ |
| $C$ | subproblema puro → **quanto mais diagonal, melhor** | 3 blocos idênticos |

O bloco $\mathbf{0}$ no canto superior direito é a condição estrutural inegociável. Ele diz: *existem restrições que envolvem apenas as complicadoras*. Se as variáveis $x$ aparecessem lá, não haveria como separar mestre e subproblema.

Se acrescentássemos uma regra como "abra no máximo um depósito" ($y_1 + y_2 \le 1$), ela entraria como uma linha no bloco $A$:

| | $y_1$ | $y_2$ | $x_{1A}$ | ⋯ | | RHS |
|---|---|---|---|---|---|---|
| máx. 1 depósito | 1 | 1 | · | ⋯ | ≤ | 1 |

Zeros à direita da barra — vai direto para o mestre, sem tocar no subproblema. Os cortes de Benders, aliás, também são linhas adicionadas a esse bloco $A$ (mais a coluna de $\eta$): **o algoritmo constrói $A$ incrementalmente.**

### A ordenação importa — e determina qual método usar

Se as colunas fossem agrupadas por *depósito* em vez de por *cliente* ($y_1, y_2 \mid x_{1A}, x_{1B}, x_{1C} \mid x_{2A}, x_{2B}, x_{2C}$), as linhas de atribuição passariam a cruzar os dois blocos e a diagonal desapareceria. O padrão vira outro: blocos independentes por depósito, ligados por **linhas** de acoplamento.

Isso não é um erro — é uma estrutura diferente, e ela aponta para outro método:

| Padrão na matriz | Acoplamento | Método natural |
|---|---|---|
| Poucas **colunas** densas | variáveis complicadoras | **Benders** |
| Poucas **linhas** densas | restrições complicadoras | **Dantzig-Wolfe / geração de colunas** |

A mesma matriz admite as duas leituras. Vale testar permutações antes de concluir que não há estrutura aproveitável — o que parece uma matriz sem padrão frequentemente só está com as linhas e colunas na ordem errada. Na prática, para modelos grandes, use as ferramentas de visualização de esparsidade do seu solver ou simplesmente plote a matriz (`plt.spy(A)` em Python) e olhe o desenho.

---

## Parte 2 — Teoria: por que precisamos do dual

O problema é que $\mathcal{Q}(\bar y)$ nos dá um único ponto da função, e um ponto não é um corte. Precisamos de um hiperplano válido para **todo** $y$, não só para $\bar y$.

É aqui que entra a dualidade. O dual do subproblema é

$$\mathcal{Q}(\bar y) = \max_{u \ge 0}\; (d - B\bar y)^T u \quad \text{s.a.}\quad C^Tu \le f$$

Repare no detalhe decisivo: **$\bar y$ aparece só na função objetivo, nunca nas restrições**. A região viável do dual, $\{u \ge 0 : C^Tu \le f\}$, é a mesma independentemente de qual $y$ tenhamos fixado.

Consequência: se $\bar u$ é viável no dual para um $\bar y$, ele é viável para todos. E por dualidade fraca, para qualquer $y$:

$$\mathcal{Q}(y) \ge (d - By)^T\bar u$$

Isso é um corte válido. O lado direito é **afim em $y$** — um hiperplano de suporte da função convexa $\mathcal{Q}$.

> **Requisito estrutural que emerge daqui:** a região viável do dual não pode depender de $y$. Se $y$ aparecesse nas restrições do subproblema de forma a mudar as restrições do dual, os cortes deixariam de ser válidos globalmente. É por isso que Benders clássico exige que $y$ entre no subproblema apenas pelo lado direito ($d - By$).

### Aplicando ao exemplo

Associe $u_j$ (livre) a $\sum_i x_{ij} = 1$ e $w_{ij} \ge 0$ a $x_{ij} \le y_i$. O dual fica:

$$\max_{u,w}\; \sum_j u_j - \sum_{i,j} \bar y_i\, w_{ij} \quad\text{s.a.}\quad u_j - w_{ij} \le c_{ij},\;\; w_{ij} \ge 0$$

Confirme: $\bar y$ só está no objetivo. As restrições $u_j - w_{ij} \le c_{ij}$ são fixas. ✓

E há solução fechada:
- $u_j = \min_{i \text{ aberto}} c_{ij}$ (custo de atender $j$ com a configuração atual)
- $w_{ij} = \max(0,\; u_j - c_{ij})$ (o quanto se economizaria se $i$ estivesse aberto)

O corte resultante:

$$\boxed{\;\eta \;\ge\; \sum_j u_j \;-\; \sum_i \Big(\sum_j w_{ij}\Big) y_i\;}$$

Leitura econômica: "o custo de atendimento é $\sum_j u_j$, **descontado** de quanto cada depósito ainda fechado economizaria se fosse aberto". O corte carrega informação sobre configurações que ainda nem testamos — é isso que faz o método funcionar.

---

## Parte 3 — Teoria: cortes de factibilidade

Se o subproblema for **infactível** para um dado $\bar y$, o dual é ilimitado (dualidade forte). Existe então um **raio extremo** $r \ge 0$ com $C^Tr \le 0$ e $(d - B\bar y)^Tr > 0$.

Para que o subproblema seja factível, é necessário que nenhum raio dê objetivo positivo:

$$(d - By)^T r \le 0$$

Esse é um **corte de factibilidade**. Não envolve $\eta$ — apenas elimina regiões de $y$ que tornam o problema impossível.

### Aplicando ao exemplo

Se nenhum depósito abre ($y = (0,0)$), nenhum cliente pode ser atendido: infactível. O raio: tome $u_j = 1$ para todo $j$ e $w_{ij} = 1$ para todo $i,j$ (satisfaz $u_j - w_{ij} \le 0$). O objetivo dual na direção do raio:

$$3 - 3(y_1 + y_2)$$

Impor $\le 0$ dá o corte de factibilidade:

$$y_1 + y_2 \ge 1$$

"Abra pelo menos um depósito." Óbvio para nós — mas o algoritmo o **derivou**, não o recebeu.

---

## Parte 4 — Prática: rodando o algoritmo completo

Visão geral antes do detalhamento:

| It | $y$ do mestre | LB | Subproblema | UB | Corte gerado |
|---|---|---|---|---|---|
| 1 | (0,0) | 0.00 | **infactível** | ∞ | $y_1 + y_2 \ge 1$ |
| 2 | (0,1) | 3.00 | $Q = 9$ | 12.00 | $\eta \ge 9 - 4y_1$ |
| 3 | (1,0) | 9.00 | $Q = 10$ | 12.00 | $\eta \ge 10 - 5y_2$ |
| 4 | (0,1) | **12.00** | $Q = 9$ | **12.00** | LB = UB → **parar** |

**Ótimo: abrir só o depósito 2, custo total 12.** Bate com a força bruta. ✓

Abaixo, cada iteração com os dois modelos escritos por extenso — exatamente o que um solver receberia — mais a solução dual usada para montar o corte.

Notação dos duais, fixada uma vez: $u_j$ (livre) associado a $\sum_i x_{ij} = 1$, e $w_{ij} \ge 0$ associado a $x_{ij} \le y_i$.

---

### Iteração 1

**Mestre.** Nenhum corte ainda; $\eta$ só tem seu bound inicial.

$$
\begin{aligned}
\min\;\; & 4y_1 + 3y_2 + \eta \\
\text{s.a.}\;\; & \eta \ge 0 \\
& y \in \{0,1\}^2
\end{aligned}
$$

Enumerando as quatro configurações (com $\eta = 0$, pois nada o força a subir):

| $y$ | custo fixo | $\eta$ | total |
|---|---|---|---|
| **(0,0)** | 0 | 0 | **0.00** ← |
| (0,1) | 3 | 0 | 3.00 |
| (1,0) | 4 | 0 | 4.00 |
| (1,1) | 7 | 0 | 7.00 |

$\bar y = (0,0)$, $\bar\eta = 0$, $\;LB = 0$.

**Subproblema** com $\bar y = (0,0)$ substituído no lado direito:

$$
\begin{aligned}
\min\;\; & x_{1A} + 5x_{2A} + 3x_{1B} + 2x_{2B} + 6x_{1C} + 2x_{2C} \\
\text{s.a.}\;\; & x_{1A} + x_{2A} = 1 && (u_A) \\
& x_{1B} + x_{2B} = 1 && (u_B) \\
& x_{1C} + x_{2C} = 1 && (u_C) \\
& x_{1A} \le 0,\;\; x_{1B} \le 0,\;\; x_{1C} \le 0 && (w_{1j}) \\
& x_{2A} \le 0,\;\; x_{2B} \le 0,\;\; x_{2C} \le 0 && (w_{2j}) \\
& x \ge 0
\end{aligned}
$$

Todas as variáveis são forçadas a zero pelas ligações, mas as três atribuições exigem soma 1. **Infactível.**

**Dual.** Não existe solução dual ótima para coletar — o dual é ilimitado. O que existe é um **raio extremo**: $u = (1,1,1)$, $w_{ij} = 1$ para todo $i,j$, que satisfaz $u_j - w_{ij} \le 0 \le c_{ij}$ e é uma direção de recessão do dual.

Objetivo dual ao longo do raio, como função de $y$:

$$\sum_j u_j - \sum_i \Big(\sum_j w_{ij}\Big) y_i \;=\; 3 - 3y_1 - 3y_2$$

Impor $\le 0$ dá o **corte de factibilidade** $\;y_1 + y_2 \ge 1$. Sem UB: nenhuma solução viável foi encontrada, $UB = \infty$.

---

### Iteração 2

**Mestre.** Agora com o corte de factibilidade:

$$
\begin{aligned}
\min\;\; & 4y_1 + 3y_2 + \eta \\
\text{s.a.}\;\; & y_1 + y_2 \ge 1 && \text{(factib., it. 1)} \\
& \eta \ge 0 \\
& y \in \{0,1\}^2
\end{aligned}
$$

| $y$ | custo fixo | $\eta$ | total |
|---|---|---|---|
| (0,0) | — | — | cortado |
| **(0,1)** | 3 | 0 | **3.00** ← |
| (1,0) | 4 | 0 | 4.00 |
| (1,1) | 7 | 0 | 7.00 |

$\bar y = (0,1)$, $\bar\eta = 0$, $\;LB = 3$.

**Subproblema** com $\bar y = (0,1)$: as ligações do depósito 1 viram $\le 0$, as do depósito 2 viram $\le 1$.

$$
\begin{aligned}
\min\;\; & x_{1A} + 5x_{2A} + 3x_{1B} + 2x_{2B} + 6x_{1C} + 2x_{2C} \\
\text{s.a.}\;\; & x_{1A} + x_{2A} = 1 && (u_A) \\
& x_{1B} + x_{2B} = 1 && (u_B) \\
& x_{1C} + x_{2C} = 1 && (u_C) \\
& x_{1A} \le 0,\;\; x_{1B} \le 0,\;\; x_{1C} \le 0 && (w_{1j}) \\
& x_{2A} \le 1,\;\; x_{2B} \le 1,\;\; x_{2C} \le 1 && (w_{2j}) \\
& x \ge 0
\end{aligned}
$$

Solução primal: $x_{2A} = x_{2B} = x_{2C} = 1$, demais zero. $\;\mathcal{Q}(\bar y) = 5 + 2 + 2 = 9$.

**Solução dual:**

| | A | B | C | $\textstyle\sum_j$ |
|---|---|---|---|---|
| $u_j$ | 5 | 2 | 2 | 9 |
| $w_{1j}$ | **4** | 0 | 0 | **4** |
| $w_{2j}$ | 0 | 0 | 0 | 0 |

Conferência (sempre faça esta): objetivo dual $= \sum_j u_j - \bar y_1 \sum_j w_{1j} - \bar y_2 \sum_j w_{2j} = 9 - 0\cdot 4 - 1\cdot 0 = 9 = \mathcal{Q}(\bar y)$. ✓

**Corte de otimalidade:**

$$\eta \;\ge\; 9 - 4y_1 - 0\,y_2$$

Leitura: "com essa configuração o atendimento custa 9; abrir o depósito 1 pode economizar até 4, todo ele no cliente A". O único $w$ não nulo é $w_{1A} = \max(0,\,5-1) = 4$ — o cliente A hoje paga 5 e pagaria 1 no depósito 1.

**UB.** $(\bar y, \bar x)$ é viável no problema original, custo $3 + 9 = 12$. Logo $UB = 12$.

Erro da aproximação em $\bar y$: $\mathcal{Q}(\bar y) - \bar\eta = 9 - 0 = 9$. Enorme, porque o mestre ainda era cego.

---

### Iteração 3

**Mestre.** Agora com o corte de otimalidade da iteração 2:

$$
\begin{aligned}
\min\;\; & 4y_1 + 3y_2 + \eta \\
\text{s.a.}\;\; & y_1 + y_2 \ge 1 && \text{(factib., it. 1)} \\
& \eta \ge 9 - 4y_1 && \text{(otim., it. 2)} \\
& \eta \ge 0 \\
& y \in \{0,1\}^2
\end{aligned}
$$

| $y$ | custo fixo | $\eta = \max(0,\,9-4y_1)$ | total |
|---|---|---|---|
| (0,0) | — | — | cortado |
| (0,1) | 3 | 9 | 12.00 |
| **(1,0)** | 4 | 5 | **9.00** ← |
| (1,1) | 7 | 5 | 12.00 |

$\bar y = (1,0)$, $\bar\eta = 5$, $\;LB = 9$. Repare que foi o corte que apontou o depósito 1 como promissor — o mestre nunca tinha testado essa configuração.

**Subproblema** com $\bar y = (1,0)$:

$$
\begin{aligned}
\min\;\; & x_{1A} + 5x_{2A} + 3x_{1B} + 2x_{2B} + 6x_{1C} + 2x_{2C} \\
\text{s.a.}\;\; & x_{1A} + x_{2A} = 1 && (u_A) \\
& x_{1B} + x_{2B} = 1 && (u_B) \\
& x_{1C} + x_{2C} = 1 && (u_C) \\
& x_{1A} \le 1,\;\; x_{1B} \le 1,\;\; x_{1C} \le 1 && (w_{1j}) \\
& x_{2A} \le 0,\;\; x_{2B} \le 0,\;\; x_{2C} \le 0 && (w_{2j}) \\
& x \ge 0
\end{aligned}
$$

Solução primal: $x_{1A} = x_{1B} = x_{1C} = 1$. $\;\mathcal{Q}(\bar y) = 1 + 3 + 6 = 10$.

**Solução dual:**

| | A | B | C | $\textstyle\sum_j$ |
|---|---|---|---|---|
| $u_j$ | 1 | 3 | 6 | 10 |
| $w_{1j}$ | 0 | 0 | 0 | 0 |
| $w_{2j}$ | 0 | **1** | **4** | **5** |

Conferência: $10 - 1\cdot 0 - 0\cdot 5 = 10 = \mathcal{Q}(\bar y)$. ✓

**Corte de otimalidade:**

$$\eta \;\ge\; 10 - 0\,y_1 - 5y_2$$

Leitura: abrir o depósito 2 economizaria 1 no cliente B (3 → 2) e 4 no cliente C (6 → 2).

**UB.** Custo dessa solução: $4 + 10 = 14 > 12$. **O UB não é atualizado** — continua 12, herdado da iteração anterior. É exatamente o caso em que o subproblema produz uma solução viável pior que a incumbente.

Erro da aproximação em $\bar y$: $10 - 5 = 5$, que é justamente $14 - 9$.

---

### Iteração 4

**Mestre.** Com os três cortes acumulados:

$$
\begin{aligned}
\min\;\; & 4y_1 + 3y_2 + \eta \\
\text{s.a.}\;\; & y_1 + y_2 \ge 1 && \text{(factib., it. 1)} \\
& \eta \ge 9 - 4y_1 && \text{(otim., it. 2)} \\
& \eta \ge 10 - 5y_2 && \text{(otim., it. 3)} \\
& \eta \ge 0 \\
& y \in \{0,1\}^2
\end{aligned}
$$

| $y$ | custo fixo | $9-4y_1$ | $10-5y_2$ | $\eta$ | total |
|---|---|---|---|---|---|
| (0,0) | — | — | — | — | cortado |
| **(0,1)** | 3 | 9 | 5 | 9 | **12.00** ← |
| (1,0) | 4 | 5 | 10 | 10 | 14.00 |
| (1,1) | 7 | 5 | 5 | 5 | 12.00 |

$\bar y = (0,1)$, $\bar\eta = 9$, $\;LB = 12$. Há empate com $(1,1)$ em 12 — coerente com a Parte 0, onde os dois são ótimos; a enumeração devolve o primeiro encontrado.

**Subproblema** com $\bar y = (0,1)$: idêntico ao da iteração 2, mesma solução primal e mesmo dual. $\mathcal{Q}(\bar y) = 9$, $u = (5,2,2)$, $w_{1A} = 4$ e os demais nulos.

**Parada.** Custo real $= 3 + 9 = 12 = UB$, e $LB = 12$. Gap zero.

Erro da aproximação em $\bar y$: $\mathcal{Q}(\bar y) - \bar\eta = 9 - 9 = 0$. O corte que seria gerado agora, $\eta \ge 9 - 4y_1$, é **idêntico ao da iteração 2** — nada novo a aprender neste ponto. Esse é o mecanismo de terminação em ação: uma vez que o corte de $\bar y$ está na base, o mestre não consegue mais devolver aquele mesmo $\bar y$ com um $\eta$ otimista demais.

---

### O que rastrear numa execução

Note que **LB sobe monotonicamente** (0 → 3 → 9 → 12) enquanto **UB desce ou fica** (∞ → 12 → 12 → 12). O primeiro sobe porque cortes só se acumulam, e acrescentar restrições a um problema de minimização só pode aumentar o ótimo. O segundo desce porque guardamos o melhor de todas as iterações.

A coluna mais informativa para depurar, e que não aparece na tabela-resumo, é o **erro da aproximação** $\mathcal{Q}(\bar y_k) - \bar\eta_k$: 9 → 5 → 0. Se ela não cair, seus cortes estão fracos ou errados. Se ela der negativa em algum momento, você tem um bug grave — significa que um corte cortou parte do epígrafo verdadeiro, e o algoritmo vai convergir silenciosamente para a resposta errada.

---

## Parte 4.5 — Prática: você nunca escreve o dual

As Partes 2 e 3 escreveram o dual por extenso, e a Parte 4 exibiu suas soluções. Isso pode dar a impressão de que a implementação precisa de dois modelos por subproblema. **Não precisa.** Praticamente toda implementação real resolve o **primal** com $\bar y$ fixo e lê os multiplicadores das restrições direto do solver. O dual existe para *provar* que o corte é válido para todo $y$ — não para ser codado.

### O que de fato extrair

Só os duais das restrições em que $y$ aparece no lado direito, isto é, as linhas $Cx \ge d - B\bar y$. No exemplo, são as seis ligações $x_{ij} \le y_i$, cujos duais são os $w_{ij}$. Os duais das restrições que não dependem de $y$ — as atribuições, no nosso caso — entram no termo constante do corte, mas não nos coeficientes.

Você também precisa da matriz $B$ explicitamente do seu lado, porque o coeficiente de $y$ no corte é $-B^T\bar u$. No exemplo isso se materializou como "some os $w_{ij}$ ao longo de $j$ para obter o coeficiente de $y_i$".

### A armadilha número um: sinal

Cada solver tem sua convenção de sinal para os multiplicadores, dependendo de o modelo ser de minimização ou maximização e de a restrição ser $\le$, $\ge$ ou $=$. Errar isso produz cortes que parecem plausíveis mas cortam o ótimo fora, e o algoritmo converge para o número errado sem emitir nenhum alerta.

Existe um teste de sanidade barato que pega isso já na primeira iteração:

> Monte o corte e **avalie-o no próprio $\bar y$ que acabou de gerá-lo**. O resultado tem que dar exatamente $\mathcal{Q}(\bar y)$, o valor objetivo do subproblema recém-resolvido.

É a conferência que aparece em cada iteração da Parte 4. Se der outra coisa, é sinal trocado ou linha errada. Deixe esse `assert` ligado durante o desenvolvimento inteiro.

### Quando o subproblema é infactível

Aqui a receita "leia os duais" quebra: não existe solução dual ótima, e o que você precisa é de um raio extremo. Duas saídas:

**Pedir o certificado de Farkas ao solver.** `FarkasDual` no Gurobi (com `InfUnbdInfo=1`), `dualFarkas` no CPLEX, raio dual no HiGHS. Funciona, mas é API específica de cada solver e às vezes frágil.

**Nunca deixar o subproblema ficar infactível.** Acrescente variáveis artificiais nas restrições de acoplamento e minimize a soma das infactibilidades:

$$
\min_{x,s \ge 0}\; \mathbf{1}^Ts \quad \text{s.a.}\quad Cx + s \ge d - B\bar y
$$

Esse LP é sempre viável, logo sempre devolve duais. Se o ótimo é 0, o $\bar y$ é viável e você resolve o subproblema normal para gerar o corte de otimalidade. Se é positivo, os duais desse LP elástico já são exatamente o que você precisa para o corte de factibilidade. Uma única rotina, sem tratamento de exceção, sem dependência de API de raio. É a opção que eu recomendaria como padrão.

### Validade vem da viabilidade dual, não da otimalidade

Uma sutileza que vale internalizar: **qualquer** $\bar u$ que satisfaça $C^Tu \le f$, $u \ge 0$ produz um corte válido, porque por dualidade fraca $\mathcal{Q}(y) \ge (d - By)^T\bar u$ vale para todo $y$. A otimalidade do dual serve para deixar o corte **apertado** em $\bar y$ — tocando $\mathcal{Q}$ exatamente naquele ponto.

Duas consequências práticas:

- Se você usa método de barreira sem *crossover*, os duais não são de vértice, mas ainda são duais ótimos. O corte continua válido e apertado. Não há problema.
- Em caso de **degenerescência**, existem vários duais ótimos, o solver escolhe um arbitrariamente, e cortes diferentes saem de execuções diferentes com a mesma matemática. Todos são válidos e apertados em $\bar y$, mas alguns são muito melhores longe dele. É precisamente esse buraco que os cortes Pareto-ótimos de Magnanti & Wong (Parte 7) preenchem, resolvendo um segundo LP para escolher o melhor entre os duais ótimos empatados.

### Bônus de manter o primal

Como só o lado direito muda de uma iteração para outra, o subproblema é o caso ideal para **simplex dual com warm start**. Construa o modelo do subproblema uma única vez, fora do laço, e a cada iteração apenas atualize os RHS e re-otimize. Em instâncias grandes isso costuma valer mais que qualquer refinamento de corte.

### Esqueleto do laço

```python
# Fora do laço: construa uma vez.
sub = Model()
x   = sub.addVars(..., lb=0)
atr = sub.addConstrs(quicksum(x[i, j] for i in I) == 1 for j in J)
lig = sub.addConstrs(x[i, j] <= 0 for i in I for j in J)   # RHS atualizado a cada it.
sub.setObjective(quicksum(c[i][j] * x[i, j] for i in I for j in J), MINIMIZE)

# Dentro do laço:
for i in I:
    for j in J:
        lig[i, j].RHS = ybar[i]        # só o RHS muda → warm start do simplex dual
sub.optimize()

u = {j: atr[j].Pi for j in J}          # duais das linhas sem y
w = {(i, j): -lig[i, j].Pi for i in I for j in J}   # CONFIRA O SINAL

const = sum(u[j] for j in J)
coef  = {i: sum(w[i, j] for j in J) for i in I}

assert abs((const - sum(coef[i] * ybar[i] for i in I)) - sub.ObjVal) < 1e-6
mestre.addConstr(eta >= const - quicksum(coef[i] * y[i] for i in I))
```

O `assert` é a linha mais importante do bloco.

---

## Parte 5 — Teoria: o caso estocástico de dois estágios (L-shaped)

Aqui Benders é mais natural ainda. O problema:

$$\min_{y}\; c^Ty + \sum_s p_s\, Q_s(y), \qquad Q_s(y) = \min_{x_s \ge 0}\{ f^Tx_s : W x_s \ge h_s - T_s y \}$$

Decide-se $y$ **antes** de saber qual cenário $s$ ocorre; $x_s$ é a decisão de recurso, tomada depois.

Ao fixar $\bar y$, o subproblema **se separa completamente por cenário** — $N$ LPs pequenos e independentes, paralelizáveis. Essa é a vantagem estrutural que faz Benders ser o método padrão aqui (variante conhecida como **método L-shaped**, de Van Slyke & Wets, 1969).

O corte agregado usa a média dos duais:

$$\eta \;\ge\; \sum_s p_s\, (h_s - T_s y)^T \bar u_s$$

### Exemplo: planejamento de capacidade

- Decide-se capacidade $x \ge 0$ a custo 2/unidade, antes de conhecer a demanda.
- Demanda: 10 ou 20, cada uma com probabilidade 0.5.
- Demanda não atendida custa 5/unidade de penalidade.

Segundo estágio: $Q(x,d) = \min\{5z : z \ge d - x,\; z \ge 0\}$, com dual $\max\{(d-x)\pi : 0 \le \pi \le 5\}$.

Logo $\pi^* = 5$ se $d > x$ (capacidade escassa, cada unidade extra vale 5) e $\pi^* = 0$ caso contrário (capacidade sobrando, unidade extra vale nada). O dual é literalmente o **preço-sombra da capacidade**.

| It | $x$ | LB | $\pi$ por cenário | $Q$ esperado | UB | Corte |
|---|---|---|---|---|---|---|
| 1 | 0.00 | 0.00 | (5, 5) | 75.00 | 75.00 | $\eta \ge 75 - 5x$ |
| 2 | 15.00 | 30.00 | (0, 5) | 12.50 | 42.50 | $\eta \ge 50 - 2.5x$ |
| 3 | 20.00 | **40.00** | (0, 0) | 0.00 | **40.00** | parar |

**Capacidade ótima: 20, custo esperado 40.**

Acompanhe a lógica: começa em $x=0$ (ambos os cenários com falta, preço-sombra 5 nos dois), o corte é agressivo e empurra a capacidade para cima. Em $x=15$ o cenário de demanda baixa já está coberto e seu preço-sombra cai a zero — o corte fica menos inclinado, refletindo que agora só metade dos cenários pressiona por mais capacidade. Em $x=20$ ninguém tem falta e o processo converge.

Cada corte é uma resposta à pergunta "quanto vale, em média, uma unidade a mais de capacidade **nesta região**?".

---

## Parte 6 — Teoria: quando Benders **não** se aplica (e as saídas)

| Situação | Problema | Saída |
|---|---|---|
| Subproblema tem variáveis inteiras | Sem dualidade forte; os cortes podem cortar o ótimo | **Logic-based Benders** (Hooker & Ottosson): usa "dual de inferência" em vez de dual LP |
| Subproblema não-linear mas convexo | Dual LP não se aplica diretamente | **Generalized Benders** (Geoffrion, 1972) |
| Subproblema não-convexo | Cortes inválidos — **erro silencioso**, o mais perigoso | Reformular, ou usar decomposição não-convexa especializada |
| $y$ aparece nas restrições do dual | Cortes não são válidos globalmente | Reformular movendo o acoplamento para o RHS |
| Fixar $y$ não simplifica nada | Sem ganho computacional | Não use Benders |

Sobre a terceira linha: essa é a armadilha clássica. Se o subproblema for não-convexo, o algoritmo **converge normalmente** e devolve uma resposta errada, sem sinal de alerta. Sempre verifique a convexidade antes de confiar no resultado.

---

## Parte 7 — Prática: o que dói na implementação real

O algoritmo de livro raramente é competitivo direto. Os problemas típicos:

**Tailing off.** LB sobe rápido no início e depois arrasta por centenas de iterações. Sintoma de que os cortes estão redundantes.

**Cortes fracos por degenerescência.** Quando o dual tem múltiplos ótimos, alguns geram cortes muito mais informativos que outros (ver Parte 4.5, "validade vem da viabilidade dual"). A técnica de **cortes Pareto-ótimos** (Magnanti & Wong, 1981) escolhe, entre os duais ótimos, o que domina os demais — resolvendo um segundo LP com um ponto-núcleo de referência.

**Reconstruir a árvore B&B toda iteração.** No esquema clássico, o mestre inteiro é resolvido do zero a cada rodada. A solução moderna é **branch-and-Benders-cut**: uma única árvore de branch-and-bound, com cortes gerados via *lazy constraint callback* nos nós. Todo solver sério (CPLEX, Gurobi, SCIP) suporta isso, e costuma ser a diferença entre horas e minutos.

**Início ruim.** Nas primeiras iterações o mestre é essencialmente cego. Vale adicionar cortes iniciais de uma solução heurística e restrições válidas conhecidas (no nosso exemplo, $y_1 + y_2 \ge 1$ poderia ter sido incluída de saída).

**Outras alavancas úteis:** *multi-cut* (um corte por cenário em vez de um agregado — mais informação, mestre maior); estabilização por região de confiança ou *level method*; normalização de cortes de factibilidade.

---

## Parte 8 — Código completo

Implementação didática do exemplo de localização. Sem dependências externas: o mestre é resolvido por enumeração (só 2 binárias) e o subproblema em forma fechada. Para instâncias reais, troque o mestre por um MILP em Gurobi/CPLEX/PuLP e o subproblema por um LP.

```python
from itertools import product

F = [4.0, 3.0]                        # custo fixo de abrir cada depósito
C = [[1.0, 3.0, 6.0],                 # custo de atender cliente j a partir de i
     [5.0, 2.0, 2.0]]
nI, nJ = len(F), len(C[0])
BIG = float("inf")


def subproblem(y):
    """LP de atendimento com y fixo. None se infactível."""
    abertos = [i for i in range(nI) if y[i] > 0.5]
    if not abertos:
        return None                                    # → corte de factibilidade
    u = [min(C[i][j] for i in abertos) for j in range(nJ)]
    w = [[max(0.0, u[j] - C[i][j]) for j in range(nJ)] for i in range(nI)]
    return sum(u), u, w


def solve_master(opt_cuts, feas_cuts):
    """Mestre por enumeração. Devolve (y*, eta*, valor) = limite inferior."""
    best = (None, None, BIG)
    for y in product([0, 1], repeat=nI):
        if any(sum(a[i] * y[i] for i in range(nI)) < b - 1e-9
               for a, b in feas_cuts):
            continue
        eta = 0.0
        for const, coef in opt_cuts:                   # eta >= const - coef·y
            eta = max(eta, const - sum(coef[i] * y[i] for i in range(nI)))
        val = sum(F[i] * y[i] for i in range(nI)) + eta
        if val < best[2] - 1e-9:
            best = (y, eta, val)
    return best


def benders(max_iter=20, tol=1e-6):
    opt_cuts, feas_cuts = [], []
    UB, best_y = BIG, None
    for k in range(1, max_iter + 1):
        y, eta, LB = solve_master(opt_cuts, feas_cuts)
        res = subproblem(y)

        if res is None:                                # infactível
            feas_cuts.append(([1.0] * nI, 1.0))        # y1 + y2 >= 1
            print(f"it {k}: y={y} LB={LB:7.2f} UB={UB:7.2f} -> corte FACTIBILIDADE")
            continue

        qval, u, w = res
        total = sum(F[i] * y[i] for i in range(nI)) + qval
        if total < UB:                                 # solução factível → UB
            UB, best_y = total, y

        coef = [sum(w[i][j] for j in range(nJ)) for i in range(nI)]
        print(f"it {k}: y={y} LB={LB:7.2f} UB={UB:7.2f} Q={qval:.2f} "
              f"-> eta >= {sum(u):.2f} - {coef}·y")

        if UB - LB <= tol:
            print(f"\nÓTIMO: y*={best_y}  custo={UB:.2f}")
            return best_y, UB

        opt_cuts.append((sum(u), coef))
    return best_y, UB


benders()
```

Saída:

```
it 1: y=(0, 0) LB=   0.00 UB=    inf -> corte FACTIBILIDADE
it 2: y=(0, 1) LB=   3.00 UB=  12.00 Q=9.00  -> eta >= 9.00 - [4.0, 0.0]·y
it 3: y=(1, 0) LB=   9.00 UB=  12.00 Q=10.00 -> eta >= 10.00 - [0.0, 5.0]·y
it 4: y=(0, 1) LB=  12.00 UB=  12.00 Q=9.00

ÓTIMO: y*=(0, 1)  custo=12.00
```

---

## Checklist de aplicabilidade

Antes de investir tempo em Benders, responda:

1. Existe um subconjunto de variáveis cuja fixação simplifica drasticamente o problema? Se não → não use.
2. O subproblema resultante é convexo (LP ou NLP convexo)? Se não → precisa de Logic-based ou Generalized Benders.
3. As variáveis complicadoras aparecem no subproblema apenas no lado direito? Se não → reformule.
4. O subproblema se decompõe em blocos independentes? Se sim → ganho grande, especialmente com paralelismo.
5. Há muito mais variáveis fáceis do que complicadoras? Se sim → sinal forte a favor.

Se as cinco derem verde, Benders provavelmente vale o esforço.

---

## Referências

- Benders, J. F. (1962). *Partitioning procedures for solving mixed-variables programming problems.* Numerische Mathematik.
- Van Slyke, R. & Wets, R. (1969). *L-shaped linear programs with applications to optimal control and stochastic programming.* SIAM J. Applied Math.
- Geoffrion, A. M. (1972). *Generalized Benders decomposition.* JOTA.
- Magnanti, T. & Wong, R. (1981). *Accelerating Benders decomposition.* Operations Research.
- Rahmaniani, R. et al. (2017). *The Benders decomposition algorithm: a literature review.* EJOR. — survey moderno, bom ponto de partida para técnicas de aceleração.
- Birge, J. & Louveaux, F. *Introduction to Stochastic Programming.* — referência para a parte estocástica.
