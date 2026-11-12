// Tilo organiza los accesos directos por temas sin IA ni red: un diccionario local de
// sitios conocidos y palabras clave del nombre y la dirección. Ninguna URL sale del
// navegador. Lo que el usuario corrige (pistas) manda sobre el diccionario.
import { hostname } from "./url.js";

// Temas: id, emoji, color (de la paleta de la marca, ver groups.js), sitios y palabras.
// El nombre de cada tema está en src/i18n/ como group.cat.<id>.
export const CATEGORIES = [
  {
    id: "shopping",
    emoji: "🛍️",
    color: "coral",
    domains: ["amazon.com", "amazon.es", "amazon.com.mx", "amazon.de", "amazon.fr", "amazon.it", "amazon.co.uk", "amazon.co.jp", "amazon.com.br", "ebay.com", "ebay.es", "aliexpress.com", "temu.com", "shein.com", "etsy.com", "mercadolibre.com", "mercadolibre.com.mx", "mercadolibre.com.ar", "mercadolibre.com.co", "mercadolivre.com.br", "walmart.com", "target.com", "bestbuy.com", "ikea.com", "zara.com", "hm.com", "elcorteingles.es", "pccomponentes.com", "falabella.com", "linio.com", "costco.com", "wallapop.com", "vinted.es", "vinted.com", "rakuten.co.jp", "coupang.com", "taobao.com", "jd.com", "otto.de", "zalando.es", "zalando.de", "asos.com", "nike.com", "adidas.com", "decathlon.es", "carrefour.es", "mediamarkt.es", "fnac.es", "shopify.com", "alibaba.com"],
    keywords: ["shop", "store", "tienda", "compra", "compras", "outlet", "boutique", "boutique", "cart", "carrito", "loja", "negozio", "mercado"],
  },
  {
    id: "mail",
    emoji: "✉️",
    color: "lavanda",
    domains: ["mail.google.com", "gmail.com", "outlook.com", "outlook.live.com", "outlook.office.com", "mail.yahoo.com", "proton.me", "mail.proton.me", "icloud.com", "web.whatsapp.com", "whatsapp.com", "web.telegram.org", "telegram.org", "messenger.com", "slack.com", "app.slack.com", "discord.com", "teams.microsoft.com", "zoom.us", "meet.google.com", "signal.org", "fastmail.com", "zoho.com", "mail.zoho.com"],
    keywords: ["mail", "correo", "inbox", "webmail", "chat", "messenger", "mensajes"],
  },
  {
    id: "work",
    emoji: "💼",
    color: "cielo",
    domains: ["docs.google.com", "drive.google.com", "sheets.google.com", "slides.google.com", "calendar.google.com", "office.com", "microsoft365.com", "onedrive.live.com", "sharepoint.com", "notion.so", "notion.com", "trello.com", "asana.com", "monday.com", "clickup.com", "atlassian.net", "atlassian.com", "jira.com", "confluence.com", "airtable.com", "dropbox.com", "box.com", "linkedin.com", "miro.com", "calendly.com", "todoist.com", "evernote.com", "salesforce.com", "hubspot.com", "zendesk.com", "basecamp.com", "loom.com", "docusign.com", "smartsheet.com", "wrike.com", "linear.app"],
    keywords: ["work", "trabajo", "office", "oficina", "docs", "drive", "calendar", "calendario", "crm", "intranet", "erp", "portal"],
  },
  {
    id: "social",
    emoji: "💬",
    color: "rosa",
    domains: ["facebook.com", "instagram.com", "x.com", "twitter.com", "tiktok.com", "reddit.com", "pinterest.com", "threads.net", "bsky.app", "mastodon.social", "tumblr.com", "snapchat.com", "quora.com", "weibo.com", "vk.com", "line.me", "kakao.com", "naver.com"],
    keywords: ["social", "community", "comunidad", "forum", "foro"],
  },
  {
    id: "video",
    emoji: "🎬",
    color: "coral",
    domains: ["youtube.com", "netflix.com", "primevideo.com", "disneyplus.com", "hbomax.com", "max.com", "twitch.tv", "vimeo.com", "crunchyroll.com", "hulu.com", "tv.apple.com", "paramountplus.com", "dailymotion.com", "filmin.es", "movistarplus.es", "atresplayer.com", "rtve.es", "imdb.com", "letterboxd.com", "bilibili.com", "nicovideo.jp", "plex.tv"],
    keywords: ["video", "tv", "movies", "peliculas", "películas", "series", "stream", "cine", "anime"],
  },
  {
    id: "music",
    emoji: "🎧",
    color: "lavanda",
    domains: ["spotify.com", "open.spotify.com", "music.apple.com", "music.youtube.com", "soundcloud.com", "deezer.com", "tidal.com", "bandcamp.com", "last.fm", "music.amazon.com", "genius.com", "shazam.com"],
    keywords: ["music", "musica", "música", "radio", "podcast", "podcasts", "playlist"],
  },
  {
    id: "news",
    emoji: "📰",
    color: "miel",
    domains: ["news.google.com", "elpais.com", "elmundo.es", "abc.es", "lavanguardia.com", "eldiario.es", "20minutos.es", "bbc.com", "bbc.co.uk", "cnn.com", "nytimes.com", "theguardian.com", "washingtonpost.com", "reuters.com", "apnews.com", "bloomberg.com", "ft.com", "economist.com", "eltiempo.com", "clarin.com", "lanacion.com.ar", "infobae.com", "milenio.com", "eluniversal.com.mx", "elcomercio.pe", "lemonde.fr", "spiegel.de", "corriere.it", "folha.uol.com.br", "globo.com", "nhk.or.jp", "news.ycombinator.com", "theverge.com", "wired.com", "xataka.com", "techcrunch.com", "medium.com", "substack.com", "marca.com", "as.com", "espn.com"],
    keywords: ["news", "noticias", "noticia", "diario", "periodico", "periódico", "magazine", "revista", "journal", "times", "blog"],
  },
  {
    id: "finance",
    emoji: "💳",
    color: "tila",
    domains: ["paypal.com", "wise.com", "revolut.com", "n26.com", "bbva.com", "bbva.es", "santander.com", "bancosantander.es", "caixabank.es", "ing.es", "chase.com", "bankofamerica.com", "wellsfargo.com", "citi.com", "bancolombia.com", "nubank.com.br", "mercadopago.com", "stripe.com", "coinbase.com", "binance.com", "kraken.com", "robinhood.com", "etoro.com", "investing.com", "tradingview.com", "finance.yahoo.com", "google.com/finance", "agenciatributaria.gob.es", "irs.gov"],
    keywords: ["bank", "banco", "banca", "finance", "finanzas", "invest", "inversion", "inversión", "crypto", "wallet", "pago", "pagos", "billing", "factura", "facturas", "seguro", "insurance", "tax", "impuestos"],
  },
  {
    id: "dev",
    emoji: "💻",
    color: "lavanda",
    domains: ["github.com", "gitlab.com", "bitbucket.org", "stackoverflow.com", "developer.mozilla.org", "npmjs.com", "vercel.com", "netlify.com", "heroku.com", "aws.amazon.com", "console.aws.amazon.com", "cloud.google.com", "console.cloud.google.com", "portal.azure.com", "azure.microsoft.com", "digitalocean.com", "cloudflare.com", "dash.cloudflare.com", "supabase.com", "firebase.google.com", "docker.com", "hub.docker.com", "codepen.io", "codesandbox.io", "replit.com", "leetcode.com", "dev.to", "hashnode.com", "pypi.org", "readthedocs.io", "regex101.com", "localhost", "chromewebstore.google.com", "developer.chrome.com", "web.dev", "caniuse.com"],
    keywords: ["dev", "developer", "developers", "api", "code", "codigo", "código", "git", "docs", "documentation", "console", "dashboard", "admin", "staging"],
  },
  {
    id: "learn",
    emoji: "📚",
    color: "miel",
    domains: ["wikipedia.org", "es.wikipedia.org", "en.wikipedia.org", "coursera.org", "udemy.com", "edx.org", "khanacademy.org", "duolingo.com", "platzi.com", "domestika.org", "skillshare.com", "classroom.google.com", "moodle.org", "canvas.instructure.com", "quizlet.com", "wordreference.com", "deepl.com", "translate.google.com", "rae.es", "dle.rae.es", "scholar.google.com", "researchgate.net", "academia.edu", "goodreads.com", "linkedin.com/learning", "brilliant.org", "freecodecamp.org", "w3schools.com", "uoc.edu", "campus.uoc.edu"],
    keywords: ["learn", "aprender", "curso", "cursos", "course", "academy", "academia", "school", "escuela", "universidad", "university", "campus", "edu", "classroom", "wiki", "diccionario", "dictionary", "translate", "traductor"],
  },
  {
    id: "travel",
    emoji: "✈️",
    color: "cielo",
    domains: ["booking.com", "airbnb.com", "airbnb.es", "expedia.com", "tripadvisor.com", "tripadvisor.es", "skyscanner.com", "skyscanner.es", "kayak.com", "google.com/travel", "maps.google.com", "google.com/maps", "uber.com", "cabify.com", "renfe.com", "ryanair.com", "vueling.com", "iberia.com", "latam.com", "avianca.com", "aa.com", "delta.com", "united.com", "lufthansa.com", "airfrance.com", "blablacar.es", "trivago.com", "hotels.com", "rome2rio.com", "waze.com"],
    keywords: ["travel", "viaje", "viajes", "vuelos", "flights", "hotel", "hoteles", "trip", "maps", "mapas", "tren", "train"],
  },
  {
    id: "ai",
    emoji: "✨",
    color: "lavanda",
    domains: ["chatgpt.com", "chat.openai.com", "openai.com", "claude.ai", "anthropic.com", "gemini.google.com", "bard.google.com", "copilot.microsoft.com", "perplexity.ai", "poe.com", "huggingface.co", "midjourney.com", "character.ai", "mistral.ai", "chat.mistral.ai", "chat.deepseek.com", "deepseek.com", "grok.com", "x.ai", "runwayml.com", "elevenlabs.io", "notebooklm.google.com", "aistudio.google.com"],
    keywords: ["ai", "ia", "gpt", "chatbot", "copilot", "llm"],
  },
  {
    id: "design",
    emoji: "🎨",
    color: "rosa",
    domains: ["figma.com", "canva.com", "behance.net", "dribbble.com", "adobe.com", "express.adobe.com", "unsplash.com", "pexels.com", "freepik.com", "coolors.co", "fonts.google.com", "framer.com", "sketch.com", "pixabay.com", "flaticon.com", "remove.bg", "photopea.com", "excalidraw.com"],
    keywords: ["design", "diseño", "diseno", "fonts", "icons", "iconos", "photo", "foto", "fotos", "art", "arte", "colors"],
  },
];

