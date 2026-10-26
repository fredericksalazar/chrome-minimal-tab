// Cuadrícula de accesos directos: render, diálogo añadir/editar, deshacer y reordenar.
import { MAX_SHORTCUTS, addShortcut, getFolderId, getShortcuts } from "../lib/bookmarks.js";
import { faviconUrl, hostname, normalizeUrl } from "../lib/url.js";
import { ICONS } from "./icons.js";

const $ = (id) => document.getElementById(id);
const grid = $("grid");
const emptyHint = $("empty-hint");
const counter = $("counter");
const dialog = $("shortcut-dialog");
const form = $("shortcut-form");
const dialogTitle = $("dialog-title");
const nameInput = $("name-input");
const urlInput = $("url-input");
const dialogError = $("dialog-error");
const removeButton = $("remove-button");
const toast = $("toast");
const toastText = $("toast-text");
const toastUndo = $("toast-undo");

const TOAST_MS = 6000;

let folderId;
let shortcuts = [];
let editingId = null;
let draggedId = null;
let undoAction = null;
let toastTimer;
let reloadTimer;

async function load() {
  folderId = await getFolderId();
  shortcuts = await getShortcuts(folderId);
  render();
}

function render() {
  const visible = shortcuts.slice(0, MAX_SHORTCUTS);
  const tiles = visible.map(createTile);
  if (visible.length < MAX_SHORTCUTS) tiles.push(createAddTile());
  grid.replaceChildren(...tiles);

  const hidden = shortcuts.length - visible.length;
  counter.textContent = `${visible.length} de ${MAX_SHORTCUTS}${hidden > 0 ? ` (+${hidden} ocultos)` : ""}`;
  emptyHint.hidden = shortcuts.length > 0;
}

function createTile(node) {
  const tile = document.createElement("div");
  tile.className = "tile";
  tile.dataset.id = node.id;
  tile.draggable = true;

  const link = document.createElement("a");
  link.className = "tile-link";
  link.href = node.url;
  link.draggable = false;

  const title = document.createElement("span");
  title.className = "tile-title";
  title.textContent = node.title || hostname(node.url);
  link.append(createIcon(node), title);

  const menu = document.createElement("button");
  menu.className = "tile-menu";
  menu.type = "button";
  menu.title = "Editar acceso directo";
  menu.setAttribute("aria-label", `Editar ${title.textContent}`);
  menu.innerHTML = ICONS.more;
  menu.addEventListener("click", () => openDialog(node));

  tile.append(link, menu);
  return tile;
}

function createAddTile() {
  const tile = document.createElement("div");
  tile.className = "tile";

  const button = document.createElement("button");
  button.className = "tile-link";
  button.type = "button";
  button.innerHTML = `<span class="tile-icon">${ICONS.add}</span><span class="tile-title">Añadir acceso directo</span>`;
  button.addEventListener("click", () => openDialog());

  tile.append(button);
  return tile;
}

// Si el sitio no tiene favicon se muestra su inicial, como hace Google
function createIcon(node) {
  const wrapper = document.createElement("span");
  wrapper.className = "tile-icon";

  const img = document.createElement("img");
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";
  img.src = faviconUrl(node.url, 64);
  const useLetter = () => wrapper.replaceChildren(createLetter(node));
  img.addEventListener("error", useLetter);
  img.addEventListener("load", () => {
    if (img.naturalWidth <= 16) useLetter();
  });

  wrapper.append(img);
  return wrapper;
}

function createLetter(node) {
  const letter = document.createElement("span");
  letter.className = "tile-letter";
  letter.textContent = (node.title || hostname(node.url)).charAt(0).toUpperCase();
  letter.style.background = colorFor(hostname(node.url));
  return letter;
}

function colorFor(text) {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.codePointAt(0)) | 0;
  return `hsl(${Math.abs(hash) % 360} 45% 42%)`;
}

// Diálogo añadir / editar
function openDialog(node = null) {
  editingId = node?.id ?? null;
  dialogTitle.textContent = node ? "Editar acceso directo" : "Añadir acceso directo";
  nameInput.value = node?.title ?? "";
  urlInput.value = node?.url ?? "";
  removeButton.hidden = !node;
  dialogError.textContent = "";
  dialog.showModal();
  nameInput.focus();
}

