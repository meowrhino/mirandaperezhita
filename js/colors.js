// Utilidades de color y cálculo de contraste para la navegación/proyectos.
import { state, DEFAULT_TEXT_COLOR } from "./state.js";

export function hexToRgb(hex) {
  if (!hex || typeof hex !== "string") return null;
  let value = hex.trim();
  if (value.startsWith("#")) value = value.slice(1);
  if (!(value.length === 3 || value.length === 6)) return null;
  if (value.length === 3) {
    value = value
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  const int = parseInt(value, 16);
  if (Number.isNaN(int)) return null;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return { r, g, b };
}

export function rgbToHex({ r, g, b }) {
  const clampByte = (n) => {
    if (!Number.isFinite(n)) return 0;
    return Math.min(255, Math.max(0, Math.round(n)));
  };
  const toHex = (n) => clampByte(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function mixRgb(base, target, factor = 0.5) {
  const f = clamp01(factor);
  const inv = 1 - f;
  return {
    r: base.r * inv + target.r * f,
    g: base.g * inv + target.g * f,
    b: base.b * inv + target.b * f,
  };
}

export function getTone({ r, g, b }) {
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return clamp01(luminance / 255);
}

export function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function prepareProjectColorData() {
  state.homeProjectsBySlug = new Map();
  const projects = Array.isArray(state.homeData?.projectes_visibles)
    ? state.homeData.projectes_visibles
    : [];
  const globalCurtRaw = Number.isFinite(state.homeData?.nota_de_curt)
    ? state.homeData.nota_de_curt
    : 50;
  const threshold = clamp01(globalCurtRaw / 100);

  projects.forEach((project) => {
    if (!project || typeof project.slug !== "string") return;
    const rgb = hexToRgb(project.color);
    if (!rgb) {
      project.color_texto = DEFAULT_TEXT_COLOR;
      project.color_texto_proyecto = DEFAULT_TEXT_COLOR;
      state.homeProjectsBySlug.set(project.slug, project);
      return;
    }

    const tone = getTone(rgb);
    const isLight = tone >= threshold;

    // Si el color es claro, mezclamos con negro para más contraste; si es oscuro, con blanco.
    const targetRgb = isLight ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
    const navRgb = mixRgb(rgb, targetRgb, 0.5);
    project.color_texto = rgbToHex(navRgb);
    project.color_texto_proyecto = rgbToHex(mixRgb(navRgb, targetRgb, 0.5));

    state.homeProjectsBySlug.set(project.slug, project);
  });
}
