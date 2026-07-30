import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { getAvatarColor } from '../utils/formatters';
import { useState } from 'react';
import Breadcrumbs from '../components/Breadcrumbs';

function formatDateLong(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });
}

const ROLE_LABELS = { user: 'Usuário', especialista: 'Especialista', moderator: 'Moderador', admin: 'Administrador' };
const ROLE_STYLES = {
  user: 'bg-gray-100 text-gray-600',
  especialista: 'bg-[#034EA214] text-[#034EA2]',
  moderator: 'bg-blue-100 text-blue-700',
  admin: 'bg-yellow-100 text-yellow-700',
};

export default function UserProfile() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [editingCategories, setEditingCategories] = useState(false);
  const [selectedCats, setSelectedCats] = useState([]);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', id],
    queryFn: () => apiFetch(`/users/${id}`),
  });

  const { data: allCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch('/categories'),
  });

  function startEditCategories() {
    setSelectedCats(profile?.categories?.map(c => c.id) || []);
    setEditingCategories(true);
  }

  function toggleCategory(catId) {
    setSelectedCats(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  }

  async function saveCategories() {
    try {
      await apiFetch('/auth/categories', {
        method: 'PUT',
        body: JSON.stringify({ category_ids: selectedCats }),
      }, token);
      setEditingCategories(false);
      queryClient.invalidateQueries({ queryKey: ['user-profile', id] });
    } catch (err) { alert(err.message); }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-400">Carregando...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center text-gray-400">
        Usuário não encontrado.
      </div>
    );
  }

  const isOwnProfile = user && user.id === profile.id;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Breadcrumbs
        className="mb-5"
        items={[
          { label: 'Início', to: '/' },
          { label: 'Fórum de Discussões', to: '/forum' },
          { label: profile.username },
        ]}
      />

      {/* Card principal */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header com avatar */}
        <div className="bg-gray-50 px-6 py-8 flex flex-col items-center border-b border-gray-200">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-3xl mb-4"
            style={{ backgroundColor: getAvatarColor(profile.username) }}
          >
            {profile.username?.[0]?.toUpperCase() ?? '?'}
          </div>
          <h1 className="text-xl font-bold text-gray-800">{profile.username}</h1>
          <span className={`text-xs px-3 py-1 rounded-full font-medium mt-2 ${ROLE_STYLES[profile.role] || ROLE_STYLES.user}`}>
            {ROLE_LABELS[profile.role] || 'Usuário'}
          </span>

          {/* Especializações verificadas */}
          {profile.specialties?.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {profile.specialties.map(s => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: '#034EA2' }}
                  title={`Especialista verificado em ${s.name}`}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-6 py-6 space-y-4">
          {/* Localização */}
          {profile.location && (
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <p className="text-xs text-gray-400 uppercase font-medium">Localização</p>
                <p className="text-sm text-gray-700">{profile.location}</p>
              </div>
            </div>
          )}

          {/* Órgão */}
          {profile.organization && (
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <div>
                <p className="text-xs text-gray-400 uppercase font-medium">Órgão</p>
                <p className="text-sm text-gray-700">{profile.organization}</p>
              </div>
            </div>
          )}

          {/* Área de trabalho / Bio */}
          {profile.bio && (
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-xs text-gray-400 uppercase font-medium">Área de trabalho</p>
                <p className="text-sm text-gray-700">{profile.bio}</p>
              </div>
            </div>
          )}

          {/* Membro desde */}
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium">Membro desde</p>
              <p className="text-sm text-gray-700">{formatDateLong(profile.created_at)}</p>
            </div>
          </div>

          {/* Categorias de interesse */}
          {(profile.categories?.length > 0 || isOwnProfile) && (
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400 uppercase font-medium">Categorias de interesse</p>
                {isOwnProfile && !editingCategories && (
                  <button onClick={startEditCategories} className="text-xs text-blue-600 hover:underline">
                    Editar
                  </button>
                )}
              </div>

              {editingCategories ? (
                <div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {allCategories?.map(cat => (
                      <label key={cat.id} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCats.includes(cat.id)}
                          onChange={() => toggleCategory(cat.id)}
                          className="rounded border-gray-300 text-red-500 focus:ring-red-300"
                        />
                        <span
                          className="text-xs font-medium text-white px-2 py-0.5 rounded-sm"
                          style={{ backgroundColor: cat.color }}
                        >
                          {cat.name}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveCategories} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-600 transition">Salvar</button>
                    <button onClick={() => setEditingCategories(false)} className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-200 transition">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {profile.categories?.length > 0 ? (
                    profile.categories.map(cat => (
                      <Link key={cat.id} to={`/category/${cat.id}`}
                        className="text-xs font-medium text-white px-2.5 py-1 rounded-sm hover:opacity-80 transition"
                        style={{ backgroundColor: cat.color }}
                      >
                        {cat.name}
                      </Link>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400">Nenhuma categoria selecionada</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Estatisticas */}
          <div className="flex gap-6 pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-800">{profile.topic_count}</p>
              <p className="text-xs text-gray-400">Tópicos</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-800">{profile.post_count}</p>
              <p className="text-xs text-gray-400">Posts</p>
            </div>
          </div>
        </div>

        {/* Acoes */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
          {isOwnProfile ? (
            <span className="text-sm text-gray-400">Este é o seu perfil</span>
          ) : user ? (
            <Link
              to={`/messages/${profile.id}`}
              className="flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-600 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Enviar Mensagem
            </Link>
          ) : (
            <p className="text-sm text-gray-400">
              <Link to="/login" className="text-blue-600 hover:underline">Entre</Link> para enviar mensagens.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
