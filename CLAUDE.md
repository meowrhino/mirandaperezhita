# mirandaperezhita, para Claude

El portfolio de Miranda Pérez-Hita, hecho por meowrhino con la receta del estudio
([meowrhino/JAMstack](https://github.com/meowrhino/JAMstack)). Con manu se
habla en castellano, y lo de Miranda (`GUIA.md`, los mensajes del build)
también. Cómo está hecha: [README.md](README.md).

## Si el build falla (la web no se ha publicado)

Cuando falla, la web se queda como estaba. Para arreglarlo:

1. **El error**, en uno de estos sitios:
   - En nuestra copia (`meowrhino/mirandaperezhita`), la Action abre un issue con la
     etiqueta `build` y el mensaje dentro: `gh issue list --label build` y
     `gh issue view <n>`. El registro entero: `gh run list -L 3` y
     `gh run view <id> --log-failed`.
   - En la copia de Miranda (Workers Builds, en su Cloudflare), el registro está
     en su Cloudflare. No hace falta ir: el paso 2 da el mismo mensaje.
2. **Reprodúcelo aquí**: `npm ci && node build/build.mjs`. Es el mismo build que
   en la nube y dice lo mismo: cada línea con ✗ trae el fichero y qué pasa.
3. **Arréglalo donde dice**, casi siempre en `data/site.json`, `data/about.json`
   o en `projects/<nombre>/project.json`:
   - "no es un JSON válido, línea 12": una coma de más o de menos, o unas
     comillas sin cerrar, en esa línea o la de antes.
   - "\"x\" no es un campo de aquí (¿mal escrito?)" o "tiene que ser…": no cuadra con
     su esquema (`schema/`). El mensaje dice qué campos hay o cómo tiene que
     ser; se arregla el dato, no el esquema.
   - "no encuentro projects/<slug>/img/x.webp": una imagen que el JSON nombra y
     no está en `img/` (o con otro nombre: mayúsculas, espacios). Pregunta si falta subirla; si no, quítala de la lista y
     dilo.
   - "\"lists\" dice \"x\", y no hay ningún projects/x/project.json": el nombre de
     la lista y el de la carpeta no son iguales.
4. **Comprueba**: `node build/build.mjs` sin ✗ (los ⚠ no paran nada).

No cambies el build, `js/house.js`, `js/carga.js` ni el resto del JS para que pase: si el dato
está bien y el build se queja, es un fallo del build, y hay que decírselo a
manu. No borres fotos ni proyectos.

Commit y push solo cuando te lo pidan: mensaje en castellano diciendo qué se
arregla. Al publicarse, la Action cierra el issue sola.
