// Grupos de accesos directos: cada grupo es una subcarpeta de la carpeta de accesos.
// El emoji va al principio del nombre de la carpeta («🛍️ Compras») para que se vea
// también en los marcadores de Chrome y viaje con ellos. El color se guarda aparte
// (sync), por la clave del nombre, porque los ids de marcador cambian entre equipos.

export const MAX_GROUPS = 24;
export const DEFAULT_EMOJI = "📁";
// Desde aquí, «Abrir todo» pregunta antes
export const OPEN_ALL_CONFIRM = 8;
// Correcciones que Tilo recuerda (las más antiguas se olvidan)
export const MAX_HINTS = 150;

// Paleta de la marca (agents/context/marca.md)
export const GROUP_COLORS = {
  lavanda: "#7c6cf2",
  rosa: "#f27ba8",
  coral: "#ff9f6e",
  miel: "#ffc857",
  tila: "#4fd1a5",
  cielo: "#5ab8f0",
};
export const COLOR_IDS = Object.keys(GROUP_COLORS);

// Emojis propuestos al elegir uno para una caja
export const EMOJI_CHOICES = [
  "🛍️", "💼", "✉️", "💬", "🎬", "🎧", "📰", "💳",
  "💻", "📚", "✈️", "✨", "🎨", "🏠", "❤️", "⭐",
  "🎮", "⚽", "🍳", "🌱", "🐾", "🧘", "📷", "📁",
];

// Un «emoji» al principio del título: pictogramas, banderas, secuencias con ZWJ y
// variantes. Se reconoce por grafemas para no partir secuencias compuestas.
const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
const PICTOGRAPHIC = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;

function firstGrapheme(text) {
  if (segmenter) return segmenter.segment(text)[Symbol.iterator]().next().value?.segment ?? "";
  return Array.from(text)[0] ?? "";
}

// «🛍️ Compras» → { emoji: "🛍️", name: "Compras" }; sin emoji → { emoji: null, name }
export function splitTitle(title) {
  const text = String(title ?? "").trim();
  const first = firstGrapheme(text);
  if (first && PICTOGRAPHIC.test(first)) return { emoji: first, name: text.slice(first.length).trim() };
  return { emoji: null, name: text };
}

export function joinTitle(emoji, name) {
  const clean = String(name ?? "").trim();
  return emoji ? `${emoji} ${clean}`.trim() : clean;
}

// Clave para guardar el color y las pistas: el nombre sin emoji, en minúsculas
export function groupKey(title) {
  return splitTitle(title).name.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

// Color de una caja: el elegido, el de su tema o uno estable según el nombre
export function groupColor(key, saved = {}, categoryColor = null) {
  if (GROUP_COLORS[saved[key]]) return saved[key];
  if (GROUP_COLORS[categoryColor]) return categoryColor;
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.codePointAt(0)) | 0;
  return COLOR_IDS[Math.abs(hash) % COLOR_IDS.length];
}

// ¿El puntero está en la mitad central del elemento? Ahí soltar agrupa; en los
// bordes, reordena.
export function isOnCenter(rect, x, y) {
  const dx = rect.width / 4;
  const dy = rect.height / 4;
  return x > rect.left + dx && x < rect.right - dx && y > rect.top + dy && y < rect.bottom - dy;
}

// Recuerda una corrección del usuario para una web; la más reciente pasa al final
export function rememberHint(hints, site, value) {
  const next = { ...hints };
  delete next[site];
  next[site] = value;
  const keys = Object.keys(next);
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_HINTS))) delete next[key];
  return next;
}
