import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DAILY_GOAL_ML,
  DEFAULT_WATER_STYLE,
  REMINDER_MS,
  SERVING_ML,
  WATER_STYLES,
  formatLiters,
  historyList,
  hydrationStatus,
  normalizeWater,
  normalizeWaterStyle,
  recordDrink,
  undoDrink,
} from "../src/lib/water.js";

test("el objetivo diario recomendado es de 2 litros en tomas de 250 ml, con estilos botella y gota", () => {
  assert.equal(DAILY_GOAL_ML, 2000);
  assert.equal(SERVING_ML, 250);
  assert.equal(REMINDER_MS, 3600000);
  assert.deepEqual(WATER_STYLES, ["bottle", "drop"]);
  assert.equal(DEFAULT_WATER_STYLE, "bottle");
  assert.equal(normalizeWaterStyle("drop"), "drop");
  assert.equal(normalizeWaterStyle("bottle"), "bottle");
  assert.equal(normalizeWaterStyle("otro"), "bottle");
});

test("recordDrink registra cada toma con su hora exacta y undoDrink deshace la última del día", () => {
  const t1 = Date.parse("2026-11-11T09:15:00");
  const t2 = Date.parse("2026-11-11T10:30:00");

  let state = normalizeWater(null);
  state = recordDrink(state, { now: t1, day: "2026-11-11", time: "09:15" });
  state = recordDrink(state, { now: t2, day: "2026-11-11", time: "10:30" });

  const status = hydrationStatus(state, t2 + 10 * 60000, "2026-11-11");
  assert.equal(status.todayMl, 500);
  assert.equal(status.ratio, 0.25);
  assert.equal(status.percent, 25);
  assert.equal(status.lastTime, "10:30");
  assert.equal(status.entries.length, 2);
  assert.deepEqual(
    status.entries.map((e) => ({ time: e.time, ml: e.ml })),
    [
      { time: "09:15", ml: 250 },
      { time: "10:30", ml: 250 },
    ]
  );

  const afterUndo = undoDrink(state, "2026-11-11");
  const statusUndo = hydrationStatus(afterUndo, t2 + 10 * 60000, "2026-11-11");
  assert.equal(statusUndo.todayMl, 250);
  assert.equal(statusUndo.lastTime, "09:15");
});

test("hydrationStatus marca a Tilo rozagante si bebió hace menos de 1 hora y deshidratado si pasa 1 hora o no ha bebido", () => {
  const start = Date.parse("2026-11-11T09:00:00");

  // Sin beber hoy: deshidratado y necesita agua
  const empty = hydrationStatus({}, start, "2026-11-11");
  assert.equal(empty.state, "dehydrated");
  assert.equal(empty.needsWater, true);
  assert.ok(empty.vitality < 0.5);

  // Recién bebido: vital y rozagante
  const drank = recordDrink({}, { now: start, day: "2026-11-11", time: "09:00" });
  const fresh = hydrationStatus(drank, start + 30 * 60000, "2026-11-11");
  assert.equal(fresh.state, "vital");
  assert.equal(fresh.needsWater, false);
  assert.equal(fresh.vitality, 1);

  // Pasada 1 hora sin beber (y con menos de 2 L): deshidratado y pide agua
  const oneHourLater = hydrationStatus(drank, start + REMINDER_MS, "2026-11-11");
  assert.equal(oneHourLater.state, "dehydrated");
  assert.equal(oneHourLater.needsWater, true);
  assert.ok(oneHourLater.vitality < 0.5);

  // Al alcanzar los 2 litros: siempre vital el resto del día aunque pase más de 1 hora
  let full = {};
  for (let i = 0; i < 8; i++) {
    full = recordDrink(full, { now: start + i * 1000, day: "2026-11-11", time: "09:00" });
  }
  const done = hydrationStatus(full, start + 3 * REMINDER_MS, "2026-11-11");
  assert.equal(done.goalMet, true);
  assert.equal(done.ratio, 1);
  assert.equal(done.state, "vital");
  assert.equal(done.needsWater, false);
  assert.equal(done.vitality, 1);
});

test("historyList conserva el registro histórico de cada día ordenado del más reciente al más antiguo", () => {
  let state = {};
  state = recordDrink(state, { now: 1000, day: "2026-11-09", time: "10:00", ml: 1500 });
  state = recordDrink(state, { now: 2000, day: "2026-11-10", time: "11:00", ml: 2000 });
  state = recordDrink(state, { now: 3000, day: "2026-11-11", time: "09:00", ml: 500 });

  const history = historyList(state, "2026-11-11");
  assert.deepEqual(history, [
    { day: "2026-11-10", totalMl: 2000, goalMet: true, count: 1 },
    { day: "2026-11-09", totalMl: 1500, goalMet: false, count: 1 },
  ]);
  assert.equal(formatLiters(2000, "en-US"), "2.0");
  assert.equal(formatLiters(1250, "en-US"), "1.25");
});
