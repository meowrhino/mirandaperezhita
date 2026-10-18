// Selección de texto localizado con fallback a catalán y primer valor disponible.
import { state } from "./state.js";

// Devuelve el texto en el idioma activo con fallback a catalán y primer valor disponible
export function getLocalizedText(source, lang = state.activeLanguage) {
  if (!source) return "";
  if (Array.isArray(source)) {
    return source
      .map((item) =>
        typeof item === "string" ? item.trim() : String(item || "").trim()
      )
      .filter(Boolean)
      .join(" ");
  }
  if (typeof source === "string") return source;
  if (typeof source === "object") {
    const candidates = [source[lang], source.cat, ...Object.values(source)];
    for (const candidate of candidates) {
      if (!candidate) continue;
      if (typeof candidate === "string" && candidate.trim()) return candidate;
      if (Array.isArray(candidate)) {
        const joined = candidate
          .map((item) =>
            typeof item === "string" ? item.trim() : String(item || "").trim()
          )
          .filter(Boolean)
          .join(" ");
        if (joined) return joined;
      }
    }
  }
  return "";
}

export function getLocalizedParagraphs(source, lang = state.activeLanguage) {
  if (!source) return [];
  const coerce = (value) => {
    if (Array.isArray(value)) {
      return value
        .map((item) =>
          typeof item === "string" ? item.trim() : String(item || "").trim()
        )
        .filter(Boolean);
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed ? [trimmed] : [];
    }
    return [];
  };

  if (Array.isArray(source) || typeof source === "string") {
    return coerce(source);
  }

  if (typeof source === "object") {
    const candidates = [source[lang], source.cat, ...Object.values(source)];
    for (const candidate of candidates) {
      const result = coerce(candidate);
      if (result.length) return result;
    }
  }
  return [];
}
