import assert from "node:assert/strict";
import { test } from "node:test";
import { forecastUrl, geocodingUrl, MAX_CITY_RESULTS, needsChoice, parseGeocoding, sourceLabel } from "../src/lib/weather.js";

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
  assert.equal(sourceLabel({ mode: "location" }), "Con tu ubicación");
  assert.equal(sourceLabel({ mode: "city", city: { name: "Cali" } }), "Ciudad: Cali");
  assert.equal(sourceLabel({ mode: "off" }), "Desactivado");
  assert.equal(sourceLabel(undefined), "Sin elegir");
});
