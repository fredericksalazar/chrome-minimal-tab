import assert from "node:assert/strict";
import { test } from "node:test";
import { hostname, looksLikeUrl, normalizeUrl } from "../src/lib/url.js";

test("normalizeUrl añade https y acepta direcciones habituales", () => {
  assert.equal(normalizeUrl("github.com"), "https://github.com/");
  assert.equal(normalizeUrl("  https://github.com/x  "), "https://github.com/x");
  assert.equal(normalizeUrl("localhost:3000"), "https://localhost:3000/");
  assert.equal(normalizeUrl("http://example.org/a?b=1"), "http://example.org/a?b=1");
});

test("normalizeUrl rechaza texto que no es una URL web", () => {
  assert.equal(normalizeUrl(""), null);
  assert.equal(normalizeUrl("no es url"), null);
  assert.equal(normalizeUrl("palabra"), null);
  assert.equal(normalizeUrl("ftp://example.org"), null);
  assert.equal(normalizeUrl("javascript:alert(1)"), null);
});

test("looksLikeUrl distingue direcciones de búsquedas", () => {
  assert.ok(looksLikeUrl("github.com"));
  assert.ok(looksLikeUrl("https://es.wikipedia.org/wiki/Chrome"));
  assert.ok(looksLikeUrl("localhost:8080/app"));
  assert.ok(!looksLikeUrl("receta de arepas"));
  assert.ok(!looksLikeUrl("chrome"));
});

test("hostname quita www y tolera entradas no válidas", () => {
  assert.equal(hostname("https://www.coursera.org/learn"), "coursera.org");
  assert.equal(hostname("no-url"), "no-url");
});
