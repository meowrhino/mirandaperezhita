// Punto de entrada: init, render de menú/proyectos y event listeners.
import {
  state,
  sidebar,
  projectMenu,
  projectsContainer,
  langButtons,
  aboutToggle,
  aboutPanel,
  PASSIVE_SCROLL_OPTIONS,
  DEFAULT_TEXT_COLOR,
} from "./state.js";
import { loadData } from "./carga.js";
import { prepareProjectColorData } from "./colors.js";
import { getLocalizedText, getLocalizedParagraphs } from "./i18n.js";
import { formatInline, escapeHtml, formatTitleText } from "./markdown.js";
import { makeMediaFrame, bindRatioVars } from "./media.js";
import { loadAbout, renderAbout, setAboutOpen } from "./about.js";
import {
  setActiveProject,
  scrollToProject,
  setupProjectScrollSync,
  cleanupScrollSync,
  cancelScrollCorrection,
  getSlugFromHash,
  getElementOffsetInContainer,
} from "./scroll-sync.js";

let sidebarHeightObserver = null;
let lastSidebarHeight = 0;
let escCloseHandler = null;

// OPTIMIZADO: Calcular altura del sidebar solo cuando es necesario (no en scroll)
function setupSidebarHeight() {
  // Limpiar observer anterior si existe
  if (sidebarHeightObserver) {
    sidebarHeightObserver.disconnect();
  }

  applySidebarHeight();
  if (window.innerWidth >= 768 || !sidebar) return;

  // Observar cambios futuros (ej: cambio de idioma)
  if ("ResizeObserver" in window) {
    sidebarHeightObserver = new ResizeObserver(
      debounce(() => {
        applySidebarHeight();
      }, 100)
    );

    sidebarHeightObserver.observe(sidebar);
  }
}

function applySidebarHeight() {
  // Solo en móvil
  if (window.innerWidth >= 768 || !sidebar) {
    document.documentElement.style.removeProperty("--sidebar-actual-height");
    lastSidebarHeight = 0;
    return;
  }

  const height = sidebar.offsetHeight;
  // Solo actualizar si el cambio es significativo (>5px) - Mejora #4
  if (Math.abs(height - lastSidebarHeight) > 5) {
    lastSidebarHeight = height;
    document.documentElement.style.setProperty(
      "--sidebar-actual-height",
      `${height}px`
    );
  }
}

function debounce(fn, delay = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function updateSafeAreaVars() {
  const root = document.documentElement;
  if (!root) return;
  const vv = window.visualViewport;
  if (!vv) {
    root.style.setProperty("--safe-top", "0px");
    root.style.setProperty("--safe-bottom", "0px");
    root.style.setProperty("--safe-left", "0px");
    root.style.setProperty("--safe-right", "0px");
    return;
  }
  const top = Math.max(0, vv.offsetTop || 0);
  const left = Math.max(0, vv.offsetLeft || 0);
  const bottom = Math.max(
    0,
    (window.innerHeight || 0) - vv.height - vv.offsetTop
  );
  const right = Math.max(
    0,
    (window.innerWidth || 0) - vv.width - vv.offsetLeft
  );
  root.style.setProperty("--safe-top", `${Math.round(top)}px`);
  root.style.setProperty("--safe-bottom", `${Math.round(bottom)}px`);
  root.style.setProperty("--safe-left", `${Math.round(left)}px`);
  root.style.setProperty("--safe-right", `${Math.round(right)}px`);
}

// Restaurar el idioma guardado en localStorage (si existe) antes del primer render
function restoreLanguage() {
  let saved = null;
  try {
    saved = localStorage.getItem("activeLanguage");
  } catch (_) {
    saved = null;
  }
  if (saved === "cat" || saved === "es") {
    state.activeLanguage = saved;
  }
  document.documentElement.lang = state.activeLanguage === "es" ? "es" : "ca";
  langButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === state.activeLanguage);
  });
}

