"use strict";

/* ============================================================
   Álbum — visualizador local de fotos/vídeos
   Puro HTML/CSS/JS. Lê uma pasta via File System Access API,
   extrai a data (EXIF → nome do arquivo → data de modificação)
   e guarda legenda + história num arquivo album.json na pasta.
   ============================================================ */

const IMAGE_EXT = new Set(["jpg","jpeg","png","gif","webp","bmp","avif","heic","heif"]);
const VIDEO_EXT = new Set(["mp4","webm","mov","m4v","ogv","ogg"]);
// Formatos que o navegador normalmente NÃO consegue exibir, mas cuja data ainda lemos:
const UNVIEWABLE = new Set(["heic","heif"]);
const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                   "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DATA_FILE = "album.json";

let dirHandle = null;          // pasta escolhida
let items = [];                // todos os itens de mídia
let data = { version: 1, items: {} };  // conteúdo do album.json
let dirty = false;             // há mudanças não salvas?
let saveTimer = null;
let currentIndex = -1;         // item aberto no lightbox
let filtered = [];             // itens visíveis com os filtros atuais

/* ---------- Persistência do "handle" da pasta (IndexedDB) ---------- */
const HandleStore = {
  db: null,
  open() {
    return new Promise((res) => {
      const r = indexedDB.open("album-viewer", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("handles");
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => res();
    });
  },
  async get() {
    if (!this.db) await this.open();
    return new Promise((res) => {
      if (!this.db) return res(null);
      const t = this.db.transaction("handles", "readonly").objectStore("handles").get("dir");
      t.onsuccess = () => res(t.result || null);
      t.onerror = () => res(null);
    });
  },
  async set(handle) {
    if (!this.db) await this.open();
    if (!this.db) return;
    this.db.transaction("handles", "readwrite").objectStore("handles").put(handle, "dir");
  },
};

/* ---------- Utilidades ---------- */
const $ = (sel) => document.querySelector(sel);
const extOf = (name) => name.slice(name.lastIndexOf(".") + 1).toLowerCase();
const stripAccents = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function isoFromDate(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function localDate(iso) {           // evita o "off-by-one" de fuso ao ler YYYY-MM-DD
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatDatePt(iso) {
  if (!iso) return "sem data";
  const d = localDate(iso);
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

/* ---------- Resolução da data de uma foto/vídeo ---------- */
function dateFromFilename(name) {
  // Cobre padrões comuns: IMG_20240315..., 2024-03-15, 2024_03_15, VID-20240315-WA
  const m = name.match(/(20\d{2})[-_.]?(0[1-9]|1[0-2])[-_.]?(0[1-9]|[12]\d|3[01])/);
  if (!m) return null;
  const [_, y, mo, d] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  return isNaN(dt) ? null : dt;
}

async function resolveDate(file, name, isImage) {
  // 1) EXIF (só faz sentido para imagens)
  if (isImage) {
    try {
      const exif = await exifr.parse(file, ["DateTimeOriginal", "CreateDate", "ModifyDate"]);
      const dt = exif && (exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate);
      if (dt instanceof Date && !isNaN(dt)) return { iso: isoFromDate(dt), source: "exif" };
    } catch (_) { /* sem EXIF legível */ }
  }
  // 2) Nome do arquivo
  const fromName = dateFromFilename(name);
  if (fromName) return { iso: isoFromDate(fromName), source: "filename" };
  // 3) Data de modificação do arquivo
  return { iso: isoFromDate(new Date(file.lastModified)), source: "modified" };
}

const SOURCE_LABEL = {
  exif: "data da foto (EXIF)",
  filename: "data pelo nome do arquivo",
  modified: "data de modificação do arquivo",
  manual: "data ajustada por você",
};

/* ---------- Ler a pasta (recursivo) ---------- */
async function* walk(handle, prefix = "") {
  for await (const entry of handle.values()) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.kind === "file") {
      yield { handle: entry, path };
    } else if (entry.kind === "directory" && prefix.split("/").length < 5) {
      yield* walk(entry, path);
    }
  }
}

async function loadFolder(handle) {
  dirHandle = handle;
  $("#folder-name").textContent = handle.name || "Álbum";
  setSaveState("Lendo pasta…");

  // Carrega o album.json existente, se houver
  data = { version: 1, items: {} };
  try {
    const fh = await handle.getFileHandle(DATA_FILE);
    const txt = await (await fh.getFile()).text();
    const parsed = JSON.parse(txt);
    if (parsed && parsed.items) data = parsed;
  } catch (_) { /* ainda não existe */ }

  // Enumera mídias
  items = [];
  for await (const { handle: fh, path } of walk(handle)) {
    const ext = extOf(path);
    const isImage = IMAGE_EXT.has(ext);
    const isVideo = VIDEO_EXT.has(ext);
    if (!isImage && !isVideo) continue;
    items.push({ path, handle: fh, ext, isImage, isVideo, url: null, meta: data.items[path] || null });
  }

  // Resolve datas que ainda não estão no album.json (em lotes, sem travar a UI)
  let resolvedNew = false;
  const BATCH = 8;
  for (let i = 0; i < items.length; i += BATCH) {
    const slice = items.slice(i, i + BATCH);
    await Promise.all(slice.map(async (it) => {
      if (it.meta && it.meta.date) return;                 // já temos data salva
      const file = await it.handle.getFile();
      const { iso, source } = await resolveDate(file, it.path, it.isImage);
      it.meta = Object.assign({ caption: "", note: "", tags: [] }, it.meta, { date: iso, dateSource: source });
      data.items[it.path] = it.meta;
      resolvedNew = true;
    }));
    setSaveState(`Lendo datas… ${Math.min(i + BATCH, items.length)}/${items.length}`);
  }
  // Garante meta em todos
  for (const it of items) {
    if (!it.meta) { it.meta = { caption: "", note: "", tags: [], date: "", dateSource: "" }; data.items[it.path] = it.meta; }
  }

  if (resolvedNew) { dirty = true; await saveNow(); } else { setSaveState(""); }

  buildFilters();
  applyFilters();
  showApp();
}

/* ---------- Salvar album.json ---------- */
function scheduleSave() {
  dirty = true;
  setSaveState("Salvando…");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 600);
}
async function saveNow() {
  if (!dirHandle || !dirty) return;
  try {
    const fh = await dirHandle.getFileHandle(DATA_FILE, { create: true });
    const w = await fh.createWritable();
    await w.write(JSON.stringify(data, null, 2));
    await w.close();
    dirty = false;
    setSaveState("Salvo");
    setTimeout(() => { if (!dirty) setSaveState(""); }, 1500);
  } catch (err) {
    console.error(err);
    setSaveState("Erro ao salvar");
  }
}
function setSaveState(t) { $("#save-state").textContent = t; }
// Salva ao fechar/atualizar a aba, se restou algo pendente
window.addEventListener("beforeunload", (e) => { if (dirty) { saveNow(); } });

/* ---------- Filtros ---------- */
function buildFilters() {
  const years = new Set(), tags = new Set();
  for (const it of items) {
    if (it.meta.date) years.add(it.meta.date.slice(0, 4));
    (it.meta.tags || []).forEach((t) => tags.add(t));
  }
  const yearSel = $("#filter-year");
  yearSel.innerHTML = `<option value="">Todos os anos</option>` +
    [...years].sort((a, b) => b - a).map((y) => `<option value="${y}">${y}</option>`).join("");

  const monthSel = $("#filter-month");
  monthSel.innerHTML = `<option value="">Todos os meses</option>` +
    MONTHS_PT.map((m, i) => `<option value="${i + 1}">${m}</option>`).join("");

  const tagSel = $("#filter-tag");
  tagSel.innerHTML = `<option value="">Todos os marcadores</option>` +
    [...tags].sort().map((t) => `<option value="${t}">${t}</option>`).join("");
}

function applyFilters() {
  const y = $("#filter-year").value;
  const mo = $("#filter-month").value;
  const tag = $("#filter-tag").value;
  const q = stripAccents($("#filter-search").value.trim().toLowerCase());
  const sort = $("#filter-sort").value;

  filtered = items.filter((it) => {
    const date = it.meta.date || "";
    if (y && date.slice(0, 4) !== y) return false;
    if (mo && Number(date.slice(5, 7)) !== Number(mo)) return false;
    if (tag && !(it.meta.tags || []).includes(tag)) return false;
    if (q) {
      const hay = stripAccents(`${it.meta.caption} ${it.meta.note} ${it.path}`.toLowerCase());
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    const da = a.meta.date || "", db = b.meta.date || "";
    return sort === "asc" ? da.localeCompare(db) : db.localeCompare(da);
  });

  $("#count").textContent = `${filtered.length} de ${items.length} ${items.length === 1 ? "item" : "itens"}`;
  renderGallery();
}

/* ---------- Galeria (miniaturas com carregamento preguiçoso) ---------- */
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) { loadThumb(e.target); io.unobserve(e.target); }
  }
}, { rootMargin: "300px" });

