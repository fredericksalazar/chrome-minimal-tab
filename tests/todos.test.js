import assert from "node:assert/strict";
import { test } from "node:test";
import { addTask, dayKey, purgeCompleted, removeTask, toTree, toggleTask } from "../src/lib/todos.js";

const TODAY = "2026-10-25";
const TOMORROW = "2026-10-26";

test("dayKey usa la fecha local", () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
});

test("addTask ignora textos vacíos y subtareas de padres inexistentes", () => {
  assert.deepEqual(addTask([], "   "), []);
  assert.deepEqual(addTask([], "Sub", "no-existe"), []);
  const [task] = addTask([], "  Comprar pan  ");
  assert.equal(task.text, "Comprar pan");
  assert.equal(task.parentId, null);
});

test("las subtareas cuelgan de su tarea y no admiten un segundo nivel", () => {
  let tasks = addTask([], "Proyecto");
  const parent = tasks[0];
  tasks = addTask(tasks, "Paso 1", parent.id);
  const child = tasks[1];
  assert.equal(child.parentId, parent.id);
  assert.equal(addTask(tasks, "Nieto", child.id), tasks);
  assert.deepEqual(toTree(tasks).map(({ task, children }) => [task.text, children.map((c) => c.text)]), [["Proyecto", ["Paso 1"]]]);
});

test("terminar una tarea termina sus subtareas y se puede desmarcar", () => {
  let tasks = addTask([], "Proyecto");
  const parent = tasks[0];
  tasks = addTask(tasks, "Paso 1", parent.id);
  tasks = toggleTask(tasks, parent.id, TODAY);
  assert.ok(tasks.every((task) => task.done && task.doneOn === TODAY));
  tasks = toggleTask(tasks, parent.id, TODAY);
  assert.equal(tasks[0].done, false);
  assert.equal(tasks[0].doneOn, null);
});

test("una subtarea nueva reabre la tarea principal", () => {
  let tasks = addTask([], "Proyecto");
  tasks = toggleTask(tasks, tasks[0].id, TODAY);
  tasks = addTask(tasks, "Otro paso", tasks[0].id);
  assert.equal(tasks[0].done, false);
});

test("las terminadas siguen hoy y desaparecen mañana; las pendientes se quedan", () => {
  let tasks = addTask(addTask([], "Hecha"), "Pendiente");
  tasks = toggleTask(tasks, tasks[0].id, TODAY);
  assert.equal(purgeCompleted(tasks, TODAY).length, 2);
  assert.deepEqual(purgeCompleted(tasks, TOMORROW).map((task) => task.text), ["Pendiente"]);
});

test("una tarea terminada con subtareas pendientes no desaparece", () => {
  let tasks = addTask([], "Proyecto");
  const parent = tasks[0];
  tasks = addTask(tasks, "Paso 1", parent.id);
  tasks = tasks.map((task) => (task.id === parent.id ? { ...task, done: true, doneOn: TODAY } : task));
  assert.deepEqual(purgeCompleted(tasks, TOMORROW).map((task) => task.text), ["Proyecto", "Paso 1"]);
});

test("al eliminar una tarea se eliminan sus subtareas", () => {
  let tasks = addTask([], "Proyecto");
  tasks = addTask(tasks, "Paso 1", tasks[0].id);
  tasks = addTask(tasks, "Otra");
  assert.deepEqual(removeTask(tasks, tasks[0].id).map((task) => task.text), ["Otra"]);
});
