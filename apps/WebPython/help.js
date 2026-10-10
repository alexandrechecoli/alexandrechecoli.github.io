/* global CodeMirror, marked */
// Aba "Ajuda": índice, páginas em Markdown (docs/<id>.md), busca e histórico de navegação.
import { DOC_PAGES, DOC_SECTIONS, HIGHSPY_WORDS } from "./docs.js?v=8";

export { HIGHSPY_WORDS };

// As páginas são buscadas com a mesma versão (?v=N) deste módulo, para não virem do cache.
const VERSION = new URL(import.meta.url).search;

const content = document.getElementById("help-content");
const searchInput = document.getElementById("help-search");
const backButton = document.getElementById("help-back");
const forwardButton = document.getElementById("help-forward");

const pageById = new Map(DOC_PAGES.map((page) => [page.id, page]));

// Termo (em minúsculas) → página que o documenta; usado pelo F1.
const termToPage = new Map();
for (const page of DOC_PAGES) {
  for (const term of page.keywords) {
    if (!termToPage.has(term.toLowerCase())) termToPage.set(term.toLowerCase(), page.id);
  }
}

// Funções da página principal, recebidas em initHelp.
let actions = { openInEditor() {}, openDataFile() {}, openExample() {} };

// Histórico: cada entrada é { id, anchor }; id "" é o índice.
const history = [];
let position = -1;

const texts = new Map(); // id → Markdown já baixado

async function loadText(id) {
  if (!texts.has(id)) {
    const response = await fetch(`docs/${id}.md${VERSION}`);
    if (!response.ok) throw new Error(`docs/${id}.md: HTTP ${response.status}`);
    texts.set(id, await response.text());
  }
  return texts.get(id);
}

