# mirandaperezhita

El portfolio de Miranda Pérez-Hita, diseñadora gráfica: una sola página con los proyectos uno
detrás de otro, el menú a la izquierda (se marca el que se ve) y el about encima. En catalán y
castellano. Hecho por [meowrhino.studio](https://meowrhino.studio) con la receta del estudio
([meowrhino/JAMstack](https://github.com/meowrhino/JAMstack)). Para Miranda: [GUIA.md](GUIA.md).
Traspaso: [TRASPASO.md](TRASPASO.md). Si el build falla: [CLAUDE.md](CLAUDE.md).

```
mirandaperezhita/
├── data/site.json          # nombre, dominio, colores; "lists": qué proyectos salen, en orden, con su color
├── data/about.json         # el about (su foto en data/about/)
├── projects/<slug>/        # un proyecto: project.json + img/1.webp, 2.webp… (la 1, la de arriba)
├── schema/                 # qué campos lleva cada JSON (VS Code, el build y la vista previa)
├── index.html              # la página (plantilla del build, y la vista previa con Live Server)
├── build/build.mjs         # → dist/: la página con el contenido dentro y una por proyecto
├── js/carga.js             # lee los JSON y los pasa a la forma de antes (js/house.js)
├── js/house.js             # la forma de la casa → la de antes (la usan carga.js y el build)
├── js/validar.js           # el JSON Schema sin dependencias (de JAMstack)
├── js/                     # main, about, scroll-sync, colors, media, i18n, markdown, state
├── fonts/                  # EB Garamond en woff2 (sin Google Fonts)
└── formateador.html        # pasa un texto largo a la lista de párrafos del JSON
```

## Cómo funciona

- **El build** (`npm ci && node build/build.mjs`) escribe la página con todo el contenido en
  catalán dentro (menú, proyectos, about), y `/<slug>/` por proyecto: la misma página con el
  title, la description, la og:image (1200×630, **sharp**, en `.cache/`) y el canonical de ese
  proyecto, que se abre en él. Mide cada foto (`data/sizes.json` en `dist/`) para que no salte
  nada al cargar. Al cargar, el JS vuelve a pintar lo mismo, en el idioma guardado.
- **Las direcciones**: al bajar, la barra de direcciones va diciendo `/<slug>/` (en la vista
  previa, `#<slug>`, como antes). Los enlaces de antes (`/#carnaval`) siguen valiendo, también
  `#cosas-de-señoras`, que ahora es `cosas-de-senoras`.
- **El idioma** (CAT/ES) sigue en `localStorage`: no hay una dirección por idioma.
- **Los colores**: el de cada proyecto, en `lists`; el del texto lo calcula `js/colors.js`
  (más oscuro o más claro según `threshold`).
- **Vista previa**: Live Server sobre la carpeta. Sin `data-built` en `<html>`, `js/carga.js`
  revisa los JSON con `schema/` y enseña en pantalla lo que pararía el build.
- **Publicar**: nuestra copia, con la Action en `meowrhino.github.io/mirandaperezhita/` sin
  indexar; la de Miranda, con Workers Builds (`wrangler.jsonc`) en su dominio. Si falla, un issue.
