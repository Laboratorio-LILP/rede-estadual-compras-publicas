const BASE = process.env.REACT_APP_API_URL || '/api';

// Tempo maximo de espera. Sem isto, uma requisicao presa deixa o botao em
// "carregando" para sempre, sem erro e sem saida.
const TIMEOUT_MS = 20000;

export async function apiFetch(path, options = {}, token = null) {
  // options.headers preservado: antes o objeto local sobrescrevia o que o
  // chamador passasse, entao nao havia como enviar cabecalho proprio.
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('A requisição demorou demais. Tente novamente.');
    throw new Error('Não foi possível falar com o servidor. Verifique sua conexão.');
  } finally {
    clearTimeout(timer);
  }

  // Resposta pode nao ser JSON: proxy fora do ar, erro de gateway, ou uma rota
  // que caiu no HTML do SPA. Antes o res.json() cru estourava com
  // "Unexpected token <", escondendo a causa real do problema.
  const texto = await res.text();
  let data = null;
  if (texto) {
    try {
      data = JSON.parse(texto);
    } catch {
      if (!res.ok) throw new Error(`O servidor respondeu com erro ${res.status}.`);
      throw new Error('O servidor respondeu num formato inesperado.');
    }
  }

  if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`);
  return data;
}
