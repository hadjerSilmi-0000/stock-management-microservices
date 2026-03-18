import { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import Icon from '../../components/ui/Icon';
import { useToast } from '../../context/ToastContext';
import { productsAPI } from '../../services/api';

const EMPTY_FORM = { name: '', sku: '', category: 'Electronics', price: '', supplierId: '', lowStockThreshold: 10, description: '' };
const CATEGORIES = ['Electronics', 'Furniture', 'Clothing', 'Food', 'Tools', 'Other'];

const ProductsPage = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const upd = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  // ── Fetch products from API ────────────────────────────────────
  const fetchProducts = useCallback(async (page = 1, search = '', category = '') => {
    setLoading(true);
    try {
      let res;
      if (search.trim()) {
        res = await productsAPI.search(search.trim());
        setProducts(res.data.data || []);
        setPagination(p => ({ ...p, total: res.data.pagination?.total || 0 }));
      } else {
        const params = { page, limit: 20 };
        if (category) params.category = category;
        res = await productsAPI.getAll(params);
        setProducts(res.data.data || []);
        setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchProducts(1, '', ''); }, [fetchProducts]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchProducts(1, searchQ, filterCat), 400);
    return () => clearTimeout(t);
  }, [searchQ, filterCat, fetchProducts]);

  // ── Create / Update ────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name || !form.sku || !form.price || !form.supplierId) {
      return toast('Please fill all required fields', 'error');
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        sku: form.sku.toUpperCase(),
        category: form.category,
        price: Number(form.price),
        supplierId: form.supplierId,
        lowStockThreshold: Number(form.lowStockThreshold),
        description: form.description,
      };
      if (editItem) {
        await productsAPI.update(editItem._id, payload);
        toast('Product updated successfully', 'success');
      } else {
        await productsAPI.create(payload);
        toast('Product created successfully', 'success');
      }
      setShowModal(false);
      setEditItem(null);
      setForm(EMPTY_FORM);
      fetchProducts(pagination.page, searchQ, filterCat);
    } catch (err) {
      toast(err.response?.data?.error?.message || err.response?.data?.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete (soft delete) ───────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product? This action cannot be undone.')) return;
    try {
      await productsAPI.delete(id);
      toast('Product deleted', 'info');
      fetchProducts(pagination.page, searchQ, filterCat);
    } catch (err) {
      toast(err.response?.data?.error?.message || 'Delete failed', 'error');
    }
  };

  const openEdit = p => {
    setEditItem(p);
    setForm({ name: p.name, sku: p.sku, category: p.category, price: p.price, supplierId: p.supplierId, lowStockThreshold: p.lowStockThreshold, description: p.description || '' });
    setShowModal(true);
  };

  const openCreate = () => { setEditItem(null); setForm(EMPTY_FORM); setShowModal(true); };

  return (
    <AppLayout title="Products" subtitle={`${pagination.total} products in catalog`}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Manage your product catalog</p>
        </div>
        <button className="btn btn-orange" onClick={openCreate}><Icon name="Plus" size={14} />New Product</button>
      </div>

      <div className="card">
        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div className="search-bar" style={{ flex: 1 }}>
            <Icon name="Search" size={14} style={{ color: 'var(--slate-500)' }} />
            <input placeholder="Search by name or SKU…" value={searchQ} onChange={e => setSearchQ(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 160 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Icon name="Package" size={28} /></div>
            <div className="empty-state-title">No products found</div>
            <div className="empty-state-desc">{searchQ ? 'Try a different search term.' : 'Create your first product to get started.'}</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Product</th><th>Category</th><th>Price</th><th>Supplier ID</th><th>Threshold</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, background: 'rgba(249,115,22,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon name="Package" size={14} style={{ color: 'var(--orange-400)' }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--slate-100)', fontSize: 13 }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--slate-600)', fontFamily: 'monospace' }}>{p.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-blue">{p.category}</span></td>
                    <td style={{ fontWeight: 700, color: 'white' }}>${Number(p.price).toLocaleString()}</td>
                    <td style={{ color: 'var(--slate-400)', fontSize: 12, fontFamily: 'monospace' }}>{p.supplierId}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon name="AlertTriangle" size={12} style={{ color: 'var(--amber-400)' }} />
                        <span style={{ fontSize: 13 }}>{p.lowStockThreshold} units</span>
                      </div>
                    </td>
                    <td><span className={`badge ${p.isActive ? 'badge-green' : 'badge-slate'}`}>{p.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}><Icon name="Edit" size={12} /></button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id)}><Icon name="Trash2" size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="pagination">
            <span className="pagination-info">
              Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </span>
            <div className="pagination-btns">
              <div className={`page-btn ${pagination.page === 1 ? 'disabled' : ''}`} onClick={() => fetchProducts(pagination.page - 1, searchQ, filterCat)}>
                <Icon name="ChevronLeft" size={12} />
              </div>
              {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1).map(n => (
                <div key={n} className={`page-btn ${pagination.page === n ? 'active' : ''}`} onClick={() => fetchProducts(n, searchQ, filterCat)}>{n}</div>
              ))}
              <div className={`page-btn ${pagination.page === pagination.totalPages ? 'disabled' : ''}`} onClick={() => fetchProducts(pagination.page + 1, searchQ, filterCat)}>
                <Icon name="ChevronRight" size={12} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editItem ? 'Edit Product' : 'New Product'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><Icon name="X" size={14} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input className="form-input" value={form.name} onChange={upd('name')} placeholder="e.g. MacBook Pro 14 inch" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">SKU *</label>
                <input className="form-input" value={form.sku} onChange={upd('sku')} placeholder="MBPRO-14-M3" style={{ fontFamily: 'monospace', textTransform: 'uppercase' }} disabled={!!editItem} />
                {editItem && <p style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 4 }}>SKU cannot be changed</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="form-select" value={form.category} onChange={upd('category')}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Price ($) *</label>
                <input className="form-input" type="number" min="0" step="0.01" value={form.price} onChange={upd('price')} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Low Stock Threshold</label>
                <input className="form-input" type="number" min="0" value={form.lowStockThreshold} onChange={upd('lowStockThreshold')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Supplier ID *</label>
              <input className="form-input" value={form.supplierId} onChange={upd('supplierId')} placeholder="MongoDB ObjectId of the supplier" style={{ fontFamily: 'monospace' }} />
              <p style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 4 }}>Must match a supplier _id from the Suppliers service</p>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" value={form.description} onChange={upd('description')} placeholder="Optional product description…" rows={3} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-orange" onClick={handleSave} disabled={saving}>
                {saving
                  ? <><div className="spinner" style={{ width: 14, height: 14, borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'white' }} />Saving…</>
                  : <><Icon name="Check" size={14} />{editItem ? 'Save Changes' : 'Create Product'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default ProductsPage;
