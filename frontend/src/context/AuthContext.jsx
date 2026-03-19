import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function decodeJwt(token) {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}

function isExpired(token) {
  const d = decodeJwt(token);
  // Consider expired if less than 30s remaining
  return !d?.exp || d.exp * 1000 < Date.now() + 30000;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearStorage = useCallback(() => {
    localStorage.removeItem('sf_user');
    localStorage.removeItem('accessToken');
    // Note: refreshToken is httpOnly cookie — cleared by the backend on logout,
    // or by the browser when it expires. Never stored in localStorage.
    setUser(null);
  }, []);

  const forceLogout = useCallback(() => {
    clearStorage();
    const pub = ['/', '/login', '/register', '/forgot-password'];
    if (!pub.includes(window.location.pathname)) window.location.href = '/login';
  }, [clearStorage]);

  useEffect(() => {
    window.__sfForceLogout = forceLogout;
    return () => { delete window.__sfForceLogout; };
  }, [forceLogout]);

  // On app load: check if stored accessToken is still valid.
  // If expired, hit /refresh-token — the httpOnly cookie (sameSite: lax) is
  // sent automatically and a new accessToken comes back in the response body.
  useEffect(() => {
    const init = async () => {
      const storedUser = localStorage.getItem('sf_user');
      const storedToken = localStorage.getItem('accessToken');

      if (!storedUser || !storedToken) { setLoading(false); return; }

      if (isExpired(storedToken)) {
        try {
          // Cookie is sent automatically — no body payload needed
          const { data } = await authAPI.refreshToken();
          const newToken = data?.data?.accessToken || data?.accessToken;
          if (newToken) {
            localStorage.setItem('accessToken', newToken);
            try { setUser(JSON.parse(storedUser)); } catch { }
          } else {
            clearStorage();
          }
        } catch {
          // Refresh token also expired — user must log in again
          clearStorage();
        }
      } else {
        try { setUser(JSON.parse(storedUser)); } catch { clearStorage(); }
      }
      setLoading(false);
    };
    init();
  }, [clearStorage]);

  const login = async (email, password) => {
    try {
      const res = await authAPI.login({ email, password });
      const data = res.data?.data;
      if (!data) return { success: false, message: 'Unexpected response from server' };

      const { accessToken, ...userData } = data;
      // refreshToken is set as httpOnly cookie by the backend — never touches JS
      if (!accessToken) return { success: false, message: 'Login failed — no token received' };

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('sf_user', JSON.stringify(userData));
      setUser(userData);
      return { success: true, user: userData };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.error?.message || err.response?.data?.message || 'Login failed.',
      };
    }
  };

  const register = async (formData) => {
    try {
      const res = await authAPI.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: formData.role || 'manager',
      });
      return { success: true, message: res.data?.message || 'Registration successful! Please verify your email.' };
    } catch (err) {
      return { success: false, message: err.response?.data?.error?.message || err.response?.data?.message || 'Registration failed.' };
    }
  };

  const logout = useCallback(async () => {
    try {
      // Backend clears the httpOnly cookies
      await authAPI.logout();
    } catch { /* ignore — clear local state regardless */ }
    clearStorage();
  }, [clearStorage]);

  const refreshProfile = async () => {
    try {
      const res = await authAPI.getProfile();
      const u = res.data?.data || res.data?.user || res.data;
      setUser(u);
      localStorage.setItem('sf_user', JSON.stringify(u));
      return { success: true, user: u };
    } catch { return { success: false }; }
  };

  const isAdmin = () => user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user, loading,
      isAuthenticated: !!user,
      login, register, logout,
      refreshProfile, isAdmin,
      forceLogout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;