// Construcción de marcos de imagen (hero, galería, about) y cálculo de ratio.
import { notifyMediaLoaded } from "./scroll-sync.js";

// Escribe las variables CSS --natural-w y --ratio en el frame a partir de la imagen.
export function applyRatioVars(frame, img) {
  const w = img.naturalWidth || 1;
  const h = img.naturalHeight || 1;
  frame.style.setProperty("--natural-w", w + "px");
  frame.style.setProperty("--ratio", `${w} / ${h}`);
}

// Aplica el ratio ahora si la imagen ya está cargada, o al terminar de cargar.
// Opcionalmente ejecuta onApply después de cada aplicación (para corrección de scroll).
export function bindRatioVars(frame, img, onApply) {
  const apply = () => {
    applyRatioVars(frame, img);
    if (typeof onApply === "function") onApply();
  };
  if (img.complete && img.naturalWidth) {
    apply();
  } else {
    img.addEventListener("load", apply, { once: true });
  }
}

export function makeMediaFrame(src, alt = "", scale = 100, meta = null, options = {}) {
  const { priority = false } = options;
  const frame = document.createElement("div");
  frame.className = "media-frame";

  const img = document.createElement("img");
  img.className = "media-image";
  img.src = src;
  img.alt = alt;
  // Mejora #6: Optimización de carga de imágenes
  if (priority) {
    img.loading = "eager";
    img.fetchPriority = "high";
  } else {
    img.loading = "lazy";
  }
  img.decoding = "async";
  const FALLBACK_SRC = "data/imagen-no-disponible.svg";

  const scaleValue =
    Math.max(1, Math.min(100, parseInt(scale, 10) || 100)) / 100;
  img.style.setProperty("--scale", scaleValue.toString());

  // Si hay dimensiones pre-calculadas en el JSON, aplicar ratio inmediatamente
  if (meta?.w && meta?.h) {
    frame.style.setProperty("--natural-w", meta.w + "px");
    frame.style.setProperty("--ratio", `${meta.w} / ${meta.h}`);
  }

  // Al cargar (o si ya estaba cargada) fija el ratio real y, si hay una corrección
  // de scroll activa, reposiciona el contenedor.
  bindRatioVars(frame, img, notifyMediaLoaded);

  img.addEventListener("error", () => {
    if (img.dataset.fallbackApplied === "true") return;
    img.dataset.fallbackApplied = "true";
    img.src = FALLBACK_SRC;
  });

  frame.appendChild(img);
  return frame;
}
