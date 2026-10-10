/* global CodeMirror */
import { EXAMPLES } from "./examples.js?v=8";
import { HIGHSPY_WORDS, initHelp, openHelp } from "./help.js?v=8";

// Chaves do localStorage (sempre em try/catch: pode estar bloqueado).
const KEY_CODE = "webpython.code"; // versão antiga, de antes das abas: só é lida na migração
const KEY_TABS = "webpython.tabs";
const KEY_THEME = "webpython.theme";
const KEY_EDITOR_THEME = "webpython.editor-theme";
const KEY_FONT_SIZE = "webpython.font-size";
const KEY_OUTPUT_ZOOM = "webpython.output-zoom";

function loadSetting(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function saveSetting(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Sem armazenamento (ex.: janela anônima): o app continua funcionando.
  }
}

const runButton = document.getElementById("btn-run");
const stopButton = document.getElementById("btn-stop");
const clearButton = document.getElementById("btn-clear");
const examplesSelect = document.getElementById("examples-select");
const output = document.getElementById("output");
const placeholder = document.getElementById("placeholder");
const statusDot = document.getElementById("dot");
const statusMsg = document.getElementById("status-msg");

/* ════════════════════════════════════════════════════════════════════
   Autocompletar: palavras-chave do Python + nomes do highspy documentados
   na ajuda + palavras já usadas no código
════════════════════════════════════════════════════════════════════ */
const WORDS = /[\p{L}_][\p{L}\p{N}_]*/gu;
const WORD_BEFORE_CURSOR = /[\p{L}_][\p{L}\p{N}_]*$/u;

function wordBeforeCursor(cm) {
  const cur = cm.getCursor();
  return cm.getLine(cur.line).slice(0, cur.ch).match(WORD_BEFORE_CURSOR)?.[0] ?? "";
}

function pythonHint(cm) {
  if (isDataTab(getActiveTab())) return null;
  const cur = cm.getCursor();
  const prefix = wordBeforeCursor(cm);

  const counts = new Map(CodeMirror.hintWords.python.map((word) => [word, 2]));
  // Os nomes do highspy começam em 1: digitados por inteiro chegam a 2 e também contam como completos.
  for (const word of HIGHSPY_WORDS) {
    if (!counts.has(word)) counts.set(word, 1);
  }
  for (const word of cm.getValue().match(WORDS) ?? []) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  // Palavra já completa (a outra ocorrência é a que está sendo digitada): sem
  // sugestões, para o Enter quebrar a linha em vez de trocar a palavra por outra.
  if (counts.get(prefix) >= 2) return null;

  const lower = prefix.toLowerCase();
  const list = [...counts.keys()]
    .filter((word) => word !== prefix && word.toLowerCase().startsWith(lower))
    .sort((a, b) => a.localeCompare(b));
  if (!list.length) return null;

  return {
    list,
    from: CodeMirror.Pos(cur.line, cur.ch - prefix.length),
    to: cur,
  };
}

/* ════════════════════════════════════════════════════════════════════
   Abas (mesmo modelo do WebHIGHS)
   Cada aba tem seu próprio CodeMirror.Doc, que guarda o histórico de
   desfazer, o cursor e os blocos dobrados. Executar roda a aba ativa.

   Há dois tipos de aba, definidos só pelo nome:
   - código Python (qualquer nome sem extensão de dados);
   - dados (nome terminado em .csv, .tsv, .txt, .json ou .dat): o nome é o
     nome do arquivo, e o código de qualquer aba o lê com open("custos.csv").
════════════════════════════════════════════════════════════════════ */
const DEFAULT_TAB_NAME = "Sem título";
const DATA_NAME = /\.(csv|tsv|txt|json|dat)$/i;

function isDataName(name) {
  return DATA_NAME.test(name);
}

function isDataTab(tab) {
  return isDataName(tab.name);
}

// Dados são texto puro; código tem o realce de sintaxe do Python.
function makeDoc(name, content) {
  return new CodeMirror.Doc(content || "", isDataName(name) ? null : "python");
}

let tabs = [];
let activeTabId = null;
let tabSeq = 0;

