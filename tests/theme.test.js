import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_THEME, THEMES, normalizeTheme, resolveTheme } from "../src/lib/theme.js";

test("THEMES ofrece Claro, Oscuro y Dispositivo, y por defecto sigue al sistema", () => {
  assert.deepEqual(THEMES.map((theme) => theme.name), ["Claro", "Oscuro", "Dispositivo"]);
  assert.equal(DEFAULT_THEME, "system");
});

test("normalizeTheme acepta los tres temas y lo demás vuelve a Dispositivo", () => {
  assert.equal(normalizeTheme("dark"), "dark");
  assert.equal(normalizeTheme("light"), "light");
  assert.equal(normalizeTheme("sepia"), "system");
  assert.equal(normalizeTheme(undefined), "system");
});

test("resolveTheme sigue al sistema solo con Dispositivo", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme(undefined, true), "dark");
});
