# Transporte com arquivos de dados (CSV)

[Abrir este exemplo no editor](#exemplo-transporte-csv)

Este é o mesmo modelo do [Problema de transporte](ex-transporte.md), com uma diferença: os dados saíram do código e foram para três abas de dados. Para resolver outra instância, basta editar as abas e executar de novo.

Ao abrir o exemplo, quatro abas são criadas: `custos.csv`, `oferta.csv`, `demanda.csv` e a aba de código.

## Os arquivos

`custos.csv` é uma tabela com as fábricas nas linhas e os centros nas colunas:

```csv
fabrica,SP,RJ,BH,POA
Curitiba,8,14,16,10
Joinville,10,16,18,7
Londrina,7,13,12,15
```

`oferta.csv` e `demanda.csv` têm duas colunas, o nome e a quantidade:

```csv
fabrica,oferta
Curitiba,350
Joinville,250
Londrina,300
```

## A leitura

```python
import pandas as pd

custo = pd.read_csv("custos.csv", index_col=0).to_dict("index")
oferta = pd.read_csv("oferta.csv", index_col=0)["oferta"].to_dict()
demanda = pd.read_csv("demanda.csv", index_col=0)["demanda"].to_dict()

fabricas = list(oferta)
centros = list(demanda)
```

- `pd.read_csv` lê o arquivo pelo nome da aba. `index_col=0` usa a primeira coluna como rótulo das linhas.
- `.to_dict("index")` transforma a tabela de custos em `{fábrica: {centro: custo}}`, o mesmo formato usado no exemplo sem arquivos.
- `["oferta"].to_dict()` pega a coluna `oferta` e devolve `{fábrica: quantidade}`.
- As listas `fabricas` e `centros` saem dos próprios dados. Acrescentar uma fábrica é acrescentar uma linha em `custos.csv` e outra em `oferta.csv`.

> O `.to_dict()` não é detalhe: ele converte os valores do pandas em números comuns do Python. Sem isso, `x[i, j] * custo` pode dar o erro `Unexpected parameters`. Veja [Ler dados de arquivos](dados.md).

Daqui em diante, o código é idêntico ao do exemplo sem arquivos, e o resultado é o mesmo: custo total de 8600.

## Sobre a primeira execução

O pandas é baixado na primeira vez em que é importado em cada sessão, o que leva alguns segundos; a barra de status mostra "Baixando pacotes Python…". As execuções seguintes são imediatas.

## Para experimentar

- Altere um custo em `custos.csv` e execute de novo (dá para executar com a aba de dados aberta: roda a última aba de código).
- Acrescente um centro: uma coluna em `custos.csv` e uma linha em `demanda.csv`. Lembre que a oferta total precisa cobrir a nova demanda.
- Escreva um nome de fábrica diferente em `oferta.csv` e veja o `KeyError` que isso causa (explicado em [Erros comuns](erros.md)).
