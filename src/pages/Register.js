import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';

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

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', organization: '', location: '' });
  const [selectedCats, setSelectedCats] = useState([]);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch('/categories'),
  });

  function toggleCategory(catId) {
    setSelectedCats(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!acceptTerms) {
      setError('É necessário aceitar os Termos de Uso para criar sua conta.');
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...form, category_ids: selectedCats, accept_terms: acceptTerms }),
      });
      login(data.token, data.user);
      navigate('/forum');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <img src="/logo-recpsp.svg" alt="RECPSP" className="h-16 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-800">Inscrever-se</h1>
          <p className="text-gray-400 text-sm mt-1">Crie sua conta no Fórum RECPSP</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nome de usuário</label>
            <input type="text" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              placeholder="seunome" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              placeholder="seu@email.com" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Senha</label>
            <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              placeholder="Mínimo 6 caracteres" required minLength={6} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Órgão / Instituição</label>
            <input type="text" value={form.organization} onChange={e => setForm(p => ({ ...p, organization: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              placeholder="Ex: Prefeitura de São Paulo" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
            <select value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
              required>
              <option value="">Selecione seu estado</option>
              {ESTADOS_BR.map(uf => (
                <option key={uf} value={uf}>{uf} - {ESTADO_NOMES[uf]}</option>
              ))}
            </select>
          </div>

          {/* Categorias de interesse */}
          {categories?.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Categorias de interesse</label>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
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
            </div>
          )}

          <label className="flex items-start gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={e => setAcceptTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-300 flex-shrink-0"
              required
            />
            <span className="text-xs text-gray-500 leading-relaxed">
              Li e aceito os{' '}
              <Link to="/termos" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-medium hover:underline">
                Termos de Uso e a Política de Privacidade
              </Link>{' '}
              do Fórum RECPSP.
            </span>
          </label>

          <button type="submit" disabled={loading || !acceptTerms}
            className="w-full bg-red-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Criando...' : 'Criar Conta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-4">
          Já tem conta? <Link to="/login" className="text-blue-600 font-medium hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
