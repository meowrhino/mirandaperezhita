// Estado global
let homeData = null;
let projectsData = {};
let activeLanguage = "cat";
let activeAuthor = null;
let aboutData = null;

// Elementos del DOM
const sidebar = document.getElementById("sidebar");
const projectMenu = document.getElementById("project-menu");
const projectsContainer = document.getElementById("projects-container");
const langButtons = document.querySelectorAll(".lang-btn");
const authorButtons = document.querySelectorAll('.author-btn[data-author]');
const aboutToggle = document.getElementById("about-toggle");
const aboutPanel = document.getElementById("about-panel");

// Inicializar la aplicación
async function init() {
  try {
    // Cargar home.json
    const homeResponse = await fetch("data/home.json");
    homeData = await homeResponse.json();

    // Cargar about.json
    await loadAbout();

    // Actualizar color de fondo del sidebar
    updateSidebarColor();

    // Cargar proyectos visibles
    const visibleProjects = getVisibleProjectsFromHome();
    await loadProjects(visibleProjects);

    // Renderizar interfaz
    renderProjectMenu();
    renderProjects();

    // Configurar event listeners
    setupEventListeners();
  } catch (error) {
    console.error("Error al cargar datos:", error);
  }
}
// Cargar about.json (formato: { "texto": ["párrafo 1", "párrafo 2", ...] })
async function loadAbout() {
  try {
    const res = await fetch('data/about.json');
    if (!res.ok) return; // opcional: no bloquear si no existe
    aboutData = await res.json();
    renderAbout();
  } catch (e) {
    // silencioso: si no existe o falla, lo veremos más adelante
  }
}

// Renderizar contenido del About desde aboutData
function renderAbout() {
  if (!aboutPanel) return;
  aboutPanel.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'about-content';

  const h2 = document.createElement('h2');
  h2.textContent = 'About';
  wrap.appendChild(h2);

  const textos = Array.isArray(aboutData?.texto) ? aboutData.texto : [];
  textos.forEach(t => {
    const p = document.createElement('p');
    p.innerHTML = formatInline(t); // soporta **, *, __, [texto](url)
    wrap.appendChild(p);
  });

  aboutPanel.appendChild(wrap);
}

// Conversión mínima de marcadores a HTML: **negrita**, *cursiva*, __subrayado__, [texto](url)
function formatInline(s = '') {
  // Escapar básico de < y & para evitar inyección, luego aplicar reemplazos controlados
  let out = String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  // links [texto](url)
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1<\/a>');
  // **bold**
  out = out.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1<\/strong>');
  // __underline__
  out = out.replace(/__([\s\S]+?)__/g, '<u>$1<\/u>');
  // *italic*
  out = out.replace(/(^|[^\*])\*([^\*][\s\S]*?)\*(?!\*)/g, '$1<em>$2<\/em>');
  return out;
}

// Obtener proyectos visibles del home.json
function getVisibleProjectsFromHome() {
  return homeData.projectes_visibles.filter(
    (p) => p.visible === true || p.visible === "si"
  );
}

// Cargar todos los proyectos
async function loadProjects(visibleProjects) {
  const promises = visibleProjects.map(async (project) => {
    const response = await fetch(`data/${project.slug}.json`);
    const data = await response.json();
    projectsData[project.slug] = data;
  });

  await Promise.all(promises);
}

// Utilidad: crea un contenedor "hueco" (media-frame) con una imagen centrada y escalada 1–100
function makeMediaFrame(src, altText, scalePercent = 100) {
  const frame = document.createElement('div');
  frame.className = 'media-frame';

  const img = document.createElement('img');
  img.className = 'media-image';
  img.src = src;
  img.alt = altText || '';
  img.loading = 'lazy';
  img.onerror = () => {
    img.src = 'images/reference/pasted_file_KN2lG4_MacBookAir-1.png';
  };

  // Normalizar y aplicar escala (1–100)
  let s = parseInt(scalePercent, 10);
  if (isNaN(s)) s = 100; // por defecto 100
  s = Math.max(1, Math.min(100, s));
  img.style.setProperty('--scale', (s / 100).toString());

  // Al cargar, fijar variables del hueco desde el tamaño natural
  img.addEventListener('load', () => {
    const w = img.naturalWidth || 1;
    const h = img.naturalHeight || 1;
    frame.style.setProperty('--natural-w', w + 'px');
    frame.style.setProperty('--ratio', `${w} / ${h}`);
  });

  frame.appendChild(img);
  return frame;
}

