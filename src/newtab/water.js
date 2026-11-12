// Water Tracker: gota o botella minimalista de 2 litros con porcentaje interior,
// botón + encima, registro con hora, historial diario y vitalidad de Tilo.
import { KEYS, onLocalChange, onSyncChange } from "../lib/storage.js";
import { dayKey } from "../lib/todos.js";
import {
  DAILY_GOAL_ML,
  DEFAULT_WATER_STYLE,
  WATER_STYLES,
  formatLiters,
  historyList,
  hydrationStatus,
  normalizeWater,
  normalizeWaterStyle,
  recordDrink,
  undoDrink,
} from "../lib/water.js";
import { locale, t } from "./i18n.js";

const STYLE_CACHE_KEY = "waterStyle";
const STYLE_LABELS = {
  bottle: "water.styleBottle",
  drop: "water.styleDrop",
};

const root = document.documentElement;
const tracker = document.getElementById("water-tracker");
const vessel = document.getElementById("water-vessel");
const percentEl = document.getElementById("water-percent");
const amountEl = document.getElementById("water-amount");
const lastEl = document.getElementById("water-last");
const drinkBtn = document.getElementById("water-drink");
const undoBtn = document.getElementById("water-undo");
const historyBtn = document.getElementById("water-history-btn");
const logPanel = document.getElementById("water-log");
const todayList = document.getElementById("water-today-list");
const historyListEl = document.getElementById("water-history-list");
const styleSelect = document.getElementById("water-style-select");

let water = { days: {} };
let waterStyle = normalizeWaterStyle(root.dataset.waterStyle || DEFAULT_WATER_STYLE);

function createLogRow(leftText, rightText) {
  const item = document.createElement("li");
  item.className = "water-log-item";
  const left = document.createElement("span");
  left.textContent = leftText;
  const right = document.createElement("strong");
  right.textContent = rightText;
  item.append(left, right);
  return item;
}

function createEmptyRow(text) {
  const item = document.createElement("li");
  item.className = "water-log-empty";
  item.textContent = text;
  return item;
}

function applyStyle(next) {
  waterStyle = normalizeWaterStyle(next);
  root.dataset.waterStyle = waterStyle;
  try {
    localStorage.setItem(STYLE_CACHE_KEY, waterStyle);
  } catch {
    // Solo se pierde la caché de arranque rápido
  }
  renderStyleSelect();
}

function renderStyleSelect() {
  if (!styleSelect) return;
  styleSelect.replaceChildren(
    ...WATER_STYLES.map((style) => {
      const option = document.createElement("option");
      option.value = style;
      option.textContent = t(STYLE_LABELS[style]);
      return option;
    })
  );
  styleSelect.value = waterStyle;
}

function render() {
  const now = Date.now();
  const today = dayKey(new Date(now));
  const status = hydrationStatus(water, now, today);

  // Vitalidad y estado de hidratación de Tilo en <html>
  root.style.setProperty("--scene-pet-vitality", String(status.vitality));
  root.dataset.petHydration = status.state;

  // Nivel del recipiente de 2 litros y porcentaje interior
  tracker.style.setProperty("--water-fill", String(status.ratio));
  tracker.classList.toggle("goal-met", status.goalMet);
  vessel.setAttribute("aria-valuenow", String(status.todayMl));
  percentEl.textContent = `${status.percent}%`;

  // Total en litros debajo del recipiente y última hora en el historial
  amountEl.textContent = t("water.goal", {
    current: formatLiters(status.todayMl, locale),
    goal: formatLiters(DAILY_GOAL_ML, locale),
  });
  lastEl.textContent = status.lastTime
    ? t("water.lastAt", { time: status.lastTime })
    : t("water.emptyToday");
  undoBtn.hidden = status.entries.length === 0;

  // Tomas de hoy (de más reciente a más antigua)
  if (status.entries.length) {
    todayList.replaceChildren(
      ...[...status.entries]
        .reverse()
        .map((entry) => createLogRow(entry.time, `${entry.ml} ml`))
    );
  } else {
    todayList.replaceChildren(createEmptyRow(t("water.emptyToday")));
  }

  // Historial por día
  const pastDays = historyList(water, today);
  if (pastDays.length) {
    historyListEl.replaceChildren(
      ...pastDays.map((item) => {
        const liters = t("water.dayEntry", { liters: formatLiters(item.totalMl, locale) });
        return createLogRow(item.day, item.goalMet ? `${liters} ✓` : liters);
      })
    );
  } else {
    historyListEl.replaceChildren(createEmptyRow(t("water.historyEmpty")));
  }
}

async function save(next) {
  water = normalizeWater(next);
  render();
  try {
    await chrome.storage.local.set({ [KEYS.water]: water });
  } catch (error) {
    console.warn("No se pudo guardar el registro de agua", error);
  }
}

async function saveStyle(next) {
  applyStyle(next);
  try {
    await chrome.storage.sync.set({ [KEYS.waterStyle]: waterStyle });
  } catch (error) {
    console.warn("No se pudo guardar el estilo del recipiente de agua", error);
  }
}

drinkBtn.addEventListener("click", () => {
  save(recordDrink(water));
});

undoBtn.addEventListener("click", () => {
  save(undoDrink(water));
});

historyBtn.addEventListener("click", () => {
  const open = logPanel.hidden;
  logPanel.hidden = !open;
  historyBtn.setAttribute("aria-expanded", String(open));
});

styleSelect?.addEventListener("change", () => {
  saveStyle(styleSelect.value);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !logPanel.hidden) {
    logPanel.hidden = true;
    historyBtn.setAttribute("aria-expanded", "false");
  }
});

document.addEventListener("click", (event) => {
  if (!logPanel.hidden && !tracker.contains(event.target)) {
    logPanel.hidden = true;
    historyBtn.setAttribute("aria-expanded", "false");
  }
});

onLocalChange(KEYS.water, (next) => {
  const normalized = normalizeWater(next);
  if (JSON.stringify(normalized) === JSON.stringify(water)) return;
  water = normalized;
  render();
});

onSyncChange(KEYS.waterStyle, (next) => {
  applyStyle(next);
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) render();
});

// Revisa cada minuto por si se cumple la hora desde la última toma o cambia el día
setInterval(render, 60 * 1000);

applyStyle(waterStyle);
render();

try {
  const [{ [KEYS.water]: savedWater }, { [KEYS.waterStyle]: savedStyle }] = await Promise.all([
    chrome.storage.local.get(KEYS.water),
    chrome.storage.sync.get(KEYS.waterStyle),
  ]);
  water = normalizeWater(savedWater);
  applyStyle(savedStyle ?? waterStyle);
  render();
} catch (error) {
  console.warn("No se pudo cargar el registro de agua", error);
}