// Inicializar la aplicación
async function init() {
  try {
    restoreLanguage();

    // Cargar los datos (js/carga.js: data/, projects/ → la forma de antes)
    const data = await loadData();
    state.homeData = data.homeData;
    state.projectsData = data.projectsData;
    prepareProjectColorData();

    loadAbout(data.aboutData);

    // Actualizar color de fondo del sidebar
    updateSidebarColor();

    // Guardar hash inicial antes de que renderProjectMenu lo sobreescriba
    // (en la web construida, /<slug>/ dice el proyecto: window.__SLUG__)
    const initialHashSlug = getSlugFromHash() ?? window.__SLUG__ ?? null;

    // Renderizar interfaz
    renderProjectMenu();
    renderProjects();

    // Navegar al proyecto del hash inicial (solo si no es el primer proyecto)
    const hashSlug = initialHashSlug;
    if (hashSlug && hashSlug !== state.firstProjectSlug && document.getElementById(`project-${hashSlug}`)) {
      // Desactivar smooth scroll temporalmente para saltar sin animación
      projectsContainer.style.scrollBehavior = "auto";
      requestAnimationFrame(() => {
        const el = document.getElementById(`project-${hashSlug}`);
        if (!el || !projectsContainer) return;
        const offset = getElementOffsetInContainer(el, projectsContainer);
        projectsContainer.scrollTop = offset;
        setActiveProject(hashSlug, { scrollIntoView: false });
        // Restaurar smooth scroll
        projectsContainer.style.scrollBehavior = "";
      });
    }

    updateSafeAreaVars();
    setupSidebarHeight();

    const handleLayoutChange = debounce(() => {
      updateSafeAreaVars();
      setupSidebarHeight();
      setupProjectScrollSync();
    }, 300);

    window.addEventListener("resize", handleLayoutChange);
    const onWindowLoad = () => {
      updateSafeAreaVars();
      setupSidebarHeight();
      setupProjectScrollSync();
    };
    // Si la carga ya terminó (init es async), ejecutar directamente
    if (document.readyState === "complete") {
      onWindowLoad();
    } else {
      window.addEventListener("load", onWindowLoad, { once: true });
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleLayoutChange);
    }

    // Configurar event listeners
    setupEventListeners();
  } catch (error) {
    console.error("Error al cargar datos:", error);
    // en la vista previa, si el error ya sale en pantalla (js/carga.js), no hace falta otro
    if (!document.getElementById("errores-vista-previa")) showLoadingError();
  }
}

