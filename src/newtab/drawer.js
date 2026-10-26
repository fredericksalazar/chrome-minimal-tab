// Panel lateral "Personalizar": solo abrir y cerrar. Cada sección (motor,
// fondo, accesos directos) la gestiona su propio módulo.
const drawer = document.getElementById("settings");

document.getElementById("customize").addEventListener("click", () => drawer.showModal());
document.getElementById("settings-close").addEventListener("click", () => drawer.close());

// Clic fuera del panel (en el fondo transparente) lo cierra
drawer.addEventListener("click", (event) => {
  if (event.target === drawer) drawer.close();
});
