/* ============================================================
   build.mjs — data/ + projects/ + index.html (la plantilla) → dist/, la
   web tal cual se publica.        node build/build.mjs

   La web es una sola página con todos los proyectos uno detrás de otro.
   El build la escribe con el contenido dentro (en catalán: el menú, cada
   proyecto con su texto y sus fotos, y el about), para que Google y
   WhatsApp la lean sin JS; al cargar, el JS de siempre vuelve a pintar lo
   mismo (en el idioma guardado). Y una página por proyecto, /<slug>/: la
   misma web, con el title, la description, la og:image y el canonical de
   ese proyecto, que se abre en él. Antes era #<slug>, que sigue valiendo.

   Si algo está mal (una coma, un campo mal escrito, una foto que no está)
   para y dice qué, y no se publica nada: la web se queda como estaba.
   ============================================================ */

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { entriesOf, photoSrc, toOld } from '../js/house.js';
import { leerJSON, validar } from '../js/validar.js';
import { escapeHtml, formatInline, formatTitleText } from '../js/markdown.js';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const OUT = join(ROOT, 'dist');
const at = (...p) => join(ROOT, ...p);
const fail = (msg) => { console.error(`\n✗ ${msg}\n\nNo se ha publicado nada: la web sigue como estaba.\n`); process.exit(1); };

/* ---------- leer y revisar ---------- */

const read = (rel) => {
  if (!existsSync(at(rel))) fail(`no encuentro ${rel}`);
  try { return leerJSON(readFileSync(at(rel), 'utf8'), rel); } catch (e) { fail(e.message); }
};
const schema = (t) => JSON.parse(readFileSync(at('schema', `${t}.json`), 'utf8'));
const site = read('data/site.json');
const about = read('data/about.json');
const errors = [...validar(site, schema('site'), 'data/site.json'), ...validar(about, schema('about'), 'data/about.json')];
const entries = errors.length ? [] : entriesOf(site);
const projects = {};
const images = errors.length ? [] : about.photos.map((p) => photoSrc('data/about', p));
for (const { project: slug } of entries) {
  const rel = `projects/${slug}/project.json`;
  if (projects[slug]) { errors.push(`data/site.json: "${slug}" está dos veces en "lists"`); continue; }
  if (!existsSync(at(rel))) { errors.push(`data/site.json: "lists" dice "${slug}", y no hay ningún ${rel}`); continue; }
  const p = projects[slug] = read(rel);
  const before = errors.length;
  errors.push(...validar(p, schema('project'), rel));
  if (errors.length === before) images.push(...[p.cover, ...p.photos].map((ph) => photoSrc(`projects/${slug}/img`, ph)));
}
for (const src of images) if (!existsSync(at(src))) errors.push(`no encuentro ${src}`);
if (errors.length) fail(errors.join('\n✗ '));

/* Dónde se publica, según dónde se construye (JAMstack, patrones §5): en la
   Action de GitHub (nuestra copia), meowrhino.github.io/<repo>/ y sin
   indexar; en cualquier otro sitio (Cloudflare, en la copia de Miranda), la
   raíz con el dominio de site.json → "url", y se indexa si lo hay. */
const github = process.env.GITHUB_ACTIONS === 'true';
const [owner, repo] = (process.env.GITHUB_REPOSITORY || '/').split('/');
const BASE = github ? `/${repo}` : '';
const SITE = github ? `https://${owner}.github.io${BASE}` : String(site.url || '').replace(/\/+$/, '');
const INDEX = !github && !!site.url;

/* ---------- con sharp: las medidas de cada foto y la imagen al compartir ---------- */

let sharp = null;
try { sharp = (await import('sharp')).default; } catch (e) {
  console.warn(`⚠ sin sharp (${e.code || e.message}): al compartir sale la foto tal cual. Se arregla con: npm ci`);
}
const sizes = {};
for (const src of sharp ? images : []) {
  try { const m = await sharp(at(src)).metadata(); sizes[src] = { w: m.width, h: m.height }; } catch (e) {
    console.warn(`⚠ ${src}: sharp no la puede leer (${e.message})`);
  }
}
const data = toOld(site, about, projects, sizes);
const ogs = new Map();
const ogSources = [['home', data.aboutData.imatges[0].src], ...entries.map((e) => [e.project, data.projectsData[e.project].primera_imatge.src])];
for (const [key, src] of sharp ? ogSources : []) {
  const cached = at('.cache', 'og', `${key}.jpg`);
  try {
    if (!(existsSync(cached) && statSync(cached).mtimeMs >= statSync(at(src)).mtimeMs)) {
      mkdirSync(dirname(cached), { recursive: true });
      await sharp(at(src)).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 85, mozjpeg: true }).toFile(cached);
    }
    ogs.set(key, cached);
  } catch (e) {
    console.warn(`⚠ ${src}: sharp no la puede leer (${e.message}); al compartir sale tal cual`);
  }
}
const ogUrl = (key, src) => (ogs.has(key) ? `${SITE}/og/${key}.jpg` : `${SITE}/${src}`);

