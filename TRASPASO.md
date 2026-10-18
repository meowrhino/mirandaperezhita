# Traspaso: la versión nueva a la copia de Miranda

Miranda ya tiene su copia, `mirandaphc/web`, que publica `mirandaperezhita.com`
con GitHub Pages (*legacy*: sirve los ficheros de `main` tal cual). La edita poco
(sus últimos cambios, "cambios manu" y el `CNAME`, en marzo de 2026). Es la
versión de antes: `data/home.json` + un `data/<slug>.json` por proyecto, las
fotos en `images/`; el contenido lo pinta el JS y Google ve la página vacía.

**Su contenido y el nuestro eran iguales** el 2026-10-18 (en el nuestro, además,
tres erratas arregladas: "gràáfica", "desblegableB" y "Carla Boserma"). Lo que
haya cambiado desde entonces hay que traerlo antes.

La nueva la publica su Cloudflare con Workers Builds; el DNS de
`mirandaperezhita.com` ya está en Cloudflare (apuntando a GitHub Pages). En su
copia la Action de publicar no corre (lleva `if: github.repository_owner ==
'meowrhino'`) y el build, al no estar en GitHub, publica en la raíz con el `url`
de `site.json`. Nosotros solo podemos leer su repo.

Tiempo: unos 30 minutos, y un rato con ella: **cambia cómo edita** (de un JSON por
proyecto en `data/` a una carpeta por proyecto con sus fotos). Hablarlo antes.

## Antes

- [ ] `main` de meowrhino al día y sin cambios a medias (`git status` limpio).
- [ ] ¿Ha tocado algo Miranda desde el 2026-10-18 (su último commit, `5c62034`, es de marzo)?
      `gh api repos/mirandaphc/web/commits --jq '.[0:3][] | .sha[0:7]+" "+.commit.message'`.
      Si sí, pasar sus cambios aquí antes: `data/home.json` → `data/site.json` (`lists`);
      `data/<slug>.json` → `projects/<slug>/project.json`, sus fotos a `projects/<slug>/img/`
      numeradas (la de arriba, `1.webp`).
- [ ] El DNS de `mirandaperezhita.com` está en Cloudflare (`*.ns.cloudflare.com`). Mirar **en
      qué cuenta**: tiene que ser la de Miranda.
- [ ] Que nos dé permiso de escribir en `mirandaphc/web` (Settings → Collaborators →
      `meowrhino`, *Write*), o hacer los pasos 1 y 3 desde su cuenta.

## 1. La versión nueva, en una rama de su copia

Se sube a una rama aparte para que su web siga igual mientras se prepara Cloudflare:

- [ ] `git push https://github.com/mirandaphc/web.git main:receta`

## 2. Cloudflare (con Miranda, en su cuenta)

- [ ] **Workers & Pages → Create → Import a repository** → `mirandaphc/web`, rama de
      producción **`receta`**. Lo demás lo lee de `wrangler.jsonc` (instala sharp con
      `npm install`, build `node build/build.mjs`, sale `dist/`).
- [ ] Mirar la web en su `*.workers.dev`: la portada, el cambio CAT/ES, el about y un proyecto
      (`/ejercicios/`: abre la web en ese proyecto).
- [ ] **Settings → Domains & Routes → Add → Custom domain**: `mirandaperezhita.com` (y `www`).
      Cloudflare cambia los registros que apuntaban a GitHub Pages.

## 3. `main` pasa a ser la versión nueva

- [ ] Guardar la de antes: `git push https://github.com/mirandaphc/web.git <sha-de-su-main>:refs/heads/antes`.
- [ ] `git push --force-with-lease=main:<sha-de-su-main> https://github.com/mirandaphc/web.git main`
      (desde nuestra `main`).
- [ ] En Cloudflare, rama de producción → **`main`**. Borrar la rama `receta`.
- [ ] Miranda, en su repo: Settings → Pages → **Unpublish site** (ya no sirve nada).

## 4. Que nos deje entrar en Cloudflare

- [ ] Manage account → Members → nos invita. Ahí se ve el error entero de un build que falla.

## 5. Comprobar en su dominio

- [ ] La portada, `/ejercicios/`, un enlace de antes (`/#carnaval`) y el about.
- [ ] `view-source:` de un proyecto: el título, el texto y las fotos están en el HTML (antes, vacío).
- [ ] `view-source:`: `canonical` y `og:url` con `mirandaperezhita.com`, y **sin**
      `<meta name="robots" content="noindex">`.
- [ ] `/robots.txt` dice `Allow` y `/sitemap.xml` tiene las direcciones de su dominio.
- [ ] Compartir un proyecto por WhatsApp: sale su foto (la og).

## 6. Search Console, con su cuenta de Google

- [ ] Dar de alta el dominio (el registro TXT, en el DNS de Cloudflare) y enviar `sitemap.xml`.

## 7. Miranda en su ordenador

Con ella delante, siguiendo [GUIA.md](GUIA.md):

- [ ] Clona **su** repositorio, no el de meowrhino (si ya lo tenía, **Sincronizar**: la
      estructura cambia entera).
- [ ] Live Server: **Go Live** y ve la vista previa.
- [ ] Un cambio pequeño (una coma en el about), Confirmar → Sincronizar, y la bolita verde.

## 8. Al acabar

- [ ] Fila de mirandaperezhita en `JAMstack/inventario.md` con las dos direcciones.
