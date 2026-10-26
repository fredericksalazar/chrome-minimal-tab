import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { BACKGROUNDS, findBackground } from "../src/lib/backgrounds.js";
import { DEFAULT_ENGINE, ENGINES, findEngine } from "../src/lib/engines.js";

const logo = (file) => new URL(`../assets/logos/${file}`, import.meta.url);

test("cada motor tiene sus logos claro y oscuro en assets/logos", () => {
  for (const [id, engine] of Object.entries(ENGINES)) {
    assert.ok(existsSync(logo(engine.logo)), `${id}: falta ${engine.logo}`);
    assert.ok(existsSync(logo(engine.dark)), `${id}: falta ${engine.dark}`);
  }
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
  assert.equal(findBackground({ type: "gradient", id: "aurora" }).name, "Aurora boreal");
  assert.equal(findBackground({ type: "default" }), null);
  assert.equal(findBackground(undefined), null);
});
