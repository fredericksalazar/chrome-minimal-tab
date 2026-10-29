// Botones de apoyo al autor en la zona inferior central. Son enlaces normales
// que abren otra pestaña: no hay permisos, red ni datos guardados.
import { SUPPORT_LINKS } from "../lib/support.js";
import { ICONS } from "./icons.js";

const nav = document.getElementById("support");

for (const { id, label, title, url } of SUPPORT_LINKS) {
  const link = document.createElement("a");
  link.className = "support-link";
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.title = title;
  link.setAttribute("aria-label", label);
  link.innerHTML = ICONS[id];

  const text = document.createElement("span");
  text.textContent = label;
  link.append(text);
  nav.append(link);
}
