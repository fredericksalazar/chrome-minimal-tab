import assert from "node:assert/strict";
import { test } from "node:test";
import es from "../src/i18n/es.js";
import { BACKGROUNDS, findBackground } from "../src/lib/backgrounds.js";
import { DEFAULT_ENGINE, ENGINES, findEngine, usesBrowserSearch } from "../src/lib/engines.js";

test("el motor de Chrome es el predeterminado y el primero de la lista", () => {
  assert.equal(DEFAULT_ENGINE, "chrome");
  assert.equal(Object.keys(ENGINES)[0], "chrome");
  assert.equal(findEngine(undefined).key, "chrome");
  assert.ok(usesBrowserSearch(ENGINES.chrome));
});

test("un motor guardado se conserva y solo el de Chrome usa chrome.search", () => {
  assert.equal(findEngine("google").key, "google");
  const browser = Object.entries(ENGINES).filter(([, engine]) => usesBrowserSearch(engine));
  assert.deepEqual(browser.map(([id]) => id), ["chrome"]);
});

test("un motor desconocido cae en el predeterminado", () => {
  assert.equal(findEngine("inexistente").key, DEFAULT_ENGINE);
  assert.equal(findEngine("bing").key, "bing");
});

test("los fondos tienen ids únicos por categoría y un tono válido", () => {
  for (const [type, { items }] of Object.entries(BACKGROUNDS)) {
    const ids = items.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length, `${type}: ids repetidos`);
    for (const item of items) assert.ok(["light", "dark"].includes(item.tone), `${type}/${item.id}: tono no válido`);
  }
});

test("findBackground devuelve null para selecciones desconocidas", () => {
  assert.equal(findBackground({ type: "gradient", id: "aurora" }).id, "aurora");
  assert.equal(findBackground({ type: "default" }), null);
  assert.equal(findBackground(undefined), null);
});

test("cada fondo y cada categoría del catálogo tiene nombre en el diccionario", () => {
  for (const [type, { items }] of Object.entries(BACKGROUNDS)) {
    assert.ok(es[`bg.${type}`], `falta bg.${type}`);
    for (const item of items) assert.ok(es[`bgName.${item.id}`], `falta bgName.${item.id}`);
  }
});
