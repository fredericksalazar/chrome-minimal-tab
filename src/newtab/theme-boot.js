// Script clásico y bloqueante: aplica la última escena guardada antes del primer
// pintado para que no dé saltos al abrir. scene.js mantiene esta caché al día con
// la misma clave ("background"); theme.js, la del tema ("theme");
// i18n.js, la del idioma ("lang").
{
  let preference = "system";
  try {
    preference = localStorage.getItem("theme") || preference;
  } catch {
    // Sin caché se sigue al sistema hasta cargar los ajustes
  }
  const dark = preference === "dark" || (preference !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

// El HTML viene en español: con otro idioma se ocultan los textos hasta traducirlos
{
  let language = null;
  try {
    language = localStorage.getItem("lang");
  } catch {
    // Sin caché se decide por el idioma del navegador
  }
  if ((language ?? navigator.language.slice(0, 2)) !== "es") {
    document.documentElement.dataset.i18nPending = "";
    // Si la traducción fallara, los textos no se quedan ocultos
    setTimeout(() => delete document.documentElement.dataset.i18nPending, 1500);
  }
}

// Escena: paisaje, mascota y el cielo de la última vez; scene.js lo pone en hora
// al cargar. Sin caché (primera vez) se parte de un cielo aproximado por la hora.
{
  const root = document.documentElement;
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem("background"));
  } catch {
    // Sin acceso a localStorage: se aplica al cargar los ajustes
  }
  const hour = new Date().getHours();
  const day = hour >= 7 && hour < 18;
  const vars = saved?.vars ?? { "--scene-night": day ? "0" : "1", "--scene-sun-on": day ? "1" : "0", "--scene-moon-on": day ? "0" : "1" };
  for (const [name, value] of Object.entries(vars)) {
    if (name.startsWith("--scene-") && Number.isFinite(Number(value))) root.style.setProperty(name, value);
  }
  root.dataset.landscape = typeof saved?.landscape === "string" ? saved.landscape : "valley";
  root.dataset.scenePet = typeof saved?.pet === "string" ? saved.pet : "rabbit";
  root.dataset.tone = saved?.vars ? (saved.tone === "light" ? "light" : "dark") : day ? "light" : "dark";
  if (Number.isFinite(saved?.size)) root.style.setProperty("--scene-pet-scale", String(saved.size / 100));
}

// Posiciones de las herramientas en el lienzo: se aplican en vw/vh antes del
// primer pintado; layout.js las ajusta al tamaño exacto de cada elemento.
{
  const root = document.documentElement;
  try {
    const style = localStorage.getItem("waterStyle");
    root.dataset.waterStyle = style === "drop" ? "drop" : "bottle";
    const saved = JSON.parse(localStorage.getItem("layout"));
    for (const id of ["widget", "todo", "speed", "water"]) {
      const x = Number(saved?.[id]?.x);
      const y = Number(saved?.[id]?.y);
      if (Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        root.style.setProperty(`--tool-${id}-x`, `${x}vw`);
        root.style.setProperty(`--tool-${id}-y`, `${y}vh`);
        root.setAttribute(`data-placed-${id}`, "");
      }
    }
  } catch {
    // Sin acceso a localStorage: se aplica al cargar los ajustes
  }
}
