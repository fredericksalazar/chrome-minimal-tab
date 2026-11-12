// Cuadrícula de accesos directos: accesos y grupos («cajas»), diálogo añadir/editar,
// selección de varios, arrastrar para reordenar o agrupar, deshacer y la propuesta de
// Tilo para ordenarlos por temas. Los grupos son subcarpetas de la carpeta de accesos.
import {
  MAX_SHORTCUTS,
  addShortcut,
  allShortcuts,
  createGroup,
  getFolderId,
  getItems,
  moveInto,
  restore,
  snapshot,
  ungroup,
} from "../lib/bookmarks.js";
import { CATEGORIES, findCategory, proposeGroups, siteKey, suggestCategory } from "../lib/classify.js";
import { DEFAULT_EMOJI, MAX_GROUPS, groupColor, groupKey, isOnCenter, joinTitle, rememberHint, splitTitle } from "../lib/groups.js";
import { KEYS, onLocalChange, onSyncChange } from "../lib/storage.js";
import { faviconUrl, hostname, normalizeUrl } from "../lib/url.js";
import { createGroupBox } from "./group-box.js";
import { groupIcon, renderColorDots, renderEmojiPicker } from "./group-ui.js";
import { t } from "./i18n.js";
import { ICONS } from "./icons.js";
import { openProposal } from "./organize.js";

const $ = (id) => document.getElementById(id);
const grid = $("grid");
const gridTools = $("grid-tools");
const emptyHint = $("empty-hint");
const counter = $("counter");
const dialog = $("shortcut-dialog");
const form = $("shortcut-form");
const dialogTitle = $("dialog-title");
const nameInput = $("name-input");
const urlInput = $("url-input");
const moveField = $("move-field");
const moveSelect = $("move-select");
const dialogError = $("dialog-error");
const removeButton = $("remove-button");
const toast = $("toast");
const toastText = $("toast-text");
const toastUndo = $("toast-undo");
const selectBar = $("select-bar");
const selectCount = $("select-count");
const selectMove = $("select-move");
const groupDialog = $("group-dialog");
const groupForm = $("group-form");
const groupNameInput = $("group-name-input");
const groupDialogEmoji = $("group-dialog-emoji");
const groupDialogEmojis = $("group-dialog-emojis");
const groupDialogColors = $("group-dialog-colors");
const groupDialogError = $("group-dialog-error");
const organizeDialog = $("organize-dialog");

const TOAST_MS = 6000;
// Mantener un acceso sobre el centro de otro este tiempo lo prepara para agrupar
const MERGE_MS = 500;
// Con tantos accesos sueltos y ningún grupo, Tilo ofrece ordenarlos
const OFFER_MIN = 12;

let folderId;
let items = [];
let colors = {};
let hints = {};
let offer = {};
let editingId = null;
let undoAction = null;
let toastTimer;
let reloadTimer;
let selecting = false;
const selected = new Set();
let newGroup = null;

const groups = () => items.filter((node) => !node.url);
const shortcuts = () => allShortcuts(items);
const findItem = (id) => items.find((node) => node.id === id);
const findShortcut = (id) => shortcuts().find((node) => node.id === id);
const groupOf = (id) => groups().find((group) => group.children.some((child) => child.id === id)) ?? null;

// Tema que representa una caja: por su emoji o por su nombre en el idioma actual
function categoryOf(title) {
  const { emoji } = splitTitle(title);
  const key = groupKey(title);
  return CATEGORIES.find((category) => category.emoji === emoji || groupKey(t(`group.cat.${category.id}`)) === key)?.id ?? null;
}

function infoOf(group) {
  const { emoji, name } = splitTitle(group.title);
  const key = groupKey(group.title);
  const category = categoryOf(group.title);
  return { emoji: emoji || DEFAULT_EMOJI, name: name || t("group.defaultName"), key, category, color: groupColor(key, colors, findCategory(category)?.color) };
}

const box = createGroupBox($("group-box"), {
  renderTile: (node) => createTile(node, true),
  rename: (group, emoji, name) => renameGroup(group, emoji, name),
  setColor: (group, color) => saveColor(groupKey(group.title), color),
  openAll: (group) => group.children.forEach((child, index) => chrome.tabs.create({ url: child.url, active: index === 0 })),
  ungroup: (group) => removeGroup(group),
  moveOut: (group, id) => moveShortcuts([id], null, group.index + 1),
  reorder: (group, id, to) => reorderIn(group.children, group.id, id, to),
});

