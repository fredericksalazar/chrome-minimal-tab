import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DRAG_THRESHOLD,
  MARGIN,
  TOOLS,
  anchorPanel,
  clampPosition,
  exceedsDragThreshold,
  hasCustomLayout,
  normalizeLayout,
  toPercentPosition,
  toPixelPosition,
} from "../src/lib/layout.js";

test("las cuatro herramientas del lienzo están registradas", () => {
  assert.deepEqual(TOOLS, ["widget", "todo", "speed", "water"]);
  assert.equal(MARGIN, 8);
  assert.equal(DRAG_THRESHOLD, 5);
});

test("normalizeLayout filtra claves desconocidas y acota porcentajes entre 0 y 100", () => {
  assert.deepEqual(normalizeLayout(null), {});
  assert.deepEqual(normalizeLayout("invalido"), {});
  assert.deepEqual(
    normalizeLayout({
      widget: { x: 12.3456, y: -5 },
      todo: { x: 150, y: 24.5 },
      speed: { x: "no", y: 10 },
      otro: { x: 10, y: 10 },
    }),
    {
      widget: { x: 12.35, y: 0 },
      todo: { x: 100, y: 24.5 },
    }
  );
  assert.equal(hasCustomLayout({}), false);
  assert.equal(hasCustomLayout({ widget: { x: 10, y: 20 } }), true);
});

test("clampPosition mantiene la herramienta dentro de los márgenes visibles de la ventana", () => {
  const box = { width: 260, height: 180, viewportWidth: 1200, viewportHeight: 800 };
  assert.deepEqual(clampPosition({ left: -40, top: -10, ...box }), { left: 8, top: 8 });
  assert.deepEqual(clampPosition({ left: 1100, top: 750, ...box }), { left: 932, top: 612 });
  assert.deepEqual(clampPosition({ left: 300, top: 200, ...box }), { left: 300, top: 200 });
});

test("toPercentPosition y toPixelPosition convierten y recortan al redimensionar la ventana", () => {
  const saved = toPercentPosition({
    left: 600,
    top: 200,
    width: 200,
    height: 100,
    viewportWidth: 1200,
    viewportHeight: 800,
  });
  assert.deepEqual(saved, { x: 50, y: 25 });

  // Misma ventana: vuelve al mismo píxel
  assert.deepEqual(
    toPixelPosition(saved, { width: 200, height: 100, viewportWidth: 1200, viewportHeight: 800 }),
    { left: 600, top: 200 }
  );

  // Si la herramienta estaba pegada a la derecha y la ventana se achica, no se sale
  const nearRight = { x: 92, y: 90 };
  assert.deepEqual(
    toPixelPosition(nearRight, { width: 260, height: 150, viewportWidth: 800, viewportHeight: 600 }),
    { left: 532, top: 442 }
  );
});

test("exceedsDragThreshold distingue un clic normal de un arrastre con el ratón", () => {
  assert.equal(exceedsDragThreshold(100, 100, 102, 103), false);
  assert.equal(exceedsDragThreshold(100, 100, 103, 104), true);
  assert.equal(exceedsDragThreshold(100, 100, 110, 100), true);
});

test("anchorPanel coloca el panel de velocidad arriba o abajo y dentro de la pantalla", () => {
  const panelSize = { width: 360, height: 320 };
  const viewport = { width: 1280, height: 800 };

  // Botón abajo a la izquierda: el panel se abre encima y alineado a la izquierda
  const bottomLeft = anchorPanel({ left: 16, top: 744, width: 40, height: 40 }, panelSize, viewport);
  assert.deepEqual(bottomLeft, { left: 16, top: 416 });

  // Botón arriba a la derecha: el panel se abre debajo y sin salirse por la derecha
  const topRight = anchorPanel({ left: 1220, top: 20, width: 40, height: 40 }, panelSize, viewport);
  assert.deepEqual(topRight, { left: 912, top: 68 });
});
