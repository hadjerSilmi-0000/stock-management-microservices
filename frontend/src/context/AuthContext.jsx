import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage — no network call
    const storedUser = localStorage.getItem('sf_user');
    const storedToken = localStorage.getItem('accessToken');
    if (storedUser && storedToken) {
      try { setUser(JSON.parse(storedUser)); } catch { /* corrupted */ }
    }
    setLoading(false);
  }, []);

  const clearStorage = () => {
    localStorage.removeItem('sf_user');
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  const login = async (email, password) => {
    try {
      const res = await authAPI.login({ email, password });
      // { success: true, data: { id, username, email, role, accessToken } }
      const body = res.data;
      const data = body?.data;

      if (!data) return { success: false, message: 'Unexpected response from server' };

      const { accessToken, ...userData } = data;

      if (!accessToken) {
        console.error('Login response missing accessToken:', body);
        return { success: false, message: 'Login failed — no token received' };
      }

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
        username: formData.username, email: formData.email,
        password: formData.password, confirmPassword: formData.confirmPassword,
        role: formData.role || 'manager',
      });
      return { success: true, message: res.data?.message || 'Registration successful! Please verify your email.' };
    } catch (err) {
      return { success: false, message: err.response?.data?.error?.message || err.response?.data?.message || 'Registration failed.' };
    }
  };

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch { /* ignore */ }
    clearStorage();
  }, []);

  const refreshProfile = async () => {
    try {
      const res = await authAPI.getProfile();
      const updated = res.data?.data || res.data?.user || res.data;
      setUser(updated);
      localStorage.setItem('sf_user', JSON.stringify(updated));
      return { success: true, user: updated };
    } catch { return { success: false }; }
  };

  const isAdmin = () => user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, register, logout, refreshProfile, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;