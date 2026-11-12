// Lienzo de herramientas: normalización de coordenadas en porcentaje (0..100),
// recorte dentro de la ventana y colocación adaptable de paneles flotantes.

export const TOOLS = ["widget", "todo", "speed", "water"];
export const MARGIN = 8;
export const DRAG_THRESHOLD = 5;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round2 = (value) => Math.round(value * 100) / 100;

export function normalizeLayout(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result = {};
  for (const id of TOOLS) {
    const entry = raw[id];
    if (!entry || typeof entry !== "object") continue;
    const x = Number(entry.x);
    const y = Number(entry.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    result[id] = { x: round2(clamp(x, 0, 100)), y: round2(clamp(y, 0, 100)) };
  }
  return result;
}

export function hasCustomLayout(raw) {
  return Object.keys(normalizeLayout(raw)).length > 0;
}

export function clampPosition({ left, top, width = 0, height = 0, viewportWidth, viewportHeight, margin = MARGIN }) {
  const maxLeft = Math.max(margin, viewportWidth - width - margin);
  const maxTop = Math.max(margin, viewportHeight - height - margin);
  return {
    left: Math.round(clamp(left, margin, maxLeft)),
    top: Math.round(clamp(top, margin, maxTop)),
  };
}

export function toPercentPosition({ left, top, width = 0, height = 0, viewportWidth, viewportHeight, margin = MARGIN }) {
  if (!(viewportWidth > 0) || !(viewportHeight > 0)) return { x: 0, y: 0 };
  const clamped = clampPosition({ left, top, width, height, viewportWidth, viewportHeight, margin });
  return {
    x: round2(clamp((clamped.left / viewportWidth) * 100, 0, 100)),
    y: round2(clamp((clamped.top / viewportHeight) * 100, 0, 100)),
  };
}

export function toPixelPosition(point, { width = 0, height = 0, viewportWidth, viewportHeight, margin = MARGIN }) {
  const x = clamp(Number(point?.x) || 0, 0, 100);
  const y = clamp(Number(point?.y) || 0, 0, 100);
  const left = (x / 100) * viewportWidth;
  const top = (y / 100) * viewportHeight;
  return clampPosition({ left, top, width, height, viewportWidth, viewportHeight, margin });
}

export function exceedsDragThreshold(startX, startY, currentX, currentY, threshold = DRAG_THRESHOLD) {
  return Math.hypot(currentX - startX, currentY - startY) >= threshold;
}

export function anchorPanel(triggerRect, panelSize, viewport, gap = 8, margin = MARGIN) {
  const spaceAbove = triggerRect.top - gap - margin;
  const spaceBelow = viewport.height - (triggerRect.top + triggerRect.height + gap) - margin;
  const placeAbove = spaceAbove >= panelSize.height || (triggerRect.top > viewport.height / 2 && spaceAbove >= spaceBelow);
  const rawTop = placeAbove
    ? triggerRect.top - gap - panelSize.height
    : triggerRect.top + triggerRect.height + gap;

  return clampPosition({
    left: triggerRect.left,
    top: rawTop,
    width: panelSize.width,
    height: panelSize.height,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    margin,
  });
}