async function load() {
  folderId = await getFolderId(t("folderTitle"));
  items = await getItems(folderId);
  for (const id of [...selected]) if (!findShortcut(id) || groupOf(id)) selected.delete(id);
  render();
  const open = box.groupId();
  if (open) {
    const group = findItem(open);
    box.refresh(group, group && infoOf(group));
  }
  updateOffer();
}

function render() {
  const total = shortcuts().length;
  const tiles = items.map((node) => (node.url ? createTile(node) : createGroupTile(node)));
  if (total < MAX_SHORTCUTS && !selecting) tiles.push(createAddTile());
  grid.replaceChildren(...tiles);
  grid.classList.toggle("selecting", selecting);

  counter.textContent = t("shortcuts.counter", { visible: total, max: MAX_SHORTCUTS });
  emptyHint.hidden = total > 0;
  gridTools.hidden = total === 0 || selecting;
  renderSelectBar();
}

function createTile(node, inBox = false) {
  const tile = document.createElement("div");
  tile.className = "tile";
  tile.dataset.id = node.id;
  tile.draggable = !selecting || inBox;

  const link = document.createElement("a");
  link.className = "tile-link";
  link.href = node.url;
  link.draggable = false;

  const title = document.createElement("span");
  title.className = "tile-title";
  title.textContent = node.title || hostname(node.url);
  link.append(createIcon(node), title);

  // ⌘/Ctrl + clic o Mayús + clic entra en modo selección; dentro de él, el clic selecciona
  if (!inBox) {
    link.addEventListener("click", (event) => {
      if (!selecting && !(event.metaKey || event.ctrlKey || event.shiftKey)) return;
      event.preventDefault();
      toggleSelected(node.id);
    });
    if (selecting) {
      const isSelected = selected.has(node.id);
      tile.classList.toggle("selected", isSelected);
      link.setAttribute("role", "checkbox");
      link.setAttribute("aria-checked", String(isSelected));
      const check = document.createElement("span");
      check.className = "tile-check";
      check.setAttribute("aria-hidden", "true");
      tile.append(link, check);
      return tile;
    }
  }

  const menu = document.createElement("button");
  menu.className = "tile-menu";
  menu.type = "button";
  menu.title = t("shortcuts.edit");
  menu.setAttribute("aria-label", t("shortcuts.editNamed", { name: title.textContent }));
  menu.innerHTML = ICONS.more;
  menu.addEventListener("click", () => openDialog(node));

  tile.append(link, menu);
  return tile;
}

function createGroupTile(group) {
  const info = infoOf(group);
  const tile = document.createElement("div");
  tile.className = "tile tile-group";
  tile.dataset.id = group.id;
  tile.draggable = !selecting;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "tile-link";
  button.setAttribute("aria-haspopup", "dialog");
  button.setAttribute("aria-label", t("group.label", { name: info.name, n: group.children.length }));
  button.disabled = selecting;
  const title = document.createElement("span");
  title.className = "tile-title";
  title.textContent = info.name;
  button.append(groupIcon(group.children, info.emoji, info.color), title);
  button.addEventListener("click", () => box.open(group, info, button));

  tile.append(button);
  return tile;
}

