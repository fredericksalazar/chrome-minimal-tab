// Tema efectivo de la página: un fondo con tono propio manda sobre el claro u
// oscuro del sistema. Los módulos se suscriben aquí en lugar de vigilar el DOM.
const root = document.documentElement;
const prefersDark = matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set();

const notify = () => listeners.forEach((listener) => listener());
prefersDark.addEventListener("change", notify);

export function isDark() {
  const { tone } = root.dataset;
  return tone ? tone === "dark" : prefersDark.matches;
}

// css: valor de fondo (color o degradado); null vuelve al predeterminado
export function setBackground(css, tone) {
  if (css) {
    root.style.setProperty("--page-bg", css);
    root.dataset.tone = tone;
  } else {
    root.style.removeProperty("--page-bg");
    delete root.dataset.tone;
  }
  notify();
}

export function onThemeChange(listener) {
  listeners.add(listener);
}