// Actualizar color de fondo del sidebar
function updateSidebarColor() {
  const color = homeData.home_colors[activeLanguage];
  document.body.style.backgroundColor = color;
  if (sidebar) sidebar.style.backgroundColor = color; // sincroniza el fondo del sidebar en móvil y desktop
}

// Renderizar menú de navegación
function renderProjectMenu() {
  const visibleProjects = getVisibleProjects();

  projectMenu.innerHTML = "";

  visibleProjects.forEach((project) => {
    const projectData = projectsData[project.slug];
    if (!projectData) return;

    const button = document.createElement("button");
    button.className = "project-link";
    button.textContent = projectData.titol[activeLanguage];
    button.onclick = () => scrollToProject(project.slug);

    projectMenu.appendChild(button);
  });
}

// Renderizar proyectos
function renderProjects() {
  const allProjects = getVisibleProjectsFromHome();
  const visibleProjects = getVisibleProjects();
  const visibleSlugs = visibleProjects.map((p) => p.slug);

  // Crear wrapper si no existe
  let wrapper = projectsContainer.querySelector(".projects-wrapper");
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.className = "projects-wrapper";
    projectsContainer.appendChild(wrapper);
  }

  // Limpiar contenedor
  wrapper.innerHTML = "";

  // Renderizar todos los proyectos
  allProjects.forEach((project) => {
    const projectData = projectsData[project.slug];
    if (!projectData) return;

    const section = document.createElement("section");
    section.className = "project-section";
    section.id = `project-${project.slug}`;
    section.style.backgroundColor = project.color;

    // Ocultar si no está en la lista de visibles
    if (!visibleSlugs.includes(project.slug)) {
      section.classList.add("hidden");
    }

    const content = document.createElement("div");
    content.className = "project-content";

    // Imagen principal (usa el mismo sistema genérico que la galería)
    const heroScale = projectData.primera_imatge?.size ?? 100;
    const hero = makeMediaFrame(
      projectData.primera_imatge.src,
      projectData.titol[activeLanguage],
      heroScale
    );
    hero.classList.add('hero');
    content.appendChild(hero);

    // Información del proyecto
    const info = document.createElement("div");
    info.className = "project-info";

    const title = document.createElement("h2");
    title.className = "project-title";
    title.textContent = projectData.titol[activeLanguage];

    const details = document.createElement("div");
    details.className = "project-details";

    const client = document.createElement("p");
    client.className = "project-detail";
    client.textContent = projectData.client[activeLanguage];

    const lloc = document.createElement("p");
    lloc.className = "project-detail";
    lloc.textContent = projectData.lloc[activeLanguage];

    const data = document.createElement("p");
    data.className = "project-detail";
    data.textContent = projectData.data;

    const text = document.createElement("p");
    text.className = "project-text";
    text.textContent = projectData.text[activeLanguage];

    details.appendChild(client);
    details.appendChild(lloc);
    details.appendChild(data);

    info.appendChild(title);
    info.appendChild(details);
    info.appendChild(text);

    content.appendChild(info);

    // Galería de imágenes (después de la info)
    const gallery = document.createElement('div');
    gallery.className = 'media-group';

    const images = Array.isArray(projectData.imatges)
      ? projectData.imatges
      : [];

    images.forEach((imgMeta) => {
      if (!imgMeta || !imgMeta.src) return;
      const item = makeMediaFrame(
        imgMeta.src,
        projectData.titol[activeLanguage] || '',
        imgMeta.size
      );
      gallery.appendChild(item);
    });

    content.appendChild(gallery);

    section.appendChild(content);

    wrapper.appendChild(section);
  });
}

