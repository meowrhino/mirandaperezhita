// Estado global
let homeData = null;
let projectsData = {};
let activeLanguage = "cat";
let aboutData = null;
let activeProjectSlug = null;
let projectObserver = null;
let scrollSyncRoot = null;
let scrollSyncFrame = null;
let scrollSyncTargets = [];
let homeProjectsBySlug = new Map();

const PASSIVE_SCROLL_OPTIONS = { passive: true };
const DEFAULT_TEXT_COLOR = '#000000';

// Elementos del DOM
const sidebar = document.getElementById("sidebar");
const projectMenu = document.getElementById("project-menu");
const projectsContainer = document.getElementById("projects-container");
const langButtons = document.querySelectorAll(".lang-btn");
const aboutToggle = document.getElementById("about-toggle");
const aboutPanel = document.getElementById("about-panel");

function updateStickyOffset() {
  if (!sidebar) return;
  const h = sidebar.offsetHeight || 0;
  document.documentElement.style.setProperty('--sidebar-h', h + 'px');
}

function debounce(fn, delay = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// Inicializar la aplicación
async function init() {
  try {
    // Cargar home.json
    const homeResponse = await fetch("data/home.json");
    homeData = await homeResponse.json();
    prepareProjectColorData();

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

    updateStickyOffset();

    const handleLayoutChange = debounce(() => {
      updateStickyOffset();
      setupProjectObserver();
    }, 150);

    window.addEventListener('resize', handleLayoutChange);
    window.addEventListener('load', () => {
      updateStickyOffset();
      setupProjectObserver();
    });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleLayoutChange);
      window.visualViewport.addEventListener('scroll', handleLayoutChange);
    }

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
  h2.textContent = 'miranda perez hita';
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

// Devuelve el texto en el idioma activo con fallback a catalán y primer valor disponible
function getLocalizedText(source, lang = activeLanguage) {
  if (!source) return '';
  if (typeof source === 'string') return source;
  if (typeof source === 'object') {
    if (typeof source[lang] === 'string') return source[lang];
    if (typeof source.cat === 'string') return source.cat;
    const first = Object.values(source).find((value) => typeof value === 'string' && value.trim());
    return first || '';
  }
  return '';
}

function prepareProjectColorData() {
  homeProjectsBySlug = new Map();
  const projects = Array.isArray(homeData?.projectes_visibles) ? homeData.projectes_visibles : [];
  const globalCurtRaw = Number.isFinite(homeData?.nota_de_curt) ? homeData.nota_de_curt : 50;
  const threshold = clamp01(globalCurtRaw / 100);

  projects.forEach((project) => {
    if (!project || typeof project.slug !== 'string') return;
    const rgb = hexToRgb(project.color);
    if (!rgb) {
      project.nota_de_curt = false;
      project.color_texto = DEFAULT_TEXT_COLOR;
      project.color_texto_proyecto = DEFAULT_TEXT_COLOR;
      homeProjectsBySlug.set(project.slug, project);
      return;
    }

    const tone = getTone(rgb);
    const isLight = tone >= threshold;
    project.nota_de_curt = isLight;

    // Si el color es claro, mezclamos con negro para tener más contraste; si es oscuro, mezclamos con blanco.
    const targetRgb = isLight ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
    const targetRgbForNav = targetRgb;
    const mixedForNav = mixRgb(rgb, targetRgbForNav, 0.5);
    const navHex = rgbToHex(mixedForNav);
    project.color_texto = navHex;

    const navRgb = hexToRgb(navHex);
    const mixedForProject = navRgb
      ? mixRgb(navRgb, targetRgb, 0.5)
      : mixRgb(rgb, targetRgb, 0.75);
    project.color_texto_proyecto = rgbToHex(mixedForProject);

    homeProjectsBySlug.set(project.slug, project);
  });
}

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let value = hex.trim();
  if (value.startsWith('#')) value = value.slice(1);
  if (!(value.length === 3 || value.length === 6)) return null;
  if (value.length === 3) {
    value = value.split('').map((ch) => ch + ch).join('');
  }
  const int = parseInt(value, 16);
  if (Number.isNaN(int)) return null;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return { r, g, b };
}