// Mostrar mensaje de error al usuario
function showLoadingError() {
  const errorDiv = document.createElement("div");
  errorDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #fff;
    color: #000;
    padding: 2rem;
    border: 1px solid #000;
    text-align: center;
    z-index: 9999;
    max-width: 90vw;
    font-family: inherit;
  `;

  errorDiv.innerHTML = `
    <p style="margin-bottom: 1rem;">Error al cargar el sitio web.</p>
    <p style="margin-bottom: 1.5rem;">Por favor, verifica tu conexión a internet.</p>
    <button onclick="location.reload()" style="
      background: #000;
      color: #fff;
      border: none;
      padding: 0.75rem 1.5rem;
      cursor: pointer;
      font-family: inherit;
      font-size: 1rem;
    ">Reintentar</button>
  `;

  document.body.appendChild(errorDiv);
}

function updateSidebarColor() {
  const colors = state.homeData?.home_colors || {};
  const bgColor = colors[state.activeLanguage] ?? colors.cat ?? "#ffffff";
  document.documentElement.style.setProperty("--home-bg-color", bgColor);
}

function getVisibleProjectsFromHome() {
  if (!Array.isArray(state.homeData?.projectes_visibles)) return [];
  return state.homeData.projectes_visibles.filter(
    (project) =>
      project && (project.visible === true || project.visible === "si")
  );
}

function populateProjectInfo(target, projectData, projectTitleOverride) {
  if (!target || !projectData) return null;
  target.classList.add("project-info");
  while (target.firstChild) target.removeChild(target.firstChild);

  const projectTitle =
    projectTitleOverride ?? getLocalizedText(projectData.titol);

  const firstP = document.createElement("p");
  firstP.className = "project-text";
  let clientVal = "";
  if (typeof projectData.client === "object" && projectData.client !== null) {
    clientVal = getLocalizedText(projectData.client);
  } else if (typeof projectData.client === "string") {
    clientVal = projectData.client;
  }
  const year = (projectData.data || "").toString();
  const infoParts = [];
  if (projectTitle) {
    infoParts.push({ html: formatTitleText(projectTitle) });
  }
  if (clientVal) {
    infoParts.push({ html: escapeHtml(clientVal) });
  }
  if (year) {
    infoParts.push({ html: escapeHtml(year) });
  }
  firstP.innerHTML = infoParts.map((part) => part.html).join(", ");
  target.appendChild(firstP);

  const paragraphs = getLocalizedParagraphs(projectData.text);

  paragraphs.forEach((p) => {
    const para = document.createElement("p");
    para.className = "project-text";
    para.innerHTML = formatInline(p).replace(/\n/g, "<br>");
    target.appendChild(para);
  });

  return target;
}

// Renderizar menú de proyectos
function renderProjectMenu() {
  if (!projectMenu) return;
  projectMenu.innerHTML = "";

  const visibleProjects = getVisibleProjectsFromHome();

  visibleProjects.forEach((project) => {
    const projectData = state.projectsData[project.slug];
    if (!projectData) return;

    const button = document.createElement("button");
    button.className = "project-link";
    button.dataset.slug = project.slug;
    if (project.slug === state.activeProjectSlug) {
      button.classList.add("active");
      button.setAttribute("aria-current", "true");
    }
    const title = getLocalizedText(projectData.titol);
    button.innerHTML = formatTitleText(title || project.slug);
    button.onclick = () => scrollToProject(project.slug);

    projectMenu.appendChild(button);
  });

  state.firstProjectSlug = visibleProjects[0]?.slug ?? null;
  const fallbackSlug = state.activeProjectSlug ?? state.firstProjectSlug;
  if (fallbackSlug) {
    setActiveProject(fallbackSlug, { scrollIntoView: false });
  }
}

// Renderizar proyectos
function renderProjects() {
  if (!projectsContainer) return;
  const visibleProjects = getVisibleProjectsFromHome();

  // Crear wrapper si no existe
  let wrapper = projectsContainer.querySelector(".projects-wrapper");
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.className = "projects-wrapper";
    projectsContainer.appendChild(wrapper);
  }

  // Limpiar contenedor
  wrapper.innerHTML = "";

  const firstVisibleSlug = visibleProjects[0]?.slug ?? null;

  visibleProjects.forEach((project) => {
    if (!project || !project.slug) return;
    const projectData = state.projectsData[project.slug];
    if (!projectData) {
      console.warn(`No se encontraron datos para el proyecto: ${project.slug}`);
      return;
    }

    const section = document.createElement("section");
    section.className = "project-section";
    section.id = `project-${project.slug}`;
    section.dataset.slug = project.slug;
    section.style.backgroundColor = project.color;
    const sectionTextColor =
      project.color_texto_proyecto || project.color_texto || DEFAULT_TEXT_COLOR;
    section.style.setProperty("--project-text-color", sectionTextColor);
    section.style.color = sectionTextColor;

    const content = document.createElement("div");
    content.className = "project-content";
    const projectTitle = getLocalizedText(projectData.titol);

    // Imagen principal (usa el mismo sistema genérico que la galería)
    const heroMeta = projectData.primera_imatge;
    if (heroMeta?.src) {
      const heroScale = heroMeta.size ?? 100;
      const isFirstVisible = project.slug === firstVisibleSlug;
      const hero = makeMediaFrame(heroMeta.src, projectTitle, heroScale, heroMeta, {
        priority: isFirstVisible,
      });
      hero.classList.add("hero");
      content.appendChild(hero);
    }

    // Información del proyecto (mínima): todo en mismos estilos
    const info = document.createElement("div");
    populateProjectInfo(info, projectData, projectTitle);
    content.appendChild(info);

    // Galería de imágenes (después de la info)
    const gallery = document.createElement("div");
    gallery.className = "media-group";

    const images = Array.isArray(projectData.imatges)
      ? projectData.imatges
      : [];

    images.forEach((imgMeta) => {
      if (!imgMeta || !imgMeta.src) return;
      const altText = imgMeta.alt ? getLocalizedText(imgMeta.alt) : "";
      const item = makeMediaFrame(imgMeta.src, altText, imgMeta.size, imgMeta);
      gallery.appendChild(item);
    });

    content.appendChild(gallery);

    section.appendChild(content);

    wrapper.appendChild(section);
  });

  if (!state.activeProjectSlug && visibleProjects.length) {
    state.activeProjectSlug = visibleProjects[0].slug;
  }

  if (state.activeProjectSlug) {
    setActiveProject(state.activeProjectSlug, { scrollIntoView: false });
  }

  setupProjectScrollSync();
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

      // Preservar la posición de scroll antes de cambiar idioma
      const savedScrollTop = projectsContainer ? projectsContainer.scrollTop : 0;
      const savedScrollLeft = projectMenu ? projectMenu.scrollLeft : 0;

      // Desactivar temporalmente el scroll sync para evitar interferencias
      cleanupScrollSync();

      // Bloquear scroll completamente durante el cambio de idioma
      const originalOverflow = projectsContainer ? projectsContainer.style.overflow : '';
      const originalScrollBehavior = document.documentElement.style.scrollBehavior;

      if (projectsContainer) {
        projectsContainer.style.overflow = 'hidden';
      }
      document.documentElement.style.scrollBehavior = 'auto';

      // Cambiar idioma
      state.activeLanguage = lang;
      try {
        localStorage.setItem("activeLanguage", lang);
      } catch (_) {}
      document.documentElement.lang = lang === "es" ? "es" : "ca";
      updateSidebarColor();
      renderProjectMenu();
      updateProjectsContent();
      renderAbout();
      applySidebarHeight();

      // Restaurar scroll y configuración
      requestAnimationFrame(() => {
        if (projectsContainer) {
          projectsContainer.scrollTop = savedScrollTop;
          projectsContainer.style.overflow = originalOverflow;
        }
        if (projectMenu) {
          projectMenu.scrollLeft = savedScrollLeft;
        }
        document.documentElement.style.scrollBehavior = originalScrollBehavior;

        // Reactivar el scroll sync después de restaurar el scroll
        requestAnimationFrame(() => {
          setupProjectScrollSync();
        });
      });
    });
  });

  if (aboutToggle && aboutPanel) {
    const toggleAbout = () => {
      const willOpen = !aboutPanel.classList.contains("open");
      setAboutOpen(willOpen);
    };

    aboutToggle.setAttribute(
      "aria-expanded",
      aboutPanel.classList.contains("open") ? "true" : "false"
    );
    aboutToggle.addEventListener("click", toggleAbout);

    if (escCloseHandler) {
      document.removeEventListener("keydown", escCloseHandler);
    }
    escCloseHandler = (event) => {
      if (event.key === "Escape" && aboutPanel.classList.contains("open")) {
        setAboutOpen(false, { focusToggle: true });
      }
    };
    document.addEventListener("keydown", escCloseHandler);
  }

  // Si el usuario scrollea manualmente, cancelar la corrección de scroll pendiente
  if (projectsContainer) {
    ["wheel", "touchstart"].forEach((eventName) => {
      projectsContainer.addEventListener(
        eventName,
        cancelScrollCorrection,
        PASSIVE_SCROLL_OPTIONS
      );
    });
  }

  // Prevenir comportamiento extraño en iOS durante scroll horizontal del menú
  if (projectMenu) {
    // Prevenir que el scroll del menú afecte al scroll del documento
    projectMenu.addEventListener(
      "touchstart",
      (e) => {
        if (projectMenu.scrollWidth > projectMenu.clientWidth) {
          e.stopPropagation();
        }
      },
      PASSIVE_SCROLL_OPTIONS
    );
  }

  // Navegar al proyecto correspondiente cuando el hash cambia (ej: botones atrás/adelante)
  window.addEventListener("hashchange", () => {
    const slug = getSlugFromHash();
    if (slug && document.getElementById(`project-${slug}`)) {
      scrollToProject(slug);
    }
  });
}

// Actualizar contenido de proyectos (sin recrear el DOM completo)
function updateProjectsContent() {
  const allProjects = getVisibleProjectsFromHome();

  allProjects.forEach((project) => {
    const projectData = state.projectsData[project.slug];
    if (!projectData) return;

    const section = document.getElementById(`project-${project.slug}`);
    if (!section) return;

    const sectionTextColor =
      project.color_texto_proyecto || project.color_texto || DEFAULT_TEXT_COLOR;
    section.style.setProperty("--project-text-color", sectionTextColor);
    section.style.color = sectionTextColor;

    // Actualizar textos (mínimo): reconstruir los párrafos dentro de .project-info
    const info = section.querySelector(".project-info");
    if (info) {
      populateProjectInfo(info, projectData);
    }
    const img = section.querySelector(".media-frame.hero .media-image");
    if (img) {
      // alt + escala
      img.alt = getLocalizedText(projectData.titol);
      let heroScale = parseInt(projectData.primera_imatge?.size, 10);
      if (isNaN(heroScale)) heroScale = 100;
      heroScale = Math.max(1, Math.min(100, heroScale));
      img.style.setProperty("--scale", (heroScale / 100).toString());

      // asegurar variables del contenedor si no están
      const hero = section.querySelector(".media-frame.hero");
      if (hero && !hero.style.getPropertyValue("--ratio")) {
        bindRatioVars(hero, img);
      }
    }

    // Actualizar alts de la galería
    const gallery = section.querySelector(".media-group");
    if (gallery) {
      const galleryImages = Array.isArray(projectData.imatges)
        ? projectData.imatges.filter((imgMeta) => imgMeta && imgMeta.src)
        : [];
      gallery.querySelectorAll("img").forEach((gimg, idx) => {
        const imgMeta = galleryImages[idx];
        gimg.alt = imgMeta?.alt ? getLocalizedText(imgMeta.alt) : "";
      });
    }
  });
}

// Iniciar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", init);
