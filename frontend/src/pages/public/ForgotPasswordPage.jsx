import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { authAPI } from '../../services/api';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verify-page">
      <div className="verify-card">
        {!sent ? (
          <>
            <div className="verify-icon" style={{ background: 'rgba(249,115,22,0.1)' }}>
              <Icon name="Lock" size={28} style={{ color: 'var(--orange-400)' }} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 8 }}>Forgot password?</h2>
            <p style={{ color: 'var(--slate-400)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
              Enter your email and we'll send you a reset link.
            </p>
            {error && (
              <div className="auth-error" style={{ marginBottom: 16 }}>
                <Icon name="AlertCircle" size={14} />{error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <div style={{ position: 'relative' }}>
                  <Icon name="Mail" size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-500)', pointerEvents: 'none' }} />
                  <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required style={{ paddingLeft: 42 }} />
                </div>
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="verify-icon" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <Icon name="CheckCircle" size={28} style={{ color: 'var(--green-400)' }} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 8 }}>Check your email</h2>
            <p style={{ color: 'var(--slate-400)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              We've sent a reset link to <strong style={{ color: 'white' }}>{email}</strong>
            </p>
          </>
        )}
        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }} onClick={() => navigate('/login')}>
          <Icon name="ArrowLeft" size={14} /> Back to login
        </button>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
