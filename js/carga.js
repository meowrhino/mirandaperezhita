// Lee el contenido (data/site.json, data/about.json, projects/<slug>/project.json)
// y lo pasa a la forma de antes con house.js.
//
// Las páginas que escribe el build llevan data-built en <html>. Sin él es la
// vista previa (Live Server, sin build): cada JSON se revisa con su esquema
// (schema/) como hace el build, y lo que esté mal sale en pantalla.

import { entriesOf, toOld } from "./house.js";
import { leerJSON, validar } from "./validar.js";
import { fetchWithRetry } from "./state.js";

export const BUILT = document.documentElement.hasAttribute("data-built");

async function get(path) {
  // en la vista previa, sin reintentos: si no está, se dice ya
  const res = await fetchWithRetry(path, { cache: BUILT ? "default" : "no-store" }, BUILT ? undefined : 0)
    .catch((e) => { if (!BUILT) showErrors([`no encuentro ${path}`]); throw e; });
  try { return leerJSON(await res.text(), path); } catch (e) { showErrors([e.message]); throw e; }
}

async function checked(path, type) {
  const data = await get(path);
  if (!BUILT) {
    const errors = validar(data, await get(`schema/${type}.json`), path);
    if (errors.length) { showErrors(errors); throw new Error(errors.join("\n")); }
  }
  return data;
}

export function showErrors(errors) {
  let box = document.getElementById("errores-vista-previa");
  if (!box) {
    box = document.createElement("pre");
    box.id = "errores-vista-previa";
    box.style.cssText = "position:fixed;inset:0;z-index:99999;margin:0;padding:2rem;overflow:auto;white-space:pre-wrap;"
      + "background:#fff;color:#000;font:15px/1.5 monospace;";
    box.textContent = "esto no se publicaría:\n\n";
    document.body.append(box);
  }
  box.textContent += errors.map((e) => `✗ ${e}`).join("\n") + "\n\narréglalo, guarda, y la página se recarga sola.\n";
}

export async function loadData() {
  const [site, about] = await Promise.all([checked("data/site.json", "site"), checked("data/about.json", "about")]);
  const projects = Object.fromEntries(await Promise.all(
    entriesOf(site).map(async ({ project }) => [project, await checked(`projects/${project}/project.json`, "project")])
  ));
  // las medidas de cada imagen las escribe el build (en la vista previa, el JS las mide al cargar)
  const sizes = BUILT ? await get("data/sizes.json").catch(() => ({})) : {};
  return toOld(site, about, projects, sizes);
}
