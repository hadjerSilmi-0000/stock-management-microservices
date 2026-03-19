import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { useTheme } from '../../context/ThemeContext';

const features = [
  {
    icon: 'Package',
    title: 'Smart Product Catalog',
    desc: 'Organize thousands of SKUs with categories, pricing, and supplier links. Find any product in seconds with powerful search.'
  },
  {
    icon: 'Archive',
    title: 'Live Stock Tracking',
    desc: 'See exactly how many units you have, right now. Record entries and exits in one click — your numbers are always accurate.'
  },
  {
    icon: 'Bell',
    title: 'Instant Low-Stock Alerts',
    desc: 'Never run out unexpectedly. Set minimum stock thresholds and get notified the moment inventory drops below safe levels.'
  },
  {
    icon: 'Truck',
    title: 'Supplier Management',
    desc: 'Store all supplier contacts, emails and addresses in one place. Link products to suppliers so you always know who to call.'
  },
  {
    icon: 'BarChart2',
    title: 'Movement History',
    desc: 'Every stock entry and exit is recorded with a reason and timestamp. Full audit trail so you know exactly what happened and when.'
  },
  {
    icon: 'ShieldCheck',
    title: 'Role-Based Access',
    desc: 'Give your team the right level of access. Admins manage users, managers handle day-to-day stock — nobody sees what they shouldn\'t.'
  },
];

