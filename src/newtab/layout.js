// Lienzo de herramientas: arrastrar con el ratón hora/clima, tareas y velocidad,
// guardar su ubicación en porcentaje y mantenerlas siempre dentro de la ventana.
import {
  TOOLS,
  anchorPanel,
  clampPosition,
  exceedsDragThreshold,
  normalizeLayout,
  toPercentPosition,
  toPixelPosition,
} from "../lib/layout.js";
import { KEYS, onSyncChange } from "../lib/storage.js";

const root = document.documentElement;
const elements = {
  widget: document.getElementById("widget"),
  todo: document.getElementById("todo"),
  speed: document.getElementById("speed-tool"),
  water: document.getElementById("water-tracker"),
};
const speedPanel = document.getElementById("speed-panel");
const speedHeader = speedPanel?.querySelector(".speed-header");
const resetButton = document.getElementById("reset-layout");

let layout = {};
let activeDrag = null;

function cache(next) {
  try {
    if (Object.keys(next).length) {
      localStorage.setItem("layout", JSON.stringify(next));
    } else {
      localStorage.removeItem("layout");
    }
  } catch {
    // Sin acceso a localStorage: funciona igual con chrome.storage.sync
  }
}

function positionSpeedPanel() {
  if (!speedPanel || speedPanel.hidden || !elements.speed) return;
  const placed = "speed" in layout || activeDrag?.id === "speed";
  if (!placed) {
    speedPanel.style.removeProperty("left");
    speedPanel.style.removeProperty("top");
    speedPanel.style.removeProperty("bottom");
    return;
  }
  const triggerRect = elements.speed.getBoundingClientRect();
  const pos = anchorPanel(
    triggerRect,
    { width: speedPanel.offsetWidth || 360, height: speedPanel.offsetHeight || 320 },
    { width: window.innerWidth, height: window.innerHeight }
  );
  speedPanel.style.left = `${pos.left}px`;
  speedPanel.style.top = `${pos.top}px`;
  speedPanel.style.bottom = "auto";
}

function applyTool(id) {
  const element = elements[id];
  if (!element) return;
  const point = layout[id];
  if (!point) {
    root.removeAttribute(`data-placed-${id}`);
    root.style.removeProperty(`--tool-${id}-x`);
    root.style.removeProperty(`--tool-${id}-y`);
    if (id === "speed") positionSpeedPanel();
    return;
  }
  const { left, top } = toPixelPosition(point, {
    width: element.offsetWidth,
    height: element.offsetHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  });
  root.style.setProperty(`--tool-${id}-x`, `${left}px`);
  root.style.setProperty(`--tool-${id}-y`, `${top}px`);
  root.setAttribute(`data-placed-${id}`, "");
  if (id === "speed") positionSpeedPanel();
}

function applyAll() {
  for (const id of TOOLS) applyTool(id);
}

async function saveLayout(next) {
  layout = normalizeLayout(next);
  cache(layout);
  applyAll();
  try {
    await chrome.storage.sync.set({ [KEYS.layout]: layout });
  } catch (error) {
    console.warn("No se pudo guardar la posición de las herramientas", error);
  }
}

function startDrag(id, event) {
  if (event.button !== 0) return;
  const element = elements[id];
  if (!element) return;

  // Si el usuario arrastra dentro de un campo de texto ya enfocado, selecciona texto
  const field = event.target.closest("input, textarea, select");
  if (field && document.activeElement === field) return;

  const rect = element.getBoundingClientRect();
  activeDrag = {
    id,
    element,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    left: rect.left,
    top: rect.top,
    started: false,
  };
}

for (const id of TOOLS) {
  elements[id]?.addEventListener("pointerdown", (event) => startDrag(id, event));
}
speedHeader?.addEventListener("pointerdown", (event) => startDrag("speed", event));

window.addEventListener("pointermove", (event) => {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
  if (!activeDrag.started) {
    if (!exceedsDragThreshold(activeDrag.startX, activeDrag.startY, event.clientX, event.clientY)) return;
    activeDrag.started = true;
    activeDrag.element.classList.add("is-dragging");
    document.body.dataset.dragging = "";
    if (document.activeElement && activeDrag.element.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    window.getSelection?.()?.removeAllRanges?.();
  }

  event.preventDefault();
  const pos = clampPosition({
    left: event.clientX - activeDrag.offsetX,
    top: event.clientY - activeDrag.offsetY,
    width: activeDrag.element.offsetWidth,
    height: activeDrag.element.offsetHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  });
  activeDrag.left = pos.left;
  activeDrag.top = pos.top;
  root.style.setProperty(`--tool-${activeDrag.id}-x`, `${pos.left}px`);
  root.style.setProperty(`--tool-${activeDrag.id}-y`, `${pos.top}px`);
  root.setAttribute(`data-placed-${activeDrag.id}`, "");
  if (activeDrag.id === "speed") positionSpeedPanel();
});

function endDrag(event) {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
  const drag = activeDrag;
  activeDrag = null;
  if (!drag.started) return;

  drag.element.classList.remove("is-dragging");
  delete document.body.dataset.dragging;

  // Evita que soltar el ratón tras arrastrar dispare el clic del botón debajo. Solo
  // al soltar de verdad (un arrastre cancelado no genera clic) y por poco tiempo, para
  // no tragarse el siguiente clic del usuario si el navegador no llega a enviarlo.
  if (event.type === "pointerup") {
    const swallow = (clickEvent) => {
      clickEvent.stopPropagation();
      clickEvent.preventDefault();
    };
    window.addEventListener("click", swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 400);
  }

  const point = toPercentPosition({
    left: drag.left,
    top: drag.top,
    width: drag.element.offsetWidth,
    height: drag.element.offsetHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  });
  saveLayout({ ...layout, [drag.id]: point });
}

window.addEventListener("pointerup", endDrag);
window.addEventListener("pointercancel", endDrag);

window.addEventListener("resize", () => {
  if (!activeDrag) applyAll();
});

if (typeof ResizeObserver === "function") {
  const observer = new ResizeObserver(() => {
    if (!activeDrag) applyAll();
  });
  for (const id of TOOLS) {
    if (elements[id]) observer.observe(elements[id]);
  }
}

if (speedPanel && typeof MutationObserver === "function") {
  new MutationObserver(() => positionSpeedPanel()).observe(speedPanel, {
    attributes: true,
    attributeFilter: ["hidden"],
  });
}

resetButton?.addEventListener("click", () => {
  saveLayout({});
});

onSyncChange(KEYS.layout, (next) => {
  const normalized = normalizeLayout(next);
  if (JSON.stringify(normalized) === JSON.stringify(layout)) return;
  layout = normalized;
  cache(layout);
  applyAll();
});

try {
  const { [KEYS.layout]: saved } = await chrome.storage.sync.get(KEYS.layout);
  layout = normalizeLayout(saved);
  cache(layout);
  applyAll();
} catch (error) {
  console.warn("No se pudo cargar la posición de las herramientas", error);
}
