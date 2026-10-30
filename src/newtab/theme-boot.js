// Script clásico y bloqueante: aplica el último fondo guardado antes del primer
// pintado para que no parpadee el fondo por defecto. backgrounds.js mantiene esta
// caché al día con la misma clave ("background"); theme.js, la del tema ("theme").
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

try {
  const saved = JSON.parse(localStorage.getItem("background"));
  // Sin caché se ve el fondo de Tilo; "plain" lo cambia por el color liso del tema
  if (saved?.plain) document.documentElement.dataset.plain = "";
  if (saved?.css) {
    document.documentElement.style.setProperty("--page-bg", saved.css);
    document.documentElement.dataset.tone = saved.tone;
    if (saved.blur) {
      document.documentElement.style.setProperty("--page-blur", `${saved.blur}px`);
      document.documentElement.dataset.blur = "";
    }
  }
} catch {
  // Sin acceso a localStorage: se aplica al cargar los ajustes
}