function createAddTile() {
  const tile = document.createElement("div");
  tile.className = "tile";

  const button = document.createElement("button");
  button.className = "tile-link";
  button.type = "button";
  button.innerHTML = `<span class="tile-icon">${ICONS.add}</span><span class="tile-title">${t("shortcuts.add")}</span>`;
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

// Opciones de «Mover a…»: cada caja y «Sin grupo»
function fillMoveOptions(select, placeholder, current) {
  const options = groups().map((group) => {
    const info = infoOf(group);
    return new Option(`${info.emoji} ${info.name}`, group.id);
  });
  select.replaceChildren(...(placeholder ? [new Option(t("group.moveTo"), "")] : []), new Option(t("group.none"), "root"), ...options);
  select.value = current ?? (placeholder ? "" : "root");
}

// Diálogo añadir / editar
function openDialog(node = null) {
  editingId = node?.id ?? null;
  dialogTitle.textContent = t(node ? "shortcuts.edit" : "shortcuts.add");
  nameInput.value = node?.title ?? "";
  urlInput.value = node?.url ?? "";
  removeButton.hidden = !node;
  moveField.hidden = !node;
  if (node) fillMoveOptions(moveSelect, false, groupOf(node.id)?.id ?? "root");
  dialogError.textContent = "";
  dialog.showModal();
  nameInput.focus();
}

async function save(title, url) {
  if (editingId) {
    if (shortcuts().some((node) => node.url === url && node.id !== editingId)) return "exists";
    await chrome.bookmarks.update(editingId, { title, url });
    const from = groupOf(editingId)?.id ?? "root";
    if (moveSelect.value && moveSelect.value !== from) await moveShortcuts([editingId], moveSelect.value === "root" ? null : moveSelect.value);
    return "saved";
  }
  return addShortcut({ title, url }, t("folderTitle"));
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = normalizeUrl(urlInput.value);
  if (!url) {
    dialogError.textContent = t("dialog.invalidUrl");
    urlInput.focus();
    return;
  }

  try {
    const status = await save(nameInput.value.trim() || hostname(url), url);
    if (status === "exists") {
      dialogError.textContent = t("dialog.exists");
    } else if (status === "full") {
      dialogError.textContent = t("dialog.full", { max: MAX_SHORTCUTS });
    } else {
      dialog.close();
    }
  } catch (error) {
    console.warn("No se pudo guardar el acceso directo", error);
    dialogError.textContent = t("dialog.saveFailed");
  }
});

$("cancel-button").addEventListener("click", () => dialog.close());

