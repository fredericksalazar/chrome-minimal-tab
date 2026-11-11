// Tema efectivo de la página. data-theme ("light" | "dark") lo fija la preferencia
// del panel (Claro, Oscuro o Dispositivo) y manda en los paneles; el texto de la
// página sigue al tono del cielo de la escena. Los módulos se suscriben aquí en lugar de vigilar el DOM.
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

// Tono de la escena ("light" | "dark") según su cielo: decide el color del texto de
// la página. Lo fija scene.js cada vez que pone el cielo en hora.
export function setTone(tone) {
  root.dataset.tone = tone;
  notify();
}

export function onThemeChange(listener) {
  listeners.add(listener);
}
