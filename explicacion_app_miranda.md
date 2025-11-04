# Documentación técnica — `app.js` + flujo de interfaz
**Proyecto:** mirandaperezhita  
**Fecha:** 2025-11-04 09:31 (Europe/Madrid)

---

## 1) Visión general
La app carga `data/home.json`, determina los proyectos visibles y descarga sus `data/[slug].json`. Luego renderiza:
- Un menú lateral con un botón por proyecto (`#project-menu`).
- Un listado de secciones de proyecto con hero + info + galería (`.projects-wrapper` en `#projects-container`).

Permite cambiar de idioma (CAT/ES) sin reconstruir todo el DOM.

---

## 2) Estado global y referencias al DOM
```js
let homeData = null;
let projectsData = {};
let activeLanguage = "cat";
let activeAuthor = null;

const sidebar = document.getElementById("sidebar");
const projectMenu = document.getElementById("project-menu");
const projectsContainer = document.getElementById("projects-container");
const langButtons = document.querySelectorAll(".lang-btn");
const authorButtons = document.querySelectorAll(".author-btn");
```
- `homeData`: contenido de `data/home.json`.
- `projectsData`: caché `{slug: dataDelProyecto}`.
- `activeLanguage`: idioma activo (p.ej. `"cat"` / `"es"`).
- `activeAuthor`: autor activo para el filtro (se eliminará en la nueva versión).
- Referencias a los nodos clave del DOM.

---

## 3) Arranque `init()`
```js
async function init() { ... }
```
- `fetch("data/home.json")` → guarda en `homeData`.
- `updateSidebarColor()` → pinta color de fondo según `home_colors[idioma]`.
- Determina proyectos visibles (`getVisibleProjectsFromHome()`), los descarga (`loadProjects()`).
- Renderiza menú y proyectos (`renderProjectMenu()`, `renderProjects()`).
- Activa listeners (`setupEventListeners()`).

---

## 4) Visibilidad y datos
- `getVisibleProjectsFromHome()` filtra por `visible: true` o `"si"` dentro de `homeData.projectes_visibles`.
- `loadProjects(visibleProjects)` descarga en paralelo `data/[slug].json` y llena `projectsData[slug]`.

**Contrato de datos esperado por proyecto (resumen):**
```json
{
  "titol": { "cat": "Títol", "es": "Título" },
  "client": { "cat": "...", "es": "..." },
  "lloc":   { "cat": "...", "es": "..." },
  "data": "2024",
  "text": { "cat": "...", "es": "..." },
  "primera_imatge": { "src": "img/hero.jpg", "size": 85 },
  "imatges": [ { "src": "img/1.jpg", "size": 60 }, { "src": "img/2.jpg" } ]
}
```

---

## 5) Renderizado
### 5.1 Menú lateral
`renderProjectMenu()` itera sobre `getVisibleProjects()` y crea botones que hacen scroll a cada sección (`scrollToProject(slug)`).

### 5.2 Secciones de proyecto
`renderProjects()` crea (o reutiliza) `.projects-wrapper`, la limpia y renderiza **todos** los proyectos visibles en `home.json`.  
A los que no pasan el filtro de autor les añade `.hidden`.  
Cada sección incluye:
- **Hero** con `makeMediaFrame()` (imagen, escala `--scale`, ratio `--ratio`).
- **Info textual** (`.project-info` con título, detalles y texto).
- **Galería** (`.media-group` con `makeMediaFrame()` por imagen).

### 5.3 Actualizaciones sin re-render
- `updateProjectsContent()` cambia textos/alt/escala al cambiar de idioma.
- `updateProjectsVisibility()` añade/quita `.hidden` (se usaba para filtro de autor).

---

## 6) Utilidades clave
### 6.1 `makeMediaFrame(src, alt, scalePercent=100)`
Crea `<div.media-frame><img.media-image/></div>`, aplica `--scale` (0.01–1) en el `<img>` y, al cargar, setea en el frame `--natural-w` y `--ratio`.

### 6.2 `scrollToProject(slug)`
`scrollIntoView({ behavior: "smooth", block: "start" })` para llevar al inicio de la sección.

---

## 7) Comentarios rápidos (para revisar más tarde)
1. **Fallbacks de idioma:** usar `??` para caídas a `"cat"` si falta una clave en otro idioma.  
2. **Robustez de `fetch`:** envolver cada descarga en `try/catch` para no bloquear todo por un fallo individual.  
3. **Accesibilidad:** `aria-controls` en botones de menú; `aria-label` y focos correctos.  
4. **Performance:** bien separadas tareas: re-render inicial vs. actualizaciones puntuales (idioma/visibilidad).  
5. **CSS variables:** buen uso de `--scale`, `--ratio`, `--natural-w` para layout responsivo.  
6. **Clase `.hidden`:** confirmar comportamiento (display/opacity) y si queremos animaciones al mostrar/ocultar.

---

