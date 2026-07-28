// Renderiza conteudo com formatacao markdown simples
// Suporta: **negrito**, *italico*, ~~tachado~~, `codigo`, > citacao, # titulo,
// - lista, 1. lista numerada, [link](url)

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatLine(line) {
  let html = escapeHtml(line);

  // Codigo inline: `texto`
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-red-600 px-1 py-0.5 rounded text-xs font-mono">$1</code>');

  // Negrito: **texto**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Tachado: ~~texto~~
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // Italico: *texto*
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Links: [texto](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>');

  return html;
}

export function renderMarkdown(text) {
  if (!text) return '';

  const lines = text.split('\n');
  const result = [];
  let listType = null; // 'ul' | 'ol' | null

  function closeList() {
    if (listType) { result.push(`</${listType}>`); listType = null; }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const numberedMatch = line.match(/^\d+\.\s(.*)$/);

    // Titulo: # texto
    if (line.startsWith('# ')) {
      closeList();
      result.push(`<h3 class="font-bold text-base text-gray-800 mt-2 mb-1">${formatLine(line.slice(2))}</h3>`);
      continue;
    }

    // Citacao: > texto
    if (line.startsWith('> ')) {
      closeList();
      result.push(`<blockquote class="border-l-3 border-gray-300 pl-3 text-gray-500 italic my-1">${formatLine(line.slice(2))}</blockquote>`);
      continue;
    }

    // Lista numerada: 1. texto
    if (numberedMatch) {
      if (listType !== 'ol') { closeList(); result.push('<ol class="list-decimal pl-5 my-1 space-y-0.5">'); listType = 'ol'; }
      result.push(`<li>${formatLine(numberedMatch[1])}</li>`);
      continue;
    }

    // Lista: - texto
    if (line.startsWith('- ')) {
      if (listType !== 'ul') { closeList(); result.push('<ul class="list-disc pl-5 my-1 space-y-0.5">'); listType = 'ul'; }
      result.push(`<li>${formatLine(line.slice(2))}</li>`);
      continue;
    }

    // Fechar lista se nao e item
    closeList();

    // Linha vazia
    if (line.trim() === '') {
      result.push('<br/>');
      continue;
    }

    // Linha normal
    result.push(`<p class="my-0.5">${formatLine(line)}</p>`);
  }

  closeList();
  return result.join('');
}

export default function FormattedContent({ text, className = '' }) {
  const html = renderMarkdown(text);
  return (
    <div
      className={`formatted-content text-sm text-gray-700 leading-relaxed break-words ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