removeButton.addEventListener("click", async () => {
  const node = findShortcut(editingId);
  dialog.close();
  if (!node) return;
  try {
    await chrome.bookmarks.remove(node.id);
    showToast(t("shortcuts.removed"), () =>
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
  toastUndo.hidden = !onUndo;
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

// --- Grupos -----------------------------------------------------------------

async function saveColor(key, color) {
  colors = { ...colors, [key]: color };
  render();
  const open = box.groupId() && findItem(box.groupId());
  if (open) box.refresh(open, infoOf(open));
  try {
    await chrome.storage.sync.set({ [KEYS.groupColors]: colors });
  } catch (error) {
    console.warn("No se pudo guardar el color del grupo", error);
  }
}

// Tilo recuerda dónde puso el usuario cada web: en una caja o fuera de los grupos
async function remember(ids, destination) {
  let next = hints;
  for (const id of ids) {
    const node = findShortcut(id);
    if (node) next = rememberHint(next, siteKey(node.url), destination);
  }
  hints = next;
  try {
    await chrome.storage.sync.set({ [KEYS.groupHints]: hints });
  } catch (error) {
    console.warn("No se pudieron guardar las preferencias de grupos", error);
  }
}

async function renameGroup(group, emoji, name) {
  const oldKey = groupKey(group.title);
  const title = joinTitle(emoji === DEFAULT_EMOJI ? null : emoji, name || t("group.defaultName"));
  if (title === group.title) return;
  try {
    await chrome.bookmarks.update(group.id, { title });
    // El color va con el nombre: se conserva al renombrar
    const newKey = groupKey(title);
    if (colors[oldKey] && newKey !== oldKey) await saveColor(newKey, colors[oldKey]);
  } catch (error) {
    console.warn("No se pudo renombrar el grupo", error);
  }
}

// Mueve accesos a una caja (al final) o fuera de los grupos (en index, o al final)
async function moveShortcuts(ids, groupId, index) {
  if (!ids.length) return;
  const places = await snapshot(ids);
  try {
    await moveInto(ids, groupId ?? folderId, groupId ? undefined : index);
  } catch (error) {
    console.warn("No se pudo mover el acceso directo", error);
    return;
  }
  const group = groupId && findItem(groupId);
  await remember(ids, group ? `g:${groupKey(group.title)}` : "none");
  await removeEmptyGroups(places);
  showToast(t("group.moved", { name: group ? infoOf(group).name : t("group.none") }), () => restore(places));
}

// Una caja que se queda vacía se borra sola
async function removeEmptyGroups(places) {
  for (const parentId of new Set(places.map((place) => place.parentId))) {
    if (parentId === folderId) continue;
    try {
      const children = await chrome.bookmarks.getChildren(parentId);
      if (!children.length) await chrome.bookmarks.remove(parentId);
    } catch {
      // Ya no existe
    }
  }
}

async function removeGroup(group) {
  const { emoji, name } = splitTitle(group.title);
  try {
    const ids = await ungroup(folderId, group);
    showToast(t("group.ungrouped"), async () => {
      await createGroup(folderId, joinTitle(emoji, name), ids, group.index);
    });
  } catch (error) {
    console.warn("No se pudo deshacer el grupo", error);
  }
}

// Diálogo «Nuevo grupo»: nombre, emoji y color sugeridos por Tilo
function suggestion(nodes) {
  const category = findCategory(suggestCategory(nodes, hints));
  return category
    ? { emoji: category.emoji, name: t(`group.cat.${category.id}`), color: category.color }
    : { emoji: DEFAULT_EMOJI, name: t("group.defaultName"), color: groupColor(t("group.defaultName")) };
}

function renderGroupDialog() {
  groupDialogEmoji.textContent = newGroup.emoji;
  renderEmojiPicker(groupDialogEmojis, newGroup.emoji, (emoji) => {
    newGroup.emoji = emoji;
    renderGroupDialog();
  });
  renderColorDots(groupDialogColors, newGroup.color, (color) => {
    newGroup.color = color;
    renderGroupDialog();
  });
  groupDialogEmoji.style.setProperty("--group", `var(--group-${newGroup.color})`);
}

function openGroupDialog(ids) {
  if (groups().length >= MAX_GROUPS) {
    showToast(t("group.full", { max: MAX_GROUPS }));
    return;
  }
  newGroup = { ids, ...suggestion(ids.map(findShortcut).filter(Boolean)) };
  groupNameInput.value = newGroup.name;
  groupDialogError.textContent = "";
  renderGroupDialog();
  groupDialog.showModal();
  groupNameInput.select();
}

$("group-dialog-cancel").addEventListener("click", () => groupDialog.close());

groupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = groupNameInput.value.trim() || newGroup.name;
  const { ids, emoji, color } = newGroup;
  groupDialog.close();
  await makeGroup(ids, emoji, name, color);
  exitSelection();
});

// Crea la caja donde estaba el primero de los accesos y la deja lista para deshacer
async function makeGroup(ids, emoji, name, color, { open = false } = {}) {
  const first = items.find((node) => ids.includes(node.id)) ?? findShortcut(ids[0]);
  const places = await snapshot(ids);
  try {
    const title = joinTitle(emoji === DEFAULT_EMOJI ? null : emoji, name);
    const group = await createGroup(folderId, title, ids, first?.parentId === folderId ? first.index : undefined);
    await saveColor(groupKey(title), color);
    await remember(ids, `g:${groupKey(title)}`);
    await removeEmptyGroups(places);
    showToast(t("group.created", { name }), () => restore(places, [group.id]));
    if (open) {
      await load();
      const fresh = findItem(group.id);
      const tile = grid.querySelector(`[data-id="${group.id}"] .tile-link`);
      if (fresh) {
        box.open(fresh, infoOf(fresh), tile);
        box.focusName();
      }
    }
  } catch (error) {
    console.warn("No se pudo crear el grupo", error);
  }
}

// --- Selección de varios ---------------------------------------------------

function toggleSelected(id) {
  if (!selecting) selecting = true;
  if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  render();
  grid.querySelector(`[data-id="${id}"] .tile-link`)?.focus();
}

function exitSelection() {
  selecting = false;
  selected.clear();
  render();
}

function renderSelectBar() {
  selectBar.hidden = !selecting;
  if (!selecting) return;
  selectCount.textContent = t("group.selected", { n: selected.size });
  $("select-group").disabled = selected.size < 2;
  fillMoveOptions(selectMove, true);
  selectMove.disabled = selected.size === 0;
}

$("grid-select").addEventListener("click", () => {
  selecting = true;
  render();
  grid.querySelector(".tile-link")?.focus();
});
$("select-cancel").addEventListener("click", exitSelection);
// En el grupo, los accesos quedan en el orden de la cuadrícula, no en el de los clics
const inGridOrder = (ids) => shortcuts().map((node) => node.id).filter((id) => ids.includes(id));
$("select-group").addEventListener("click", () => openGroupDialog(inGridOrder([...selected])));
selectMove.addEventListener("change", async () => {
  const target = selectMove.value;
  if (!target) return;
  const ids = inGridOrder([...selected]);
  exitSelection();
  await moveShortcuts(ids, target === "root" ? null : target);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && selecting && !document.querySelector("dialog[open]")) exitSelection();
});

// --- Arrastrar: reordenar, meter en una caja o agrupar dos accesos ------------

let draggedId = null;
let mergeTarget = null;
let mergeTimer = 0;
let mergeReady = false;

function clearMerge() {
  clearTimeout(mergeTimer);
  mergeTarget?.classList.remove("merge-target");
  mergeTarget = null;
  mergeReady = false;
}

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
  if (!target || !dragged || target === dragged) return;

  // En el centro de otro acceso o de una caja: esperar para agrupar, sin reordenar
  const canMerge = !dragged.classList.contains("tile-group");
  if (canMerge && isOnCenter(target.getBoundingClientRect(), event.clientX, event.clientY)) {
    if (mergeTarget !== target) {
      clearMerge();
      mergeTarget = target;
      mergeTimer = setTimeout(() => {
        mergeReady = true;
        target.classList.add("merge-target");
      }, MERGE_MS);
    }
    return;
  }
  clearMerge();
  const tiles = [...grid.querySelectorAll(".tile[data-id]")];
  target[tiles.indexOf(dragged) < tiles.indexOf(target) ? "after" : "before"](dragged);
});

