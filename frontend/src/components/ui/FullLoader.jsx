import Icon from '../ui/Icon';

const FullLoader = () => (
  <div className="full-loader">
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div className="full-loader-logo">
        <Icon name="Layers" size={24} style={{ color: 'white' }} />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--orange-500)',
            animation: `glow 1.2s ease-in-out ${i * 0.2}s infinite`
          }} />
        ))}
      </div>
    </div>
  </div>
);

export default FullLoader;
