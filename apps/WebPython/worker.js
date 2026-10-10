// Web Worker (módulo ES): carrega o Pyodide e executa o código Python fora da thread principal.

// Versão fixa para que o highspy não mude no meio do semestre.
const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/";

// O scipy.optimize traz sua própria cópia do HiGHS, que entra em conflito com a do
// highspy e derruba o interpretador ("memory access out of bounds"). Este app usa
// só o highspy, então o scipy.optimize é recusado com uma mensagem clara.
const USES_SCIPY_OPTIMIZE = /\bscipy\.optimize\b|^\s*from\s+scipy\s+import\s+.*\boptimize\b/m;

let pyodide;
let clearNamespace;

// Mesma regra de isDataName no app.js: só estes arquivos podem virar abas de dados.
const DATA_NAME = /\.(csv|tsv|txt|json|dat)$/i;

// Arquivos de saída maiores que isto não são enviados à página (as abas ficam no localStorage).
const MAX_OUTPUT_CHARS = 1024 * 1024;

// Arquivos (não pastas) da pasta de trabalho do Python.
function listWorkFiles() {
  return pyodide.FS.readdir(".").filter((name) => {
    try {
      return pyodide.FS.isFile(pyodide.FS.stat(name).mode);
    } catch {
      return false;
    }
  });
}

// Deixa a pasta de trabalho do Python igual às abas de dados: grava as abas (onde
// open("custos.csv") as encontra) e apaga todo arquivo que não é uma aba, inclusive
// os que o código gravou em execuções anteriores. A página é a dona dos dados.
// É refeito a cada execução: o sistema de arquivos some quando o worker é recriado.
function syncDataFiles(files) {
  const names = new Set(files.map((file) => file.name));
  for (const name of listWorkFiles()) {
    if (!names.has(name)) pyodide.FS.unlink(name);
  }
  for (const file of files) {
    pyodide.FS.writeFile(file.name, file.content);
    // Data de modificação zerada: depois da execução, quem tiver outra data foi gravado pelo código.
    pyodide.FS.utime(file.name, 0, 0);
  }
}

// Envia à página os arquivos de dados que o código gravou (novos ou regravados, mesmo
// com o conteúdo igual), para virarem abas.
// Deve ser chamado depois de clearNamespace: é ele que fecha (e grava de fato) os
// arquivos que o aluno abriu sem "with" e esqueceu de fechar.
function sendOutputFiles() {
  try {
    const written = [];
    for (const name of listWorkFiles()) {
      if (!DATA_NAME.test(name)) continue;
      if (new Date(pyodide.FS.stat(name).mtime).getTime() === 0) continue;
      const content = pyodide.FS.readFile(name, { encoding: "utf8" });
      written.push(content.length > MAX_OUTPUT_CHARS ? { name, tooLarge: true } : { name, content });
    }
    if (written.length) postMessage({ type: "files", files: written });
  } catch {
    // Não conseguir ler os arquivos de saída não deve esconder o resultado da execução.
  }
}

async function init() {
  // O pyodide.js dessa versão não carrega via importScripts, por isso o import dinâmico.
  const { loadPyodide } = await import(PYODIDE_URL + "pyodide.mjs");
  pyodide = await loadPyodide({ indexURL: PYODIDE_URL });

  // O log do HiGHS é escrito em C e também passa por aqui.
  pyodide.setStdout({ batched: (text) => postMessage({ type: "stdout", text }) });
  pyodide.setStderr({ batched: (text) => postMessage({ type: "stderr", text }) });

  await pyodide.loadPackage("highspy", { messageCallback: () => {} });

  // Libera os objetos do aluno de dentro do Python, antes do globals.destroy().
  clearNamespace = pyodide.runPython(`
def _clear_namespace(ns):
    import gc
    ns.clear()
    gc.collect()
_clear_namespace
`);

  postMessage({ type: "ready", version: pyodide.version });
}

// Remove do traceback as linhas internas do Pyodide, deixando só o código do aluno.
function cleanTraceback(message) {
  const lines = message.split("\n");
  const start = lines.findIndex((line) => line.includes('File "<exec>"'));
  if (start <= 0) return message;
  return [lines[0], ...lines.slice(start)].join("\n");
}

async function run(code, files) {
  if (USES_SCIPY_OPTIMIZE.test(code)) {
    postMessage({
      type: "error",
      text: "O scipy.optimize não está disponível neste editor: ele entra em conflito\n" +
        "com o highspy no navegador. Modele o problema com o highspy.",
    });
    return;
  }

  try {
    syncDataFiles(files);
  } catch (err) {
    postMessage({ type: "error", text: "Não foi possível gravar os arquivos de dados: " + (err.message || err) });
    return;
  }

  // Cada execução usa um namespace novo, como rodar um script do zero.
  const globals = pyodide.toPy({ __name__: "__main__" });
  try {
    // Pacotes como o pandas são baixados no primeiro import; a página mostra isso no status.
    let downloading = false;
    await pyodide.loadPackagesFromImports(code, {
      messageCallback: (message) => {
        if (downloading || !message.startsWith("Loading")) return;
        downloading = true;
        postMessage({ type: "loading" });
      },
    });
    if (downloading) postMessage({ type: "running" });
    // runPython síncrono de propósito: um objeto Highs criado dentro de
    // runPythonAsync e destruído depois derruba o interpretador com
    // "Fatal Python error: _PyThreadState_Attach".
    pyodide.runPython(code, { globals });
    clearNamespace(globals);
    sendOutputFiles();
    postMessage({ type: "done" });
  } catch (err) {
    if (err instanceof pyodide.ffi.PythonError) {
      clearNamespace(globals);
      // O que foi gravado antes do erro também é mostrado.
      sendOutputFiles();
      postMessage({ type: "error", text: cleanTraceback(err.message) });
    } else {
      // Falha do próprio interpretador (WebAssembly): só recriando o worker.
      postMessage({ type: "crash", text: String(err.message || err) });
    }
  }
}

const ready = init().catch((err) => {
  postMessage({ type: "fatal", text: String(err.message || err) });
});

onmessage = async (event) => {
  if (event.data.type !== "run") return;
  await ready;
  if (pyodide) run(event.data.code, event.data.files ?? []);
};