grid.addEventListener("drop", (event) => event.preventDefault());

grid.addEventListener("dragend", async () => {
  grid.querySelector(".tile.dragging")?.classList.remove("dragging");
  const id = draggedId;
  draggedId = null;
  const target = mergeReady ? mergeTarget : null;
  clearMerge();
  if (!id) return;

  if (target) {
    render();
    const targetNode = findItem(target.dataset.id);
    if (!targetNode) return;
    if (!targetNode.url) {
      await moveShortcuts([id], targetNode.id);
    } else if (groups().length >= MAX_GROUPS) {
      showToast(t("group.full", { max: MAX_GROUPS }));
    } else {
      const ids = [targetNode.id, id];
      const { emoji, name, color } = suggestion(ids.map(findShortcut));
      await makeGroup(ids, emoji, name, color, { open: true });
    }
    return;
  }

  const order = [...grid.querySelectorAll(".tile[data-id]")].map((tile) => tile.dataset.id);
  await reorderIn(items, folderId, id, order.indexOf(id));
});

// Lleva el marcador id a la posición to dentro de su carpeta (list: hijos en orden)
async function reorderIn(list, parentId, id, to) {
  const from = list.findIndex((node) => node.id === id);
  if (from < 0 || to < 0 || from === to) return;
  // En la misma carpeta Chrome espera el índice como si el marcador siguiera en su sitio
  const target = list[to];
  try {
    await chrome.bookmarks.move(id, { parentId, index: to > from ? target.index + 1 : target.index });
  } catch (error) {
    console.warn("No se pudo mover el acceso directo", error);
    render();
  }
}

// --- Tilo organiza ------------------------------------------------------------

function openOrganize() {
  const loose = items.filter((node) => node.url);
  const existing = groups().map((group) => ({ id: group.id, key: groupKey(group.title), category: categoryOf(group.title) }));
  const proposal = proposeGroups(loose, existing, hints);
  const room = MAX_GROUPS - groups().length;
  let fresh = 0;
  const cards = [];
  for (const entry of proposal.groups) {
    if (entry.groupId) {
      const info = infoOf(findItem(entry.groupId));
      cards.push({ include: true, groupId: entry.groupId, category: entry.category, emoji: info.emoji, name: info.name, color: info.color, items: entry.items });
    } else if (fresh < room) {
      fresh++;
      const category = findCategory(entry.category);
      cards.push({ include: true, groupId: null, category: entry.category, emoji: category.emoji, name: t(`group.cat.${category.id}`), color: category.color, items: entry.items });
    } else {
      proposal.loose.push(...entry.items);
    }
  }
  openProposal(organizeDialog, { cards, loose: proposal.loose, total: loose.length }, applyProposal);
}

