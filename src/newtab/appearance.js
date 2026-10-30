// Sección "Tema" del panel: Claro, Oscuro o Dispositivo. La preferencia viaja
// con la cuenta (storage.sync); theme.js la aplica y la guarda para el arranque.
import { KEYS, onSyncChange } from "../lib/storage.js";
import { THEMES } from "../lib/theme.js";
import { ICONS } from "./icons.js";
import { getThemePreference, setThemePreference } from "./theme.js";

const options = document.getElementById("theme-options");

function render() {
  const current = getThemePreference();
  options.replaceChildren(
    ...THEMES.map(({ id, name }) => {
      const option = document.createElement("label");
      option.className = "theme-option";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "theme";
      radio.value = id;
      radio.checked = id === current;
      radio.addEventListener("change", () => choose(id));

      const text = document.createElement("span");
      text.textContent = name;

      option.append(radio);
      option.insertAdjacentHTML("beforeend", ICONS[id]);
      option.append(text);
      return option;
    })
  );
}

async function choose(id) {
  setThemePreference(id);
  render();
  await chrome.storage.sync.set({ [KEYS.theme]: id });
}

onSyncChange(KEYS.theme, (value) => {
  setThemePreference(value);
  render();
});

const { [KEYS.theme]: saved } = await chrome.storage.sync.get(KEYS.theme);
setThemePreference(saved);
render();
