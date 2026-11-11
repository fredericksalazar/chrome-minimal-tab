import assert from "node:assert/strict";
import { test } from "node:test";
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