function rgbToHex({ r, g, b }) {
  const clampByte = (n) => {
    if (!Number.isFinite(n)) return 0;
    return Math.min(255, Math.max(0, Math.round(n)));
  };
  const toHex = (n) => clampByte(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixRgb(base, target, factor = 0.5) {
  const f = clamp01(factor);
  const inv = 1 - f;
  return {
    r: base.r * inv + target.r * f,
    g: base.g * inv + target.g * f,
    b: base.b * inv + target.b * f
  };
}

function getTone({ r, g, b }) {
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return clamp01(luminance / 255);
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function getProjectMeta(slug) {
  if (!slug) return null;
  if (homeProjectsBySlug instanceof Map && homeProjectsBySlug.size) {
    return homeProjectsBySlug.get(slug) || null;
  }
  if (Array.isArray(homeData?.projectes_visibles)) {
    return homeData.projectes_visibles.find((p) => p.slug === slug) || null;
  }
  return null;
}

function applyNavColorForSlug(slug) {
  const meta = getProjectMeta(slug);
  const navColor = meta?.color_texto || DEFAULT_TEXT_COLOR;
  document.documentElement.style.setProperty('--active-project-text-color', navColor);
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
    try {
      const response = await fetch(`data/${project.slug}.json`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      projectsData[project.slug] = data;
    } catch (err) {
      console.warn('No se pudo cargar', project.slug, err);
    }
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
  const colors = homeData?.home_colors || {};
  const color = colors[activeLanguage] ?? colors.cat ?? '#ffffff';
  document.documentElement.style.setProperty('--home-bg-color', color);
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
    button.dataset.slug = project.slug;
    if (project.color_texto) {
      button.dataset.textColor = project.color_texto;
    } else {
      delete button.dataset.textColor;
    }
    const title = getLocalizedText(projectData.titol);
    button.textContent = title || project.slug;
    button.onclick = () => scrollToProject(project.slug);

    projectMenu.appendChild(button);
  });

  const fallbackSlug = activeProjectSlug ?? (visibleProjects[0]?.slug ?? null);
  if (fallbackSlug) {
    setActiveProject(fallbackSlug, { scrollIntoView: false });
  }
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
    section.dataset.slug = project.slug;
    section.style.backgroundColor = project.color;
    if (typeof project.nota_de_curt !== 'undefined') {
      section.dataset.notaCurt = String(Boolean(project.nota_de_curt));
    } else {
      delete section.dataset.notaCurt;
    }
    const sectionTextColor = project.color_texto_proyecto || project.color_texto || DEFAULT_TEXT_COLOR;
    section.dataset.textColor = sectionTextColor;
    section.style.setProperty('--project-text-color', sectionTextColor);
    section.style.color = sectionTextColor;

    // Ocultar si no está en la lista de visibles
    if (!visibleSlugs.includes(project.slug)) {
      section.classList.add("hidden");
    }

    const content = document.createElement("div");
    content.className = "project-content";
    const projectTitle = getLocalizedText(projectData.titol);

    // Imagen principal (usa el mismo sistema genérico que la galería)
    const heroMeta = projectData.primera_imatge;
    if (heroMeta?.src) {
      const heroScale = heroMeta.size ?? 100;
      const hero = makeMediaFrame(
        heroMeta.src,
        projectTitle,
        heroScale
      );
      hero.classList.add('hero');
      content.appendChild(hero);
    }

    // Información del proyecto (mínima): todo en mismos estilos
    const info = document.createElement("div");
    info.className = "project-info";

    // Primera línea: [título], [cliente], [año] (usando siempre titol, client, data desde projectData)
    const firstP = document.createElement("p");
    firstP.className = "project-text";
    let clientVal = "";
    if (typeof projectData.client === "object" && projectData.client !== null) {
      clientVal = getLocalizedText(projectData.client);
    } else if (typeof projectData.client === "string") {
      clientVal = projectData.client;
    }
    const year = (projectData.data || "").toString();
    firstP.textContent = [
      projectTitle,
      clientVal,
      year
    ].filter(Boolean).join(", ");
    info.appendChild(firstP);

    // Resto de descripción: textos[] (array de párrafos). Fallback a text[lang]
    const hasTextos = Array.isArray(projectData.textos) && projectData.textos.length;
    const fallbackText = projectData.text ? getLocalizedText(projectData.text) : '';
    const paragraphs = hasTextos
      ? projectData.textos
      : (fallbackText ? [fallbackText] : []);

    paragraphs.forEach((p) => {
      const para = document.createElement("p");
      para.className = "project-text";
      para.innerHTML = formatInline(p).replace(/\n/g, "<br>");
      info.appendChild(para);
    });

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
        projectTitle,
        imgMeta.size
      );
      gallery.appendChild(item);
    });

    content.appendChild(gallery);

    section.appendChild(content);

    wrapper.appendChild(section);
  });

  if (!activeProjectSlug && visibleProjects.length) {
    activeProjectSlug = visibleProjects[0].slug;
  }

  if (activeProjectSlug) {
    setActiveProject(activeProjectSlug, { scrollIntoView: false });
  }

  setupProjectObserver();
}

