import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import FormattedContent from '../components/FormattedContent';
import RichTextEditor from '../components/RichTextEditor';
import { getAvatarColor, formatNumber, formatDate } from '../utils/formatters';
import Breadcrumbs from '../components/Breadcrumbs';

// Icons
function ReplyIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
  );
}

function ShareIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}

function BookmarkIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}

function EyeIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function ThumbUpIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zm-9 11H3" />
    </svg>
  );
}

function ThumbDownIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10zm9-13h2" />
    </svg>
  );
}

function PostCard({ post, topic, isFirst, onDelete, onEdit, onLike, onDislike, onBestAnswer, currentUser }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(post.content);
  const canModify = currentUser && (currentUser.id === post.user_id || currentUser.role === 'admin');

  async function handleSave() {
    await onEdit(post.id, content);
    setEditing(false);
  }

  return (
    <div className={`border-b border-gray-100 last:border-0 ${
      post.best_answer
        ? 'bg-green-50 border-l-4 border-l-green-500'
        : post.is_specialist_answer
          ? 'bg-[#F5F8FC] border-l-4 border-l-[#034EA2]'
          : ''
    }`}>
      <div className="flex gap-4 p-5">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <Link to={`/user/${post.user_id}`}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm hover:opacity-80 transition"
              style={{ backgroundColor: getAvatarColor(post.username) }}>
              {post.username?.[0]?.toUpperCase() ?? '?'}
            </div>
          </Link>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Link to={`/user/${post.user_id}`} className="font-semibold text-sm text-gray-800 hover:text-blue-600 transition">{post.username}</Link>
              {post.role === 'admin' && (
                <span className="bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5 rounded font-bold">Admin</span>
              )}
              {post.role === 'moderator' && (
                <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded font-bold">Moderador</span>
              )}
              {post.role === 'especialista' && (
                <span
                  className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-bold"
                  style={{ backgroundColor: '#034EA214', color: '#034EA2' }}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Especialista
                </span>
              )}
              {post.best_answer === 1 && (
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded font-bold">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Melhor Resposta
                </span>
              )}
              {post.is_specialist_answer > 0 && (
                <span
                  className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-bold text-white"
                  style={{ backgroundColor: '#034EA2' }}
                  title="Resposta de especialista verificado neste tema"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Resposta verificada
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400">{formatDate(post.created_at)}</span>
          </div>

          {/* Content */}
          {editing ? (
            <div>
              <RichTextEditor value={content} onChange={setContent} placeholder="Editar conteúdo..." rows={5} />
              <div className="flex gap-2 mt-2">
                <button onClick={handleSave} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-600 transition">Salvar</button>
                <button onClick={() => { setEditing(false); setContent(post.content); }} className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-200 transition">Cancelar</button>
              </div>
            </div>
          ) : (
            <FormattedContent text={post.content} className="mb-4" />
          )}

          {/* Action bar */}
          {!editing && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => onLike(post.id)}
                  className={`flex items-center gap-1 text-xs transition ${post.user_liked ? 'text-blue-600' : 'text-gray-400 hover:text-blue-500'}`}>
                  <ThumbUpIcon className="w-4 h-4" />
                  <span>{post.like_count || 0}</span>
                </button>
                <button onClick={() => onDislike(post.id)}
                  className={`flex items-center gap-1 text-xs transition ${post.user_disliked ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'}`}>
                  <ThumbDownIcon className="w-4 h-4" />
                  {(currentUser?.role === 'admin' || currentUser?.role === 'moderator') && (
                    <span>{post.dislike_count || 0}</span>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-3">
                {canModify && !topic.locked && (
                  <>
                    <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-blue-500 transition">Editar</button>
                    <button onClick={() => onDelete(post.id)} className="text-xs text-gray-400 hover:text-red-500 transition">Deletar</button>
                  </>
                )}
                {(currentUser?.role === 'admin' || currentUser?.role === 'moderator') && !isFirst && (
                  <button onClick={() => onBestAnswer(post.id)}
                    className={`text-xs transition ${post.best_answer ? 'text-green-600 font-medium' : 'text-gray-400 hover:text-green-500'}`}>
                    {post.best_answer ? 'Remover Melhor' : 'Melhor Resposta'}
                  </button>
                )}
                <ShareIcon className="w-4 h-4 text-gray-300 hover:text-gray-500 cursor-pointer transition" />
                <BookmarkIcon className="w-4 h-4 text-gray-300 hover:text-gray-500 cursor-pointer transition" />
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

// Toolbar button component
// Helper: detectar embed de vídeo
function getVideoEmbed(url) {
  if (!url) return null;
  let match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  match = url.match(/vimeo\.com\/(\d+)/);
  if (match) return `https://player.vimeo.com/video/${match[1]}`;
  return null;
}

// Componente de votação
function PollSection({ topic, token, onVote }) {
  const options = topic.poll_options || [];
  const totalVotes = topic.total_votes || 0;
  const userVote = topic.user_vote;
  const hasVoted = userVote !== null && userVote !== undefined;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" d="M4 8h10M4 12h16M4 16h6" />
          <rect x="3" y="4" width="18" height="16" rx="2" strokeLinejoin="round" />
        </svg>
        <h3 className="font-semibold text-sm text-gray-800">Votação</h3>
        <span className="text-xs text-gray-400 ml-auto">{totalVotes} voto{totalVotes !== 1 ? 's' : ''}</span>
      </div>
      <div className="space-y-2">
        {options.map(opt => {
          const pct = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
          const isSelected = userVote === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onVote(opt.id)}
              className={`w-full text-left relative rounded-lg border-2 px-4 py-2.5 transition overflow-hidden ${
                isSelected
                  ? 'border-red-400 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              {/* Barra de progresso */}
              {hasVoted && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                    isSelected ? 'bg-red-100' : 'bg-gray-100'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-red-500' : 'border-gray-300'
                  }`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-red-500" />}
                  </div>
                  <span className={`text-sm ${isSelected ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                    {opt.text}
                  </span>
                </div>
                {hasVoted && (
                  <span className={`text-xs font-medium ${isSelected ? 'text-red-600' : 'text-gray-400'}`}>
                    {pct}% ({opt.vote_count})
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {!token && (
        <p className="text-xs text-gray-400 mt-3 text-center">
          <Link to="/login" className="text-blue-600 hover:underline">Entre</Link> para votar.
        </p>
      )}
    </div>
  );
}

export default function Topic() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('recent');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['topic', id],
    queryFn: () => apiFetch(`/topics/${id}`, {}, token),
  });

  const { data: related } = useQuery({
    queryKey: ['related', id],
    queryFn: () => apiFetch(`/topics/${id}/related`),
  });

  const { data: relatedResources } = useQuery({
    queryKey: ['related-resources', id],
    queryFn: () => apiFetch(`/topics/${id}/related-resources`),
  });

  // Registrar visualização apenas uma vez ao entrar no tópico
  useEffect(() => {
    apiFetch(`/topics/${id}/view`, { method: 'POST' }).catch(() => {});
  }, [id]);

  const topic = data?.topic;
  const posts = data?.posts || [];
  const frequentUsers = data?.frequentUsers || [];
  const firstPost = posts[0];
  const replies = posts.slice(1);

  // Sort replies based on filter
  const sortedReplies = [...replies].sort((a, b) => {
    if (filter === 'likes') return (b.like_count || 0) - (a.like_count || 0);
    if (filter === 'longest') return (b.content?.length || 0) - (a.content?.length || 0);
    if (filter === 'shortest') return (a.content?.length || 0) - (b.content?.length || 0);
    return new Date(a.created_at) - new Date(b.created_at);
  });

  async function handleReply(e) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/posts', { method: 'POST', body: JSON.stringify({ content: reply, topic_id: id }) }, token);
      setReply('');
      refetch();
    } catch (err) { setError(err.message); }
  }

  async function handleDeletePost(postId) {
    if (!window.confirm('Deletar este post?')) return;
    try { await apiFetch(`/posts/${postId}`, { method: 'DELETE' }, token); refetch(); }
    catch (err) { alert(err.message); }
  }

  async function handleEditPost(postId, content) {
    try { await apiFetch(`/posts/${postId}`, { method: 'PUT', body: JSON.stringify({ content }) }, token); refetch(); }
    catch (err) { alert(err.message); }
  }

  async function handleLikePost(postId) {
    if (!user) return;
    try { await apiFetch(`/posts/${postId}/like`, { method: 'POST' }, token); refetch(); }
    catch (err) { alert(err.message); }
  }

  async function handleDislikePost(postId) {
    if (!user) return;
    try { await apiFetch(`/posts/${postId}/dislike`, { method: 'POST' }, token); refetch(); }
    catch (err) { alert(err.message); }
  }

  async function handleBestAnswer(postId) {
    try { await apiFetch(`/posts/${postId}/best-answer`, { method: 'PUT' }, token); refetch(); }
    catch (err) { alert(err.message); }
  }

  async function handleDeleteTopic() {
    if (!window.confirm('Deletar este tópico e todos os posts?')) return;
    try {
      await apiFetch(`/topics/${id}`, { method: 'DELETE' }, token);
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      navigate(`/category/${topic.category_id}`);
    } catch (err) { alert(err.message); }
  }

  async function handlePin() {
    try { await apiFetch(`/topics/${id}/pin`, { method: 'PUT' }, token); refetch(); }
    catch (err) { alert(err.message); }
  }

  async function handleLock() {
    try { await apiFetch(`/topics/${id}/lock`, { method: 'PUT' }, token); refetch(); }
    catch (err) { alert(err.message); }
  }

  async function handleVote(optionId) {
    if (!user) return;
    try { await apiFetch(`/topics/${id}/vote`, { method: 'POST', body: JSON.stringify({ option_id: optionId }) }, token); refetch(); }
    catch (err) { alert(err.message); }
  }

  if (isLoading) return <div className="flex justify-center items-center h-64 text-gray-400">Carregando...</div>;
  if (!topic) return <div className="text-center py-12 text-gray-400">Tópico não encontrado.</div>;

  const filters = [
    { key: 'recent', label: 'Recentes' },
    { key: 'likes', label: 'Mais Curtidas' },
    { key: 'longest', label: 'Mais Longas' },
    { key: 'shortest', label: 'Mais Curtas' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Breadcrumbs
        className="mb-4"
        items={[
          { label: 'Início', to: '/' },
          { label: 'Fórum de Discussões', to: '/forum' },
          { label: topic.category_name, to: `/category/${topic.category_id}` },
          { label: topic.title },
        ]}
      />

      {/* Banner de moderação */}
      {topic.status === 'pending' && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mb-4">
          <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-yellow-700">Tópico em análise</p>
            <p className="text-xs text-yellow-600">Este tópico está aguardando aprovação de um moderador antes de ficar visível para todos.</p>
          </div>
        </div>
      )}

      {/* Header - user + title */}
      <div className="flex items-start gap-3 mb-4">
        <Link to={`/user/${topic.user_id}`} className="flex-shrink-0">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm hover:opacity-80 transition"
            style={{ backgroundColor: getAvatarColor(topic.username) }}>
            {topic.username?.[0]?.toUpperCase() ?? '?'}
          </div>
        </Link>
        <div className="flex-1">
          <Link to={`/user/${topic.user_id}`} className="text-xs text-gray-400 hover:text-blue-600 transition mb-0.5 block">{topic.username}</Link>
          <h1 className="text-lg font-bold text-gray-800 leading-tight">{topic.title}</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {topic.tags?.map(t => (
              <span key={t} className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-sm font-medium">{t}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400 flex-shrink-0">
          <span className="flex items-center gap-1"><ReplyIcon className="w-4 h-4" /> {replies.length}</span>
          <span className="flex items-center gap-1"><EyeIcon className="w-4 h-4" /> {formatNumber(topic.views)}</span>
        </div>
      </div>

      {/* Topic actions: admin (pin/lock/delete) + owner (delete) */}
      {user && (user.role === 'admin' || user.id === topic.user_id) && (
        <div className="flex gap-2 mb-4">
          {user.role === 'admin' && (
            <>
              <button onClick={handlePin} className="text-xs border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
                {topic.pinned ? 'Desafixar' : 'Fixar'}
              </button>
              <button onClick={handleLock} className="text-xs border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
                {topic.locked ? 'Abrir' : 'Fechar'}
              </button>
            </>
          )}
          <button onClick={handleDeleteTopic} className="text-xs bg-red-50 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-100 transition">
            Deletar Tópico
          </button>
        </div>
      )}

      {/* First post (OP) */}
      {firstPost && (
        <div className="bg-white rounded-lg border border-gray-200 mb-4">
          <PostCard post={firstPost} topic={topic} isFirst={true} onDelete={handleDeletePost}
            onEdit={handleEditPost} onLike={handleLikePost} onDislike={handleDislikePost} onBestAnswer={handleBestAnswer} currentUser={user} />
        </div>
      )}

      {/* Imagem do tópico */}
      {topic.type === 'images' && topic.image_url && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <img
            src={topic.image_url}
            alt={topic.title}
            className="w-full max-h-[600px] object-contain rounded-lg"
          />
        </div>
      )}

      {/* Vídeo do tópico */}
      {topic.type === 'video' && topic.video_url && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          {getVideoEmbed(topic.video_url) ? (
            <iframe
              src={getVideoEmbed(topic.video_url)}
              title="Vídeo"
              className="w-full aspect-video rounded-lg"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <a
              href={topic.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-blue-600 hover:text-blue-700 transition p-3 bg-blue-50 rounded-lg"
            >
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none" />
              </svg>
              <div>
                <p className="text-sm font-medium">Assistir vídeo externo</p>
                <p className="text-xs text-gray-400 truncate">{topic.video_url}</p>
              </div>
            </a>
          )}
        </div>
      )}

      {/* Votação do tópico */}
      {topic.type === 'poll' && topic.poll_options && (
        <PollSection topic={topic} token={token} onVote={handleVote} />
      )}

      {/* Stats bar */}
      <div className="flex items-center gap-6 py-3 px-1 text-xs text-gray-400 border-b border-gray-200 mb-4">
        <span><strong className="text-gray-600">{formatNumber(topic.views)}</strong> visualizações</span>
        <span><strong className="text-gray-600">{replies.length}</strong> respostas</span>
      </div>

      {/* Frequent users */}
      {frequentUsers.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">Usuários frequentes</p>
          <div className="flex gap-1.5">
            {frequentUsers.map(u => (
              <Link key={u.id} to={`/user/${u.id}`} title={u.username}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs hover:opacity-80 transition"
                  style={{ backgroundColor: getAvatarColor(u.username) }}>
                  {u.username?.[0]?.toUpperCase() ?? '?'}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {replies.length > 0 && (
        <div className="flex items-center gap-1 mb-4 flex-wrap">
          <span className="text-xs text-gray-400 mr-2">Filtrar respostas por:</span>
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`text-xs px-3 py-1.5 rounded-full transition font-medium ${
                filter === f.key ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Replies */}
      {sortedReplies.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 mb-4">
          {sortedReplies.map(post => (
            <PostCard key={post.id} post={post} topic={topic} isFirst={false} onDelete={handleDeletePost}
              onEdit={handleEditPost} onLike={handleLikePost} onDislike={handleDislikePost} onBestAnswer={handleBestAnswer} currentUser={user} />
          ))}
        </div>
      )}

      {/* End of replies */}
      {replies.length > 0 && (
        <p className="text-center text-xs text-gray-400 mb-6">Você chegou no fim das respostas</p>
      )}

      {/* Guest banner */}
      {!user && (
        <div className="flex items-center justify-between bg-gray-700 text-white px-5 py-3 rounded-lg mb-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold">Para responder, é necessário criar uma conta ou fazer login.</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-sm px-4 py-1.5 rounded border border-gray-400 hover:bg-gray-600 transition">Entrar</Link>
            <Link to="/register" className="text-sm px-4 py-1.5 rounded bg-red-500 hover:bg-red-600 transition font-medium">Inscrever</Link>
          </div>
        </div>
      )}

      {/* Reply form */}
      {user ? (
        topic.locked && user.role !== 'admin' ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-sm text-gray-500 mb-6">
            Este tópico está fechado.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg mb-6">
            <form onSubmit={handleReply} className="p-5">
              <h3 className="font-semibold text-sm text-gray-800 mb-3">Postar Resposta</h3>
              {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
              <RichTextEditor
                value={reply}
                onChange={setReply}
                placeholder="Compartilhe sua experiência ou dúvida... (use **negrito**, *itálico*, > citação)"
                rows={5}
              />
              <div className="flex items-center justify-end mt-3">
                <button type="submit"
                  className="bg-red-500 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition">
                  Responder
                </button>
              </div>
            </form>
          </div>
        )
      ) : null}

      {/* Related resources (capacitação) */}
      {relatedResources && relatedResources.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Capacitação relacionada</h3>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-50">
            {relatedResources.map(r => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition"
              >
                {r.type === 'curso' ? (
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                ) : (
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 00.5 6.19 31.6 31.6 0 000 12a31.6 31.6 0 00.5 5.81 3.02 3.02 0 002.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.6 31.6 0 0024 12a31.6 31.6 0 00-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>
                )}
                <span className="text-sm text-gray-700 hover:text-blue-600 transition truncate">{r.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ml-auto flex-shrink-0 ${r.type === 'curso' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                  {r.type === 'curso' ? 'Curso' : 'Vídeo'}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Related topics */}
      {related && related.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Tópicos que também podem ser interessantes</h3>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Table header */}
            <div className="flex items-center py-2 px-4 text-xs text-gray-400 font-medium uppercase tracking-wider border-b border-gray-100 bg-gray-50">
              <div className="flex-1">Tópicos</div>
              <div className="w-28 text-right hidden md:block mr-4">Categoria</div>
              <div className="w-20 text-center mr-4">Respostas</div>
              <div className="w-28 text-center hidden sm:block">Visualizações</div>
            </div>
            {related.map(r => (
              <div key={r.id} className="flex items-center py-2.5 px-4 hover:bg-gray-50 transition border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <Link to={`/topic/${r.id}`} className="text-sm text-gray-700 hover:text-blue-600 transition font-medium truncate block">
                    {r.title}
                  </Link>
                </div>
                <div className="w-28 hidden md:flex justify-end mr-4">
                  <span className="text-xs text-white px-2 py-0.5 rounded-sm truncate" style={{ backgroundColor: r.category_color }}>
                    {r.category_name}
                  </span>
                </div>
                <div className="w-20 text-center text-xs font-bold text-gray-700 mr-4">{r.reply_count || 0}</div>
                <div className="w-28 text-center text-xs text-gray-500 hidden sm:block">{formatNumber(r.views)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
