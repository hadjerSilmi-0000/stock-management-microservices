import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: verify existing token with backend
  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem('sf_user');
      if (!storedUser) { setLoading(false); return; }

      try {
        // Verify token is still valid with users service
        const res = await authAPI.verifyToken();
        if (res.data.valid) {
          setUser(res.data.user);
        } else {
          clearStorage();
        }
      } catch {
        // Token invalid or service down — clear and force re-login
        clearStorage();
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const clearStorage = () => {
    localStorage.removeItem('sf_user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  // ── LOGIN ──────────────────────────────────────────────────────
  const login = async (email, password) => {
    try {
      const res = await authAPI.login({ email, password });
      const { user: userData, accessToken, refreshToken } = res.data;

      // Your backend sets httpOnly cookies AND returns tokens in body
      // Store them both ways for maximum compatibility
      if (accessToken) localStorage.setItem('accessToken', accessToken);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('sf_user', JSON.stringify(userData));
      setUser(userData);
      return { success: true, user: userData };
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Check your credentials.';
      return { success: false, message: msg };
    }
  };

  // ── REGISTER ───────────────────────────────────────────────────
  const register = async (formData) => {
    try {
      const res = await authAPI.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: formData.role || 'manager',
      });
      return { success: true, message: res.data.message || 'Registration successful! Please verify your email.' };
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      return { success: false, message: msg };
    }
  };

  // ── LOGOUT ─────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // ignore logout errors — we clear locally regardless
    } finally {
      clearStorage();
    }
  }, []);

  // ── UPDATE PROFILE ─────────────────────────────────────────────
  const refreshProfile = async () => {
    try {
      const res = await authAPI.getProfile();
      const updated = res.data.user;
      setUser(updated);
      localStorage.setItem('sf_user', JSON.stringify(updated));
      return { success: true, user: updated };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to refresh profile' };
    }
  };

  const isAdmin = () => user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refreshProfile,
      isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
