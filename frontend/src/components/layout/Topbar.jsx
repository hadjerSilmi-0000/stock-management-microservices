import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';

const Topbar = ({ title, subtitle }) => {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  return (
    <div className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        {subtitle && <div style={{ fontSize: '12px', color: 'var(--slate-500)', marginTop: '1px' }}>{subtitle}</div>}
      </div>
      <div className="topbar-actions">
        <div className="search-bar">
          <Icon name="Search" size={14} style={{ color: 'var(--slate-500)' }} />
          <input placeholder="Search anything…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="topbar-btn" onClick={() => navigate('/stock')}>
          <Icon name="Bell" size={16} />
          <div className="topbar-badge" />
        </button>
        <button className="topbar-btn" onClick={() => navigate('/settings')}>
          <Icon name="Settings" size={16} />
        </button>
      </div>
    </div>
  );
};

export default Topbar;
