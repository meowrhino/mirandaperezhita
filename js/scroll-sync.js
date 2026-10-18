// Sincronización del proyecto activo con el scroll + corrección de scroll durante
// la carga de imágenes. Lógica frágil movida tal cual desde app.js (no "mejorada").
import {
  state,
  projectsContainer,
  projectMenu,
  PASSIVE_SCROLL_OPTIONS,
  DEFAULT_TEXT_COLOR,
} from "./state.js";

let scrollSyncRoot = null;
let scrollSyncFrame = null;
let scrollSyncTargets = [];
let scrollCorrectionTarget = null;
let scrollCorrectionTimer = null;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function getProjectMeta(slug) {
  if (!slug) return null;
  if (state.homeProjectsBySlug instanceof Map && state.homeProjectsBySlug.size) {
    return state.homeProjectsBySlug.get(slug) || null;
  }
  if (Array.isArray(state.homeData?.projectes_visibles)) {
    return state.homeData.projectes_visibles.find((p) => p.slug === slug) || null;
  }
  return null;
}

function applyNavColorForSlug(slug) {
  const meta = getProjectMeta(slug);
  if (!meta) {
    document.documentElement.style.setProperty(
      "--active-project-text-color",
      DEFAULT_TEXT_COLOR
    );
    return;
  }
  const navColor = meta.color_texto || DEFAULT_TEXT_COLOR;
  document.documentElement.style.setProperty(
    "--active-project-text-color",
    navColor
  );
}

export function getElementOffsetInContainer(el, container) {
  const elRect = el.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  let offset = container.scrollTop + (elRect.top - containerRect.top);
  const scrollMargin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  offset -= scrollMargin;
  return Math.max(0, offset);
}

function correctScrollToElement(el) {
  if (!el || !projectsContainer) return;
  const targetOffset = getElementOffsetInContainer(el, projectsContainer);
  if (Math.abs(targetOffset - projectsContainer.scrollTop) > 5) {
    projectsContainer.scrollTo({ top: targetOffset, behavior: "auto" });
  }
}

export function cancelScrollCorrection() {
  scrollCorrectionTarget = null;
  if (scrollCorrectionTimer) {
    clearTimeout(scrollCorrectionTimer);
    scrollCorrectionTimer = null;
  }
}

// Llamado por media.js cuando una imagen termina de cargar: si hay una corrección
// de scroll activa, reposiciona el contenedor al proyecto objetivo.
export function notifyMediaLoaded() {
  if (scrollCorrectionTarget) {
    correctScrollToElement(scrollCorrectionTarget);
  }
}

// Scroll suave a un proyecto
export function scrollToProject(slug) {
  const element = document.getElementById(`project-${slug}`);
  if (!element) return;

  setActiveProject(slug);

  // Activar corrección event-driven mientras cargan imágenes
  cancelScrollCorrection();
  scrollCorrectionTarget = element;
  scrollCorrectionTimer = setTimeout(() => {
    scrollCorrectionTarget = null;
    scrollCorrectionTimer = null;
  }, 5000);

  // Scroll programático al offset calculado
  const targetOffset = getElementOffsetInContainer(element, projectsContainer);
  const behavior = prefersReducedMotion() ? "auto" : "smooth";
  projectsContainer.scrollTo({ top: targetOffset, behavior });
}

// Actualizar el hash de la URL sin añadir entrada al historial
// (en la web construida, la dirección limpia: / para el primero, /<slug>/ para los demás)
function updateUrlHash(slug) {
  if (!slug || typeof history === "undefined") return;
  if (document.documentElement.hasAttribute("data-built")) {
    const url = new URL(slug === state.firstProjectSlug ? "./" : `${encodeURIComponent(slug)}/`, document.baseURI);
    if (location.pathname !== url.pathname) history.replaceState(null, "", url);
    return;
  }
  const newHash = `#${slug}`;
  if (location.hash !== newHash) {
    history.replaceState(null, "", newHash);
  }
}

// sin acentos: #cosas-de-señoras (los enlaces de antes) → cosas-de-senoras
const strip = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Leer el hash inicial de la URL y devolver el slug si existe
export function getSlugFromHash() {
  const hash = location.hash;
  if (!hash || hash.length < 2) return null;
  const raw = hash.slice(1); // quitar el '#'
  // Decodificar por si el navegador entrega el hash percent-encoded (ej: ñ → %C3%B1)
  try {
    return strip(decodeURIComponent(raw));
  } catch (_) {
    return strip(raw);
  }
}