const testimonials = [
  {
    text: "We cut our stockout incidents by 80% in the first month. The low-stock alerts alone paid for the whole system.",
    name: "Karim B.",
    role: "Operations Manager, RetailPro"
  },
  {
    text: "Finally, I can see at a glance what we have without hunting through spreadsheets. My team loves how simple it is.",
    name: "Sarah L.",
    role: "Warehouse Lead, FastParts Co."
  },
  {
    text: "Setting up took 15 minutes. Adding our 600 products was done by end of day. Best decision we made this quarter.",
    name: "Ahmed R.",
    role: "Owner, TechStore Algeria"
  }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [activeFaq, setActiveFaq] = useState(null);

  const faqs = [
    { q: "How long does setup take?", a: "Most teams are fully set up in under an hour. Add your products, link your suppliers, and you're tracking stock the same day." },
    { q: "Can multiple people use it at the same time?", a: "Yes. You can add as many managers as you need. Each person has their own login, and admins control who can do what." },
    { q: "What happens when stock gets too low?", a: "StockFlow shows a red alert on your dashboard and lists the products that need restocking. You decide the minimum quantity per product." },
    { q: "Can I track where stock went?", a: "Every movement is logged — who did it, when, how many units, and why. You can filter by product or date to see the full history." },
  ];

  return (
    <div className="landing-page">
      {/* NAV */}
      <nav className="landing-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,var(--orange-500),var(--orange-600))', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(249,115,22,0.3)' }}>
            <Icon name="Layers" size={16} style={{ color: 'white' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>StockFlow</span>
        </div>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {['Features', 'Pricing', 'FAQ'].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} style={{ color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}
            >{l}</a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
            <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={16} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/login')}>Sign In</button>
          <button className="btn btn-orange btn-sm" onClick={() => navigate('/register')}>Get Started Free</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="landing-hero">
        <div className="hero-eyebrow">
          <Icon name="Zap" size={12} /> Used by 500+ teams · No credit card needed
        </div>
        <h1 className="hero-title">
          Stop losing money<br />to <span>inventory mistakes</span>
        </h1>
        <p className="hero-sub">
          StockFlow is the inventory management tool that keeps your shelves right-sized. Track products, get low-stock alerts, and manage suppliers — all in one place your whole team can use.
        </p>
        <div className="hero-ctas">
          <button className="hero-cta-primary" onClick={() => navigate('/register')}>
            Start for free <Icon name="ArrowUpRight" size={16} />
          </button>
          <button className="hero-cta-secondary" onClick={() => navigate('/login')}>
            Sign in to dashboard <Icon name="Eye" size={16} />
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 48, opacity: 0, animation: 'fadeInUp 0.6s ease 0.8s forwards' }}>
          {[
            ['500+', 'Companies using StockFlow'],
            ['2M+', 'Products tracked'],
            ['↓ 80%', 'Fewer stockout incidents'],
            ['< 1hr', 'Average setup time'],
          ].map(([v, l], i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div className="landing-stat-value">{v}</div>
              <div className="landing-stat-label">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section style={{ padding: '80px 60px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px', marginBottom: 16 }}>
            Sound familiar?
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.7, marginBottom: 48, maxWidth: 600, margin: '0 auto 48px' }}>
            Most teams track inventory in spreadsheets — until a stockout costs them a big sale, or a counting error causes chaos.
          </p>
          <div className="grid-3" style={{ textAlign: 'left' }}>
            {[
              { icon: 'X', label: 'Running out of stock without warning' },
              { icon: 'X', label: 'Spreadsheets getting out of sync' },
              { icon: 'X', label: 'No record of who changed what' },
              { icon: 'X', label: 'Hours wasted on manual stock counts' },
              { icon: 'X', label: 'Duplicate orders from bad data' },
              { icon: 'X', label: 'Suppliers you can\'t find contact info for' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="X" size={10} style={{ color: 'var(--red-400)' }} />
                </div>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: '100px 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--orange-400)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
            <Icon name="CheckCircle" size={12} /> Everything you need
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 16 }}>
            Simple tools, real results
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
            StockFlow gives you the right features — nothing you don't need, everything you do.
          </p>
        </div>
        <div className="grid-3" style={{ maxWidth: 1100, margin: '0 auto' }}>
          {features.map((f, i) => (
            <div key={i} className="feature-card" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="feature-icon-wrap"><Icon name={f.icon} size={22} /></div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '80px 60px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px', marginBottom: 48 }}>
            Up and running in 3 steps
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, textAlign: 'left' }}>
            {[
              { step: '01', title: 'Add your products', desc: 'Enter your product catalog with SKUs, categories, prices and supplier links. Import from a spreadsheet if you have one.' },
              { step: '02', title: 'Record stock levels', desc: 'Log your current inventory counts. Set minimum levels for each product so StockFlow knows when to alert you.' },
              { step: '03', title: 'Invite your team', desc: 'Give managers access to record movements. Admins handle setup, managers handle day-to-day operations.' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '28px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: 'rgba(249,115,22,0.2)', marginBottom: 12, letterSpacing: '-2px' }}>{s.step}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>{s.title}</div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ padding: '100px 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px', marginBottom: 12 }}>
            Teams that switched never looked back
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>Real results from real users</p>
        </div>
        <div className="grid-3" style={{ maxWidth: 1100, margin: '0 auto' }}>
          {testimonials.map((t, i) => (
            <div key={i} className="testimonial-card" style={{ animationDelay: `${i * 0.1}s` }}>
              <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>
                {[0, 1, 2, 3, 4].map(s => <Icon key={s} name="Star" size={14} style={{ color: 'var(--amber-400)', fill: 'var(--amber-400)' }} />)}
              </div>
              <p className="testimonial-text">"{t.text}"</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">{t.name[0]}</div>
                <div>
                  <div className="testimonial-name">{t.name}</div>
                  <div className="testimonial-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: '80px 60px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px', marginBottom: 12 }}>
            Simple, honest pricing
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 48 }}>No hidden fees, no per-user charges</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 700, margin: '0 auto' }}>
            {[
              { name: 'Starter', price: 'Free', desc: 'Perfect for small teams getting started', features: ['Up to 3 users', '500 products', 'Stock tracking & alerts', 'Supplier management', 'Movement history (30 days)'] },
              { name: 'Pro', price: '$29/mo', desc: 'For growing businesses that need more', features: ['Unlimited users', 'Unlimited products', 'Everything in Starter', 'Full movement history', 'Priority support', 'CSV export'], featured: true },
            ].map((plan, i) => (
              <div key={i} className={`pricing-card ${plan.featured ? 'featured' : ''}`} style={{ textAlign: 'left', position: 'relative' }}>
                {plan.featured && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, var(--orange-500), var(--orange-600))', color: 'white', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 999, letterSpacing: 0.5 }}>MOST POPULAR</div>
                )}
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{plan.name}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: plan.featured ? 'var(--orange-400)' : 'var(--text-primary)', marginBottom: 8, letterSpacing: '-1px' }}>{plan.price}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>{plan.desc}</div>
                {plan.features.map((f, fi) => (
                  <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)', marginBottom: 10 }}>
                    <Icon name="Check" size={14} style={{ color: 'var(--green-400)', flexShrink: 0 }} /> {f}
                  </div>
                ))}
                <button
                  className={`btn ${plan.featured ? 'btn-orange' : 'btn-ghost'}`}
                  style={{ width: '100%', justifyContent: 'center', marginTop: 20 }}
                  onClick={() => navigate('/register')}
                >
                  {plan.featured ? 'Get started' : 'Start free'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: '100px 60px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px', marginBottom: 48, textAlign: 'center' }}>
            Frequently asked questions
          </h2>
          {faqs.map((faq, i) => (
            <div key={i} style={{ borderBottom: '1px solid var(--border)', padding: '20px 0' }}>
              <button
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 16 }}
              >
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{faq.q}</span>
                <Icon name={activeFaq === i ? 'ChevronDown' : 'ChevronRight'} size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: activeFaq === i ? 'rotate(0deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>
              {activeFaq === i && (
                <p style={{ marginTop: 12, fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA SECTION */}
      <section style={{ padding: '80px 60px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, var(--orange-500), var(--orange-600))', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 24px rgba(249,115,22,0.3)' }}>
            <Icon name="Layers" size={24} style={{ color: 'white' }} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1.5px', marginBottom: 16 }}>
            Ready to fix your inventory?
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.7, marginBottom: 36 }}>
            Join 500+ businesses that stopped guessing and started knowing exactly what's in stock.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="hero-cta-primary" onClick={() => navigate('/register')}>
              Create free account <Icon name="ArrowUpRight" size={16} />
            </button>
            <button className="hero-cta-secondary" onClick={() => navigate('/login')}>
              Sign in
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg,var(--orange-500),var(--orange-600))', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="Layers" size={12} style={{ color: 'white' }} />
          </div>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>StockFlow</span>
        </div>
        <span>© 2025 StockFlow. Inventory management made simple.</span>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Privacy', 'Terms', 'Contact'].map(l => (
            <span key={l} style={{ color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.15s' }}
              onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
            >{l}</span>
          ))}
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;