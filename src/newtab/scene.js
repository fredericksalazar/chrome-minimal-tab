// La escena de Tilo y su sección del panel: modo del cielo (Día, Noche o Dinámico),
// mascota y tamaño. Pone el cielo en hora cada minuto; styles/scene.css lo dibuja y
// pet.js mueve a la mascota. La elección viaja con la cuenta (storage.sync).
import { NO_PET, PETS, clampPetSize } from "../lib/pet.js";
import { SCENE_MODES, normalizeScene, sceneSky, sceneVars } from "../lib/scene.js";
import { KEYS, onSyncChange } from "../lib/storage.js";
import { t } from "./i18n.js";
import { ICONS } from "./icons.js";
import { setTone } from "./theme.js";

// Misma clave que lee theme-boot.js antes del primer pintado
const CACHE_KEY = "background";
const MODE_ICONS = { day: "light", night: "dark", dynamic: "sunrise" };
// El cielo dinámico avanza con la hora mientras la pestaña sigue abierta
const REFRESH_MS = 60 * 1000;

const root = document.documentElement;
const modes = document.getElementById("scene-modes");
const petSelect = document.getElementById("scene-pet-select");
const petSize = document.getElementById("scene-pet-size");
const petSizeValue = document.getElementById("scene-pet-size-value");

let scene = normalizeScene();

// Tamaño de la mascota: pet.js y scene.css leen esta variable
function scalePet(size) {
  root.style.setProperty("--scene-pet-scale", String(size / 100));
}

// Cielo según el modo y la hora local; la escena trae su propio tono para el texto
function paint() {
  const now = new Date();
  const sky = sceneSky(scene.mode, now.getHours() * 60 + now.getMinutes());
  const vars = sceneVars(sky);
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
  root.dataset.landscape = scene.landscape;
  root.dataset.scenePet = scene.pet;
  scalePet(scene.size);
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...scene, tone: sky.tone, vars }));
  } catch {
    // Solo se pierde la caché que evita el salto al abrir
  }
  setTone(sky.tone);
}

function renderControls() {
  modes.replaceChildren(
    ...SCENE_MODES.map((mode) => {
      const option = document.createElement("label");
      option.className = "theme-option";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "scene-mode";
      radio.value = mode;
      radio.checked = mode === scene.mode;
      radio.addEventListener("change", () => change({ mode }));

      const text = document.createElement("span");
      text.textContent = t(`scene.${mode}`);

      option.append(radio);
      option.insertAdjacentHTML("beforeend", ICONS[MODE_ICONS[mode]]);
      option.append(text);
      return option;
    })
  );
  petSelect.replaceChildren(
    ...[...PETS, NO_PET].map((pet) => {
      const option = document.createElement("option");
      option.value = pet;
      option.textContent = t(`pet.name.${pet}`);
      return option;
    })
  );
  petSelect.value = scene.pet;
  petSize.value = scene.size;
  petSizeValue.textContent = `${scene.size} %`;
}

function render() {
  paint();
  renderControls();
}

async function save() {
  try {
    await chrome.storage.sync.set({ [KEYS.background]: scene });
  } catch (err) {
    console.warn("No se pudo guardar la escena", err);
  }
}

function change(changes) {
  scene = normalizeScene({ ...scene, ...changes });
  render();
  return save();
}

petSelect.addEventListener("change", () => change({ pet: petSelect.value }));
// Mientras se arrastra solo se previsualiza; se guarda al soltar
petSize.addEventListener("input", () => {
  const size = clampPetSize(petSize.value);
  petSizeValue.textContent = `${size} %`;
  scalePet(size);
});
petSize.addEventListener("change", () => change({ size: petSize.value }));

setInterval(() => {
  if (!document.hidden) paint();
}, REFRESH_MS);

document.addEventListener("visibilitychange", () => {
  root.toggleAttribute("data-paused", document.hidden);
  if (!document.hidden) paint();
});
root.toggleAttribute("data-paused", document.hidden);

onSyncChange(KEYS.background, (value) => {
  scene = normalizeScene(value);
  render();
});

const { [KEYS.background]: saved } = await chrome.storage.sync.get(KEYS.background);
scene = normalizeScene(saved);
render();

// Versiones anteriores guardaban aquí otros fondos (colores, degradados o una
// imagen en este equipo): se pasa todo a la escena y se libera la imagen.
if (saved && JSON.stringify(saved) !== JSON.stringify(scene)) save();
chrome.storage.local.remove(KEYS.image).catch((err) => console.warn("No se pudo borrar la imagen de fondo antigua", err));
