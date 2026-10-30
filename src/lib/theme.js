// Tema de la página: "system" sigue al sistema; "light" y "dark" lo fijan.
// theme-boot.js repite resolveTheme porque es un script clásico y no puede importar.
export const THEMES = [
  { id: "light", name: "Claro" },
  { id: "dark", name: "Oscuro" },
  { id: "system", name: "Dispositivo" },
];
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
