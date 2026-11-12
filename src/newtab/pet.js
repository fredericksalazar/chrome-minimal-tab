// Tilo, la mascota de la escena (conejo, perro, gato, zorro, búho o alienígena):
// asoma nada más abrir la pestaña, saluda, cuenta las tareas y el clima e invita a
// beber agua; luego se queda siempre visible paseando por la colina más cercana y de
// vez en cuando dice algo que encaja con el momento. Si el cursor intenta atraparlo,
// desaparece tras la colina y reaparece enseguida en otro punto a modo juguetón.
import { KEYS, onLocalChange } from "../lib/storage.js";
import {
  MEMORY,
  NO_PET,
  appearanceDelay,
  countTasks,
  fleeDirection,
  hopTarget,
  isPointerNear,
  moveSteps,
  pauseDelay,
  petBriefing,
  petLines,
  pickLine,
  relocateSpot,
  speechDelay,
  waterReactionLine,
  waterReminderLine,
} from "../lib/pet.js";
import { REMINDER_MS, formatLiters, hydrationStatus } from "../lib/water.js";
import { conditionKey } from "../lib/weather.js";
import { locale, t } from "./i18n.js";
import { onThemeChange } from "./theme.js";

const scene = document.querySelector(".scene-bg");
const pet = document.getElementById("scene-pet");
const bubble = document.getElementById("scene-bubble");
// Tarjeta con botones (en la capa de la página: el bocadillo de la escena no recibe clics)
const card = document.getElementById("tilo-card");
const cardText = document.getElementById("tilo-card-text");
const cardYes = document.getElementById("tilo-card-yes");
const cardNo = document.getElementById("tilo-card-no");
// Sin respuesta, la tarjeta se retira sola
const CARD_MS = 45000;
// El suelo que pisa: la silueta que el paisaje marca con data-ground
const hill = scene.querySelector("[data-ground]");
const ridge = hill.querySelector("path");
// Lo que la mascota se hunde tras la colina para quedar oculto, y en la hierba al posarse
const HIDE_DEPTH = 56;
const SINK = 4;
const SPARKS = 6;
const SPEECH_MS = 6000;
// Cada frase del saludo inicial dura menos para que no se haga largo
const BRIEFING_MS = 4500;

// Silueta de la colina muestreada una vez: [x, y] en unidades del viewBox (1440 × 320)
const RIDGE = Array.from({ length: 121 }, (_, i) => {
  const point = ridge.getPointAtLength((ridge.getTotalLength() * i) / 120);
  return [point.x, point.y];
}).filter(([, y]) => y < 319);

let timer = 0;
let run = 0;
let position = null;
let direction = 1;
let fleeing = false;
let nextSpeech = 0;
let escaped = false;
let briefed = false;
let recent = [];
let lastWaterReminder = Date.now();
let lastTodayMl = null;
// Cada frase tiene su turno: una anterior no puede esconder el bocadillo de otra más nueva
let speech = 0;
// Mientras saluda, una toma de agua no interrumpe: el agradecimiento sustituye a la
// frase del agua del saludo (que ya no sería cierta) o llega justo después
let briefing = false;
let thanksPending = null;
// Mientras espera una respuesta en su tarjeta, Tilo se queda quieto y no huye
let holding = false;
let groupsDone = 0;

const root = document.documentElement;
const active = () => root.dataset.scenePet !== NO_PET;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const between = (min, max) => min + Math.random() * (max - min);
const place = ({ x, y }) => `translate(${x}px, ${-y}px)`;
// Tamaño elegido en Personalizar: todas las distancias de la mascota crecen con él
const size = () => Number(root.style.getPropertyValue("--scene-pet-scale")) || 1;

// Altura de la colina, en píxeles desde abajo, bajo un punto de la ventana
function ground(x) {
  const { width, height } = hill.getBoundingClientRect();
  const target = (x / width) * 1440;
  const [, y] = RIDGE.reduce((best, point) => (Math.abs(point[0] - target) < Math.abs(best[0] - target) ? point : best));
  return ((320 - y) / 320) * height - SINK * size();
}

// Mueve a la mascota hasta "to"; con arc el recorrido es un salto de esa altura
async function glide(to, duration, arc = 0, easing = "ease-in-out") {
  const from = position;
  const frames = [{ transform: place(from) }, { transform: place(to) }];
  if (arc) frames.splice(1, 0, { transform: place({ x: (from.x + to.x) / 2, y: Math.max(from.y, to.y) + arc }) });
  position = to;
  pet.style.transform = place(to);
  // El temporizador evita esperar de más si el navegador frena la animación
  const animation = pet.animate(frames, { duration, easing });
  await Promise.race([animation.finished.catch(() => {}), wait(duration + 60)]);
  // Si se quedó a medias, se suelta para que la mascota esté ya en su sitio
  animation.cancel();
}

function face(next) {
  direction = next;
  pet.style.setProperty("--scene-pet-dir", String(next));
}

function hide() {
  pet.toggleAttribute("hidden", true);
  pet.classList.remove("moving");
  bubble.hidden = true;
  position = null;
  fleeing = false;
}

