// Hora, ciudad y clima en la esquina superior izquierda.
// Clima: Open-Meteo. Ciudad: geolocalización + BigDataCloud, o por IP si falla,
// o una ciudad escrita a mano. Nada se pide hasta que el usuario elige en el aviso.
import { KEYS, onLocalChange } from "../lib/storage.js";
import { PRIVACY_URL } from "../lib/support.js";
import { findCities, forecastUrl, needsChoice, sourceLabel } from "../lib/weather.js";

const WEATHER_TTL = 30 * 60 * 1000;
const LOCATION_TTL = 6 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

const clock = document.getElementById("clock");
const city = document.getElementById("city");
const weather = document.getElementById("weather");
const weatherIcon = document.getElementById("weather-icon");
const temperature = document.getElementById("temperature");
const card = document.getElementById("weather-card");
const cityForm = document.getElementById("weather-city-form");
const cityInput = document.getElementById("weather-city-input");
const cityStatus = document.getElementById("weather-city-status");
const cityResults = document.getElementById("weather-city-results");
const weatherState = document.getElementById("weather-state");
const offButton = document.getElementById("weather-off");

// Elección guardada en este equipo: { mode: "location" | "city" | "off", city? }
let source;
// Mientras la guía de bienvenida no se termine, el clima se elige allí
let onboardingDone = false;

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
  if (source.mode === "city") return { ...source.city, city: source.city.name };

  const { [KEYS.location]: cached } = await chrome.storage.local.get(KEYS.location);
  if (cached && Date.now() - cached.savedAt < LOCATION_TTL) return cached;

  const fresh = await locateByGps().catch(locateByIp);
  const saved = { ...fresh, savedAt: Date.now() };
  await chrome.storage.local.set({ [KEYS.location]: saved });
  return saved;
}

async function updateWeather() {
  renderSource();
  if (needsChoice(source) || source.mode === "off") return;

  const { [KEYS.weather]: cached } = await chrome.storage.local.get(KEYS.weather);
  if (cached) render(cached);
  if (cached && Date.now() - cached.savedAt < WEATHER_TTL) return;

  try {
    const { latitude, longitude, city: cityName } = await getLocation();
    const { current } = await fetchJson(forecastUrl(latitude, longitude));
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

// Tarjeta del aviso, clima visible y estado en «Personalizar» según la elección
function renderSource() {
  const ask = needsChoice(source);
  card.hidden = !ask || !onboardingDone;
  if (ask || source.mode === "off") weather.hidden = true;
  weatherState.textContent = sourceLabel(source);
  offButton.hidden = ask || source.mode === "off";
}

// Cambiar de origen invalida la ubicación y el tiempo guardados
async function choose(next) {
  await chrome.storage.local.remove([KEYS.location, KEYS.weather]);
  await chrome.storage.local.set({ [KEYS.weatherSource]: next });
  source = next;
  cityForm.hidden = true;
  updateWeather();
}

async function searchCity(query) {
  cityResults.replaceChildren();
  cityStatus.textContent = "Buscando…";
  try {
    const places = await findCities(query);
    cityStatus.textContent = places.length ? "" : "No encontramos esa ciudad";
    cityResults.replaceChildren(
      ...places.map((place) => {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "weather-result";
        button.textContent = place.detail;
        button.addEventListener("click", () => {
          const { name, latitude, longitude } = place;
          choose({ mode: "city", city: { name, latitude, longitude } });
        });
        item.append(button);
        return item;
      })
    );
  } catch (error) {
    console.warn("No se pudo buscar la ciudad", error);
    cityStatus.textContent = "No se pudo buscar. Revisa tu conexión";
  }
}

document.querySelectorAll(".privacy-link").forEach((link) => (link.href = PRIVACY_URL));
document.getElementById("weather-use-location").addEventListener("click", () => choose({ mode: "location" }));
document.getElementById("weather-dismiss").addEventListener("click", () => choose({ mode: "off" }));
document.getElementById("weather-use-city").addEventListener("click", () => {
  cityForm.hidden = false;
  cityInput.focus();
});
cityForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = cityInput.value.trim();
  if (query) searchCity(query);
});
offButton.addEventListener("click", () => choose({ mode: "off" }));
// «Cambiar» cierra el panel y vuelve a mostrar el aviso sin olvidar aún la elección
document.getElementById("weather-change").addEventListener("click", () => {
  document.getElementById("settings").close();
  card.hidden = false;
});
// Otra pestaña cambió la elección; la propia ya se aplicó en choose()
onLocalChange(KEYS.weatherSource, (next) => {
  if (JSON.stringify(next) === JSON.stringify(source)) return;
  source = next;
  updateWeather();
});

onLocalChange(KEYS.onboarding, (next) => {
  onboardingDone = Boolean(next?.done);
  renderSource();
});

tick();
const saved = await chrome.storage.local.get([KEYS.weatherSource, KEYS.onboarding]);
source = saved[KEYS.weatherSource];
onboardingDone = Boolean(saved[KEYS.onboarding]?.done);
updateWeather();
setInterval(updateWeather, WEATHER_TTL);
