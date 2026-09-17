# Acervo — contexto do projeto

Documento para retomar o desenvolvimento. Descreve o que a aplicação faz, como está
construída, por que cada decisão foi tomada e o que ainda falta.

---

## 1. O que é

Gerenciador e leitor de biblioteca de artigos científicos em PDF, feito para uso pessoal
de um pesquisador com algo entre 300 e 1000 artigos. Roda inteiramente no navegador, em
**um único arquivo `index.html`** sem build, sem backend e sem dependência de servidor.

**Autor:** Alexandre Checoli Choueiri, professor de Engenharia de Produção da UFPR
(alexandrechecoli@ufpr.br).

**Hospedagem:** GitHub Pages, junto dos outros aplicativos dele
(`alexandrechecoli.github.io`). A origem `https://` é necessária para que o navegador
mantenha as permissões de pasta e o contexto seguro (`crypto.subtle`, WebGPU).

**Aplicativos irmãos, cujas convenções visuais este projeto segue:**
- `1-meta/App/MetaStat.html` — de onde vieram a paleta de temas e o formato do guia de ajuda
- `4-prog-linear/Apps/lp-solver.html` — de onde veio o formato do painel "Sobre"
- `apps/album-viewer/index.html` — de onde veio o padrão de gravar os dados dentro da
  própria pasta escolhida

---

## 2. Decisões de arquitetura (e o porquê)

| Decisão | Motivo |
|---|---|
| Arquivo único, sem build | O autor edita e publica direto no GitHub Pages. Nenhuma etapa de compilação. |
| Só Chrome/Edge | A File System Access API não existe no Firefox nem no Safari. Foi uma escolha consciente: o modo "arrastar arquivos para o IndexedDB" foi descartado por dobrar a complexidade. |
| Dados dentro da pasta do usuário | A pasta fica autocontida e portátil, como um cofre do Obsidian. O IndexedDB guarda **apenas** o handle da pasta, para reabrir com um clique. |
| Índice leve, resto em arquivos separados | `index.json` é reescrito a cada nota digitada; se ele carregasse o texto completo dos PDFs teria dezenas de MB e travaria. |
| DOI antes de heurística | Extrair título/resumo pelo layout do PDF é frágil. O DOI impresso na primeira página leva a metadados de qualidade de catálogo via OpenAlex/Crossref. |
| Metadados corrigidos à mão são imutáveis | Gravados em `rec.manual`; nenhuma reindexação ou "Rebuscar" os sobrescreve. |
| Coordenadas de grifo em fração da página | Sobrevivem a zoom e redimensionamento. Se fossem pixels, quebrariam. |
| Camada de grifos **abaixo** da camada de texto | Para não roubar o arrasto do mouse. O clique num grifo é resolvido por teste geométrico manual em `#rd-pages`. |
| Fontes do sistema, sem Google Fonts | Carregamento instantâneo, funciona offline, sem piscar de texto sem estilo. |

---

## 3. Estrutura de arquivos criada na pasta do usuário

```
PastaDoUsuario/
  Controle/Robusto/artigo.pdf        ← PDFs, nunca modificados
  _biblioteca/
    index.json                       ← índice principal
    vetores.json                     ← embeddings da busca semântica
    capas/<hash>.jpg                 ← miniatura da página 1
    docs/<hash>.json                 ← texto completo + grifos + notas
```

### `index.json`
```jsonc
{
  "format": "acervo/1",
  "saved": "2026-09-15T...",
  "prefs": { "mail": "...", "fulltext": true, "look": {...} },
  "tagcolors": { "benchmark": "#3b8fd4" },
  "docs": {
    "<hash>": {
      "hash", "path", "dir", "file", "size", "mtime", "pages",
      "title", "year", "authors": [], "journal", "doi", "arxiv", "abstract",
      "source": "openalex" | "crossref" | "pdf" | "openalex/pdf",
      "manual": { "title": "...", "year": 2021 },   // campos travados pelo usuário
      "tags": [], "note": "", "fav": false,
      "hasText": true, "annots": 12, "hlText": "...", // resumo dos grifos, p/ busca
      "missing": false, "error": "...", "cover": true
    }
  }
}
```

### `docs/<hash>.json`
```jsonc
{ "hash", "text": "texto completo", "annots": [
  { "id", "page": 3, "rects": [[x,y,w,h], ...],  // frações 0–1 da página
    "text": "trecho grifado", "comment": "", "color": "a|b|c|d|n", "at": 123 }
]}
```
`color: "n"` = nota de página (sem `rects`).

### `vetores.json`
```jsonc
{ "model": "Xenova/multilingual-e5-small", "dim": 384,
  "vecs": { "<hash>": "<Float32Array em base64>" } }
```
O nome do modelo é gravado de propósito: vetores de modelos diferentes são
incomparáveis, então o código se recusa a misturar.

