import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Decode JWT payload without verifying (client-side check only)
function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch {
    return null;
  }
}

// Check if a JWT token is expired (or will expire in next 30s)
function isTokenExpired(token) {
  const decoded = decodeJwt(token);
  if (!decoded || !decoded.exp) return true;
  // expired if less than 30 seconds left
  return decoded.exp * 1000 < Date.now() + 30000;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const logoutRef = useRef(null); // avoid circular dep in interceptor

  const clearStorage = useCallback(() => {
    localStorage.removeItem('sf_user');
    localStorage.removeItem('accessToken');
    setUser(null);
  }, []);

  // Called by api.js interceptor when refresh fails — navigate to login
  const forceLogout = useCallback(() => {
    clearStorage();
    // Only redirect if not already on auth page
    if (!window.location.pathname.startsWith('/login') &&
      !window.location.pathname.startsWith('/register') &&
      !window.location.pathname === '/') {
      window.location.href = '/login';
    }
  }, [clearStorage]);

  // Expose forceLogout globally so api.js interceptor can call it
  useEffect(() => {
    window.__sfForceLogout = forceLogout;
    return () => { delete window.__sfForceLogout; };
  }, [forceLogout]);

  useEffect(() => {
    const init = async () => {
      const storedUser = localStorage.getItem('sf_user');
      const storedToken = localStorage.getItem('accessToken');

      if (!storedUser || !storedToken) {
        setLoading(false);
        return;
      }

      // Check if stored token is expired
      if (isTokenExpired(storedToken)) {
        // Try to refresh
        try {
          const { data } = await authAPI.refreshToken();
          const newToken = data?.data?.accessToken || data?.accessToken;
          if (newToken) {
            localStorage.setItem('accessToken', newToken);
            try { setUser(JSON.parse(storedUser)); } catch { }
          } else {
            // Refresh gave no token — clear and send to login
            clearStorage();
          }
        } catch {
          // Refresh failed (403 = refresh token expired/invalid)
          // Clear everything — user must log in again
          clearStorage();
        }
      } else {
        // Token still valid — restore session
        try { setUser(JSON.parse(storedUser)); } catch { clearStorage(); }
      }

      setLoading(false);
    };

    init();
  }, [clearStorage]);

  const login = async (email, password) => {
    try {
      const res = await authAPI.login({ email, password });
      const body = res.data;
      const data = body?.data;

      if (!data) return { success: false, message: 'Unexpected response from server' };

      const { accessToken, ...userData } = data;

      if (!accessToken) {
        return { success: false, message: 'Login failed — no token received' };
      }

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('sf_user', JSON.stringify(userData));
      setUser(userData);
      return { success: true, user: userData };
    } catch (err) {
      const msg = err.response?.data?.error?.message
        || err.response?.data?.message
        || 'Login failed.';
      return { success: false, message: msg };
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
      return {
        success: false,
        message: err.response?.data?.error?.message || err.response?.data?.message || 'Registration failed.'
      };
    }
  };

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch { /* ignore */ }
    clearStorage();
  }, [clearStorage]);

  logoutRef.current = logout;

  const refreshProfile = async () => {
    try {
      const res = await authAPI.getProfile();
      const updated = res.data?.data || res.data?.user || res.data;
      setUser(updated);
      localStorage.setItem('sf_user', JSON.stringify(updated));
      return { success: true, user: updated };
    } catch {
      return { success: false };
    }
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