import React from 'react';

export const Sparkline = ({ data, color = 'var(--orange-500)' }) => {
  const max = Math.max(...data);
  return (
    <div className="mini-chart">
      {data.map((v, i) => (
        <div
          key={i}
          className={`mini-bar ${i === data.length - 1 ? 'active' : ''}`}
          style={{
            height: `${(v / max) * 100}%`,
            animationDelay: `${i * 0.05}s`,
            ...(i === data.length - 1 ? { background: color } : {}),
          }}
        />
      ))}
    </div>
  );
};

export const SimpleBarChart = ({ data, color = 'var(--orange-500)' }) => {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '140px', padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
          <div style={{
            width: '100%',
            background: i === data.length - 1 ? color : 'rgba(249,115,22,0.25)',
            borderRadius: '4px 4px 0 0',
            height: `${(d.value / max) * 100}%`,
            transformOrigin: 'bottom',
            animation: `barGrow 0.6s ease ${i * 0.08}s both`,
          }} />
          <span style={{ fontSize: '10px', color: 'var(--slate-600)', whiteSpace: 'nowrap' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
};

export const DonutChart = ({ data }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  let offset = 0;
  const r = 54, cx = 64, cy = 64;
  const circ = 2 * Math.PI * r;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="12" />
        {data.map((d, i) => {
          const pct = d.value / total;
          const dash = pct * circ;
          const gap = circ - dash;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth="12"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset * circ}
              style={{ transformOrigin: `${cx}px ${cy}px`, transform: 'rotate(-90deg)' }}
            />
          );
          offset += pct;
          return el;
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize="16" fontWeight="800" fontFamily="Syne">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--slate-500)" fontSize="10">Total</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: 'var(--slate-400)' }}>{d.label}</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'white', marginLeft: 'auto' }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
