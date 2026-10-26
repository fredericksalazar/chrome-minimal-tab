import assert from "node:assert/strict";
import { test } from "node:test";
import { createMeter, jitter, median, toMbps } from "../src/lib/speedtest.js";

test("median con número par e impar de muestras", () => {
  assert.equal(median([30, 10, 20]), 20);
  assert.equal(median([40, 10, 20, 30]), 25);
});

test("jitter es la variación media entre muestras consecutivas", () => {
  assert.equal(jitter([10, 14, 12, 18]), (4 + 2 + 6) / 3);
  assert.equal(jitter([15]), 0);
});

test("toMbps convierte bytes y milisegundos a megabits por segundo", () => {
  assert.equal(toMbps(1_250_000, 1000), 10);
  assert.equal(toMbps(1000, 0), 0);
});

test("el medidor descarta el arranque al calcular la media", () => {
  let clock = 0;
  const meter = createMeter(() => clock);

  // Arranque lento: 1 MB en 1,5 s
  meter.add(1_000_000);
  clock = 1500;
  meter.tick();

  // Régimen estable: 12,5 MB en 1 s = 100 Mbps
  meter.add(12_500_000);
  clock = 2500;
  meter.tick();

  assert.equal(Math.round(meter.average()), 100);
});
