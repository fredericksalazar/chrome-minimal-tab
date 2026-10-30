import assert from "node:assert/strict";
import { test } from "node:test";
import es from "../src/i18n/es.js";
import { createTranslator } from "../src/lib/i18n.js";
import { findCities, forecastUrl, geocodingUrl, MAX_CITY_RESULTS, needsChoice, parseGeocoding, sourceLabel } from "../src/lib/weather.js";

test("needsChoice pide elegir si no hay un modo válido guardado", () => {
  assert.equal(needsChoice(undefined), true);
  assert.equal(needsChoice({}), true);
  assert.equal(needsChoice({ mode: "gps" }), true);
  assert.equal(needsChoice({ mode: "location" }), false);
  assert.equal(needsChoice({ mode: "city", city: { name: "Cali" } }), false);
  assert.equal(needsChoice({ mode: "off" }), false);
});

test("geocodingUrl envía solo el texto escrito, codificado y sin espacios sobrantes", () => {
  const url = new URL(geocodingUrl("  San José "));
  assert.equal(url.hostname, "geocoding-api.open-meteo.com");
  assert.equal(url.searchParams.get("name"), "San José");
  assert.equal(url.searchParams.get("count"), String(MAX_CITY_RESULTS));
  assert.equal(url.searchParams.get("language"), "es");
});

test("forecastUrl pide el tiempo actual de unas coordenadas", () => {
  const url = new URL(forecastUrl(3.43, -76.52));
  assert.equal(url.hostname, "api.open-meteo.com");
  assert.equal(url.searchParams.get("latitude"), "3.43");
  assert.equal(url.searchParams.get("longitude"), "-76.52");
  assert.equal(url.searchParams.get("current"), "temperature_2m,weather_code,is_day");
});

test("parseGeocoding devuelve como mucho 5 ciudades con región y país", () => {
  const place = { name: "Santiago de Cali", admin1: "Valle del Cauca", country: "Colombia", latitude: 3.43, longitude: -76.52 };
  const results = parseGeocoding({ results: Array(8).fill(place) });
  assert.equal(results.length, MAX_CITY_RESULTS);
  assert.deepEqual(results[0], { name: "Santiago de Cali", detail: "Santiago de Cali, Valle del Cauca, Colombia", latitude: 3.43, longitude: -76.52 });
});

test("parseGeocoding sin resultados devuelve una lista vacía", () => {
  assert.deepEqual(parseGeocoding({}), []);
  assert.deepEqual(parseGeocoding(null), []);
  assert.deepEqual(parseGeocoding({ results: [{ name: "Lugar", latitude: 1, longitude: 2 }] })[0].detail, "Lugar");
});

test("sourceLabel describe la elección en el panel", () => {
  const t = createTranslator(es);
  assert.equal(sourceLabel({ mode: "location" }, t), "Con tu ubicación");
  assert.equal(sourceLabel({ mode: "city", city: { name: "Cali" } }, t), "Ciudad: Cali");
  assert.equal(sourceLabel({ mode: "off" }, t), "Desactivado");
  assert.equal(sourceLabel(undefined, t), "Sin elegir");
});

test("findCities pide la geocodificación y devuelve las ciudades", async () => {
  let asked;
  const fetcher = async (url) => {
    asked = url;
    return { ok: true, json: async () => ({ results: [{ name: "Cali", admin1: "Valle del Cauca", country: "Colombia", latitude: 3.4, longitude: -76.5 }] }) };
  };
  const cities = await findCities("Cali", fetcher);
  assert.equal(new URL(asked).searchParams.get("name"), "Cali");
  assert.equal(cities[0].detail, "Cali, Valle del Cauca, Colombia");
});

test("findCities sin resultados devuelve una lista vacía y con error de red lanza", async () => {
  assert.deepEqual(await findCities("zzzz", async () => ({ ok: true, json: async () => ({}) })), []);
  await assert.rejects(findCities("Cali", async () => ({ ok: false, status: 500 })));
});

test("geocodingUrl pide los nombres de ciudad en el idioma de Tilo", () => {
  assert.equal(new URL(geocodingUrl("Tokio")).searchParams.get("language"), "es");
  assert.equal(new URL(geocodingUrl("Tokio", "ja")).searchParams.get("language"), "ja");
});