function makeTab(name, content, id) {
  return {
    id: id || `tab-${++tabSeq}-${Date.now().toString(36)}`,
    name: name || DEFAULT_TAB_NAME,
    doc: makeDoc(name || DEFAULT_TAB_NAME, content),
  };
}

function getTab(id) {
  return tabs.find((tab) => tab.id === id) || null;
}

function getActiveTab() {
  return getTab(activeTabId);
}

// Restaura as abas da sessão anterior, se houver.
(function restoreTabs() {
  try {
    const saved = JSON.parse(loadSetting(KEY_TABS));
    if (!Array.isArray(saved?.tabs)) return;
    tabSeq = saved.tabSeq || 0;
    tabs = saved.tabs.map((tab) => makeTab(tab.name, tab.content, tab.id));
    activeTabId = saved.activeTabId;
  } catch {
    // Conteúdo salvo inválido: começa do zero.
  }
})();

if (!tabs.length) {
  const oldCode = loadSetting(KEY_CODE);
  tabs.push(oldCode != null ? makeTab("modelo", oldCode) : makeTab(EXAMPLES[0].name, EXAMPLES[0].code));
}
if (!getActiveTab()) activeTabId = tabs[0].id;

function saveTabs() {
  saveSetting(KEY_TABS, JSON.stringify({
    activeTabId,
    tabSeq,
    tabs: tabs.map((tab) => ({ id: tab.id, name: tab.name, content: tab.doc.getValue() })),
  }));
}

let persistTimer = null;
function persistTabs() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(saveTabs, 400);
}
// Garante que o que foi digitado nos últimos instantes não se perca ao fechar a página.
window.addEventListener("pagehide", saveTabs);

