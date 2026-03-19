import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  withCredentials: true,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, error => Promise.reject(error));

api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url || '';

    const isAuthEndpoint = (
      url.includes('/users/login') ||
      url.includes('/users/register') ||
      url.includes('/users/refresh-token') ||
      url.includes('/users/forgot-password') ||
      url.includes('/users/reset-password') ||
      url.includes('/users/verify-email')
    );

    if (isAuthEndpoint) return Promise.reject(error);

    if (status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post(
          `${BASE}/users/refresh-token`,
          {},
          { withCredentials: true }
        );
        const newToken = data?.data?.accessToken || data?.accessToken;
        if (newToken) {
          localStorage.setItem('accessToken', newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
      } catch {
        _handleAuthFailure();
        return Promise.reject(error);
      }
    }

    if (status === 403 && original._retry) {
      _handleAuthFailure();
    }

    return Promise.reject(error);
  }
);

function _handleAuthFailure() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('sf_user');
  if (typeof window.__sfForceLogout === 'function') {
    window.__sfForceLogout();
  } else {
    const publicPaths = ['/', '/login', '/register', '/forgot-password'];
    if (!publicPaths.includes(window.location.pathname)) {
      window.location.href = '/login';
    }
  }
}

export const authAPI = {
  register: data => api.post('/users/register', data),
  login: credentials => api.post('/users/login', credentials),
  logout: () => api.post('/users/logout', {}),
  verifyEmail: token => api.get(`/users/verify-email/${token}`),
  forgotPassword: email => api.post('/users/forgot-password', { email }),
  resetPassword: (token, pwd) => api.post('/users/reset-password', { token, password: pwd, confirmPassword: pwd }),
  refreshToken: () => api.post('/users/refresh-token', {}),
  getProfile: () => api.get('/users/profile'),
  updateProfile: data => api.put('/users/profile', data),
  changePassword: data => api.put('/users/change-password', data),
  verifyToken: () => api.get('/users/verify-token'),
  getMe: () => api.get('/users/me'),
};

export const userAPI = {
  getAll: params => api.get('/users', { params }),
  getById: id => api.get(`/users/${id}`),
  update: (id, d) => api.put(`/users/${id}`, d),
  delete: id => api.delete(`/users/${id}`),
};

export const productsAPI = {
  getAll: params => api.get('/products', { params }),
  getById: id => api.get(`/products/${id}`),
  create: data => api.post('/products', data),
  update: (id, d) => api.put(`/products/${id}`, d),
  delete: id => api.delete(`/products/${id}`),
  search: q => api.get('/products/search', { params: { q } }),
};

export const stockAPI = {
  entry: data => api.post('/stock/entry', data),
  exit: data => api.post('/stock/exit', data),
  getLevel: productId => api.get(`/stock/product/${productId}`),
  getMovements: params => api.get('/stock/movements', { params }),
  getAlerts: threshold => api.get('/stock/alerts', { params: { threshold } }),
  getSummary: () => api.get('/stock/summary'),
};

// GET /suppliers takes NO query params — backend returns 400 if you pass any
export const suppliersAPI = {
  getAll: () => api.get('/suppliers'),
  getById: id => api.get(`/suppliers/${id}`),
  create: data => api.post('/suppliers', data),
  update: (id, d) => api.put(`/suppliers/${id}`, d),
  delete: id => api.delete(`/suppliers/${id}`),
  search: q => api.get('/suppliers/search', { params: { q } }),
  getActive: () => api.get('/suppliers/active'),
};

export default api;