// Sección "Fondo" del panel: Tilo (animado), liso, colores sólidos, degradados o una
// imagen propia. La imagen vive solo en este equipo (storage.local) y, mientras
// está activa, manda sobre el fondo sincronizado.
import {
  BACKGROUNDS,
  DEFAULT_BACKGROUND,
  IMAGE_MAX_SIDE,
  PLAIN_BACKGROUND,
  checkImageFile,
  clampBlur,
  findBackground,
  fitSize,
  imageCss,
  isSameBackground,
  normalizeImage,
  normalizeSelection,
  toneFromPixels,
} from "../lib/backgrounds.js";
import { KEYS, onLocalChange, onSyncChange } from "../lib/storage.js";
import { ICONS, checkIcon } from "./icons.js";
import { setBackground } from "./theme.js";

// Misma clave que lee theme-boot.js antes del primer pintado
const CACHE_KEY = "background";
const PREVIEW = { solid: BACKGROUNDS.solid.items[0], gradient: BACKGROUNDS.gradient.items[5] };
// Por encima de esto se reintenta más pequeña para no agotar la caché de localStorage
const MAX_DATA_URL = 3.5 * 1024 * 1024;
const ERRORS = {
  type: "Ese archivo no es una imagen válida.",
  size: "La imagen supera los 20 MB.",
  save: "No se pudo guardar la imagen.",
};

const drawer = document.getElementById("settings");
const viewMain = document.getElementById("view-main");
const viewGrid = document.getElementById("view-bg");
const options = document.getElementById("bg-options");
const grid = document.getElementById("bg-grid");
const title = document.getElementById("bg-title");
const back = document.getElementById("bg-back");
const imageControls = document.getElementById("bg-image-controls");
const blurSwitch = document.getElementById("blur-switch");
const blurRow = document.getElementById("blur-amount-row");
const blurAmount = document.getElementById("blur-amount");
const blurValue = document.getElementById("blur-value");
const fileInput = document.getElementById("bg-file");
const error = document.getElementById("bg-error");

let current = DEFAULT_BACKGROUND;
let image = null;
let openType = null;

const imageActive = () => Boolean(image?.active);

function cache(value) {
  try {
    if (value) localStorage.setItem(CACHE_KEY, JSON.stringify(value));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    // Solo se pierde la caché que evita el parpadeo
  }
}

// Pinta el fondo efectivo; blur permite previsualizar el control deslizante sin guardar.
// data-plain oculta el fondo de Tilo, igual que cualquier fondo con tono propio.
function paint(blur = image?.blur ? image.blurAmount : 0) {
  const plain = !imageActive() && current.type === "plain";
  document.documentElement.toggleAttribute("data-plain", plain);
  if (imageActive()) {
    const css = imageCss(image.dataUrl);
    cache({ css, tone: image.tone, blur: blur || undefined });
    setBackground(css, image.tone, blur);
    return;
  }
  const item = findBackground(current);
  cache(item ? { css: item.css, tone: item.tone } : plain && { plain: true });
  setBackground(item?.css ?? null, item?.tone);
}

function render() {
  current = normalizeSelection(current);
  paint();
  renderOptions();
  renderImageControls();
  if (openType) renderGrid();
}

// Aplica y guarda la imagen (null la borra y deja ver el fondo sincronizado).
// Si no se puede guardar, vuelve a la anterior y avisa; devuelve si se guardó.
async function saveImage(next) {
  const previous = image;
  image = next;
  render();
  try {
    if (next) await chrome.storage.local.set({ [KEYS.image]: next });
    else await chrome.storage.local.remove(KEYS.image);
    showError(null);
    return true;
  } catch (err) {
    console.warn("No se pudo guardar la imagen de fondo", err);
    image = previous;
    render();
    showError("save");
    return false;
  }
}

async function choose(selection) {
  current = selection;
  if (imageActive()) await saveImage({ ...image, active: false });
  else render();
  await chrome.storage.sync.set({ [KEYS.background]: selection });
}

function showError(reason) {
  error.textContent = reason ? ERRORS[reason] : "";
}

