import { useState, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import RichTextEditor from '../components/RichTextEditor';
import { getAvatarColor, formatNumber, getTagColor } from '../utils/formatters';
import Breadcrumbs from '../components/Breadcrumbs';

// ============= Topic Type Icons =============
// Todos usam currentColor: quem define a cor é o container do ícone.
function DiscussionIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2z" />
      <path strokeLinecap="round" d="M8 8h8M8 11h5" />
    </svg>
  );
}

function PollIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" strokeLinejoin="round" />
      <path strokeLinecap="round" d="M8 16V11M12 16V8M16 16v-3" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none" />
    </svg>
  );
}

const TOPIC_TYPES = [
  { key: 'discussion', label: 'Discussão', Icon: DiscussionIcon, desc: 'Dissertação ou debate', accent: '#034EA2' },
  { key: 'poll', label: 'Votação', Icon: PollIcon, desc: 'Enquete com alternativas', accent: '#0B9247' },
  { key: 'images', label: 'Imagem', Icon: ImageIcon, desc: 'Texto + imagem', accent: '#7C3AED' },
  { key: 'video', label: 'Vídeo', Icon: VideoIcon, desc: 'Vídeo ou link externo', accent: '#F97316' },
];

// ============= Helpers =============

// ============= Helper: detectar embed de vídeo =============
function getVideoEmbed(url) {
  if (!url) return null;
  // YouTube
  let match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  // Vimeo
  match = url.match(/vimeo\.com\/(\d+)/);
  if (match) return `https://player.vimeo.com/video/${match[1]}`;
  return null;
}

