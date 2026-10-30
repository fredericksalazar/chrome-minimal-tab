// Buscador: motor elegido (sincronizado con la cuenta), su icono y el envío.
import { ENGINES, findEngine, usesBrowserSearch } from "../lib/engines.js";
import { KEYS, onSyncChange } from "../lib/storage.js";
import { faviconUrl, looksLikeUrl, normalizeUrl } from "../lib/url.js";
import { checkIcon } from "./icons.js";

const searchIcon = document.getElementById("search-icon");
const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const engineList = document.getElementById("engine-list");

let current = findEngine(null);

// Icono de Tilo para el motor de Chrome, porque la API no dice cuál es
const BRAND_ICON = "assets/brand/tilo-small.svg";

function applyEngine(id) {
  current = findEngine(id);
  const { key, engine } = current;

  // Con el motor de Chrome se muestra la marca y el texto no nombra ningún motor
  const browser = usesBrowserSearch(engine);
  form.action = engine.search ?? "";
  input.name = engine.param ?? "q";
  input.placeholder = browser ? "Buscar en la web o escribir una URL" : `Buscar con ${engine.name} o escribir una URL`;

  searchIcon.src = browser ? BRAND_ICON : faviconUrl(engine.home, 32);

  const radio = engineList.querySelector(`input[value="${key}"]`);
  if (radio) radio.checked = true;
}

function renderEngineList() {
  engineList.replaceChildren(
    ...Object.entries(ENGINES).map(([id, engine]) => {
      const option = document.createElement("label");
      option.className = "engine";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "engine";
      radio.value = id;
      radio.addEventListener("change", () => chrome.storage.sync.set({ [KEYS.engine]: id }));

      const icon = document.createElement("img");
      icon.alt = "";
      icon.src = engine.home ? faviconUrl(engine.home, 32) : BRAND_ICON;

      const name = document.createElement("span");
      name.className = "engine-name";
      name.textContent = engine.name;

      option.append(radio, icon, name);
      option.insertAdjacentHTML("beforeend", checkIcon("engine-check"));
      return option;
    })
  );
}

// Si se escribe una dirección se abre directamente en lugar de buscarla
form.addEventListener("submit", (event) => {
  const query = input.value.trim();
  if (!query) {
    event.preventDefault();
    return;
  }
  const url = looksLikeUrl(query) && normalizeUrl(query);
  if (url) {
    event.preventDefault();
    location.href = url;
  } else if (usesBrowserSearch(current.engine)) {
    // Nunca se redirige a un motor por cuenta propia si chrome.search falla
    event.preventDefault();
    chrome.search.query({ text: query, disposition: "CURRENT_TAB" }).catch((error) => console.warn("No se pudo buscar", error));
  }
});

onSyncChange(KEYS.engine, applyEngine);

renderEngineList();
const { [KEYS.engine]: saved } = await chrome.storage.sync.get(KEYS.engine);
applyEngine(saved);
