import { useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon';

export const UnauthorizedPage = () => {
  const navigate = useNavigate();
  return (
    <div className="error-page">
      <div className="error-code">401</div>
      <h1 className="error-title">Access Denied</h1>
      <p className="error-desc">You don't have permission to view this page. Admin privileges required.</p>
      <div style={{ display:'flex', gap:10 }}>
        <button className="btn btn-orange" onClick={() => navigate('/dashboard')}><Icon name="Home" size={14} />Go to Dashboard</button>
        <button className="btn btn-ghost" onClick={() => navigate('/login')}><Icon name="LogOut" size={14} />Sign In</button>
      </div>
    </div>
  );
};

export const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <div className="error-page">
      <div className="error-code">404</div>
      <h1 className="error-title">Page Not Found</h1>
      <p className="error-desc">The page you're looking for doesn't exist or has been moved.</p>
      <button className="btn btn-orange" onClick={() => navigate('/dashboard')}><Icon name="Home" size={14} />Back to Dashboard</button>
    </div>
  );
};
