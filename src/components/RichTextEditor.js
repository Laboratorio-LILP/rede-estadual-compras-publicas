import { useRef, useCallback } from 'react';

// Helper para inserir markdown no textarea
function insertMarkdown(textareaRef, prefix, suffix, placeholder, setValue) {
  const textarea = textareaRef.current;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selectedText = text.substring(start, end);
  const insertText = selectedText || placeholder;

  const newText = text.substring(0, start) + prefix + insertText + suffix + text.substring(end);
  setValue(newText);

  // Posicionar cursor apos a insercao
  setTimeout(() => {
    textarea.focus();
    if (selectedText) {
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = start + prefix.length + selectedText.length;
    } else {
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = start + prefix.length + placeholder.length;
    }
  }, 0);
}

function ToolbarButton({ children, title, onClick }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition text-sm"
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ value, onChange, placeholder, className = '', rows = 6 }) {
  const textareaRef = useRef(null);

  const insert = useCallback((prefix, suffix, ph) => {
    insertMarkdown(textareaRef, prefix, suffix, ph, onChange);
  }, [onChange]);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border border-gray-200 border-b-0 rounded-t-lg bg-gray-50 px-2 py-1">
        <ToolbarButton title="Negrito" onClick={() => insert('**', '**', 'texto em negrito')}>
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton title="Itálico" onClick={() => insert('*', '*', 'texto em itálico')}>
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton title="Tachado" onClick={() => insert('~~', '~~', 'texto tachado')}>
          <span style={{ textDecoration: 'line-through' }}>S</span>
        </ToolbarButton>
        <ToolbarButton title="Citação" onClick={() => insert('\n> ', '\n', 'citação')}>
          <span className="text-lg leading-none">"</span>
        </ToolbarButton>
        <ToolbarButton title="Código" onClick={() => insert('`', '`', 'código')}>
          <span className="font-mono text-xs">&lt;/&gt;</span>
        </ToolbarButton>
        <ToolbarButton title="Título" onClick={() => insert('\n# ', '\n', 'título')}>
          <span className="font-bold text-xs">H</span>
        </ToolbarButton>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <ToolbarButton title="Lista" onClick={() => insert('\n- ', '\n', 'item da lista')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </ToolbarButton>
        <ToolbarButton title="Lista numerada" onClick={() => insert('\n1. ', '\n', 'item da lista')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
        </ToolbarButton>
        <ToolbarButton title="Link" onClick={() => insert('[', '](url)', 'texto do link')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
        </ToolbarButton>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full border border-gray-200 rounded-b-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none placeholder-gray-400 ${className}`}
      />
    </div>
  );
}
