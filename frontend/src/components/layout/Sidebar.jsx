import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Icon from '../ui/Icon';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const { toast } = useToast();
  const path = location.pathname;

  const mainNav = [
    { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { path: '/products', label: 'Products', icon: 'Package' },
    { path: '/stock', label: 'Stock', icon: 'Archive', badge: '3' },
    { path: '/suppliers', label: 'Suppliers', icon: 'Truck' },
  ];
  const adminNav = [
    { path: '/admin/users', label: 'Users', icon: 'Users' },
    { path: '/admin/reports', label: 'Reports', icon: 'BarChart2' },
  ];
  const bottomNav = [
    { path: '/profile', label: 'Profile', icon: 'User' },
    { path: '/settings', label: 'Settings', icon: 'Settings' },
  ];

  const handleLogout = () => {
    logout();
    toast('Logged out successfully', 'info');
    navigate('/login');
  };

  const NavBtn = ({ item }) => (
    <button className={`nav-item ${path === item.path ? 'active' : ''}`} onClick={() => navigate(item.path)}>
      <Icon name={item.icon} size={16} />
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge && <span className="nav-item-badge">{item.badge}</span>}
    </button>
  );

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Icon name="Layers" size={18} style={{ color: 'white' }} />
        </div>
        <span className="sidebar-logo-text">StockFlow</span>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Overview</div>
        {mainNav.map(item => <NavBtn key={item.path} item={item} />)}

        {isAdmin() && (
          <>
            <div className="nav-section-label" style={{ marginTop: 8 }}>Administration</div>
            {adminNav.map(item => <NavBtn key={item.path} item={item} />)}
          </>
        )}

        <div className="nav-section-label" style={{ marginTop: 8 }}>Account</div>
        {bottomNav.map(item => <NavBtn key={item.path} item={item} />)}

        <button className="nav-item" style={{ marginTop: 4, color: 'var(--red-400)' }} onClick={handleLogout}>
          <Icon name="LogOut" size={16} />
          <span>Logout</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="user-card" onClick={() => navigate('/profile')}>
          <div className="user-avatar">{user?.username?.[0]?.toUpperCase()}</div>
          <div>
            <div className="user-name">{user?.username}</div>
            <div className="user-role">{user?.role}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
