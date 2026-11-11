import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GAITS,
  PETS,
  PET_RADIUS,
  appearanceDelay,
  clampPetSize,
  countTasks,
  fleeDirection,
  greetingLine,
  hopTarget,
  isPointerNear,
  moveSteps,
  normalizePet,
  pauseDelay,
  petBriefing,
  petLines,
  pickLine,
  speechDelay,
} from "../src/lib/pet.js";

const keys = (lines) => lines.map(({ key }) => key);

test("hay cinco mascotas y un alienígena, y lo desconocido vuelve al conejo", () => {
  assert.deepEqual(PETS, ["rabbit", "dog", "cat", "fox", "owl", "alien"]);
  assert.equal(normalizePet("alien"), "alien");
  assert.equal(normalizePet("none"), "none");
  assert.equal(normalizePet("dragon"), "rabbit");
  assert.equal(normalizePet(undefined), "rabbit");
});

test("appearanceDelay: asoma nada más abrir y vuelve pronto tras esconderse", () => {
  assert.equal(appearanceDelay(0, true), 150);
  assert.equal(appearanceDelay(1, true), 400);
  assert.equal(appearanceDelay(0), 6000);
  assert.equal(appearanceDelay(1), 14000);
});

test("speechDelay deja entre 50 y 120 segundos entre frases", () => {
  assert.equal(speechDelay(0), 50000);
  assert.equal(speechDelay(1), 120000);
});

test("countTasks cuenta las tareas principales y recorta el texto de la siguiente", () => {
  const tasks = [
    { id: "a", text: "Hecha", parentId: null, done: true },
    { id: "b", text: "  Llamar al banco ", parentId: null, done: false },
    { id: "c", text: "Subtarea", parentId: "b", done: false },
  ];
  assert.deepEqual(countTasks(tasks), { total: 2, pending: 1, next: "Llamar al banco" });
  assert.deepEqual(countTasks(undefined), { total: 0, pending: 0, next: "" });
  const long = countTasks([{ id: "x", text: "a".repeat(80), parentId: null, done: false }]).next;
  assert.equal(long.length, 40);
  assert.ok(long.endsWith("…"));
});

test("isPointerNear mide la distancia al centro de la mascota", () => {
  const rect = { left: 100, top: 200, width: 40, height: 36 };
  assert.equal(isPointerNear({ x: 120, y: 218 }, rect), true);
  assert.equal(isPointerNear({ x: 120 + PET_RADIUS, y: 218 }, rect), true);
  assert.equal(isPointerNear({ x: 121 + PET_RADIUS, y: 218 }, rect), false);
  assert.equal(isPointerNear({ x: 120, y: 218 - 2 * PET_RADIUS }, rect), false);
});

test("fleeDirection aleja a la mascota del cursor", () => {
  assert.equal(fleeDirection(500, 520), -1);
  assert.equal(fleeDirection(500, 480), 1);
});

test("hopTarget avanza y da la vuelta antes de salirse del margen", () => {
  assert.deepEqual(hopTarget(500, 1, 50, 1000), { x: 550, direction: 1 });
  assert.deepEqual(hopTarget(880, 1, 50, 1000), { x: 830, direction: -1 });
  assert.deepEqual(hopTarget(120, -1, 50, 1000), { x: 170, direction: 1 });
});

test("greetingLine saluda según la hora", () => {
  assert.deepEqual(greetingLine(8), { key: "pet.morning" });
  assert.deepEqual(greetingLine(15), { key: "pet.afternoon" });
  assert.deepEqual(greetingLine(23), { key: "pet.night" });
  assert.deepEqual(greetingLine(3), { key: "pet.night" });
});

test("petBriefing saluda, cuenta las tareas, dice el clima e invita a beber agua", () => {
  const weather = { city: "Bogotá", temperature: 17.6, code: 63 };
  assert.deepEqual(petBriefing({ hour: 9, total: 5, pending: 3, weather }, () => "weather.rain"), [
    { key: "pet.morning" },
    { key: "pet.progress", params: { done: 2, pending: 3 } },
    { key: "pet.weatherIn", params: { temp: 18, city: "Bogotá" }, translate: { condition: "weather.rain" } },
    { key: "pet.water" },
  ]);
});

test("petBriefing se adapta a no tener tareas, tenerlas todas hechas o no tener clima", () => {
  assert.deepEqual(keys(petBriefing({ hour: 15 })), ["pet.afternoon", "pet.noTasks", "pet.water"]);
  assert.deepEqual(keys(petBriefing({ hour: 22, total: 2, pending: 0 })), ["pet.night", "pet.tasksDone", "pet.water"]);
  assert.deepEqual(keys(petBriefing({ weather: { temperature: 20, code: 0 } })), ["pet.afternoon", "pet.noTasks", "pet.weather", "pet.water"]);
  assert.deepEqual(keys(petBriefing({ weather: { city: "Lima" } })), ["pet.afternoon", "pet.noTasks", "pet.water"]);
});

test("petLines reacciona al día y a la hora", () => {
  assert.ok(keys(petLines({ weekday: 1, hour: 9 }).contextual).includes("pet.weekStart"));
  assert.ok(!keys(petLines({ weekday: 1, hour: 16 }).contextual).includes("pet.weekStart"));
  assert.ok(keys(petLines({ weekday: 5, hour: 16 }).contextual).includes("pet.friday"));
  assert.ok(keys(petLines({ weekday: 6 }).contextual).includes("pet.weekend"));
  assert.ok(keys(petLines({ hour: 2 }).contextual).includes("pet.lateNight"));
  assert.ok(keys(petLines({ hour: 13 }).contextual).includes("pet.lunch"));
});