function sanitizeFileName(name) {
  return (name || "modelo").replace(/[\\/:*?"<>|]/g, "_").trim() || "modelo";
}

function renderTabBar() {
  const bar = document.getElementById("tab-bar");
  bar.textContent = "";
  for (const tab of tabs) {
    const el = document.createElement("div");
    el.className = "tab" + (tab.id === activeTabId ? " active" : "") + (isDataTab(tab) ? " data" : "");
    el.title = isDataTab(tab)
      ? `${tab.name} — arquivo de dados: leia no código por este nome · duplo clique para renomear`
      : `${tab.name} — duplo clique para renomear`;

    const nameSpan = document.createElement("span");
    nameSpan.className = "tab-name";
    nameSpan.textContent = tab.name;

    const closeBtn = document.createElement("span");
    closeBtn.className = "tab-close";
    closeBtn.textContent = "×";
    closeBtn.title = "Fechar aba";

    el.append(nameSpan, closeBtn);
    el.addEventListener("click", (e) => {
      if (e.target !== closeBtn) activateTab(tab.id);
    });
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });
    el.addEventListener("dblclick", (e) => {
      if (e.target !== closeBtn) renameTab(tab.id);
    });
    bar.append(el);
  }

  const addBtn = document.createElement("div");
  addBtn.className = "tab-add";
  addBtn.title = "Nova aba de código";
  addBtn.textContent = "+";
  addBtn.addEventListener("click", () => newTab());
  bar.append(addBtn);

  const addDataBtn = document.createElement("div");
  addDataBtn.className = "tab-add tab-add-data";
  addDataBtn.title = "Nova aba de dados (CSV, TXT, JSON…) para o código ler como arquivo";
  addDataBtn.textContent = "+ dados";
  addDataBtn.addEventListener("click", newDataTab);
  bar.append(addDataBtn);

  bar.querySelector(".tab.active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

// Última aba de código ativa: é ela que roda quando o aluno executa a partir de uma aba de dados.
let lastCodeTabId = null;

function codeTabToRun() {
  const active = getActiveTab();
  if (!isDataTab(active)) return active;
  const last = getTab(lastCodeTabId);
  return last && !isDataTab(last) ? last : tabs.find((tab) => !isDataTab(tab)) || null;
}

// Ajusta o editor ao tipo da aba ativa (código ou dados).
function applyTabKind() {
  const data = isDataTab(getActiveTab());
  if (!data) lastCodeTabId = activeTabId;
  // Em dados, fechar aspas e parênteses sozinho só atrapalha.
  editor.setOption("autoCloseBrackets", !data);
}

// Mostra no editor o documento da aba ativa.
function showActiveDoc() {
  editor.swapDoc(getActiveTab().doc);
  // Reposiciona o cursor no mesmo lugar só para o destaque da linha atual ser refeito.
  editor.setCursor(editor.getCursor());
  applyTabKind();
  updateStatusInfo();
  editor.refresh();
}

function activateTab(id) {
  if (id === activeTabId || !getTab(id)) return;
  activeTabId = id;
  showActiveDoc();
  renderTabBar();
  editor.focus();
  persistTabs();
}

function newTab(name, content) {
  // Um arquivo de dados é identificado pelo nome: abrir o mesmo nome de novo atualiza a aba.
  const existing = name && isDataName(name) ? tabs.find((tab) => tab.name === name) : null;
  if (existing) {
    const current = existing.doc.getValue();
    const replace = current === (content || "") || !current.trim() ||
      confirm(`Já existe a aba de dados "${name}".\n\nSubstituir o conteúdo dela?`);
    if (replace) existing.doc.setValue(content || "");
    activateTab(existing.id);
    persistTabs();
    return existing;
  }
  const tab = makeTab(name, content);
  tabs.push(tab);
  activateTab(tab.id);
  return tab;
}

function newDataTab() {
  const typed = prompt("Nome do arquivo de dados (ex.: custos.csv):", "dados.csv");
  if (!typed || !typed.trim()) return;
  let name = sanitizeFileName(typed);
  if (!isDataName(name)) name += ".csv";
  const existing = tabs.find((tab) => tab.name === name);
  if (existing) activateTab(existing.id);
  else newTab(name, "");
}

function closeTab(id) {
  const index = tabs.findIndex((tab) => tab.id === id);
  if (index === -1) return;
  const tab = tabs[index];
  // O conteúdo só existe no navegador: fechar sem querer perderia o trabalho.
  if (tab.doc.getValue().trim() &&
      !confirm(`Fechar a aba "${tab.name}"?\n\nO conteúdo que não foi salvo em arquivo será perdido.`)) {
    return;
  }
  tabs.splice(index, 1);
  if (!tabs.length) tabs.push(makeTab());

  if (id === activeTabId) {
    activeTabId = tabs[Math.min(index, tabs.length - 1)].id;
    showActiveDoc();
  }
  renderTabBar();
  persistTabs();
}

function renameTab(id) {
  const tab = getTab(id);
  if (!tab) return;
  const typed = prompt("Nome da aba:", tab.name);
  if (!typed || !typed.trim()) return;
  const newName = typed.trim().replace(/[\\/]/g, "_");
  if (newName === tab.name) return;
  if (isDataName(newName) && tabs.some((other) => other !== tab && other.name === newName)) {
    alert(`Já existe uma aba de dados chamada "${newName}".`);
    return;
  }
  const kindChanged = isDataName(newName) !== isDataTab(tab);
  tab.name = newName;
  if (kindChanged) {
    // Código ↔ dados: recria o documento para trocar o realce de sintaxe.
    tab.doc = makeDoc(newName, tab.doc.getValue());
    if (tab.id === activeTabId) showActiveDoc();
  }
  updateStatusInfo();
  renderTabBar();
  persistTabs();
}

/* ════════════════════════════════════════════════════════════════════
   Editor (CodeMirror 5)
════════════════════════════════════════════════════════════════════ */
const editor = CodeMirror(document.getElementById("cm-wrapper"), {
  value: getActiveTab().doc,
  mode: "python",
  theme: loadSetting(KEY_EDITOR_THEME) || "dracula",
  lineNumbers: true,
  lineWrapping: false,
  autofocus: true,
  indentUnit: 4,
  tabSize: 4,
  indentWithTabs: false,
  autoCloseBrackets: true,
  matchBrackets: true,
  styleActiveLine: true,
  foldGutter: true,
  gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
  hintOptions: { hint: pythonHint, completeSingle: false },
  // Tradução dos diálogos de busca e substituição.
  phrases: {
    "Search:": "Buscar:",
    "(Use /re/ syntax for regexp search)": "(use /re/ para expressão regular)",
    "Replace:": "Substituir:",
    "Replace all:": "Substituir tudo:",
    "With:": "Por:",
    "Replace with:": "Substituir por:",
    "Replace?": "Substituir?",
    "Yes": "Sim",
    "No": "Não",
    "All": "Todos",
    "Stop": "Parar",
  },
  extraKeys: {
    "Ctrl-Enter": () => runCode(),
    "Cmd-Enter": () => runCode(),
    "Ctrl-Space": "autocomplete",
    // A busca fica aberta: Enter vai para a próxima ocorrência, Esc fecha.
    "Ctrl-F": "findPersistent",
    "Cmd-F": "findPersistent",
    "Ctrl-H": "replace",
    "F3": "findNext",
    "Shift-F3": "findPrev",
    // Tab indenta com espaços, como em um editor de Python.
    Tab: (cm) => {
      if (cm.somethingSelected()) cm.indentSelection("add");
      // Em dados o Tab é um separador de colunas de verdade (como ao colar do Excel).
      else if (isDataTab(getActiveTab())) cm.replaceSelection("\t", "end");
      else cm.replaceSelection(" ".repeat(cm.getOption("indentUnit")), "end");
    },
    "Shift-Tab": (cm) => cm.indentSelection("subtract"),
  },
});
editor.setSize("100%", "100%");

// Re-measure CodeMirror after viewport changes (phone rotation, the toolbar
// wrapping to a second row, etc.)
let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => editor.refresh(), 150);
});

