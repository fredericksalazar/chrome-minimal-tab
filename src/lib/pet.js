// Tilo, la mascota: quién puede ser, cuándo asoma, hacia dónde
// salta, cuándo huye del cursor y qué dice. Lógica pura; src/newtab/pet.js la
// anima. Las frases son plantillas con reglas, sin IA ni red: { key, params,
// translate } para t(), donde translate son parámetros que hay que traducir antes.
export const PETS = ["rabbit", "dog", "cat", "fox", "owl", "alien"];
export const DEFAULT_PET = "rabbit";
export const NO_PET = "none";
export const PET_RADIUS = 90;
// Margen lateral, en fracción del ancho, que la mascota no pisa (ahí están los botones de las esquinas)
const EDGE = 0.1;
const TASK_TEXT = 40;
// Frases recientes que no se repiten
export const MEMORY = 8;

// Tamaño de la mascota, en porcentaje del normal
export const PET_SIZE = { min: 60, max: 200, step: 10, initial: 100 };

export function clampPetSize(value) {
  const number = Math.round(Number(value) / PET_SIZE.step) * PET_SIZE.step;
  if (!Number.isFinite(number)) return PET_SIZE.initial;
  return Math.min(PET_SIZE.max, Math.max(PET_SIZE.min, number));
}

// Cómo se mueve cada una. steps: pasos seguidos por desplazamiento; distance: píxeles
// por paso; arc: altura del salto o del vuelo; ms: duración de un paso (o msPerPx si
// depende de la distancia); pause: espera entre desplazamientos, en milisegundos.
// leap: salto largo ocasional en lugar de los pasos.
export const GAITS = {
  // Un salto y a mirar
  rabbit: { steps: [1, 1], distance: [34, 62], arc: [20, 20], ms: 420, pause: [3000, 9000], easing: "ease-in-out" },
  // Corre: ráfagas de zancadas cortas y rápidas
  dog: { steps: [4, 7], distance: [40, 56], arc: [6, 9], ms: 170, pause: [2500, 7000], easing: "linear" },
  // Camina: un tramo largo, lento y sin saltos
  cat: { steps: [1, 1], distance: [60, 120], arc: [0, 0], msPerPx: 24, pause: [4000, 10000], easing: "ease-in-out" },
  // Ágil: carreras muy cortas y, a veces, un salto largo
  fox: { steps: [2, 4], distance: [46, 70], arc: [4, 6], ms: 150, pause: [2500, 7000], easing: "ease-out", leap: { chance: 0.3, distance: [80, 110], arc: [42, 50], ms: 480 } },
  // Vuela: despega, planea alto y se posa lejos
  owl: { steps: [1, 1], distance: [160, 320], arc: [90, 150], ms: 1700, pause: [6000, 14000], easing: "ease-in-out" },
  // Flota: se desliza sin tocar el suelo
  alien: { steps: [1, 1], distance: [50, 110], arc: [0, 0], ms: 1000, pause: [3500, 9000], easing: "ease-in-out" },
};

const within = ([min, max], random) => min + random * (max - min);

// Pasos del siguiente desplazamiento: [{ distance, arc, ms, easing }]. rng devuelve números de 0 a 1.
export function moveSteps(pet, rng) {
  const gait = GAITS[pet] ?? GAITS[DEFAULT_PET];
  if (gait.leap && rng() < gait.leap.chance) {
    return [{ distance: within(gait.leap.distance, rng()), arc: within(gait.leap.arc, rng()), ms: gait.leap.ms, easing: "ease-in-out" }];
  }
  const count = Math.round(within(gait.steps, rng()));
  return Array.from({ length: count }, () => {
    const distance = within(gait.distance, rng());
    return { distance, arc: within(gait.arc, rng()), ms: gait.ms ?? Math.round(distance * gait.msPerPx), easing: gait.easing };
  });
}

