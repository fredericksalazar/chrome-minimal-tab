// Ambiente de la escena en episodios (ver src/lib/ambient.js): ráfagas de viento que
// empujan las nubes y mecen el paisaje, bandadas de pájaros, motas o luciérnagas,
// estrellas fugaces, aurora y estrellas que titilan. Cada episodio pone una clase en
// su elemento durante un rato y la quita; entre uno y otro no corre ninguna animación.
// Las nubes las mueve la Web Animations API porque su posición se conserva.
import {
  CLOUD_START,
  FIRST_DELAY,
  episodeDuration,
  firstEpisode,
  pickEpisode,
  restDelay,
  windShift,
} from "../lib/ambient.js";

const root = document.documentElement;
const scene = document.querySelector(".scene-bg");
const puffs = [...scene.querySelectorAll(".scene-puff")];
const birds = scene.querySelector(".scene-birds");
const motes = scene.querySelector(".scene-motes");
const stars = scene.querySelector(".scene-stars");
const meteor = scene.querySelector(".scene-meteor");
const aurora = scene.querySelector(".scene-aurora");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

const clouds = [...CLOUD_START];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isNight = () => root.dataset.tone === "dark";

// Clase durante el episodio: el CSS de scene.css (y del paisaje) define qué se anima
async function flag(element, className, ms) {
  element.classList.add(className);
  await wait(ms);
  element.classList.remove(className);
}

// Ráfaga: las nubes avanzan un poco y el paisaje reacciona a .is-windy
async function wind(ms) {
  puffs.forEach((puff, i) => {
    const { from, to } = windShift(clouds[i], Math.random());
    clouds[i] = to;
    // El estilo final ya queda puesto: al acabar la animación no hay salto ni nada corriendo
    puff.style.transform = `translateX(${to}vw)`;
    puff.animate([{ transform: `translateX(${from}vw)` }, { transform: `translateX(${to}vw)` }], {
      duration: ms,
      easing: "ease-in-out",
    });
  });
  await flag(scene, "is-windy", ms);
}

// La estrella fugaz cae en un sitio distinto cada vez
async function shootingStar(ms) {
  meteor.style.top = `${6 + Math.random() * 22}%`;
  meteor.style.left = `${15 + Math.random() * 55}%`;
  await flag(meteor, "is-falling", ms);
}

const RUN = {
  wind,
  birds: (ms) => flag(birds, "is-flying", ms),
  motes: (ms) => flag(motes, "is-glowing", ms),
  shimmer: (ms) => flag(stars, "is-twinkling", ms),
  meteor: shootingStar,
  aurora: (ms) => flag(aurora, "is-glowing", ms),
};

puffs.forEach((puff, i) => (puff.style.transform = `translateX(${clouds[i]}vw)`));

// Bucle sin fin fuera del nivel superior del módulo, para no dejar su carga pendiente
async function direct() {
  let last = null;
  let delay = FIRST_DELAY;
  for (;;) {
    await wait(delay);
    delay = restDelay(Math.random());
    // Con la pestaña oculta o «reducir movimiento» la escena se queda quieta
    if (document.hidden || reducedMotion.matches) continue;
    const night = isNight();
    const name = last === null ? firstEpisode(night) : pickEpisode(night, last, Math.random());
    last = name;
    try {
      await RUN[name](episodeDuration(night, name));
    } catch (err) {
      console.warn("No se pudo animar el ambiente de la escena", err);
    }
  }
}

direct();
