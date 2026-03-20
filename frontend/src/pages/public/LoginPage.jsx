import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import Icon from '../../components/ui/Icon';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      toast('Welcome back!', 'success');
      navigate('/dashboard', { replace: true });
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-left">
        <button className="theme-toggle" onClick={toggleTheme}
          style={{ position: 'absolute', top: 24, right: 24 }}
          title="Toggle theme"
        >
          <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={16} />
        </button>

        <div className="auth-form-wrapper">
          <div className="auth-logo">
            <div className="auth-logo-icon"><Icon name="Layers" size={20} style={{ color: 'white' }} /></div>
            <span className="auth-logo-text">StockFlow</span>
          </div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to your inventory dashboard</p>

          {error && <div className="auth-error"><Icon name="AlertCircle" size={14} />{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <div style={{ position: 'relative' }}>
                <Icon name="Mail" size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required style={{ paddingLeft: 42 }} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                Password
                <span className="auth-link" style={{ fontSize: 12 }} onClick={() => navigate('/forgot-password')}>Forgot password?</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Icon name="Lock" size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ paddingLeft: 42 }} />
              </div>
            </div>
            <div style={{ height: 8 }} />
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading
                ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'white' }} />Signing in…</span>
                : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--text-muted)' }}>
            No account? <span className="auth-link" onClick={() => navigate('/register')}>Create one free</span>
          </p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-right-inner">
          <div className="floating-badge" style={{ top: '18%', left: '8%', animationDelay: '0s' }}>
            <Icon name="TrendingUp" size={12} style={{ marginRight: 4 }} />+80% fewer stockouts
          </div>
          <div className="floating-badge" style={{ top: '30%', right: '6%', animationDelay: '1s' }}>
            <Icon name="Bell" size={12} style={{ marginRight: 4 }} />3 low-stock alerts
          </div>
          <div className="floating-badge" style={{ bottom: '28%', left: '5%', animationDelay: '0.5s' }}>
            <Icon name="CheckCircle" size={12} style={{ marginRight: 4 }} />Always accurate
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 16, textAlign: 'center', position: 'relative', zIndex: 1 }}>
            Know exactly<br /><span style={{ background: 'linear-gradient(135deg,var(--orange-400),var(--amber-400))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>what's in stock</span><br />at all times
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, textAlign: 'center', lineHeight: 1.6, maxWidth: 320, marginBottom: 40, position: 'relative', zIndex: 1 }}>
            Real-time inventory tracking with instant low-stock alerts and full movement history.
          </p>
          <div className="stats-grid">
            {[{ value: '2,840', label: 'Products tracked' }, { value: '98.2%', label: 'Stock accuracy' }, { value: '↓ 80%', label: 'Fewer stockouts' }, { value: '< 1hr', label: 'Setup time' }].map((s, i) => (
              <div key={i} className="stat-card" style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
                <div className="stat-card-value">{s.value}</div>
                <div className="stat-card-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;