/* house.js — la forma de la casa (data/site.json, data/about.json,
   projects/<slug>/project.json) → la de antes (home.json, about.json y
   data/<slug>.json), que es la que pinta el JS. La usan js/carga.js y el
   build. No toca el disco.

   sizes: { "projects/x/img/1.webp": { w, h } }, lo que mide el build (en la
   vista previa no hay: el JS mide cada imagen al cargarla, como antes). */

export const entriesOf = (site) => site.lists.projects.map((e) => ({ visible: true, ...e }));

const lang = (v) => (typeof v === 'string' ? { cat: v, es: v } : { cat: v.ca, es: v.es ?? v.ca });

// "3" → projects/<slug>/img/3.webp; { "photo": "3", "size": 80 } → lo mismo, al 80 %
export const photoSrc = (dir, p) => `${dir}/${typeof p === 'string' ? p : p.photo}.webp`;
const image = (dir, p, sizes) => {
  const src = photoSrc(dir, p);
  return { src, size: String(p.size ?? 100), ...sizes?.[src] };
};

export function projectOld(slug, p, sizes) {
  const dir = `projects/${slug}/img`;
  return {
    slug,
    primera_imatge: image(dir, p.cover, sizes),
    titol: { ...lang(p.title), link: '' },
    client: { ...lang(p.client), link: '' },
    data: p.year,
    text: { cat: p.text.ca, es: p.text.es ?? p.text.ca },
    imatges: p.photos.map((ph) => image(dir, ph, sizes)),
  };
}

export function toOld(site, about, projects, sizes) {
  return {
    homeData: {
      home_colors: { cat: site.background.ca, es: site.background.es ?? site.background.ca },
      nota_de_curt: site.threshold ?? 50,
      projectes_visibles: entriesOf(site).map((e) => ({ slug: e.project, color: e.color, visible: e.visible })),
    },
    aboutData: {
      text: { cat: about.text.ca, es: about.text.es ?? about.text.ca },
      imatges: about.photos.map((ph) => image('data/about', ph, sizes)),
    },
    projectsData: Object.fromEntries(Object.entries(projects).map(([slug, p]) => [slug, projectOld(slug, p, sizes)])),
  };
}
