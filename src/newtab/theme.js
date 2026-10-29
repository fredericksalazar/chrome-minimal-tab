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
