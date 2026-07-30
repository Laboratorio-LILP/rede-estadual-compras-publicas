import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import Breadcrumbs from '../components/Breadcrumbs';

export default function Categories() {
  const { user, token } = useAuth();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: '#3b82f6' });
  const [error, setError] = useState('');

  const { data: categories, isLoading, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch('/categories'),
  });

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/categories', { method: 'POST', body: JSON.stringify(form) }, token);
      setForm({ name: '', description: '', color: '#3b82f6' });
      setShowNew(false);
      refetch();
    } catch (err) { setError(err.message); }
  }

  if (isLoading) return <div className="flex justify-center items-center h-64 text-gray-400">Carregando...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs
        className="mb-4"
        items={[
          { label: 'Início', to: '/' },
          { label: 'Fórum de Discussões', to: '/forum' },
          { label: 'Categorias' },
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Categorias</h1>
        {user?.role === 'admin' && (
          <button onClick={() => setShowNew(!showNew)} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition">
            + Nova Categoria
          </button>
        )}
      </div>

      {showNew && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-lg p-5 mb-6 shadow-sm">
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" required />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Descrição</label>
              <input type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Cor</label>
              <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                className="w-10 h-10 rounded border cursor-pointer" />
            </div>
            <button type="submit" className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition">
              Criar
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories?.map(cat => (
          <Link
            key={cat.id}
            to={`/category/${cat.id}`}
            className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition group"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
              <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition">{cat.name}</h3>
            </div>
            {cat.description && <p className="text-sm text-gray-500 mb-3">{cat.description}</p>}
            <div className="flex gap-4 text-xs text-gray-400">
              <span><strong className="text-gray-600">{cat.topic_count}</strong> tópicos</span>
              <span><strong className="text-gray-600">{cat.post_count}</strong> posts</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
