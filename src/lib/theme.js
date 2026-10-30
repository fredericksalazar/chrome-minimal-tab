// Tema de la página: "system" sigue al sistema; "light" y "dark" lo fijan.
// theme-boot.js repite resolveTheme porque es un script clásico y no puede importar.
// Nombres visibles: theme.<id> en src/i18n/
export const THEMES = [{ id: "light" }, { id: "dark" }, { id: "system" }];
export const DEFAULT_THEME = "system";

export function normalizeTheme(value) {
  return THEMES.some((theme) => theme.id === value) ? value : DEFAULT_THEME;
}

// Tema efectivo ("light" | "dark") según la preferencia y el modo del sistema
export function resolveTheme(preference, systemDark) {
  const theme = normalizeTheme(preference);
  if (theme === "system") return systemDark ? "dark" : "light";
  return theme;
}