async function applyProposal({ cards, original, loose }) {
  const ids = cards.flatMap((card) => card.items.map((item) => item.id));
  const places = await snapshot(ids);
  const created = [];
  try {
    for (const card of cards) {
      const cardIds = card.items.map((item) => item.id);
      if (card.groupId) {
        await moveInto(cardIds, card.groupId);
        continue;
      }
      const current = await chrome.bookmarks.get(cardIds[0]);
      const title = joinTitle(card.emoji, card.name);
      const group = await createGroup(folderId, title, cardIds, current[0].index);
      created.push(group.id);
      colors = { ...colors, [groupKey(title)]: card.color };
    }
    await chrome.storage.sync.set({ [KEYS.groupColors]: colors });
  } catch (error) {
    console.warn("No se pudo aplicar la propuesta de Tilo", error);
  }

  // Lo que el usuario cambió respecto a la propuesta es una corrección que Tilo recuerda
  let next = hints;
  for (const card of cards) {
    for (const item of card.items) {
      const moved = original.get(item.id) !== card.uid;
      if (moved) next = rememberHint(next, siteKey(item.url), card.groupId ? `g:${groupKey(findItem(card.groupId).title)}` : `c:${card.category}`);
    }
  }
  // Sacado a «Sin grupo» a propósito: no volver a proponerlo (quitar un grupo entero no cuenta)
  for (const item of loose) {
    if (original.get(item.id) !== null) next = rememberHint(next, siteKey(item.url), "none");
  }
  hints = next;
  chrome.storage.sync.set({ [KEYS.groupHints]: hints }).catch((error) => console.warn("No se pudieron guardar las preferencias de grupos", error));

  showToast(t("group.applied", { g: cards.length }), () => restore(places, created));
  setOffer({ ...offer, asked: true, done: Date.now() });
}

$("grid-organize").addEventListener("click", openOrganize);
$("drawer-organize").addEventListener("click", () => {
  $("settings").close();
  openOrganize();
});

// Tilo ofrece ordenar una vez, cuando hay muchos accesos sueltos y ninguna caja.
// Lo pregunta pet.js (su tarjeta) leyendo local.groupsOffer; si se acepta, abre aquí.
function setOffer(next) {
  offer = next;
  chrome.storage.local.set({ [KEYS.groupsOffer]: offer }).catch((error) => console.warn("No se pudo guardar la oferta de Tilo", error));
}

function updateOffer() {
  if (offer.asked) return;
  const loose = items.filter((node) => node.url).length;
  const pending = loose >= OFFER_MIN && groups().length === 0 ? loose : 0;
  if ((offer.pending ?? 0) !== pending) setOffer({ ...offer, pending });
}

onLocalChange(KEYS.groupsOffer, (value) => {
  const previous = offer;
  offer = value ?? {};
  if (offer.open && offer.open !== previous.open) openOrganize();
});
onSyncChange(KEYS.groupColors, (value) => {
  colors = value ?? {};
  render();
});
onSyncChange(KEYS.groupHints, (value) => (hints = value ?? {}));

$("manage").addEventListener("click", () => {
  chrome.tabs.create({ url: `chrome://bookmarks/?id=${folderId}` });
});

// Refresca solo si el cambio afecta a la carpeta o a sus cajas (desde otra pestaña,
// el atajo, ⌘D o el gestor de marcadores)
function scheduleReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(load, 50);
}

const known = (id) => id === folderId || items.some((node) => node.id === id || node.children?.some((child) => child.id === id));
const affects = (id, parentId) => known(id) || known(parentId);

chrome.bookmarks.onCreated.addListener((id, node) => affects(id, node.parentId) && scheduleReload());
chrome.bookmarks.onRemoved.addListener((id, info) => affects(id, info.parentId) && scheduleReload());
chrome.bookmarks.onChanged.addListener((id) => affects(id) && scheduleReload());
chrome.bookmarks.onMoved.addListener((id, info) => (affects(id, info.parentId) || known(info.oldParentId)) && scheduleReload());
chrome.bookmarks.onChildrenReordered.addListener((id) => known(id) && scheduleReload());

try {
  const [{ [KEYS.groupColors]: savedColors, [KEYS.groupHints]: savedHints }, { [KEYS.groupsOffer]: savedOffer }] = await Promise.all([
    chrome.storage.sync.get([KEYS.groupColors, KEYS.groupHints]),
    chrome.storage.local.get(KEYS.groupsOffer),
  ]);
  colors = savedColors ?? {};
  hints = savedHints ?? {};
  offer = savedOffer ?? {};
} catch (error) {
  console.warn("No se pudieron leer los ajustes de grupos", error);
}
load();