// Obtener proyectos visibles (por ahora sin filtros adicionales)
function getVisibleProjects() {
  return getVisibleProjectsFromHome();
}

// Scroll suave a un proyecto
function scrollToProject(slug) {
  const element = document.getElementById(`project-${slug}`);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveProject(slug);
  }
}

function setActiveProject(slug, options = {}) {
  if (!slug) return;
  const { scrollIntoView = true, forceScroll = false } = options;

  if (!projectMenu) {
    activeProjectSlug = slug;
    applyNavColorForSlug(slug);
    return;
  }

  const buttons = Array.from(projectMenu.querySelectorAll(".project-link"));
  if (!buttons.length) {
    activeProjectSlug = slug;
    applyNavColorForSlug(slug);
    return;
  }

  let targetSlug = slug;
  let activeButton = buttons.find((btn) => btn.dataset.slug === slug) || null;

  if (!activeButton && buttons.length) {
    activeButton = buttons[0];
    targetSlug = activeButton.dataset.slug || slug;
  }

  const slugChanged = activeProjectSlug !== targetSlug;

  if (!slugChanged && !forceScroll && !scrollIntoView) {
    applyNavColorForSlug(targetSlug);
    return;
  }

  buttons.forEach((btn) => {
    const isActive = btn.dataset.slug === targetSlug;
    btn.classList.toggle("active", isActive);
    if (isActive) {
      btn.setAttribute("aria-current", "true");
    } else {
      btn.removeAttribute("aria-current");
    }
  });

  activeProjectSlug = targetSlug;
  applyNavColorForSlug(targetSlug);

  if (activeButton && (forceScroll || (scrollIntoView && slugChanged))) {
    const shouldScrollMenu = projectMenu.scrollWidth > projectMenu.clientWidth;
    if (shouldScrollMenu) {
      activeButton.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center"
      });
    }
  }
}

function cleanupScrollSync() {
  if (scrollSyncFrame !== null) {
    cancelAnimationFrame(scrollSyncFrame);
    scrollSyncFrame = null;
  }
  if (scrollSyncTargets.length) {
    scrollSyncTargets.forEach((target) => {
      target.removeEventListener('scroll', onScrollSync, PASSIVE_SCROLL_OPTIONS);
    });
    scrollSyncTargets = [];
  }
  scrollSyncRoot = null;
}

function setupScrollSync(root) {
  cleanupScrollSync();

  scrollSyncRoot = root ?? null;

  if (root && typeof root.addEventListener === 'function') {
    root.addEventListener('scroll', onScrollSync, PASSIVE_SCROLL_OPTIONS);
    scrollSyncTargets.push(root);
  } else {
    window.addEventListener('scroll', onScrollSync, PASSIVE_SCROLL_OPTIONS);
    scrollSyncTargets.push(window);
  }
}

function onScrollSync() {
  if (scrollSyncFrame !== null) return;
  scrollSyncFrame = requestAnimationFrame(() => {
    scrollSyncFrame = null;
    updateActiveProjectFromScroll(scrollSyncRoot);
  });
}

function updateActiveProjectFromScroll(root) {
  if (!projectsContainer) return;
  const sections = Array.from(projectsContainer.querySelectorAll(".project-section:not(.hidden)"));
  if (!sections.length) return;

  const rootRect = root ? root.getBoundingClientRect() : null;
  const viewTop = rootRect ? rootRect.top : 0;
  const viewBottom = rootRect ? rootRect.bottom : window.innerHeight || document.documentElement.clientHeight;
  const viewCenter = rootRect
    ? (rootRect.top + rootRect.bottom) / 2
    : (window.innerHeight || document.documentElement.clientHeight) / 2;

  let bestSlug = null;
  let bestDistance = Infinity;

  sections.forEach((section) => {
    if (section.classList.contains('hidden')) return;
    const rect = section.getBoundingClientRect();
    const intersectionTop = Math.max(rect.top, viewTop);
    const intersectionBottom = Math.min(rect.bottom, viewBottom);
    const visible = intersectionBottom > intersectionTop;
    if (!visible) return;

    const sectionCenter = rect.top + rect.height / 2;
    const distance = Math.abs(sectionCenter - viewCenter);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestSlug = section.dataset.slug || section.id.replace("project-", "");
    }
  });

  if (bestSlug) {
    setActiveProject(bestSlug, { scrollIntoView: true });
  }
}

