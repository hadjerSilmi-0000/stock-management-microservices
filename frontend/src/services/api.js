import axios from 'axios';

// ─── Single gateway URL — all requests go through :5000 ──────────────────────
const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
  withCredentials: true, // send cookies (accessToken) automatically
});

// ─── Request interceptor — attach Bearer token if stored ─────────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, error => Promise.reject(error));

// ─── Response interceptor — auto refresh on 401 ──────────────────────────────
api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post(
          `${BASE}/users/refresh-token`,
          {},
          { withCredentials: true }
        );
        if (data.data?.accessToken) {
          localStorage.setItem('accessToken', data.data.accessToken);
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(original);
        }
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: data => api.post('/users/register', data),
  login: credentials => api.post('/users/login', credentials),
  logout: () => api.post('/users/logout'),
  verifyEmail: token => api.get(`/users/verify-email/${token}`),
  forgotPassword: email => api.post('/users/forgot-password', { email }),
  resetPassword: (token, pwd) => api.post('/users/reset-password', { token, password: pwd, confirmPassword: pwd }),
  refreshToken: () => api.post('/users/refresh-token'),
  getProfile: () => api.get('/users/profile'),
  updateProfile: data => api.put('/users/profile', data),
  changePassword: data => api.put('/users/change-password', data),
  verifyToken: () => api.get('/users/verify-token'),
  getMe: () => api.get('/users/me'),
};

// ─── USERS (Admin only) ───────────────────────────────────────────────────────
export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: id => api.get(`/users/${id}`),
  update: (id, d) => api.put(`/users/${id}`, d),
  delete: id => api.delete(`/users/${id}`),
};

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: id => api.get(`/products/${id}`),
  create: data => api.post('/products', data),
  update: (id, d) => api.put(`/products/${id}`, d),
  delete: id => api.delete(`/products/${id}`),
  search: q => api.get('/products/search', { params: { q } }),
};

// ─── STOCK ────────────────────────────────────────────────────────────────────
export const stockAPI = {
  entry: data => api.post('/stock/entry', data),
  exit: data => api.post('/stock/exit', data),
  getLevel: productId => api.get(`/stock/product/${productId}`),
  getMovements: params => api.get('/stock/movements', { params }),
  getAlerts: threshold => api.get('/stock/alerts', { params: { threshold } }),
  getSummary: () => api.get('/stock/summary'),
};

// ─── SUPPLIERS ────────────────────────────────────────────────────────────────
export const suppliersAPI = {
  getAll: (params) => api.get('/suppliers', { params }),
  getById: id => api.get(`/suppliers/${id}`),
  create: data => api.post('/suppliers', data),
  update: (id, d) => api.put(`/suppliers/${id}`, d),
  delete: id => api.delete(`/suppliers/${id}`),
  search: q => api.get('/suppliers/search', { params: { q } }),
  getActive: () => api.get('/suppliers/active'),
};

export default api;