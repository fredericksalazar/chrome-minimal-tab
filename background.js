import { MAX_SHORTCUTS, addShortcut, getFolderId } from "./src/lib/bookmarks.js";
import { normalizeUrl } from "./src/lib/url.js";

// Texto y color del badge del icono según el resultado
const BADGES = {
  added: ["✓", "#1e8e3e"],
  exists: ["✓", "#5f6368"],
  full: [String(MAX_SHORTCUTS), "#d93025"],
  invalid: ["!", "#d93025"],
};

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  // Recién instalada: abre una pestaña nueva, que muestra la guía de bienvenida
  if (reason === "install") chrome.tabs.create({});
  await chrome.contextMenus.removeAll();
  // Fuera de la página no hay selector de idioma: se usa el de Chrome (_locales)
  chrome.contextMenus.create({ id: "add-page", title: chrome.i18n.getMessage("menuAddPage"), contexts: ["page"] });
  chrome.contextMenus.create({ id: "add-link", title: chrome.i18n.getMessage("menuAddLink"), contexts: ["link"] });
  await getFolderId(chrome.i18n.getMessage("folderTitle"));
});

chrome.action.onClicked.addListener((tab) => addPage(tab, tab.url, tab.title));

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "add-shortcut") addPage(tab, tab?.url, tab?.title);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "add-page") addPage(tab, info.pageUrl, tab?.title);
  if (info.menuItemId === "add-link") addPage(tab, info.linkUrl, info.linkText);
});

async function addPage(tab, rawUrl, title) {
  const url = rawUrl && normalizeUrl(rawUrl);
  const status = url ? await addShortcut({ title: title?.trim(), url }, chrome.i18n.getMessage("folderTitle")) : "invalid";
  if (tab?.id !== undefined) flashBadge(tab.id, status);
}

async function flashBadge(tabId, status) {
  const [text, color] = BADGES[status];
  await chrome.action.setBadgeBackgroundColor({ tabId, color });
  await chrome.action.setBadgeText({ tabId, text });
  setTimeout(() => chrome.action.setBadgeText({ tabId, text: "" }).catch(() => {}), 2000);
}
