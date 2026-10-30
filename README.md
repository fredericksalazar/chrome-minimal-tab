# Tilo — Nueva pestaña limpia

Extensión de Chrome que sustituye la nueva pestaña por una limpia, rápida y privada (sin cuentas ni rastreo) y añade:

- Hasta 100 accesos directos guardados en la carpeta de marcadores «Accesos directos» (se sincronizan con tu cuenta y se pueden añadir con ⌘D, ⌥⇧D, el icono o el menú contextual).
- Hora, ciudad y clima: antes de usar la ubicación pregunta, y permite escribir la ciudad o no mostrar el clima.
- Lista de tareas con subtareas: las terminadas se ven tachadas hoy y desaparecen al día siguiente.
- Buscador que usa por defecto el motor configurado en Chrome, con el logotipo de Tilo y un aura de colores en el borde.
- Panel «Personalizar»: motor de búsqueda (el de Chrome u otro de la lista) y fondo (colores sólidos, degradados o una imagen propia con desenfoque regulable; la imagen se queda en este equipo).
- Prueba de velocidad (latencia, jitter, descarga y subida) contra Cloudflare.
- Botones discretos abajo en el centro para apoyar el proyecto (Buy Me a Coffee o PayPal) y visitar la web del autor; se abren en otra pestaña.

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
  backgrounds.js         Catálogo de fondos e imagen propia (tamaño, tono, desenfoque)
  speedtest.js           Motor de la prueba de velocidad
  weather.js             Origen del clima elegido y URLs de Open-Meteo
  support.js             Enlaces de apoyo al autor
  todos.js               Tareas, subtareas y limpieza diaria
src/newtab/            Un módulo por cada parte de la página
  theme-boot.js          Aplica el fondo guardado antes de pintar (script clásico)
  theme.js               Tema efectivo (fondo o sistema) y suscripción a cambios
  shortcuts.js           Cuadrícula, diálogo, deshacer y reordenar
  search.js              Motor elegido, icono y envío del buscador
  clock-weather.js       Hora y clima
  todos.js               Lista de tareas de la esquina superior derecha
  drawer.js              Abrir y cerrar el panel «Personalizar»
  backgrounds.js         Sección «Fondo» del panel
  speed-panel.js         Panel, barra animada y gráfica de la prueba de velocidad
  support.js             Botones de apoyo de la zona inferior central
  icons.js               Iconos SVG estáticos
styles/                Un CSS por funcionalidad (base, componentes, widget, tareas, accesos, panel, velocidad, apoyo)
assets/                Logo de Tilo (brand/) e iconos de la extensión
tests/                 Tests unitarios de src/lib (node:test)
```

Reglas de la arquitectura:

- `src/lib` no toca el DOM; así se puede usar desde el service worker y probar con Node.
- Cada módulo de `src/newtab` es dueño de su parte del HTML y se comunica con los demás solo a través de `chrome.storage` o de `theme.js`.
- Las preferencias van en `chrome.storage.sync` (viajan con la cuenta) y las cachés y la imagen de fondo en `chrome.storage.local`.

## Tests

```bash
npm test
```

## Desarrollo con agentes de IA

Abre cualquier agente (Claude Code, Codex, Gemini CLI, Antigravity, OpenCode…) en esta carpeta y
cuéntale lo que quieres. El agente sigue el ciclo idea → requisito → producto → código → QA →
publicación definido en [`agents/`](agents/README.md) (local, no se sube al repositorio).

## Servicios externos

| Uso | Servicio |
|---|---|
| Favicons | `t3.gstatic.com` (Google) |
| Clima | Open-Meteo |
| Ciudad | BigDataCloud o, sin permiso de ubicación, ipapi.co; ciudad escrita: geocodificación de Open-Meteo |
| Prueba de velocidad | `speed.cloudflare.com` |

Solo después de que el usuario lo elija en el aviso del clima. Política de privacidad: https://fredericksalazar.github.io/tilo/privacidad.html
