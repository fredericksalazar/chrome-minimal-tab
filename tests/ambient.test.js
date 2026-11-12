import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CLOUD_TRACK,
  EPISODES,
  REST,
  episodeDuration,
  firstEpisode,
  pickEpisode,
  restDelay,
  windShift,
} from "../src/lib/ambient.js";

test("de día hay viento, pájaros y motas; de noche viento, estrella fugaz, aurora, estrellas y luciérnagas", () => {
  assert.deepEqual(Object.keys(EPISODES.day), ["wind", "birds", "motes"]);
  assert.deepEqual(Object.keys(EPISODES.night), ["wind", "meteor", "aurora", "shimmer", "motes"]);
  assert.equal(firstEpisode(false), "birds");
  assert.equal(firstEpisode(true), "aurora");
});

test("pickEpisode elige uno del momento del día sin repetir el anterior", () => {
  assert.equal(pickEpisode(false, null, 0), "wind");
  assert.equal(pickEpisode(false, "wind", 0), "birds");
  assert.equal(pickEpisode(false, "wind", 0.99), "motes");
  assert.equal(pickEpisode(true, "aurora", 0.6), "shimmer");
  for (let i = 0; i < 20; i++) {
    const night = i % 2 === 0;
    const name = pickEpisode(night, "wind", i / 20);
    assert.notEqual(name, "wind");
    assert.ok(name in EPISODES[night ? "night" : "day"]);
  }
});

test("los episodios son cortos y los descansos largos, para que la escena casi siempre esté quieta", () => {
  assert.equal(episodeDuration(true, "meteor"), 1600);
  assert.equal(episodeDuration(false, "aurora"), 0);
  assert.equal(restDelay(0), REST.min);
  assert.equal(restDelay(1), REST.max);
  const longest = Math.max(...Object.values(EPISODES.day), ...Object.values(EPISODES.night));
  assert.ok(longest < REST.min * 2);
});

test("windShift empuja la nube hacia la derecha y la devuelve a la izquierda al salir", () => {
  assert.deepEqual(windShift(20, 0), { from: 20, to: 24 });
  assert.deepEqual(windShift(20, 1), { from: 20, to: 28 });
  assert.deepEqual(windShift(CLOUD_TRACK - 2, 0.5), { from: 0, to: 6 });
});
