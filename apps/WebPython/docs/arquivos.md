# Leitura e escrita em arquivos

A primeira coisa que precisamos fazer é conseguir **ler dados** de um arquivo externo, pois será a partir desses dados que passaremos os *inputs* dos nossos problemas de otimização.

> Neste editor, um arquivo é uma **aba de dados**, e o código o abre só pelo nome: `open("input.txt")`. Cada arquivo usado nesta página tem um botão que cria a aba já preenchida. No Python instalado no seu computador, no lugar do nome vai o caminho completo do arquivo, com um `r` antes das aspas: `r"C:\Users\...\input.txt"`.

## Introdução

Vamos aprender um método que lê os dados de um arquivo linha a linha. Considere um arquivo de texto com 4 linhas, da seguinte forma:

```text arquivo=input.txt
Linha 1
10
Linha 3
2 4
```

Podemos usar o seguinte código para ler a primeira linha:

```python abrir
# Nome do arquivo (o mesmo nome da aba de dados)
caminho_arquivo = "input.txt"

# Abre o arquivo
with open(caminho_arquivo, "r", encoding="utf-8") as arquivo:
    # Atribui a primeira linha à variável 'a'
    a = arquivo.readline()
    # Imprime a variável
    print(a)
```

```text
Linha 1

```

A cada vez que executamos o comando `arquivo.readline()`, uma nova linha é lida. Como o arquivo possui 4 linhas, no exemplo abaixo executamos e imprimimos 4 vezes:

```python
caminho_arquivo = "input.txt"
with open(caminho_arquivo, "r", encoding="utf-8") as arquivo:
    a = arquivo.readline()
    print(a)
    a = arquivo.readline()
    print(a)
    a = arquivo.readline()
    print(a)
    a = arquivo.readline()
    print(a)
```

```text
Linha 1

10

Linha 3

2 4
```

Ou ainda, podemos imprimir usando um laço `for`:

```python abrir
caminho_arquivo = "input.txt"
with open(caminho_arquivo, "r", encoding="utf-8") as arquivo:
    for i in range(4):
        a = arquivo.readline()
        print(a)
```

A saída é a mesma.

> As linhas em branco na saída aparecem porque `readline()` devolve a linha junto com a quebra de linha (`\n`) que existe no fim dela, e o `print` acrescenta outra. Para tirar a quebra, use `a = arquivo.readline().strip()`.

## Usando indicadores no arquivo

Muitas vezes, para criar programas que são genéricos, não sabemos com antecedência o número de linhas de um arquivo e, portanto, precisamos indicar isso no **próprio arquivo**. Considere a leitura de vários números que estão em um arquivo, em que o número de elementos a serem lidos é indicado no próprio arquivo, como seu primeiro elemento. Nesse caso, precisamos criar uma lógica que lê o primeiro elemento e **depois** cria o laço para ler o restante.

Considere um arquivo em que precisamos ler os números 10, 20, 30, 40 e 50. Podemos usar o seguinte arquivo (note que são 5 números, portanto o primeiro elemento do arquivo é 5):

```text arquivo=input2.txt
5
10
20
30
40
50
```

```python abrir
caminho_arquivo = "input2.txt"
with open(caminho_arquivo, "r", encoding="utf-8") as arquivo:
    n = arquivo.readline()  # lê o primeiro elemento (como string)
    n = int(n)              # transforma o elemento em numérico (inteiro)
    for i in range(n):
        a = arquivo.readline()
        print(a)
```

```text
10

20

30

40

50
```

Observe que foi necessário transformar o dado em inteiro para usar na função `range()`. Isso ocorre pois, sempre que lemos um dado de um arquivo externo, ele é armazenado como uma `string`.

## Lendo múltiplos elementos em uma linha

Até agora fizemos a leitura linha a linha, sendo que cada elemento ocupava uma linha. Mas e se existirem vários elementos em uma mesma linha? Considere o seguinte arquivo, em que devemos ler as palavras "Esta é uma frase", e todas estão na mesma linha:

```text arquivo=input3.txt
Esta é uma frase
```

```python
caminho_arquivo = "input3.txt"
with open(caminho_arquivo, "r", encoding="utf-8") as arquivo:
    frase = arquivo.readline()
    print(frase)
```

```text
Esta é uma frase
```

Mas que tipo de estrutura de dados tem a variável `frase`, e como poderíamos acessar os elementos de forma individual? A função `type` mostra o tipo de dados de uma estrutura:

```python
caminho_arquivo = "input3.txt"
with open(caminho_arquivo, "r", encoding="utf-8") as arquivo:
    frase = arquivo.readline()
    print(type(frase))
```

```text
<class 'str'>
```

Como anteriormente, toda a frase foi lida em uma `string`. Podemos acessar os elementos individuais usando a função `split()` da própria string. A função retorna uma `list`, em que cada elemento é uma substring, e é possível definir qual o separador usado (espaço, ponto e vírgula etc.).

O código abaixo mostra a separação da primeira linha na lista `l_frase`, e em seguida todos os elementos são impressos usando um laço `for`:

```python abrir
caminho_arquivo = "input3.txt"
with open(caminho_arquivo, "r", encoding="utf-8") as arquivo:
    frase = arquivo.readline()
    l_frase = frase.split(" ")  # Usando split com separador " " (espaço)
    # Imprimindo os elementos, um a um
    for e in l_frase:
        print(e)
```

```text
Esta
é
uma
frase
```

O mesmo vale para números. A última linha do arquivo `input.txt` é `2 4`; depois do `split`, cada pedaço ainda é uma `string` e precisa ser convertido com `int()` ou `float()` antes de entrar em uma conta.

OBS: Para saber mais sobre listas, veja o [material](https://alexandrechecoli.github.io/2-mindados/AulasNotebook/Aula%203%20-%20Conceitos%20inicias%20Python%20II%20-%20ED%20e%20Fun%C3%A7%C3%B5es.html), na seção 3.2.2 - Listas.

## Escrevendo em arquivos

Além de ler dados de arquivos de texto, também precisamos entender como escrever. Quando resolvemos um modelo de otimização, podemos usar os arquivos de texto para exportar as soluções. O código abaixo abre um novo arquivo e escreve uma frase nele:

```python abrir
caminho_arquivo = "output.txt"
with open(caminho_arquivo, "w", encoding="utf-8") as arquivo:
    arquivo.write("Frase escrita no arquivo, direto do python")
```

> Neste editor, o arquivo gravado aparece como uma nova aba de dados (`output.txt`) ao fim da execução, e a saída mostra a linha "Arquivo gravado: output.txt". Para levar o arquivo ao seu computador, abra a aba e use **Salvar**. Só viram abas os arquivos com nome terminado em `.txt`, `.csv`, `.tsv`, `.json` ou `.dat`.

Para pular linhas, escrevemos a string `\n`:

```python abrir
caminho_arquivo = "output2.txt"
with open(caminho_arquivo, "w", encoding="utf-8") as arquivo:
    arquivo.write("Frase\n escrita\n em\n várias\n linhas\n")
```

O modo `"w"` apaga o que havia no arquivo e escreve de novo. Para acrescentar ao fim de um arquivo que já existe, use o modo `"a"`.

## Veja também

- [Ler dados de arquivos](dados.md): tabelas em CSV, com o módulo `csv` ou com o pandas.
