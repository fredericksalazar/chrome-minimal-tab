// Los accesos directos viven en una carpeta de marcadores de Chrome. Así se
// sincronizan entre dispositivos y también se pueden añadir con ⌘D nativo.
import { KEYS } from "./storage.js";
import { hostname } from "./url.js";

export const MAX_SHORTCUTS = 100;
// Nombre de la carpeta en cada idioma de Tilo: se busca cualquiera de ellos para
// no duplicarla si el idioma cambia; las nuevas se crean en el idioma actual
export const FOLDER_TITLES = [
  "Accesos directos",
  "Shortcuts",
  "Raccourcis",
  "Scorciatoie",
  "Verknüpfungen",
  "Atalhos",
  "ショートカット",
  "바로가기",
  "快捷方式",
];

// Devuelve el id de la carpeta, creándola en "Otros marcadores" si no existe
export async function getFolderId(title = FOLDER_TITLES[0]) {
  const { [KEYS.folder]: storedId } = await chrome.storage.local.get(KEYS.folder);
  if (storedId) {
    try {
      const [node] = await chrome.bookmarks.get(storedId);
      if (node && !node.url) return node.id;
    } catch {
      // La carpeta se borró: se busca o se crea de nuevo
    }
  }

  let folder;
  for (const name of [title, ...FOLDER_TITLES]) {
    const matches = await chrome.bookmarks.search({ title: name });
    folder = matches.find((node) => !node.url);
    if (folder) break;
  }
  if (!folder) {
    const [root] = await chrome.bookmarks.getTree();
    const otherBookmarks = root.children[1] ?? root.children[0];
    folder = await chrome.bookmarks.create({ parentId: otherBookmarks.id, title });
  }

  await chrome.storage.local.set({ [KEYS.folder]: folder.id });
  return folder.id;
}

// Contenido de la carpeta: accesos y grupos (subcarpetas) en su orden. Cada grupo
// trae sus accesos en children; lo que haya dentro de un grupo y no sea un acceso se
// ignora (un solo nivel).
export async function getItems(folderId) {
  const [root] = await chrome.bookmarks.getSubTree(folderId);
  return (root.children ?? []).map((node) =>
    node.url ? node : { ...node, children: (node.children ?? []).filter((child) => child.url) }
  );
}

// Todos los accesos, sueltos y agrupados
export function allShortcuts(items) {
  return items.flatMap((node) => (node.url ? [node] : node.children));
}

export async function addShortcut({ title, url }, folderTitle) {
  const folderId = await getFolderId(folderTitle);
  const shortcuts = allShortcuts(await getItems(folderId));
  if (shortcuts.some((node) => node.url === url)) return "exists";
  if (shortcuts.length >= MAX_SHORTCUTS) return "full";
  await chrome.bookmarks.create({ parentId: folderId, title: title || hostname(url), url });
  return "added";
}

// Dónde está cada marcador ahora, para poder deshacer un cambio
export async function snapshot(ids) {
  const nodes = await chrome.bookmarks.get(ids);
  return nodes.map(({ id, parentId, index }) => ({ id, parentId, index }));
}

// Devuelve los marcadores a donde estaban y borra las carpetas creadas que queden
// vacías. Primero se sacan todos a su carpeta y se borran las cajas creadas; solo
// entonces cada índice guardado vuelve a significar lo mismo que antes del cambio.
export async function restore(places, createdFolders = []) {
  const safely = async (action) => {
    try {
      await action();
    } catch (error) {
      console.warn("No se pudo deshacer del todo", error);
    }
  };
  for (const { id, parentId } of places) await safely(() => chrome.bookmarks.move(id, { parentId }));
  for (const id of createdFolders) {
    await safely(async () => {
      const children = await chrome.bookmarks.getChildren(id);
      if (!children.length) await chrome.bookmarks.remove(id);
    });
  }
  for (const { id, parentId, index } of [...places].sort((a, b) => a.index - b.index)) {
    await safely(() => chrome.bookmarks.move(id, { parentId, index }));
  }
}

// Crea un grupo en la posición index con los accesos indicados, en ese orden
export async function createGroup(folderId, title, ids, index) {
  const group = await chrome.bookmarks.create({ parentId: folderId, title, index });
  for (const id of ids) await chrome.bookmarks.move(id, { parentId: group.id });
  return group;
}

// Mueve accesos al final de un grupo, o a la carpeta principal tras index
export async function moveInto(ids, parentId, index) {
  let position = index;
  for (const id of ids) {
    await chrome.bookmarks.move(id, position === undefined ? { parentId } : { parentId, index: position++ });
  }
}

// Saca los accesos de un grupo a su lugar en la carpeta y borra el grupo
export async function ungroup(folderId, group) {
  const ids = group.children.map((child) => child.id);
  await moveInto(ids, folderId, group.index);
  await chrome.bookmarks.remove(group.id);
  return ids;
}