function schedule(first = false, startX = null) {
  clearTimeout(timer);
  if (active()) timer = setTimeout(() => appear(startX), appearanceDelay(Math.random(), first));
}

// Lo que Tilo sabe del momento: hora, día, cielo de la escena, rato con la pestaña
// abierta y las tareas y el clima ya guardados en este equipo
async function readContext() {
  const now = new Date();
  const sky = (name) => Number(root.style.getPropertyValue(name)) > 0.5;
  const context = {
    hour: now.getHours(),
    weekday: now.getDay(),
    pet: root.dataset.scenePet,
    night: sky("--scene-night"),
    dusk: sky("--scene-dusk"),
    minutesOpen: performance.now() / 60000,
  };
  try {
    const {
      [KEYS.todos]: tasks,
      [KEYS.weather]: weather,
      [KEYS.water]: water,
    } = await chrome.storage.local.get([KEYS.todos, KEYS.weather, KEYS.water]);
    const status = hydrationStatus(water);
    lastTodayMl = status.todayMl;
    root.style.setProperty("--scene-pet-vitality", String(status.vitality));
    root.dataset.petHydration = status.state;
    const hydration = { ...status, liters: formatLiters(status.todayMl, locale) };
    return { ...context, ...countTasks(tasks), weather, hydration };
  } catch (err) {
    console.warn("La mascota no pudo leer las tareas ni el clima", err);
    return context;
  }
}

// Bocadillo sobre la mascota durante unos segundos; cerca del borde derecho se abre al otro lado
async function say({ key, params, translate = {} }, id, duration = SPEECH_MS) {
  const turn = ++speech;
  const translated = Object.fromEntries(Object.entries(translate).map(([name, textKey]) => [name, t(textKey)]));
  bubble.hidden = true;
  bubble.textContent = t(key, { ...params, ...translated });
  bubble.hidden = false;
  const gap = 16 * size();
  const flip = position.x + gap + bubble.offsetWidth > scene.clientWidth - 12;
  bubble.classList.toggle("flip", flip);
  bubble.style.transform = place({ x: flip ? position.x - gap - bubble.offsetWidth : position.x + gap, y: position.y + 40 * size() });
  await wait(duration);
  if (id === run && turn === speech) bubble.hidden = true;
}

async function appear(startX = null) {
  timer = 0;
  if (!active()) return;
  const id = ++run;
  const width = scene.clientWidth || window.innerWidth;
  const x = Number.isFinite(startX) ? startX : between(width * 0.15, width * 0.85);
  face(Math.random() < 0.5 ? -1 : 1);
  position = { x, y: ground(x) - HIDE_DEPTH * size() };
  pet.style.transform = place(position);
  // Es un SVG: no tiene la propiedad hidden de los elementos HTML
  pet.toggleAttribute("hidden", false);
  fleeing = false;
  await glide({ x, y: ground(x) }, 380, 0, "cubic-bezier(0.2, 0.9, 0.3, 1.2)");

  // La primera vez saluda y pone al día; al reaparecer tras jugar al escondite, lo comenta
  if (!briefed) {
    briefed = true;
    briefing = true;
    nextSpeech = Date.now() + speechDelay(Math.random());
    for (const line of petBriefing(await readContext(), conditionKey)) {
      if (id !== run) break;
      const water = line.key.startsWith("pet.water");
      await say(water && thanksPending ? thanksPending : line, id, BRIEFING_MS);
      if (water) thanksPending = null;
      await wait(350);
    }
    if (thanksPending && id === run) await say(thanksPending, id, BRIEFING_MS);
    briefing = false;
    thanksPending = null;
    if (id !== run) return;
    await offerGroups(id);
    if (id !== run) return;
  } else if (escaped && Math.random() < 0.55) {
    await say({ key: "pet.caught" }, id, 3200);
  }
  escaped = false;

  // Siempre permanece en la escena: pausa, habla, recuerda beber agua o pasea por la colina
  while (id === run) {
    await wait(pauseDelay(root.dataset.scenePet, Math.random()));
    if (id !== run) return;
    if (document.hidden || holding) continue;
    if (Date.now() - lastWaterReminder >= REMINDER_MS) {
      const ctx = await readContext();
      if (id !== run) return;
      const reminder = waterReminderLine(ctx.hydration);
      lastWaterReminder = Date.now();
      if (reminder) {
        nextSpeech = Date.now() + speechDelay(Math.random());
        await say(reminder, id);
        continue;
      }
    }
    if (Date.now() >= nextSpeech) {
      nextSpeech = Date.now() + speechDelay(Math.random());
      await wait(600);
      if (id !== run) return;
      const line = pickLine(petLines(await readContext()), recent, Math.random(), Math.random());
      recent = [...recent, line.key].slice(-MEMORY);
      await say(line, id);
      continue;
    }
    // Cada animal a su manera: salta, corre, camina, vuela o flota (clase moving para alas y patas)
    pet.classList.add("moving");
    for (const step of moveSteps(root.dataset.scenePet, Math.random)) {
      if (id !== run) return;
      const next = hopTarget(position.x, direction, step.distance * size(), scene.clientWidth || width);
      face(next.direction);
      await glide({ x: next.x, y: ground(next.x) }, step.ms, step.arc * size(), step.easing);
    }
    pet.classList.remove("moving");
  }
}

