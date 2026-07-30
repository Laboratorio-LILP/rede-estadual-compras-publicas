import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';

function isForumPath(pathname) {
  const exactPaths = ['/forum', '/categories', '/new-topic', '/messages', '/admin'];
  const pathPrefixes = ['/category/', '/topic/', '/messages/', '/user/'];
  return exactPaths.includes(pathname) || pathPrefixes.some(path => pathname.startsWith(path));
}

export default function ForumNoticeModal() {
  const { user, token, updateUser, logout, loading } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  if (loading || !user || !token || user.forum_notice_accepted || !isForumPath(pathname)) {
    return null;
  }

  async function handleAccept() {
    setAccepting(true);
    setError('');
    try {
      await apiFetch('/auth/forum-notice/accept', { method: 'POST' }, token);
      updateUser({ ...user, forum_notice_accepted: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setAccepting(false);
    }
  }

  function handleLeave() {
    logout();
    navigate('/');
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/70 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forum-notice-title"
      aria-describedby="forum-notice-description"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="border-b border-gray-100 bg-[#F8F9FB] px-6 py-5 sm:px-8">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#034EA2]">
            Comunicado importante
          </span>
          <h2 id="forum-notice-title" className="mt-1.5 font-montserrat text-2xl font-extrabold text-gray-900">
            Antes de continuar
          </h2>
        </div>

        <div className="px-6 py-6 sm:px-8">
          <div id="forum-notice-description" className="space-y-4 text-sm leading-relaxed text-gray-600">
            <p>
              O Fórum RECPSP é um ambiente colaborativo de troca de experiências e boas práticas em
              contratações públicas.
            </p>
            <p>
              As informações e opiniões compartilhadas pelos participantes refletem experiências e
              conhecimentos próprios de seus autores, não constituem orientação oficial e podem não
              ser aplicáveis a todos os órgãos e instituições.
            </p>
            <p>
              Cabe a cada órgão ou entidade avaliar a adequação das informações à sua realidade
              institucional e às normas aplicáveis.
            </p>
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={event => setAgreed(event.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-[#034EA2] focus:ring-[#034EA2]"
            />
            <span className="text-sm font-semibold leading-relaxed text-gray-800">
              Li e estou de acordo com estas condições.
            </span>
          </label>

          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleLeave}
              disabled={accepting}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Sair do fórum
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={accepting || !agreed}
              className="rounded-lg bg-[#FF161F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {accepting ? 'Registrando aceite...' : 'Aceitar e continuar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