// Ctrl+/ comenta ou descomenta. Feito pelo caractere da tecla (e não em extraKeys)
// porque no teclado ABNT2 a tecla "/" tem um código que o CodeMirror não reconhece.
editor.on("keydown", (cm, e) => {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key === "/") {
    e.preventDefault();
    cm.toggleComment();
  }
});

// Abre as sugestões sozinho ao digitar, fora de comentários e strings.
editor.on("inputRead", (cm, change) => {
  if (cm.state.completionActive || change.origin !== "+input") return;
  if (isDataTab(getActiveTab())) return;
  if (wordBeforeCursor(cm).length < 2) return;
  if (/comment|string/.test(cm.getTokenTypeAt(cm.getCursor()) ?? "")) return;
  cm.showHint();
});

// Aba da última execução e a linha do erro destacada nela. O traceback se refere
// a essa aba, mesmo que o aluno tenha trocado de aba depois de executar.
let runTabId = null;
let errorMark = null; // { doc, handle }

function clearErrorLine() {
  if (!errorMark) return;
  errorMark.doc.removeLineClass(errorMark.handle, "background", "cm-error-line");
  errorMark = null;
}

function markErrorLine(number) {
  clearErrorLine();
  const tab = getTab(runTabId);
  if (!tab || number < 1 || number > tab.doc.lineCount()) return;
  errorMark = { doc: tab.doc, handle: tab.doc.addLineClass(number - 1, "background", "cm-error-line") };
}

function goToLine(number) {
  if (!getTab(runTabId)) return; // a aba executada já foi fechada
  activateTab(runTabId);
  markErrorLine(number);
  const pos = CodeMirror.Pos(Math.min(Math.max(number, 1), editor.lineCount()) - 1, 0);
  // Abre o bloco, caso a linha esteja dentro de um trecho dobrado.
  editor.findMarksAt(pos).forEach((mark) => mark.__isFold && mark.clear());
  editor.setCursor(pos);
  editor.scrollIntoView(pos, 80);
  editor.focus();
}

editor.on("change", (cm) => {
  if (errorMark?.doc === cm.getDoc()) clearErrorLine();
});

// Barra de status: posição do cursor, indentação e tipo da aba ativa.
function updateStatusInfo() {
  const cur = editor.getCursor();
  const selected = editor.getSelection().length;
  document.getElementById("status-cursor").textContent =
    `Ln ${cur.line + 1}, Col ${cur.ch + 1}` + (selected ? ` (${selected} selecionados)` : "");

  const tab = getActiveTab();
  const data = isDataTab(tab);
  document.getElementById("status-indent").textContent =
    data ? "Tabulação" : `Espaços: ${editor.getOption("indentUnit")}`;
  document.getElementById("status-lang").textContent =
    data ? `Dados · ${tab.name.split(".").pop().toUpperCase()}` : "Python";
}
editor.on("cursorActivity", updateStatusInfo);
editor.on("change", persistTabs);
applyTabKind();
updateStatusInfo();
renderTabBar();

