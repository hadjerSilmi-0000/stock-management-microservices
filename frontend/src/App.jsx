import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute, AdminRoute, PublicRoute } from './components/layout/RouteGuards';

// Public
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import ForgotPasswordPage from './pages/public/ForgotPasswordPage';
import { ResetPasswordPage, VerifyEmailPage } from './pages/public/AuthHelperPages';

// Protected
import DashboardPage from './pages/protected/DashboardPage';
import ProductsPage from './pages/protected/ProductsPage';
import StockPage from './pages/protected/StockPage';
import SuppliersPage from './pages/protected/SuppliersPage';
import { ProfilePage, SettingsPage } from './pages/protected/ProfileSettings';

// Admin
import { AdminUsersPage, ReportsPage } from './pages/admin/AdminPages';

// Errors
import { UnauthorizedPage, NotFoundPage } from './pages/errors/ErrorPages';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              {/* ── PUBLIC ── */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
              <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              <Route path="/verify-email/:token" element={<VerifyEmailPage />} />

              {/* ── PROTECTED ── */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
              <Route path="/stock" element={<ProtectedRoute><StockPage /></ProtectedRoute>} />
              <Route path="/suppliers" element={<ProtectedRoute><SuppliersPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

              {/* ── ADMIN ── */}
              <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
              <Route path="/admin/reports" element={<AdminRoute><ReportsPage /></AdminRoute>} />

              {/* ── ERRORS ── */}
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;