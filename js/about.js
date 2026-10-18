// Panel "About": carga de datos, render y ciclo de vida abrir/cerrar.
// El ciclo de vida (timers + transitionend) es frágil: movido tal cual, no "mejorado".
import {
  state,
  aboutPanel,
  aboutToggle,
  projectsContainer,
  ABOUT_FALLBACK_TEXT,
} from "./state.js";
import { makeMediaFrame } from "./media.js";
import { getLocalizedParagraphs } from "./i18n.js";
import { formatInline } from "./markdown.js";

let aboutData = null;
let lastFocusedElement = null;
let aboutCloseTimerId = null;
let aboutTransitionHandler = null;

// Recibe el about (data/about.json, ya en la forma de antes) y lo pinta
export function loadAbout(data) {
  aboutData = data ?? null;
  renderAbout();
}

// Renderizar contenido del About desde aboutData
export function renderAbout() {
  if (!aboutPanel) return;
  const wasOpen = aboutPanel.classList.contains("open");
  aboutPanel.innerHTML = "";

  const closeBtn = document.createElement("button");
  closeBtn.className = "about-close";
  closeBtn.type = "button";
  const closeLabels = {
    cat: "Tancar",
    es: "Cerrar",
  };
  const closeLabel = closeLabels[state.activeLanguage] || closeLabels.cat;
  closeBtn.setAttribute("aria-label", closeLabel);
  closeBtn.setAttribute("title", closeLabel);
  closeBtn.innerHTML = "&times;";
  closeBtn.addEventListener("click", () => {
    setAboutOpen(false, { focusToggle: true });
  });
  aboutPanel.appendChild(closeBtn);

  const wrap = document.createElement("div");
  wrap.className = "about-content";

  const body = document.createElement("div");
  body.className = "about-body";

  // Renderizar imágenes del about (si hay)
  const aboutImages = aboutData?.imatges;
  if (Array.isArray(aboutImages) && aboutImages.length) {
    aboutImages.forEach((imgMeta) => {
      const frame = makeMediaFrame(imgMeta.src, "about", imgMeta.size, imgMeta);
      body.appendChild(frame);
    });
  }

  const paragraphs = getLocalizedParagraphs(aboutData?.text, state.activeLanguage);
  const aboutParagraphs = paragraphs.length ? paragraphs : [ABOUT_FALLBACK_TEXT];
  aboutParagraphs.forEach((text) => {
    const p = document.createElement("p");
    p.innerHTML = formatInline(text); // soporta **, *, __, [texto](url)
    body.appendChild(p);
  });

  wrap.appendChild(body);

  const footer = document.createElement("div");
  footer.className = "about-footer";
  const footerLink = document.createElement("a");
  footerLink.href = "https://meowrhino.studio";
  footerLink.target = "_blank";
  footerLink.rel = "noopener noreferrer";
  footerLink.textContent = "meowrhino.studio";
  footer.appendChild(footerLink);

  wrap.appendChild(footer);

  aboutPanel.appendChild(wrap);
  setAboutOpen(wasOpen);
}

// OPTIMIZADO: Mejorar gestión del about panel con bloqueo de scroll y gestión de foco
export function setAboutOpen(isOpen, options = {}) {
  if (!aboutPanel) return;
  const { focusToggle = false } = options;
  const open = Boolean(isOpen);
  const currentlyOpen = aboutPanel.classList.contains("open");
  const currentlyClosing = aboutPanel.classList.contains("closing");

  if (aboutCloseTimerId) {
    clearTimeout(aboutCloseTimerId);
    aboutCloseTimerId = null;
  }

  if (aboutTransitionHandler) {
    aboutPanel.removeEventListener("transitionend", aboutTransitionHandler);
    aboutTransitionHandler = null;
  }

  // El bloqueo visual (overflow + pointer-events) lo aplica el CSS vía body.about-open;
  // aquí solo se guarda/restaura la posición de scroll.
  const applyLockState = () => {
    const isActive =
      aboutPanel.classList.contains("open") ||
      aboutPanel.classList.contains("closing");
    if (document.body) {
      document.body.classList.toggle("about-open", isActive);
    }

    if (!projectsContainer) return;
    if (isActive) {
      if (!("scrollPos" in projectsContainer.dataset)) {
        projectsContainer.dataset.scrollPos = projectsContainer.scrollTop;
      }
    } else if ("scrollPos" in projectsContainer.dataset) {
      const stored = parseInt(projectsContainer.dataset.scrollPos || "0", 10);
      requestAnimationFrame(() => {
        projectsContainer.scrollTop = stored;
      });
      delete projectsContainer.dataset.scrollPos;
    }
  };

  const finishClosing = (shouldApply = true) => {
    aboutPanel.classList.remove("closing");
    if (aboutTransitionHandler) {
      aboutPanel.removeEventListener("transitionend", aboutTransitionHandler);
      aboutTransitionHandler = null;
    }
    if (aboutCloseTimerId) {
      clearTimeout(aboutCloseTimerId);
      aboutCloseTimerId = null;
    }
    if (shouldApply) {
      applyLockState();
    }
  };

  aboutPanel.setAttribute("aria-hidden", open ? "false" : "true");

  // Gestión de foco mejorada - Mejora #5
  if (open) {
    finishClosing(false);
    aboutPanel.classList.add("open");
    aboutPanel.scrollTop = 0;
    // Guardar el elemento con foco actual
    lastFocusedElement = document.activeElement;

    // Mover foco al botón de cerrar
    requestAnimationFrame(() => {
      const closeBtn = aboutPanel.querySelector(".about-close");
      if (closeBtn) closeBtn.focus();
    });
  } else {
    if (currentlyOpen || currentlyClosing) {
      aboutPanel.classList.add("closing");
      aboutPanel.classList.remove("open");
      aboutTransitionHandler = (event) => {
        if (event.target !== aboutPanel || event.propertyName !== "transform")
          return;
        finishClosing();
      };
      aboutPanel.addEventListener("transitionend", aboutTransitionHandler);
      // Fallback por si transitionend no se dispara
      aboutCloseTimerId = window.setTimeout(() => {
        finishClosing();
      }, 500); // 420ms + 80ms de margen
    } else {
      finishClosing();
    }

    // Restaurar foco al elemento anterior
    if (focusToggle && aboutToggle) {
      requestAnimationFrame(() => {
        aboutToggle.focus();
      });
    } else if (lastFocusedElement) {
      requestAnimationFrame(() => {
        lastFocusedElement.focus();
      });
    }
  }

  if (aboutToggle) {
    aboutToggle.setAttribute("aria-expanded", open ? "true" : "false");
  }
  applyLockState();
}