/* ════════════════════════════════════════════════════════════════════
   Resizable split panel
════════════════════════════════════════════════════════════════════ */
(function () {
  const handle = document.getElementById("resize-handle");
  const panelL = document.getElementById("panel-editor");
  const main = document.getElementById("main");
  let dragging = false, startX, startW;

  handle.addEventListener("mousedown", (e) => {
    dragging = true;
    startX = e.clientX;
    startW = panelL.offsetWidth;
    handle.classList.add("dragging");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  });
  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const totalW = main.offsetWidth;
    const newW = Math.max(200, Math.min(totalW - 220, startW + dx));
    panelL.style.width = newW + "px";
  });
  document.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove("dragging");
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    editor.refresh();
  });
})();

/* ════════════════════════════════════════════════════════════════════
   Font size controls
════════════════════════════════════════════════════════════════════ */
(function () {
  const MIN = 9, MAX = 28, STEP = 1;
  let size = parseInt(loadSetting(KEY_FONT_SIZE), 10) || 14;

  function applySize(s) {
    size = Math.min(MAX, Math.max(MIN, s));
    editor.getWrapperElement().style.fontSize = size + "px";
    editor.refresh();
    document.getElementById("font-size-display").textContent = size + "px";
    document.getElementById("font-dec").disabled = size <= MIN;
    document.getElementById("font-inc").disabled = size >= MAX;
    saveSetting(KEY_FONT_SIZE, size);
  }

  document.getElementById("font-dec").addEventListener("click", () => applySize(size - STEP));
  document.getElementById("font-inc").addEventListener("click", () => applySize(size + STEP));

  // Ctrl+- / Ctrl+=  (reset with Ctrl+0)
  document.addEventListener("keydown", (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    if (e.key === "-" || e.key === "_") { e.preventDefault(); applySize(size - STEP); }
    if (e.key === "+" || e.key === "=" || e.key === "NumpadAdd") { e.preventDefault(); applySize(size + STEP); }
    if (e.key === "0") { e.preventDefault(); applySize(14); }
  });

  applySize(size);
})();