// Milisegundos de espera entre dos desplazamientos
export function pauseDelay(pet, random) {
  return Math.round(within((GAITS[pet] ?? GAITS[DEFAULT_PET]).pause, random));
}

// Mascota guardada utilizable: una de PETS o NO_PET
export function normalizePet(value) {
  return value === NO_PET || PETS.includes(value) ? value : DEFAULT_PET;
}

// Milisegundos hasta que asoma: tanto al abrir como al reaparecer tras jugar al escondite
export function appearanceDelay(random, first = false) {
  return Math.round(first ? 150 + random * 250 : 180 + random * 220);
}

// Elige otro punto de la colina en el lado opuesto al cursor para reaparecer jugando
export function relocateSpot(pointerX, width, random = 0.5) {
  const range = pointerX < width / 2 ? [0.55, 0.85] : [0.15, 0.45];
  return Math.round(width * within(range, random));
}

// Milisegundos entre dos frases
export function speechDelay(random) {
  return Math.round(50000 + random * 70000);
}

// Tareas principales de la lista de Tilo: cuántas hay, cuántas siguen pendientes
// y el texto (recortado) de la primera pendiente
export function countTasks(tasks) {
  const main = Array.isArray(tasks) ? tasks.filter((task) => task && !task.parentId) : [];
  const open = main.filter((task) => !task.done);
  const text = String(open[0]?.text ?? "").trim();
  return { total: main.length, pending: open.length, next: text.length > TASK_TEXT ? `${text.slice(0, TASK_TEXT - 1).trimEnd()}…` : text };
}

// El cursor está lo bastante cerca del centro de la mascota como para asustarla
export function isPointerNear(pointer, rect, radius = PET_RADIUS) {
  const dx = pointer.x - (rect.left + rect.width / 2);
  const dy = pointer.y - (rect.top + rect.height / 2);
  return dx * dx + dy * dy <= radius * radius;
}

// Sentido de la huida: siempre alejándose del cursor
export function fleeDirection(petX, pointerX) {
  return pointerX > petX ? -1 : 1;
}

// Siguiente salto: avanza distance en su sentido y da la vuelta si se saldría del margen
export function hopTarget(x, direction, distance, width) {
  const min = width * EDGE;
  const max = width * (1 - EDGE);
  const turned = x + direction * distance < min || x + direction * distance > max ? -direction : direction;
  return { x: Math.min(max, Math.max(min, x + turned * distance)), direction: turned };
}

export function greetingLine(hour) {
  return { key: hour >= 5 && hour < 12 ? "pet.morning" : hour >= 12 && hour < 19 ? "pet.afternoon" : "pet.night" };
}

// Lo que dice al abrir la pestaña, en orden: saludo, tareas, clima (si Tilo lo tiene
// guardado) y agua. weather: caché del widget ({ city, temperature, code }) o nada.
// hydration: resumen del water tracker ({ todayMl, goalMet, needsWater, liters }) o null.
export function petBriefing({ hour = 12, total = 0, pending = 0, weather = null, hydration = null }, conditionKey = () => "weather.clear") {
  const lines = [greetingLine(hour)];
  if (total === 0) lines.push({ key: "pet.noTasks" });
  else if (pending === 0) lines.push({ key: "pet.tasksDone" });
  else lines.push({ key: "pet.progress", params: { done: total - pending, pending } });
  if (Number.isFinite(weather?.temperature)) {
    const params = { temp: Math.round(weather.temperature) };
    const translate = { condition: conditionKey(weather.code) };
    lines.push(weather.city ? { key: "pet.weatherIn", params: { ...params, city: weather.city }, translate } : { key: "pet.weather", params, translate });
  }
  if (!hydration) lines.push({ key: "pet.water" });
  else if (hydration.goalMet) lines.push({ key: "pet.waterGoalMet" });
  else if (hydration.todayMl === 0) lines.push({ key: "pet.waterEmpty" });
  else if (hydration.needsWater) lines.push({ key: "pet.waterHourly" });
  else lines.push({ key: "pet.waterProgress", params: { liters: hydration.liters } });
  return lines;
}

