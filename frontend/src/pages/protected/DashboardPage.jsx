import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import Icon from '../../components/ui/Icon';
import { Sparkline, SimpleBarChart, DonutChart } from '../../components/charts/Charts';
import { stockAPI, productsAPI } from '../../services/api';

const FALLBACK_CHART = [
  { label: 'Mon', value: 240 }, { label: 'Tue', value: 310 }, { label: 'Wed', value: 285 },
  { label: 'Thu', value: 390 }, { label: 'Fri', value: 340 }, { label: 'Sat', value: 180 },
  { label: 'Sun', value: 210 }, { label: 'Mon', value: 420 }, { label: 'Tue', value: 380 }, { label: 'Wed', value: 450 },
];

const SPARK = {
  products:  [45, 62, 55, 70, 66, 80, 75, 90, 85, 95],
  movements: [30, 40, 35, 55, 45, 60, 50, 65, 55, 70],
  quantity:  [20, 25, 22, 30, 28, 35, 32, 38, 36, 42],
  alerts:    [12, 10,  8, 14, 11,  9, 13,  7, 10,  7],
};

const CAT_COLORS = {
  Electronics: 'var(--orange-500)', Furniture: 'var(--blue-400)',
  Clothing: 'var(--purple-400)',    Tools: 'var(--green-400)',
  Food: 'var(--amber-400)',         Other: 'var(--slate-400)',
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const [summary,      setSummary]      = useState(null);
  const [alerts,       setAlerts]       = useState([]);
  const [movements,    setMovements]    = useState([]);
  const [totalProducts,setTotalProducts]= useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    const load = async () => {
      const [summaryRes, alertsRes, movementsRes, productsRes] = await Promise.allSettled([
        stockAPI.getSummary(),
        stockAPI.getAlerts(10),
        stockAPI.getMovements({ limit: 5 }),
        productsAPI.getAll({ limit: 100 }),
      ]);
      if (summaryRes.status  === 'fulfilled') setSummary(summaryRes.value.data.summary);
      if (alertsRes.status   === 'fulfilled') setAlerts(alertsRes.value.data.alerts || []);
      if (movementsRes.status=== 'fulfilled') setMovements(movementsRes.value.data.movements || []);
      if (productsRes.status === 'fulfilled') {
        const prods = productsRes.value.data.data || [];
        setTotalProducts(productsRes.value.data.pagination?.total ?? prods.length);
        const catMap = {};
        prods.forEach(p => { catMap[p.category] = (catMap[p.category] || 0) + 1; });
        setCategoryData(
          Object.entries(catMap).map(([label, value]) => ({
            label, value, color: CAT_COLORS[label] || 'var(--slate-400)',
          }))
        );
      }
      setLoading(false);
    };
    load();
  }, []);

  const stats = [
    { label: 'Total Products',    value: totalProducts != null ? totalProducts.toLocaleString() : '0', icon: 'Package',       color: 'orange', spark: SPARK.products  },
    { label: 'Movements (24h)',   value: summary ? String(summary.recentMovementsCount ?? 0) : '0',   icon: 'Activity',      color: 'blue',   spark: SPARK.movements },
    { label: 'Units in Stock',    value: summary ? String(summary.totalQuantity ?? 0) : '0',           icon: 'Archive',       color: 'green',  spark: SPARK.quantity  },
    { label: 'Low Stock Alerts',  value: summary ? String(summary.lowStockCount ?? 0) : '0',           icon: 'AlertTriangle', color: 'red',    spark: SPARK.alerts    },
  ];

  const chartCats = categoryData.length > 0
    ? categoryData
    : [{ label: 'No data', value: 1, color: 'var(--slate-700)' }];

  return (
    <AppLayout title="Dashboard" subtitle="Overview of your inventory operations">
      <div className="page-header">
        <h1 className="page-title">Good morning</h1>
        <p className="page-subtitle">
          {loading ? 'Loading live inventory data...' : "Here's what's happening with your inventory today."}
        </p>
      </div>

      <div className="stats-row">
        {stats.map((s, i) => (
          <div key={i} className="stat-widget" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="stat-widget-header">
              <div className={`stat-icon ${s.color}`}><Icon name={s.icon} size={18} /></div>
              <Sparkline data={s.spark} />
            </div>
            <div className="stat-value">
              {loading ? <div className="spinner" style={{ margin: '4px 0' }} /> : s.value}
            </div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="card animate-fadeInUp delay-200">
          <div className="chart-title">Stock Movement Trend</div>
          <div className="chart-subtitle">Recent activity overview</div>
          <SimpleBarChart data={FALLBACK_CHART} />
        </div>
        <div className="card animate-fadeInUp delay-300">
          <div className="chart-title" style={{ marginBottom: 4 }}>By Category</div>
          <div className="chart-subtitle">Live product distribution</div>
          {loading
            ? <div style={{ display:'flex', justifyContent:'center', padding: 40 }}><div className="spinner" /></div>
            : <DonutChart data={chartCats} />}
        </div>
      </div>

      <div className="grid-2">
        <div className="card animate-fadeInUp delay-300">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16 }}>
            <div className="chart-title">Recent Movements</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/stock')}>View all</button>
          </div>
          {loading
            ? <div style={{ display:'flex', justifyContent:'center', padding: 32 }}><div className="spinner" /></div>
            : movements.length === 0
              ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Icon name="Activity" size={24} /></div>
                  <div className="empty-state-title">No movements yet</div>
                  <div className="empty-state-desc">Stock entries and exits will appear here.</div>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead><tr><th>Product ID</th><th>Type</th><th>Qty</th><th>Reason</th></tr></thead>
                    <tbody>
                      {movements.map((m, i) => (
                        <tr key={i}>
                          <td>
                            <div style={{ fontWeight:500, color:'var(--slate-200)', fontSize:12, fontFamily:'monospace' }}>{m.productId}</div>
                            <div style={{ fontSize:11, color:'var(--slate-600)' }}>{new Date(m.timestamp).toLocaleString()}</div>
                          </td>
                          <td>
                            <span className={`badge ${m.type === 'entry' ? 'badge-green' : 'badge-red'}`}>
                              <Icon name={m.type === 'entry' ? 'Download' : 'Upload'} size={10} />
                              {m.type}
                            </span>
                          </td>
                          <td style={{ fontWeight:600, color:'white' }}>{m.quantity}</td>
                          <td style={{ color:'var(--slate-400)', fontSize:12 }}>{m.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
        </div>

        <div className="card animate-fadeInUp delay-400">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16 }}>
            <div className="chart-title">Stock Alerts</div>
            {!loading && (
              <span className="badge badge-red">
                {alerts.filter(a => a.currentQuantity === 0).length} out of stock
              </span>
            )}
          </div>
          {loading
            ? <div style={{ display:'flex', justifyContent:'center', padding: 32 }}><div className="spinner" /></div>
            : alerts.length === 0
              ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Icon name="CheckCircle" size={24} style={{ color:'var(--green-400)' }} /></div>
                  <div className="empty-state-title">All stock levels healthy</div>
                  <div className="empty-state-desc">No low stock alerts at the moment.</div>
                </div>
              ) : (
                alerts.slice(0, 5).map((a, i) => {
                  const sev = a.currentQuantity === 0 ? 'critical'
                    : a.currentQuantity <= (a.threshold / 2) ? 'critical'
                    : 'warning';
                  return (
                    <div key={i} className={`alert-item ${sev}`} onClick={() => navigate('/stock')}>
                      <Icon
                        name={a.currentQuantity === 0 ? 'XCircle' : 'AlertTriangle'}
                        size={14}
                        style={{ color: sev === 'critical' ? 'var(--red-400)' : 'var(--orange-400)', flexShrink:0, marginTop:2 }}
                      />
                      <div>
                        <div className="alert-title">{a.productName || 'Unknown Product'}</div>
                        <div className="alert-desc">
                          {a.currentQuantity === 0
                            ? 'OUT OF STOCK - Emergency restock needed'
                            : `${a.currentQuantity} units left (min: ${a.threshold})`}
                        </div>
                        <div className="alert-time">{a.sku}</div>
                      </div>
                    </div>
                  );
                })
              )}
        </div>
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