async function save(title, url) {
  if (editingId) {
    if (shortcuts.some((node) => node.url === url && node.id !== editingId)) return "exists";
    await chrome.bookmarks.update(editingId, { title, url });
    return "saved";
  }
  return addShortcut({ title, url });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = normalizeUrl(urlInput.value);
  if (!url) {
    dialogError.textContent = "Escribe una URL válida.";
    urlInput.focus();
    return;
  }

  try {
    const status = await save(nameInput.value.trim() || hostname(url), url);
    if (status === "exists") {
      dialogError.textContent = "Ese sitio ya está en tus accesos directos.";
    } else if (status === "full") {
      dialogError.textContent = `Has llegado al máximo de ${MAX_SHORTCUTS} accesos directos.`;
    } else {
      dialog.close();
    }
  } catch (error) {
    console.warn("No se pudo guardar el acceso directo", error);
    dialogError.textContent = "No se pudo guardar. Inténtalo de nuevo.";
  }
});

$("cancel-button").addEventListener("click", () => dialog.close());

removeButton.addEventListener("click", async () => {
  const node = shortcuts.find((item) => item.id === editingId);
  dialog.close();
  if (!node) return;
  try {
    await chrome.bookmarks.remove(node.id);
    showToast("Acceso directo eliminado", () =>
      chrome.bookmarks.create({ parentId: node.parentId, index: node.index, title: node.title, url: node.url })
    );
  } catch (error) {
    console.warn("No se pudo eliminar el acceso directo", error);
  }
});

function showToast(message, onUndo) {
  clearTimeout(toastTimer);
  toastText.textContent = message;
  undoAction = onUndo;
  toast.hidden = false;
  toastTimer = setTimeout(hideToast, TOAST_MS);
}

function hideToast() {
  toast.hidden = true;
  undoAction = null;
}

toastUndo.addEventListener("click", async () => {
  const action = undoAction;
  hideToast();
  await action?.().catch((error) => console.warn("No se pudo deshacer", error));
});

// Reordenar arrastrando: el DOM se reordena en vivo y al soltar se mueve el marcador
grid.addEventListener("dragstart", (event) => {
  const tile = event.target.closest(".tile[data-id]");
  if (!tile) return;
  draggedId = tile.dataset.id;
  tile.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
});

grid.addEventListener("dragover", (event) => {
  if (!draggedId) return;
  event.preventDefault();
  const target = event.target.closest(".tile[data-id]");
  const dragged = grid.querySelector(".tile.dragging");
  if (!target || target === dragged) return;
  const tiles = [...grid.querySelectorAll(".tile[data-id]")];
  target[tiles.indexOf(dragged) < tiles.indexOf(target) ? "after" : "before"](dragged);
});

grid.addEventListener("drop", (event) => event.preventDefault());

grid.addEventListener("dragend", async () => {
  grid.querySelector(".tile.dragging")?.classList.remove("dragging");
  const id = draggedId;
  draggedId = null;
  if (!id) return;

  const order = [...grid.querySelectorAll(".tile[data-id]")].map((tile) => tile.dataset.id);
  const from = shortcuts.findIndex((node) => node.id === id);
  const to = order.indexOf(id);
  if (from === to) return;

  // En la misma carpeta Chrome espera el índice como si el marcador siguiera en su sitio
  const target = shortcuts[to];
  try {
    await chrome.bookmarks.move(id, { parentId: folderId, index: to > from ? target.index + 1 : target.index });
  } catch (error) {
    console.warn("No se pudo mover el acceso directo", error);
    render();
  }
});

$("manage").addEventListener("click", () => {
  chrome.tabs.create({ url: `chrome://bookmarks/?id=${folderId}` });
});

// Refresca solo si el cambio afecta a la carpeta (desde otra pestaña, el atajo o ⌘D)
function scheduleReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(load, 50);
}

const affects = (id, parentId) => id === folderId || parentId === folderId || shortcuts.some((node) => node.id === id);

chrome.bookmarks.onCreated.addListener((id, node) => affects(id, node.parentId) && scheduleReload());
chrome.bookmarks.onRemoved.addListener((id, info) => affects(id, info.parentId) && scheduleReload());
chrome.bookmarks.onChanged.addListener((id) => affects(id) && scheduleReload());
chrome.bookmarks.onMoved.addListener((id, info) => (affects(id, info.parentId) || info.oldParentId === folderId) && scheduleReload());
chrome.bookmarks.onChildrenReordered.addListener((id) => id === folderId && scheduleReload());

load();
