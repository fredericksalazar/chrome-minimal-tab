import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { FOLDER_TITLES } from "../src/lib/bookmarks.js";
import { FALLBACK, LANGUAGES, createTranslator, detectLanguage, localeOf, normalizeLanguage, pickLanguage } from "../src/lib/i18n.js";

const dictionaries = Object.fromEntries(
  await Promise.all(LANGUAGES.map(async ({ id }) => [id, (await import(`../src/i18n/${id}.js`)).default]))
);
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map(([, name]) => name).sort();
const chromeLocale = { es: "es", en: "en", fr: "fr", it: "it", de: "de", pt: "pt_BR", ja: "ja", ko: "ko", zh: "zh_CN" };

test("Tilo tiene los nueve idiomas pedidos, con inglés de respaldo", () => {
  assert.deepEqual(LANGUAGES.map(({ id }) => id), ["es", "en", "fr", "it", "de", "pt", "ja", "ko", "zh"]);
  assert.equal(FALLBACK, "en");
});

test("todos los diccionarios tienen las mismas claves, sin textos vacíos", () => {
  const keys = Object.keys(dictionaries.es).sort();
  for (const [id, dictionary] of Object.entries(dictionaries)) {
    assert.deepEqual(Object.keys(dictionary).sort(), keys, `${id}: claves distintas`);
    for (const [key, text] of Object.entries(dictionary)) assert.ok(text.trim(), `${id}/${key} vacío`);
  }
});

test("cada traducción usa los mismos {parámetros} que el español", () => {
  for (const [id, dictionary] of Object.entries(dictionaries)) {
    for (const [key, text] of Object.entries(dictionaries.es)) {
      assert.deepEqual(placeholders(dictionary[key]), placeholders(text), `${id}/${key}`);
    }
  }
});

test("la carpeta de accesos directos se llama igual en el diccionario, en _locales y en la lista de búsqueda", () => {
  for (const { id } of LANGUAGES) {
    const messages = JSON.parse(readFileSync(new URL(`../_locales/${chromeLocale[id]}/messages.json`, import.meta.url)));
    assert.equal(messages.folderTitle.message, dictionaries[id].folderTitle, id);
    assert.ok(FOLDER_TITLES.includes(dictionaries[id].folderTitle), id);
    assert.ok(dictionaries[id]["shortcuts.emptyHint"].includes(dictionaries[id].folderTitle), `${id}: la pista no nombra la carpeta`);
  }
});

test("_locales tiene los mismos mensajes en todos los idiomas y la descripción cabe en la tienda", () => {
  const keys = Object.keys(JSON.parse(readFileSync(new URL("../_locales/en/messages.json", import.meta.url)))).sort();
  for (const folder of Object.values(chromeLocale)) {
    const messages = JSON.parse(readFileSync(new URL(`../_locales/${folder}/messages.json`, import.meta.url)));
    assert.deepEqual(Object.keys(messages).sort(), keys, folder);
    assert.ok(messages.appDescription.message.length <= 132, `${folder}: descripción de más de 132 caracteres`);
    assert.ok(messages.appName.message.length <= 75, `${folder}: nombre de más de 75 caracteres`);
  }
});

test("detectLanguage toma el primer idioma disponible y si no, inglés", () => {
  assert.equal(detectLanguage(["pt-BR", "en"]), "pt");
  assert.equal(detectLanguage(["nl-NL", "de"]), "de");
  assert.equal(detectLanguage(["zh-TW"]), "zh");
  assert.equal(detectLanguage(["nl"]), "en");
  assert.equal(detectLanguage(undefined), "en");
});

test("pickLanguage respeta la elección y en Automático detecta", () => {
  assert.equal(pickLanguage("ja", ["es"]), "ja");
  assert.equal(pickLanguage("auto", ["fr-CA"]), "fr");
  assert.equal(pickLanguage("klingon", ["ko"]), "ko");
  assert.equal(normalizeLanguage("xx"), "auto");
  assert.equal(localeOf("zh"), "zh-CN");
  assert.equal(localeOf("xx"), "en-US");
});

test("createTranslator sustituye parámetros, usa el respaldo y elige plural", () => {
  const t = createTranslator({ hi: "Hola {name}", "n.one": "{n} error", "n.other": "{n} errores" }, { bye: "Bye" }, "es-ES");
  assert.equal(t("hi", { name: "Ana" }), "Hola Ana");
  assert.equal(t("bye"), "Bye");
  assert.equal(t("missing"), "missing");
  assert.equal(t.plural("n", 1), "1 error");
  assert.equal(t.plural("n", 3), "3 errores");
  assert.equal(createTranslator(dictionaries.ja, {}, "ja-JP").plural("speed.errors", 1), dictionaries.ja["speed.errors.other"].replace("{n}", "1"));
});
