// Conversión mínima de marcadores a HTML y escapado seguro.

// Conversión mínima de marcadores a HTML: **negrita**, *cursiva*, __subrayado__, [texto](url)
export function formatInline(s = "") {
  // Escapar básico de <, >, & y " para evitar inyección (la comilla protege los atributos href)
  let out = String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  // links [texto](url)
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  // **bold**
  out = out.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");
  // __underline__
  out = out.replace(/__([\s\S]+?)__/g, "<u>$1</u>");
  // *italic*
  out = out.replace(/(^|[^\*])\*([^\*][\s\S]*?)\*(?!\*)/g, "$1<em>$2</em>");
  return out;
}

export function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function formatTitleText(value = "") {
  return escapeHtml(value).replace(
    /(^|[^\*])\*([^\*][\s\S]*?)\*(?!\*)/g,
    "$1<em>$2</em>"
  );
}
