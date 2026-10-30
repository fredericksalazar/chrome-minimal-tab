// Tema efectivo de la página. data-theme ("light" | "dark") lo fija la preferencia
// del panel (Claro, Oscuro o Dispositivo); un fondo con tono propio manda sobre él
// para el texto de la página. Los módulos se suscriben aquí en lugar de vigilar el DOM.
import { DEFAULT_THEME, normalizeTheme, resolveTheme } from "../lib/theme.js";

// Misma clave que lee theme-boot.js antes del primer pintado
const CACHE_KEY = "theme";
const root = document.documentElement;
const prefersDark = matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set();
let preference = DEFAULT_THEME;

const notify = () => listeners.forEach((listener) => listener());

function applyTheme() {
  root.dataset.theme = resolveTheme(preference, prefersDark.matches);
  notify();
}

prefersDark.addEventListener("change", () => {
  if (preference === "system") applyTheme();
});

export function getThemePreference() {
  return preference;
}

export function setThemePreference(value) {
  preference = normalizeTheme(value);
  try {
    localStorage.setItem(CACHE_KEY, preference);
  } catch {
    // Solo se pierde la caché que evita el destello
  }
  applyTheme();
}

export function isDark() {
  const { tone } = root.dataset;
  return tone ? tone === "dark" : root.dataset.theme === "dark";
}

// css: valor de fondo (color, degradado o imagen); null vuelve al predeterminado.
// blur: píxeles de desenfoque de la imagen, o 0 para verla nítida.
export function setBackground(css, tone, blur = 0) {
  if (css) {
    root.style.setProperty("--page-bg", css);
    root.dataset.tone = tone;
  } else {
    root.style.removeProperty("--page-bg");
    delete root.dataset.tone;
  }
  if (css && blur) {
    root.style.setProperty("--page-blur", `${blur}px`);
    root.dataset.blur = "";
  } else {
    root.style.removeProperty("--page-blur");
    delete root.dataset.blur;
  }
  notify();
}

export function onThemeChange(listener) {
  listeners.add(listener);
}
