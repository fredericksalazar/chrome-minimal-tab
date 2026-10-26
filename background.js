import { MAX_SHORTCUTS, addShortcut, getFolderId } from "./src/lib/bookmarks.js";
import { normalizeUrl } from "./src/lib/url.js";

// Texto y color del badge del icono según el resultado
const BADGES = {
  added: ["✓", "#1e8e3e"],
  exists: ["✓", "#5f6368"],
  full: [String(MAX_SHORTCUTS), "#d93025"],
  invalid: ["!", "#d93025"],
};

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: "add-page", title: "Añadir página a Nueva pestaña", contexts: ["page"] });
  chrome.contextMenus.create({ id: "add-link", title: "Añadir enlace a Nueva pestaña", contexts: ["link"] });
  await getFolderId();
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
  const status = url ? await addShortcut({ title: title?.trim(), url }) : "invalid";
  if (tab?.id !== undefined) flashBadge(tab.id, status);
}

async function flashBadge(tabId, status) {
  const [text, color] = BADGES[status];
  await chrome.action.setBadgeBackgroundColor({ tabId, color });
  await chrome.action.setBadgeText({ tabId, text });
  setTimeout(() => chrome.action.setBadgeText({ tabId, text: "" }).catch(() => {}), 2000);
}
