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
let selectMode = false;        // modo de seleção em lote ativo?
const selected = new Set();    // caminhos das fotos selecionadas
let favOnly = false;           // filtro "só favoritas"
let onThisDay = false;         // modo "Neste dia"
let openingSnapshot = null;    // conteúdo do album.json ao abrir a pasta (para backup)
let sessionEdited = false;     // o usuário editou algo nesta sessão?
let backupDoneThisSession = false;
const BACKUP_KEEP = 3;         // quantas cópias de segurança manter
const BACKUP_DIR = ".album-backups";
let ssList = [], ssIndex = -1, ssTimer = null, ssIdleTimer = null;
let ssPlaying = true, ssInterval = 5000;
const SS_SPEEDS = [3000, 5000, 8000];

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
const fileSig = (file) => `${file.size}-${file.lastModified}`;   // assinatura: tamanho + data de modificação
function pushMap(map, key, val) {
  const arr = map.get(key);
  if (arr) arr.push(val); else map.set(key, [val]);
}

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
function monthKey(iso) { return iso ? iso.slice(0, 7) : ""; }   // "2024-03" agrupa por mês/ano
function monthLabel(iso) {
  if (!iso) return "Sem data";
  const s = localDate(iso).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);                // "Março de 2024"
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
    if (entry.name.startsWith(".")) continue;         // ignora ocultos (ex.: .album-backups)
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
  openingSnapshot = null;
  sessionEdited = false;
  backupDoneThisSession = false;
  try {
    const fh = await handle.getFileHandle(DATA_FILE);
    const txt = await (await fh.getFile()).text();
    openingSnapshot = txt;                 // guarda o estado original para backup
    const parsed = JSON.parse(txt);
    if (parsed && parsed.items) data = parsed;
  } catch (_) { /* ainda não existe */ }

  // Enumera mídias (só a lista; assinatura vem em seguida)
  const files = [];
  for await (const { handle: fh, path } of walk(handle)) {
    const ext = extOf(path);
    const isImage = IMAGE_EXT.has(ext);
    const isVideo = VIDEO_EXT.has(ext);
    if (!isImage && !isVideo) continue;
    files.push({ path, handle: fh, ext, isImage, isVideo });
  }

  const BATCH = 12;
  // Passo 1: lê tamanho + data de modificação de cada arquivo (assinatura)
  for (let i = 0; i < files.length; i += BATCH) {
    const slice = files.slice(i, i + BATCH);
    await Promise.all(slice.map(async (f) => { f.file = await f.handle.getFile(); f.sig = fileSig(f.file); }));
    setSaveState(`Lendo pasta… ${Math.min(i + BATCH, files.length)}/${files.length}`);
  }

  // Passo 2: religa metadados órfãos (arquivo renomeado/movido) por assinatura.
  // Só religa quando o par é 1-para-1 (uma órfã e um novo com a mesma assinatura),
  // evitando trocar histórias entre arquivos idênticos.
  const currentPaths = new Set(files.map((f) => f.path));
  const orphanBySig = new Map();
  for (const [p, m] of Object.entries(data.items)) {
    if (!currentPaths.has(p) && m && m.sig) pushMap(orphanBySig, m.sig, p);
  }
  const newBySig = new Map();
  for (const f of files) {
    if (!data.items[f.path]) pushMap(newBySig, f.sig, f.path);
  }
  let relinked = 0;
  for (const [sig, newPaths] of newBySig) {
    const orphans = orphanBySig.get(sig);
    if (newPaths.length === 1 && orphans && orphans.length === 1) {
      data.items[newPaths[0]] = data.items[orphans[0]];   // move a história para o novo nome
      delete data.items[orphans[0]];
      relinked++;
    }
  }

  // Passo 3: associa meta a cada arquivo, resolve datas faltantes e atualiza a assinatura
  items = new Array(files.length);
  let resolvedNew = relinked > 0;
  for (let i = 0; i < files.length; i += BATCH) {
    const slice = files.slice(i, i + BATCH);
    await Promise.all(slice.map(async (f, k) => {
      let meta = data.items[f.path];
      if (!meta) { meta = { caption: "", note: "", tags: [] }; data.items[f.path] = meta; }
      if (!meta.date) {
        const { iso, source } = await resolveDate(f.file, f.path, f.isImage);
        meta.date = iso; meta.dateSource = source; resolvedNew = true;
      }
      if (meta.sig !== f.sig) { meta.sig = f.sig; resolvedNew = true; }   // grava/atualiza assinatura
      items[i + k] = { path: f.path, handle: f.handle, ext: f.ext, isImage: f.isImage, isVideo: f.isVideo, url: null, meta };
    }));
    setSaveState(`Lendo datas… ${Math.min(i + BATCH, files.length)}/${files.length}`);
  }

  if (resolvedNew) { dirty = true; await saveNow(); }
  if (relinked > 0) {
    setSaveState(`${relinked} ${relinked === 1 ? "foto religada" : "fotos religadas"}`);
    setTimeout(() => { if (!dirty) setSaveState(""); }, 4000);
  } else if (!resolvedNew) {
    setSaveState("");
  }

  buildFilters();
  applyFilters();
  showApp();
}

