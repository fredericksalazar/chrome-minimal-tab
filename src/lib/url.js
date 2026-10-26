// Utilidades de URL compartidas por la página y el service worker

// Acepta "github.com", "https://github.com/x", "localhost:3000"...
export function normalizeUrl(input) {
  const value = input.trim();
  if (!value || /\s/.test(value)) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;
    return url.href;
  } catch {
    return null;
  }
}

// Distingue una dirección escrita en el buscador de una búsqueda normal
export function looksLikeUrl(query) {
  return /^(https?:\/\/)?(localhost|[\w-]+(\.[\w-]+)+)(:\d+)?([/?#]\S*)?$/i.test(query);
}

export function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Favicon de alta resolución; si no existe, el servicio devuelve un globo de 16 px
export function faviconUrl(pageUrl, size) {
  return `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(pageUrl)}&size=${size}`;
}
