import assert from "node:assert/strict";
import { test } from "node:test";
import es from "../src/i18n/es.js";
import { CATEGORIES, CATEGORY_IDS, classify, proposeGroups, siteKey, suggestCategory } from "../src/lib/classify.js";
import { GROUP_COLORS } from "../src/lib/groups.js";

const item = (url, title = "") => ({ id: url, url, title });

test("hay 13 temas con emoji, color de la marca y nombre en el diccionario", () => {
  assert.equal(CATEGORIES.length, 13);
  for (const category of CATEGORIES) {
    assert.ok(category.emoji, category.id);
    assert.ok(GROUP_COLORS[category.color], `${category.id}: color fuera de la paleta`);
    assert.ok(es[`group.cat.${category.id}`], `falta group.cat.${category.id}`);
  }
});

test("classify reconoce sitios conocidos, subdominios y rutas", () => {
  assert.equal(classify(item("https://www.amazon.es/dp/123")), "shopping");
  assert.equal(classify(item("https://mail.google.com/mail/u/0")), "mail");
  assert.equal(classify(item("https://docs.google.com/document/d/1")), "work");
  assert.equal(classify(item("https://github.com/x/y")), "dev");
  assert.equal(classify(item("https://es.wikipedia.org/wiki/Tilo")), "learn");
  assert.equal(classify(item("https://www.google.com/maps/place/x")), "travel");
  assert.equal(classify(item("https://claude.ai/new")), "ai");
});

test("classify usa palabras del nombre si el sitio no es conocido y null si no hay pistas", () => {
  assert.equal(classify(item("https://mitiendita.co", "Mi tienda de ropa")), "shopping");
  assert.equal(classify(item("https://bancoabc.example", "Banco ABC")), "finance");
  assert.equal(classify(item("https://example.org", "Algo")), null);
});

test("las correcciones del usuario mandan sobre el diccionario", () => {
  const url = "https://www.youtube.com/";
  assert.equal(classify(item(url)), "video");
  assert.equal(classify(item(url), { [siteKey(url)]: "none" }), null);
  assert.equal(classify(item(url), { [siteKey(url)]: "c:learn" }), "learn");
  assert.equal(classify(item(url), { [siteKey(url)]: "g:clase" }), null);
});

test("suggestCategory solo sugiere un tema claramente mayoritario", () => {
  const items = [item("https://amazon.com"), item("https://ebay.com"), item("https://github.com")];
  assert.equal(suggestCategory(items), "shopping");
  assert.equal(suggestCategory([item("https://example.org")]), null);
  // Empate o temas mezclados: nombre neutro
  assert.equal(suggestCategory([item("https://amazon.com"), item("https://github.com")]), null);
  assert.equal(suggestCategory([item("https://mail.google.com"), item("https://elpais.com"), item("https://wikipedia.org")]), null);
  // Mitad justa con un acceso sin tema: vale
  assert.equal(suggestCategory([item("https://github.com"), item("https://example.org")]), "dev");
});

test("proposeGroups agrupa por tema, exige dos accesos y deja suelto lo demás", () => {
  const loose = [
    item("https://amazon.com"),
    item("https://github.com"),
    item("https://ebay.com"),
    item("https://netflix.com"),
    item("https://example.org"),
    item("https://gitlab.com"),
    item("https://aliexpress.com"),
  ];
  const { groups, loose: rest } = proposeGroups(loose);
  assert.deepEqual(
    groups.map((group) => [group.category, group.groupId, group.items.map((it) => it.url)]),
    [
      ["shopping", null, ["https://amazon.com", "https://ebay.com", "https://aliexpress.com"]],
      ["dev", null, ["https://github.com", "https://gitlab.com"]],
    ]
  );
  assert.deepEqual(rest.map((it) => it.url), ["https://netflix.com", "https://example.org"]);
});

test("proposeGroups mete en las cajas que ya existen y respeta las pistas a una caja", () => {
  const loose = [item("https://netflix.com"), item("https://youtube.com"), item("https://example.org")];
  const groups = [
    { id: "g1", key: "pelis", category: "video" },
    { id: "g2", key: "otros", category: null },
  ];
  const hints = { "example.org": "g:otros" };
  const result = proposeGroups(loose, groups, hints);
  assert.deepEqual(
    result.groups.map((group) => [group.groupId, group.items.length]),
    [["g1", 2], ["g2", 1]]
  );
  assert.deepEqual(result.loose, []);
  assert.ok(CATEGORY_IDS.includes(result.groups[0].category));
});
