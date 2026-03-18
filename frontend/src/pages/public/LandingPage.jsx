import { useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon';

const features = [
  { icon: 'Package', title: 'Product Management', desc: 'Organize your entire catalog with SKU tracking, categories, pricing, and supplier links.' },
  { icon: 'Archive', title: 'Real-time Stock Tracking', desc: 'Monitor stock entries, exits, and critical alerts as they happen across all locations.' },
  { icon: 'Truck', title: 'Supplier Intelligence', desc: 'Manage supplier contracts, contacts, and automated restocking triggers.' },
  { icon: 'Activity', title: 'Movement Analytics', desc: 'Analyze inventory trends, velocity, and seasonal patterns with powerful charts.' },
  { icon: 'ShieldCheck', title: 'Role-based Access', desc: 'Fine-grained permissions for admins and managers with full audit trails.' },
  { icon: 'Zap', title: 'Event-driven Alerts', desc: 'Instant low-stock, critical, and out-of-stock notifications via RabbitMQ events.' },
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div style={{ background: 'var(--slate-950)', minHeight: '100vh' }}>
      {/* NAV */}
      <nav className="landing-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,var(--orange-500),var(--orange-600))', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }}>
            <Icon name="Layers" size={16} style={{ color: 'white' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'white', letterSpacing: '-0.5px' }}>StockFlow</span>
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          {['Features', 'Pricing', 'Docs'].map(l => (
            <span key={l} style={{ color: 'var(--slate-400)', fontSize: 14, cursor: 'pointer' }}>{l}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/login')}>Sign In</button>
          <button className="btn btn-orange btn-sm" onClick={() => navigate('/register')}>Get Started</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="landing-hero">
        <div className="hero-eyebrow">
          <Icon name="Zap" size={12} /> Microservices Architecture · Production Ready
        </div>
        <h1 className="hero-title">
          Inventory that moves<br /><span>as fast as you do</span>
        </h1>
        <p className="hero-sub">
          StockFlow is the modern inventory management platform built on microservices. Real-time tracking, supplier management, and intelligent alerts all in one place.
        </p>
        <div className="hero-ctas">
          <button className="hero-cta-primary" onClick={() => navigate('/register')}>
            Start for free <Icon name="ArrowUpRight" size={16} />
          </button>
          <button className="hero-cta-secondary" onClick={() => navigate('/login')}>
            View Demo <Icon name="Eye" size={16} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 48, opacity: 0, animation: 'fadeInUp 0.6s ease 0.8s forwards' }}>
          {[['99.9%', 'Uptime SLA'], ['<50ms', 'API Response'], ['4', 'Microservices'], ['INF', 'Scalability']].map(([v, l], i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--orange-400)', letterSpacing: '-1px', marginBottom: 4 }}>{v}</div>
              <div style={{ fontSize: 13, color: 'var(--slate-500)' }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: '100px 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--orange-400)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
            <Icon name="Shield" size={12} /> Built for enterprise
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, color: 'white', letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 16 }}>
            Every feature you need,<br />nothing you do not need
          </h2>
        </div>
        <div className="grid-3">
          {features.map((f, i) => (
            <div key={i} className="feature-card" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="feature-icon-wrap"><Icon name={f.icon} size={22} /></div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg,var(--orange-500),var(--orange-600))', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="Layers" size={12} style={{ color: 'white' }} />
          </div>
          <span style={{ color: 'var(--slate-400)', fontWeight: 600 }}>StockFlow</span>
        </div>
        <span>2025 StockFlow. Built with microservices.</span>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Privacy', 'Terms', 'Contact'].map(l => (
            <span key={l} style={{ color: 'var(--slate-600)', cursor: 'pointer' }}>{l}</span>
          ))}
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
