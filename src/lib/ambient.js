// Ambiente de la escena en episodios: en lugar de animaciones infinitas (que obligan
// al navegador a pintar fotogramas sin parar, ~9 % de CPU aunque sea una sola), el
// cielo vive en momentos cortos —una ráfaga de viento, una bandada, una estrella
// fugaz, una aurora— separados por descansos en los que no corre nada.
// Lógica pura; src/newtab/ambient.js la ejecuta.

// Duración de cada episodio, en milisegundos. Los de día solo se ven de día y los
// de noche solo de noche (mismo umbral que el tono del texto: data-tone).
export const EPISODES = {
  day: { wind: 14000, birds: 17000, motes: 11000 },
  night: { wind: 14000, meteor: 1600, aurora: 28000, shimmer: 6000, motes: 11000 },
};

// Al abrir la pestaña se ve enseguida algo bonito
export const FIRST_DELAY = 1200;
export const FIRST_EPISODE = { day: "birds", night: "aurora" };

// Descanso entre episodios: la escena queda quieta (Tilo sigue a lo suyo)
export const REST = { min: 18000, max: 45000 };

// Recorrido de las nubes, en vw: entran por la izquierda y salen por la derecha
export const CLOUD_TRACK = 152;
export const CLOUD_START = [22, 70, 118];

const period = (night) => (night ? "night" : "day");

export function firstEpisode(night) {
  return FIRST_EPISODE[period(night)];
}

// Siguiente episodio, sin repetir el anterior
export function pickEpisode(night, last, random) {
  const names = Object.keys(EPISODES[period(night)]).filter((name) => name !== last);
  return names[Math.min(names.length - 1, Math.floor(random * names.length))];
}

export function episodeDuration(night, name) {
  return EPISODES[period(night)][name] ?? 0;
}

export function restDelay(random) {
  return Math.round(REST.min + random * (REST.max - REST.min));
}

// Cuánto avanza una nube con una ráfaga (4–8 vw). Si se saldría por la derecha,
// vuelve a empezar fuera de la vista por la izquierda en lugar de cruzar hacia atrás.
export function windShift(x, random) {
  const step = 4 + random * 4;
  const from = x + step > CLOUD_TRACK ? 0 : x;
  return { from, to: Math.round((from + step) * 10) / 10 };
}
