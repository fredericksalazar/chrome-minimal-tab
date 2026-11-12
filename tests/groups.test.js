import assert from "node:assert/strict";
import { test } from "node:test";
import { allShortcuts } from "../src/lib/bookmarks.js";
import {
  COLOR_IDS,
  EMOJI_CHOICES,
  MAX_HINTS,
  groupColor,
  groupKey,
  isOnCenter,
  joinTitle,
  rememberHint,
  splitTitle,
} from "../src/lib/groups.js";

test("splitTitle separa el emoji del nombre, también los compuestos", () => {
  assert.deepEqual(splitTitle("🛍️ Compras"), { emoji: "🛍️", name: "Compras" });
  assert.deepEqual(splitTitle("👩‍💻 Trabajo"), { emoji: "👩‍💻", name: "Trabajo" });
  assert.deepEqual(splitTitle("🇪🇸 España"), { emoji: "🇪🇸", name: "España" });
  assert.deepEqual(splitTitle("Compras"), { emoji: null, name: "Compras" });
  assert.deepEqual(splitTitle("1 Tareas"), { emoji: null, name: "1 Tareas" });
  assert.deepEqual(splitTitle(""), { emoji: null, name: "" });
  for (const emoji of EMOJI_CHOICES) assert.equal(splitTitle(joinTitle(emoji, "X")).emoji, emoji);
});

test("joinTitle y groupKey", () => {
  assert.equal(joinTitle("💼", " Trabajo "), "💼 Trabajo");
  assert.equal(joinTitle(null, "Trabajo"), "Trabajo");
  assert.equal(groupKey("💼  Mi   Trabajo"), "mi trabajo");
  assert.equal(groupKey("Mi trabajo"), groupKey("📁 MI TRABAJO"));
});

test("groupColor: el elegido, luego el del tema y si no uno estable", () => {
  assert.equal(groupColor("compras", { compras: "tila" }, "coral"), "tila");
  assert.equal(groupColor("compras", { compras: "verde" }, "coral"), "coral");
  const color = groupColor("cosas");
  assert.ok(COLOR_IDS.includes(color));
  assert.equal(groupColor("cosas"), color);
});

test("isOnCenter distingue el centro de los bordes", () => {
  const rect = { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 };
  assert.equal(isOnCenter(rect, 50, 50), true);
  assert.equal(isOnCenter(rect, 10, 50), false);
  assert.equal(isOnCenter(rect, 50, 90), false);
});

test("rememberHint guarda la última corrección y olvida las más antiguas", () => {
  let hints = { "a.com": "none" };
  hints = rememberHint(hints, "b.com", "c:shopping");
  hints = rememberHint(hints, "a.com", "g:compras");
  assert.deepEqual(Object.entries(hints), [["b.com", "c:shopping"], ["a.com", "g:compras"]]);
  for (let i = 0; i < MAX_HINTS + 10; i++) hints = rememberHint(hints, `${i}.com`, "none");
  assert.equal(Object.keys(hints).length, MAX_HINTS);
  assert.ok(!("a.com" in hints));
});

test("allShortcuts junta los accesos sueltos y los de los grupos", () => {
  const items = [
    { id: "1", url: "https://a.com" },
    { id: "g", title: "Grupo", children: [{ id: "2", url: "https://b.com" }, { id: "3", url: "https://c.com" }] },
  ];
  assert.deepEqual(allShortcuts(items).map((node) => node.id), ["1", "2", "3"]);
});
