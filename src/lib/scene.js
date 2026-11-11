// La escena de Tilo: un paisaje con cielo que puede estar de día, de noche o seguir
// la hora local, y en él la mascota. El motor (cielo, sol, luna, mascota) es común;
// un paisaje solo aporta su contorno y sus colores (styles/landscape-<id>.css y su
// bloque en newtab.html). Para añadir uno basta con sumarlo a LANDSCAPES.
import { PET_SIZE, clampPetSize, normalizePet } from "./pet.js";

export const LANDSCAPES = ["valley"];
export const SCENE_MODES = ["day", "night", "dynamic"];
export const DEFAULT_SCENE = { landscape: "valley", mode: "dynamic", pet: normalizePet(), size: PET_SIZE.initial };

// Escena guardada utilizable. Lo desconocido, y los fondos de versiones anteriores
// (colores, degradados, imagen), se quedan con el valor predeterminado de cada campo.
export function normalizeScene(saved) {
  return {
    landscape: LANDSCAPES.includes(saved?.landscape) ? saved.landscape : DEFAULT_SCENE.landscape,
    mode: SCENE_MODES.includes(saved?.mode) ? saved.mode : DEFAULT_SCENE.mode,
    pet: normalizePet(saved?.pet),
    size: clampPetSize(saved?.size ?? PET_SIZE.initial),
  };
}

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const smooth = (from, to, value) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};
const round = (value) => Math.round(value * 1000) / 1000;

// Cielo para un minuto del día (0–1439, hora local), igual en todos los paisajes.
// night: 0 de día, 1 de noche; dusk: resplandor del amanecer y del atardecer;
// sun y moon: recorrido de izquierda (0) a derecha (1); tone: texto legible encima.
// En "dynamic" el sol va de 6 a 18 h y la luna de 18 a 6 h; el cielo cambia entre
// las 5 y las 7 y entre las 17 y las 19. "day" y "night" fijan el cielo y solo
// mueven su astro, que nunca llega a ocultarse.
export function sceneSky(mode, minutes) {
  if (mode !== "dynamic") {
    const arc = round(0.22 + (0.56 * ((minutes + 360) % 720)) / 720);
    const night = mode === "night";
    return { night: night ? 1 : 0, dusk: 0, sun: arc, moon: arc, sunUp: !night, moonUp: night, tone: night ? "dark" : "light" };
  }
  const night = minutes < 720 ? 1 - smooth(300, 420, minutes) : smooth(1020, 1140, minutes);
  const dusk = Math.max(0, 1 - Math.abs(minutes - 360) / 80, 1 - Math.abs(minutes - 1080) / 80);
  const sunUp = minutes >= 360 && minutes < 1080;
  return {
    night: round(night),
    dusk: round(dusk),
    sun: sunUp ? round((minutes - 360) / 720) : 0,
    moon: sunUp ? 0 : round(((minutes + 360) % 1440) / 720),
    sunUp,
    moonUp: !sunUp,
    tone: night > 0.35 ? "dark" : "light",
  };
}

// Variables CSS que lee styles/scene.css (y theme-boot.js desde la caché)
export function sceneVars(sky) {
  return {
    "--scene-night": String(sky.night),
    "--scene-dusk": String(sky.dusk),
    "--scene-sun": String(sky.sun),
    "--scene-moon": String(sky.moon),
    "--scene-sun-on": sky.sunUp ? "1" : "0",
    "--scene-moon-on": sky.moonUp ? "1" : "0",
  };
}
