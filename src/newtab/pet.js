// Tilo, la mascota del fondo «Valle» (mascota, perro, gato, zorro, búho o alienígena):
// asoma nada más abrir la pestaña, saluda, cuenta las tareas y el clima e invita a
// beber agua; luego se queda paseando por la colina más cercana y de vez en cuando
// dice algo que encaja con el momento. Si el cursor se acerca, huye y vuelve al rato.
// Es decorativa: el fondo no recibe clics, así que la cercanía se mide con la
// posición del cursor.
import { KEYS } from "../lib/storage.js";
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
  speechDelay,
} from "../lib/pet.js";
import { conditionKey } from "../lib/weather.js";
import { t } from "./i18n.js";
import { onThemeChange } from "./theme.js";

const scene = document.querySelector(".scene-bg");
const pet = document.getElementById("scene-pet");
const bubble = document.getElementById("scene-bubble");
// El suelo que pisa: la silueta que el paisaje marca con data-ground
const hill = scene.querySelector("[data-ground]");
const ridge = hill.querySelector("path");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
// Lo que la mascota se hunde tras la colina para quedar oculto, y en la hierba al posarse
const HIDE_DEPTH = 56;
const SINK = 4;
const SPARKS = 6;
const SPEECH_MS = 6000;
// De cada cien pausas, en unas seis se esconde un momento y sale por otro sitio
const WANDER_OFF = 0.06;
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

const root = document.documentElement;
const active = () => root.dataset.scenePet !== NO_PET && !reducedMotion.matches;
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

function schedule(first = false) {
  clearTimeout(timer);
  if (active()) timer = setTimeout(appear, appearanceDelay(Math.random(), first));
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
    const { [KEYS.todos]: tasks, [KEYS.weather]: weather } = await chrome.storage.local.get([KEYS.todos, KEYS.weather]);
    return { ...context, ...countTasks(tasks), weather };
  } catch (err) {
    console.warn("La mascota no pudo leer las tareas ni el clima", err);
    return context;
  }
}

// Bocadillo sobre la mascota durante unos segundos; cerca del borde derecho se abre al otro lado
async function say({ key, params, translate = {} }, id, duration = SPEECH_MS) {
  const translated = Object.fromEntries(Object.entries(translate).map(([name, textKey]) => [name, t(textKey)]));
  bubble.hidden = true;
  bubble.textContent = t(key, { ...params, ...translated });
  bubble.hidden = false;
  const gap = 16 * size();
  const flip = position.x + gap + bubble.offsetWidth > scene.clientWidth - 12;
  bubble.classList.toggle("flip", flip);
  bubble.style.transform = place({ x: flip ? position.x - gap - bubble.offsetWidth : position.x + gap, y: position.y + 40 * size() });
  await wait(duration);
  if (id === run) bubble.hidden = true;
}

async function appear() {
  // Con la pestaña oculta se espera a la siguiente ocasión
  if (!active() || document.hidden) return schedule();
  const id = ++run;
  const width = scene.clientWidth;
  const x = between(width * 0.15, width * 0.85);
  face(Math.random() < 0.5 ? -1 : 1);
  position = { x, y: ground(x) - HIDE_DEPTH * size() };
  pet.style.transform = place(position);
  // Es un SVG: no tiene la propiedad hidden de los elementos HTML
  pet.toggleAttribute("hidden", false);
  await glide({ x, y: ground(x) }, 450, 0, "cubic-bezier(0.2, 0.9, 0.3, 1.2)");

  // La primera vez saluda y pone al día; al volver de una huida, a veces lo comenta
  if (!briefed) {
    briefed = true;
    nextSpeech = Date.now() + speechDelay(Math.random());
    for (const line of petBriefing(await readContext(), conditionKey)) {
      if (id !== run) return;
      await say(line, id, BRIEFING_MS);
      await wait(350);
    }
  } else if (escaped && Math.random() < 0.4) await say({ key: "pet.caught" }, id);
  escaped = false;

  // Se queda: pausa, y luego habla, se va a otro sitio o da un salto
  while (id === run) {
    await wait(pauseDelay(root.dataset.scenePet, Math.random()));
    if (id !== run) return;
    if (document.hidden) continue;
    if (Date.now() >= nextSpeech) {
      nextSpeech = Date.now() + speechDelay(Math.random());
      await wait(600);
      if (id !== run) return;
      const line = pickLine(petLines(await readContext()), recent, Math.random(), Math.random());
      recent = [...recent, line.key].slice(-MEMORY);
      await say(line, id);
      continue;
    }
    if (Math.random() < WANDER_OFF) break;
    // Cada animal a su manera: salta, corre, camina, vuela o flota (clase moving para alas y patas)
    pet.classList.add("moving");
    for (const step of moveSteps(root.dataset.scenePet, Math.random)) {
      if (id !== run) return;
      const next = hopTarget(position.x, direction, step.distance * size(), width);
      face(next.direction);
      await glide({ x: next.x, y: ground(next.x) }, step.ms, step.arc * size(), step.easing);
    }
    pet.classList.remove("moving");
  }
  if (id !== run) return;
  await glide({ x: position.x, y: position.y - HIDE_DEPTH * size() }, 520, 0, "ease-in");
  if (id !== run) return;
  hide();
  schedule();
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
  pet.classList.add("moving");
  const x = position.x + direction * between(110, 170) * size();
  await glide({ x, y: ground(x) + 6 }, 380, 78 * size(), "cubic-bezier(0.3, 0, 0.5, 1)");
  pet.classList.remove("moving");
  await glide({ x, y: position.y - HIDE_DEPTH * size() }, 240, 0, "ease-in");
  if (id !== run) return;
  hide();
  schedule();
}

document.addEventListener(
  "pointermove",
  (event) => {
    if (!position || fleeing) return;
    if (isPointerNear({ x: event.clientX, y: event.clientY }, pet.getBoundingClientRect())) flee(event.clientX);
  },
  { passive: true }
);

// Al cambiar de fondo o de preferencia de movimiento la mascota se va o empieza a asomar
function sync() {
  if (active()) {
    if (!timer) schedule(true);
    return;
  }
  clearTimeout(timer);
  timer = 0;
  run++;
  hide();
}

onThemeChange(sync);
reducedMotion.addEventListener("change", sync);
sync();
