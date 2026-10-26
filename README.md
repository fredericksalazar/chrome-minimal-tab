# Minimal New Tab

Extensión de Chrome que sustituye la nueva pestaña por una con el diseño de Google y añade:

- Hasta 100 accesos directos guardados en la carpeta de marcadores «Accesos directos» (se sincronizan con tu cuenta y se pueden añadir con ⌘D, ⌥⇧D, el icono o el menú contextual).
- Hora, ciudad y clima.
- Panel «Personalizar»: motor de búsqueda (con su logo oficial) y fondo (colores sólidos o degradados).
- Prueba de velocidad (latencia, jitter, descarga y subida) contra Cloudflare.

## Instalación

1. Abre `chrome://extensions` y activa el **Modo de desarrollador**.
2. Pulsa **Cargar descomprimida** y elige esta carpeta.

Requiere Chrome 111 o posterior.

## Estructura

```
manifest.json          Configuración de la extensión
background.js          Service worker: atajo, icono y menú contextual
newtab.html            Página de nueva pestaña
src/lib/               Lógica sin interfaz, compartida y testeable
  bookmarks.js           Carpeta de accesos directos y límite de 100
  url.js                 Normalizar URLs, favicons
  storage.js             Claves de chrome.storage
  engines.js             Catálogo de motores de búsqueda
  backgrounds.js         Catálogo de fondos
  speedtest.js           Motor de la prueba de velocidad
src/newtab/            Un módulo por cada parte de la página
  theme-boot.js          Aplica el fondo guardado antes de pintar (script clásico)
  theme.js               Tema efectivo (fondo o sistema) y suscripción a cambios
  shortcuts.js           Cuadrícula, diálogo, deshacer y reordenar
  search.js              Motor elegido, logo y envío del buscador
  clock-weather.js       Hora y clima
  drawer.js              Abrir y cerrar el panel «Personalizar»
  backgrounds.js         Sección «Fondo» del panel
  speed-panel.js         Panel, barra animada y gráfica de la prueba de velocidad
  icons.js               Iconos SVG estáticos
styles/                Un CSS por funcionalidad (base, componentes, widget, accesos, panel, velocidad)
assets/                Logos de los motores e iconos de la extensión
tests/                 Tests unitarios de src/lib (node:test)
```

Reglas de la arquitectura:

- `src/lib` no toca el DOM; así se puede usar desde el service worker y probar con Node.
- Cada módulo de `src/newtab` es dueño de su parte del HTML y se comunica con los demás solo a través de `chrome.storage` o de `theme.js`.
- Las preferencias van en `chrome.storage.sync` (viajan con la cuenta) y las cachés en `chrome.storage.local`.

## Tests

```bash
npm test
```

## Servicios externos

| Uso | Servicio |
|---|---|
| Favicons | `t3.gstatic.com` (Google) |
| Clima | Open-Meteo |
| Ciudad | BigDataCloud o, sin permiso de ubicación, ipapi.co |
| Prueba de velocidad | `speed.cloudflare.com` |
