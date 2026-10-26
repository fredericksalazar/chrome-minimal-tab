// Claves de chrome.storage en un solo sitio para evitar colisiones y erratas.
// sync: preferencias que viajan con la cuenta. local: cachés y datos de este equipo.
export const KEYS = {
  engine: "searchEngine",
  background: "background",
  folder: "folderId",
  location: "location",
  weather: "weather",
  todos: "todos",
};

export function onSyncChange(key, callback) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && key in changes) callback(changes[key].newValue);
  });
}
