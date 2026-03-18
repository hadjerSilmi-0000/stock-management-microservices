import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api/v1/users';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
  withCredentials: true,
});

// Request interceptor — attach token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, error => Promise.reject(error));

// Response interceptor — handle 401 / token refresh
api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refreshToken');
        if (refresh) {
          const { data } = await axios.post(`${API_BASE_URL}/refresh-token`, { refreshToken: refresh });
          localStorage.setItem('accessToken', data.accessToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
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

// ─── AUTH ─────────────────────────────────────────────────────
export const authAPI = {
  register: data => api.post('/register', data),
  login: credentials => api.post('/login', credentials),
  logout: () => api.post('/logout'),
  verifyEmail: token => api.get(`/verify-email/${token}`),
  forgotPassword: email => api.post('/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/reset-password', { token, newPassword: password }),
  refreshToken: refreshToken => api.post('/refresh-token', { refreshToken }),
  getProfile: () => api.get('/profile'),
  updateProfile: data => api.put('/profile', data),
  changePassword: data => api.put('/change-password', data),
  verifyToken: () => api.get('/verify-token'),
};

// ─── USERS (ADMIN) ────────────────────────────────────────────
export const userAPI = {
  getAll: () => api.get('/'),
  getById: id => api.get(`/${id}`),
  update: (id, data) => api.put(`/${id}`, data),
  delete: id => api.delete(`/${id}`),
};

// ─── PRODUCTS ─────────────────────────────────────────────────
const PRODUCTS_URL = process.env.REACT_APP_PRODUCTS_URL || 'http://localhost:5002/api/v1/products';
const productsApi = axios.create({ baseURL: PRODUCTS_URL, withCredentials: true });
productsApi.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const productsAPI = {
  getAll: (params) => productsApi.get('/', { params }),
  getById: id => productsApi.get(`/${id}`),
  create: data => productsApi.post('/', data),
  update: (id, data) => productsApi.put(`/${id}`, data),
  delete: id => productsApi.delete(`/${id}`),
  search: q => productsApi.get('/search', { params: { q } }),
};

// ─── STOCK ────────────────────────────────────────────────────
const STOCK_URL = process.env.REACT_APP_STOCK_URL || 'http://localhost:5003/api/v1/stock';
const stockApi = axios.create({ baseURL: STOCK_URL, withCredentials: true });
stockApi.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const stockAPI = {
  entry: data => stockApi.post('/entry', data),
  exit: data => stockApi.post('/exit', data),
  getLevel: productId => stockApi.get(`/product/${productId}`),
  getMovements: params => stockApi.get('/movements', { params }),
  getAlerts: threshold => stockApi.get('/alerts', { params: { threshold } }),
  getSummary: () => stockApi.get('/summary'),
};

// ─── SUPPLIERS ────────────────────────────────────────────────
const SUPPLIERS_URL = process.env.REACT_APP_SUPPLIERS_URL || 'http://localhost:5004/api/v1/suppliers';
const suppliersApi = axios.create({ baseURL: SUPPLIERS_URL, withCredentials: true });
suppliersApi.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const suppliersAPI = {
  getAll: () => suppliersApi.get('/'),
  getById: id => suppliersApi.get(`/${id}`),
  create: data => suppliersApi.post('/', data),
  update: (id, data) => suppliersApi.put(`/${id}`, data),
  delete: id => suppliersApi.delete(`/${id}`),
  search: q => suppliersApi.get('/search', { params: { q } }),
  getActive: () => suppliersApi.get('/active'),
};

export default api;
