import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import Icon from '../../components/ui/Icon';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authAPI } from '../../services/api';

/* ─── PROFILE PAGE ───────────────────────────────────────────────────────── */
export const ProfilePage = () => {
  const { user, logout, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: user?.username || '', email: user?.email || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  // ── Update profile ────────────────────────────────────────────
  const handleProfileSave = async () => {
    setSavingProfile(true);
    try {
      await authAPI.updateProfile({ username: form.username, email: form.email });
      await refreshProfile(); // Sync updated data back into AuthContext
      toast('Profile updated successfully', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Change password ───────────────────────────────────────────
  const handlePwSave = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast('Passwords do not match', 'error');
    if (pwForm.newPassword.length < 6) return toast('Password must be at least 6 characters', 'error');
    setSavingPw(true);
    try {
      await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast('Password changed successfully', 'success');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast(err.response?.data?.message || 'Password change failed', 'error');
    } finally {
      setSavingPw(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <AppLayout title="Profile" subtitle="Your account settings">
      <div className="page-header">
        <h1 className="page-title">Profile Settings</h1>
        <p className="page-subtitle">Manage your account information and security</p>
      </div>

      {/* Header card */}
      <div className="profile-header animate-fadeInUp">
        <div className="profile-avatar-lg">{user?.username?.[0]?.toUpperCase()}</div>
        <div>
          <div className="profile-name">{user?.username}</div>
          <div className="profile-email">{user?.email}</div>
          <div className="profile-badges">
            <span className={`badge ${user?.role === 'admin' ? 'badge-orange' : 'badge-blue'}`}>
              <Icon name={user?.role === 'admin' ? 'ShieldCheck' : 'User'} size={10} />{user?.role}
            </span>
            <span className={`badge ${user?.emailVerified ? 'badge-green' : 'badge-amber'}`}>
              <Icon name={user?.emailVerified ? 'CheckCircle' : 'AlertCircle'} size={10} />
              {user?.emailVerified ? 'Email Verified' : 'Unverified'}
            </span>
            <span className={`badge ${user?.status === 'active' ? 'badge-green' : 'badge-slate'}`}>
              <Icon name="Activity" size={10} />{user?.status}
            </span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-danger" onClick={handleLogout}>
            <Icon name="LogOut" size={14} />Sign Out
          </button>
        </div>
      </div>

      <div className="grid-2">
        {/* Personal Info */}
        <div className="card animate-fadeInUp delay-200">
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'white', marginBottom: 20 }}>Personal Information</h3>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <input className="form-input" value={user?.role || ''} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            <p style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 4 }}>Role is set by an administrator</p>
          </div>
          <button className="btn btn-orange" onClick={handleProfileSave} disabled={savingProfile}>
            {savingProfile
              ? <><div className="spinner" style={{ width: 14, height: 14, borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'white' }} />Saving…</>
              : <><Icon name="Check" size={14} />Save Changes</>}
          </button>
        </div>

        {/* Change Password */}
        <div className="card animate-fadeInUp delay-300">
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'white', marginBottom: 20 }}>Change Password</h3>
          <form onSubmit={handlePwSave}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input className="form-input" type="password" value={pwForm.currentPassword}
                onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))} placeholder="••••••••" required />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" value={pwForm.newPassword}
                onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))} placeholder="••••••••" required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input className="form-input" type="password" value={pwForm.confirmPassword}
                onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))} placeholder="••••••••" required />
            </div>
            <button className="btn btn-orange" type="submit" disabled={savingPw}>
              {savingPw
                ? <><div className="spinner" style={{ width: 14, height: 14, borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'white' }} />Updating…</>
                : <><Icon name="Lock" size={14} />Update Password</>}
            </button>
          </form>
        </div>
      </div>

      {/* Account info */}
      <div className="card animate-fadeInUp delay-400" style={{ marginTop: 16 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'white', marginBottom: 16 }}>Account Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'User ID', value: user?.id || user?._id || '—', mono: true },
            { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A' },
            { label: 'Last Updated', value: user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'N/A' },
          ].map((item, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--slate-600)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
              <div style={{ fontSize: item.mono ? 11 : 14, fontWeight: 500, color: 'var(--slate-200)', fontFamily: item.mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

/* ─── SETTINGS PAGE ──────────────────────────────────────────────────────── */
export const SettingsPage = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState({ lowStockDefault: 10, emailAlerts: true, criticalAlerts: true, darkMode: true, language: 'en', timezone: 'UTC' });
  const [saving, setSaving] = useState(false);
  const toggle = k => setSettings(p => ({ ...p, [k]: !p[k] }));

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600)); // Simulate save
    setSaving(false);
    toast('Settings saved', 'success');
  };

  const Toggle = ({ k }) => (
    <div onClick={() => toggle(k)} style={{ width: 40, height: 22, borderRadius: 999, background: settings[k] ? 'var(--orange-500)' : 'rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'background .2s', position: 'relative', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: settings[k] ? 'calc(100% - 19px)' : 3, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
    </div>
  );

  const SECTIONS = [
    {
      title: 'Inventory Defaults',
      items: [
        { label: 'Default Low Stock Threshold', desc: 'Alert when stock falls below this quantity', control: <input className="form-input" type="number" min={0} value={settings.lowStockDefault} onChange={e => setSettings(p => ({ ...p, lowStockDefault: +e.target.value }))} style={{ width: 80, padding: '6px 10px', textAlign: 'center' }} /> },
        { label: 'Language', desc: 'Interface language preference', control: <select className="form-select" style={{ width: 120 }} value={settings.language} onChange={e => setSettings(p => ({ ...p, language: e.target.value }))}><option value="en">English</option><option value="fr">Français</option><option value="ar">العربية</option></select> },
        { label: 'Timezone', desc: 'Used for timestamps and reports', control: <select className="form-select" style={{ width: 140 }} value={settings.timezone} onChange={e => setSettings(p => ({ ...p, timezone: e.target.value }))}><option>UTC</option><option>UTC+1</option><option>UTC+3</option></select> },
      ],
    },
    {
      title: 'Notifications',
      items: [
        { label: 'Email Alerts', desc: 'Receive low stock notifications via email', control: <Toggle k="emailAlerts" /> },
        { label: 'Critical Stock Alerts', desc: 'Get notified for critical & out-of-stock events', control: <Toggle k="criticalAlerts" /> },
      ],
    },
    {
      title: 'Appearance',
      items: [
        { label: 'Dark Mode', desc: 'Use dark theme across the application', control: <Toggle k="darkMode" /> },
      ],
    },
  ];

  return (
    <AppLayout title="Settings" subtitle="Configure your workspace">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Customize StockFlow for your team</p>
      </div>

      <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {SECTIONS.map((section, si) => (
          <div key={si} className="card animate-fadeInUp" style={{ animationDelay: `${si * 0.1}s` }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'white', marginBottom: 16 }}>{section.title}</h3>
            {section.items.map((item, ii) => (
              <div key={ii} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: ii < section.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--slate-200)', marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>{item.desc}</div>
                </div>
                {item.control}
              </div>
            ))}
          </div>
        ))}

        <button className="btn btn-orange" style={{ width: 'fit-content' }} onClick={handleSave} disabled={saving}>
          {saving
            ? <><div className="spinner" style={{ width: 14, height: 14, borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'white' }} />Saving…</>
            : <><Icon name="Check" size={14} />Save Settings</>}
        </button>
      </div>
    </AppLayout>
  );
};
