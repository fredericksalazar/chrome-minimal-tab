// Lógica de la lista de tareas, sin DOM. Una tarea terminada se ve tachada el día
// en que se marca y desaparece a partir del día siguiente; las pendientes se quedan.
// Modelo plano: { id, text, parentId, done, doneOn } con un solo nivel de subtareas.
export const MAX_TEXT = 200;

// Día local en formato AAAA-MM-DD (no UTC: el cambio de día es a medianoche local)
export function dayKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function addTask(tasks, text, parentId = null) {
  const clean = text.trim().slice(0, MAX_TEXT);
  if (!clean) return tasks;
  if (parentId && !tasks.some((task) => task.id === parentId && !task.parentId)) return tasks;

  const task = { id: crypto.randomUUID(), text: clean, parentId, done: false, doneOn: null };
  // Una subtarea nueva deja a su tarea principal pendiente otra vez
  const updated = parentId ? tasks.map((t) => (t.id === parentId ? { ...t, done: false, doneOn: null } : t)) : tasks;
  return [...updated, task];
}

export function toggleTask(tasks, id, today) {
  const target = tasks.find((task) => task.id === id);
  if (!target) return tasks;
  const done = !target.done;

  return tasks.map((task) => {
    if (task.id === id) return { ...task, done, doneOn: done ? today : null };
    // Terminar una tarea termina también sus subtareas pendientes
    if (done && task.parentId === id && !task.done) return { ...task, done: true, doneOn: today };
    return task;
  });
}

export function removeTask(tasks, id) {
  return tasks.filter((task) => task.id !== id && task.parentId !== id);
}

export function purgeCompleted(tasks, today) {
  const hasPending = (id) => tasks.some((task) => task.parentId === id && !task.done);
  // Una tarea principal con subtareas pendientes no está terminada del todo
  const kept = tasks.filter((task) => !task.done || task.doneOn === today || (!task.parentId && hasPending(task.id)));
  const ids = new Set(kept.map((task) => task.id));
  return kept.filter((task) => !task.parentId || ids.has(task.parentId));
}

// Orden de pintado: cada tarea seguida de sus subtareas
export function toTree(tasks) {
  return tasks
    .filter((task) => !task.parentId)
    .map((task) => ({ task, children: tasks.filter((child) => child.parentId === task.id) }));
}
