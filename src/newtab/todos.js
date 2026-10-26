// Lista de tareas en la esquina superior derecha: añadir con Enter, subtareas,
// tachado al terminar y limpieza de las terminadas al cambiar de día.
import { KEYS } from "../lib/storage.js";
import { addTask, dayKey, purgeCompleted, removeTask, toTree, toggleTask } from "../lib/todos.js";
import { ICONS, checkIcon } from "./icons.js";

const section = document.getElementById("todo");
const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");

let tasks = [];
// Tarea a la que se está añadiendo una subtarea (muestra un campo debajo)
let addingTo = null;

async function save(next) {
  tasks = next;
  render();
  try {
    await chrome.storage.local.set({ [KEYS.todos]: tasks });
  } catch (error) {
    console.warn("No se pudieron guardar las tareas", error);
  }
}

function actionButton(action, label, icon) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "todo-act";
  button.dataset.action = action;
  button.title = label;
  button.setAttribute("aria-label", label);
  button.innerHTML = icon;
  return button;
}

function createItem(task) {
  const item = document.createElement("li");
  item.className = "todo-item";
  item.classList.toggle("sub", Boolean(task.parentId));
  item.classList.toggle("done", task.done);
  item.dataset.id = task.id;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "todo-toggle";
  toggle.dataset.action = "toggle";
  toggle.setAttribute("role", "checkbox");
  toggle.setAttribute("aria-checked", String(task.done));

  const label = document.createElement("span");
  label.className = "todo-label";
  label.textContent = task.text;
  toggle.append(label);
  toggle.insertAdjacentHTML("beforeend", checkIcon("todo-check"));

  const actions = document.createElement("span");
  actions.className = "todo-actions";
  if (!task.parentId) actions.append(actionButton("subtask", "Añadir subtarea", ICONS.add));
  actions.append(actionButton("delete", "Eliminar tarea", ICONS.close));

  item.append(toggle, actions);
  return item;
}

function createSubtaskField() {
  const item = document.createElement("li");
  item.className = "todo-item sub todo-new";

  const subForm = document.createElement("form");
  subForm.className = "todo-add";
  const field = document.createElement("input");
  field.type = "text";
  field.placeholder = "Añadir subtarea";
  field.setAttribute("aria-label", "Añadir subtarea");
  field.autocomplete = "off";
  field.maxLength = 200;

  // Enter añade y deja el campo abierto para encadenar subtareas
  subForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await save(addTask(tasks, field.value, addingTo));
    list.querySelector(".todo-new input")?.focus();
  });
  field.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSubtaskField();
  });
  // Al salir vacío se cierra, salvo que ya se esté añadiendo a otra tarea
  const parentId = addingTo;
  field.addEventListener("blur", () => {
    if (!field.value.trim()) setTimeout(() => addingTo === parentId && closeSubtaskField());
  });

  subForm.append(field);
  item.append(subForm);
  return item;
}

function closeSubtaskField() {
  if (addingTo === null) return;
  addingTo = null;
  render();
}

function render() {
  list.replaceChildren(
    ...toTree(tasks).flatMap(({ task, children }) => [
      createItem(task),
      ...children.map(createItem),
      ...(addingTo === task.id ? [createSubtaskField()] : []),
    ])
  );
  section.classList.toggle("has-tasks", tasks.length > 0);
}

// Al cambiar de día desaparecen las terminadas
function cleanup() {
  const next = purgeCompleted(tasks, dayKey());
  if (next.length !== tasks.length) save(next);
}

function scheduleMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 1, 0);
  setTimeout(() => {
    cleanup();
    scheduleMidnight();
  }, midnight - now);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  save(addTask(tasks, input.value));
  input.value = "";
});

list.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  const id = event.target.closest(".todo-item[data-id]")?.dataset.id;
  if (!action || !id) return;

  if (action === "toggle") save(toggleTask(tasks, id, dayKey()));
  if (action === "delete") save(removeTask(tasks, id));
  if (action === "subtask") {
    addingTo = id;
    render();
    list.querySelector(".todo-new input")?.focus();
  }
});

// Cambios desde otra pestaña abierta
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !(KEYS.todos in changes)) return;
  const next = changes[KEYS.todos].newValue ?? [];
  if (JSON.stringify(next) === JSON.stringify(tasks)) return;
  tasks = next;
  render();
});

// El equipo pudo dormir durante la medianoche: se revisa al volver a la pestaña
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) cleanup();
});

const { [KEYS.todos]: saved = [] } = await chrome.storage.local.get(KEYS.todos);
tasks = saved;
render();
cleanup();
scheduleMidnight();
