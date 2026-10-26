// Catálogo de fondos. "tone" indica si el fondo es claro u oscuro para que la
// página elija texto y logo legibles encima.
export const BACKGROUNDS = {
  solid: {
    title: "Colores sólidos",
    items: [
      { id: "menta", name: "Menta", css: "#bfe9d3", tone: "light" },
      { id: "cielo", name: "Cielo", css: "#c7ddf5", tone: "light" },
      { id: "lavanda", name: "Lavanda", css: "#dcd3f2", tone: "light" },
      { id: "rosa", name: "Rosa", css: "#f6d2e0", tone: "light" },
      { id: "melocoton", name: "Melocotón", css: "#fbd8c4", tone: "light" },
      { id: "amarillo", name: "Amarillo", css: "#fbe7a1", tone: "light" },
      { id: "azul", name: "Azul", css: "#2f5fd0", tone: "dark" },
      { id: "violeta", name: "Violeta", css: "#5b3fc0", tone: "dark" },
      { id: "verde", name: "Verde", css: "#1f6f55", tone: "dark" },
      { id: "marino", name: "Marino", css: "#14264f", tone: "dark" },
      { id: "grafito", name: "Grafito", css: "#2b2f36", tone: "dark" },
      { id: "negro", name: "Negro", css: "#0b0b0d", tone: "dark" },
    ],
  },
  gradient: {
    title: "Degradados",
    items: [
      { id: "melocoton", name: "Melocotón", css: "linear-gradient(135deg, #fde8e0 0%, #ffffff 45%, #fcd9c8 100%)", tone: "light" },
      { id: "lavanda", name: "Lavanda", css: "linear-gradient(135deg, #e0d4f7 0%, #f8eef6 55%, #f7d6e4 100%)", tone: "light" },
      { id: "menta", name: "Menta", css: "linear-gradient(135deg, #d9f5e8 0%, #f2fbf6 50%, #bfe9d6 100%)", tone: "light" },
      { id: "amanecer", name: "Amanecer", css: "linear-gradient(135deg, #ffd27a 0%, #ffe7a6 50%, #ffc15e 100%)", tone: "light" },
      { id: "atardecer", name: "Atardecer", css: "linear-gradient(135deg, #f7b26a 0%, #f19a6b 50%, #d98aa0 100%)", tone: "light" },
      { id: "flamingo", name: "Flamingo", css: "linear-gradient(135deg, #ff7a93 0%, #ff9fb0 45%, #ffd3a8 100%)", tone: "light" },
      { id: "citrico", name: "Cítrico", css: "linear-gradient(135deg, #fdf7a0 0%, #c8f08f 50%, #7fdca4 100%)", tone: "light" },
      { id: "oceano", name: "Océano", css: "linear-gradient(135deg, #3f5fd6 0%, #7467c9 50%, #cf7f9c 100%)", tone: "dark" },
      { id: "crepusculo", name: "Crepúsculo", css: "linear-gradient(135deg, #5b3fc0 0%, #9b4fb0 55%, #e0556a 100%)", tone: "dark" },
      { id: "bosque", name: "Bosque", css: "linear-gradient(135deg, #0f3d3e 0%, #1f6f5c 60%, #5fa882 100%)", tone: "dark" },
      { id: "aurora", name: "Aurora boreal", css: "radial-gradient(ellipse at 15% 0%, rgba(46, 230, 168, 0.55) 0%, transparent 55%), radial-gradient(ellipse at 90% 20%, rgba(122, 92, 255, 0.8) 0%, transparent 50%), linear-gradient(160deg, #06122b 0%, #0b2a3f 100%)", tone: "dark" },
      { id: "galaxia", name: "Galaxia", css: "radial-gradient(circle at 82% 18%, rgba(192, 76, 255, 0.75) 0%, transparent 42%), radial-gradient(circle at 12% 88%, rgba(31, 162, 255, 0.7) 0%, transparent 46%), linear-gradient(135deg, #0a0420 0%, #1b0a3d 100%)", tone: "dark" },
      { id: "synthwave", name: "Synthwave", css: "linear-gradient(160deg, #12002f 0%, #3a0ca3 45%, #f72585 100%)", tone: "dark" },
      { id: "noche", name: "Noche", css: "linear-gradient(135deg, #1b2358 0%, #3a2d7a 60%, #5a3b86 100%)", tone: "dark" },
      { id: "medianoche", name: "Medianoche", css: "linear-gradient(135deg, #0f1033 0%, #1a1240 50%, #2b1b4a 100%)", tone: "dark" },
    ],
  },
};

export const DEFAULT_BACKGROUND = { type: "default" };

export function findBackground(selection) {
  return BACKGROUNDS[selection?.type]?.items.find((item) => item.id === selection.id) ?? null;
}

export function isSameBackground(a, b) {
  return a.type === b.type && a.id === b.id;
}