// Tarjetas principales: Tilo (a lo ancho), Liso, Colores sólidos, Degradados, Imagen
function renderOptions() {
  const selected = (type) => !imageActive() && current.type === type;
  const preview = (type) => (selected(type) ? findBackground(current) : PREVIEW[type]);
  const tiles = [
    { label: "Tilo", tilo: true, active: selected("default"), onClick: () => choose(DEFAULT_BACKGROUND) },
    { label: "Liso", css: null, active: selected("plain"), onClick: () => choose(PLAIN_BACKGROUND) },
    { label: BACKGROUNDS.solid.title, css: preview("solid").css, active: selected("solid"), onClick: () => openGrid("solid") },
    { label: BACKGROUNDS.gradient.title, css: preview("gradient").css, active: selected("gradient"), onClick: () => openGrid("gradient") },
    {
      label: "Imagen",
      css: image && imageCss(image.dataUrl),
      icon: !image,
      active: imageActive(),
      onClick: () => (image ? saveImage({ ...image, active: true }) : fileInput.click()),
    },
  ];

  options.replaceChildren(
    ...tiles.map(({ label, css, tilo, icon, active, onClick }) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = tilo ? "bg-tile bg-tile-wide" : "bg-tile";
      tile.classList.toggle("selected", active);
      tile.setAttribute("aria-pressed", String(active));

      const swatch = document.createElement("span");
      swatch.className = tilo ? "bg-preview bg-tilo" : css ? "bg-preview" : "bg-preview bg-default";
      if (css) swatch.style.background = css;
      if (icon) swatch.classList.add("bg-image-empty");
      swatch.innerHTML = (icon ? ICONS.image : "") + checkIcon("swatch-check");

      const text = document.createElement("span");
      text.textContent = label;

      tile.append(swatch, text);
      tile.addEventListener("click", onClick);
      return tile;
    })
  );
}

// Interruptor, control deslizante y botones: solo con la imagen como fondo
function renderImageControls() {
  imageControls.hidden = !imageActive();
  if (!imageActive()) return;
  blurSwitch.setAttribute("aria-checked", String(image.blur));
  blurRow.hidden = !image.blur;
  blurAmount.value = image.blurAmount;
  showBlurValue(image.blurAmount);
}

function showBlurValue(amount) {
  blurValue.textContent = `${amount} px`;
  blurAmount.setAttribute("aria-valuetext", `${amount} píxeles`);
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
      radio.checked = !imageActive() && isSameBackground(current, selection);
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

// Reduce la imagen a JPEG (con blanco bajo las transparencias) y mide su tono
function encode(bitmap, maxSide, quality) {
  const { width, height } = fitSize(bitmap.width, bitmap.height, maxSide);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

function measureTone(bitmap) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0, 32, 32);
  return toneFromPixels(context.getImageData(0, 0, 32, 32).data);
}

async function loadFile(file) {
  showError(null);
  const invalid = checkImageFile(file);
  if (invalid) return showError(invalid);

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return showError("type");
  }
  let dataUrl = encode(bitmap, IMAGE_MAX_SIDE, 0.85);
  if (dataUrl.length > MAX_DATA_URL) dataUrl = encode(bitmap, 1920, 0.75);
  const tone = measureTone(bitmap);
  bitmap.close();

  await saveImage(normalizeImage({ ...image, dataUrl, tone, active: true }));
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

fileInput.addEventListener("change", () => {
  const [file] = fileInput.files;
  // Vaciar permite volver a elegir el mismo archivo
  fileInput.value = "";
  if (file) loadFile(file);
});
document.getElementById("bg-image-change").addEventListener("click", () => fileInput.click());
document.getElementById("bg-image-remove").addEventListener("click", () => saveImage(null));
blurSwitch.addEventListener("click", () => saveImage({ ...image, blur: !image.blur }));
// Mientras se arrastra solo se previsualiza; se guarda al soltar
blurAmount.addEventListener("input", () => {
  const amount = clampBlur(blurAmount.value);
  showBlurValue(amount);
  paint(amount);
});
blurAmount.addEventListener("change", () => saveImage({ ...image, blurAmount: clampBlur(blurAmount.value) }));

back.addEventListener("click", showMain);
drawer.addEventListener("close", () => {
  showMain();
  showError(null);
});
onSyncChange(KEYS.background, (value) => {
  current = value ?? DEFAULT_BACKGROUND;
  render();
});
// Otra pestaña de este equipo cambió la imagen
onLocalChange(KEYS.image, (value) => {
  image = normalizeImage(value);
  render();
});

const [{ [KEYS.background]: saved }, { [KEYS.image]: savedImage }] = await Promise.all([
  chrome.storage.sync.get(KEYS.background),
  chrome.storage.local.get(KEYS.image),
]);
current = saved ?? DEFAULT_BACKGROUND;
image = normalizeImage(savedImage);
render();
