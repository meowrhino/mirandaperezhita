# Próximos pasos

## 1. Seguimiento del proyecto activo (desktop y móvil)
- Revisar por qué `monica-planes` se queda sin marcar en móvil: probablemente el `IntersectionObserver` deja de considerarlo visible al acercarse al final; probar un cálculo complementario con el punto medio del contenedor para elegir la sección más cercana.
- En escritorio el menú no se actualiza: añadir un `scroll` listener sobre `#projects-container` (y `window` en móvil) que, con `requestAnimationFrame`, evalúe el proyecto más cercano cuando cambie la posición; usarlo como fallback ligero si el observer no dispara.
- Unificar ambos caminos en una función `updateActiveProjectFromScroll()` reutilizable que se llame desde el observer y desde el fallback para evitar duplicar lógica.
- Una vez detectado el slug activo, llamar a `setActiveProject(slug, { scrollIntoView: false })` y solo hacer scroll horizontal del menú si realmente se navega con un click.

## 2. Color del texto en botones (azul en iOS)
- Los botones (`.lang-btn`, `.project-link`) heredan el azul por defecto de Safari móvil; fijar explícitamente `color: inherit` (o un color calculado) y añadir `-webkit-appearance: none;` para eliminar estilos nativos.
- Validar que los estados `:hover`, `:focus-visible` y `.active` mantienen la misma paleta tras el cambio.

## 3. Cálculo dinámico de color de texto según project color
- Leer `nota_de_curt` global (`0–100`) desde `homeData` y normalizarla como `threshold = nota_de_curt / 100`.
- Para cada proyecto en `projectes_visibles`:
  1. Parsear `color` (hex de 3 o 6 dígitos) con `hexToRgb` → `{ r, g, b }`.
  2. Calcular un “tono” (`tone`) del color con un helper `getTone(r, g, b)`. Podemos usar luminancia relativa (`0.2126*r + 0.7152*g + 0.0722*b`) y dividir por 255 para obtener un resultado 0–1.
  3. Determinar `nota_de_curt` individual: `project.nota_de_curt = tone >= threshold`.
  4. Mezclar el color con negro o blanco (50%) usando `mixRgb(original, target, factor)`:
     - Si `nota_de_curt` es `false` (oscuro) → mezclar con negro `[0,0,0]`.
     - Si es `true` (claro) → mezclar con blanco `[255,255,255]`.
  5. Convertir la mezcla a hex con `rgbToHex` y guardarla en `project.color_texto`.
- Ejecutar esta lógica justo después de cargar `home.json`, de modo que `projectsData` y los botones reciban ya `color_texto` listo para usar.
- Mantener funciones puras (`hexToRgb`, `rgbToHex`, `mixRgb`, `getTone`) para poder moverlas fácilmente a una GitHub Action en el futuro si se desea precalcular y guardar el resultado en JSON.

## 4. Validación final
- Test manual en escritorio: scroll, cambio de idioma, selección por click.
- Test manual en móvil (o simulador): scroll continuo, menú horizontal auto centrado, color de botones corregido.
- Medir que no haya regresiones de rendimiento (sin recalcular colores en cada frame, sin observers repetidos).
