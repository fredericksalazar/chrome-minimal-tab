// Guía de bienvenida: tarjetas que se recorren una vez por equipo, al instalar
// o al actualizar. El clima elegido aquí lo aplica clock-weather.js vía storage.
import { KEYS, onLocalChange } from "../lib/storage.js";
import { SUPPORT_LINKS } from "../lib/support.js";
import { findCities, needsChoice, sourceLabel } from "../lib/weather.js";
import { language, t } from "./i18n.js";
import { ICONS } from "./icons.js";

const dialog = document.getElementById("onboarding");
const viewport = document.querySelector(".onb-viewport");
const track = document.getElementById("onb-track");
const cards = [...track.children];
const dots = [...document.getElementById("onb-dots").children];
const stepLabel = document.getElementById("onb-step");
const back = document.getElementById("onb-back");
const next = document.getElementById("onb-next");
const weatherStatus = document.getElementById("onb-weather-status");
const cityForm = document.getElementById("onb-city-form");
const cityInput = document.getElementById("onb-city-input");
const cityResults = document.getElementById("onb-city-results");
const choiceButtons = {
  location: document.getElementById("onb-location"),
  city: document.getElementById("onb-city"),
  off: document.getElementById("onb-off"),
};

const WEATHER_STEP = 1;
let step = 0;
let weatherChosen = false;

// La ventana toma la altura de la tarjeta visible (cambia al listar ciudades)
function fitHeight() {
  if (dialog.open) viewport.style.height = `${cards[step].offsetHeight}px`;
}

function render() {
  // El foco en una tarjeta oculta desplazaría la ventana: el paso lo marca solo el transform
  viewport.scrollLeft = 0;
  track.style.transform = `translateX(-${step * 100}%)`;
  fitHeight();
  cards.forEach((card, index) => (card.inert = index !== step));
  dots.forEach((dot, index) => dot.classList.toggle("active", index === step));
  stepLabel.textContent = t("onb.step", { n: step + 1, total: cards.length });
  back.hidden = step === 0;
  // En la última tarjeta la flecha pasa a ser una marca de «Empezar»
  const last = step === cards.length - 1;
  next.classList.toggle("last", last);
  next.setAttribute("aria-label", t(last ? "onb.start" : "onb.next"));
  next.title = next.getAttribute("aria-label");
  back.title = t("onb.back");
  back.setAttribute("aria-label", back.title);
  // El clima hay que elegirlo antes de seguir: no se puede saltar
  next.disabled = step === WEATHER_STEP && !weatherChosen;
}

const choiceLabel = (source) => (source.mode === "off" ? t("weather.none") : sourceLabel(source, t));

// Igual que el aviso del clima: cambiar de origen invalida lo guardado
async function chooseWeather(source, pressed) {
  await chrome.storage.local.remove([KEYS.location, KEYS.weather]);
  await chrome.storage.local.set({ [KEYS.weatherSource]: source });
  Object.values(choiceButtons).forEach((button) => button.setAttribute("aria-pressed", String(button === pressed)));
  weatherChosen = true;
  weatherStatus.textContent = t("onb.ready", { choice: choiceLabel(source) });
  render();
}

async function searchCity(query) {
  cityResults.replaceChildren();
  weatherStatus.textContent = t("weather.searching");
  try {
    const places = await findCities(query, fetch, language);
    weatherStatus.textContent = places.length ? "" : t("weather.notFound");
    cityResults.replaceChildren(
      ...places.map((place) => {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "weather-result";
        button.textContent = place.detail;
        button.addEventListener("click", () => {
          const { name, latitude, longitude } = place;
          cityResults.replaceChildren();
          chooseWeather({ mode: "city", city: { name, latitude, longitude } }, choiceButtons.city);
        });
        item.append(button);
        return item;
      })
    );
  } catch (error) {
    console.warn("No se pudo buscar la ciudad", error);
    weatherStatus.textContent = t("weather.searchFailed");
  }
}

function renderDonations() {
  const donate = document.getElementById("onb-donate");
  donate.replaceChildren(
    ...SUPPORT_LINKS.filter(({ id }) => id !== "web").map(({ id, url }) => {
      const link = document.createElement("a");
      link.className = "btn onb-donate";
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.title = t(`support.${id}Title`);
      link.innerHTML = ICONS[id];
      const text = document.createElement("span");
      text.textContent = t(`support.${id}`);
      link.append(text);
      return link;
    })
  );
}

async function finish() {
  await chrome.storage.local.set({ [KEYS.onboarding]: { done: true, at: Date.now() } });
  dialog.close();
  document.getElementById("search-input").focus();
}

back.addEventListener("click", () => {
  step = Math.max(0, step - 1);
  render();
});
next.addEventListener("click", () => {
  if (step === cards.length - 1) return finish();
  step += 1;
  render();
  next.focus();
});
// Sin botón de cerrar ni Esc: la guía se termina con «Empezar»
dialog.addEventListener("cancel", (event) => event.preventDefault());

choiceButtons.location.addEventListener("click", () => {
  cityForm.hidden = true;
  chooseWeather({ mode: "location" }, choiceButtons.location);
});
choiceButtons.off.addEventListener("click", () => {
  cityForm.hidden = true;
  chooseWeather({ mode: "off" }, choiceButtons.off);
});
choiceButtons.city.addEventListener("click", () => {
  cityForm.hidden = false;
  cityInput.focus();
});
cityForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = cityInput.value.trim();
  if (query) searchCity(query);
});

cards.forEach((card) => new ResizeObserver(fitHeight).observe(card));

// Terminada en otra pestaña abierta a la vez: se cierra aquí también
onLocalChange(KEYS.onboarding, (value) => {
  if (value?.done && dialog.open) dialog.close();
});

const saved = await chrome.storage.local.get([KEYS.onboarding, KEYS.weatherSource]);
if (!saved[KEYS.onboarding]?.done) {
  // Quien ya eligió el clima (versión anterior) puede seguir sin volver a elegir
  const current = saved[KEYS.weatherSource];
  if (!needsChoice(current)) {
    weatherChosen = true;
    weatherStatus.textContent = t("onb.current", { choice: choiceLabel(current) });
    choiceButtons[current.mode].setAttribute("aria-pressed", "true");
  }
  renderDonations();
  // inert antes de abrir para que el foco inicial no caiga en otra tarjeta;
  // la altura se mide ya abierta
  render();
  dialog.showModal();
  fitHeight();
  next.focus();
}
