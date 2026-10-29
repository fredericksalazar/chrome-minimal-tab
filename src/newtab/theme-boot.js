// Script clásico y bloqueante: aplica el último fondo guardado antes del primer
// pintado para que no parpadee el fondo por defecto. backgrounds.js mantiene esta
// caché al día con la misma clave ("background").
try {
  const saved = JSON.parse(localStorage.getItem("background"));
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