export function setActiveProject(slug, options = {}) {
  if (!slug) return;
  const { scrollIntoView = true, forceScroll = false } = options;

  if (!projectMenu) {
    state.activeProjectSlug = slug;
    applyNavColorForSlug(slug);
    return;
  }

  const buttons = Array.from(projectMenu.querySelectorAll(".project-link"));
  if (!buttons.length) {
    state.activeProjectSlug = slug;
    applyNavColorForSlug(slug);
    return;
  }

  let targetSlug = slug;
  let activeButton = buttons.find((btn) => btn.dataset.slug === slug) || null;

  if (!activeButton && buttons.length) {
    activeButton = buttons[0];
    targetSlug = activeButton.dataset.slug || slug;
  }

  const slugChanged = state.activeProjectSlug !== targetSlug;

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

  state.activeProjectSlug = targetSlug;
  applyNavColorForSlug(targetSlug);

  if (slugChanged) {
    updateUrlHash(targetSlug);
  }

  if (activeButton && (forceScroll || (scrollIntoView && slugChanged))) {
    const shouldScrollMenu = projectMenu.scrollWidth > projectMenu.clientWidth;
    if (shouldScrollMenu) {
      // Mejorar el scroll en móvil con un pequeño delay
      requestAnimationFrame(() => {
        const behavior = prefersReducedMotion() ? "auto" : "smooth";
        activeButton.scrollIntoView({
          behavior,
          block: "nearest",
          inline: "center",
        });
      });
    }
  }
}

export function cleanupScrollSync() {
  if (scrollSyncFrame !== null) {
    cancelAnimationFrame(scrollSyncFrame);
    scrollSyncFrame = null;
  }
  if (scrollSyncTargets.length) {
    scrollSyncTargets.forEach((target) => {
      target.removeEventListener(
        "scroll",
        onScrollSync,
        PASSIVE_SCROLL_OPTIONS
      );
    });
    scrollSyncTargets = [];
  }
  scrollSyncRoot = null;
}

function setupScrollSync(root) {
  cleanupScrollSync();

  scrollSyncRoot = root ?? null;

  if (root && typeof root.addEventListener === "function") {
    root.addEventListener("scroll", onScrollSync, PASSIVE_SCROLL_OPTIONS);
    scrollSyncTargets.push(root);
  } else {
    window.addEventListener("scroll", onScrollSync, PASSIVE_SCROLL_OPTIONS);
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
  const sections = Array.from(
    projectsContainer.querySelectorAll(".project-section")
  );
  if (!sections.length) return;

  const rootRect = root ? root.getBoundingClientRect() : null;
  const viewTop = rootRect ? rootRect.top : 0;
  const viewBottom = rootRect
    ? rootRect.bottom
    : window.innerHeight || document.documentElement.clientHeight;
  const viewCenter = rootRect
    ? (rootRect.top + rootRect.bottom) / 2
    : (window.innerHeight || document.documentElement.clientHeight) / 2;

  let bestSlug = null;
  let bestDistance = Infinity;

  sections.forEach((section) => {
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
  const overflowY = style.overflowY || "";
  const overflow = style.overflow || "";
  const scrollValues = ["auto", "scroll", "overlay"];
  const hasScrollStyle = scrollValues.some(
    (val) => overflowY.includes(val) || overflow.includes(val)
  );
  if (!hasScrollStyle) return false;
  return Math.ceil(element.scrollHeight) > Math.ceil(element.clientHeight);
}

// Sincronizar el proyecto activo con el scroll del contenedor
export function setupProjectScrollSync() {
  if (!projectsContainer) return;

  const sections = projectsContainer.querySelectorAll(".project-section");
  if (!sections.length) {
    cleanupScrollSync();
    return;
  }

  let scrollRoot = null;
  try {
    if (isScrollableContainer(projectsContainer)) {
      scrollRoot = projectsContainer;
    }
  } catch (_) {
    scrollRoot = null;
  }

  setupScrollSync(scrollRoot);
  updateActiveProjectFromScroll(scrollRoot);
}
