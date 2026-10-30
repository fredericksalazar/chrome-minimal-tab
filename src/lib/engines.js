// Motores de búsqueda. "chrome" busca con el motor configurado en Chrome
// (chrome.search): es el predeterminado porque la tienda exige respetar ese
// ajuste. No tiene URL porque la API no dice qué motor es.
export const ENGINES = {
  // Su nombre visible es engine.default en src/i18n/
  chrome: { name: "Chrome" },
  google: { name: "Google", home: "https://www.google.com/", search: "https://www.google.com/search", param: "q" },
  bing: { name: "Bing", home: "https://www.bing.com/", search: "https://www.bing.com/search", param: "q" },
  duckduckgo: { name: "DuckDuckGo", home: "https://duckduckgo.com/", search: "https://duckduckgo.com/", param: "q" },
  brave: { name: "Brave", home: "https://search.brave.com/", search: "https://search.brave.com/search", param: "q" },
  ecosia: { name: "Ecosia", home: "https://www.ecosia.org/", search: "https://www.ecosia.org/search", param: "q" },
  perplexity: { name: "Perplexity", home: "https://www.perplexity.ai/", search: "https://www.perplexity.ai/search", param: "q" },
  yahoo: { name: "Yahoo!", home: "https://www.yahoo.com/", search: "https://search.yahoo.com/search", param: "p" },
};

export const DEFAULT_ENGINE = "chrome";

export function findEngine(id) {
  const key = id in ENGINES ? id : DEFAULT_ENGINE;
  return { key, engine: ENGINES[key] };
}

// Motores que buscan con chrome.search en lugar de enviar el formulario a su web
export const usesBrowserSearch = (engine) => !engine.search;