// Obtener proyectos visibles según filtros activos
function getVisibleProjects() {
  let visible = getVisibleProjectsFromHome();

  if (activeAuthor) {
    visible = visible.filter((p) => p.autor === activeAuthor);
  }

  return visible;
}

// Scroll suave a un proyecto
function scrollToProject(slug) {
  const element = document.getElementById(`project-${slug}`);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// Configurar event listeners
function setupEventListeners() {
  // Selector de idioma
  langButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;

      // Actualizar botones activos
      langButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Cambiar idioma
      activeLanguage = lang;
      updateSidebarColor();
      renderProjectMenu();
      updateProjectsContent();
    });
  });

  // Selector de autores
  authorButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const author = btn.dataset.author;

      if (activeAuthor === author) {
        // Desactivar autor
        activeAuthor = null;
        btn.classList.remove("active");
      } else {
        // Activar nuevo autor
        authorButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        activeAuthor = author;
      }

      // Actualizar vista
      renderProjectMenu();
      updateProjectsVisibility();
    });
  });

  if (aboutToggle && aboutPanel) {
    aboutToggle.addEventListener('click', () => {
      const isOpen = aboutPanel.classList.toggle('open');
      aboutPanel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    });
  }
}

// Actualizar contenido de proyectos (sin recrear el DOM completo)
function updateProjectsContent() {
  const allProjects = getVisibleProjectsFromHome();

  allProjects.forEach((project) => {
    const projectData = projectsData[project.slug];
    if (!projectData) return;

    const section = document.getElementById(`project-${project.slug}`);
    if (!section) return;

    // Actualizar textos
    const title = section.querySelector(".project-title");
    const client = section.querySelectorAll(".project-detail")[0];
    const lloc = section.querySelectorAll(".project-detail")[1];
    const text = section.querySelector(".project-text");
    const img = section.querySelector('.media-frame.hero .media-image');
    if (title) title.textContent = projectData.titol[activeLanguage];
    if (client) client.textContent = projectData.client[activeLanguage];
    if (lloc) lloc.textContent = projectData.lloc[activeLanguage];
    if (text) text.textContent = projectData.text[activeLanguage];
    if (img) {
      // alt + escala
      img.alt = projectData.titol[activeLanguage];
      let heroScale = parseInt(projectData.primera_imatge?.size, 10);
      if (isNaN(heroScale)) heroScale = 100;
      heroScale = Math.max(1, Math.min(100, heroScale));
      img.style.setProperty('--scale', (heroScale / 100).toString());

      // asegurar variables del contenedor si no están
      const hero = section.querySelector('.media-frame.hero');
      if (hero && !hero.style.getPropertyValue('--ratio')) {
        const setVars = () => {
          const w = img.naturalWidth || 1;
          const h = img.naturalHeight || 1;
          hero.style.setProperty('--natural-w', w + 'px');
          hero.style.setProperty('--ratio', `${w} / ${h}`);
        };
        if (img.complete) setVars(); else img.addEventListener('load', setVars, { once: true });
      }
    }

    // Actualizar alts de la galería
    const gallery = section.querySelector('.media-group');
    if (gallery) {
      gallery.querySelectorAll("img").forEach((gimg) => {
        gimg.alt = projectData.titol[activeLanguage] || "";
      });
    }
  });
}

// Actualizar visibilidad de proyectos
function updateProjectsVisibility() {
  const visibleProjects = getVisibleProjects();
  const visibleSlugs = visibleProjects.map((p) => p.slug);

  const allSections = document.querySelectorAll(".project-section");
  allSections.forEach((section) => {
    const slug = section.id.replace("project-", "");
    if (visibleSlugs.includes(slug)) {
      section.classList.remove("hidden");
    } else {
      section.classList.add("hidden");
    }
  });
}

// Iniciar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", init);
