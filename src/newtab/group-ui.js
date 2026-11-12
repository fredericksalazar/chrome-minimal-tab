// Piezas de interfaz compartidas por las cajas, el diálogo «Nuevo grupo» y la
// propuesta de Tilo: mosaico de iconos, selector de emoji y puntos de color.
import { COLOR_IDS, DEFAULT_EMOJI, EMOJI_CHOICES, GROUP_COLORS } from "../lib/groups.js";
import { faviconUrl, hostname } from "../lib/url.js";
import { t } from "./i18n.js";

// Icono de una caja: cuadrado teñido con su color, los iconos de sus 4 primeros
// accesos y el emoji en una esquina (solo el emoji si está vacía)
export function groupIcon(children, emoji, color) {
  const icon = document.createElement("span");
  icon.className = "group-icon";
  icon.style.setProperty("--group", GROUP_COLORS[color]);

  const mosaic = document.createElement("span");
  mosaic.className = "group-mosaic";
  for (const child of children.slice(0, 4)) {
    const img = document.createElement("img");
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.src = faviconUrl(child.url, 32);
    mosaic.append(img);
  }

  const badge = document.createElement("span");
  badge.className = children.length ? "group-emoji" : "group-emoji group-emoji-alone";
  badge.textContent = emoji || DEFAULT_EMOJI;
  icon.append(mosaic, badge);
  return icon;
}

// Ficha pequeña de un acceso (propuesta de Tilo)
export function chip(node) {
  const element = document.createElement("span");
  element.className = "group-chip";
  const img = document.createElement("img");
  img.alt = "";
  img.src = faviconUrl(node.url, 32);
  const label = document.createElement("span");
  label.textContent = node.title || hostname(node.url);
  element.append(img, label);
  return element;
}

// Botones de opción dentro de un radiogroup, con flechas para moverse
function radio(label, checked, onPick) {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("role", "radio");
  button.setAttribute("aria-checked", String(checked));
  button.tabIndex = checked ? 0 : -1;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", onPick);
  button.addEventListener("keydown", (event) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const buttons = [...button.parentElement.children];
    const next = buttons[(buttons.indexOf(button) + step + buttons.length) % buttons.length];
    next.focus();
    next.click();
  });
  return button;
}

export function renderEmojiPicker(container, selected, onPick) {
  const choices = EMOJI_CHOICES.includes(selected) || !selected ? EMOJI_CHOICES : [selected, ...EMOJI_CHOICES];
  container.replaceChildren(
    ...choices.map((emoji) => {
      const button = radio(emoji, emoji === selected, () => onPick(emoji));
      button.className = "emoji-choice";
      button.textContent = emoji;
      return button;
    })
  );
}

export function renderColorDots(container, selected, onPick) {
  container.replaceChildren(
    ...COLOR_IDS.map((id) => {
      const button = radio(t("group.colorLabel", { name: t(`group.colorName.${id}`) }), id === selected, () => onPick(id));
      button.className = "color-dot";
      button.style.setProperty("--dot", GROUP_COLORS[id]);
      button.title = t(`group.colorName.${id}`);
      return button;
    })
  );
}