async function loadThumb(cardEl) {
  const it = filtered[Number(cardEl.dataset.i)];
  if (!it) return;
  const frame = cardEl.querySelector(".card-frame");
  if (UNVIEWABLE.has(it.ext)) {
    frame.innerHTML = `<div class="card-fallback">${it.ext.toUpperCase()}<br>não exibível no navegador</div>`;
    return;
  }
  if (!it.url) it.url = URL.createObjectURL(await it.handle.getFile());
  if (it.isVideo) {
    frame.insertAdjacentHTML("afterbegin",
      `<span class="card-badge">▶ vídeo</span>`);
    const v = document.createElement("video");
    v.src = it.url; v.muted = true; v.playsInline = true; v.preload = "metadata";
    frame.appendChild(v);
  } else {
    const img = document.createElement("img");
    img.src = it.url; img.alt = it.meta.caption || it.path; img.loading = "lazy";
    frame.appendChild(img);
  }
}

function renderGallery() {
  const gal = $("#gallery");
  gal.innerHTML = "";
  $("#empty").hidden = filtered.length > 0;

  filtered.forEach((it, i) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.i = i;
    const hasStory = (it.meta.note || "").trim().length > 0;
    const caption = it.meta.caption || formatDatePt(it.meta.date);
    card.innerHTML = `
      <div class="card-frame">
        ${hasStory ? `<span class="card-story-dot" title="Tem história">”</span>` : ""}
      </div>
      <div class="card-caption ${it.meta.caption ? "" : "is-empty"}">${escapeHtml(caption)}</div>`;
    card.addEventListener("click", () => openLightbox(i));
    gal.appendChild(card);
    io.observe(card);
  });
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* ---------- Lightbox ---------- */
async function openLightbox(i) {
  currentIndex = i;
  const it = filtered[i];
  const stage = $("#lb-stage");
  stage.innerHTML = "";

  if (UNVIEWABLE.has(it.ext)) {
    stage.innerHTML = `<div class="card-fallback">${it.ext.toUpperCase()} não pode ser exibido pelo navegador.<br>A data e a história funcionam normalmente.</div>`;
  } else {
    if (!it.url) it.url = URL.createObjectURL(await it.handle.getFile());
    if (it.isVideo) {
      const v = document.createElement("video");
      v.src = it.url; v.controls = true; v.autoplay = false;
      stage.appendChild(v);
    } else {
      const img = document.createElement("img");
      img.src = it.url; img.alt = it.meta.caption || it.path;
      stage.appendChild(img);
    }
  }

  $("#lb-date").textContent = formatDatePt(it.meta.date);
  $("#edit-caption").value = it.meta.caption || "";
  $("#edit-note").value = it.meta.note || "";
  $("#edit-date").value = it.meta.date || "";
  $("#date-source").textContent = SOURCE_LABEL[it.meta.dateSource] || "";
  $("#edit-tags").value = (it.meta.tags || []).join(", ");
  $("#lb-filename").textContent = it.path;

  $("#lightbox").hidden = false;
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  $("#lightbox").hidden = true;
  document.body.style.overflow = "";
  currentIndex = -1;
}
function navLightbox(step) {
  const next = currentIndex + step;
  if (next >= 0 && next < filtered.length) openLightbox(next);
}

