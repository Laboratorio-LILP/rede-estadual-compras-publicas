export const AVATAR_COLORS = [
  '#b45309', '#9333ea', '#dc2626', '#0d9488', '#2563eb', '#c026d3', '#ea580c', '#16a34a',
];

export function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr + 'Z');
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 2592000)}mo`;
}

export function timeAgoLong(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr + 'Z');
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'agora mesmo';
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `há ${m} minuto${m === 1 ? '' : 's'}`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `há ${h} hora${h === 1 ? '' : 's'}`;
  }
  if (diff < 2592000) {
    const dd = Math.floor(diff / 86400);
    return `há ${dd} dia${dd === 1 ? '' : 's'}`;
  }
  if (diff < 31536000) {
    const mo = Math.floor(diff / 2592000);
    return `há ${mo} mês${mo === 1 ? '' : 'es'}`;
  }
  const y = Math.floor(diff / 31536000);
  return `há ${y} ano${y === 1 ? '' : 's'}`;
}

export function formatNumber(n) {
  if (!n) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'Z');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'Z');
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
