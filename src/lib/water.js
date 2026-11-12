// Hidratación diaria (Water Tracker): meta recomendada de 2 litros (2000 ml),
// registro de cada toma con su hora, estado de hidratación de Tilo (vital/rozagante
// o deshidratado tras 1 hora sin beber) e historial por día.
import { dayKey } from "./todos.js";

export const DAILY_GOAL_ML = 2000;
export const SERVING_ML = 250;
export const REMINDER_MS = 60 * 60 * 1000;
export const MAX_HISTORY_DAYS = 90;
export const WATER_STYLES = ["bottle", "drop"];
export const DEFAULT_WATER_STYLE = "bottle";

export function normalizeWaterStyle(value) {
  return WATER_STYLES.includes(value) ? value : DEFAULT_WATER_STYLE;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export function timeLabel(date = new Date()) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function formatLiters(ml, locale = "es-ES") {
  const liters = Math.max(0, Number(ml) || 0) / 1000;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(liters);
}

export function normalizeWater(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { days: {} };
  const sourceDays = raw.days && typeof raw.days === "object" && !Array.isArray(raw.days) ? raw.days : {};
  const validDays = Object.keys(sourceDays)
    .filter((key) => DAY_RE.test(key))
    .sort()
    .slice(-MAX_HISTORY_DAYS);

  const days = {};
  for (const key of validDays) {
    const item = sourceDays[key];
    if (!item || typeof item !== "object") continue;
    const rawEntries = Array.isArray(item.entries) ? item.entries : [];
    const entries = rawEntries
      .map((entry) => {
        const ml = Math.round(Number(entry?.ml));
        const at = Number(entry?.at);
        const time = typeof entry?.time === "string" && TIME_RE.test(entry.time) ? entry.time : null;
        if (!(ml > 0) || !Number.isFinite(at) || !time) return null;
        return { at, time, ml };
      })
      .filter(Boolean);
    const sum = entries.reduce((acc, entry) => acc + entry.ml, 0);
    const totalMl = sum > 0 ? sum : Math.max(0, Math.round(Number(item.totalMl) || 0));
    if (totalMl > 0) {
      days[key] = { totalMl, entries };
    }
  }
  return { days };
}

export function recordDrink(
  raw,
  { now = Date.now(), day = dayKey(new Date(now)), time = timeLabel(new Date(now)), ml = SERVING_ML } = {}
) {
  const state = normalizeWater(raw);
  const amount = Math.max(1, Math.round(Number(ml) || SERVING_ML));
  const current = state.days[day] ?? { totalMl: 0, entries: [] };
  const entries = [...current.entries, { at: now, time, ml: amount }];
  const totalMl = entries.reduce((acc, entry) => acc + entry.ml, 0);
  return normalizeWater({
    days: {
      ...state.days,
      [day]: { totalMl, entries },
    },
  });
}

export function undoDrink(raw, day = dayKey()) {
  const state = normalizeWater(raw);
  const current = state.days[day];
  if (!current || !current.entries.length) return state;
  const entries = current.entries.slice(0, -1);
  const nextDays = { ...state.days };
  if (entries.length === 0) {
    delete nextDays[day];
  } else {
    const totalMl = entries.reduce((acc, entry) => acc + entry.ml, 0);
    nextDays[day] = { totalMl, entries };
  }
  return normalizeWater({ days: nextDays });
}

export function hydrationStatus(raw, now = Date.now(), day = dayKey(new Date(now))) {
  const state = normalizeWater(raw);
  const current = state.days[day] ?? { totalMl: 0, entries: [] };
  const todayMl = current.totalMl;
  const entries = current.entries;
  const ratio = Math.min(1, todayMl / DAILY_GOAL_ML);
  const percent = Math.min(100, Math.round(ratio * 100));
  const goalMet = todayMl >= DAILY_GOAL_ML;
  const lastEntry = entries.at(-1) ?? null;
  const lastAt = lastEntry?.at ?? null;
  const lastTime = lastEntry?.time ?? null;
  const elapsedMs = lastAt === null ? null : Math.max(0, now - lastAt);
  const minutesSinceLast = elapsedMs === null ? null : Math.floor(elapsedMs / 60000);
  const needsWater = !goalMet && (lastAt === null || elapsedMs >= REMINDER_MS);

  let vitality = 1;
  if (!goalMet) {
    if (lastAt === null) {
      vitality = 0.2;
    } else if (elapsedMs >= REMINDER_MS) {
      const overtime = (elapsedMs - REMINDER_MS) / REMINDER_MS;
      vitality = Math.round(Math.max(0, 0.35 * (1 - overtime)) * 100) / 100;
    }
  }

  return {
    todayMl,
    goalMl: DAILY_GOAL_ML,
    ratio,
    percent,
    goalMet,
    entries,
    lastAt,
    lastTime,
    minutesSinceLast,
    needsWater,
    vitality,
    state: needsWater ? "dehydrated" : "vital",
  };
}

export function historyList(raw, today = dayKey()) {
  const state = normalizeWater(raw);
  return Object.entries(state.days)
    .filter(([day]) => day !== today)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([day, record]) => ({
      day,
      totalMl: record.totalMl,
      goalMet: record.totalMl >= DAILY_GOAL_ML,
      count: record.entries.length,
    }));
}
