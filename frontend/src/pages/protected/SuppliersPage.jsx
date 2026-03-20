import { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import Icon from '../../components/ui/Icon';
import { useToast } from '../../context/ToastContext';
import { suppliersAPI } from '../../services/api';

const EMPTY = { name: '', contactPerson: '', email: '', phone: '', address: '' };

const SuppliersPage = () => {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY);
  const upd = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  // Fixed: suppliersAPI.getAll() takes no params — backend GET /suppliers accepts no query params for listing
  const loadSuppliers = useCallback(async (q = '') => {
    setLoading(true);
    try {
      let res;
      if (q.trim()) {
        res = await suppliersAPI.search(q.trim());
        setSuppliers(res.data.data || res.data.suppliers || []);
      } else {
        res = await suppliersAPI.getAll();
        setSuppliers(res.data.data || res.data.suppliers || []);
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to load suppliers';
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  useEffect(() => {
    const t = setTimeout(() => loadSuppliers(search), 400);
    return () => clearTimeout(t);
  }, [search, loadSuppliers]);

  const handleSave = async () => {
    if (!form.name || !form.contactPerson || !form.email || !form.phone || !form.address) {
      return toast('All fields are required', 'error');
    }
    setSaving(true);
    try {
      if (editItem) {
        await suppliersAPI.update(editItem._id, form);
        toast('Supplier updated successfully', 'success');
      } else {
        await suppliersAPI.create(form);
        toast('Supplier added successfully', 'success');
      }
      setShowModal(false);
      setEditItem(null);
      setForm(EMPTY);
      loadSuppliers(search);
    } catch (err) {
      toast(err.response?.data?.error?.message || err.response?.data?.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this supplier?')) return;
    try {
      await suppliersAPI.delete(id);
      toast('Supplier removed', 'info');
      loadSuppliers(search);
    } catch (err) {
      toast(err.response?.data?.error?.message || 'Delete failed', 'error');
    }
  };

  const openEdit = s => {
    setEditItem(s);
    setForm({ name: s.name, contactPerson: s.contactPerson, email: s.email, phone: s.phone, address: s.address });
    setShowModal(true);
  };

  const openCreate = () => { setEditItem(null); setForm(EMPTY); setShowModal(true); };

  const activeCount = suppliers.filter(s => s.isActive !== false).length;

  return (
    <AppLayout title="Suppliers" subtitle={`${activeCount} active supplier${activeCount !== 1 ? 's' : ''}`}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="page-subtitle">Manage supplier contacts and contracts</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => loadSuppliers(search)}><Icon name="RefreshCw" size={14} />Refresh</button>
          <button className="btn btn-orange" onClick={openCreate}><Icon name="Plus" size={14} />Add Supplier</button>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div className="search-bar" style={{ maxWidth: 400 }}>
          <Icon name="Search" size={14} style={{ color: 'var(--text-muted)' }} />
          <input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
          <div className="spinner" style={{ width: 36, height: 36 }} />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon"><Icon name="Truck" size={28} /></div>
          <div className="empty-state-title">{search ? 'No suppliers match your search' : 'No suppliers yet'}</div>
          <div className="empty-state-desc">{search ? 'Try a different search term.' : 'Add your first supplier to get started.'}</div>
          {!search && <button className="btn btn-orange" style={{ marginTop: 16 }} onClick={openCreate}><Icon name="Plus" size={14} />Add Supplier</button>}
        </div>
      ) : (
        <div className="grid-2">
          {suppliers.map((s, i) => (
            <div key={s._id} className="card animate-fadeInUp" style={{ animationDelay: `${i * 0.07}s` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--orange-400)', flexShrink: 0 }}>
                    {s.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15, fontFamily: 'var(--font-display)' }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.contactPerson}</div>
                  </div>
                </div>
                <span className={`badge ${s.isActive !== false ? 'badge-green' : 'badge-slate'}`}>
                  {s.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {[
                  { icon: 'Mail', val: s.email },
                  { icon: 'Phone', val: s.phone },
                  { icon: 'MapPin', val: s.address },
                ].map((r, ri) => (
                  <div key={ri} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                    <Icon name={r.icon} size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.val}</span>
                  </div>
                ))}
              </div>

              {/* ID for linking products */}
              <div style={{ background: 'var(--bg-hover)', borderRadius: 6, padding: '6px 10px', marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Supplier ID</div>
                <code style={{ fontSize: 11, color: 'var(--orange-400)', wordBreak: 'break-all' }}>{s._id}</code>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}><Icon name="Edit" size={12} />Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s._id)}><Icon name="Trash2" size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editItem ? 'Edit Supplier' : 'New Supplier'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><Icon name="X" size={14} /></button>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Company Name *</label><input className="form-input" value={form.name} onChange={upd('name')} placeholder="Acme Corp." /></div>
              <div className="form-group"><label className="form-label">Contact Person *</label><input className="form-input" value={form.contactPerson} onChange={upd('contactPerson')} placeholder="John Smith" /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" value={form.email} onChange={upd('email')} placeholder="contact@supplier.com" /></div>
              <div className="form-group"><label className="form-label">Phone *</label><input className="form-input" value={form.phone} onChange={upd('phone')} placeholder="+1 800 000 0000" /></div>
            </div>
            <div className="form-group"><label className="form-label">Address *</label><input className="form-input" value={form.address} onChange={upd('address')} placeholder="123 Business Ave, City, Country" /></div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-orange" onClick={handleSave} disabled={saving}>
                {saving
                  ? <><div className="spinner" style={{ width: 14, height: 14, borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'white' }} />Saving…</>
                  : <><Icon name="Check" size={14} />{editItem ? 'Save Changes' : 'Add Supplier'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default SuppliersPage;