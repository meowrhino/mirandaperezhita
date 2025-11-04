# Próximos pasos

## 1. Repasar navegación móvil
- Investigar por qué el bloque superior (idiomas + cabecera) se desplaza o “crece” al hacer scroll en iOS; revisar padding dinámico, `scrollIntoView` del menú horizontal y la interacción con la barra del navegador.
- Revisar rendimiento/fluidez al cargar: medir repaints y observar si los cálculos de mezcla o los observers están bloqueando la renderización en móviles.
- Verificar que el favicon/navicon se muestra correctamente en todos los dispositivos (desktop + iOS + Android).

## 2. Panel About (iteración pendiente)
- Ajustar layout para centrar vertical y horizontalmente el cuerpo del texto dentro del overlay.
- Sustituir el botón actual por una “x” simple que no parezca botón; reposicionarlo en la esquina superior izquierda con márgenes `safe-area`.
- Añadir el footer con `web: meowrhino` centrado a ~5dvh del borde inferior.
- Bloquear el scroll principal (`body`/`projects-container`) mientras el About esté abierto.

## 3. Sistema de color dinámico
- Lógica actual: desde el color base se mezcla al 50% con negro (si es claro) o con blanco (si es oscuro) para obtener `color_texto`, y se repite la mezcla sobre ese resultado para `color_texto_proyecto`.
- Pendiente decidir si se ajustan factores (50/75%) o si se precalcula en build/GitHub Action.

## 4. Validación final
- Test manual en escritorio: scroll, cambio de idioma, apertura/cierre del About, menú horizontal.
- Test manual en móvil real: comprobar sticky + animaciones, centrar automático del menú horizontal, overlay del About, cierre con ESC/botón y bloqueo de scroll.