/* ════════════════════════════════════════════════════════════════════
   Preferências do editor (caixa aberta pelo botão da toolbar)
════════════════════════════════════════════════════════════════════ */
(function () {
  const button = document.getElementById("btn-settings");
  const menu = document.getElementById("settings-menu");

  function setOpen(open) {
    menu.hidden = !open;
    button.setAttribute("aria-expanded", open);
  }

  button.addEventListener("click", () => setOpen(menu.hidden));
  document.addEventListener("mousedown", (e) => {
    if (!menu.hidden && !menu.contains(e.target) && !button.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
})();

/* ════════════════════════════════════════════════════════════════════
   Editor color theme selector
════════════════════════════════════════════════════════════════════ */
(function () {
  const sel = document.getElementById("editor-theme-select");
  sel.value = editor.getOption("theme");
  sel.addEventListener("change", () => {
    editor.setOption("theme", sel.value);
    editor.refresh();
    saveSetting(KEY_EDITOR_THEME, sel.value);
  });
})();

/* ════════════════════════════════════════════════════════════════════
   Output panel — text size controls (scales the whole output area)
════════════════════════════════════════════════════════════════════ */
(function () {
  const MIN = 80, MAX = 160, STEP = 10;
  let pct = parseInt(loadSetting(KEY_OUTPUT_ZOOM), 10) || 100;
  const body = document.getElementById("results");

  function apply(p) {
    pct = Math.min(MAX, Math.max(MIN, p));
    body.style.zoom = pct / 100;
    document.getElementById("result-font-size-display").textContent = pct + "%";
    document.getElementById("result-font-dec").disabled = pct <= MIN;
    document.getElementById("result-font-inc").disabled = pct >= MAX;
    saveSetting(KEY_OUTPUT_ZOOM, pct);
  }

  document.getElementById("result-font-dec").addEventListener("click", () => apply(pct - STEP));
  document.getElementById("result-font-inc").addEventListener("click", () => apply(pct + STEP));

  apply(pct);
})();

/* ════════════════════════════════════════════════════════════════════
   Painel da direita: visões "Saída" e "Ajuda"
════════════════════════════════════════════════════════════════════ */
const panelTabs = [...document.querySelectorAll(".panel-tab")];

function showPanelView(name) {
  for (const tab of panelTabs) {
    const active = tab.dataset.view === name;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active);
    document.getElementById("view-" + tab.dataset.view).hidden = !active;
  }
  clearButton.hidden = name !== "output"; // "Limpar" só faz sentido na saída
}

for (const tab of panelTabs) {
  tab.addEventListener("click", () => showPanelView(tab.dataset.view));
}

/* ════════════════════════════════════════════════════════════════════
   Theme toggle
════════════════════════════════════════════════════════════════════ */
(function () {
  const checkbox = document.getElementById("btn-theme");

  function applyTheme(name) {
    document.documentElement.dataset.theme = name;
    checkbox.checked = name === "dark";
    document.getElementById("theme-switch-label").title =
      name === "dark" ? "Mudar para o tema claro" : "Mudar para o tema escuro";
    saveSetting(KEY_THEME, name);
  }

  checkbox.addEventListener("change", () => applyTheme(checkbox.checked ? "dark" : "light"));

  // Restore saved preference, or honour OS preference as fallback
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(loadSetting(KEY_THEME) || (prefersDark ? "dark" : "light"));
})();

/* ════════════════════════════════════════════════════════════════════
   Saída
════════════════════════════════════════════════════════════════════ */

// Mesma classificação de linhas do log usada no WebHIGHS.
function logLineClass(line, isErr) {
  if (isErr) return "ll-err";
  if (!line || !line.trim()) return "ll-blank";
  const t = line.trim();

  // HiGHS version / copyright header
  if (t.startsWith("Running HiGHS") || t.startsWith("Copyright")) return "ll-header";

  // Legenda da tabela do B&B ("U => Unbounded; ..."): não é uma linha de status.
  if (t.includes("=>")) return "ll-normal";

  // Status / conclusion lines
  if (/\bOptimal\b/i.test(t)) return "ll-optimal";
  if (/\bInfeasible\b/i.test(t)) return "ll-infeas";
  if (/\bUnbounded\b/i.test(t)) return "ll-infeas";

  // Warnings
  if (/warning|warn/i.test(t)) return "ll-warning";

  // Section headings (e.g. "Solving MIP model with:", "Solving report")
  if (/^(Solving|Presolv|Running|Model|Problem|Solution|Using|Reading|Writing)/i.test(t)) return "ll-section";

  // MIP B&B table header (contains "Nodes" and "B&B Tree" or "Objective")
  if (/Nodes/.test(t) && /B&B|Objective|Leaves/.test(t)) return "ll-mip-hdr";
  if (/Proc\.|InQueue|BestBound|BestSol/.test(t)) return "ll-mip-hdr";

  // MIP progress rows; the best-update ones are prefixed with a letter
  if (/^\s*[BCHF]\s+\d/.test(line)) return "ll-mip-best";
  if (/^\s+\d+\s+\d+.*\d+\.\d+s\s*$/.test(line)) return "ll-mip-row";

  // Separator lines (-------)
  if (/^[-=\s]+$/.test(t)) return "ll-sep";

  return "ll-normal";
}

// Linha do traceback que aponta para o código do aluno.
const EXEC_LINE = /File "<exec>", line (\d+)/;

function lastErrorLine(text) {
  const matches = [...text.matchAll(new RegExp(EXEC_LINE, "g"))];
  return matches.length ? Number(matches.at(-1)[1]) : null;
}

// kind: undefined (stdout), "stderr" ou "info" (mensagens do próprio app).
// onClick (opcional) torna as linhas clicáveis.
function print(text, kind, onClick) {
  placeholder.hidden = true;
  output.hidden = false;
  for (const line of text.split("\n")) {
    const div = document.createElement("div");
    div.className = kind === "info" ? "ll-info" : logLineClass(line, kind === "stderr");
    div.textContent = line;
    const match = kind === "stderr" && line.match(EXEC_LINE);
    if (match) {
      div.classList.add("ll-link");
      div.title = `Ir para a linha ${match[1]}`;
      div.addEventListener("click", () => goToLine(Number(match[1])));
    } else if (onClick) {
      div.classList.add("ll-link");
      div.addEventListener("click", onClick);
    }
    output.append(div);
  }
  output.scrollTop = output.scrollHeight;
}

function clearOutput() {
  output.textContent = "";
}

// Arquivos de dados que o código gravou (mensagem "files" do worker): cada um vira uma
// aba de dados ou atualiza a aba de mesmo nome. A aba ativa não muda; a linha impressa
// na saída leva à aba do arquivo.
function receiveOutputFiles(files) {
  for (const file of files) {
    if (file.tooLarge) {
      print(`Arquivo gravado: ${file.name} (grande demais para abrir em uma aba)`, "info");
      continue;
    }
    let tab = tabs.find((other) => other.name === file.name);
    let note = "aba atualizada";
    if (!tab) {
      tab = makeTab(file.name, file.content);
      tabs.push(tab);
      note = "aba criada";
    } else if (tab.doc.getValue() === file.content) {
      note = "conteúdo igual ao da aba";
    } else {
      tab.doc.setValue(file.content);
    }
    const id = tab.id;
    print(`Arquivo gravado: ${file.name} (${note}; clique para abrir)`, "info", () => activateTab(id));
  }
  renderTabBar();
  persistTabs();
}

function setStatus(text, kind) {
  statusMsg.textContent = text;
  statusDot.className = "dot" + (kind ? " " + kind : "");
}

/* ════════════════════════════════════════════════════════════════════
   Worker (Pyodide)
════════════════════════════════════════════════════════════════════ */
let worker;
let ready = false;
let running = false;
let startTime = 0;

// Executar e Parar ocupam o mesmo lugar: durante a execução, o primeiro dá lugar ao segundo.
function updateButtons() {
  runButton.disabled = !ready;
  runButton.hidden = running;
  stopButton.hidden = !running;
}

// failed: a execução terminou com exceção; errorLine é a linha dela, quando conhecida.
function finishRun(failed, errorLine) {
  running = false;
  const seconds = ((performance.now() - startTime) / 1000).toFixed(2).replace(".", ",");
  const tab = getTab(runTabId);
  if (failed) {
    const where = (errorLine ? ` na linha ${errorLine}` : "") + (tab ? ` de "${tab.name}"` : "");
    setStatus(`Erro${where} · ${seconds} s`, "error");
  } else {
    setStatus(`Pronto · ${tab ? `"${tab.name}" ` : ""}executado em ${seconds} s`);
  }
  updateButtons();
}

function startWorker() {
  ready = false;
  running = false;
  setStatus("Carregando Python…", "loading");
  updateButtons();

  worker = new Worker("worker.js?v=8", { type: "module" });
  worker.onmessage = ({ data }) => {
    switch (data.type) {
      case "ready":
        ready = true;
        document.getElementById("status-engine-badge").textContent =
          `Pyodide ${data.version} · WebAssembly`;
        setStatus("Python pronto");
        updateButtons();
        break;
      case "loading":
        setStatus("Baixando pacotes Python…", "loading");
        break;
      case "running":
        setStatus("Executando…", "loading");
        break;
      case "stdout":
        print(data.text);
        break;
      case "stderr":
        print(data.text, "stderr");
        break;
      case "files":
        receiveOutputFiles(data.files);
        break;
      case "error": {
        print(data.text, "stderr");
        const line = lastErrorLine(data.text);
        if (line) markErrorLine(line);
        finishRun(true, line);
        break;
      }
      case "done":
        finishRun();
        break;
      case "crash":
        print(data.text, "stderr");
        print("O interpretador Python travou. Recarregando…", "info");
        worker.terminate();
        startWorker();
        break;
      case "fatal":
        print("Não foi possível carregar o Python:\n" + data.text, "stderr");
        setStatus("Erro ao carregar o Python", "error");
        break;
    }
  };
  worker.onerror = (event) => {
    print("Erro no worker: " + event.message, "stderr");
    setStatus("Erro ao carregar o Python", "error");
  };
}

function sendRun(code) {
  running = true;
  startTime = performance.now();
  setStatus("Executando…", "loading");
  updateButtons();
  // As abas de dados vão junto: o worker as grava como arquivos antes de executar.
  const files = tabs.filter(isDataTab).map((tab) => ({ name: tab.name, content: tab.doc.getValue() }));
  worker.postMessage({ type: "run", code, files });
}

function runCode() {
  if (!ready || running) return;
  showPanelView("output");
  clearOutput();
  clearErrorLine();
  const tab = codeTabToRun();
  if (!tab) {
    print("Não há aba de código para executar. Crie uma com o botão + da barra de abas.", "info");
    return;
  }
  runTabId = tab.id;
  sendRun(tab.doc.getValue());
}

// Não há como interromper o Python no meio de um cálculo sem SharedArrayBuffer,
// então o worker é encerrado e outro é criado no lugar.
function stopCode() {
  if (!running) return;
  worker.terminate();
  print("Execução interrompida. Recarregando o Python…", "info");
  startWorker();
}

/* ════════════════════════════════════════════════════════════════════
   Toolbar
════════════════════════════════════════════════════════════════════ */
EXAMPLES.forEach((example, index) => {
  examplesSelect.add(new Option(example.name, index));
});

function openExample(example) {
  for (const file of example.files ?? []) newTab(file.name, file.content);
  newTab(example.name, example.code);
}

examplesSelect.addEventListener("change", () => {
  if (examplesSelect.value === "") return;
  const example = EXAMPLES[examplesSelect.value];
  examplesSelect.value = "";
  openExample(example);
});

// Ajuda: os blocos de código e os links de exemplo das páginas abrem abas no editor.
initHelp({
  openInEditor: (name, code) => newTab(name, code),
  openDataFile: (name, content) => newTab(name, content),
  openExample: (id) => {
    const example = EXAMPLES.find((item) => item.id === id);
    if (example) openExample(example);
  },
});

// F1: ajuda da palavra selecionada ou sob o cursor (ex.: addVariable).
function helpForCursor() {
  let word = editor.getSelection().trim();
  if (!word) {
    const range = editor.findWordAt(editor.getCursor());
    word = editor.getRange(range.anchor, range.head).trim();
  }
  showPanelView("help");
  openHelp(/^[\p{L}_][\p{L}\p{N}_]*$/u.test(word) ? word : "");
}

// Abrir / salvar arquivos (cada arquivo aberto vira uma aba; .py é código, o resto é dado)
const fileInput = document.getElementById("file-input");

document.getElementById("btn-open").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
  const files = [...fileInput.files];
  fileInput.value = "";
  for (const file of files) {
    newTab(file.name.replace(/\.py$/i, ""), await file.text());
  }
});

