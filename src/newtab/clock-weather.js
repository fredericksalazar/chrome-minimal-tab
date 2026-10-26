// Hora, ciudad y clima en la esquina superior izquierda.
// Clima: Open-Meteo. Ciudad: geolocalización + BigDataCloud, o por IP si falla.
import { KEYS } from "../lib/storage.js";

const WEATHER_TTL = 30 * 60 * 1000;
const LOCATION_TTL = 6 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

const clock = document.getElementById("clock");
const city = document.getElementById("city");
const weather = document.getElementById("weather");
const weatherIcon = document.getElementById("weather-icon");
const temperature = document.getElementById("temperature");

const timeFormat = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" });
const dateFormat = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });

// Iconos de trazo fino, en la línea minimalista de la página
const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  partly: '<path d="M8 4v1.5M3.8 5.8l1 1M2 10h1.5M10.4 7.7A3.5 3.5 0 0 0 4.6 11"/><path d="M7 20h10a4 4 0 0 0 0-8 5 5 0 0 0-9.6 1.5A3.3 3.3 0 0 0 7 20z"/>',
  cloud: '<path d="M6.5 19h11a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5 2A3.5 3.5 0 0 0 6.5 19z"/>',
  fog: '<path d="M4 10h16M3 14h18M6 18h12"/>',
  rain: '<path d="M6.5 15h11a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5 2A3.5 3.5 0 0 0 6.5 15z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
  snow: '<path d="M6.5 15h11a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5 2A3.5 3.5 0 0 0 6.5 15z"/><path d="M8 19h.01M12 19h.01M16 19h.01M10 22h.01M14 22h.01"/>',
  storm: '<path d="M6.5 15h11a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5 2A3.5 3.5 0 0 0 6.5 15z"/><path d="M13 15l-2 3.5h3L12 22"/>',
};

// Códigos WMO de Open-Meteo → icono y descripción
function describe(code, isDay) {
  if (code === 0) return [isDay ? "sun" : "moon", "Despejado"];
  if (code <= 2) return [isDay ? "partly" : "cloud", "Poco nuboso"];
  if (code === 3) return ["cloud", "Nublado"];
  if (code <= 48) return ["fog", "Niebla"];
  if (code <= 57) return ["rain", "Llovizna"];
  if (code <= 67) return ["rain", "Lluvia"];
  if (code <= 77) return ["snow", "Nieve"];
  if (code <= 82) return ["rain", "Chubascos"];
  if (code <= 86) return ["snow", "Chubascos de nieve"];
  return ["storm", "Tormenta"];
}

// Se actualiza al cambiar de minuto en lugar de cada segundo
function tick() {
  const now = new Date();
  clock.textContent = timeFormat.format(now);
  clock.dateTime = now.toISOString();
  clock.title = dateFormat.format(now);
  setTimeout(tick, MINUTE - (now.getTime() % MINUTE) + 50);
}

function render(data) {
  const [icon, label] = describe(data.code, data.isDay);
  city.textContent = data.city ?? "";
  weatherIcon.innerHTML = ICONS[icon];
  temperature.textContent = `${Math.round(data.temperature)}°`;
  weather.title = `${label} en ${data.city ?? "tu zona"}`;
  weather.hidden = false;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function locateByGps() {
  const position = await new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, maximumAge: LOCATION_TTL })
  );
  const { latitude, longitude } = position.coords;
  const place = await fetchJson(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`
  );
  return { latitude, longitude, city: place.city || place.locality };
}

async function locateByIp() {
  const place = await fetchJson("https://ipapi.co/json/");
  return { latitude: place.latitude, longitude: place.longitude, city: place.city };
}

async function getLocation() {
  const { [KEYS.location]: cached } = await chrome.storage.local.get(KEYS.location);
  if (cached && Date.now() - cached.savedAt < LOCATION_TTL) return cached;

  const fresh = await locateByGps().catch(locateByIp);
  const saved = { ...fresh, savedAt: Date.now() };
  await chrome.storage.local.set({ [KEYS.location]: saved });
  return saved;
}

async function updateWeather() {
  const { [KEYS.weather]: cached } = await chrome.storage.local.get(KEYS.weather);
  if (cached) render(cached);
  if (cached && Date.now() - cached.savedAt < WEATHER_TTL) return;

  try {
    const { latitude, longitude, city: cityName } = await getLocation();
    const { current } = await fetchJson(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day&timezone=auto`
    );
    const data = {
      city: cityName,
      temperature: current.temperature_2m,
      code: current.weather_code,
      isDay: current.is_day === 1,
      savedAt: Date.now(),
    };
    await chrome.storage.local.set({ [KEYS.weather]: data });
    render(data);
  } catch (error) {
    // Sin conexión o sin ubicación: se mantiene lo último guardado, o solo la hora
    console.warn("No se pudo actualizar el clima", error);
  }
}

tick();
updateWeather();
setInterval(updateWeather, WEATHER_TTL);
