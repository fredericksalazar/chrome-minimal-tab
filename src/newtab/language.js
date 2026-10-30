// Sección "Idioma" del panel: Automático (el de Chrome) o uno de los idiomas de
// Tilo, cada uno con su nombre propio. Elegir otro recarga la pestaña.
import { AUTO, LANGUAGES } from "../lib/i18n.js";
import { detected, preference, setLanguage, t } from "./i18n.js";

const select = document.getElementById("language-select");
const auto = LANGUAGES.find(({ id }) => id === detected).name;

select.replaceChildren(
  new Option(t("settings.languageAuto", { language: auto }), AUTO, false, preference === AUTO),
  ...LANGUAGES.map(({ id, name }) => {
    const option = new Option(name, id, false, preference === id);
    option.lang = id;
    return option;
  })
);
select.addEventListener("change", () => setLanguage(select.value));
