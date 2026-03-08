// ─── EKM Theme System ────────────────────────────────────────────────────────
// Two themes: Arctic (A) and Slate (C). Toggle stored in localStorage.

export const THEMES = {
  arctic: {
    id: 'arctic',
    name: 'Arctic',
    // Backgrounds
    bg:       '#f4f6f9',
    bgCard:   '#ffffff',
    bgMid:    '#f8fafc',
    // Borders
    border:   '#dde3ec',
    borderLt: '#e8edf4',
    // Accents
    blue:     '#0052cc',
    blueLt:   '#eff6ff',
    blueMid:  '#dbeafe',
    teal:     '#0891b2',
    tealDk:   '#0e7490',
    tealLt:   '#ecfeff',
    // Status
    orange:   '#ea580c',
    red:      '#dc2626',
    green:    '#16a34a',
    gold:     '#d97706',
    purple:   '#7c3aed',
    // Text
    textPri:  '#0d1117',
    textSec:  '#4a5568',
    textDim:  '#8896a7',
    // Nav (white sidebar)
    navBg:    '#ffffff',
    navBorder:'#e8edf4',
    navText:  '#4a5568',
    navActive:'#0052cc',
    navActiveBg: '#eff6ff',
    navActiveBorder: '#dbeafe',
    // Fonts
    font:     "'IBM Plex Sans', sans-serif",
    mono:     "'IBM Plex Mono', monospace",
  },
  slate: {
    id: 'slate',
    name: 'Slate',
    // Backgrounds
    bg:       '#f4f6f8',
    bgCard:   '#ffffff',
    bgMid:    '#f8f9fa',
    // Borders
    border:   '#dde3eb',
    borderLt: '#e4eaf2',
    // Accents
    blue:     '#2563eb',
    blueLt:   '#eff6ff',
    blueMid:  '#dbeafe',
    teal:     '#059669',
    tealDk:   '#047857',
    tealLt:   '#ecfdf5',
    // Status
    orange:   '#ea580c',
    red:      '#f43f5e',
    green:    '#10b981',
    gold:     '#f59e0b',
    purple:   '#8b5cf6',
    // Text
    textPri:  '#1e2a3a',
    textSec:  '#4a6278',
    textDim:  '#7a90a4',
    // Nav (dark sidebar)
    navBg:    '#1e2a3a',
    navBorder:'#2d3d52',
    navText:  '#7a90a4',
    navActive:'#e8edf2',
    navActiveBg: '#2d3d52',
    navActiveBorder: '#3a5068',
    // Fonts
    font:     "'IBM Plex Sans', sans-serif",
    mono:     "'IBM Plex Mono', monospace",
  }
}

export function getTheme() {
  try {
    const saved = localStorage.getItem('ekm-theme')
    return THEMES[saved] || THEMES.arctic
  } catch { return THEMES.arctic }
}

export function setTheme(id) {
  try { localStorage.setItem('ekm-theme', id) } catch {}
}