### Identidade do arquivo (`hash`)
SHA-256 do **primeiro 1 MB** + tamanho em base36. Não é o hash do arquivo inteiro por
custo. Na varredura, arquivos com mesmo caminho + tamanho + `mtime` pulam o cálculo —
é o que faz "Procurar novos" levar segundos em vez de minutos.

---

## 4. Mapa do código

O `<script>` está dividido em 15 seções numeradas em comentários de bloco:

| # | Seção | Conteúdo principal |
|---|---|---|
| 1 | Handle da pasta | `idb` (IndexedDB mínimo, só guarda o handle) |
| 2 | Sistema de arquivos | `walk` (recursivo), `fileByPath`, `writeFile`, `readJSON`, `hashFile`, `saveIndex`/`loadIndex` |
| 3 | Leitura do PDF | `linesFrom` (monta linhas respeitando 2 colunas), `readPdf`, `makeCover`, `findDOI`, `guessTitle`/`guessAbstract`/`guessYear`, `lookupOpenAlex`/`lookupCrossref`, `resolveMeta` |
| 4 | Indexação | `P` (barra de progresso), `toast`, `scan`, `indexOne` |
| 5 | Filtros | `norm`, `haystack`, `visible` — **função central**, decide o que aparece |
| 6 | Interface | `buildRail` (barra lateral), `render` (grade/lista), `coverObserver` |
| 7 | Gaveta de detalhe | `openDoc`, `drawTags` |
| 8 | Marcadores e seleção | `tagColor`, `tagIcon`, `togglePick`, `openTagMenu`, `openTagEdit` |
| 9 | Leitor | `openReader`, `layout`, `renderPage`/`freePage`, `drawAll`, grifos, `listAnnots`, `flushAnnots` |
| 10 | Aparência | `THEMES`, `FONTS`, `applyLook` |
| 11 | Texto completo | `FT`, `ensureFullText`, `ftSearch` |
| 12 | Localizar no artigo | `FD`, `buildPageText`, `findRun`, `findGo`, `paintFind` |
| 13 | BibTeX | `bibLocal`, `bibCrossref`, `bibKey`, `openBib` |
| 13b | Renomear arquivos | `renName` (monta `ANO - Título - Sobrenome e Sobrenome.pdf`), `renPreview`, `renApply` (usa `FileSystemFileHandle.move`) |
| 14 | Busca semântica | `SEM`, `semPipe` (transformers.js), `semIndex`, `semSearch` |
| 15 | Eventos | ligações de UI, teclado, abertura |

### Estado global
`S` (aplicação), `R` (leitor), `FT` (texto completo), `FD` (localizar),
`SEM` (semântica), `TM` (menu de marcadores), `look` (aparência).

`S.filter` controla tudo o que `visible()` decide:
```js
{ q, folder, tags:[], tagMode:'and'|'or', untagged, year, fav, nometa, deep, sem }
```

---

## 5. Bibliotecas e serviços externos

| O quê | Como entra | Observação |
|---|---|---|
| **PDF.js 3.11.174** | `<script>` do cdnjs | A versão importa: a camada de texto do 3.x exige `--scale-factor` no container, senão os spans ficam desalinhados e a seleção quebra. |
| **transformers.js v4** | `await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4/+esm')` dinâmico | Só carrega quando o usuário usa a busca semântica. Import dinâmico funciona dentro de `<script>` clássico. |
| **OpenAlex** | `GET api.openalex.org/works/doi:<doi>` | Fonte primária. Resumo vem como índice invertido (`abstract_inverted_index`), remontado por `invertedToText`. |
| **Crossref** | `GET api.crossref.org/works/<doi>` e `.../transform/application/x-bibtex` | Segunda fonte de resumo (JATS, limpo por `stripJats`) e origem das entradas BibTeX canônicas. |
| **Modelo de embeddings** | `Xenova/multilingual-e5-small`, dtype `q8` (118 MB) | Prefixos `passage:` e `query:` são obrigatórios para o e5. Há uma lista de modelos alternativos em `SEM.candidates`. |

---

## 6. Armadilhas já encontradas (não repetir)

1. **`closest('[data-theme]')` subia até o `<html>`.** O tema é marcado em
   `document.documentElement`, então `closest` sempre encontrava algo. Delegação de
   clique em painéis precisa usar as **classes dos botões**, não os atributos de dado.
2. **Tamanhos de fonte fixos em px.** O controle de tamanho não fazia nada até os 47
   valores serem convertidos para `calc(var(--base)*K)`.
3. **`onnx-community/multilingual-e5-small` não existe.** O Hugging Face responde **401**
   (e não 404) para repositórios inexistentes. O correto é `Xenova/...`.
4. **`window.open` depois de `await` é bloqueado** como pop-up. Abrir a aba de forma
   síncrona no clique e só depois atribuir `location.href`.
5. **Reindexar apagava os grifos.** `indexOne` agora lê `docs/<hash>.json` antes de
   reescrevê-lo e preserva `annots`.
