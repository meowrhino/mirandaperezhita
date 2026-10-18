// Estado compartido de la aplicación.
// Un único objeto mutable para preservar el comportamiento de las variables
// globales originales bajo ES modules (los bindings importados son de solo lectura,
// pero las propiedades de un objeto importado sí pueden mutarse).
export const state = {
  homeData: null,
  projectsData: {},
  activeLanguage: "cat",
  activeProjectSlug: null,
  homeProjectsBySlug: new Map(),
  firstProjectSlug: null,
};

export const PASSIVE_SCROLL_OPTIONS = { passive: true };
export const DEFAULT_TEXT_COLOR = "#000000";
export const MAX_RETRIES = 3;
export const RETRY_DELAY = 1000; // 1 segundo
export const ABOUT_FALLBACK_TEXT = "about no disponible";

// Elementos del DOM (el script es type="module", se ejecuta con el DOM ya parseado)
export const sidebar = document.getElementById("sidebar");
export const projectMenu = document.getElementById("project-menu");
export const projectsContainer = document.getElementById("projects-container");
export const langButtons = document.querySelectorAll(".lang-btn");
export const aboutToggle = document.getElementById("about-toggle");
export const aboutPanel = document.getElementById("about-panel");

// Función de fetch con reintentos para conexiones con poca cobertura
export async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response;
    } catch (error) {
      const isLastAttempt = attempt === retries;

      if (isLastAttempt) {
        console.error(`Error al cargar ${url} después de ${retries + 1} intentos:`, error);
        throw error;
      }

      // Backoff exponencial: esperar más tiempo en cada reintento
      const delay = RETRY_DELAY * Math.pow(2, attempt);
      console.warn(`Reintentando ${url} en ${delay}ms (intento ${attempt + 1}/${retries + 1})...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
