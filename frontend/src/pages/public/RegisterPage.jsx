import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Icon from '../../components/ui/Icon';

const RegisterPage = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', role: 'manager' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const upd = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    const result = await register(form);
    setLoading(false);
    if (result.success) { setSuccess(true); toast('Account created! Check your email.', 'success'); }
    else setError(result.message);
  };

  if (success) return (
    <div className="verify-page">
      <div className="verify-card">
        <div className="verify-icon" style={{ background: 'rgba(34,197,94,0.1)' }}>
          <Icon name="Mail" size={32} style={{ color: 'var(--green-400)' }} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 8 }}>Check your inbox</h2>
        <p style={{ color: 'var(--slate-400)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          We've sent a verification link to <strong style={{ color: 'white' }}>{form.email}</strong>.
        </p>
        <button className="btn btn-orange" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/login')}>
          Back to Login
        </button>
      </div>
    </div>
  );

  return (
    <div className="auth-layout">
      <div className="auth-left">
        <div className="auth-form-wrapper">
          <div className="auth-logo">
            <div className="auth-logo-icon"><Icon name="Layers" size={20} style={{ color: 'white' }} /></div>
            <span className="auth-logo-text">StockFlow</span>
          </div>
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">Join the smarter way to manage inventory</p>

          {error && <div className="auth-error"><Icon name="AlertCircle" size={14} />{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Username</label>
                <div style={{ position: 'relative' }}>
                  <Icon name="User" size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-500)', pointerEvents: 'none' }} />
                  <input className="form-input" value={form.username} onChange={upd('username')} placeholder="johndoe" required style={{ paddingLeft: 42 }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={upd('role')}>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <div style={{ position: 'relative' }}>
                <Icon name="Mail" size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-500)', pointerEvents: 'none' }} />
                <input className="form-input" type="email" value={form.email} onChange={upd('email')} placeholder="you@company.com" required style={{ paddingLeft: 42 }} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Icon name="Lock" size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-500)', pointerEvents: 'none' }} />
                  <input className="form-input" type="password" value={form.password} onChange={upd('password')} placeholder="••••••••" required style={{ paddingLeft: 42 }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <Icon name="Lock" size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-500)', pointerEvents: 'none' }} />
                  <input className="form-input" type="password" value={form.confirmPassword} onChange={upd('confirmPassword')} placeholder="••••••••" required style={{ paddingLeft: 42 }} />
                </div>
              </div>
            </div>
            <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
              {loading
                ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'white' }} />Creating…</span>
                : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--slate-500)' }}>
            Already have an account? <span className="auth-link" onClick={() => navigate('/login')}>Sign in</span>
          </p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-right-inner">
          <div className="floating-badge" style={{ top: '20%', right: '8%', animationDelay: '0s' }}>
            <Icon name="Users" size={12} style={{ marginRight: 4 }} />500+ teams onboard
          </div>
          <div className="floating-badge" style={{ bottom: '30%', left: '6%', animationDelay: '1.2s' }}>
            <Icon name="Globe" size={12} style={{ marginRight: 4 }} />40+ countries
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 800, color: 'white', lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 16, textAlign: 'center', position: 'relative', zIndex: 1 }}>
            Join <span style={{ background: 'linear-gradient(135deg,var(--orange-400),var(--amber-400))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>thousands</span><br />of operations teams
          </h2>
          <p style={{ color: 'var(--slate-400)', fontSize: 15, textAlign: 'center', lineHeight: 1.6, maxWidth: 300, marginBottom: 40, position: 'relative', zIndex: 1 }}>
            Set up your inventory workspace in minutes. No credit card required.
          </p>
          <div className="stats-grid">
            {[{ value: '500+', label: 'Companies' }, { value: '2M+', label: 'SKUs managed' }, { value: 'Free', label: 'Starter plan' }, { value: '5 min', label: 'Setup time' }].map((s, i) => (
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

export default RegisterPage;
