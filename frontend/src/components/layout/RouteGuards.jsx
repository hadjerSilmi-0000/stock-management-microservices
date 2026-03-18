import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import FullLoader from '../../components/ui/FullLoader';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <FullLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

export const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <FullLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/unauthorized" replace />;
  return children;
};

export const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <FullLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
};