/* ---------- Salvar album.json ---------- */
function scheduleSave() {
  dirty = true;
  sessionEdited = true;          // houve edição do usuário → habilita backup
  setSaveState("Salvando…");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 600);
}
async function saveNow() {
  if (!dirHandle || !dirty) return;
  try {
    await maybeBackup();          // faz o backup uma vez por sessão, antes de sobrescrever
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

/* Backup: na primeira edição da sessão, salva o estado original numa subpasta
   oculta (.album-backups) e mantém só as últimas BACKUP_KEEP cópias. */
async function maybeBackup() {
  if (backupDoneThisSession || !sessionEdited || openingSnapshot == null) return;
  try {
    const dir = await dirHandle.getDirectoryHandle(BACKUP_DIR, { create: true });
    const name = `album-${backupStamp()}.json`;
    const fh = await dir.getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    await w.write(openingSnapshot);
    await w.close();
    backupDoneThisSession = true;
    await rotateBackups(dir, BACKUP_KEEP);
  } catch (e) {
    console.warn("Backup não pôde ser criado:", e);
  }
}
async function rotateBackups(dir, keep) {
  const names = [];
  for await (const entry of dir.values()) {
    if (entry.kind === "file" && entry.name.startsWith("album-") && entry.name.endsWith(".json"))
      names.push(entry.name);
  }
  names.sort();                    // nomes com timestamp já ordenam cronologicamente
  while (names.length > keep) {
    const old = names.shift();
    try { await dir.removeEntry(old); } catch (_) {}
  }
}
function backupStamp() {
  const d = new Date(), p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
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

  const allTags = [...tags].sort();
  const tagSel = $("#filter-tag");
  tagSel.innerHTML = `<option value="">Todos os marcadores</option>` +
    allTags.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");

  // Autocomplete (lightbox e lote) + seletor de remoção em lote
  const dl = $("#all-tags");
  if (dl) dl.innerHTML = allTags.map((t) => `<option value="${escapeHtml(t)}"></option>`).join("");
  const untag = $("#batch-untag");
  if (untag) untag.innerHTML = `<option value="">Remover marcador…</option>` +
    allTags.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
}

function applyFilters() {
  const y = $("#filter-year").value;
  const mo = $("#filter-month").value;
  const tag = $("#filter-tag").value;
  const q = stripAccents($("#filter-search").value.trim().toLowerCase());
  const sort = $("#filter-sort").value;
  const todayMD = onThisDay ? isoMonthDay(new Date()) : null;

  // Intervalo De…Até (aceita invertido; ignorado no modo "Neste dia")
  let from = $("#filter-from").value, to = $("#filter-to").value;
  if (from && to && from > to) { const t = from; from = to; to = t; }
  const hasRange = !onThisDay && (from || to);
  $("#filter-range-clear").hidden = !(from || to);

  filtered = items.filter((it) => {
    const date = it.meta.date || "";
    if (onThisDay) {
      if (!date || date.slice(5, 10) !== todayMD) return false;   // mesmo dia/mês, qualquer ano
    } else {
      if (y && date.slice(0, 4) !== y) return false;
      if (mo && Number(date.slice(5, 7)) !== Number(mo)) return false;
      if (hasRange) {
        if (!date) return false;
        if (from && date < from) return false;
        if (to && date > to) return false;
      }
    }
    if (favOnly && !it.meta.fav) return false;
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

  const emptyP = $("#empty").querySelector("p");
  if (onThisDay) {
    const label = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
    $("#count").textContent = filtered.length
      ? `Neste dia · ${label} — ${filtered.length} ${filtered.length === 1 ? "foto" : "fotos"}`
      : `Nada em ${label} de anos anteriores`;
    emptyP.textContent = `Nenhuma foto de ${label} em anos anteriores ainda.`;
  } else {
    $("#count").textContent = `${filtered.length} de ${items.length} ${items.length === 1 ? "item" : "itens"}`;
    emptyP.textContent = "Nenhum item com esses filtros. Ajuste o ano, o mês ou a busca.";
  }
  renderGallery();
}
function isoMonthDay(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())}`;
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

  let lastKey = null;
  filtered.forEach((it, i) => {
    // Cabeçalho: por mês (linha do tempo) ou por ano (modo "Neste dia")
    const iso = it.meta.date;
    const key = onThisDay ? (iso ? iso.slice(0, 4) : "") : monthKey(iso);
    if (key !== lastKey) {
      lastKey = key;
      const h = document.createElement("div");
      h.className = "timeline-header";
      h.dataset.year = iso ? iso.slice(0, 4) : "";
      h.textContent = onThisDay ? (iso ? iso.slice(0, 4) : "Sem data") : monthLabel(iso);
      gal.appendChild(h);
    }

    const card = document.createElement("div");
    card.className = "card" + (selected.has(it.path) ? " selected" : "");
    card.dataset.i = i;
    const hasStory = (it.meta.note || "").trim().length > 0;
    const caption = it.meta.caption || formatDatePt(it.meta.date);
    card.innerHTML = `
      <div class="card-frame">
        <span class="card-check" aria-hidden="true">✓</span>
        ${it.meta.fav ? `<span class="card-fav" title="Favorita">★</span>` : ""}
        ${hasStory ? `<span class="card-story-dot" title="Tem história">”</span>` : ""}
        ${caption ? `<div class="card-cap">${escapeHtml(caption)}</div>` : ""}
      </div>`;
    card.addEventListener("click", () => onCardClick(i));
    gal.appendChild(card);
    io.observe(card);
  });
  buildYearNav();
}

/* ---------- Navegação rápida por ano ---------- */
function buildYearNav() {
  const nav = $("#year-nav");
  const headers = [...$("#gallery").querySelectorAll(".timeline-header")];
  const firstOf = new Map();                 // ano -> primeiro cabeçalho daquele ano
  for (const h of headers) {
    const y = h.dataset.year;
    if (y && !firstOf.has(y)) firstOf.set(y, h);
  }
  const years = [...firstOf.keys()];
  if (onThisDay || years.length < 2) { nav.hidden = true; nav.innerHTML = ""; return; }
  nav.hidden = false;
  nav.innerHTML = years.map((y) => `<button class="yn" data-year="${y}">${y}</button>`).join("");
  nav.querySelectorAll(".yn").forEach((b) => {
    b.addEventListener("click", () =>
      firstOf.get(b.dataset.year).scrollIntoView({ behavior: "smooth", block: "start" }));
  });
  updateYearSpy();
}
function updateYearSpy() {
  const nav = $("#year-nav");
  if (nav.hidden) return;
  const headers = [...$("#gallery").querySelectorAll(".timeline-header")];
  let active = null;
  for (const h of headers) {
    if (h.getBoundingClientRect().top <= 100) active = h.dataset.year; else break;
  }
  nav.querySelectorAll(".yn").forEach((b) => b.classList.toggle("active", b.dataset.year === active));
}

/* ---------- Exportar álbum (HTML autônomo) ---------- */
async function imageToDataURL(file, maxSide = 1400, quality = 0.82) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d").drawImage(bmp, 0, 0, w, h);
  if (bmp.close) bmp.close();
  return canvas.toDataURL("image/jpeg", quality);
}

async function exportAlbum() {
  const list = filtered.filter((it) => it.isImage && !UNVIEWABLE.has(it.ext));
  const skipped = filtered.length - list.length;
  if (list.length === 0) { alert("Não há fotos exibíveis no conjunto atual para exportar."); return; }
  if (list.length > 300 &&
      !confirm(`Você vai exportar ${list.length} fotos. O arquivo pode ficar grande (dezenas de MB). Continuar?`)) return;

  const btn = $("#export-btn"); btn.disabled = true;
  const ov = $("#export-overlay"); ov.hidden = false;
  const setMsg = (m) => { $("#export-msg").textContent = m; };

  const parts = [];
  let lastKey = null, done = 0, made = 0;
  let coverFirst = "", coverFav = "";
  for (const it of list) {
    done++;
    setMsg(`Preparando fotos… ${done}/${list.length}`);
    let dataURL;
    try { dataURL = await imageToDataURL(await it.handle.getFile()); }
    catch (e) { continue; }                  // pula o que o navegador não decodifica
    if (!coverFirst) coverFirst = dataURL;
    if (it.meta.fav && !coverFav) coverFav = dataURL;
    made++;

    const key = monthKey(it.meta.date);
    if (key !== lastKey) {
      lastKey = key;
      parts.push(`<div class="divider"><span>${escapeHtml(monthLabel(it.meta.date))}</span></div>`);
    }
    const dt  = it.meta.date ? `<p class="d">${escapeHtml(formatDatePt(it.meta.date))}</p>` : "";
    const cap = it.meta.caption ? `<h3>${escapeHtml(it.meta.caption)}</h3>` : "";
    const note = (it.meta.note || "").trim();
    const dropClass = note.length > 90 ? " drop" : "";
    const st  = note ? `<p class="s${dropClass}">${escapeHtml(note).replace(/\n/g, "<br>")}</p>` : "";
    const tg  = (it.meta.tags && it.meta.tags.length)
      ? `<p class="t">${it.meta.tags.map((t) => `<span>#${escapeHtml(t)}</span>`).join("")}</p>` : "";
    parts.push(`<figure><img loading="lazy" src="${dataURL}"><figcaption>${dt}${cap}${st}${tg}</figcaption></figure>`);
  }

  // Período coberto (menor e maior data) para o subtítulo
  const dates = list.map((it) => it.meta.date).filter(Boolean).sort();
  const range = dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null;

  setMsg("Gerando arquivo…");
  const html = buildExportHtml(parts.join("\n"), made, skipped, {
    cover: coverFav || coverFirst,
    range,
  });
  const blob = new Blob([html], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = exportFilename();
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);

  ov.hidden = true; btn.disabled = false;
}

function exportFilename() {
  const base = ("album-" + (dirHandle && dirHandle.name ? dirHandle.name : "")).replace(/[^\w.-]+/g, "-").replace(/-+/g, "-");
  const d = new Date(), p = (n) => String(n).padStart(2, "0");
  return `${base}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.html`;
}

function buildExportHtml(body, count, skipped, opts = {}) {
  const title = (dirHandle && dirHandle.name) ? dirHandle.name : "Álbum";
  const when = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  const mLong = (iso) => {
    const s = localDate(iso).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  let period = "";
  if (opts.range) {
    const a = mLong(opts.range.from), b = mLong(opts.range.to);
    period = (a === b) ? a : `${a} – ${b}`;
  }
  const sub = `${period ? period + " · " : ""}${count} ${count === 1 ? "foto" : "fotos"}`;
  const skipNote = skipped > 0
    ? `<p class="note">${skipped} ${skipped === 1 ? "item não pôde" : "itens não puderam"} entrar (vídeos ou HEIC).</p>` : "";
  const cover = opts.cover
    ? `<section class="cover" style="background-image:url('${opts.cover}')"><div class="cover-inner">
         <h1>${escapeHtml(title)}</h1><p class="sub">${escapeHtml(sub)}</p></div></section>`
    : `<section class="cover cover-plain"><div class="cover-inner">
         <h1>${escapeHtml(title)}</h1><p class="sub">${escapeHtml(sub)}</p></div></section>`;

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root{--paper:#F3F1EA;--card:#FBFAF6;--ink:#26231F;--soft:#6B655C;--line:#E3DFD5;
    --accent:#4F7A6F;--gold:#C98A3C;
    --sans:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;}
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased}

  .cover{position:relative;min-height:88vh;display:flex;flex-direction:column;justify-content:flex-end;
    color:#fff;background-size:cover;background-position:center}
  .cover-plain{background:linear-gradient(150deg,var(--accent),#365951)}
  .cover::after{content:"";position:absolute;inset:0;
    background:linear-gradient(to top,rgba(18,16,14,.85) 0%,rgba(18,16,14,.12) 55%,rgba(18,16,14,.4) 100%)}
  .cover-inner{position:relative;z-index:1;width:100%;max-width:820px;margin:0 auto;padding:3rem 2rem 3.6rem}
  .cover h1{font-family:var(--serif);font-weight:500;font-size:clamp(2.5rem,7vw,4.4rem);line-height:1.04;
    letter-spacing:-.015em;margin:0 0 .6rem;text-shadow:0 2px 24px rgba(0,0,0,.35)}
  .cover .sub{font-size:1rem;letter-spacing:.05em;color:#ece5d8;margin:0}

  .wrap{max-width:750px;margin:0 auto;padding:3.6rem 1.4rem 2rem}
  .note{color:var(--soft);font-size:.82rem;text-align:center;margin:0 0 2rem}

  .divider{display:flex;align-items:center;gap:1.1rem;margin:3.4rem 0 2rem}
  .divider::before,.divider::after{content:"";flex:1;height:1px;background:var(--line)}
  .divider span{font-family:var(--serif);font-size:1.15rem;letter-spacing:.02em;white-space:nowrap;color:var(--ink)}
  .divider:first-child{margin-top:0}

  figure{margin:0 0 3.4rem}
  figure img{width:100%;height:auto;max-height:84vh;object-fit:contain;display:block;
    border-radius:8px;background:var(--card);box-shadow:0 12px 36px rgba(38,35,31,.16)}
  figcaption{padding:1.15rem .2rem 0}
  figcaption .d{color:var(--accent);font-size:.72rem;font-weight:700;letter-spacing:.1em;
    text-transform:uppercase;margin:0 0 .35rem}
  figcaption h3{font-family:var(--serif);font-weight:600;font-size:1.4rem;line-height:1.2;margin:0 0 .55rem}
  figcaption .s{font-family:var(--serif);font-size:1.08rem;line-height:1.72;text-align:justify;
    hyphens:auto;margin:0 0 .8rem;color:#332f29}
  figcaption .s.drop::first-letter{float:left;font-family:var(--serif);font-weight:600;color:var(--accent);
    font-size:3.2rem;line-height:.78;padding:.12rem .55rem 0 0}
  figcaption .t{display:flex;flex-wrap:wrap;gap:.4rem;margin:0}
  figcaption .t span{font-size:.72rem;color:var(--soft);background:var(--card);
    border:1px solid var(--line);border-radius:999px;padding:.16rem .62rem}

  footer{text-align:center;color:var(--soft);font-size:.82rem;padding:1.5rem 1rem 3.5rem}
  footer .g{color:var(--gold)}

  @media print{
    body{background:#fff}
    .cover{min-height:100vh;page-break-after:always}
    figure{page-break-inside:avoid}
    .divider{page-break-after:avoid}
  }
</style></head>
<body>
${cover}
<div class="wrap">
${skipNote}
<main>${body}</main>
<footer>Feito com <span class="g">&#9829;</span> · exportado em ${when}</footer>
</div>
</body></html>`;
}

/* ---------- Modo apresentação (slideshow) ---------- */
async function ensureUrl(it) {
  if (!it.url) it.url = URL.createObjectURL(await it.handle.getFile());
  return it.url;
}
function openSlideshow() {
  ssList = filtered.filter((it) => it.isVideo || (it.isImage && !UNVIEWABLE.has(it.ext)));
  if (!ssList.length) { alert("Não há fotos ou vídeos exibíveis para apresentar no conjunto atual."); return; }
  ssPlaying = true;
  $("#ss-play").textContent = "⏸";
  $("#ss-speed").textContent = (ssInterval / 1000) + "s";
  $("#slideshow").hidden = false;
  document.body.style.overflow = "hidden";
  ssActivity();
  showSlide(0);
}
function closeSlideshow() {
  clearTimeout(ssTimer); clearTimeout(ssIdleTimer);
  const v = $("#ss-stage video"); if (v) v.pause();
  $("#ss-stage").innerHTML = "";
  $("#slideshow").hidden = true;
  document.body.style.overflow = "";
  if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (_) {} }
}
async function showSlide(i) {
  if (!ssList.length) return;
  ssIndex = (i + ssList.length) % ssList.length;
  const token = ssIndex;
  const it = ssList[ssIndex];
  clearTimeout(ssTimer);

  $("#ss-date").textContent = it.meta.date ? formatDatePt(it.meta.date) : "";
  $("#ss-title").textContent = it.meta.caption || "";
  $("#ss-story").textContent = it.meta.note || "";
  $("#ss-caption").style.display = (it.meta.caption || it.meta.note || it.meta.date) ? "" : "none";
  $("#ss-progress").textContent = `${ssIndex + 1} / ${ssList.length}`;

  const stage = $("#ss-stage");
  const url = await ensureUrl(it);
  if (token !== ssIndex) return;              // usuário já avançou; descarta
  stage.innerHTML = "";
  if (it.isVideo) {
    const v = document.createElement("video");
    v.src = url; v.className = "ss-media"; v.autoplay = true; v.playsInline = true; v.controls = false;
    v.addEventListener("ended", () => { if (ssPlaying) ssNext(); });
    stage.appendChild(v);
    v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
  } else {
    const img = document.createElement("img");
    img.src = url; img.className = "ss-media kb";
    img.style.setProperty("--dur", (ssInterval / 1000) + "s");
    stage.appendChild(img);
    if (ssPlaying) ssTimer = setTimeout(ssNext, ssInterval);
  }
}
function ssNext() { showSlide(ssIndex + 1); }
function ssPrev() { showSlide(ssIndex - 1); }
function ssSetPlaying(on) {
  ssPlaying = on;
  $("#ss-play").textContent = on ? "⏸" : "▶";
  clearTimeout(ssTimer);
  const v = $("#ss-stage video");
  if (on) {
    if (v) v.play().catch(() => {});
    else if (ssList[ssIndex] && ssList[ssIndex].isImage) ssTimer = setTimeout(ssNext, ssInterval);
  } else if (v) { v.pause(); }
}
function ssCycleSpeed() {
  ssInterval = SS_SPEEDS[(SS_SPEEDS.indexOf(ssInterval) + 1) % SS_SPEEDS.length];
  $("#ss-speed").textContent = (ssInterval / 1000) + "s";
  if (ssPlaying && ssList[ssIndex] && ssList[ssIndex].isImage) {
    clearTimeout(ssTimer); ssTimer = setTimeout(ssNext, ssInterval);
  }
}
function ssFullscreen() {
  const el = $("#slideshow");
  if (!document.fullscreenElement) { if (el.requestFullscreen) el.requestFullscreen().catch(() => {}); }
  else if (document.exitFullscreen) document.exitFullscreen();
}
function ssActivity() {
  const el = $("#slideshow");
  el.classList.add("active");
  clearTimeout(ssIdleTimer);
  ssIdleTimer = setTimeout(() => el.classList.remove("active"), 3000);
}
function ssKeydown(e) {
  if ($("#slideshow").hidden) return;
  if (e.key === "Escape") closeSlideshow();
  else if (e.key === "ArrowRight") { ssNext(); ssActivity(); }
  else if (e.key === "ArrowLeft") { ssPrev(); ssActivity(); }
  else if (e.key === " ") { e.preventDefault(); ssSetPlaying(!ssPlaying); ssActivity(); }
  else if (e.key === "f" || e.key === "F") ssFullscreen();
}

/* ---------- Seleção em lote ---------- */
function onCardClick(i) {
  if (selectMode) toggleSelect(i);
  else openLightbox(i);
}
function toggleSelect(i) {
  const it = filtered[i];
  if (!it) return;
  if (selected.has(it.path)) selected.delete(it.path);
  else selected.add(it.path);
  const card = $(`#gallery .card[data-i="${i}"]`);
  if (card) card.classList.toggle("selected", selected.has(it.path));
  updateBatchBar();
}
function setSelectMode(on) {
  selectMode = on;
  $("#gallery").classList.toggle("selecting", on);
  const btn = $("#select-toggle");
  btn.textContent = on ? "Cancelar" : "Selecionar";
  btn.classList.toggle("active", on);
  if (!on) { selected.clear(); renderGallery(); }
  updateBatchBar();
}
function updateBatchBar() {
  const n = selected.size;
  $("#batch-bar").hidden = !(selectMode && n > 0);
  $("#batch-count").textContent = `${n} ${n === 1 ? "selecionada" : "selecionadas"}`;
}
function selectedItems() { return items.filter((it) => selected.has(it.path)); }

function batchAddTag() {
  const tags = $("#batch-tag").value.split(",").map((t) => t.trim()).filter(Boolean);
  if (!tags.length) return;
  for (const it of selectedItems()) {
    it.meta.tags = it.meta.tags || [];
    for (const t of tags) if (!it.meta.tags.includes(t)) it.meta.tags.push(t);
  }
  $("#batch-tag").value = "";
  buildFilters(); applyFilters(); scheduleSave();
}
function batchRemoveTag() {
  const t = $("#batch-untag").value;
  if (!t) return;
  for (const it of selectedItems()) {
    if (it.meta.tags) it.meta.tags = it.meta.tags.filter((x) => x !== t);
  }
  buildFilters(); applyFilters(); scheduleSave();
}
function batchSetDate() {
  const d = $("#batch-date").value;
  if (!d) return;
  for (const it of selectedItems()) { it.meta.date = d; it.meta.dateSource = "manual"; }
  buildFilters(); applyFilters(); scheduleSave();
}

/* ---------- Excluir arquivos (permanente) ---------- */
async function deleteFileByPath(path) {
  const segs = path.split("/");
  const name = segs.pop();
  let dir = dirHandle;
  for (const s of segs) dir = await dir.getDirectoryHandle(s);   // navega até a subpasta
  await dir.removeEntry(name);                                   // apaga o arquivo do disco
}
function removeItemsByPaths(paths) {
  const set = paths instanceof Set ? paths : new Set(paths);
  for (const p of set) {
    const it = items.find((x) => x.path === p);
    if (it && it.url) { try { URL.revokeObjectURL(it.url); } catch (_) {} }
    delete data.items[p];
  }
  items = items.filter((x) => !set.has(x.path));
}
async function deleteCurrent() {
  const it = currentIndex >= 0 ? filtered[currentIndex] : null;
  if (!it) return;
  if (!confirm(`Excluir PERMANENTEMENTE esta foto do computador?\n\n${it.path}\n\n` +
               `O arquivo NÃO vai para a Lixeira e não há como desfazer.`)) return;
  try {
    await deleteFileByPath(it.path);
  } catch (e) {
    alert("Não foi possível excluir o arquivo:\n" + (e && e.message ? e.message : e));
    return;
  }
  const oldIndex = currentIndex;
  removeItemsByPaths([it.path]);
  dirty = true; sessionEdited = true; await saveNow();
  buildFilters(); applyFilters();
  if (filtered.length) openLightbox(Math.min(oldIndex, filtered.length - 1));
  else closeLightbox();
}
async function batchDelete() {
  const paths = [...selected];
  if (!paths.length) return;
  if (!confirm(`Excluir PERMANENTEMENTE ${paths.length} ${paths.length === 1 ? "arquivo" : "arquivos"} do computador?\n\n` +
               `Eles NÃO vão para a Lixeira e não há como desfazer.`)) return;

  const ov = $("#export-overlay"); ov.hidden = false;
  const setMsg = (m) => { $("#export-msg").textContent = m; };
  const deleted = [];
  let ok = 0, fail = 0, i = 0;
  for (const p of paths) {
    i++; setMsg(`Excluindo… ${i}/${paths.length}`);
    try { await deleteFileByPath(p); deleted.push(p); ok++; }
    catch (e) { fail++; }
  }
  removeItemsByPaths(deleted);
  for (const p of deleted) selected.delete(p);
  dirty = true; sessionEdited = true; await saveNow();
  ov.hidden = true;
  buildFilters(); applyFilters(); updateBatchBar();
  if (fail) alert(`${ok} excluída(s). ${fail} não puderam ser excluída(s).`);
  if (selected.size === 0) setSelectMode(false);
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
  updateFavUI(!!it.meta.fav);

  $("#lightbox").hidden = false;
  document.body.style.overflow = "hidden";
}

function toggleFav() {
  const it = currentIndex >= 0 ? filtered[currentIndex] : null;
  if (!it) return;
  it.meta.fav = !it.meta.fav;
  updateFavUI(it.meta.fav);
  // atualiza a estrela no cartão correspondente sem re-renderizar tudo
  const card = $(`#gallery .card[data-i="${currentIndex}"] .card-frame`);
  if (card) {
    const existing = card.querySelector(".card-fav");
    if (it.meta.fav && !existing) {
      const s = document.createElement("span");
      s.className = "card-fav"; s.title = "Favorita"; s.textContent = "★";
      card.appendChild(s);
    } else if (!it.meta.fav && existing) {
      existing.remove();
    }
  }
  if (favOnly) applyFilters();     // se estiver filtrando favoritas, some da lista na hora
  scheduleSave();
}
function updateFavUI(on) {
  const b = $("#fav-toggle");
  b.textContent = on ? "★" : "☆";
  b.classList.toggle("active", on);
  b.setAttribute("aria-pressed", on ? "true" : "false");
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
  $("#filter-from").addEventListener("change", applyFilters);
  $("#filter-to").addEventListener("change", applyFilters);
  $("#filter-range-clear").addEventListener("click", () => {
    $("#filter-from").value = ""; $("#filter-to").value = ""; applyFilters();
  });

  // Favoritas e "Neste dia"
  $("#filter-fav").addEventListener("click", () => {
    favOnly = !favOnly;
    $("#filter-fav").classList.toggle("active", favOnly);
    applyFilters();
  });
  $("#filter-today").addEventListener("click", () => {
    onThisDay = !onThisDay;
    $("#filter-today").classList.toggle("active", onThisDay);
    $("#filter-year").disabled = onThisDay;     // ano/mês não se aplicam nesse modo
    $("#filter-month").disabled = onThisDay;
    $("#filter-from").disabled = onThisDay;
    $("#filter-to").disabled = onThisDay;
    applyFilters();
  });
  $("#fav-toggle").addEventListener("click", toggleFav);
  $("#delete-btn").addEventListener("click", deleteCurrent);
  $("#batch-delete").addEventListener("click", batchDelete);
  $("#export-btn").addEventListener("click", exportAlbum);
  window.addEventListener("scroll", throttle(updateYearSpy, 150), { passive: true });

  // Modo apresentação (slideshow)
  $("#present-btn").addEventListener("click", openSlideshow);
  $("#ss-close").addEventListener("click", closeSlideshow);
  $("#ss-prev").addEventListener("click", () => { ssPrev(); ssActivity(); });
  $("#ss-next").addEventListener("click", () => { ssNext(); ssActivity(); });
  $("#ss-play").addEventListener("click", () => { ssSetPlaying(!ssPlaying); ssActivity(); });
  $("#ss-speed").addEventListener("click", () => { ssCycleSpeed(); ssActivity(); });
  $("#ss-full").addEventListener("click", ssFullscreen);
  $("#ss-stage").addEventListener("click", () => { ssNext(); ssActivity(); });
  $("#slideshow").addEventListener("mousemove", ssActivity);
  document.addEventListener("keydown", ssKeydown);

  // Seleção em lote
  $("#select-toggle").addEventListener("click", () => setSelectMode(!selectMode));
  $("#batch-add-tag").addEventListener("click", batchAddTag);
  $("#batch-tag").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); batchAddTag(); } });
  $("#batch-untag").addEventListener("change", batchRemoveTag);
  $("#batch-set-date").addEventListener("click", batchSetDate);
  $("#batch-clear").addEventListener("click", () => { selected.clear(); renderGallery(); updateBatchBar(); });
  $("#batch-done").addEventListener("click", () => setSelectMode(false));

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
function throttle(fn, ms) {
  let last = 0, id;
  return (...a) => {
    const now = Date.now(), rem = ms - (now - last);
    if (rem <= 0) { last = now; fn(...a); }
    else { clearTimeout(id); id = setTimeout(() => { last = Date.now(); fn(...a); }, rem); }
  };
}

init();