/* Los colores del texto los calcula js/colors.js a partir del de cada proyecto.
   shortcut: state.js busca el DOM al cargarse, así que se le da uno vacío. */
globalThis.document ??= { getElementById: () => null, querySelectorAll: () => [] };
const { state } = await import('../js/state.js');
const { prepareProjectColorData } = await import('../js/colors.js');
state.homeData = data.homeData;
prepareProjectColorData();
const meta = (slug) => state.homeProjectsBySlug.get(slug);

/* ---------- el contenido, como lo pinta el JS (en catalán) ---------- */

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = (s) => String(s || '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_]{1,2}/g, '').replace(/\s+/g, ' ').trim();
const cut = (s) => (s.length <= 160 ? s : s.slice(0, 157).trimEnd() + '…');
const sr = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap';
const visible = entries.filter((e) => e.visible);

function frame(im, alt, { hero = false, eager = false } = {}) {
  const scale = Math.max(1, Math.min(100, parseInt(im.size, 10) || 100)) / 100;
  const ratio = im.w ? ` style="--natural-w:${im.w}px;--ratio:${im.w} / ${im.h}"` : '';
  return `<div class="media-frame${hero ? ' hero' : ''}"${ratio}><img class="media-image" src="${esc(im.src)}" alt="${esc(alt)}"`
    + ` loading="${eager ? 'eager' : 'lazy'}"${eager ? ' fetchpriority="high"' : ''} decoding="async" style="--scale:${scale}"></div>`;
}

function section({ project: slug, color }, i) {
  const p = data.projectsData[slug];
  const text = meta(slug)?.color_texto_proyecto || '#000000';
  const info = [formatTitleText(p.titol.cat), escapeHtml(p.client.cat), escapeHtml(p.data)].filter(Boolean).join(', ');
  return `<section class="project-section" id="project-${esc(slug)}" data-slug="${esc(slug)}" style="background-color:${color};--project-text-color:${text};color:${text}">`
    + `<div class="project-content">${frame(p.primera_imatge, plain(p.titol.cat), { hero: true, eager: i === 0 })}`
    + `<div class="project-info"><p class="project-text">${info}</p>${p.text.cat.map((t) => `<p class="project-text">${formatInline(t).replace(/\n/g, '<br>')}</p>`).join('')}</div>`
    + `<div class="media-group">${p.imatges.map((im) => frame(im, '')).join('')}</div></div></section>`;
}

const menu = visible.map((e, i) => `<button class="project-link${i ? '' : ' active'}" data-slug="${esc(e.project)}">${formatTitleText(data.projectsData[e.project].titol.cat)}</button>`).join('');
const sections = `<div class="projects-wrapper">${visible.map(section).join('')}</div>`;
const aboutHtml = '<button class="about-close" type="button" aria-label="Tancar" title="Tancar">&times;</button>'
  + `<div class="about-content"><div class="about-body">${data.aboutData.imatges.map((im) => frame(im, 'about')).join('')}`
  + `${data.aboutData.text.cat.map((t) => `<p>${formatInline(t)}</p>`).join('')}</div>`
  + '<div class="about-footer"><a href="https://meowrhino.studio" target="_blank" rel="noopener noreferrer">meowrhino.studio</a></div></div>';
// lo que leen Google y los lectores de pantalla: el título y un enlace a cada proyecto (el menú son botones)
const nav = visible.map((e) => `<a href="${encodeURIComponent(e.project)}/">${esc(plain(data.projectsData[e.project].titol.cat))}</a>`).join(' ');

/* ---------- las páginas ---------- */

function swap(html, find, replace, file = 'index.html') {
  if (!find.test(html)) fail(`no encuentro ${find} en ${file}: el build lo necesita para escribir las páginas.`);
  return html.replace(find, replace);
}
const setAttr = (html, re, value) => swap(html, re, (_, a, b) => `${a}${esc(value)}${b}`);
const TEMPLATE = readFileSync(at('index.html'), 'utf8');

function page({ slug = null, title, desc, url, image, robots }) {
  const first = slug || visible[0]?.project;
  let html = swap(TEMPLATE, /<html lang="ca">/, `<html lang="ca" data-built style="--home-bg-color:${site.background.ca};--active-project-text-color:${meta(first)?.color_texto || '#000000'}">`);
  html = swap(html, /(<meta charset="UTF-8">)/, `$1\n    <base href="${BASE}/">\n    <meta name="robots" content="${robots || (INDEX ? 'index,follow' : 'noindex')}">`
    + (slug ? `\n    <script>window.__SLUG__ = ${JSON.stringify(slug)};</script>` : ''));
  html = swap(html, /<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  html = setAttr(html, /(<meta name="description" content=")[^"]*(")/, desc);
  html = setAttr(html, /(<link rel="canonical" href=")[^"]*(")/, url);
  for (const k of ['og:title', 'og:description', 'og:url', 'og:image']) {
    html = setAttr(html, new RegExp(`(<meta property="${k}" content=")[^"]*(")`), { 'og:title': title, 'og:description': desc, 'og:url': url, 'og:image': image }[k]);
  }
  html = setAttr(html, /(<meta name="twitter:title" content=")[^"]*(")/, title);
  html = setAttr(html, /(<meta name="twitter:description" content=")[^"]*(")/, desc);
  html = swap(html, /(<body>)/, `$1\n    <div style="${sr}"><h1>${esc(title)}</h1><nav><a href="./">${esc(site.title)}</a> ${nav}</nav></div>`);
  html = swap(html, /(<nav id="project-menu" class="sidebar-bottom">)[\s\S]*?(<\/nav>)/, `$1${menu}$2`);
  html = swap(html, /(<main id="projects-container">)[\s\S]*?(<\/main>)/, `$1${sections}$2`);
  return swap(html, /(<section id="about-panel" class="about-panel" aria-hidden="true">)[\s\S]*?(<\/section>)/, `$1${aboutHtml}$2`);
}

const homeDesc = (/<meta name="description" content="([^"]*)"/.exec(TEMPLATE) || [])[1] || site.title;
const home = { title: site.title, desc: homeDesc, url: `${SITE}/`, image: ogUrl('home', data.aboutData.imatges[0].src) };

/* ---------- escribir dist/ ---------- */

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const f of ['css', 'js', 'fonts', 'data', 'projects', 'navicon.ico', 'formateador.html']) cpSync(at(f), join(OUT, f), { recursive: true, filter: (x) => !x.endsWith('.DS_Store') });
writeFileSync(join(OUT, 'data', 'sizes.json'), JSON.stringify(sizes));
mkdirSync(join(OUT, 'og'), { recursive: true });
for (const [key, cached] of ogs) cpSync(cached, join(OUT, 'og', `${key}.jpg`));
writeFileSync(join(OUT, 'index.html'), page(home));
writeFileSync(join(OUT, '404.html'), page({ ...home, robots: 'noindex' }));
for (const e of entries) {
  const p = data.projectsData[e.project];
  const title = `${plain(p.titol.cat)} — ${site.title}`;
  mkdirSync(join(OUT, e.project), { recursive: true });
  writeFileSync(join(OUT, e.project, 'index.html'), page({
    slug: e.project, title, desc: cut(plain(p.text.cat[0]) || title), url: `${SITE}/${encodeURIComponent(e.project)}/`,
    image: ogUrl(e.project, p.primera_imatge.src), robots: e.visible ? null : 'noindex',
  }));
}
const urls = [`${SITE}/`, ...visible.map((e) => `${SITE}/${encodeURIComponent(e.project)}/`)];
writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`);
writeFileSync(join(OUT, 'robots.txt'), INDEX ? `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n');
writeFileSync(join(OUT, '.nojekyll'), '');

console.log(`✓ dist/: la web y ${entries.length} proyectos${INDEX ? ` · se indexa (${SITE})` : ' · sin indexar'}`);
