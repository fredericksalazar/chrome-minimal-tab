// Sección "Fondo" del panel: predeterminado, colores sólidos o degradados.
import { BACKGROUNDS, DEFAULT_BACKGROUND, findBackground, isSameBackground } from "../lib/backgrounds.js";
import { KEYS, onSyncChange } from "../lib/storage.js";
import { checkIcon } from "./icons.js";
import { setBackground } from "./theme.js";

// Misma clave que lee theme-boot.js antes del primer pintado
const CACHE_KEY = "background";
const PREVIEW = { solid: BACKGROUNDS.solid.items[0], gradient: BACKGROUNDS.gradient.items[5] };

const drawer = document.getElementById("settings");
const viewMain = document.getElementById("view-main");
const viewGrid = document.getElementById("view-bg");
const options = document.getElementById("bg-options");
const grid = document.getElementById("bg-grid");
const title = document.getElementById("bg-title");
const back = document.getElementById("bg-back");

let current = DEFAULT_BACKGROUND;
let openType = null;

function cache(item) {
  try {
    if (item) localStorage.setItem(CACHE_KEY, JSON.stringify({ css: item.css, tone: item.tone }));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    // Solo se pierde la caché que evita el parpadeo
  }
}

function apply(selection) {
  const item = findBackground(selection);
  current = item ? selection : DEFAULT_BACKGROUND;
  cache(item);
  setBackground(item?.css ?? null, item?.tone);
  renderOptions();
  if (openType) renderGrid();
}

async function choose(selection) {
  apply(selection);
  await chrome.storage.sync.set({ [KEYS.background]: selection });
}

// Tarjetas principales: Predeterminado, Colores sólidos, Degradados
function renderOptions() {
  const preview = (type) => (current.type === type ? findBackground(current) : PREVIEW[type]);
  const tiles = [
    { label: "Predeterminado", css: null, active: current.type === "default", onClick: () => choose(DEFAULT_BACKGROUND) },
    { label: BACKGROUNDS.solid.title, css: preview("solid").css, active: current.type === "solid", onClick: () => openGrid("solid") },
    { label: BACKGROUNDS.gradient.title, css: preview("gradient").css, active: current.type === "gradient", onClick: () => openGrid("gradient") },
  ];

  options.replaceChildren(
    ...tiles.map(({ label, css, active, onClick }) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "bg-tile";
      tile.classList.toggle("selected", active);
      tile.setAttribute("aria-pressed", String(active));

      const swatch = document.createElement("span");
      swatch.className = css ? "bg-preview" : "bg-preview bg-default";
      if (css) swatch.style.background = css;
      swatch.innerHTML = checkIcon("swatch-check");

      const text = document.createElement("span");
      text.textContent = label;

      tile.append(swatch, text);
      tile.addEventListener("click", onClick);
      return tile;
    })
  );
}

// Cuadrícula de una categoría (colores o degradados)
function renderGrid() {
  grid.className = `swatch-grid ${openType}`;
  grid.replaceChildren(
    ...BACKGROUNDS[openType].items.map((item) => {
      const selection = { type: openType, id: item.id };
      const swatch = document.createElement("label");
      swatch.className = "swatch";
      swatch.title = item.name;

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "bg-swatch";
      radio.value = item.id;
      radio.checked = isSameBackground(current, selection);
      radio.setAttribute("aria-label", item.name);
      radio.addEventListener("change", () => choose(selection));

      const fill = document.createElement("span");
      fill.className = "swatch-fill";
      fill.style.background = item.css;

      swatch.append(radio, fill);
      swatch.insertAdjacentHTML("beforeend", checkIcon("swatch-check"));
      return swatch;
    })
  );
}

function openGrid(type) {
  openType = type;
  title.textContent = BACKGROUNDS[type].title;
  renderGrid();
  viewMain.hidden = true;
  viewGrid.hidden = false;
  back.focus();
}

function showMain() {
  openType = null;
  viewGrid.hidden = true;
  viewMain.hidden = false;
}

back.addEventListener("click", showMain);
drawer.addEventListener("close", showMain);
onSyncChange(KEYS.background, (value) => apply(value ?? DEFAULT_BACKGROUND));

const { [KEYS.background]: saved } = await chrome.storage.sync.get(KEYS.background);
apply(saved ?? DEFAULT_BACKGROUND);