// Tilo ofrece ordenar los accesos directos por temas, una sola vez (shortcuts.js
// decide si toca y deja el número en local.groupsOffer.pending; si se acepta, abre
// la propuesta al ver local.groupsOffer.open)
async function offerGroups(id) {
  let offer = {};
  try {
    ({ [KEYS.groupsOffer]: offer = {} } = await chrome.storage.local.get(KEYS.groupsOffer));
  } catch (err) {
    console.warn("Tilo no pudo leer si ofrecer ordenar los accesos", err);
    return;
  }
  if (offer.asked || !(offer.pending > 0) || id !== run) return;
  const save = (changes) => chrome.storage.local.set({ [KEYS.groupsOffer]: { ...offer, asked: true, ...changes } }).catch(() => {});
  save({});

  holding = true;
  bubble.hidden = true;
  cardText.textContent = t("group.offer", { n: offer.pending });
  card.hidden = false;
  const gap = 16 * size();
  const flip = position.x + gap + card.offsetWidth > window.innerWidth - 12;
  card.classList.toggle("flip", flip);
  card.style.transform = place({ x: flip ? position.x - gap - card.offsetWidth : position.x + gap, y: position.y + 40 * size() });
  cardYes.focus({ preventScroll: true });

  const answer = await new Promise((resolve) => {
    const done = (value) => {
      clearTimeout(timeout);
      cardYes.removeEventListener("click", yes);
      cardNo.removeEventListener("click", no);
      resolve(value);
    };
    const yes = () => done("yes");
    const no = () => done("no");
    const timeout = setTimeout(() => done(null), CARD_MS);
    cardYes.addEventListener("click", yes);
    cardNo.addEventListener("click", no);
  });
  card.hidden = true;
  holding = false;
  if (answer === "yes") save({ open: Date.now() });
}

// Chispas que quedan donde estaba la mascota
function sparkle({ x, y }) {
  for (let i = 0; i < SPARKS; i++) {
    const spark = document.createElement("span");
    spark.className = "scene-spark";
    spark.style.transform = place({ x, y: y + 14 });
    scene.append(spark);
    const end = { x: x + between(-46, 46), y: y + between(24, 74) };
    spark
      .animate([{ transform: place({ x, y: y + 14 }), opacity: 1 }, { transform: `${place(end)} scale(0.2)`, opacity: 0 }], {
        duration: between(600, 1100),
        easing: "ease-out",
      })
      .finished.finally(() => spark.remove());
  }
}

async function flee(pointerX) {
  const id = ++run;
  fleeing = true;
  escaped = true;
  bubble.hidden = true;
  sparkle(position);
  face(fleeDirection(position.x, pointerX));
  // Se esconde rápido tras la colina y asoma enseguida en otro lado a modo juguetón
  await glide({ x: position.x, y: position.y - HIDE_DEPTH * size() }, 200, 0, "ease-in");
  if (id !== run) return;
  hide();
  const nextX = relocateSpot(pointerX, scene.clientWidth || window.innerWidth, Math.random());
  schedule(false, nextX);
}

document.addEventListener(
  "pointermove",
  (event) => {
    if (!position || fleeing || holding) return;
    if (Math.abs(event.clientX - position.x) > 120 * size()) return;
    if (isPointerNear({ x: event.clientX, y: event.clientY }, pet.getBoundingClientRect())) flee(event.clientX);
  },
  { passive: true }
);

// Al cambiar de mascota en Personalizar, se muestra enseguida o se oculta si se elige «Ninguna»
function sync() {
  if (active()) {
    if (!position && !timer) schedule(true);
    return;
  }
  clearTimeout(timer);
  timer = 0;
  run++;
  hide();
}

onLocalChange(KEYS.water, (next) => {
  const status = hydrationStatus(next);
  const increased = lastTodayMl !== null && status.todayMl > lastTodayMl;
  lastTodayMl = status.todayMl;
  root.style.setProperty("--scene-pet-vitality", String(status.vitality));
  root.dataset.petHydration = status.state;
  if (increased) {
    lastWaterReminder = Date.now();
    if (briefing) thanksPending = waterReactionLine(status);
    else if (position && !fleeing && !document.hidden) say(waterReactionLine(status), run);
  }
});

// Tras aplicar la propuesta de Tilo, lo celebra
onLocalChange(KEYS.groupsOffer, (offer) => {
  const done = offer?.done ?? 0;
  if (done && done !== groupsDone && position && !fleeing && !document.hidden) say({ key: "pet.groupsDone" }, run);
  groupsDone = done;
});
chrome.storage.local.get(KEYS.groupsOffer).then(({ [KEYS.groupsOffer]: offer }) => (groupsDone ||= offer?.done ?? 0)).catch(() => {});

onThemeChange(sync);
sync();
