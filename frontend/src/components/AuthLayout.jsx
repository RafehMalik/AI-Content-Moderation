import { Icon } from './Icon'

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      background: 'radial-gradient(circle at 30% 20%, #161B24 0%, #0E1117 60%)'
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
          <div className="brand-mark" style={{ width: 34, height: 34 }}>
            <Icon.Shield style={{ color: '#1A1300', width: 19, height: 19 }} />
          </div>
          <span className="brand-name" style={{ fontSize: 19 }}>Sentinel</span>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, margin: '0 0 4px' }}>{title}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 24px' }}>{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