export function waterReminderLine(hydration) {
  if (!hydration?.needsWater) return null;
  return { key: hydration.todayMl > 0 ? "pet.waterHourly" : "pet.waterEmpty" };
}

export function waterReactionLine(hydration) {
  return { key: hydration?.goalMet ? "pet.waterGoalMet" : "pet.waterThanks" };
}

const GENERIC = ["pet.tip1", "pet.tip2", "pet.tip3", "pet.tip4", "pet.tip5", "pet.here", "pet.hill"];
const isRain = (code) => (code >= 51 && code <= 67) || (code >= 80 && code <= 82);

// Frases que encajan con el momento (contextual) y las que valen siempre (generic).
// context: hour, weekday (0 = domingo), total, pending, next, weather, night, dusk,
// minutesOpen, pet y hydration.
export function petLines({ hour = 12, weekday = 3, total = 0, pending = 0, next = "", weather = null, night = false, dusk = false, minutesOpen = 0, pet = DEFAULT_PET, hydration = null }) {
  const contextual = [];
  const add = (when, key, params) => when && contextual.push(params ? { key, params } : { key });
  const done = total - pending;
  const temp = Number.isFinite(weather?.temperature) ? Math.round(weather.temperature) : null;

  add(weekday === 1 && hour >= 5 && hour < 12, "pet.weekStart");
  add(weekday === 5 && hour >= 12, "pet.friday");
  add(weekday === 0 || weekday === 6, "pet.weekend");
  add(hour < 5, "pet.lateNight");
  add(hour >= 12 && hour < 14, "pet.lunch");

  add(pending >= 2, "pet.tasks", { n: pending });
  add(pending >= 2 && next, "pet.startWith", { task: next });
  add(pending === 1 && next, "pet.lastOne", { task: next });
  add(pending === 1 && !next, "pet.taskOne");
  add(pending > 0 && done >= pending, "pet.halfway", { done, total });
  add(total > 0 && pending === 0, "pet.tasksDone");

  add(temp !== null && isRain(weather.code), "pet.rain");
  add(temp !== null && temp >= 28, "pet.hot", { temp });
  add(temp !== null && temp <= 8, "pet.cold", { temp });
  add(temp !== null && weather.code === 0 && hour >= 7 && hour < 18, "pet.clearSky");

  add(Boolean(hydration?.goalMet), "pet.waterGoalMet");
  add(Boolean(hydration && !hydration.goalMet && hydration.todayMl === 0), "pet.waterEmpty");
  add(Boolean(hydration && !hydration.goalMet && hydration.todayMl > 0 && hydration.needsWater), "pet.waterHourly");
  add(Boolean(hydration && !hydration.goalMet && !hydration.needsWater && hydration.todayMl > 0), "pet.waterProgress", { liters: hydration?.liters });

  add(minutesOpen >= 20, "pet.longSession");
  add(dusk, "pet.sunset");
  add(!night && !dusk, "pet.birds");
  add(night, "pet.aurora");
  add(night, "pet.stars");
  add(pet === "alien", "pet.alien");

  return { contextual, generic: GENERIC.map((key) => ({ key })) };
}

// Elige una frase: casi siempre (chance < 0,7) una que encaje con el momento, y
// nunca una de las recientes mientras queden otras
export function pickLine({ contextual, generic }, recent = [], chance = 0, pick = 0) {
  const fresh = (lines) => lines.filter(({ key }) => !recent.includes(key));
  const candidates = [chance < 0.7 ? fresh(contextual) : [], fresh(generic), fresh(contextual), [...contextual, ...generic]];
  const pool = candidates.find((lines) => lines.length);
  return pool[Math.min(pool.length - 1, Math.floor(pick * pool.length))];
}
