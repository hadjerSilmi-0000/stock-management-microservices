import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { authAPI } from '../../services/api';

export const ResetPasswordPage = () => {
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const { token } = useParams();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      await authAPI.resetPassword(token, form.password);
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset link is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verify-page">
      <div className="verify-card">
        {!done ? (
          <>
            <div className="verify-icon" style={{ background: 'rgba(249,115,22,0.1)' }}>
              <Icon name="Lock" size={28} style={{ color: 'var(--orange-400)' }} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 8 }}>Reset Password</h2>
            <p style={{ color: 'var(--slate-400)', fontSize: 14, marginBottom: 24 }}>Enter your new password below.</p>
            {error && <div className="auth-error" style={{ marginBottom: 16 }}><Icon name="AlertCircle" size={14} />{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" required />
                <p style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 4 }}>Must be at least 6 characters</p>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input className="form-input" type="password" value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))} placeholder="••••••••" required />
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading
                  ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'white' }} />Resetting…</span>
                  : 'Reset Password'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="verify-icon" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <Icon name="CheckCircle" size={28} style={{ color: 'var(--green-400)' }} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 8 }}>Password Reset!</h2>
            <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>Redirecting to login in a moment…</p>
          </>
        )}
      </div>
    </div>
  );
};

export const VerifyEmailPage = () => {
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const verify = async () => {
      if (!token) { setStatus('error'); setMessage('Invalid verification link.'); return; }
      try {
        const res = await authAPI.verifyEmail(token);
        if (res.data.success) {
          setStatus('success');
          setMessage(res.data.message || 'Your email has been verified successfully.');
          setTimeout(() => navigate('/login'), 3000);
        } else {
          setStatus('error');
          setMessage(res.data.message || 'Email verification failed.');
        }
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'The verification link is invalid or has expired.');
      }
    };
    verify();
  }, [token, navigate]);

  return (
    <div className="verify-page">
      <div className="verify-card">
        {status === 'loading' && (
          <>
            <div className="verify-icon" style={{ background: 'rgba(249,115,22,0.1)' }}>
              <div className="spinner" style={{ width: 32, height: 32, borderColor: 'rgba(249,115,22,0.2)', borderTopColor: 'var(--orange-400)' }} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 8 }}>Verifying Email…</h2>
            <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>Please wait while we verify your email address.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="verify-icon" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <Icon name="CheckCircle" size={28} style={{ color: 'var(--green-400)' }} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 8 }}>Email Verified!</h2>
            <p style={{ color: 'var(--slate-400)', fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>{message}</p>
            <p style={{ color: 'var(--slate-500)', fontSize: 12, marginBottom: 24 }}>Redirecting to login in 3 seconds…</p>
            <button className="btn btn-orange" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/login')}>Go to Login</button>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="verify-icon" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <Icon name="XCircle" size={28} style={{ color: 'var(--red-400)' }} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 8 }}>Verification Failed</h2>
            <p style={{ color: 'var(--slate-400)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn-orange" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/register')}>Register Again</button>
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/login')}>Back to Login</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
