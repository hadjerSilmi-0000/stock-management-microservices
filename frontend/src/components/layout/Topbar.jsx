import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import { useTheme } from '../../context/ThemeContext';

const Topbar = ({ title, subtitle }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        {subtitle && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>{subtitle}</div>}
      </div>
      <div className="topbar-actions">
        <button className="topbar-btn" onClick={() => navigate('/stock')}>
          <Icon name="Bell" size={16} />
          <div className="topbar-badge" />
        </button>
        <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={16} />
        </button>
        <button className="topbar-btn" onClick={() => navigate('/settings')}>
          <Icon name="Settings" size={16} />
        </button>
      </div>
    </div>
  );
};

export default Topbar;