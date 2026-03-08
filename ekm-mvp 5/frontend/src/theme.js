// EKM Theme — Arctic (default) + Slate
// Read once at module load. Toggle reloads the page.

const _id = (() => { try { return localStorage.getItem('ekm-theme') || 'arctic' } catch { return 'arctic' } })()

const ARCTIC = {
  id:'arctic',
  bg:'#f4f6f9', bgCard:'#ffffff', bgMid:'#f8fafc',
  border:'#dde3ec', borderLt:'#e8edf4',
  blue:'#0052cc', blueLt:'#eff6ff', blueMid:'#dbeafe',
  teal:'#0891b2', tealDk:'#0e7490', tealLt:'#ecfeff',
  orange:'#ea580c', red:'#dc2626', green:'#16a34a', gold:'#d97706', purple:'#7c3aed',
  textPri:'#0d1117', textSec:'#4a5568', textDim:'#8896a7',
  navBg:'#ffffff', navBorder:'#e8edf4',
  navText:'#4a5568', navActive:'#0052cc',
  navActiveBg:'#eff6ff', navActiveBorder:'#dbeafe',
  font:"'IBM Plex Sans',sans-serif", mono:"'IBM Plex Mono',monospace",
}

const SLATE = {
  id:'slate',
  bg:'#f4f6f8', bgCard:'#ffffff', bgMid:'#f8f9fa',
  border:'#dde3eb', borderLt:'#e4eaf2',
  blue:'#2563eb', blueLt:'#eff6ff', blueMid:'#dbeafe',
  teal:'#059669', tealDk:'#047857', tealLt:'#ecfdf5',
  orange:'#ea580c', red:'#f43f5e', green:'#10b981', gold:'#f59e0b', purple:'#8b5cf6',
  textPri:'#1e2a3a', textSec:'#4a6278', textDim:'#7a90a4',
  navBg:'#1e2a3a', navBorder:'#2d3d52',
  navText:'#7a90a4', navActive:'#e8edf2',
  navActiveBg:'#2d3d52', navActiveBorder:'#3a5068',
  font:"'IBM Plex Sans',sans-serif", mono:"'IBM Plex Mono',monospace",
}

export const T = _id === 'slate' ? SLATE : ARCTIC

export function toggleTheme() {
  try { localStorage.setItem('ekm-theme', _id === 'slate' ? 'arctic' : 'slate') } catch {}
  window.location.reload()
}