function escapeHtml(text) {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

// Sem acentos e em minúsculas, para comparar na busca e montar âncoras.
function plain(text) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function slug(text) {
  return plain(text).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Bloco de código: a linguagem é a primeira palavra depois das crases. Em seguida podem vir:
// - "abrir" (```python abrir): programa completo, que ganha o botão "Abrir no editor";
// - "arquivo=nome" (```text arquivo=input.txt): conteúdo de um arquivo de dados, que
//   ganha o botão para criar a aba de dados com esse nome.
marked.use({
  renderer: {
    code(code, infostring, escaped) {
      const [lang = "", ...flags] = (infostring || "").trim().split(/\s+/);
      const open = flags.includes("abrir") ? " data-open" : "";
      const fileName = flags.find((flag) => flag.startsWith("arquivo="))?.slice("arquivo=".length);
      const file = fileName ? ` data-file="${escapeHtml(fileName)}"` : "";
      return `<pre data-lang="${escapeHtml(lang)}"${open}${file}><code>${escaped ? code : escapeHtml(code)}</code></pre>\n`;
    },
  },
});

function makeButton(label, className, onClick) {
  const button = document.createElement("button");
  button.className = "doc-btn " + className;
  button.textContent = label;
  button.addEventListener("click", () => onClick(button));
  return button;
}

// Depois de converter o Markdown: âncoras nos títulos, cores e botões nos blocos de código.
function enhance(page) {
  for (const heading of content.querySelectorAll("h1, h2, h3")) {
    heading.id = "h-" + slug(heading.textContent);
  }
  for (const pre of content.querySelectorAll("pre")) {
    const codeEl = pre.querySelector("code");
    const code = codeEl.textContent;
    if (pre.dataset.lang === "python") CodeMirror.runMode(code, "python", codeEl);

    pre.append(makeButton("Copiar", "doc-copy", async (button) => {
      try {
        await navigator.clipboard.writeText(code);
        button.textContent = "Copiado";
      } catch {
        button.textContent = "Não foi possível copiar";
      }
      setTimeout(() => { button.textContent = "Copiar"; }, 1500);
    }));

    const fileName = pre.dataset.file;
    if ("open" in pre.dataset || fileName) {
      const row = document.createElement("div");
      row.className = "doc-open";
      row.append(fileName
        ? makeButton(`Criar a aba de dados ${fileName}`, "", () => actions.openDataFile(fileName, code))
        : makeButton("Abrir no editor", "", () => actions.openInEditor(page.title, code)));
      pre.after(row);
    }
  }
}

// Título da seção pedida: pela âncora ("h-…") ou pelo termo do F1 (ex.: "addVariable"),
// que é procurado nos títulos escritos como código (### `h.addVariable(...)`).
function findAnchor(anchor) {
  const byId = document.getElementById("h-" + slug(anchor));
  if (byId && content.contains(byId)) return byId;
  const term = anchor.toLowerCase();
  const headings = [...content.querySelectorAll("h2, h3")];
  return headings.find((heading) => [...heading.querySelectorAll("code")].some((code) => {
    const name = code.textContent.split("(")[0].split(".").pop().trim();
    return name.toLowerCase() === term;
  })) || headings.find((heading) => heading.textContent.toLowerCase().includes(term)) || null;
}

function link(href, title, summary) {
  return `<li><a href="${href}">${escapeHtml(title)}</a>${summary ? `<span>${escapeHtml(summary)}</span>` : ""}</li>`;
}

function renderHome() {
  let html = "<h1>Ajuda</h1><p>Documentação do editor e do <code>highspy</code>, com exemplos comentados. " +
    "No editor, <kbd>F1</kbd> sobre uma palavra abre a página dela.</p>";
  for (const section of DOC_SECTIONS) {
    const pages = DOC_PAGES.filter((page) => page.section === section);
    if (!pages.length) continue;
    html += `<h2>${escapeHtml(section)}</h2><ul class="help-list">` +
      pages.map((page) => link(page.id + ".md", page.title, page.summary)).join("") + "</ul>";
  }
  content.innerHTML = html;
  content.scrollTop = 0;
}

async function renderPage(entry) {
  const page = pageById.get(entry.id);
  try {
    const text = await loadText(entry.id);
    if (history[position] !== entry || searchInput.value.trim()) return; // o aluno já foi para outro lugar
    content.innerHTML = marked.parse(text);
    enhance(page);
  } catch (err) {
    content.innerHTML = `<p class="help-empty">Não foi possível carregar esta página (${escapeHtml(String(err.message || err))}).</p>`;
    return;
  }
  const target = entry.anchor && findAnchor(entry.anchor);
  if (target) target.scrollIntoView({ block: "start" });
  else content.scrollTop = 0;
}

function render() {
  backButton.disabled = position <= 0;
  forwardButton.disabled = position >= history.length - 1;
  const entry = history[position];
  if (entry.id) renderPage(entry);
  else renderHome();
}

function go(id, anchor) {
  searchInput.value = "";
  history.splice(position + 1);
  history.push({ id: pageById.has(id) ? id : "", anchor: anchor || "" });
  position = history.length - 1;
  render();
}

// Busca em todas as páginas: todas as palavras digitadas precisam aparecer.
async function renderSearch() {
  const query = searchInput.value.trim();
  if (!query) {
    render();
    return;
  }
  const words = plain(query).split(/\s+/);
  const loaded = await Promise.all(DOC_PAGES.map((page) => loadText(page.id).catch(() => "")));
  if (searchInput.value.trim() !== query) return; // a busca mudou enquanto as páginas eram baixadas

  const results = [];
  DOC_PAGES.forEach((page, index) => {
    const title = plain(page.title);
    const keywords = plain(page.keywords.join(" "));
    const lines = loaded[index].split("\n");
    const body = plain(loaded[index]);
    if (!words.every((word) => title.includes(word) || keywords.includes(word) || body.includes(word))) return;
    const score = words.reduce((sum, word) =>
      sum + (title.includes(word) ? 4 : 0) + (keywords.includes(word) ? 2 : 0) + (body.includes(word) ? 1 : 0), 0);
    // Trecho: a primeira linha da página em que a primeira palavra aparece.
    const line = lines.find((text) => plain(text).includes(words[0])) || page.summary;
    const snippet = line.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[#`*>|]/g, "").trim().slice(0, 140);
    results.push({ page, score, snippet });
  });
  results.sort((a, b) => b.score - a.score);

  content.innerHTML = `<h1>Busca: ${escapeHtml(query)}</h1>` + (results.length
    ? `<ul class="help-list">${results.map(({ page, snippet }) =>
      link(`${page.id}.md#${encodeURIComponent(query)}`, page.title, snippet)).join("")}</ul>`
    : '<p class="help-empty">Nada encontrado. Tente outra palavra ou volte ao índice.</p>');
  content.scrollTop = 0;
}

// Cliques em links da ajuda: outra página (variaveis.md#secao), exemplo do menu
// (#exemplo-<id>), seção da mesma página (#secao) ou endereço externo.
content.addEventListener("click", (e) => {
  const anchorEl = e.target.closest("a[href]");
  if (!anchorEl) return;
  const href = anchorEl.getAttribute("href");
  if (/^[a-z]+:/i.test(href)) {
    anchorEl.target = "_blank";
    anchorEl.rel = "noopener";
    return;
  }
  e.preventDefault();
  const [path, hash = ""] = href.split("#");
  const anchor = decodeURIComponent(hash);
  if (path.endsWith(".md")) go(path.slice(0, -3), anchor);
  else if (anchor.startsWith("exemplo-")) actions.openExample(anchor.slice("exemplo-".length));
  else if (anchor) findAnchor(anchor)?.scrollIntoView({ block: "start" });
});

let searchTimer = null;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderSearch, 150);
});

backButton.addEventListener("click", () => {
  if (position <= 0) return;
  searchInput.value = "";
  position--;
  render();
});
forwardButton.addEventListener("click", () => {
  if (position >= history.length - 1) return;
  searchInput.value = "";
  position++;
  render();
});
document.getElementById("help-home").addEventListener("click", () => go(""));

// handlers: { openInEditor(name, code), openDataFile(name, content), openExample(id) }
export function initHelp(handlers) {
  actions = handlers;
  go("");
}

// Abre a ajuda de um termo (a palavra sob o cursor no F1). Se o termo tem página,
// vai direto à seção dele; se não tem, busca por ele; sem termo, mantém o que já estava aberto.
export function openHelp(term) {
  if (!term) return;
  const id = termToPage.get(term.toLowerCase());
  if (id) {
    go(id, term);
  } else {
    searchInput.value = term;
    renderSearch();
  }
}
