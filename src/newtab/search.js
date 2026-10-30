// Buscador: motor elegido (sincronizado con la cuenta), su logo y el envío.
import { ENGINES, findEngine, usesBrowserSearch } from "../lib/engines.js";
import { KEYS, onSyncChange } from "../lib/storage.js";
import { faviconUrl, looksLikeUrl, normalizeUrl } from "../lib/url.js";
import { checkIcon, ICONS } from "./icons.js";
import { isDark, onThemeChange } from "./theme.js";

const brand = document.getElementById("brand");
const logo = document.getElementById("logo");
const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const engineList = document.getElementById("engine-list");

let current = findEngine(null);

function renderLogo() {
  const { engine } = current;
  if (engine.logo) logo.src = `assets/logos/${isDark() ? engine.dark : engine.logo}`;
}

function applyEngine(id) {
  current = findEngine(id);
  const { key, engine } = current;

  // El motor de Chrome no tiene logo: el buscador sube y el texto no nombra ninguno
  const browser = usesBrowserSearch(engine);
  form.action = engine.search ?? "";
  input.name = engine.param ?? "q";
  input.placeholder = browser ? "Buscar en la web o escribir una URL" : `Buscar con ${engine.name} o escribir una URL`;

  brand.classList.toggle("no-logo", browser);
  logo.hidden = browser;
  logo.alt = browser ? "" : engine.name;
  logo.style.height = browser ? "" : `${engine.height}px`;
  renderLogo();
  brand.classList.add("ready");

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

      let icon;
      if (engine.home) {
        icon = document.createElement("img");
        icon.alt = "";
        icon.src = faviconUrl(engine.home, 32);
      } else {
        icon = document.createElement("span");
        icon.className = "engine-icon";
        icon.innerHTML = ICONS.search;
      }

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
onThemeChange(renderLogo);

renderEngineList();
const { [KEYS.engine]: saved } = await chrome.storage.sync.get(KEYS.engine);
applyEngine(saved);
