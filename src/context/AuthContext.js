import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('forum_token');
    const savedUser = localStorage.getItem('forum_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  function login(tokenData, userData) {
    setToken(tokenData);
    setUser(userData);
    localStorage.setItem('forum_token', tokenData);
    localStorage.setItem('forum_user', JSON.stringify(userData));
  }

  function updateUser(userData) {
    setUser(userData);
    localStorage.setItem('forum_user', JSON.stringify(userData));
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem('forum_token');
    localStorage.removeItem('forum_user');
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
