import { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import Icon from '../../components/ui/Icon';
import { useToast } from '../../context/ToastContext';
import { stockAPI, productsAPI } from '../../services/api';

const STATUS_COLOR = { ok: 'badge-green', low: 'badge-orange', critical: 'badge-red', out: 'badge-slate' };
const STATUS_LABEL = { ok: 'In Stock', low: 'Low Stock', critical: 'Critical', out: 'Out of Stock' };

const getStatus = (qty, threshold) => {
  if (qty === 0) return 'out';
  if (qty <= Math.floor(threshold / 2)) return 'critical';
  if (qty <= threshold) return 'low';
  return 'ok';
};

const enrich = (stockItems, productMap) =>
  stockItems.map(item => {
    const prod = productMap[item.productId];
    const isFallback =
      !item.productName ||
      item.productName.toLowerCase().includes('unknown') ||
      item.productName.toLowerCase().includes('unavailable') ||
      !item.sku || item.sku === 'N/A';
    if (prod && isFallback) {
      return { ...item, productName: prod.name, sku: prod.sku, threshold: item.threshold ?? prod.lowStockThreshold ?? 10 };
    }
    return item;
  });

const StockPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('levels');
  const [rawStock, setRawStock] = useState([]);
  const [productMap, setProductMap] = useState({});
  const [movements, setMovements] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [movLoading, setMovLoading] = useState(true);
  const [movFilter, setMovFilter] = useState('');
  const [search, setSearch] = useState('');
  const [movSearch, setMovSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [entryType, setEntryType] = useState('entry');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ productId: '', quantity: '', reason: '', reference: '' });

  const allLevels = enrich(rawStock, productMap);
  const alerts = allLevels.filter(a => getStatus(a.currentQuantity ?? 0, a.threshold ?? 10) !== 'ok');

  const filteredLevels = allLevels.filter(a => {
    const q = search.toLowerCase();
    const name = (a.productName || a.productId || '').toLowerCase();
    const sku = (a.sku || '').toLowerCase();
    const matchSearch = !q || name.includes(q) || sku.includes(q);
    const st = getStatus(a.currentQuantity ?? 0, a.threshold ?? 10);
    const matchStatus = !statusFilter || st === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredMovements = movements.filter(m => {
    const q = movSearch.toLowerCase();
    const prod = productMap[m.productId];
    const name = (prod?.name || m.productId || '').toLowerCase();
    const sku = (prod?.sku || '').toLowerCase();
    const ref = (m.reference || '').toLowerCase();
    const rsn = (m.reason || '').toLowerCase();
    return !q || name.includes(q) || sku.includes(q) || ref.includes(q) || rsn.includes(q);
  });

  const loadProductMap = useCallback(async () => {
    try {
      const res = await productsAPI.getAll({ limit: 200 });
      const list = res.data?.data || [];
      const map = {};
      list.forEach(p => { map[p._id] = { name: p.name, sku: p.sku, lowStockThreshold: p.lowStockThreshold ?? 10 }; });
      setProductMap(map);
    } catch { }
  }, []);

  const loadStock = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, stockRes] = await Promise.allSettled([
        stockAPI.getSummary(),
        stockAPI.getAlerts(999999),
      ]);
      if (sumRes.status === 'fulfilled') {
        const d = sumRes.value.data;
        setSummary(d?.data || d?.summary || d);
      }
      if (stockRes.status === 'fulfilled') {
        const d = stockRes.value.data;
        setRawStock(d?.data || d?.alerts || []);
      }
    } catch { toast('Failed to load stock data', 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  const loadMovements = useCallback(async () => {
    setMovLoading(true);
    try {
      const params = { limit: 100 };
      if (movFilter) params.type = movFilter;
      const res = await stockAPI.getMovements(params);
      setMovements(res.data?.data || res.data?.movements || []);
    } catch { toast('Failed to load movements', 'error'); }
    finally { setMovLoading(false); }
  }, [movFilter, toast]);

  useEffect(() => { loadProductMap(); loadStock(); }, [loadProductMap, loadStock]);
  useEffect(() => { if (activeTab === 'movements') loadMovements(); }, [activeTab, loadMovements]);

  const refresh = () => { loadProductMap(); loadStock(); if (activeTab === 'movements') loadMovements(); };

  const handleStockOp = async () => {
    if (!form.productId.trim() || !form.quantity || !form.reason.trim())
      return toast('Product ID, quantity, and reason are required', 'error');
    if (Number(form.quantity) < 1)
      return toast('Quantity must be at least 1', 'error');
    setSaving(true);
    try {
      const payload = { productId: form.productId.trim(), quantity: Number(form.quantity), reason: form.reason.trim(), reference: form.reference.trim() };
      entryType === 'entry' ? await stockAPI.entry(payload) : await stockAPI.exit(payload);
      toast('Stock ' + entryType + ' recorded successfully', 'success');
      setShowModal(false);
      setForm({ productId: '', quantity: '', reason: '', reference: '' });
      refresh();
    } catch (err) {
      toast(err.response?.data?.error?.message || err.response?.data?.message || ('Stock ' + entryType + ' failed'), 'error');
    } finally { setSaving(false); }
  };

  const statCards = [
    { label: 'Tracked SKUs', value: summary?.totalProducts, icon: 'Box', color: 'orange' },
    { label: 'Total Units', value: summary?.totalQuantity?.toLocaleString(), icon: 'Archive', color: 'green' },
    { label: 'Low / Critical', value: summary?.lowStockCount, icon: 'AlertTriangle', color: 'blue' },
    { label: 'Movements (24h)', value: summary?.recentMovementsCount, icon: 'Activity', color: 'purple' },
  ];

  return (
    <AppLayout title="Stock Management" subtitle="Track inventory levels and movements">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Stock Management</h1>
          <p className="page-subtitle">Real-time inventory levels and movement history</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={refresh}><Icon name="RefreshCw" size={14} />Refresh</button>
          <button className="btn btn-success" onClick={() => { setEntryType('entry'); setForm({ productId: '', quantity: '', reason: '', reference: '' }); setShowModal(true); }}>
            <Icon name="Download" size={14} />Stock Entry
          </button>
          <button className="btn btn-danger" onClick={() => { setEntryType('exit'); setForm({ productId: '', quantity: '', reason: '', reference: '' }); setShowModal(true); }}>
            <Icon name="Upload" size={14} />Stock Exit
          </button>
        </div>
      </div>

      <div className="stats-row">
        {statCards.map((s, i) => (
          <div key={i} className="stat-widget" style={{ animationDelay: (i * 0.1) + 's' }}>
            <div className="stat-widget-header"><div className={'stat-icon ' + s.color}><Icon name={s.icon} size={18} /></div></div>
            <div className="stat-value">
              {loading ? <div className="spinner" style={{ margin: '4px 0' }} /> : (s.value != null ? String(s.value) : '0')}
            </div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--input-bg)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {['levels', 'movements', 'alerts'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)',
            background: activeTab === tab ? 'rgba(249,115,22,0.15)' : 'transparent',
            color: activeTab === tab ? 'var(--orange-400)' : 'var(--text-secondary)', transition: 'all .15s',
          }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'alerts' && alerts.length > 0 && (
              <span style={{ marginLeft: 6, background: 'var(--red-500)', color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999 }}>
                {alerts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* LEVELS */}
      {activeTab === 'levels' && (
        <div className="card animate-fadeIn">
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div className="search-bar" style={{ flex: 1 }}>
              <Icon name="Search" size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                placeholder="Search by product name or SKU..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                  <Icon name="X" size={12} />
                </button>
              )}
            </div>
            <select className="form-select" style={{ width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="ok">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="critical">Critical</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>
          ) : allLevels.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="Archive" size={28} /></div>
              <div className="empty-state-title">No stock data yet</div>
              <div className="empty-state-desc">Use the Stock Entry button to record your first inventory entry.</div>
            </div>
          ) : filteredLevels.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="Search" size={28} /></div>
              <div className="empty-state-title">No results found</div>
              <div className="empty-state-desc">No products match your search. Try a different term or filter.</div>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                Showing {filteredLevels.length} of {allLevels.length} products
              </p>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Status</th><th>Level</th></tr></thead>
                  <tbody>
                    {filteredLevels.map((a, i) => {
                      const qty = a.currentQuantity ?? 0;
                      const thr = a.threshold ?? 10;
                      const st = getStatus(qty, thr);
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{a.productName || a.productId}</td>
                          <td><code style={{ fontSize: 11, color: 'var(--orange-400)', background: 'rgba(249,115,22,0.08)', padding: '2px 6px', borderRadius: 4 }}>{a.sku || '—'}</code></td>
                          <td><span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{qty}</span></td>
                          <td><span className={'badge ' + STATUS_COLOR[st]}>{STATUS_LABEL[st]}</span></td>
                          <td style={{ width: 180 }}>
                            <div className="progress-bar" style={{ marginTop: 0 }}>
                              <div className="progress-fill" style={{
                                width: Math.min((qty / Math.max(thr * 3, 1)) * 100, 100) + '%',
                                background: st === 'ok' ? 'linear-gradient(90deg,var(--green-500),var(--green-400))' : st === 'low' ? 'linear-gradient(90deg,var(--orange-500),var(--amber-400))' : 'linear-gradient(90deg,var(--red-500),var(--red-400))',
                              }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* MOVEMENTS */}
      {activeTab === 'movements' && (
        <div className="card animate-fadeIn">
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div className="search-bar" style={{ flex: 1 }}>
              <Icon name="Search" size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                placeholder="Search by product, reason, reference..."
                value={movSearch}
                onChange={e => setMovSearch(e.target.value)}
              />
              {movSearch && (
                <button onClick={() => setMovSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                  <Icon name="X" size={12} />
                </button>
              )}
            </div>
            <select className="form-select" style={{ width: 140 }} value={movFilter} onChange={e => setMovFilter(e.target.value)}>
              <option value="">All types</option>
              <option value="entry">Entry only</option>
              <option value="exit">Exit only</option>
            </select>
            <button className="btn btn-ghost btn-sm" onClick={loadMovements}><Icon name="RefreshCw" size={13} />Refresh</button>
          </div>
          {movLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>
          ) : movements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="Activity" size={28} /></div>
              <div className="empty-state-title">No movements recorded</div>
              <div className="empty-state-desc">Stock entries and exits will appear here.</div>
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="Search" size={28} /></div>
              <div className="empty-state-title">No results found</div>
              <div className="empty-state-desc">Try a different search term.</div>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                Showing {filteredMovements.length} of {movements.length} movements
              </p>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Product</th><th>Type</th><th>Qty</th><th>Reason</th><th>Reference</th><th>Date</th></tr></thead>
                  <tbody>
                    {filteredMovements.map((m, i) => {
                      const prod = productMap[m.productId];
                      return (
                        <tr key={i}>
                          <td>
                            <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>{prod?.name || m.productId}</div>
                            {prod?.sku && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{prod.sku}</div>}
                          </td>
                          <td>
                            <span className={'badge ' + (m.type === 'entry' ? 'badge-green' : 'badge-red')}>
                              <Icon name={m.type === 'entry' ? 'Download' : 'Upload'} size={10} />{m.type}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{m.quantity}</td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{m.reason}</td>
                          <td><code style={{ fontSize: 11, color: 'var(--orange-400)', background: 'rgba(249,115,22,0.08)', padding: '2px 6px', borderRadius: 4 }}>{m.reference || '—'}</code></td>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{m.timestamp ? new Date(m.timestamp).toLocaleString() : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ALERTS */}
      {activeTab === 'alerts' && (
        <div className="card animate-fadeIn">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>
          ) : alerts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="CheckCircle" size={28} style={{ color: 'var(--green-400)' }} /></div>
              <div className="empty-state-title">All stock levels are healthy</div>
              <div className="empty-state-desc">No products are at or below their minimum threshold.</div>
            </div>
          ) : alerts.map((a, i) => {
            const qty = a.currentQuantity ?? 0;
            const thr = a.threshold ?? 10;
            const st = getStatus(qty, thr);
            const sev = st === 'out' || st === 'critical' ? 'critical' : 'warning';
            return (
              <div key={i} className={'alert-item ' + sev}>
                <Icon name={st === 'out' ? 'XCircle' : st === 'critical' ? 'AlertTriangle' : 'AlertCircle'} size={16}
                  style={{ color: sev === 'critical' ? 'var(--red-400)' : 'var(--orange-400)', flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <div className="alert-title">
                    {a.productName || a.productId}
                    {a.sku && a.sku !== 'N/A' && <code style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>{a.sku}</code>}
                  </div>
                  <div className="alert-desc">
                    {st === 'out' ? 'OUT OF STOCK — Immediate reorder required'
                      : st === 'critical' ? 'CRITICAL: Only ' + qty + ' units remaining (min: ' + thr + ')'
                        : 'Low stock: ' + qty + ' units remaining (min: ' + thr + ')'}
                  </div>
                </div>
                <div style={{ width: 80 }}>
                  <div className="progress-bar" style={{ marginTop: 0 }}>
                    <div className="progress-fill" style={{ width: st === 'out' ? '0%' : Math.min((qty / thr) * 50, 100) + '%', background: 'var(--red-500)' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={'badge ' + (entryType === 'entry' ? 'badge-green' : 'badge-red')}>
                  <Icon name={entryType === 'entry' ? 'Download' : 'Upload'} size={12} />{entryType.toUpperCase()}
                </span>
                Record Stock {entryType === 'entry' ? 'Entry' : 'Exit'}
              </span>
              <button className="modal-close" onClick={() => setShowModal(false)}><Icon name="X" size={14} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Product ID *</label>
              <input className="form-input" value={form.productId} onChange={e => setForm(p => ({ ...p, productId: e.target.value }))}
                placeholder="Product ID" style={{ fontFamily: 'monospace' }} />

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
              <input className="form-input" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                placeholder={entryType === 'entry' ? 'Supplier delivery, Restocking...' : 'Customer order, Transfer...'} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button className={'btn ' + (entryType === 'entry' ? 'btn-success' : 'btn-danger')} onClick={handleStockOp} disabled={saving}>
                {saving
                  ? <><div className="spinner" style={{ width: 14, height: 14, borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'white' }} />Processing...</>
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