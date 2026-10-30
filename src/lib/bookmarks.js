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

// Solo los marcadores con URL; las subcarpetas se ignoran
export async function getShortcuts(folderId) {
  const children = await chrome.bookmarks.getChildren(folderId);
  return children.filter((node) => node.url);
}

export async function addShortcut({ title, url }, folderTitle) {
  const folderId = await getFolderId(folderTitle);
  const shortcuts = await getShortcuts(folderId);
  if (shortcuts.some((node) => node.url === url)) return "exists";
  if (shortcuts.length >= MAX_SHORTCUTS) return "full";
  await chrome.bookmarks.create({ parentId: folderId, title: title || hostname(url), url });
  return "added";
}
