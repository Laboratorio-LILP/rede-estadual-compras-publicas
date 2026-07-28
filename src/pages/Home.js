import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { getAvatarColor, timeAgoLong, formatNumber } from '../utils/formatters';
import { useState } from 'react';

const PER_PAGE_OPTIONS = [10, 20, 50];

const SORT_OPTIONS = [
  {
    key: '',
    label: 'Todos',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />,
  },
  {
    key: 'new',
    label: 'Novos',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },
  {
    key: 'top',
    label: 'Mais Curtidos',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 10-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />,
  },
  {
    key: 'views',
    label: 'Mais Visualizados',
    icon: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </>
    ),
  },
  {
    key: 'replies',
    label: 'Mais Respondidos',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />,
  },
];

export default function Home() {
  const { user, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = searchParams.get('sort') || '';
  const categoryFilter = searchParams.get('category') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const perPage = PER_PAGE_OPTIONS.includes(parseInt(searchParams.get('per_page')))
    ? parseInt(searchParams.get('per_page'))
    : 20;
  const [showGuestBanner, setShowGuestBanner] = useState(() => sessionStorage.getItem('guestBannerDismissed') !== 'true');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch('/categories'),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['topics', sort, categoryFilter, page, perPage, !!token],
    queryFn: () => {
      const params = new URLSearchParams();
      if (sort) params.set('sort', sort);
      if (categoryFilter) params.set('category_id', categoryFilter);
      if (page > 1) params.set('page', page);
      params.set('per_page', perPage);
      const qs = params.toString();
      return apiFetch(`/topics${qs ? `?${qs}` : ''}`, {}, token);
    },
  });

  const topics = data?.topics;
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;
  const rangeStart = total === 0 ? 0 : (page - 1) * perPage + 1;
  const rangeEnd = Math.min(page * perPage, total);

  function handleSort(newSort) {
    const params = new URLSearchParams(searchParams);
    if (newSort) params.set('sort', newSort);
    else params.delete('sort');
    params.delete('page');
    setSearchParams(params);
  }

  function handleCategoryChange(catId) {
    const params = new URLSearchParams(searchParams);
    if (catId) params.set('category', catId);
    else params.delete('category');
    params.delete('page');
    setSearchParams(params);
  }

  function handlePageChange(newPage) {
    const params = new URLSearchParams(searchParams);
    if (newPage > 1) params.set('page', newPage);
    else params.delete('page');
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handlePerPageChange(newPerPage) {
    const params = new URLSearchParams(searchParams);
    if (newPerPage !== 20) params.set('per_page', newPerPage);
    else params.delete('per_page');
    params.delete('page');
    setSearchParams(params);
  }

  async function handleLock(topicId) {
    try {
      await apiFetch(`/topics/${topicId}/lock`, { method: 'PUT' }, token);
      refetch();
    } catch (err) { alert(err.message); }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-400">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-4">
        <Link to="/" className="hover:text-[#034EA2]">Início</Link>
        <span className="mx-2 text-gray-300">/</span>
        <span className="font-medium text-gray-700">Fórum</span>
      </div>

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#FF161F14', color: '#FF161F' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h1 className="font-montserrat text-2xl font-extrabold text-gray-900 leading-tight">Fórum de Discussões</h1>
            <p className="text-sm text-gray-500 mt-0.5">Participe das discussões, tire dúvidas e compartilhe experiências com a Rede.</p>
          </div>
        </div>
        <Link
          to="/new-topic"
          className="inline-flex items-center justify-center gap-1.5 text-sm text-white font-semibold px-4 py-2.5 rounded transition hover:opacity-90 flex-shrink-0"
          style={{ backgroundColor: '#FF161F' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Novo tópico
        </Link>
      </div>

      {/* Cartão do fórum */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
        {/* Barra de filtros */}
        <div className="flex items-center justify-between py-3 px-4 border-b border-gray-200 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key || 'todos'}
                onClick={() => handleSort(opt.key)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition ${
                  sort === opt.key
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={sort === opt.key ? { backgroundColor: '#FF161F' } : undefined}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  {opt.icon}
                </svg>
                {opt.label}
              </button>
            ))}
          </div>
          <select
            value={categoryFilter}
            onChange={e => handleCategoryChange(e.target.value)}
            aria-label="Filtrar por categoria"
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Todas as categorias</option>
            {categories?.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Header da tabela */}
        <div className="flex items-center py-2.5 px-4 text-xs text-gray-500 font-medium uppercase tracking-wider border-b border-gray-200 bg-gray-50">
          <div className="flex-1">Tópico</div>
          <div className="w-28 text-right hidden md:block mr-4">Categoria</div>
          <div className="w-20 text-center font-bold text-gray-700 mr-4">Respostas</div>
          <div className="w-24 text-center hidden sm:block mr-4">Visualizações</div>
          <div className="w-28 text-right hidden lg:block">Atividade</div>
        </div>

        {/* Lista de tópicos */}
        <div className="divide-y divide-gray-100">
          {topics?.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              Nenhum tópico ainda. Seja o primeiro a criar!
            </div>
          )}

          {topics?.map((topic, i) => (
            <div key={topic.id}>
              {/* Banner de convidado - aparece depois do 5º tópico */}
              {i === 5 && !user && showGuestBanner && (
                <div className="flex items-center justify-between bg-gray-700 text-white px-5 py-3 -mx-0">
                  <span className="text-sm font-bold">Parece que você é novo aqui. Registre-se de graça, aprenda e contribua!</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link to="/login" className="text-sm px-4 py-1.5 rounded border border-gray-400 hover:bg-gray-600 transition">
                      Entrar
                    </Link>
                    <Link to="/register" className="text-sm px-4 py-1.5 rounded bg-red-600 hover:bg-red-700 transition font-medium">
                      Inscrever
                    </Link>
                    <button onClick={() => { sessionStorage.setItem('guestBannerDismissed', 'true'); setShowGuestBanner(false); }} aria-label="Fechar banner" className="text-gray-400 hover:text-white ml-1 transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Linha do tópico */}
              <div className={`flex items-center py-3 px-4 hover:bg-gray-50 transition group ${
                topic.status === 'pending' ? 'opacity-70 bg-yellow-50/50' : ''
              }`}>
                {/* Avatar */}
                <div className="mr-3 flex-shrink-0">
                  <Link to={`/user/${topic.user_id}`}>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm hover:opacity-80 transition"
                      style={{ backgroundColor: getAvatarColor(topic.username) }}
                    >
                      {topic.username?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  </Link>
                </div>

                {/* Título + tags */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
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
                    {/* Admin lock button for unlocked topics */}
                    {topic.locked !== 1 && user?.role === 'admin' && (
                      <button onClick={() => handleLock(topic.id)} title="Bloquear tópico"
                        className="text-gray-200 hover:text-red-400 transition opacity-0 group-hover:opacity-100">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                      </button>
                    )}
                    <Link
                      to={`/topic/${topic.id}`}
                      className={`font-medium text-sm hover:text-blue-600 transition truncate ${
                        topic.status === 'pending' ? 'text-gray-500' : 'text-gray-800'
                      }`}
                    >
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
                        <span key={tag} className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-sm font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Categoria badge */}
                <div className="w-28 hidden md:flex justify-end mr-4">
                  <Link
                    to={`/category/${topic.category_id}`}
                    className="text-xs text-white px-2.5 py-1 rounded-sm font-medium truncate"
                    style={{ backgroundColor: topic.category_color }}
                  >
                    {topic.category_name}
                  </Link>
                </div>

                {/* Respostas */}
                <div className="w-20 text-center text-sm font-bold text-gray-800 mr-4">
                  {topic.reply_count}
                </div>

                {/* Views */}
                <div className="w-24 text-center text-sm text-gray-500 hidden sm:block mr-4">
                  {formatNumber(topic.views)}
                </div>

                {/* Atividade */}
                <div className="w-28 text-right text-xs text-gray-400 hidden lg:block">
                  {timeAgoLong(topic.last_activity)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Paginação */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4 px-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 order-2 sm:order-1">
              Mostrando <span className="font-semibold text-gray-700">{rangeStart}</span> a{' '}
              <span className="font-semibold text-gray-700">{rangeEnd}</span> de{' '}
              <span className="font-semibold text-gray-700">{total}</span> tópicos
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === '...' ? (
                      <span key={`dot-${idx}`} className="px-2 text-gray-400 text-sm">...</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => handlePageChange(item)}
                        className={`w-8 h-8 text-sm rounded-lg transition ${
                          page === item
                            ? 'text-white font-bold'
                            : 'border border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                        style={page === item ? { backgroundColor: '#FF161F' } : undefined}
                      >
                        {item}
                      </button>
                    )
                  )}
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Próximo
                </button>
              </div>
            )}

            <label className="flex items-center gap-1.5 text-xs text-gray-500 order-3 flex-shrink-0">
              Mostrar
              <select
                value={perPage}
                onChange={e => handlePerPageChange(parseInt(e.target.value))}
                aria-label="Tópicos por página"
                className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 bg-white outline-none focus:ring-2 focus:ring-blue-200"
              >
                {PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              por página
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
