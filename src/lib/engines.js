// Motores de búsqueda. Logos oficiales en assets/logos/; "dark" es la variante
// para fondos oscuros y "height" iguala el peso visual entre logos.
// "chrome" busca con el motor configurado en Chrome (chrome.search): es el
// predeterminado porque la tienda exige respetar ese ajuste. No tiene logo ni
// URL porque la API no dice qué motor es.
export const ENGINES = {
  chrome: { name: "Motor de Chrome" },
  google: { name: "Google", home: "https://www.google.com/", search: "https://www.google.com/search", param: "q", logo: "google.png", dark: "google-dark.png", height: 92 },
  bing: { name: "Bing", home: "https://www.bing.com/", search: "https://www.bing.com/search", param: "q", logo: "bing.svg", dark: "bing-dark.svg", height: 96 },
  duckduckgo: { name: "DuckDuckGo", home: "https://duckduckgo.com/", search: "https://duckduckgo.com/", param: "q", logo: "duckduckgo.svg", dark: "duckduckgo-dark.svg", height: 120 },
  brave: { name: "Brave", home: "https://search.brave.com/", search: "https://search.brave.com/search", param: "q", logo: "brave.svg", dark: "brave-dark.svg", height: 80 },
  ecosia: { name: "Ecosia", home: "https://www.ecosia.org/", search: "https://www.ecosia.org/search", param: "q", logo: "ecosia.svg", dark: "ecosia-dark.svg", height: 68 },
  perplexity: { name: "Perplexity", home: "https://www.perplexity.ai/", search: "https://www.perplexity.ai/search", param: "q", logo: "perplexity.svg", dark: "perplexity-dark.svg", height: 72 },
  yahoo: { name: "Yahoo!", home: "https://www.yahoo.com/", search: "https://search.yahoo.com/search", param: "p", logo: "yahoo.svg", dark: "yahoo-dark.svg", height: 76 },
};

export const DEFAULT_ENGINE = "chrome";

export function findEngine(id) {
  const key = id in ENGINES ? id : DEFAULT_ENGINE;
  return { key, engine: ENGINES[key] };
}

// Motores que buscan con chrome.search en lugar de enviar el formulario a su web
export const usesBrowserSearch = (engine) => !engine.search;