/* Edição dos campos → atualiza meta e agenda salvamento */
function bindEditors() {
  const cur = () => (currentIndex >= 0 ? filtered[currentIndex] : null);

  $("#edit-caption").addEventListener("input", (e) => {
    const it = cur(); if (!it) return;
    it.meta.caption = e.target.value; scheduleSave();
  });
  $("#edit-note").addEventListener("input", (e) => {
    const it = cur(); if (!it) return;
    it.meta.note = e.target.value; scheduleSave();
  });
  $("#edit-date").addEventListener("change", (e) => {
    const it = cur(); if (!it || !e.target.value) return;
    it.meta.date = e.target.value; it.meta.dateSource = "manual";
    $("#lb-date").textContent = formatDatePt(it.meta.date);
    $("#date-source").textContent = SOURCE_LABEL.manual;
    buildFilters(); scheduleSave();
  });
  $("#edit-tags").addEventListener("change", (e) => {
    const it = cur(); if (!it) return;
    it.meta.tags = e.target.value.split(",").map((t) => t.trim()).filter(Boolean);
    buildFilters(); scheduleSave();
  });
}

/* ---------- Fluxo de abertura / permissões ---------- */
function showApp() {
  $("#welcome").hidden = true;
  $("#topbar").hidden = false;
  $("#gallery").hidden = false;
}