export const CATEGORY_IDS = CATEGORIES.map((category) => category.id);
const BY_ID = Object.fromEntries(CATEGORIES.map((category) => [category.id, category]));

// Índice de sitio → tema. Un sitio con ruta («google.com/maps») se indexa aparte.
const DOMAINS = new Map();
for (const category of CATEGORIES) {
  for (const domain of category.domains) if (!DOMAINS.has(domain)) DOMAINS.set(domain, category.id);
}

export function findCategory(id) {
  return BY_ID[id] ?? null;
}

// Clave estable de una web para recordar correcciones: el sitio sin «www.»
export function siteKey(url) {
  return hostname(url).toLowerCase();
}

// Tema por el sitio: la dirección con su primer tramo de ruta, el sitio completo y
// luego cada dominio padre («docs.google.com» antes que «google.com»)
function byDomain(url) {
  const host = siteKey(url);
  let path = "";
  try {
    path = new URL(url).pathname.split("/")[1] ?? "";
  } catch {
    // Sin ruta legible: solo cuenta el sitio
  }
  if (path && DOMAINS.has(`${host}/${path}`)) return DOMAINS.get(`${host}/${path}`);
  const labels = host.split(".");
  for (let i = 0; i < labels.length - 1; i++) {
    const candidate = labels.slice(i).join(".");
    if (DOMAINS.has(candidate)) return DOMAINS.get(candidate);
  }
  return DOMAINS.get(host) ?? null;
}