function saveActiveTab() {
  const tab = getActiveTab();
  const data = isDataTab(tab);
  const url = URL.createObjectURL(new Blob([editor.getValue()], { type: data ? "text/plain" : "text/x-python" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = sanitizeFileName(tab.name) + (data ? "" : ".py");
  link.click();
  URL.revokeObjectURL(url);
}
document.getElementById("btn-save").addEventListener("click", saveActiveTab);

// Atalhos de IDE, válidos com o foco em qualquer lugar da página. Ctrl+N não entra:
// o navegador o reserva para abrir uma janela, então a aba nova fica em Alt+N.
document.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();
  if (key === "f5" && !mod && !e.altKey) {
    // Ctrl+F5 e Ctrl+R continuam recarregando a página.
    e.preventDefault();
    if (e.shiftKey) stopCode();
    else runCode();
  } else if (key === "f1" && !mod && !e.altKey && !e.shiftKey) {
    e.preventDefault();
    helpForCursor();
  } else if (mod && !e.altKey && !e.shiftKey && key === "s") {
    e.preventDefault();
    saveActiveTab();
  } else if (e.altKey && !mod && !e.shiftKey && key === "n") {
    e.preventDefault();
    newTab();
  }
});

runButton.addEventListener("click", runCode);
stopButton.addEventListener("click", stopCode);
clearButton.addEventListener("click", () => {
  clearOutput();
  output.hidden = true;
  placeholder.hidden = false;
});

startWorker();