6. **Cabeçalho transbordando.** Sem `flex-wrap`, botões novos empurravam os antigos para
   fora da tela sem aviso. Hoje há `white-space:nowrap` e media queries que recolhem
   rótulos aos 1180 px e o nome da pasta aos 820 px.
7. **Renomear PDF exige atualizar `path`, `file` e `mtime` no índice.** O `hash` não muda,
   então grifos e capas sobrevivem; mas sem atualizar o caminho a próxima varredura marcaria
   o artigo como `missing` e o leitor não o abriria. Arquivos sem ano/título/autores ficam de
   fora e são listados com o motivo. Com 3+ autores o nome termina em `et al.pdf` (não `et al..pdf`).
8. **Memória do leitor.** Renderizar todas as páginas de um artigo de 40 páginas
   consumia ~300 MB. `freePage` descarta canvas e camada de texto fora da viewport.

---

## 7. Funcionalidades implementadas

- Varredura recursiva da pasta, retomável, com deduplicação por hash
- Metadados via DOI → OpenAlex → Crossref, com heurística de fallback e correção manual travada
- Capas renderizadas, carregadas sob demanda por `IntersectionObserver`
- Filtros combináveis: pasta (árvore), marcador (e/ou), ano, favorito, sem resumo, sem marcador
- Marcadores coloridos com ícone de etiqueta, renomear/recolorir/excluir em massa
- Seleção múltipla com Shift+clique, ações em lote (marcadores, favoritos, BibTeX)
- Três modos de busca: metadados (instantânea), texto completo (cache em memória), semântica (embeddings)
- Leitor com rolagem contínua, zoom, grifos em 4 cores, comentários, notas de página,
  localizar interno (Ctrl+F), exportação em Markdown
- Exportação BibTeX local ou via Crossref, com escopo selecionável
- Renomear PDFs em lote para `ANO - Título - Sobrenome e Sobrenome.pdf`, com pré-visualização,
  escopo igual ao do BibTeX (selecionados / filtro / todos) e atualização do índice sem perder grifos
- 6 temas, 4 conjuntos de fonte, 4 tamanhos, tudo proporcional
- Guia de ajuda com 12 seções e painel "Sobre"

---

## 8. O que ainda falta (em ordem de valor estimado)

1. **Coletânea de anotações por marcador** — exportar os grifos de todos os artigos de um
   marcador num documento único, agrupado por artigo. É o que transforma a ferramenta num
   apoio real de revisão bibliográfica. Já discutido, nunca implementado.
2. **Endurecer a base** — gravação atômica do `index.json`, backup rotativo dentro de
   `_biblioteca/`, e **detecção de duplicatas por DOI** (o hash não pega o mesmo artigo
   baixado de fontes diferentes, o que é comum num acervo grande).
3. **Grifo por retângulo arrastado** — para PDFs escaneados sem camada de texto.
4. **Chat com RAG** — recuperar trechos pelos embeddings e gerar resposta com citação
   clicável que abre o artigo na página certa. Exigiria Ollama local (modelos de geração
   grandes não rodam bem no navegador). Decisão pendente: ver seção 9.
5. **Ordenar marcadores por uso** ou permitir fixar os mais usados — relevante se o
   número de marcadores passar de uns 30.
6. **Navegação por teclado no leitor** — j/k entre grifos, setas entre artigos.

---

## 9. Discussão em aberto: Ollama vs. navegador

Ficou decidido que **embeddings rodam no navegador** (transformers.js), porque não exigem
instalação e a qualidade é suficiente. Para um eventual **chat com geração de texto**, a
conclusão foi que o Ollama seria necessário, com estas ressalvas:

- O Ollama é gratuito, código aberto, e expõe um servidor HTTP local em
  `http://localhost:11434`. Não é biblioteca JS: conversa-se com ele por `fetch`.
- Exige `OLLAMA_ORIGINS` configurado e reinício do serviço.
- O Chrome 142 (out/2025) substituiu o Private Network Access pelo **Local Network
  Access**: uma página `https://` pedindo algo a `localhost` dispara **prompt de
  permissão**, não bloqueio. Funciona, mas servir a app a partir de `localhost` evita o
  prompt.
- Consequência: a parte de chat não viajaria junto com a app — cada usuário precisaria
  instalar o Ollama. Por isso ficou para depois.

---

## 10. Como testar alterações

Não há suíte de testes. O ciclo usado foi:

```bash
# extrair o <script> e checar sintaxe antes de publicar
python3 -c "import re;print(re.findall(r'<script>(.*?)</script>',open('index.html').read(),re.S)[-1])" > check.js
node --check check.js
```

Também vale conferir que todo `$('#id')` referenciado existe no HTML — vários bugs
vieram de id renomeado pela metade.

Teste manual mínimo depois de mexer: abrir uma pasta pequena, indexar, abrir um artigo,
grifar, fechar e reabrir a pasta para confirmar que o grifo persistiu.
