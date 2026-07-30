import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { getAvatarColor, formatNumber } from '../utils/formatters';
import { useState } from 'react';
import Breadcrumbs from '../components/Breadcrumbs';

const SORT_OPTIONS = [
  { key: '', label: 'Recentes' },
  { key: 'new', label: 'Novos' },
  { key: 'top', label: 'Mais Curtidos' },
  { key: 'views', label: 'Mais Visualizados' },
  { key: 'replies', label: 'Mais Respondidos' },
];

export default function Category() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = searchParams.get('sort') || '';
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', tags: '' });
  const [error, setError] = useState('');

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => apiFetch('/categories') });
  const { data: topics, isLoading, refetch } = useQuery({
    queryKey: ['topics', id, sort, !!token],
    queryFn: () => apiFetch(`/categories/${id}/topics${sort ? `?sort=${sort}` : ''}`, {}, token),
  });
  const { data: allTags } = useQuery({ queryKey: ['tags'], queryFn: () => apiFetch('/tags') });

  async function handleLock(topicId) {
    try {
      await apiFetch(`/topics/${topicId}/lock`, { method: 'PUT' }, token);
      refetch();
    } catch (err) { alert(err.message); }
  }

  const category = categories?.find(c => c.id === parseInt(id));

  async function handleCreateTopic(e) {
    e.preventDefault();
    setError('');
    try {
      const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      await apiFetch('/topics', {
        method: 'POST',
        body: JSON.stringify({ title: form.title, content: form.content, category_id: id, tags }),
      }, token);
      setForm({ title: '', content: '', tags: '' });
      setShowNewTopic(false);
      refetch();
    } catch (err) { setError(err.message); }
  }

  if (isLoading) return <div className="flex justify-center items-center h-64 text-gray-400">Carregando...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Breadcrumbs
        className="mb-4"
        items={[
          { label: 'Início', to: '/' },
          { label: 'Fórum de Discussões', to: '/forum' },
          { label: 'Categorias', to: '/categories' },
          { label: category?.name || 'Categoria', color: category?.color },
        ]}
      />

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="w-4 h-4 rounded-full" style={{ backgroundColor: category?.color }} />
          <h1 className="text-xl font-bold text-gray-800">{category?.name}</h1>
          <span className="text-sm text-gray-400">{topics?.length || 0} tópicos</span>
        </div>
        {user && (
          <button onClick={() => setShowNewTopic(!showNewTopic)}
            className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition">
            + Novo Tópico
          </button>
        )}
      </div>

      {!user && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-5 text-center text-sm text-gray-600">
          <Link to="/login" className="text-blue-600 font-medium hover:underline">Entre</Link> ou{' '}
          <Link to="/register" className="text-red-500 font-medium hover:underline">cadastre-se</Link> para criar tópicos.
        </div>
      )}

      {showNewTopic && (
        <form onSubmit={handleCreateTopic} className="bg-white border border-gray-200 rounded-lg p-5 mb-5 shadow-sm">
          <h3 className="font-bold text-gray-700 text-sm mb-3">Novo Tópico</h3>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <input type="text" placeholder="Título" value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" required />
          <textarea placeholder="Conteúdo..." value={form.content}
            onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 h-28 resize-none" required />
          <input type="text" placeholder="Tags (separadas por virgula)" value={form.tags}
            onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
          {allTags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {allTags.map(t => (
                <button key={t.id} type="button"
                  onClick={() => {
                    const tags = form.tags ? form.tags.split(',').map(s => s.trim()) : [];
                    if (!tags.includes(t.name)) setForm(p => ({ ...p, tags: [...tags, t.name].join(', ') }));
                  }}
                  className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded hover:bg-gray-200 transition">
                  + {t.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button type="submit" className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition">Publicar</button>
            <button type="button" onClick={() => setShowNewTopic(false)} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 transition">Cancelar</button>
          </div>
        </form>
      )}

      {/* Filtros de ordenação */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => {
              const params = new URLSearchParams(searchParams);
              if (opt.key) params.set('sort', opt.key);
              else params.delete('sort');
              setSearchParams(params);
            }}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
              sort === opt.key
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table header */}
      <div className="flex items-center py-2.5 px-4 text-xs text-gray-500 font-medium uppercase tracking-wider border-b border-gray-200 bg-gray-50">
        <div className="flex-1">Tópico</div>
        <div className="w-20 text-center font-bold text-gray-700 mr-4">Respostas</div>
        <div className="w-28 text-center hidden sm:block">Visualizações</div>
      </div>

      <div className="divide-y divide-gray-100">
        {topics?.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">Nenhum tópico nesta categoria. Seja o primeiro!</div>
        )}
        {topics?.map(topic => (
          <div key={topic.id} className="flex items-center py-3 px-4 hover:bg-gray-50 transition group">
            <div className="mr-3 flex-shrink-0">
              <Link to={`/user/${topic.user_id}`}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm hover:opacity-80 transition"
                  style={{ backgroundColor: getAvatarColor(topic.username) }}>
                  {topic.username?.[0]?.toUpperCase() ?? '?'}
                </div>
              </Link>
            </div>
            <div className="flex flex-1 min-w-0 items-start gap-1.5">
              {(topic.pinned === 1 || topic.locked === 1 || user?.role === 'admin') && (
                <div className="flex flex-shrink-0 items-center gap-1 pt-0.5">
                  {topic.pinned === 1 && <span className="text-gray-400 text-sm" title="Fixado">&#x1F4CC;</span>}
                  {topic.locked === 1 && (
                    user?.role === 'admin' ? (
                      <button onClick={() => handleLock(topic.id)} title="Desbloquear tópico" className="text-gray-400 hover:text-green-500 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </button>
                    ) : (
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" title="Bloqueado">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )
                  )}
                  {topic.locked !== 1 && user?.role === 'admin' && (
                    <button onClick={() => handleLock(topic.id)} title="Bloquear tópico"
                      className="text-gray-200 hover:text-red-400 transition opacity-0 group-hover:opacity-100">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Link to={`/topic/${topic.id}`} className={`font-medium text-sm hover:text-blue-600 transition truncate ${
                    topic.status === 'pending' ? 'text-gray-500' : 'text-gray-800'
                  }`}>
                    {topic.title}
                  </Link>
                  {topic.status === 'pending' && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full flex-shrink-0">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Em análise
                    </span>
                  )}
                </div>
                {topic.tags?.length > 0 && (
                  <div className="flex gap-1.5 mt-1">
                    {topic.tags.map(tag => (
                      <span key={tag} className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-sm font-medium">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="w-20 text-center text-sm font-bold text-gray-800 mr-4">{topic.reply_count}</div>
            <div className="w-28 text-center text-sm text-gray-500 hidden sm:block">{formatNumber(topic.views)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