async function pickFolder() {
  try {
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    await HandleStore.set(handle);
    await loadFolder(handle);
  } catch (err) {
    if (err && err.name !== "AbortError") console.error(err);
  }
}

async function verifyPermission(handle) {
  const opts = { mode: "readwrite" };
  if ((await handle.queryPermission(opts)) === "granted") return true;
  if ((await handle.requestPermission(opts)) === "granted") return true;
  return false;
}

async function reopenLast() {
  const handle = await HandleStore.get();
  if (!handle) return;
  if (await verifyPermission(handle)) await loadFolder(handle);
}

/* ---------- Inicialização ---------- */
async function init() {
  bindEditors();

  $("#pick-folder").addEventListener("click", pickFolder);
  $("#change-folder").addEventListener("click", pickFolder);
  $("#reopen-folder").addEventListener("click", reopenLast);

  ["filter-year", "filter-month", "filter-tag", "filter-sort"].forEach((id) =>
    $("#" + id).addEventListener("change", applyFilters));
  $("#filter-search").addEventListener("input", debounce(applyFilters, 200));

  $("#lb-close").addEventListener("click", closeLightbox);
  $("#lb-prev").addEventListener("click", () => navLightbox(-1));
  $("#lb-next").addEventListener("click", () => navLightbox(1));
  $("#lightbox").addEventListener("click", (e) => { if (e.target.id === "lightbox") closeLightbox(); });
  document.addEventListener("keydown", (e) => {
    if ($("#lightbox").hidden) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowLeft") navLightbox(-1);
    else if (e.key === "ArrowRight") navLightbox(1);
  });

  // Suporte do navegador
  if (!window.showDirectoryPicker) {
    $("#pick-folder").disabled = true;
    if (location.protocol === "file:") {
      $("#welcome-hint").innerHTML =
        "Você abriu o app com dois cliques (endereço <code>file://</code>). O Chrome não " +
        "libera acesso a pastas assim. Rode o atalho <b>iniciar</b> da sua pasta (ou " +
        "<code>python server.py</code>) e abra <code>http://localhost:8000</code>. " +
        "Veja o LEIA-ME.txt.";
    } else {
      $("#welcome-hint").textContent =
        "Este navegador não permite ler pastas. Use o Google Chrome ou o Microsoft Edge no computador.";
    }
    return;
  }

  // Oferece reabrir a última pasta
  const last = await HandleStore.get();
  if (last) {
    const btn = $("#reopen-folder");
    btn.hidden = false;
    btn.textContent = `Reabrir “${last.name}”`;
  }
}

function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

init();
