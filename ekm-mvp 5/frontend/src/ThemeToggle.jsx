import { useTheme } from './ThemeContext'

export default function ThemeToggle() {
  const { T, toggleTheme } = useTheme()
  const isArctic = T.id === 'arctic'

  return (
    <button
      onClick={toggleTheme}
      title={`Switch to ${isArctic ? 'Slate' : 'Arctic'} theme`}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
        background: T.bgCard, border: `1px solid ${T.border}`,
        fontFamily: T.font, fontSize: 12, fontWeight: 600,
        color: T.textSec, transition: 'all .15s',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: 14 }}>{isArctic ? '🌙' : '☀️'}</span>
      {isArctic ? 'Slate' : 'Arctic'}
    </button>
  )
}
