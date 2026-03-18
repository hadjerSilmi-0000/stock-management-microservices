import { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import Icon from '../../components/ui/Icon';
import { useToast } from '../../context/ToastContext';
import { stockAPI } from '../../services/api';

const STATUS_COLOR = { ok: 'badge-green', low: 'badge-orange', critical: 'badge-red', out: 'badge-slate' };
const STATUS_LABEL = { ok: 'In Stock', low: 'Low Stock', critical: 'Critical', out: 'Out of Stock' };

const getStatus = (qty, threshold) => {
  if (qty === 0) return 'out';
  if (qty <= threshold / 2) return 'critical';
  if (qty <= threshold) return 'low';
  return 'ok';
};

const StockPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('levels');
  const [alerts, setAlerts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [entryType, setEntryType] = useState('entry');
  const [movFilter, setMovFilter] = useState({ type: '', limit: 20 });
  const [form, setForm] = useState({ productId: '', quantity: '', reason: '', reference: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [summRes, alertRes, movRes] = await Promise.allSettled([
      stockAPI.getSummary(),
      stockAPI.getAlerts(10),
      stockAPI.getMovements({ limit: 20, ...(movFilter.type && { type: movFilter.type }) }),
    ]);
    if (summRes.status === 'fulfilled') setSummary(summRes.value.data.summary);
    if (alertRes.status === 'fulfilled') setAlerts(alertRes.value.data.alerts || []);
    if (movRes.status === 'fulfilled') setMovements(movRes.value.data.movements || []);
    setLoading(false);
  }, [movFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleStockOp = async () => {
    if (!form.productId || !form.quantity || !form.reason) {
      return toast('Product ID, quantity, and reason are required', 'error');
    }
    setSaving(true);
    try {
      const payload = { productId: form.productId, quantity: Number(form.quantity), reason: form.reason, reference: form.reference };
      if (entryType === 'entry') {
        await stockAPI.entry(payload);
        toast('Stock entry recorded successfully', 'success');
      } else {
        await stockAPI.exit(payload);
        toast('Stock exit recorded successfully', 'success');
      }
      setShowModal(false);
      setForm({ productId: '', quantity: '', reason: '', reference: '' });
      loadData();
    } catch (err) {
      toast(err.response?.data?.message || `Stock ${entryType} failed`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openModal = type => { setEntryType(type); setShowModal(true); };

  const TABS = ['levels', 'movements', 'alerts'];

  return (
    <AppLayout title="Stock Management" subtitle="Track inventory levels and movements">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Stock Management</h1>
          <p className="page-subtitle">Real-time inventory levels and movement history</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-success" onClick={() => openModal('entry')}><Icon name="Download" size={14} />Stock Entry</button>
          <button className="btn btn-danger" onClick={() => openModal('exit')}><Icon name="Upload" size={14} />Stock Exit</button>
        </div>
      </div>

      {/* Summary */}
      <div className="stats-row">
        {[
          { label: 'Tracked SKUs', value: summary?.totalProducts ?? '—', icon: 'Box', color: 'orange' },
          { label: 'Total Units', value: summary?.totalQuantity?.toLocaleString() ?? '—', icon: 'Archive', color: 'green' },
          { label: 'Low / Critical', value: summary?.lowStockCount ?? '—', icon: 'AlertTriangle', color: 'blue' },
          { label: 'Movements (24h)', value: summary?.recentMovementsCount ?? '—', icon: 'Activity', color: 'purple' },
        ].map((s, i) => (
          <div key={i} className="stat-widget" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="stat-widget-header"><div className={`stat-icon ${s.color}`}><Icon name={s.icon} size={18} /></div></div>
            <div className="stat-value">{loading ? <div className="spinner" style={{ margin: '4px 0' }} /> : s.value.toString()}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)',
            background: activeTab === tab ? 'rgba(249,115,22,0.15)' : 'transparent',
            color: activeTab === tab ? 'var(--orange-400)' : 'var(--slate-400)', transition: 'all .15s',
          }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'alerts' && alerts.length > 0 && (
              <span style={{ marginLeft: 6, background: 'var(--red-500)', color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 999 }}>{alerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* LEVELS TAB */}
      {activeTab === 'levels' && (
        <div className="card animate-fadeIn">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>
          ) : alerts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="Archive" size={28} /></div>
              <div className="empty-state-title">No stock data yet</div>
              <div className="empty-state-desc">Create products first, then record stock entries.</div>
            </div>
          ) : (
            <table>
              <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Status</th><th>Level</th></tr></thead>
              <tbody>
                {alerts.map((a, i) => {
                  const status = getStatus(a.currentQuantity, a.threshold);
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: 'var(--slate-100)', fontSize: 13 }}>{a.productName || '—'}</td>
                      <td><code style={{ fontSize: 11, color: 'var(--orange-400)', background: 'rgba(249,115,22,0.08)', padding: '2px 6px', borderRadius: 4 }}>{a.sku}</code></td>
                      <td><span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'white' }}>{a.currentQuantity}</span></td>
                      <td><span className={`badge ${STATUS_COLOR[status]}`}>{STATUS_LABEL[status]}</span></td>
                      <td style={{ width: 200 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-bar" style={{ flex: 1, marginTop: 0 }}>
                            <div className="progress-fill" style={{
                              width: `${Math.min((a.currentQuantity / Math.max(a.threshold * 3, 1)) * 100, 100)}%`,
                              background: status === 'ok' ? 'linear-gradient(90deg,var(--green-500),var(--green-400))' :
                                status === 'low' ? 'linear-gradient(90deg,var(--orange-500),var(--amber-400))' :
                                'linear-gradient(90deg,var(--red-500),var(--red-400))'
                            }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* MOVEMENTS TAB */}
      {activeTab === 'movements' && (
        <div className="card animate-fadeIn">
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <select className="form-select" style={{ width: 160 }} value={movFilter.type} onChange={e => setMovFilter(p => ({ ...p, type: e.target.value }))}>
              <option value="">All types</option>
              <option value="entry">Entry only</option>
              <option value="exit">Exit only</option>
            </select>
            <button className="btn btn-ghost btn-sm" onClick={loadData}><Icon name="RefreshCw" size={13} />Refresh</button>
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>
          ) : movements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="Activity" size={28} /></div>
              <div className="empty-state-title">No movements recorded</div>
              <div className="empty-state-desc">Use the Stock Entry / Exit buttons to record inventory changes.</div>
            </div>
          ) : (
            <table>
              <thead><tr><th>Product ID</th><th>Type</th><th>Qty</th><th>Reason</th><th>Reference</th><th>By</th><th>Date</th></tr></thead>
              <tbody>
                {movements.map((m, i) => (
                  <tr key={i}>
                    <td><code style={{ fontSize: 11, color: 'var(--slate-400)', fontFamily: 'monospace' }}>{m.productId}</code></td>
                    <td><span className={`badge ${m.type === 'entry' ? 'badge-green' : 'badge-red'}`}><Icon name={m.type === 'entry' ? 'Download' : 'Upload'} size={10} />{m.type}</span></td>
                    <td style={{ fontWeight: 700, color: 'white' }}>{m.quantity}</td>
                    <td style={{ color: 'var(--slate-400)', fontSize: 13 }}>{m.reason}</td>
                    <td><code style={{ fontSize: 11, color: 'var(--orange-400)', background: 'rgba(249,115,22,0.08)', padding: '2px 6px', borderRadius: 4 }}>{m.reference || '—'}</code></td>
                    <td><code style={{ fontSize: 11, color: 'var(--slate-500)' }}>{m.performedBy}</code></td>
                    <td style={{ fontSize: 11, color: 'var(--slate-500)' }}>{new Date(m.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ALERTS TAB */}
      {activeTab === 'alerts' && (
        <div className="card animate-fadeIn">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>
          ) : alerts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="CheckCircle" size={28} style={{ color: 'var(--green-400)' }} /></div>
              <div className="empty-state-title">All stock levels are healthy</div>
              <div className="empty-state-desc">No low stock alerts at the moment.</div>
            </div>
          ) : (
            alerts.map((a, i) => {
              const status = getStatus(a.currentQuantity, a.threshold);
              return (
                <div key={i} className={`alert-item ${status === 'out' ? 'critical' : status}`}>
                  <Icon name={status === 'out' ? 'XCircle' : status === 'critical' ? 'AlertTriangle' : 'AlertCircle'} size={16}
                    style={{ color: status === 'out' || status === 'critical' ? 'var(--red-400)' : 'var(--orange-400)', flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1 }}>
                    <div className="alert-title">
                      {a.productName || 'Unknown Product'}
                      <code style={{ fontSize: 10, fontWeight: 400, color: 'var(--slate-500)', marginLeft: 8 }}>{a.sku}</code>
                    </div>
                    <div className="alert-desc">
                      {status === 'out' ? 'OUT OF STOCK — Immediate reorder required'
                        : status === 'critical' ? `CRITICAL: Only ${a.currentQuantity} units (min: ${a.threshold})`
                        : `Low stock: ${a.currentQuantity} units remaining (min: ${a.threshold})`}
                    </div>
                  </div>
                  <div style={{ width: 80 }}>
                    <div className="progress-bar" style={{ marginTop: 0 }}>
                      <div className="progress-fill" style={{
                        width: status === 'out' ? '0%' : `${Math.min((a.currentQuantity / a.threshold) * 50, 100)}%`,
                        background: 'var(--red-500)'
                      }} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Entry/Exit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`badge ${entryType === 'entry' ? 'badge-green' : 'badge-red'}`}>
                  <Icon name={entryType === 'entry' ? 'Download' : 'Upload'} size={12} />{entryType.toUpperCase()}
                </span>
                Record Stock {entryType === 'entry' ? 'Entry' : 'Exit'}
              </span>
              <button className="modal-close" onClick={() => setShowModal(false)}><Icon name="X" size={14} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Product ID *</label>
              <input className="form-input" value={form.productId} onChange={e => setForm(p => ({ ...p, productId: e.target.value }))} placeholder="MongoDB ObjectId of the product" style={{ fontFamily: 'monospace' }} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input className="form-input" type="number" min={1} value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} placeholder="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Reference</label>
                <input className="form-input" value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} placeholder="PO-2025-001" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Reason *</label>
              <input className="form-input" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder={entryType === 'entry' ? 'e.g. Supplier delivery, Restocking…' : 'e.g. Customer order, Transfer…'} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button className={`btn ${entryType === 'entry' ? 'btn-success' : 'btn-danger'}`} onClick={handleStockOp} disabled={saving}>
                {saving
                  ? <><div className="spinner" style={{ width: 14, height: 14, borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'white' }} />Processing…</>
                  : <><Icon name={entryType === 'entry' ? 'Download' : 'Upload'} size={14} />Confirm {entryType === 'entry' ? 'Entry' : 'Exit'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default StockPage;
