import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { getAvatarColor, timeAgo, formatTime } from '../utils/formatters';
import { useState, useEffect, useRef } from 'react';

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'Z');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// =================== INBOX ===================
function Inbox({ token }) {
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['messages-inbox'],
    queryFn: () => apiFetch('/messages', {}, token),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return <div className="text-center py-16 text-gray-400 text-sm">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-800">Mensagens</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {(!conversations || conversations.length === 0) ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Nenhuma mensagem ainda.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {conversations.map(conv => (
              <Link
                key={conv.other_user_id}
                to={`/messages/${conv.other_user_id}`}
                className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition"
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: getAvatarColor(conv.other_username) }}
                >
                  {conv.other_username[0].toUpperCase()}
                </div>

                {/* Conteudo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${conv.unread_count > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {conv.other_username}
                    </span>
                    {conv.unread_count > 0 && (
                      <span className="bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm truncate ${conv.unread_count > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
                    {conv.last_message}
                  </p>
                </div>

                {/* Tempo */}
                <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(conv.last_message_date)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =================== CONVERSA ===================
function Conversation({ userId, token, currentUser }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['messages', userId],
    queryFn: () => apiFetch(`/messages/${userId}`, {}, token),
    refetchInterval: 10000,
  });

  // Scroll para o final quando mensagens mudam
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [data?.messages?.length]);

  // Invalidar notificacoes ao abrir conversa
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient, userId]);

  async function handleSend(e) {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await apiFetch('/messages', {
        method: 'POST',
        body: JSON.stringify({ receiver_id: parseInt(userId), content: message.trim() }),
      }, token);
      setMessage('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['messages-inbox'] });
    } catch (err) {
      alert(err.message);
    }
    setSending(false);
  }

  if (isLoading) {
    return <div className="text-center py-16 text-gray-400 text-sm">Carregando...</div>;
  }

  const otherUser = data?.other_user;
  const messages = data?.messages || [];

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <Link to="/messages" className="text-gray-400 hover:text-gray-600 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        {otherUser && (
          <Link to={`/user/${otherUser.id}`} className="flex items-center gap-2 hover:opacity-80 transition">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: getAvatarColor(otherUser.username) }}
            >
              {otherUser.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <span className="font-semibold text-gray-800 text-sm">{otherUser.username}</span>
          </Link>
        )}
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Nenhuma mensagem. Comece a conversa!
          </div>
        )}

        {messages.map((msg, i) => {
          const isMine = msg.sender_id === currentUser.id;
          // Mostrar data se for o primeiro ou se mudou de dia
          const showDate = i === 0 || formatDateShort(msg.created_at) !== formatDateShort(messages[i - 1].created_at);
          return (
            <div key={msg.id}>
              {showDate && (
                <div className="text-center my-3">
                  <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                    {formatDateShort(msg.created_at)}
                  </span>
                </div>
              )}
              <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                    isMine
                      ? 'bg-red-500 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-800 rounded-bl-md'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMine ? 'text-red-200' : 'text-gray-400'}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 pt-4 border-t border-gray-200">
        <input
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={!message.trim() || sending}
          className="bg-red-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50 flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          Enviar
        </button>
      </form>
    </div>
  );
}

// =================== PAGINA PRINCIPAL ===================
export default function Messages() {
  const { userId } = useParams();
  const { user, token } = useAuth();
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-400 text-sm">
          <Link to="/login" className="text-blue-600 hover:underline">Entre</Link> para ver suas mensagens.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {userId ? (
        <Conversation userId={userId} token={token} currentUser={user} />
      ) : (
        <Inbox token={token} />
      )}
    </div>
  );
}
