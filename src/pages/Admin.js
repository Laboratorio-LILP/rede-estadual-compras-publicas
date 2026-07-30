import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState, useRef } from 'react';

function timeAgoAdmin(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr + 'Z');
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d atrás`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

const ROLE_LABELS = {
  user: 'Usuário',
  especialista: 'Especialista',
  moderator: 'Moderador',
  admin: 'Admin',
};

const ROLE_STYLES = {
  user: 'bg-gray-100 text-gray-600',
  especialista: 'bg-emerald-100 text-emerald-700',
  moderator: 'bg-blue-100 text-blue-700',
  admin: 'bg-yellow-100 text-yellow-700',
};

function CategoryDropdown({ userId, userCategories, allCategories, token, onUpdate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = userCategories?.map(c => c.id) || [];

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function toggle(catId) {
    const newIds = selected.includes(catId)
      ? selected.filter(id => id !== catId)
      : [...selected, catId];
    try {
      const cats = await apiFetch(`/admin/users/${userId}/categories`, {
        method: 'PUT',
        body: JSON.stringify({ category_ids: newIds }),
      }, token);
      onUpdate(userId, cats);
    } catch (err) { alert(err.message); }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded px-2 py-1 transition"
      >
        <span>{selected.length ? `${selected.length} selecionada${selected.length > 1 ? 's' : ''}` : 'Nenhuma'}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-gray-700 text-white rounded-lg shadow-xl py-1 min-w-[200px] max-h-64 overflow-y-auto">
          {allCategories?.map(cat => (
            <label key={cat.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-600 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={selected.includes(cat.id)}
                onChange={() => toggle(cat.id)}
                className="rounded border-gray-400 text-blue-500 focus:ring-blue-500"
              />
              {cat.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('moderation');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [newResource, setNewResource] = useState({ title: '', url: '', type: 'curso', source: '' });
  const [addingResource, setAddingResource] = useState(false);
  const [addResourceMsg, setAddResourceMsg] = useState('');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [specialtyUserId, setSpecialtyUserId] = useState('');
  const [specialtyCategoryId, setSpecialtyCategoryId] = useState('');
  const [specialtySaving, setSpecialtySaving] = useState(false);
  const [specialtyMsg, setSpecialtyMsg] = useState('');

  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'moderator') navigate('/');
  }, [user, navigate]);

  // ====== Usuarios (admin only) ======
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiFetch('/admin/users', {}, token),
    enabled: !!token && user?.role === 'admin',
  });

  // ====== Categorias ======
  const { data: allCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch('/categories'),
    enabled: !!token && user?.role === 'admin',
  });

  function handleCategoryUpdate(userId, cats) {
    refetchUsers();
  }

  // ====== Designacao de especialistas ======
  async function handleGrantSpecialty() {
    if (!specialtyUserId || !specialtyCategoryId) {
      setSpecialtyMsg('Selecione a pessoa e o tema.');
      return;
    }
    setSpecialtySaving(true);
    setSpecialtyMsg('');
    try {
      await apiFetch(`/admin/users/${specialtyUserId}/specialties/${specialtyCategoryId}`, {
        method: 'POST',
      }, token);
      await refetchUsers();
      setSpecialtyCategoryId('');
      setSpecialtyMsg('Especialização designada com sucesso.');
    } catch (err) {
      setSpecialtyMsg(err.message);
    } finally {
      setSpecialtySaving(false);
    }
  }

  async function handleRevokeSpecialty(userId, categoryId, username, categoryName) {
    if (!window.confirm(`Remover a designação de ${username} em "${categoryName}"?`)) return;
    try {
      await apiFetch(`/admin/users/${userId}/specialties/${categoryId}`, { method: 'DELETE' }, token);
      await refetchUsers();
    } catch (err) {
      alert(err.message);
    }
  }

  // ====== Resources ======
  const { data: resources, refetch: refetchResources } = useQuery({
    queryKey: ['admin-resources'],
    queryFn: () => apiFetch('/resources'),
    enabled: !!token && user?.role === 'admin',
  });

  async function handleImportPlaylist() {
    if (!playlistUrl) return;
    const match = playlistUrl.match(/[?&]list=([^&]+)/);
    if (!match) { setImportMsg('URL inválida. Cole a URL da playlist do YouTube.'); return; }
    setImporting(true);
    setImportMsg('');
    try {
      const data = await apiFetch('/admin/resources/import-playlist', {
        method: 'POST',
        body: JSON.stringify({ playlist_id: match[1] }),
      }, token);
      setImportMsg(`${data.imported} vídeos importados (${data.total} total na playlist)`);
      setPlaylistUrl('');
      refetchResources();
    } catch (err) {
      setImportMsg('Erro: ' + err.message);
    } finally {
      setImporting(false);
    }
  }

  async function handleAddResource() {
    if (!newResource.title || !newResource.url) return;
    setAddingResource(true);
    setAddResourceMsg('');
    try {
      await apiFetch('/admin/resources', {
        method: 'POST',
        body: JSON.stringify({
          title: newResource.title,
          url: newResource.url,
          type: newResource.type,
          source: newResource.source || undefined,
        }),
      }, token);
      setAddResourceMsg('Recurso adicionado com sucesso!');
      setNewResource({ title: '', url: '', type: 'curso', source: '' });
      refetchResources();
    } catch (err) {
      setAddResourceMsg('Erro: ' + err.message);
    } finally {
      setAddingResource(false);
    }
  }

  async function handleDeleteResource(id) {
    if (!window.confirm('Tem certeza que deseja remover este recurso?')) return;
    try {
      await apiFetch(`/admin/resources/${id}`, { method: 'DELETE' }, token);
      refetchResources();
    } catch (err) { alert(err.message); }
  }

  // ====== Topicos pendentes (admin e moderador) ======
  const { data: pendingTopics, isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ['admin-pending-topics'],
    queryFn: () => apiFetch('/admin/topics/pending', {}, token),
    enabled: !!token && (user?.role === 'admin' || user?.role === 'moderator'),
    refetchInterval: 15000,
  });

  async function handleBan(userId) {
    const user = users?.find(u => u.id === userId);
    const action = user?.banned ? 'desbanir' : 'banir';
    if (!window.confirm(`Tem certeza que deseja ${action} este usuário?`)) return;
    try { await apiFetch(`/admin/users/${userId}/ban`, { method: 'PUT' }, token); refetchUsers(); }
    catch (err) { alert(err.message); }
  }

  async function handleChangeRole(userId, newRole) {
    try {
      await apiFetch(`/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      }, token);
      refetchUsers();
    } catch (err) { alert(err.message); }
  }

  async function handleDelete(userId, username) {
    if (!window.confirm(`Tem certeza que deseja deletar o usuário "${username}"? Isso removerá todos os posts e dados.`)) return;
    try { await apiFetch(`/admin/users/${userId}`, { method: 'DELETE' }, token); refetchUsers(); }
    catch (err) { alert(err.message); }
  }

  async function handleApprove(topicId) {
    try {
      await apiFetch(`/admin/topics/${topicId}/approve`, { method: 'PUT' }, token);
      refetchPending();
    } catch (err) { alert(err.message); }
  }

  async function handleReject(topicId, title) {
    if (!window.confirm(`Tem certeza que deseja rejeitar o tópico "${title}"?`)) return;
    try {
      await apiFetch(`/admin/topics/${topicId}/reject`, { method: 'PUT' }, token);
      refetchPending();
    } catch (err) { alert(err.message); }
  }

  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) return null;

  const pendingCount = pendingTopics?.length || 0;
  const selectedSpecialtyUser = users?.find(u => String(u.id) === specialtyUserId);
  const availableSpecialtyCategories = allCategories?.filter(
    category => !selectedSpecialtyUser?.specialties?.some(specialty => specialty.id === category.id)
  ) || [];
  const specialistAssignments = (users || []).flatMap(specialist =>
    (specialist.specialties || []).map(specialty => ({ specialist, specialty }))
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-800 mb-5">Administração</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('moderation')}
          className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition relative ${
            activeTab === 'moderation'
              ? 'bg-white border border-b-white border-gray-200 -mb-px text-gray-800'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Moderação
          {pendingCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-yellow-500 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        {user.role === 'admin' && (
          <>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition ${
                activeTab === 'users'
                  ? 'bg-white border border-b-white border-gray-200 -mb-px text-gray-800'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Usuários ({users?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('specialists')}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition ${
                activeTab === 'specialists'
                  ? 'bg-white border border-b-white border-gray-200 -mb-px text-gray-800'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Especialistas ({specialistAssignments.length})
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition ${
                activeTab === 'resources'
                  ? 'bg-white border border-b-white border-gray-200 -mb-px text-gray-800'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Capacitação ({resources?.length || 0})
            </button>
          </>
        )}
      </div>

      {/* ====== Aba Moderação ====== */}
      {activeTab === 'moderation' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tópicos Pendentes ({pendingCount})
            </span>
            {pendingCount === 0 && (
              <span className="text-xs text-green-600 font-medium">Nenhum tópico pendente</span>
            )}
          </div>

          {pendingLoading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Carregando...</div>
          ) : pendingCount === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-400">Todos os tópicos foram analisados</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {pendingTopics.map(topic => (
                <div key={topic.id} className="p-5 hover:bg-gray-50 transition">
                  <div className="flex items-start gap-4">
                    {/* Info do tópico */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">
                          {topic.type === 'images' ? '📷 Imagem' : topic.type === 'video' ? '🎬 Vídeo' : topic.type}
                        </span>
                        <span
                          className="text-xs text-white px-2 py-0.5 rounded font-medium"
                          style={{ backgroundColor: topic.category_color }}
                        >
                          {topic.category_name}
                        </span>
                      </div>

                      <Link to={`/topic/${topic.id}`} className="text-sm font-semibold text-gray-800 hover:text-blue-600 transition">
                        {topic.title}
                      </Link>

                      <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
                        <span>por <Link to={`/user/${topic.user_id}`} className="font-medium text-gray-500 hover:text-blue-600">{topic.username}</Link></span>
                        <span>·</span>
                        <span>{timeAgoAdmin(topic.created_at)}</span>
                      </div>

                      {/* Preview do conteúdo */}
                      {topic.first_post_content && (
                        <p className="mt-2 text-xs text-gray-500 line-clamp-2 leading-relaxed">
                          {topic.first_post_content.substring(0, 200)}{topic.first_post_content.length > 200 ? '...' : ''}
                        </p>
                      )}

                      {/* Preview da imagem */}
                      {topic.image_url && topic.image_url.startsWith('data:') && (
                        <div className="mt-2">
                          <img
                            src={topic.image_url}
                            alt="Preview"
                            className="max-h-32 rounded border border-gray-200 object-contain"
                          />
                        </div>
                      )}

                      {/* Preview do vídeo */}
                      {topic.video_url && (
                        <div className="mt-2 text-xs text-blue-500 truncate">
                          🔗 {topic.video_url}
                        </div>
                      )}
                    </div>

                    {/* Botões de ação */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApprove(topic.id)}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-green-500 rounded-lg hover:bg-green-600 transition shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Aprovar
                      </button>
                      <button
                        onClick={() => handleReject(topic.id, topic.title)}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Rejeitar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ====== Aba Usuários (admin only) ====== */}
      {activeTab === 'users' && user.role === 'admin' && (() => {
        const filteredUsers = users?.filter(u => {
          if (userSearch) {
            const q = userSearch.toLowerCase();
            if (!u.username?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) return false;
          }
          if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
          if (userStatusFilter === 'active' && u.banned) return false;
          if (userStatusFilter === 'banned' && !u.banned) return false;
          return true;
        }) || [];
        return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-visible">
          {/* Barra de filtros */}
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuários ({filteredUsers.length}{filteredUsers.length !== (users?.length || 0) ? ` de ${users?.length}` : ''})
              </span>
              {/* Busca */}
              <div className="relative">
                <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 outline-none focus:border-blue-400 w-56"
                />
                {userSearch && (
                  <button onClick={() => setUserSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {/* Filtro por papel */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">Papel:</span>
                <div className="flex gap-1">
                  {[
                    { key: 'all', label: 'Todos' },
                    { key: 'admin', label: 'Admin', style: 'bg-yellow-100 text-yellow-700' },
                    { key: 'moderator', label: 'Moderador', style: 'bg-blue-100 text-blue-700' },
                    { key: 'especialista', label: 'Especialista', style: 'bg-emerald-100 text-emerald-700' },
                    { key: 'user', label: 'Usuário', style: 'bg-gray-100 text-gray-600' },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setUserRoleFilter(f.key)}
                      className={`px-2.5 py-1 text-xs rounded-full font-medium transition ${
                        userRoleFilter === f.key
                          ? (f.key === 'all' ? 'bg-gray-700 text-white' : f.style + ' ring-2 ring-offset-1 ring-gray-300')
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Filtro por status */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">Status:</span>
                <div className="flex gap-1">
                  {[
                    { key: 'all', label: 'Todos' },
                    { key: 'active', label: 'Ativos', style: 'bg-green-100 text-green-700' },
                    { key: 'banned', label: 'Banidos', style: 'bg-red-100 text-red-700' },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setUserStatusFilter(f.key)}
                      className={`px-2.5 py-1 text-xs rounded-full font-medium transition ${
                        userStatusFilter === f.key
                          ? (f.key === 'all' ? 'bg-gray-700 text-white' : f.style + ' ring-2 ring-offset-1 ring-gray-300')
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {usersLoading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Carregando...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <p className="text-sm text-gray-400">Nenhum usuário encontrado com esses filtros</p>
              <button
                onClick={() => { setUserSearch(''); setUserRoleFilter('all'); setUserStatusFilter('all'); }}
                className="mt-2 text-xs text-blue-500 hover:text-blue-700 transition"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-2.5">Usuário</th>
                  <th className="text-left px-5 py-2.5 hidden sm:table-cell">Email</th>
                  <th className="text-left px-5 py-2.5">Papel</th>
                  <th className="text-left px-5 py-2.5 hidden lg:table-cell">Categorias</th>
                  <th className="text-left px-5 py-2.5">Status</th>
                  <th className="text-left px-5 py-2.5 hidden sm:table-cell">Desde</th>
                  <th className="text-center px-5 py-2.5">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map(u => (
                  <tr key={u.id} className={u.banned ? 'bg-red-50' : 'hover:bg-gray-50'}>
                    <td className="px-5 py-3">
                      <Link to={`/user/${u.id}`} className="flex items-center gap-2 hover:opacity-80 transition">
                        <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold text-xs">
                          {u.username?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <span className="font-medium text-gray-800 hover:text-blue-600 transition">{u.username}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{u.email}</td>
                    <td className="px-5 py-3">
                      {u.id !== user.id && u.role !== 'especialista' ? (
                        <select
                          value={u.role}
                          onChange={e => handleChangeRole(u.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded font-medium border-0 cursor-pointer outline-none ${ROLE_STYLES[u.role] || ROLE_STYLES.user}`}
                        >
                          <option value="user">Usuário</option>
                          <option value="moderator">Moderador</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${ROLE_STYLES[u.role]}`}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      <CategoryDropdown
                        userId={u.id}
                        userCategories={u.categories}
                        allCategories={allCategories}
                        token={token}
                        onUpdate={handleCategoryUpdate}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${u.banned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {u.banned ? 'Banido' : 'Ativo'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 hidden sm:table-cell">{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="px-5 py-3">
                      {u.id !== user.id ? (
                        <div className="flex items-center justify-center gap-2">
                          {/* Ban/Unban toggle */}
                          <button
                            onClick={() => handleBan(u.id)}
                            title={u.banned ? 'Desbanir' : 'Banir'}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition ${
                              u.banned
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-orange-500 hover:bg-orange-50'
                            }`}
                          >
                            {u.banned ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            )}
                          </button>

                          {/* Delete (trash) */}
                          <button
                            onClick={() => handleDelete(u.id, u.username)}
                            title="Deletar usuário"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <span className="text-xs text-gray-400">Você</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        );
      })()}

      {/* ====== Aba Capacitação (admin only) ====== */}
      {/* ====== Aba Especialistas ====== */}
      {activeTab === 'specialists' && user.role === 'admin' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Designar especialista
              </span>
            </div>
            <div className="grid gap-3 px-5 py-5 sm:grid-cols-[1fr_1fr_auto]">
              <select
                value={specialtyUserId}
                onChange={e => {
                  setSpecialtyUserId(e.target.value);
                  setSpecialtyCategoryId('');
                  setSpecialtyMsg('');
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
              >
                <option value="">Selecione a pessoa...</option>
                {users?.map(candidate => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.username}{candidate.organization ? ` — ${candidate.organization}` : ''}
                  </option>
                ))}
              </select>
              <select
                value={specialtyCategoryId}
                onChange={e => {
                  setSpecialtyCategoryId(e.target.value);
                  setSpecialtyMsg('');
                }}
                disabled={!specialtyUserId || availableSpecialtyCategories.length === 0}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                <option value="">
                  {specialtyUserId && availableSpecialtyCategories.length === 0
                    ? 'Todos os temas já foram designados'
                    : 'Selecione o tema...'}
                </option>
                {availableSpecialtyCategories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleGrantSpecialty}
                disabled={specialtySaving || !specialtyUserId || !specialtyCategoryId}
                className="rounded-lg bg-[#034EA2] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {specialtySaving ? 'Designando...' : 'Designar'}
              </button>
            </div>
            {specialtyMsg && (
              <p className="px-5 pb-4 text-xs font-medium text-gray-600">{specialtyMsg}</p>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Designações ativas ({specialistAssignments.length})
              </span>
              <span className="text-xs text-gray-400">Somente administradores podem alterar</span>
            </div>
            {specialistAssignments.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-gray-400">
                Nenhuma especialização designada.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {specialistAssignments.map(({ specialist, specialty }) => (
                  <div
                    key={`${specialist.id}-${specialty.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                  >
                    <div>
                      <Link
                        to={`/user/${specialist.id}`}
                        className="text-sm font-semibold text-gray-800 transition hover:text-blue-600"
                      >
                        {specialist.username}
                      </Link>
                      {specialist.organization && (
                        <p className="mt-0.5 text-xs text-gray-400">{specialist.organization}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="rounded-sm px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: specialty.color || '#6366f1' }}
                      >
                        {specialty.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRevokeSpecialty(
                          specialist.id,
                          specialty.id,
                          specialist.username,
                          specialty.name
                        )}
                        className="rounded border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        Revogar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'resources' && user.role === 'admin' && (
        <div className="space-y-4">
          {/* Formulário: Adicionar Curso/Link */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                Adicionar Capacitação
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Título do recurso"
                  value={newResource.title}
                  onChange={e => setNewResource(prev => ({ ...prev, title: e.target.value }))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
                />
                <input
                  type="text"
                  placeholder="URL (ex: https://suap.enap.gov.br/...)"
                  value={newResource.url}
                  onChange={e => setNewResource(prev => ({ ...prev, url: e.target.value }))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
                />
              </div>
              <div className="flex gap-2 items-center">
                <select
                  value={newResource.type}
                  onChange={e => setNewResource(prev => ({ ...prev, type: e.target.value }))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
                >
                  <option value="curso">Curso</option>
                  <option value="video">Vídeo YouTube</option>
                </select>
                <input
                  type="text"
                  placeholder="Fonte (ex: enap, escola-virtual)"
                  value={newResource.source}
                  onChange={e => setNewResource(prev => ({ ...prev, source: e.target.value }))}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
                />
                <button
                  onClick={handleAddResource}
                  disabled={addingResource || !newResource.title || !newResource.url}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition disabled:opacity-50 whitespace-nowrap"
                >
                  {addingResource ? 'Adicionando...' : 'Adicionar'}
                </button>
              </div>
              {addResourceMsg && (
                <p className={`text-xs mt-2 ${addResourceMsg.startsWith('Erro') ? 'text-red-500' : 'text-green-600'}`}>{addResourceMsg}</p>
              )}
            </div>
          </div>

          {/* Formulário: Importar Playlist YouTube */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-5 py-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 00.5 6.19 31.6 31.6 0 000 12a31.6 31.6 0 00.5 5.81 3.02 3.02 0 002.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.6 31.6 0 0024 12a31.6 31.6 0 00-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>
                Importar Playlist do YouTube
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Cole a URL da playlist do YouTube"
                  value={playlistUrl}
                  onChange={e => setPlaylistUrl(e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
                />
                <button
                  onClick={handleImportPlaylist}
                  disabled={importing || !playlistUrl}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                >
                  {importing ? 'Importando...' : 'Importar'}
                </button>
              </div>
              {importMsg && (
                <p className={`text-xs mt-2 ${importMsg.startsWith('Erro') ? 'text-red-500' : 'text-green-600'}`}>{importMsg}</p>
              )}
            </div>
          </div>

          {/* Lista de Recursos */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recursos de Capacitação ({(resourceFilter === 'all' ? resources : resources?.filter(r => r.type === resourceFilter))?.length || 0})
              </span>
              <div className="flex gap-1">
                {[
                  { key: 'all', label: 'Todos' },
                  { key: 'video', label: 'Vídeos' },
                  { key: 'curso', label: 'Cursos' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setResourceFilter(f.key)}
                    className={`px-2.5 py-1 text-xs rounded-full font-medium transition ${
                      resourceFilter === f.key
                        ? 'bg-gray-700 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {!resources?.length ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-sm text-gray-400">Nenhum recurso cadastrado ainda</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {(resourceFilter === 'all' ? resources : resources.filter(r => r.type === resourceFilter)).map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition">
                    {/* Ícone por tipo */}
                    {r.type === 'curso' ? (
                      <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 00.5 6.19 31.6 31.6 0 000 12a31.6 31.6 0 00.5 5.81 3.02 3.02 0 002.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.6 31.6 0 0024 12a31.6 31.6 0 00-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>
                    )}
                    {/* Tag tipo */}
                    <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${
                      r.type === 'curso' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {r.type === 'curso' ? 'Curso' : 'Vídeo'}
                    </span>
                    {/* Fonte */}
                    {r.source && r.source !== 'youtube' && (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500 flex-shrink-0">
                        {r.source}
                      </span>
                    )}
                    {/* Título */}
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-gray-700 hover:text-blue-600 truncate">
                      {r.title}
                    </a>
                    {/* Botão deletar */}
                    <button
                      onClick={() => handleDeleteResource(r.id)}
                      className="w-7 h-7 flex items-center justify-center rounded text-red-400 hover:bg-red-50 transition flex-shrink-0"
                      title="Remover"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
