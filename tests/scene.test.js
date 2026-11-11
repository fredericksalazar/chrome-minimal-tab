import assert from "node:assert/strict";
import { test } from "node:test";
import es from "../src/i18n/es.js";
import { DEFAULT_SCENE, LANDSCAPES, SCENE_MODES, normalizeScene, sceneSky, sceneVars } from "../src/lib/scene.js";

test("la escena predeterminada es el valle dinámico con el conejo a tamaño normal", () => {
  assert.deepEqual(DEFAULT_SCENE, { landscape: "valley", mode: "dynamic", pet: "rabbit", size: 100 });
  assert.deepEqual(normalizeScene(undefined), DEFAULT_SCENE);
});

test("normalizeScene conserva lo válido y corrige lo demás campo a campo", () => {
  assert.deepEqual(normalizeScene({ landscape: "valley", mode: "night", pet: "owl", size: 150 }), { landscape: "valley", mode: "night", pet: "owl", size: 150 });
  assert.deepEqual(normalizeScene({ landscape: "luna", mode: "raro", pet: "dragon", size: 999 }), { ...DEFAULT_SCENE, size: 200 });
  assert.deepEqual(normalizeScene({ pet: "none" }), { ...DEFAULT_SCENE, pet: "none" });
});

test("normalizeScene lleva al valle los fondos de versiones anteriores", () => {
  assert.deepEqual(normalizeScene({ type: "gradient", id: "aurora" }), DEFAULT_SCENE);
  assert.deepEqual(normalizeScene({ type: "plain" }), DEFAULT_SCENE);
  assert.deepEqual(normalizeScene({ type: "default" }), DEFAULT_SCENE);
  // El valle guardado antes de tener paisajes conserva modo, mascota y tamaño
  assert.deepEqual(normalizeScene({ type: "valley", mode: "day", pet: "fox", size: 130 }), { landscape: "valley", mode: "day", pet: "fox", size: 130 });
});

test("cada paisaje y cada modo tiene nombre en el diccionario", () => {
  for (const id of LANDSCAPES) assert.ok(es[`landscape.${id}`], `falta landscape.${id}`);
  for (const mode of SCENE_MODES) assert.ok(es[`scene.${mode}`], `falta scene.${mode}`);
});

test("sceneSky dinámico: sol de día, luna de noche y cada uno a mitad de camino a su hora", () => {
  const noon = sceneSky("dynamic", 12 * 60);
  assert.deepEqual([noon.night, noon.dusk, noon.sun, noon.sunUp, noon.moonUp, noon.tone], [0, 0, 0.5, true, false, "light"]);
  const midnight = sceneSky("dynamic", 0);
  assert.deepEqual([midnight.night, midnight.moon, midnight.sunUp, midnight.moonUp, midnight.tone], [1, 0.5, false, true, "dark"]);
  assert.equal(sceneSky("dynamic", 9 * 60).sun, 0.25);
  assert.equal(sceneSky("dynamic", 21 * 60).moon, 0.25);
  assert.equal(sceneSky("dynamic", 3 * 60).moon, 0.75);
});

test("sceneSky dinámico: al atardecer el sol se oculta, sale la luna y hay resplandor", () => {
  const before = sceneSky("dynamic", 18 * 60 - 1);
  assert.equal(before.sunUp, true);
  assert.ok(before.sun > 0.99);
  const sunset = sceneSky("dynamic", 18 * 60);
  assert.deepEqual([sunset.sunUp, sunset.moonUp, sunset.moon, sunset.dusk, sunset.night], [false, true, 0, 1, 0.5]);
  assert.equal(sceneSky("dynamic", 6 * 60).dusk, 1);
  assert.equal(sceneSky("dynamic", 19 * 60).night, 1);
  assert.equal(sceneSky("dynamic", 7 * 60).night, 0);
});

test("sceneSky fijo: día y noche no cambian de cielo y su astro nunca se oculta", () => {
  for (const minutes of [0, 359, 360, 720, 1080, 1439]) {
    const day = sceneSky("day", minutes);
    const night = sceneSky("night", minutes);
    assert.deepEqual([day.night, day.sunUp, day.moonUp, day.tone], [0, true, false, "light"]);
    assert.deepEqual([night.night, night.sunUp, night.moonUp, night.tone], [1, false, true, "dark"]);
    assert.ok(day.sun >= 0.22 && day.sun <= 0.78);
  }
});

test("sceneVars traduce el cielo a variables CSS", () => {
  assert.deepEqual(sceneVars(sceneSky("dynamic", 12 * 60)), {
    "--scene-night": "0",
    "--scene-dusk": "0",
    "--scene-sun": "0.5",
    "--scene-moon": "0",
    "--scene-sun-on": "1",
    "--scene-moon-on": "0",
  });
});