## 8) Eliminación del filtro por autor (lo que conviene simplificar)
Para retirar la lógica de autores:
- Quitar `activeAuthor` y `authorButtons` del estado/DOM.
- Simplificar `getVisibleProjects()` a un simple `return getVisibleProjectsFromHome();`.
- Eliminar `updateProjectsVisibility()` y todas sus llamadas.
- En `setupEventListeners()`, eliminar todo el bloque del **Selector de autores**.
- En `index.html`, reemplazar el botón de autor por un botón **About**.

(Abajo propongo cambios concretos de código.)

---

## 9) About deslizante (nuevo comportamiento del botón)
- **Desktop:** panel sale desde la derecha y ocupa el área equivalente a un `project-section`.
- **Móvil:** panel sale desde abajo y ocupa el alto de un `project-section` (p. ej., 80–100% del viewport).  
- JS: un `toggleAbout()` que añade/quita `.open` a `#about-panel`.  
- CSS: transiciones `transform` y `z-index` alto para que no lo tape el contenido.

---

## 10) Bug en móvil (el menú “desaparece” al navegar)
Probable conflicto de **capas/z-index**: los `.project-section` o su wrapper podrían estar por encima del `#sidebar` en móvil.  
Medidas recomendadas:
- Asegurar `#sidebar { z-index: 20 }` y **posición** (`position: fixed` o `sticky`) según tu layout.
- Asegurar que `#projects-container` y `.project-section` tengan `z-index` inferior (p. ej. `1`) y `position: relative`.
- Añadir `scroll-margin-top` (o `scroll-padding-top` en el contenedor) si hay elementos “stickies” que se solapan al hacer scroll a un ancla/section.
- Evitar `position: fixed` innecesario en secciones de proyecto.

(Abajo incluyo CSS sugerido.)

---

## 11) Hoja de ruta propuesta
1) **Eliminar filtro por autor** (JS + HTML).  
2) **Añadir panel About** (HTML + JS + CSS de transición).  
3) **Arreglar overlay/z-index en móvil** (CSS; revisar `position` + `z-index`).  
4) **Añadir fallbacks de idioma** (opcional).  
5) **Robustez de descargas** (opcional `try/catch` por proyecto).  
6) **Accesibilidad** (opcional: labels, focus trapping en About).

---

## 12) Cambios de código sugeridos (resumen)
- **index.html:** cambiar el botón de autor por un botón `about`, añadir `<section id="about-panel">` con un botón de cerrar.  
- **app.js:** quitar toda la lógica de autores y añadir `toggleAbout()`.  
- **styles.css:** añadir bloque `.about-panel` con slide-in desde derecha (desktop) y desde abajo (móvil), y reforzar `z-index` del sidebar.


---

## 13) To‑do / pendientes de revisión

### A. Limpieza y mantenimiento CSS
- [ ] Eliminar bloque mínimo duplicado de `.about-panel` y conservar la versión avanzada.
- [ ] Mover `font-display` dentro de `@font-face` o eliminarlo del bloque `html`.
- [ ] Añadir estilos `:focus-visible` para accesibilidad.
- [ ] Asegurar fondo heredado en `#sidebar` móvil.
- [ ] Aumentar `z-index` de `.about-panel` por encima del sidebar.
- [ ] Respetar `prefers-reduced-motion` (quitar transiciones largas y smooth scroll).
- [ ] Revisar colores de fondo y legibilidad en todos los modos.

### B. Mejoras en `app.js`
- [ ] Añadir `aria-controls`, `aria-expanded` y `aria-hidden` al panel About.
- [ ] Bloquear scroll del body cuando el About esté abierto.
- [ ] Permitir cierre del About con tecla `Esc`.
- [ ] Incluir fallback de color seguro en `updateSidebarColor()`.
- [ ] Añadir `try/catch` a las descargas de proyectos.
- [ ] Revisar `onerror` de imágenes (usar placeholder o ruta válida).
- [ ] Añadir fallback de idioma con `??` al pasar textos.

### C. Accesibilidad y navegación
- [ ] Añadir `aria-current="true"` al botón del proyecto visible (usar `IntersectionObserver`).
- [ ] Verificar orden de tabulación entre menú y proyectos.
- [ ] Comprobar contraste de colores en textos y botones.

### D. Revisión responsive y UX
- [ ] Revisar `position` y `z-index` en móvil para evitar que el menú quede oculto.
- [ ] Comprobar transiciones del About en móvil (slide‑up) y escritorio (slide‑in right).
- [ ] Verificar alturas relativas (`100dvh - sidebar`) al navegar entre proyectos.
- [ ] Confirmar que `scroll-margin-top` evita que el contenido quede detrás del sidebar.
- [ ] Revisar visualización del foco en botones del menú lateral.

### E. Próximos pasos generales
- [ ] Eliminar definitivamente la lógica de autores.
- [ ] Añadir placeholder para imágenes faltantes.
- [ ] Documentar comportamiento de About y fallback de idiomas en esta guía.
- [ ] Testear rendimiento y smoothness en móvil (scroll + transiciones).
- [ ] Hacer revisión final de accesibilidad (WCAG básicas).