function isScrollableContainer(element) {
  if (!element) return false;
  const style = getComputedStyle(element);
  const overflowY = style.overflowY || '';
  const overflow = style.overflow || '';
  const scrollValues = ['auto', 'scroll', 'overlay'];
  const hasScrollStyle = scrollValues.some((val) => overflowY.includes(val) || overflow.includes(val));
  if (!hasScrollStyle) return false;
  return Math.ceil(element.scrollHeight) > Math.ceil(element.clientHeight);
}

function setupProjectObserver() {
  if (!projectsContainer) return;

  if (projectObserver) {
    projectObserver.disconnect();
  }

  const sections = projectsContainer.querySelectorAll(".project-section:not(.hidden)");
  if (!sections.length) {
    cleanupScrollSync();
    return;
  }

  let observerRoot = null;
  try {
    if (isScrollableContainer(projectsContainer)) {
      observerRoot = projectsContainer;
    }
  } catch (_) {
    observerRoot = null;
  }

  setupScrollSync(observerRoot);
  updateActiveProjectFromScroll(observerRoot);

  projectObserver = new IntersectionObserver((entries) => {
    const visibleEntries = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

    if (visibleEntries.length) {
      const slug = visibleEntries[0].target.dataset.slug;
      if (slug && slug !== activeProjectSlug) {
        setActiveProject(slug, { scrollIntoView: false });
      }
    }
  }, {
    root: observerRoot,
    rootMargin: '0px 0px -40% 0px',
    threshold: [0.25, 0.5, 0.75],
  });

  sections.forEach((section) => {
    if (!section.dataset.slug) {
      section.dataset.slug = section.id.replace("project-", "");
    }
    projectObserver.observe(section);
  });
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
      updateStickyOffset();
    });
  });

  if (aboutToggle && aboutPanel) {
    const toggleAbout = () => {
      const isOpen = aboutPanel.classList.toggle('open');
      aboutPanel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      aboutToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    };

    aboutToggle.setAttribute('aria-expanded', 'false');
    aboutToggle.addEventListener('click', toggleAbout);

    const handleEscClose = (event) => {
      if (event.key === 'Escape' && aboutPanel.classList.contains('open')) {
        aboutPanel.classList.remove('open');
        aboutPanel.setAttribute('aria-hidden', 'true');
        aboutToggle.setAttribute('aria-expanded', 'false');
        aboutToggle.focus();
      }
    };

    document.addEventListener('keydown', handleEscClose);
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

    if (typeof project.nota_de_curt !== 'undefined') {
      section.dataset.notaCurt = String(Boolean(project.nota_de_curt));
    } else {
      delete section.dataset.notaCurt;
    }

    const sectionTextColor = project.color_texto_proyecto || project.color_texto || DEFAULT_TEXT_COLOR;
    section.dataset.textColor = sectionTextColor;
    section.style.setProperty('--project-text-color', sectionTextColor);
    section.style.color = sectionTextColor;

    // Actualizar textos (mínimo): reconstruir los párrafos dentro de .project-info
    const info = section.querySelector(".project-info");
    if (info) {
      // Limpia todo el contenido de info y vuelve a crearlo con el formato minimal
      while (info.firstChild) info.removeChild(info.firstChild);

      const firstP = document.createElement("p");
      firstP.className = "project-text";
      let clientVal = "";
      if (typeof projectData.client === "object" && projectData.client !== null) {
        clientVal = getLocalizedText(projectData.client);
      } else if (typeof projectData.client === "string") {
        clientVal = projectData.client;
      }
      const year = (projectData.data || "").toString();
      firstP.textContent = [
        getLocalizedText(projectData.titol),
        clientVal,
        year
      ].filter(Boolean).join(", ");
      info.appendChild(firstP);

      const hasTextos = Array.isArray(projectData.textos) && projectData.textos.length;
      const fallbackText = projectData.text ? getLocalizedText(projectData.text) : '';
      const paragraphs = hasTextos
        ? projectData.textos
        : (fallbackText ? [fallbackText] : []);

      paragraphs.forEach((p) => {
        const para = document.createElement("p");
        para.className = "project-text";
        para.innerHTML = formatInline(p).replace(/\n/g, "<br>");
        info.appendChild(para);
      });
    }
    const img = section.querySelector('.media-frame.hero .media-image');
    if (img) {
      // alt + escala
      img.alt = getLocalizedText(projectData.titol);
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
        gimg.alt = getLocalizedText(projectData.titol) || "";
      });
    }
  });
}

// Iniciar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", init);
