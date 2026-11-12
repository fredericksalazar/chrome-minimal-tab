// «Propuesta de Tilo»: los grupos que Tilo sugiere (src/lib/classify.js) en tarjetas
// editables. Se puede renombrar, cambiar el color, quitar un grupo, arrastrar fichas
// entre grupos o a «Sin grupo», y moverlas con el teclado. «Aplicar» devuelve el plan
// a shortcuts.js, que es quien toca los marcadores; «Cancelar» no cambia nada.
import { t } from "./i18n.js";
import { chip, renderColorDots } from "./group-ui.js";

let uid = 0;

// cards: [{ include, groupId, category, emoji, name, color, items }], loose: [nodes]
export function openProposal(dialog, { cards, loose, total }, onApply) {
  const state = { cards: cards.map((card) => ({ ...card, uid: ++uid, items: [...card.items] })), loose: [...loose] };
  // Dónde lo puso Tilo, para saber qué corrigió el usuario
  const original = new Map();
  for (const card of state.cards) for (const item of card.items) original.set(item.id, card.uid);
  for (const item of state.loose) original.set(item.id, null);
  let dragId = null;

  const find = (id) => {
    for (const card of state.cards) {
      const index = card.items.findIndex((item) => item.id === id);
      if (index >= 0) return { list: card.items, index };
    }
    const index = state.loose.findIndex((item) => item.id === id);
    return { list: state.loose, index };
  };

  const move = (id, targetUid) => {
    const { list, index } = find(id);
    if (index < 0) return;
    const [item] = list.splice(index, 1);
    const target = targetUid === null ? state.loose : state.cards.find((card) => card.uid === targetUid).items;
    target.push(item);
    render();
  };

  function dropZone(element, targetUid) {
    element.addEventListener("dragover", (event) => {
      if (!dragId) return;
      event.preventDefault();
      element.classList.add("drop-over");
    });
    element.addEventListener("dragleave", () => element.classList.remove("drop-over"));
    element.addEventListener("drop", (event) => {
      event.preventDefault();
      element.classList.remove("drop-over");
      if (dragId) move(dragId, targetUid);
    });
  }

  function draggableChip(item, extra) {
    const element = chip(item);
    element.draggable = true;
    element.addEventListener("dragstart", (event) => {
      dragId = item.id;
      event.dataTransfer.effectAllowed = "move";
    });
    element.addEventListener("dragend", () => (dragId = null));
    element.append(extra);
    return element;
  }

  function renderCard(card) {
    const element = document.createElement("section");
    element.className = "proposal-card";
    element.classList.toggle("excluded", !card.include);
    element.dataset.color = card.color;
    dropZone(element, card.uid);

    const head = document.createElement("div");
    head.className = "proposal-head";
    const include = document.createElement("input");
    include.type = "checkbox";
    include.checked = card.include;
    include.setAttribute("aria-label", t("group.include", { name: card.name }));
    include.addEventListener("change", () => {
      card.include = include.checked;
      render();
    });
    const emoji = document.createElement("span");
    emoji.className = "proposal-emoji";
    emoji.textContent = card.emoji;
    emoji.setAttribute("aria-hidden", "true");
    const name = document.createElement("input");
    name.className = "proposal-name";
    name.value = card.name;
    name.maxLength = 40;
    name.setAttribute("aria-label", t("group.name"));
    name.addEventListener("change", () => (card.name = name.value.trim() || card.name));
    const dots = document.createElement("div");
    dots.className = "color-dots proposal-colors";
    dots.setAttribute("role", "radiogroup");
    dots.setAttribute("aria-label", t("group.color"));
    renderColorDots(dots, card.color, (color) => {
      card.color = color;
      render();
    });
    head.append(include, emoji, name, dots);

    const chips = document.createElement("div");
    chips.className = "proposal-chips";
    for (const item of card.items) {
      const out = document.createElement("button");
      out.type = "button";
      out.className = "chip-out";
      out.textContent = "×";
      out.setAttribute("aria-label", t("group.takeOut", { name: item.title || item.url }));
      out.addEventListener("click", () => move(item.id, null));
      chips.append(draggableChip(item, out));
    }
    element.append(head, chips);
    return element;
  }

  function renderLoose() {
    const element = document.createElement("section");
    element.className = "proposal-card proposal-loose";
    dropZone(element, null);
    const title = document.createElement("h3");
    title.textContent = t("group.none");
    const chips = document.createElement("div");
    chips.className = "proposal-chips";
    for (const item of state.loose) {
      const select = document.createElement("select");
      select.className = "chip-move";
      select.setAttribute("aria-label", `${t("group.moveTo")} ${item.title || item.url}`);
      const placeholder = new Option(t("group.moveTo"), "");
      select.append(placeholder, ...state.cards.map((card) => new Option(`${card.emoji} ${card.name}`, String(card.uid))));
      select.addEventListener("change", () => select.value && move(item.id, Number(select.value)));
      chips.append(draggableChip(item, select));
    }
    element.append(title, chips);
    return element;
  }

  function render() {
    const grouped = state.cards.filter((card) => card.include).reduce((sum, card) => sum + card.items.length, 0);
    const groups = state.cards.filter((card) => card.include && card.items.length).length;

    const heading = document.createElement("h2");
    heading.textContent = t("group.proposalTitle");
    const intro = document.createElement("p");
    intro.className = "proposal-intro";
    intro.textContent = t("group.proposalText", { n: grouped, g: groups });

    const list = document.createElement("div");
    list.className = "proposal-list";
    list.append(...state.cards.map(renderCard), renderLoose());

    const actions = document.createElement("div");
    actions.className = "dialog-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn";
    cancel.textContent = t("group.cancel");
    cancel.addEventListener("click", () => dialog.close());
    const apply = document.createElement("button");
    apply.type = "button";
    apply.className = "btn btn-primary";
    apply.textContent = t("group.apply");
    apply.disabled = groups === 0;
    apply.addEventListener("click", () => {
      dialog.close();
      onApply({ cards: state.cards.filter((card) => card.include && card.items.length), original, loose: state.loose });
    });
    actions.append(cancel, apply);

    // Al rehacer la vista se pierde el foco: vuelve a «Aplicar» para no saltar al inicio
    const hadFocus = dialog.open && dialog.contains(document.activeElement);
    dialog.replaceChildren(heading, intro, list, actions);
    if (hadFocus) apply.focus();
  }

  // Sin temas claros no hay nada que revisar
  if (!state.cards.length) {
    const text = document.createElement("p");
    text.className = "proposal-intro";
    text.textContent = t("group.noProposal");
    const close = document.createElement("button");
    close.type = "button";
    close.className = "btn btn-primary";
    close.textContent = t("group.close");
    close.addEventListener("click", () => dialog.close());
    const actions = document.createElement("div");
    actions.className = "dialog-actions";
    actions.append(close);
    const heading = document.createElement("h2");
    heading.textContent = t("group.proposalTitle");
    dialog.replaceChildren(heading, text, actions);
    dialog.showModal();
    close.focus();
    return;
  }

  render();
  dialog.dataset.total = String(total);
  dialog.showModal();
  dialog.querySelector(".btn-primary")?.focus();
}
