import { T, toggleTheme } from './theme'

export default function ThemeToggle({ style = {} }) {
  return (
    <button
      onClick={toggleTheme}
      title={`Switch to ${T.id === 'arctic' ? 'Slate' : 'Arctic'} theme`}
      style={{
        display:'inline-flex', alignItems:'center', gap:6,
        padding:'5px 12px', borderRadius:8, cursor:'pointer',
        background:T.bgCard, border:`1px solid ${T.border}`,
        fontSize:12, fontWeight:600, fontFamily:T.font,
        color:T.textSec, whiteSpace:'nowrap',
        ...style
      }}
    >
      <span>{T.id === 'arctic' ? '🌙' : '☀️'}</span>
      {T.id === 'arctic' ? 'Slate' : 'Arctic'}
    </button>
  )
}
