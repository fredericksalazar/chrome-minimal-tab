// Idioma de la página: el elegido en Personalizar o, en «Automático», el de
// Chrome. Los módulos importan t() de aquí; el HTML marca sus textos con
// data-i18n (texto), data-i18n-html (texto con <kbd>) y data-i18n-attrs
// ("atributo:clave; ..."). Cambiar de idioma recarga la pestaña.
import { FALLBACK, createTranslator, localeOf, normalizeLanguage, pickLanguage } from "../lib/i18n.js";
import { KEYS } from "../lib/storage.js";

// Misma clave que lee theme-boot.js para evitar el destello de otro idioma
const CACHE_KEY = "lang";
const root = document.documentElement;

const { [KEYS.language]: saved } = await chrome.storage.sync.get(KEYS.language);
export const preference = normalizeLanguage(saved);
export const detected = pickLanguage("auto", [chrome.i18n.getUILanguage(), ...navigator.languages]);
export const language = preference === "auto" ? detected : preference;
export const locale = localeOf(language);

const [{ default: dictionary }, { default: fallback }] = await Promise.all([
  import(`../i18n/${language}.js`),
  import(`../i18n/${FALLBACK}.js`),
]);
export const t = createTranslator(dictionary, fallback, locale);

export async function setLanguage(value) {
  await chrome.storage.sync.set({ [KEYS.language]: normalizeLanguage(value) });
  location.reload();
}

function translatePage() {
  root.lang = locale;
  document.title = t("page.title");
  document.querySelectorAll("[data-i18n]").forEach((node) => (node.textContent = t(node.dataset.i18n)));
  // Solo textos propios de los diccionarios, nunca datos del usuario
  document.querySelectorAll("[data-i18n-html]").forEach((node) => (node.innerHTML = t(node.dataset.i18nHtml)));
  document.querySelectorAll("[data-i18n-attrs]").forEach((node) => {
    for (const pair of node.dataset.i18nAttrs.split(";")) {
      const [attribute, key] = pair.split(":").map((part) => part.trim());
      if (attribute && key) node.setAttribute(attribute, t(key));
    }
  });
}

try {
  translatePage();
  localStorage.setItem(CACHE_KEY, language);
} catch {
  // Sin caché se ve el texto en español un instante en la próxima apertura
} finally {
  delete root.dataset.i18nPending;
}
