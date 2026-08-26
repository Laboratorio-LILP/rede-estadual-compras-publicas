import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('forum_token');
      const savedUser = localStorage.getItem('forum_user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch {
      // Sessao ilegivel (JSON corrompido, ou localStorage bloqueado em janela
      // anonima). Antes o JSON.parse cru derrubava a montagem da arvore React
      // inteira: tela branca, sem caminho de volta a nao ser limpar o navegador.
      // Agora a sessao invalida e descartada e o usuario cai no estado deslogado.
      try {
        localStorage.removeItem('forum_token');
        localStorage.removeItem('forum_user');
      } catch { /* localStorage indisponivel: nada a limpar */ }
      setToken(null);
      setUser(null);
    }
    setLoading(false);
  }, []);

  // localStorage lanca quando o navegador esta em modo restrito ou sem cota.
  // A sessao em memoria continua valendo — so nao sobrevive ao recarregamento.
  function persistir(chave, valor) {
    try {
      if (valor === null) localStorage.removeItem(chave);
      else localStorage.setItem(chave, valor);
    } catch {
      // Sem persistencia: a navegacao atual funciona normalmente.
    }
  }

  function login(tokenData, userData) {
    setToken(tokenData);
    setUser(userData);
    persistir('forum_token', tokenData);
    persistir('forum_user', JSON.stringify(userData));
  }

  function updateUser(userData) {
    setUser(userData);
    persistir('forum_user', JSON.stringify(userData));
  }

  function logout() {
    setToken(null);
    setUser(null);
    persistir('forum_token', null);
    persistir('forum_user', null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, updateUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
