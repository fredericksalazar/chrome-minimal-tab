// Idiomas de Tilo y traducción de textos. Sin DOM ni chrome.*: la página
// (src/newtab/i18n.js) elige el idioma y carga su diccionario de src/i18n/.
export const LANGUAGES = [
  { id: "es", name: "Español", locale: "es-ES" },
  { id: "en", name: "English", locale: "en-US" },
  { id: "fr", name: "Français", locale: "fr-FR" },
  { id: "it", name: "Italiano", locale: "it-IT" },
  { id: "de", name: "Deutsch", locale: "de-DE" },
  { id: "pt", name: "Português", locale: "pt-BR" },
  { id: "ja", name: "日本語", locale: "ja-JP" },
  { id: "ko", name: "한국어", locale: "ko-KR" },
  { id: "zh", name: "中文（简体）", locale: "zh-CN" },
];
export const AUTO = "auto";
// Idioma cuando el de Chrome no está entre los de Tilo
export const FALLBACK = "en";

export function normalizeLanguage(value) {
  return LANGUAGES.some((language) => language.id === value) ? value : AUTO;
}

// Primer idioma de la lista (p. ej. ["pt-BR", "en"]) que Tilo tiene
export function detectLanguage(tags) {
  for (const tag of tags ?? []) {
    const base = String(tag).toLowerCase().split(/[-_]/)[0];
    if (LANGUAGES.some((language) => language.id === base)) return base;
  }
  return FALLBACK;
}

export function pickLanguage(preference, tags) {
  const language = normalizeLanguage(preference);
  return language === AUTO ? detectLanguage(tags) : language;
}

export function localeOf(id) {
  return (LANGUAGES.find((language) => language.id === id) ?? LANGUAGES[1]).locale;
}

// t("clave", { n: 3 }) sustituye {n}; si falta la clave usa el respaldo y, si
// tampoco está, la propia clave. t.plural elige "clave.one" o "clave.other".
export function createTranslator(dictionary, fallback = {}, locale = "en-US") {
  const rules = new Intl.PluralRules(locale);
  const t = (key, params = {}) =>
    (dictionary[key] ?? fallback[key] ?? key).replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
  t.plural = (key, count, params = {}) => {
    const form = rules.select(count) === "one" ? "one" : "other";
    return t(`${key}.${form}`, { n: count, ...params });
  };
  return t;
}
