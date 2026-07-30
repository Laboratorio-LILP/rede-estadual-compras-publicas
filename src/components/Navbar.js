import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../api';
import { timeAgo } from '../utils/formatters';

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const ESTADO_NOMES = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia',
  CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul',
  RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo',
  SE: 'Sergipe', TO: 'Tocantins',
};

function ProfileSettings({ user, token, onClose, onUpdate, onLogout }) {
  const [form, setForm] = useState({
    username: user.username || '',
    email: user.email || '',
    password: '',
    location: '',
    organization: '',
    bio: '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [allCategories, setAllCategories] = useState([]);
  const [selectedCats, setSelectedCats] = useState([]);
  const [specialties, setSpecialties] = useState([]);

  // Fetch full profile + categories on mount
  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch('/auth/me', {}, token);
        setForm(prev => ({
          ...prev,
          username: data.username || '',
          email: data.email || '',
          location: data.location || '',
          organization: data.organization || '',
          bio: data.bio || '',
        }));
        if (data.categories) {
          setSelectedCats(data.categories.map(c => c.id));
        }
        setSpecialties(data.specialties || []);
      } catch {}
      try {
        const cats = await apiFetch('/categories');
        setAllCategories(cats);
      } catch {}
    }
    load();
  }, [token]);

  function toggleCategory(catId) {
    setSelectedCats(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  }

  async function handleSave() {
    setSaving(true);
    setMsg('');
    try {
      const body = { ...form };
      if (!body.password) delete body.password;
      const updated = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(body),
      }, token);
      // Salvar categorias de interesse
      await apiFetch('/auth/categories', {
        method: 'PUT',
        body: JSON.stringify({ category_ids: selectedCats }),
      }, token);
      setMsg('Perfil salvo!');
      if (onUpdate) onUpdate(updated);
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      setMsg(err.message);
    }
    setSaving(false);
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-30 z-50" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2 text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span className="font-semibold text-sm">Configurações</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Profile picture */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Foto de Perfil</p>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center text-white font-bold text-sm">
                {form.username ? form.username?.[0]?.toUpperCase() ?? '?' : 'U'}
              </div>
              <button className="text-sm text-gray-600 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
                Selecionar Foto
              </button>
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome de Usuário</label>
            <input
              type="text" value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
            <input
              type="email" value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="Exemplo@exemplo.com"
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400 placeholder-gray-400"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Senha</label>
            <input
              type="password" value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder="**************"
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400 placeholder-gray-400"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estado</label>
            <select
              value={form.location}
              onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400"
            >
              <option value="">Selecione seu estado</option>
              {ESTADOS_BR.map(uf => (
                <option key={uf} value={uf}>{uf} - {ESTADO_NOMES[uf]}</option>
              ))}
            </select>
          </div>

          {/* Organization */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Órgão</label>
            <input
              type="text" value={form.organization}
              onChange={e => setForm(p => ({ ...p, organization: e.target.value }))}
              placeholder="Exemplo"
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400 placeholder-gray-400"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Área de trabalho</label>
            <textarea
              value={form.bio}
              onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
              placeholder="Explique sobre sua atuação"
              rows="3"
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400 resize-none placeholder-gray-400"
            />
          </div>

          {/* Categorias de interesse */}
          {allCategories.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Categorias de interesse</p>
              <div className="flex flex-wrap gap-2">
                {allCategories.map(cat => (
                  <label key={cat.id} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCats.includes(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                      className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-400"
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
            </div>
          )}

          {/* Especialização */}
          <div className="border-t border-gray-200 pt-5">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4" style={{ color: '#034EA2' }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-semibold text-gray-700">Especialização</p>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              A designação é feita exclusivamente pela administração. Especialistas recebem um selo
              de resposta verificada nos temas designados.
            </p>

            {specialties.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1.5">Seus temas verificados</p>
                <div className="flex flex-wrap gap-2">
                  {specialties.map(s => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: '#034EA2' }}
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {specialties.length === 0 && (
              <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                Nenhuma especialização foi designada para este perfil.
              </p>
            )}
          </div>

          {/* Email notifications */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Notificar via Email</p>
            <div className="space-y-2.5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-400" />
                <span className="text-sm text-gray-600">Quando alguém responde</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-400" />
                <span className="text-sm text-gray-600">Quando alguém curte</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-400" />
                <span className="text-sm text-gray-600">Quando alguém menciona</span>
              </label>
            </div>
          </div>

          {/* Message */}
          {msg && (
            <p className={`text-sm font-medium ${msg.includes('salvo') ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-red-500 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>

          {/* Logout button */}
          <button
            onClick={onLogout}
            className="w-full bg-gray-100 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition mt-2"
          >
            Sair
          </button>
        </div>
      </div>
    </>
  );
}

export default function Navbar() {
  const { user, token, logout, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isInForum = location.pathname.startsWith('/forum') || location.pathname.startsWith('/topic') || location.pathname.startsWith('/category') || location.pathname.startsWith('/categories') || location.pathname.startsWith('/new-topic');
  const isHome = location.pathname === '/';
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [resourceResults, setResourceResults] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const searchRef = useRef(null);
  const notifRef = useRef(null);

  // Buscar notificacoes com polling
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiFetch('/notifications', {}, token),
    refetchInterval: 30000,
    enabled: !!token,
  });

  const unreadCount = notifData?.unread_count || 0;

  function handleLogout() {
    logout();
    navigate('/');
  }

  function handleProfileUpdate(updatedUser) {
    login(token, { ...user, username: updatedUser.username, email: updatedUser.email });
  }

  async function handleMarkAllRead() {
    try {
      await apiFetch('/notifications/read', { method: 'PUT' }, token);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch {}
  }

  function handleNotificationClick(notif) {
    setShowNotifications(false);
    if (notif.type === 'message' && notif.reference_id) {
      navigate(`/messages/${notif.reference_id}`);
    }
  }

  useEffect(() => {
    if (query.length < 2) { setResults([]); setResourceResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const data = await apiFetch(`/search?q=${encodeURIComponent(query)}`);
        setResults(data.topics || []);
        setResourceResults(data.resources || []);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // Click outside para search e notificacoes
  useEffect(() => {
    function handler(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      <div className="sticky top-0 z-50">
        {/* Institutional top bar */}
        <div style={{ backgroundColor: '#1a1a1a' }}>
          <div className="max-w-6xl mx-auto px-4 h-8 flex items-center justify-end gap-5">
            {[
              { label: 'Ouvidoria', href: 'https://www.ouvidoria.sp.gov.br' },
              { label: 'Transparência', href: 'https://www.transparencia.sp.gov.br' },
              { label: 'SIC', href: 'https://www.sic.sp.gov.br' },
              { label: 'Acesso à Informação', href: 'https://www.transparencia.sp.gov.br/acesso-a-informacao' },
            ].map(link => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs transition-colors"
                style={{ color: '#9aa8c4' }}
                onMouseEnter={e => e.target.style.color = '#ffffff'}
                onMouseLeave={e => e.target.style.color = '#9aa8c4'}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Primary nav */}
        <nav className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center gap-3">
            <img src="/brasao-sp.svg" alt="Governo do Estado de São Paulo" className="h-9" />
            <div className="w-px h-6 bg-gray-300 flex-shrink-0" />
            <img src="/logo-recpsp.svg" alt="RECPSP" className="h-9" />
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-5 text-sm text-gray-600 flex-shrink-0 whitespace-nowrap">
            {!isHome && (
              <Link to="/" className="transition hover:text-[#034EA2]">Início</Link>
            )}
            {isInForum ? (
              <>
                <Link to="/forum" className="transition hover:text-[#034EA2]">Fórum</Link>
                <Link to="/categories" className="transition hover:text-[#034EA2]">Categorias</Link>
                <Link to="/new-topic" className="transition hover:text-[#034EA2]">Novo Tópico</Link>
              </>
            ) : (
              <>
                <Link to="/forum" className="transition hover:text-[#034EA2]">Fórum</Link>
                <a href="https://compras.sp.gov.br/agente-publico/toolkits-documentos-padronizados/" target="_blank" rel="noopener noreferrer" className="transition hover:text-[#034EA2]">Modelos de Documentos</a>
                <a href="https://vademecum.lablogsp.org" target="_blank" rel="noopener noreferrer" className="transition hover:text-[#034EA2]">Vade Mecum</a>
                <Link to="/capacitacao" className="transition hover:text-[#034EA2]">Capacitação</Link>
              </>
            )}
          </div>

          {/* Search */}
          <div className="flex-1 min-w-0 max-w-md" ref={searchRef}>
            <div className="relative">
              <div className="flex items-center bg-gray-100 rounded-lg px-3 py-1.5">
                <svg className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Procurar"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                  className="bg-transparent text-sm text-gray-700 outline-none w-full placeholder-gray-400"
                />
              </div>
              {searchOpen && (results.length > 0 || resourceResults.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50 max-h-80 overflow-y-auto">
                  {results.length > 0 && results.map(r => (
                    <Link
                      key={r.id}
                      to={`/topic/${r.id}`}
                      onClick={() => { setSearchOpen(false); setQuery(''); }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition"
                    >
                      <span className="text-sm text-gray-700">{r.title}</span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full text-white ml-auto flex-shrink-0"
                        style={{ backgroundColor: r.category_color }}
                      >
                        {r.category_name}
                      </span>
                    </Link>
                  ))}
                  {resourceResults.length > 0 && (
                    <>
                      <div className="px-4 py-1.5 bg-gray-50 border-t border-gray-100">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Capacitação</span>
                      </div>
                      {resourceResults.map(r => (
                        <a
                          key={`res-${r.id}`}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => { setSearchOpen(false); setQuery(''); }}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition"
                        >
                          {r.type === 'curso' ? (
                            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                          ) : (
                            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 00.5 6.19 31.6 31.6 0 000 12a31.6 31.6 0 00.5 5.81 3.02 3.02 0 002.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.6 31.6 0 0024 12a31.6 31.6 0 00-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>
                          )}
                          <span className="text-sm text-gray-700 truncate">{r.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ml-auto flex-shrink-0 ${r.type === 'curso' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                            {r.type === 'curso' ? 'Curso' : 'Vídeo'}
                          </span>
                        </a>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {user ? (
              <>
                {(user.role === 'admin' || user.role === 'moderator') && (
                  <Link
                    to="/admin"
                    className={`text-xs font-bold px-2.5 py-1 rounded-full transition hidden sm:block ${
                      user.role === 'admin'
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {user.role === 'admin' ? 'Admin' : 'Moderação'}
                  </Link>
                )}

                {/* Messages icon */}
                <Link to="/messages" className="relative text-gray-400 hover:text-gray-600 transition" title="Mensagens">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </Link>

                {/* Bell icon with notifications */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative text-gray-400 hover:text-gray-600 transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold leading-none px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification dropdown */}
                  {showNotifications && (
                    <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden z-50">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                        <span className="text-sm font-semibold text-gray-700">Notificações</span>
                        {unreadCount > 0 && (
                          <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                            Marcar como lidas
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {(!notifData?.notifications || notifData.notifications.length === 0) ? (
                          <div className="text-center py-8 text-gray-400 text-sm">
                            Nenhuma notificação
                          </div>
                        ) : (
                          notifData.notifications.map(notif => (
                            <button
                              key={notif.id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition border-b border-gray-50 ${
                                !notif.read ? 'bg-blue-50' : ''
                              }`}
                            >
                              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${!notif.read ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                                  {notif.content}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">{timeAgo(notif.created_at)}</p>
                              </div>
                              {!notif.read && (
                                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Link to={`/user/${user.id}`}>
                    <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center text-white font-bold text-xs">
                      {user.username?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  </Link>
                  <span className="text-sm text-gray-700 font-medium hidden sm:block">{user.username}</span>
                  <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-gray-600 transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium px-3 py-1.5 rounded border transition"
                  style={{ color: '#034EA2', borderColor: '#034EA2' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#034EA2'; e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#034EA2'; }}
                >
                  Entrar
                </Link>
                <Link to="/register" className="text-sm text-white font-semibold px-4 py-1.5 rounded transition" style={{ backgroundColor: '#FF161F' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#CC111A'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FF161F'}
                >
                  Inscrever
                </Link>
              </>
            )}
          </div>
        </div>
        </nav>
      </div>

      {/* Profile Settings Overlay */}
      {showSettings && user && (
        <ProfileSettings
          user={user}
          token={token}
          onClose={() => setShowSettings(false)}
          onUpdate={handleProfileUpdate}
          onLogout={handleLogout}
        />
      )}
    </>
  );
}
