// Claves de chrome.storage en un solo sitio para evitar colisiones y erratas.
// sync: preferencias que viajan con la cuenta. local: cachés y datos de este equipo.
export const KEYS = {
  engine: "searchEngine",
  theme: "theme",
  background: "background",
  image: "backgroundImage",
  folder: "folderId",
  location: "location",
  weather: "weather",
  weatherSource: "weatherSource",
  onboarding: "onboarding",
  todos: "todos",
};

function onAreaChange(areaName, key, callback) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === areaName && key in changes) callback(changes[key].newValue);
  });
}

export const onSyncChange = (key, callback) => onAreaChange("sync", key, callback);
export const onLocalChange = (key, callback) => onAreaChange("local", key, callback);
