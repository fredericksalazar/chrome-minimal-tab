// Origen del clima elegido por el usuario y URLs de Open-Meteo. Sin DOM ni red:
// el módulo de la página hace las peticiones.
export const MAX_CITY_RESULTS = 5;

export const SOURCE_MODES = ["location", "city", "off"];

// Sin elección guardada hay que preguntar antes de pedir nada a ningún servicio
export function needsChoice(source) {
  return !SOURCE_MODES.includes(source?.mode);
}

// language: idioma de los nombres de ciudad (código ISO 639-1)
export function geocodingUrl(query, language = "es") {
  const params = new URLSearchParams({ name: query.trim(), count: String(MAX_CITY_RESULTS), language, format: "json" });
  return `https://geocoding-api.open-meteo.com/v1/search?${params}`;
}

export function forecastUrl(latitude, longitude) {
  const params = new URLSearchParams({ latitude, longitude, current: "temperature_2m,weather_code,is_day", timezone: "auto" });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

// Resultados de la geocodificación → ciudades con su región y país para distinguirlas
export function parseGeocoding(json) {
  return (json?.results ?? []).slice(0, MAX_CITY_RESULTS).map((place) => ({
    name: place.name,
    detail: [place.name, place.admin1, place.country].filter(Boolean).join(", "),
    latitude: place.latitude,
    longitude: place.longitude,
  }));
}

// Busca ciudades por nombre; recibe fetch para poder probarla sin red
export async function findCities(query, fetcher = fetch, language = "es") {
  const response = await fetcher(geocodingUrl(query, language));
  if (!response.ok) throw new Error(`${response.status} geocoding`);
  return parseGeocoding(await response.json());
}

// t: traductor de src/lib/i18n.js
export function sourceLabel(source, t) {
  if (needsChoice(source)) return t("weather.source.unset");
  if (source?.mode === "location") return t("weather.source.location");
  if (source?.mode === "city") return t("weather.source.city", { city: source.city?.name ?? "" });
  return t("weather.source.off");
}