// Palabras del nombre y de la dirección, en minúsculas
function tokens(item) {
  const text = `${item.title ?? ""} ${siteKey(item.url ?? "")}`.toLowerCase();
  return text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

function byKeywords(item) {
  const words = new Set(tokens(item));
  let best = null;
  let bestScore = 0;
  for (const category of CATEGORIES) {
    const score = category.keywords.filter((word) => words.has(word)).length;
    if (score > bestScore) {
      best = category.id;
      bestScore = score;
    }
  }
  return best;
}

// Pista guardada para una web: "none" (no agrupar), "c:<tema>" o "g:<clave de grupo>"
export function hintFor(item, hints = {}) {
  return hints[siteKey(item.url ?? "")] ?? null;
}

// Tema de un acceso, o null si no está claro. Una pista "none" o "g:…" manda.
export function classify(item, hints = {}) {
  const hint = hintFor(item, hints);
  if (hint === "none" || hint?.startsWith("g:")) return null;
  if (hint?.startsWith("c:") && BY_ID[hint.slice(2)]) return hint.slice(2);
  return byDomain(item.url ?? "") ?? byKeywords(item);
}

// Tema que describe un conjunto, para sugerir nombre al agrupar: solo si es el más
// repetido sin empate y cubre al menos la mitad; si no, mejor un nombre neutro
export function suggestCategory(items, hints = {}) {
  const counts = new Map();
  for (const item of items) {
    const id = classify(item, hints);
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [best, second] = ranked;
  if (!best || (second && second[1] === best[1]) || best[1] * 2 < items.length) return null;
  return best[0];
}

export const MIN_GROUP = 2;

// Propuesta de Tilo. loose: accesos sueltos; groups: cajas existentes
// ({ id, key, category }), donde key es la clave del nombre y category el tema que
// representa (o null). Devuelve { groups: [{ category, groupId, items }], loose }:
// groupId apunta a una caja existente cuando la hay. Solo se proponen grupos nuevos
// de MIN_GROUP accesos o más; lo demás queda suelto.
export function proposeGroups(loose, groups = [], hints = {}) {
  const byKey = new Map(groups.map((group) => [group.key, group]));
  const byCategory = new Map(groups.filter((group) => group.category).map((group) => [group.category, group]));
  const buckets = new Map();
  const rest = [];

  const put = (bucketKey, entry, item) => {
    if (!buckets.has(bucketKey)) buckets.set(bucketKey, { ...entry, items: [] });
    buckets.get(bucketKey).items.push(item);
  };

  for (const item of loose) {
    const hint = hintFor(item, hints);
    if (hint?.startsWith("g:") && byKey.has(hint.slice(2))) {
      const group = byKey.get(hint.slice(2));
      put(`g:${group.id}`, { category: group.category, groupId: group.id }, item);
      continue;
    }
    const category = classify(item, hints);
    if (!category) {
      rest.push(item);
    } else if (byCategory.has(category)) {
      const group = byCategory.get(category);
      put(`g:${group.id}`, { category, groupId: group.id }, item);
    } else {
      put(`c:${category}`, { category, groupId: null }, item);
    }
  }

  const proposed = [];
  for (const bucket of buckets.values()) {
    if (bucket.groupId || bucket.items.length >= MIN_GROUP) proposed.push(bucket);
    else rest.push(...bucket.items);
  }
  // Primero los grupos más grandes; los temas empatados en el orden de CATEGORIES
  proposed.sort((a, b) => b.items.length - a.items.length || CATEGORY_IDS.indexOf(a.category) - CATEGORY_IDS.indexOf(b.category));
  const order = new Map(loose.map((item, index) => [item, index]));
  rest.sort((a, b) => order.get(a) - order.get(b));
  return { groups: proposed, loose: rest };
}
