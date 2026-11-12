// Ventana flotante de una caja: emoji, nombre y color editables, sus accesos (que se
// abren, editan y reordenan como fuera), «Abrir todo» y «Desagrupar». Arrastrar un
// acceso fuera de la ventana lo saca a la cuadrícula. shortcuts.js la crea y le pasa
// las acciones; aquí solo vive la interfaz.
import { DEFAULT_EMOJI, OPEN_ALL_CONFIRM } from "../lib/groups.js";
import { t } from "./i18n.js";
import { ICONS } from "./icons.js";
import { renderColorDots, renderEmojiPicker } from "./group-ui.js";

export function createGroupBox(dialog, actions) {
  let group = null;
  let info = null;
  let dragId = null;
  let lastPoint = null;
  let confirming = false;
  let pickingEmoji = false;
  let origin = null;

  const header = document.createElement("header");
  header.className = "box-header";
  const emojiButton = document.createElement("button");
  emojiButton.type = "button";
  emojiButton.className = "box-emoji";
  emojiButton.setAttribute("aria-label", t("group.emoji"));
  emojiButton.setAttribute("aria-expanded", "false");
  const nameInput = document.createElement("input");
  nameInput.className = "box-name";
  nameInput.maxLength = 40;
  nameInput.autocomplete = "off";
  nameInput.setAttribute("aria-label", t("group.name"));
  const close = document.createElement("button");
  close.type = "button";
  close.className = "icon-button box-close";
  close.setAttribute("aria-label", t("group.close"));
  close.innerHTML = ICONS.close;
  header.append(emojiButton, nameInput, close);

  const emojis = document.createElement("div");
  emojis.className = "emoji-picker box-emojis";
  emojis.setAttribute("role", "radiogroup");
  emojis.setAttribute("aria-label", t("group.emoji"));
  emojis.hidden = true;

  const colors = document.createElement("div");
  colors.className = "color-dots box-colors";
  colors.setAttribute("role", "radiogroup");
  colors.setAttribute("aria-label", t("group.color"));

  const grid = document.createElement("div");
  grid.className = "grid box-grid";

  const footer = document.createElement("footer");
  footer.className = "box-footer";

  dialog.append(header, emojis, colors, grid, footer);

  function renderFooter() {
    const count = group.children.length;
    if (confirming) {
      const text = document.createElement("span");
      text.className = "box-confirm";
      text.textContent = t("group.confirmOpen", { n: count });
      const cancel = button(t("group.cancel"), "btn", () => {
        confirming = false;
        renderFooter();
      });
      const open = button(t("group.open"), "btn btn-primary", () => {
        confirming = false;
        actions.openAll(group);
        renderFooter();
      });
      footer.replaceChildren(text, cancel, open);
      open.focus();
      return;
    }
    const ungroup = button(t("group.ungroup"), "btn remove", () => {
      const current = group;
      dialog.close();
      actions.ungroup(current);
    });
    const openAll = button(t("group.openAll"), "btn btn-primary", () => {
      if (count > OPEN_ALL_CONFIRM) {
        confirming = true;
        renderFooter();
      } else {
        actions.openAll(group);
      }
    });
    openAll.disabled = count === 0;
    footer.replaceChildren(ungroup, openAll);
  }

  function render() {
    emojiButton.textContent = info.emoji || DEFAULT_EMOJI;
    if (document.activeElement !== nameInput) nameInput.value = info.name;
    dialog.setAttribute("aria-label", t("group.label", { name: info.name, n: group.children.length }));
    dialog.dataset.color = info.color;
    renderColorDots(colors, info.color, (color) => actions.setColor(group, color));
    if (pickingEmoji) {
      renderEmojiPicker(emojis, info.emoji, (emoji) => {
        pickingEmoji = false;
        emojis.hidden = true;
        emojiButton.setAttribute("aria-expanded", "false");
        actions.rename(group, emoji, nameInput.value);
      });
    }
    grid.replaceChildren(...group.children.map((child) => actions.renderTile(child)));
    renderFooter();
  }

  function button(label, className, onClick) {
    const element = document.createElement("button");
    element.type = "button";
    element.className = className;
    element.textContent = label;
    element.addEventListener("click", onClick);
    return element;
  }

  emojiButton.addEventListener("click", () => {
    pickingEmoji = !pickingEmoji;
    emojis.hidden = !pickingEmoji;
    emojiButton.setAttribute("aria-expanded", String(pickingEmoji));
    if (pickingEmoji) {
      render();
      emojis.querySelector('[aria-checked="true"]')?.focus();
    }
  });

  const commitName = () => {
    const name = nameInput.value.trim();
    if (name && name !== info.name) actions.rename(group, info.emoji, name);
    else nameInput.value = info.name;
  };
  nameInput.addEventListener("change", commitName);
  nameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      nameInput.blur();
    }
  });
  close.addEventListener("click", () => dialog.close());

  // Clic en el fondo (fuera de la ventana) la cierra
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    commitName();
    const back = origin;
    group = null;
    confirming = false;
    pickingEmoji = false;
    emojis.hidden = true;
    back?.focus();
  });

  // Reordenar dentro de la caja o sacar un acceso arrastrándolo fuera
  grid.addEventListener("dragstart", (event) => {
    const tile = event.target.closest(".tile[data-id]");
    if (!tile) return;
    event.stopPropagation();
    dragId = tile.dataset.id;
    tile.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
  });
  window.addEventListener("dragover", (event) => {
    if (!dragId) return;
    lastPoint = { x: event.clientX, y: event.clientY };
  });
  grid.addEventListener("dragover", (event) => {
    if (!dragId) return;
    event.preventDefault();
    const target = event.target.closest(".tile[data-id]");
    const dragged = grid.querySelector(".tile.dragging");
    if (!target || !dragged || target === dragged) return;
    const tiles = [...grid.querySelectorAll(".tile[data-id]")];
    target[tiles.indexOf(dragged) < tiles.indexOf(target) ? "after" : "before"](dragged);
  });
  dialog.addEventListener("dragover", (event) => dragId && event.preventDefault());
  dialog.addEventListener("drop", (event) => event.preventDefault());
  grid.addEventListener("dragend", (event) => {
    event.stopPropagation();
    grid.querySelector(".tile.dragging")?.classList.remove("dragging");
    const id = dragId;
    dragId = null;
    if (!id || !group) return;
    const rect = dialog.getBoundingClientRect();
    const point = lastPoint ?? { x: event.clientX, y: event.clientY };
    const outside = point.x < rect.left || point.x > rect.right || point.y < rect.top || point.y > rect.bottom;
    if (outside) {
      actions.moveOut(group, id);
      return;
    }
    const order = [...grid.querySelectorAll(".tile[data-id]")].map((tile) => tile.dataset.id);
    actions.reorder(group, id, order.indexOf(id));
  });

  return {
    open(node, nextInfo, from) {
      group = node;
      info = nextInfo;
      origin = from;
      render();
      dialog.showModal();
      nameInput.blur();
      grid.querySelector(".tile-link")?.focus();
    },
    // Tras cualquier cambio en los marcadores: se actualiza o se cierra si ya no existe
    refresh(node, nextInfo) {
      if (!group) return;
      if (!node) {
        dialog.close();
        return;
      }
      group = node;
      info = nextInfo;
      render();
    },
    groupId: () => group?.id ?? null,
    focusName() {
      nameInput.focus();
      nameInput.select();
    },
  };
}
