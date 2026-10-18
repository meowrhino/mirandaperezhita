# Guía de la web

> **Regla de oro: solo se tocan `data/` y `projects/`.** Lo demás es el código.

## Qué hay

```
data/site.json             el nombre, el dominio, los colores y qué proyectos salen, en qué orden
data/about.json            el texto del about
data/about/                la foto del about (1.webp)
projects/<nombre>/         un proyecto, una carpeta:
  project.json               su título, para quién, el año, el texto y qué fotos van
  img/                       sus fotos: 1.webp, 2.webp…
```

El **nombre de la carpeta** es también el de la dirección: `projects/carnaval/` →
`mirandaperezhita.com/carnaval/`. Letras sin acentos ni ñ, números y guiones. Mejor no
cambiarlo una vez publicado: rompería los enlaces que ya circulan.

## La primera vez: preparar VS Code

Solo se hace una vez.

1. En VS Code: **Archivo → Nueva ventana** y, en la bienvenida, **Clonar repositorio Git…** →
   **Clonar desde GitHub**. Entra con tu cuenta, elige tu repositorio y una carpeta.
2. Al abrirla, VS Code propone instalar **Live Server** (abajo a la derecha): **Instalar**.
3. Abajo a la derecha sale **Go Live**: es la vista previa.

**VS Code te ayuda con los campos**: si pasas el ratón por encima de uno (`"title"`, `"photos"`…)
te dice qué es, y si escribes uno mal o pones algo que no toca, lo subraya en rojo. Para ver
qué campos puedes poner, dentro de las llaves pulsa **Ctrl+Espacio**. Lo sabe por la primera
línea de cada JSON (`"$schema": …`): **no la borres**.

## Añadir un proyecto, paso a paso

1. **Copia una carpeta** de `projects/` y ponle el nombre nuevo: `projects/carnaval/` →
   `projects/nuevo/`. Borra sus fotos de `img/`.
2. **Las fotos**: pásalas por [imgToWeb](https://meowrhino.github.io/imgToWeb/), **en Chrome o
   Firefox** (Safari no sabe hacer `.webp`). Salen numeradas (`1.webp`, `2.webp`…) en el orden en
   que las arrastras: ponlas en `img/`. La `1` es la de arriba.
3. **Los textos**: abre `project.json` y cambia lo que toque (los campos, abajo).
4. **En la web**: en `data/site.json`, en `lists` → `projects`, añade
   `{ "project": "nuevo", "color": "#BB6464" }` en el sitio donde quieras que salga.
5. **Go Live** para verlo, y después **Subir los cambios**.

**Esconder un proyecto** sin borrarlo: en su línea de `data/site.json`, añade `"visible": false`.

## Los campos de un proyecto (`project.json`)

| campo | qué hace |
|---|---|
| `title` | el título. Si cambia con el idioma: `{ "ca": "…", "es": "…" }`. `*cursiva*` con asteriscos |
| `client` | para quién, igual que el título |
| `year` | el año, entre comillas: `"2025"` |
| `text` | el texto, un párrafo por línea, en los dos idiomas: `{ "ca": ["…", "…"], "es": ["…", "…"] }` |
| `cover` | la foto de arriba: `"1"`. También es la que sale al compartir el enlace |
| `photos` | las de debajo del texto, en orden: `["2", "3", "4"]` |

Una foto **más pequeña**: en vez de `"3"`, `{ "photo": "3", "size": 80 }` (del 1 al 100; 100 es
el tamaño normal).

En el texto: `**negrita**`, `*cursiva*`, `__subrayado__` y `[un enlace](https://…)`. Para
pasar un texto largo a la lista de párrafos, [formateador.html](formateador.html) (ábrelo con
Go Live).

## Lo de `data/site.json`

| campo | qué hace |
|---|---|
| `title` | el nombre de la web |
| `background` | el color de la columna de la izquierda, en cada idioma: `{ "ca": "#F9F8F6", "es": "#EFECE3" }` |
| `threshold` | del 0 al 100: a partir de qué claridad el texto de un proyecto va más oscuro. Con 0, todos |
| `lists` → `projects` | los proyectos, en orden, cada uno con su `color` de fondo |

## Verlo antes de subirlo

**Go Live** abajo a la derecha de VS Code. Se abre la web en el navegador y se refresca sola
cada vez que guardas. Si hay algo que no se publicaría (una coma, un campo mal escrito), sale
en pantalla, y dice dónde.

## Subir los cambios

1. Pestaña **Control de código fuente** (las tres bolitas unidas, a la izquierda).
2. Escribe qué has hecho (`proyecto nuevo: nuevo`) y **Confirmar** (*Commit*). Si pregunta si
   quieres añadir todos los cambios: **Sí**.
3. **Sincronizar cambios** (*Sync*).
4. En un par de minutos está en la web.

**Antes de empezar a tocar**, dale también a **Sincronizar**, para bajar lo que haya cambiado.

## Si no se publica

La web no se rompe: se queda como estaba hasta que se arregla. El mensaje dice el fichero y
qué pasa (en la vista previa sale en pantalla):

- **"no es un JSON válido, línea 12"** → casi siempre **una coma**: que falta entre dos cosas,
  o que sobra después de la última. O unas comillas sin cerrar.
- **"\"titol\" no es un campo de aquí (¿mal escrito?). Los que hay: title, client…"** → un
  campo mal escrito: cópialo de la lista que sale en el mensaje.
- **"no encuentro projects/nuevo/img/4.webp"** → `photos` dice una foto que no está en `img/`.
- **"\"lists\" dice \"nuevo\", y no hay ningún projects/nuevo/project.json"** → el nombre de la
  lista y el de la carpeta no son iguales.
