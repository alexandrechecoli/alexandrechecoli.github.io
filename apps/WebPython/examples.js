// Exemplos clássicos de Pesquisa Operacional exibidos no menu "Exemplos…".
// Um exemplo pode ter "files": abas de dados criadas junto com a aba de código.
// "id" é como as páginas da ajuda se referem ao exemplo (link "#exemplo-<id>").

export const EXAMPLES = [
  {
    id: "mix",
    name: "Mix de produção (PL)",
    code: `# Mix de produção
# Uma marcenaria fabrica mesas e cadeiras.
#   Lucro: R$ 40 por mesa, R$ 30 por cadeira
#   Marcenaria: 2 h por mesa, 1 h por cadeira  (100 h disponíveis)
#   Acabamento: 1 h por mesa, 1 h por cadeira  ( 80 h disponíveis)
#   Demanda máxima de mesas: 40

import highspy

h = highspy.Highs()

mesas = h.addVariable(lb=0, name="mesas")
cadeiras = h.addVariable(lb=0, name="cadeiras")

h.addConstr(2 * mesas + cadeiras <= 100, name="marcenaria")
h.addConstr(mesas + cadeiras <= 80, name="acabamento")
h.addConstr(mesas <= 40, name="demanda")

h.maximize(40 * mesas + 30 * cadeiras)

print()
print("Status:", h.modelStatusToString(h.getModelStatus()))
print("Mesas:   ", h.val(mesas))
print("Cadeiras:", h.val(cadeiras))
print("Lucro:   ", h.getInfo().objective_function_value)
`,
  },
  {
    id: "transporte",
    name: "Problema de transporte (PL)",
    code: `# Problema de transporte
# Enviar produtos de 3 fábricas para 4 centros de distribuição
# ao menor custo, respeitando oferta e demanda.

import highspy

fabricas = ["Curitiba", "Joinville", "Londrina"]
centros = ["SP", "RJ", "BH", "POA"]

oferta = {"Curitiba": 350, "Joinville": 250, "Londrina": 300}
demanda = {"SP": 300, "RJ": 200, "BH": 150, "POA": 250}

custo = {
    "Curitiba":  {"SP": 8,  "RJ": 14, "BH": 16, "POA": 10},
    "Joinville": {"SP": 10, "RJ": 16, "BH": 18, "POA": 7},
    "Londrina":  {"SP": 7,  "RJ": 13, "BH": 12, "POA": 15},
}

h = highspy.Highs()
h.setOptionValue("output_flag", False)  # oculta o log do solver

x = {(i, j): h.addVariable(lb=0, name=f"x_{i}_{j}")
     for i in fabricas for j in centros}

for i in fabricas:
    h.addConstr(sum(x[i, j] for j in centros) <= oferta[i], name=f"oferta_{i}")

for j in centros:
    h.addConstr(sum(x[i, j] for i in fabricas) >= demanda[j], name=f"demanda_{j}")

h.minimize(sum(custo[i][j] * x[i, j] for i in fabricas for j in centros))

print("Status:", h.modelStatusToString(h.getModelStatus()))
print("Custo total:", h.getInfo().objective_function_value)
print()
for (i, j), var in x.items():
    quantidade = h.val(var)
    if quantidade > 1e-6:
        print(f"{i:>10} -> {j:<4} {quantidade:6.0f}")
`,
  },
  {
    id: "mochila",
    name: "Mochila 0-1 (PLI)",
    code: `# Problema da mochila 0-1
# Escolher os itens de maior valor total sem ultrapassar a capacidade.

import highspy

itens = ["barraca", "fogareiro", "lanterna", "câmera", "livro", "casaco", "comida"]
valor = [60, 35, 20, 50, 10, 40, 55]
peso = [9, 4, 1, 3, 2, 5, 6]
capacidade = 15

h = highspy.Highs()

x = [h.addBinary(name=item) for item in itens]

h.addConstr(sum(p * xi for p, xi in zip(peso, x)) <= capacidade, name="capacidade")
h.maximize(sum(v * xi for v, xi in zip(valor, x)))

print()
print("Status:", h.modelStatusToString(h.getModelStatus()))
print("Valor total:", h.getInfo().objective_function_value)
print("Itens escolhidos:")
for item, p, v, xi in zip(itens, peso, valor, x):
    if h.val(xi) > 0.5:
        print(f"  {item:<10} peso {p:>2}  valor {v:>2}")
`,
  },
  {
    id: "transporte-csv",
    name: "Transporte com arquivos de dados (CSV)",
    code: `# Problema de transporte com os dados em arquivos
# Os dados estão nas abas custos.csv, oferta.csv e demanda.csv.
# Para resolver outra instância, altere as abas de dados e execute de novo:
# o modelo não muda.
# (A primeira execução demora alguns segundos, porque o pandas é baixado.)

import highspy
import pandas as pd

# to_dict() converte os valores para números comuns do Python.
custo = pd.read_csv("custos.csv", index_col=0).to_dict("index")
oferta = pd.read_csv("oferta.csv", index_col=0)["oferta"].to_dict()
demanda = pd.read_csv("demanda.csv", index_col=0)["demanda"].to_dict()

fabricas = list(oferta)
centros = list(demanda)

h = highspy.Highs()
h.setOptionValue("output_flag", False)  # oculta o log do solver

x = {(i, j): h.addVariable(lb=0, name=f"x_{i}_{j}")
     for i in fabricas for j in centros}

for i in fabricas:
    h.addConstr(sum(x[i, j] for j in centros) <= oferta[i], name=f"oferta_{i}")

for j in centros:
    h.addConstr(sum(x[i, j] for i in fabricas) >= demanda[j], name=f"demanda_{j}")

h.minimize(sum(custo[i][j] * x[i, j] for i in fabricas for j in centros))

print("Status:", h.modelStatusToString(h.getModelStatus()))
print("Custo total:", h.getInfo().objective_function_value)
print()
for (i, j), var in x.items():
    quantidade = h.val(var)
    if quantidade > 1e-6:
        print(f"{i:>10} -> {j:<4} {quantidade:6.0f}")
`,
    files: [
      {
        name: "custos.csv",
        content: `fabrica,SP,RJ,BH,POA
Curitiba,8,14,16,10
Joinville,10,16,18,7
Londrina,7,13,12,15
`,
      },
      {
        name: "oferta.csv",
        content: `fabrica,oferta
Curitiba,350
Joinville,250
Londrina,300
`,
      },
      {
        name: "demanda.csv",
        content: `centro,demanda
SP,300
RJ,200
BH,150
POA,250
`,
      },
    ],
  },
];