// ============= Main Component =============
export default function NewTopic() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const relatedRef = useRef(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('discussion');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingMessage, setPendingMessage] = useState(false);

  // Poll state
  const [pollOptions, setPollOptions] = useState(['', '']);

  // Image state
  const [imagePreview, setImagePreview] = useState(null);
  const [imageData, setImageData] = useState('');

  // Video state
  const [videoUrl, setVideoUrl] = useState('');

  const MAX_TITLE = 100;
  const MAX_QUESTION = 100;

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch('/categories'),
  });

  const { data: allTags } = useQuery({
    queryKey: ['tags'],
    queryFn: () => apiFetch('/tags'),
  });

  const { data: allTopics } = useQuery({
    queryKey: ['topics'],
    queryFn: () => apiFetch('/topics'),
  });

  // ====== Tópicos relacionados (baseado no título e tags digitados) ======
  const relatedTopics = useMemo(() => {
    const userTagList = tags ? tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [];
    const stopwords = ['como','para','que','com','por','das','dos','uma','uns','mais','entre','sobre','qual','quais','pode','deve','todas','todos','este','esta','esse','essa','novo','nova','são','tem','ser','ter','foi','sua','seu','ele','ela','nas','nos','sem','feito','fazer'];
    const titleWords = title.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .split(/\s+/)
      .filter(w => w.length >= 3 && !stopwords.includes(w));

    // Compatibilidade: /topics pode retornar array (antigo) ou objeto paginado { topics, ... }.
    const topicList = Array.isArray(allTopics) ? allTopics : (allTopics?.topics || []);

    return topicList.map(t => {
      let score = 0;
      // Pontuação por palavras-chave do título (peso 3 cada)
      if (titleWords.length > 0) {
        const topicTitle = t.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        for (const word of titleWords) {
          if (topicTitle.includes(word)) score += 3;
        }
      }
      // Pontuação por tags em comum (peso 2 cada)
      if (userTagList.length > 0 && t.tags?.length > 0) {
        for (const tag of t.tags) {
          if (userTagList.includes(tag.toLowerCase())) score += 2;
        }
      }
      // Pontuação por mesma categoria (peso 1)
      if (categoryId && String(t.category_id) === String(categoryId)) score += 1;
      return { ...t, score };
    }).filter(t => t.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [title, tags, categoryId, allTopics]);

  function scrollToRelated() {
    relatedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ====== Tags ======
  const selectedTags = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  function toggleTag(name) {
    const next = selectedTags.includes(name)
      ? selectedTags.filter(t => t !== name)
      : [...selectedTags, name];
    setTags(next.join(', '));
  }

  // ====== Poll handlers ======
  function addPollOption() {
    if (pollOptions.length < 10) {
      setPollOptions([...pollOptions, '']);
    }
  }

  function removePollOption(index) {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  }

  function updatePollOption(index, value) {
    const updated = [...pollOptions];
    updated[index] = value;
    setPollOptions(updated);
  }

  // ====== Image handler ======
  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError('Imagem muito grande. Máximo 4MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target.result);
      setImageData(ev.target.result);
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImagePreview(null);
    setImageData('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ====== Reset type-specific data when changing type ======
  function handleTypeChange(newType) {
    setType(newType);
    setError('');
  }

  // ====== Submit ======
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!title.trim()) { setError('Insira um título para o tópico.'); return; }
    if (!categoryId) { setError('Selecione uma categoria.'); return; }

    // Validações por tipo
    if (type === 'question') {
      if (!content.trim()) { setError('Escreva sua pergunta.'); return; }
      if (content.length > MAX_QUESTION) { setError(`Pergunta deve ter no máximo ${MAX_QUESTION} caracteres.`); return; }
    } else if (type === 'poll') {
      if (!content.trim()) { setError('Escreva a explicação ou pergunta da votação.'); return; }
      const validOptions = pollOptions.filter(o => o.trim());
      if (validOptions.length < 2) { setError('Adicione pelo menos 2 alternativas para a votação.'); return; }
    } else if (type === 'images') {
      if (!content.trim()) { setError('Escreva uma explicação para a imagem.'); return; }
      if (!imageData) { setError('Selecione uma imagem para enviar.'); return; }
    } else if (type === 'video') {
      if (!content.trim()) { setError('Escreva uma explicação para o vídeo.'); return; }
      if (!videoUrl.trim()) { setError('Insira o link do vídeo.'); return; }
    } else {
      if (!content.trim()) { setError('Escreva o conteúdo do tópico.'); return; }
    }

    setSubmitting(true);
    try {
      const tagList = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const body = {
        title,
        category_id: categoryId,
        content,
        tags: tagList,
        type,
      };

      if (type === 'poll') {
        body.poll_options = pollOptions.filter(o => o.trim());
      }
      if (type === 'images' && imageData) {
        body.image_url = imageData;
      }
      if (type === 'video' && videoUrl) {
        body.video_url = videoUrl;
      }

      const result = await apiFetch('/topics', {
        method: 'POST',
        body: JSON.stringify(body),
      }, token);

      // Se o topico ficou pendente (imagem/video de usuario comum), mostrar mensagem
      if (result.status === 'pending') {
        setPendingMessage(true);
        setTimeout(() => navigate('/forum'), 5000);
        return;
      }

      navigate(`/topic/${result.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Not logged in
  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md mx-auto">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Acesso necessário</h2>
          <p className="text-sm text-gray-500 mb-4">É necessário criar uma conta ou fazer login para criar um tópico.</p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-gray-600 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition">Entrar</Link>
            <Link to="/register" className="text-sm font-semibold text-white bg-red-500 px-4 py-2 rounded-lg hover:bg-red-600 transition">Inscrever</Link>
          </div>
        </div>
      </div>
    );
  }

  const videoEmbed = getVideoEmbed(videoUrl);

  // Mensagem de tópico pendente
  if (pendingMessage) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-lg border border-yellow-200 p-8">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Tópico enviado para análise</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-4">
            Seu tópico foi enviado e está em análise. Ele será publicado após aprovação de um moderador.
          </p>
          <p className="text-xs text-gray-400">Redirecionando para o fórum em alguns segundos...</p>
          <Link to="/forum" className="inline-block mt-4 text-sm font-semibold text-red-500 hover:text-red-600 transition">
            Voltar ao fórum →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Breadcrumbs
        className="mb-4"
        items={[
          { label: 'Início', to: '/' },
          { label: 'Fórum de Discussões', to: '/forum' },
          { label: 'Novo Tópico' },
        ]}
      />

      {/* Cabeçalho */}
      <div className="flex items-start gap-3 mb-6">
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#FF161F14', color: '#FF161F' }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div>
          <h1 className="font-montserrat text-2xl font-extrabold text-gray-900 leading-tight">Criar Novo Tópico</h1>
          <p className="text-sm text-gray-500 mt-0.5">Compartilhe sua dúvida, experiência ou contribuição com a Rede.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ====== Coluna principal: formulário ====== */}
        <div className="flex-1 min-w-0">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-lg text-sm mb-5">
            {error}
          </div>
        )}

        {/* ====== Tipo de tópico ====== */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Tipo de tópico</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TOPIC_TYPES.map(t => {
              const active = type === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => handleTypeChange(t.key)}
                  aria-pressed={active}
                  className={`relative flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-lg border-2 transition cursor-pointer ${
                    active ? 'shadow-sm' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                  style={active ? { borderColor: t.accent, backgroundColor: `${t.accent}0A` } : undefined}
                >
                  {active && (
                    <span
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-sm"
                      style={{ backgroundColor: t.accent }}
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center transition"
                    style={{ backgroundColor: `${t.accent}14`, color: t.accent }}
                  >
                    <t.Icon />
                  </div>
                  <span
                    className="text-xs font-semibold"
                    style={active ? { color: t.accent } : { color: '#374151' }}
                  >
                    {t.label}
                  </span>
                  <span className="text-[10px] text-gray-400 text-center leading-tight">
                    {t.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ====== Título ====== */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Título do tópico <span style={{ color: '#FF161F' }}>*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value.slice(0, MAX_TITLE))}
              placeholder="Digite um título claro e objetivo para o seu tópico"
              className="w-full bg-gray-100 rounded-lg px-4 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-200 pr-16"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium tabular-nums">
              {title.length}/{MAX_TITLE}
            </span>
          </div>
        </div>

        {/* ====== Conteúdo dinâmico por tipo ====== */}

        {/* --- DISCUSSÃO --- */}
        {type === 'discussion' && (
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Sua dissertação</label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Escreva sua dissertação... (use **negrito**, *itálico*, > citação)"
              rows={8}
            />
            <p className="text-xs text-gray-400 mt-1">Sem limite de caracteres. Escreva livremente.</p>
          </div>
        )}

        {/* --- PERGUNTA --- */}
        {type === 'question' && (
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Sua pergunta</label>
            <div className="relative">
              <input
                type="text"
                value={content}
                onChange={e => setContent(e.target.value.slice(0, MAX_QUESTION))}
                placeholder="Digite sua pergunta aqui..."
                className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-red-300 pr-16"
              />
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${
                content.length >= MAX_QUESTION ? 'text-red-500' : 'text-gray-400'
              }`}>
                {MAX_QUESTION - content.length}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Máximo de {MAX_QUESTION} caracteres. Seja objetivo.</p>
          </div>
        )}

        {/* --- VOTAÇÃO --- */}
        {type === 'poll' && (
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Explicação ou pergunta da votação</label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Descreva o contexto da votação..."
              rows={4}
            />

            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Alternativas
                <span className="text-xs text-gray-400 font-normal ml-2">Mínimo 2, máximo 10</span>
              </label>
              <div className="space-y-2">
                {pollOptions.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-bold flex-shrink-0">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={option}
                      onChange={e => updatePollOption(index, e.target.value)}
                      placeholder={`Alternativa ${index + 1}`}
                      className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-red-300"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removePollOption(index)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                        title="Remover alternativa"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {pollOptions.length < 10 && (
                <button
                  type="button"
                  onClick={addPollOption}
                  className="mt-2 flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 font-medium transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Adicionar alternativa
                </button>
              )}
            </div>
          </div>
        )}

        {/* --- IMAGEM --- */}
        {type === 'images' && (
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Explicação</label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Descreva o contexto da imagem..."
              rows={4}
            />

            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Imagem</label>

              {!imagePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-red-400 hover:bg-red-50/30 transition"
                >
                  <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                  <p className="text-sm text-gray-500">Clique para selecionar uma imagem</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG ou GIF (máx. 4MB)</p>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full max-h-80 object-contain rounded-lg border border-gray-200 bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition shadow-lg"
                    title="Remover imagem"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* --- VÍDEO --- */}
        {type === 'video' && (
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Explicação</label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Descreva o contexto do vídeo..."
              rows={4}
            />

            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Link do vídeo</label>
              <input
                type="url"
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... ou https://vimeo.com/..."
                className="w-full bg-gray-100 rounded-lg px-4 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-red-300 placeholder-gray-400"
              />
              <p className="text-xs text-gray-400 mt-1">Cole o link do YouTube, Vimeo ou outra plataforma de vídeo.</p>

              {/* Preview do embed */}
              {videoEmbed && (
                <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
                  <iframe
                    src={videoEmbed}
                    title="Preview do vídeo"
                    className="w-full aspect-video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {videoUrl && !videoEmbed && (
                <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
                  <p className="font-medium">Link detectado</p>
                  <p className="text-xs mt-0.5">O vídeo será exibido como link externo. Para preview automático, use YouTube ou Vimeo.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====== Categoria & Tags ====== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Categoria <span style={{ color: '#FF161F' }}>*</span>
            </label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-200 appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
            >
              <option value="">Selecione uma categoria</option>
              {categories?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1.5">Escolha a categoria mais adequada para o seu tópico.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
              Tags
              <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"
                title="Tags ajudam outros usuários a encontrar seu tópico na busca.">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            </label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="Use vírgulas para separar as tags"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-200 placeholder-gray-400"
            />
            {allTags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {allTags.map(t => {
                  const color = getTagColor(t.name);
                  const selected = selectedTags.includes(t.name);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTag(t.name)}
                      aria-pressed={selected}
                      title={selected ? `Remover tag ${t.name}` : `Adicionar tag ${t.name}`}
                      className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border transition hover:opacity-85"
                      style={selected
                        ? { backgroundColor: color, borderColor: color, color: '#fff' }
                        : { backgroundColor: `${color}14`, borderColor: `${color}33`, color }}
                    >
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" aria-hidden="true">
                        {selected
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          : <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />}
                      </svg>
                      {t.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ====== Botões ====== */}
        <div className="flex items-center justify-end pt-3 border-t border-gray-100 mb-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="bg-gray-100 text-gray-600 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-red-500 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-600 transition shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Publicando...' : 'Publicar Tópico'}
            </button>
          </div>
        </div>
      </form>
        </div>

        {/* ====== Coluna lateral: dicas ====== */}
        <aside className="w-full lg:w-72 flex-shrink-0 space-y-4">
          <div className="rounded-lg p-5" style={{ backgroundColor: '#034EA20A', border: '1px solid #034EA226' }}>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4" style={{ color: '#034EA2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
              <h2 className="text-sm font-bold text-gray-800">Dicas para um bom tópico</h2>
            </div>
            <ul className="space-y-2">
              {[
                'Seja claro e objetivo no título.',
                'Forneça o máximo de detalhes possível.',
                'Verifique se sua dúvida já não foi respondida.',
                'Escolha a categoria correta para facilitar a busca.',
                'Use tags relevantes para alcançar mais pessoas.',
              ].map(tip => (
                <li key={tip} className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
                  <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#0B9247' }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <h2 className="text-sm font-bold text-gray-800">Antes de publicar</h2>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              Verifique se sua dúvida já foi respondida no fórum.
            </p>
            <button
              type="button"
              onClick={scrollToRelated}
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {relatedTopics.length > 0
                ? `Pesquisar tópicos semelhantes (${relatedTopics.length})`
                : 'Pesquisar tópicos semelhantes'}
            </button>
          </div>
        </aside>
      </div>

      {/* ====== Tópicos Relacionados ====== */}
      {(() => {
        if (relatedTopics.length === 0) return null;

        return (
          <div ref={relatedRef} id="topicos-relacionados" className="mb-8 scroll-mt-20">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium text-gray-700">
                Tópicos relacionados que podem ser interessantes
              </p>
              <span className="text-xs text-gray-400">— Verifique se sua dúvida já foi respondida</span>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="flex items-center py-2.5 px-4 text-xs text-gray-500 font-medium uppercase tracking-wider border-b border-gray-200 bg-gray-50">
                <div className="flex-1">Tópico</div>
                <div className="w-28 text-center hidden md:block mx-2">Categoria</div>
                <div className="w-24 text-center mx-2">Respostas</div>
                <div className="w-28 text-center hidden sm:block mx-2">Visualizações</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-gray-50">
                {relatedTopics.map(topic => (
                  <div key={topic.id} className="flex items-center py-3 px-4 hover:bg-gray-50 transition">
                    <div className="mr-3 flex-shrink-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: getAvatarColor(topic.username) }}
                      >
                        {topic.username?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {topic.pinned === 1 && <span className="text-gray-400 text-sm">&#x1F4CC;</span>}
                        {topic.locked === 1 && <span className="text-gray-400 text-sm">&#x1F512;</span>}
                        <Link
                          to={`/topic/${topic.id}`}
                          className="text-gray-800 font-medium text-sm hover:text-blue-600 transition truncate"
                        >
                          {topic.title}
                        </Link>
                      </div>
                      {topic.tags?.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {topic.tags.map(tag => (
                            <span key={tag} className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-sm font-medium">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="w-28 text-center hidden md:flex justify-center mx-2">
                      <span
                        className="text-xs text-white px-2.5 py-1 rounded-sm font-medium truncate"
                        style={{ backgroundColor: topic.category_color }}
                      >
                        {topic.category_name}
                      </span>
                    </div>
                    <div className="w-24 text-center text-sm font-bold text-gray-800 mx-2">{topic.reply_count}</div>
                    <div className="w-28 text-center text-sm text-gray-500 hidden sm:block mx-2">{formatNumber(topic.views)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
