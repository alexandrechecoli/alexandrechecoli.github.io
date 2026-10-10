# Ler dados de arquivos

Separar os dados do modelo permite resolver outra instância do problema sem mexer no código. Neste editor, os arquivos de dados são **abas de dados**.

Esta página trata de tabelas (CSV, JSON). Para o básico de abrir um arquivo de texto, ler linha a linha e gravar resultados, veja [Leitura e escrita em arquivos](arquivos.md).

## Abas de dados

- O botão `+ dados`, na linha de abas, cria uma aba de dados e pede o nome do arquivo (ex.: `custos.csv`).
- Uma aba é de dados quando o nome termina em `.csv`, `.tsv`, `.txt`, `.json` ou `.dat`. Qualquer outro nome é uma aba de código.
- O nome da aba é o nome do arquivo: o código de qualquer aba o lê com `open("custos.csv")`.
- **Abrir**, na barra de ferramentas, carrega arquivos do computador; os que têm essas extensões viram abas de dados.
- Dá para colar uma tabela copiada do Excel direto em uma aba `.tsv` ou `.txt`: as colunas vêm separadas por tabulação.
- Executar a partir de uma aba de dados roda a última aba de código que estava ativa.
- Um arquivo que o código grava (com `open(nome, "w")`, por exemplo) também vira uma aba de dados ao fim da execução, desde que o nome tenha uma dessas extensões. Se já existe uma aba com o mesmo nome, o conteúdo dela é atualizado.

> Arquivos do Excel (`.xlsx`) não são lidos. No Excel, salve a planilha como CSV, ou copie e cole as células em uma aba de dados.

## Ler com o Python puro

O módulo `csv` já vem com o Python e não exige download. `csv.DictReader` lê cada linha como um dicionário, usando o cabeçalho como chaves.

Para o arquivo `oferta.csv`:

```csv
fabrica,oferta
Curitiba,350
Joinville,250
Londrina,300
```

o código é:

```python
import csv

with open("oferta.csv", encoding="utf-8") as arquivo:
    oferta = {linha["fabrica"]: float(linha["oferta"]) for linha in csv.DictReader(arquivo)}

print(oferta)   # {'Curitiba': 350.0, 'Joinville': 250.0, 'Londrina': 300.0}
```

Tudo o que vem de um arquivo de texto é texto: converta os números com `float()` ou `int()`.

Para um arquivo com ponto e vírgula (comum em CSV exportado pelo Excel em português), informe o separador: `csv.DictReader(arquivo, delimiter=";")`. Se os decimais vierem com vírgula, troque antes de converter: `float(texto.replace(",", "."))`.

## Ler com o pandas

O `pandas` lê uma tabela inteira em uma linha. Ele é baixado na primeira execução de cada sessão, o que leva alguns segundos.

```python
import pandas as pd

oferta = pd.read_csv("oferta.csv", index_col=0)["oferta"].to_dict()
custo = pd.read_csv("custos.csv", index_col=0).to_dict("index")

print(oferta["Curitiba"])        # 350
print(custo["Curitiba"]["SP"])   # 8
```

- `index_col=0` usa a primeira coluna como rótulo das linhas.
- `.to_dict()` em uma coluna devolve `{rótulo: valor}`.
- `.to_dict("index")` em uma tabela devolve `{linha: {coluna: valor}}`.

> Converta com `.to_dict()` antes de montar o modelo. Os valores guardados dentro do pandas são números do numpy, e `variável * número_do_numpy` dá o erro `Unexpected parameters`. O `.to_dict()` devolve números comuns do Python.

Para CSV com ponto e vírgula e vírgula decimal: `pd.read_csv("dados.csv", sep=";", decimal=",")`.

## Ler JSON

```python
import json

with open("instancia.json", encoding="utf-8") as arquivo:
    dados = json.load(arquivo)

capacidade = dados["capacidade"]
```

## Exemplo completo

O exemplo [Transporte com arquivos de dados (CSV)](ex-transporte-csv.md) usa três abas de dados e o pandas.
