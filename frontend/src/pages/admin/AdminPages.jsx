import { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import Icon from '../../components/ui/Icon';
import { useToast } from '../../context/ToastContext';
import { SimpleBarChart, DonutChart } from '../../components/charts/Charts';
import { userAPI, stockAPI, productsAPI } from '../../services/api';

/* ─── ADMIN USERS PAGE ────────────────────────────────────────────────────── */
export const AdminUsersPage = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userAPI.getAll();
      setUsers(res.data.users || []);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleToggleStatus = async (u) => {
    const newStatus = u.status === 'active' ? 'inactive' : 'active';
    try {
      await userAPI.update(u._id || u.id, { status: newStatus });
      toast(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`, 'info');
      loadUsers();
    } catch (err) {
      toast(err.response?.data?.message || 'Update failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this user?')) return;
    try {
      await userAPI.delete(id);
      toast('User removed', 'info');
      loadUsers();
    } catch (err) {
      toast(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const SUMMARY = [
    { label: 'Total Users', value: users.length, icon: 'Users', color: 'orange' },
    { label: 'Active', value: users.filter(u => u.status === 'active').length, icon: 'CheckCircle', color: 'green' },
    { label: 'Admins', value: users.filter(u => u.role === 'admin').length, icon: 'ShieldCheck', color: 'blue' },
    { label: 'Pending', value: users.filter(u => u.status === 'pending').length, icon: 'AlertCircle', color: 'red' },
  ];

  return (
    <AppLayout title="User Management" subtitle="Admin panel — manage team access">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage user roles and access permissions</p>
        </div>
        <button className="btn btn-ghost" onClick={loadUsers}><Icon name="RefreshCw" size={14} />Refresh</button>
      </div>

      {/* Summary stats */}
      <div className="stats-row">
        {SUMMARY.map((s, i) => (
          <div key={i} className="stat-widget" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="stat-widget-header"><div className={`stat-icon ${s.color}`}><Icon name={s.icon} size={18} /></div></div>
            <div className="stat-value">{loading ? <div className="spinner" style={{ margin: '4px 0' }} /> : s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Icon name="Users" size={28} /></div>
            <div className="empty-state-title">No users found</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>User</th><th>Role</th><th>Status</th><th>Verified</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map(u => {
                const uid = u._id || u.id;
                return (
                  <tr key={uid}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,var(--orange-500),var(--orange-700))', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'white', flexShrink: 0, fontFamily: 'var(--font-display)' }}>
                          {u.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--slate-100)', fontSize: 13 }}>{u.username}</div>
                          <div style={{ fontSize: 11, color: 'var(--slate-600)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-orange' : 'badge-blue'}`}>
                        <Icon name={u.role === 'admin' ? 'ShieldCheck' : 'User'} size={10} />{u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.status === 'active' ? 'badge-green' : u.status === 'pending' ? 'badge-amber' : 'badge-slate'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td>
                      <Icon name={u.emailVerified ? 'CheckCircle' : 'XCircle'} size={16}
                        style={{ color: u.emailVerified ? 'var(--green-400)' : 'var(--slate-600)' }} />
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--slate-500)' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className={`btn btn-sm ${u.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => handleToggleStatus(u)}
                        >
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(uid)}>
                          <Icon name="Trash2" size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
};

/* ─── REPORTS PAGE ────────────────────────────────────────────────────────── */
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CAT_COLORS = {
  Electronics: 'var(--orange-500)', Furniture: 'var(--blue-400)',
  Clothing: 'var(--purple-400)', Tools: 'var(--green-400)',
  Food: 'var(--amber-400)', Other: 'var(--slate-400)',
};

export const ReportsPage = () => {
  const [summary, setSummary] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [summRes, prodsRes] = await Promise.allSettled([
        stockAPI.getSummary(),
        productsAPI.getAll({ limit: 200 }),
      ]);
      if (summRes.status === 'fulfilled') setSummary(summRes.value.data.summary);
      if (prodsRes.status === 'fulfilled') {
        const prods = prodsRes.value.data.data || [];
        const catMap = {};
        prods.forEach(p => { catMap[p.category] = (catMap[p.category] || 0) + 1; });
        setCategoryData(Object.entries(catMap).map(([label, value]) => ({ label, value, color: CAT_COLORS[label] || 'var(--slate-400)' })));
      }
      setLoading(false);
    };
    load();
  }, []);

  // Build a simple month chart using summary data
  const monthChart = MONTH_LABELS.map((label, i) => ({
    label,
    value: Math.floor(Math.random() * 300 + 100), // Placeholder — real data needs a dedicated reports API
  }));

  const statCards = [
    { label: 'Movements (24h)', value: summary?.recentMovementsCount ?? '—', icon: 'Activity', color: 'orange' },
    { label: 'Total SKUs', value: summary?.totalProducts ?? '—', icon: 'Package', color: 'green' },
    { label: 'Units in Stock', value: summary?.totalQuantity?.toLocaleString() ?? '—', icon: 'Archive', color: 'blue' },
    { label: 'Low Stock Items', value: summary?.lowStockCount ?? '—', icon: 'AlertTriangle', color: 'red' },
  ];

  return (
    <AppLayout title="Reports" subtitle="Analytics and insights">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Live inventory performance data</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        {statCards.map((s, i) => (
          <div key={i} className="stat-widget" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="stat-widget-header"><div className={`stat-icon ${s.color}`}><Icon name={s.icon} size={18} /></div></div>
            <div className="stat-value">{loading ? <div className="spinner" style={{ margin: '4px 0' }} /> : s.value.toString()}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-grid" style={{ marginBottom: 24 }}>
        <div className="card animate-fadeInUp delay-200">
          <div className="chart-title">Monthly Overview</div>
          <div className="chart-subtitle" style={{ marginBottom: 20 }}>
            Sample trend — connect a dedicated analytics endpoint for real data
          </div>
          <SimpleBarChart data={monthChart} />
        </div>
        <div className="card animate-fadeInUp delay-300">
          <div className="chart-title" style={{ marginBottom: 4 }}>Category Split</div>
          <div className="chart-subtitle">Live product distribution</div>
          {loading
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
            : categoryData.length === 0
              ? <div className="empty-state" style={{ padding: '24px 0' }}>
                  <div className="empty-state-title">No products yet</div>
                </div>
              : <DonutChart data={categoryData} />}
        </div>
      </div>

      {/* Live summary card */}
      <div className="card animate-fadeInUp delay-400">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'white', marginBottom: 16 }}>
          Live Inventory Summary
        </div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
        ) : summary ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {[
              { label: 'Total product SKUs tracked', value: summary.totalProducts ?? 0 },
              { label: 'Total units across all products', value: (summary.totalQuantity ?? 0).toLocaleString() },
              { label: 'Products at or below minimum stock', value: summary.lowStockCount ?? 0 },
              { label: 'Stock movements in last 24 hours', value: summary.recentMovementsCount ?? 0 },
            ].map((item, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--slate-400)' }}>{item.label}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--orange-400)' }}>{item.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-title">Could not load summary data</div>
            <div className="empty-state-desc">Make sure the stock service is running.</div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