test("petLines habla de las tareas nombrando la siguiente", () => {
  const several = petLines({ total: 5, pending: 3, next: "Llamar al banco" }).contextual;
  assert.deepEqual(several.find(({ key }) => key === "pet.startWith"), { key: "pet.startWith", params: { task: "Llamar al banco" } });
  assert.deepEqual(several.find(({ key }) => key === "pet.tasks"), { key: "pet.tasks", params: { n: 3 } });
  assert.ok(!keys(several).includes("pet.halfway"));
  const last = petLines({ total: 4, pending: 1, next: "Enviar informe" }).contextual;
  assert.deepEqual(last.find(({ key }) => key === "pet.lastOne"), { key: "pet.lastOne", params: { task: "Enviar informe" } });
  assert.deepEqual(last.find(({ key }) => key === "pet.halfway"), { key: "pet.halfway", params: { done: 3, total: 4 } });
  assert.ok(keys(petLines({ total: 2, pending: 0 }).contextual).includes("pet.tasksDone"));
  assert.ok(!keys(petLines({}).contextual).some((key) => key.includes("ask")));
});

test("petLines reacciona al clima, al rato con la pestaña abierta y al paisaje", () => {
  assert.ok(keys(petLines({ weather: { temperature: 15, code: 61 } }).contextual).includes("pet.rain"));
  assert.deepEqual(petLines({ weather: { temperature: 30.4, code: 1 } }).contextual.find(({ key }) => key === "pet.hot"), { key: "pet.hot", params: { temp: 30 } });
  assert.ok(keys(petLines({ weather: { temperature: 3, code: 3 } }).contextual).includes("pet.cold"));
  assert.ok(keys(petLines({ hour: 10, weather: { temperature: 20, code: 0 } }).contextual).includes("pet.clearSky"));
  assert.ok(keys(petLines({ minutesOpen: 25 }).contextual).includes("pet.longSession"));
  assert.deepEqual(keys(petLines({ hour: 10 }).contextual), ["pet.birds"]);
  assert.deepEqual(keys(petLines({ hour: 22, night: true }).contextual), ["pet.aurora", "pet.stars"]);
  assert.ok(keys(petLines({ dusk: true }).contextual).includes("pet.sunset"));
  assert.ok(keys(petLines({ pet: "alien" }).contextual).includes("pet.alien"));
  assert.ok(!keys(petLines({ pet: "dog" }).contextual).includes("pet.alien"));
});

test("pickLine prefiere lo que encaja con el momento y no repite lo reciente", () => {
  const lines = { contextual: [{ key: "a" }, { key: "b" }], generic: [{ key: "x" }, { key: "y" }] };
  assert.deepEqual(pickLine(lines, [], 0.1, 0), { key: "a" });
  assert.deepEqual(pickLine(lines, [], 0.1, 0.99), { key: "b" });
  assert.deepEqual(pickLine(lines, [], 0.9, 0), { key: "x" });
  assert.deepEqual(pickLine(lines, ["a"], 0.1, 0), { key: "b" });
  assert.deepEqual(pickLine(lines, ["a", "b"], 0.1, 0), { key: "x" });
  assert.deepEqual(pickLine(lines, ["x", "y"], 0.9, 0), { key: "a" });
  // Con todo dicho ya, vuelve a empezar en lugar de callarse
  assert.deepEqual(pickLine(lines, ["a", "b", "x", "y"], 0.1, 0), { key: "a" });
});

test("clampPetSize deja el tamaño entre 60 y 200 de diez en diez", () => {
  assert.equal(clampPetSize(100), 100);
  assert.equal(clampPetSize(134), 130);
  assert.equal(clampPetSize(20), 60);
  assert.equal(clampPetSize(900), 200);
  assert.equal(clampPetSize("abc"), 100);
});

test("cada mascota tiene su manera de moverse", () => {
  assert.deepEqual(Object.keys(GAITS), PETS);
  const low = () => 0;
  const high = () => 0.999;
  // El conejo da un solo salto
  assert.deepEqual(moveSteps("rabbit", low), [{ distance: 34, arc: 20, ms: 420, easing: "ease-in-out" }]);
  // El perro corre: varias zancadas rápidas y bajas
  assert.equal(moveSteps("dog", low).length, 4);
  assert.equal(moveSteps("dog", high).length, 7);
  assert.ok(moveSteps("dog", high).every((step) => step.ms < 200 && step.arc < 10));
  // El gato camina: un tramo sin salto, más lento cuanto más largo
  const [walk] = moveSteps("cat", high);
  assert.equal(walk.arc, 0);
  assert.ok(walk.ms > 2500);
  // El zorro hace carreras cortas o un salto largo
  assert.equal(moveSteps("fox", high).length, 4);
  const [leap] = moveSteps("fox", low);
  assert.equal(moveSteps("fox", low).length, 1);
  assert.ok(leap.arc >= 42 && leap.distance >= 80);
  // El búho vuela alto y lejos
  const [flight] = moveSteps("owl", high);
  assert.ok(flight.arc > 140 && flight.distance > 300);
  // El alienígena se desliza
  assert.equal(moveSteps("alien", low)[0].arc, 0);
  // Una mascota desconocida se mueve como el conejo
  assert.deepEqual(moveSteps("dragon", low), moveSteps("rabbit", low));
});

test("pauseDelay: el búho descansa más entre vuelos que el perro entre carreras", () => {
  assert.equal(pauseDelay("dog", 0), 2500);
  assert.equal(pauseDelay("owl", 0), 6000);
  assert.equal(pauseDelay("owl", 1), 14000);
});
