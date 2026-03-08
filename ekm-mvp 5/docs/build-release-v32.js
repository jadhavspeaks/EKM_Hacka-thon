const pptxgen = require('pptxgenjs')
const pres = new pptxgen()
pres.layout  = 'LAYOUT_16x9'
pres.author  = 'EKM Team'
pres.title   = 'EKM Release Notes v3.2'

const C = {
  navy:    '0a1628',
  teal:    '00d4aa',
  red:     'f43f5e',
  orange:  'ff6b35',
  purple:  '818cf8',
  gold:    'f59e0b',
  green:   '10d98a',
  blue:    '3b82f6',
  cardBg:  '0d1f35',
  border:  '1a3050',
  white:   'e2eaf4',
  dim:     '6b8aad',
}

// ── Slide 1: Title ──────────────────────────────────────────────────────────
{
  const s = pres.addSlide()
  s.background = { color: C.navy }

  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.6, fill: { color: C.teal } })

  s.addText('EKM', { x: 0.5, y: 0.8, w: 9, h: 0.7,
    fontSize: 48, bold: true, color: C.teal, fontFace: 'Arial Black', margin: 0 })

  s.addText('Enterprise Knowledge Management', { x: 0.5, y: 1.5, w: 9, h: 0.5,
    fontSize: 20, color: C.white, fontFace: 'Arial', margin: 0 })

  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 2.1, w: 3, h: 0.05, fill: { color: C.teal } })

  s.addText('Release Notes — v3.2', { x: 0.5, y: 2.35, w: 5, h: 0.45,
    fontSize: 22, bold: true, color: C.white, fontFace: 'Arial', margin: 0 })

  s.addText('Bug fixes · UI improvements · Analytics enrichment', {
    x: 0.5, y: 2.9, w: 7, h: 0.35,
    fontSize: 13, color: C.dim, fontFace: 'Arial', italic: true, margin: 0 })

  // Feature boxes
  const fixes = [
    { icon: '✅', label: 'At-Risk Experts KPI fixed', color: C.green },
    { icon: '🏷️', label: 'SME type classification',  color: C.teal  },
    { icon: '📊', label: 'Analytics tab rebuilt',     color: C.purple },
    { icon: '📈', label: 'Docs by Source enhanced',   color: C.orange },
  ]
  fixes.forEach((f, i) => {
    const x = 0.5 + i * 2.4
    s.addShape(pres.ShapeType.roundRect, { x, y: 3.5, w: 2.2, h: 1.2,
      fill: { color: C.cardBg }, line: { color: C.border, width: 1 },
      rectRadius: 0.08 })
    s.addText(f.icon, { x: x + 0.1, y: 3.6, w: 0.5, h: 0.5, fontSize: 20, margin: 0 })
    s.addText(f.label, { x: x + 0.1, y: 4.1, w: 2.1, h: 0.5,
      fontSize: 10, color: f.color, bold: true, fontFace: 'Arial', margin: 0 })
  })
}

// ── Slide 2: Bug Fixes ──────────────────────────────────────────────────────
{
  const s = pres.addSlide()
  s.background = { color: C.navy }
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.45, fill: { color: C.cardBg } })
  s.addText('Bug Fixes', { x: 0.5, y: 0.06, w: 8, h: 0.33,
    fontSize: 18, bold: true, color: C.white, fontFace: 'Arial', margin: 0 })
  s.addText('v3.2', { x: 8.8, y: 0.1, w: 0.8, h: 0.25,
    fontSize: 11, color: C.teal, bold: true, fontFace: 'Arial', margin: 0 })

  const bugs = [
    {
      id: '#1', title: 'At-Risk Experts KPI — shows — on Dashboard',
      severity: 'HIGH', color: C.red,
      root: 'FastAPI response_model=DashboardStats stripped extra fields. experts_at_risk was set after pydantic serialization but response_model re-serialised it, dropping the key.',
      fix: 'Added experts_at_risk: int = 0 to DashboardStats model. Passed the value directly in the constructor. Field now flows through response_model correctly.',
    },
    {
      id: '#2', title: '[TECH NE] SME shows "Internal" instead of "Vendor"',
      severity: 'MEDIUM', color: C.orange,
      root: 'sme_ranker.py built SME dicts without a type field. Search.jsx expected sme.type but got undefined, so fallback showed "—" or inherited default.',
      fix: 'Added _classify_name() to sme_ranker.py using same NE/TECH regex as intelligence.py. All SME dicts now include type: "vendor" | "internal" | "unknown".',
    },
  ]

  bugs.forEach((b, i) => {
    const y = 0.65 + i * 2.35
    s.addShape(pres.ShapeType.roundRect, { x: 0.3, y, w: 9.4, h: 2.1,
      fill: { color: C.cardBg }, line: { color: C.border, width: 1 }, rectRadius: 0.1 })
    s.addShape(pres.ShapeType.rect, { x: 0.3, y, w: 0.25, h: 2.1,
      fill: { color: b.color }, line: { color: b.color, width: 0 } })

    s.addText(b.id, { x: 0.7, y: y + 0.12, w: 0.5, h: 0.28,
      fontSize: 10, color: b.color, bold: true, fontFace: 'Arial Narrow', margin: 0 })
    s.addText(b.title, { x: 1.2, y: y + 0.1, w: 6.5, h: 0.32,
      fontSize: 13, bold: true, color: C.white, fontFace: 'Arial', margin: 0 })
    s.addShape(pres.ShapeType.rect, { x: 7.8, y: y + 0.12, w: 1.6, h: 0.25,
      fill: { color: C.cardBg }, line: { color: b.color, width: 1 } })
    s.addText(b.severity, { x: 7.8, y: y + 0.12, w: 1.6, h: 0.25,
      fontSize: 9, bold: true, color: b.color, align: 'center', fontFace: 'Arial', margin: 0 })

    s.addText('Root Cause', { x: 0.7, y: y + 0.52, w: 1.5, h: 0.22,
      fontSize: 9, color: C.dim, bold: true, fontFace: 'Arial', margin: 0 })
    s.addText(b.root, { x: 0.7, y: y + 0.74, w: 8.2, h: 0.55,
      fontSize: 10, color: C.white, fontFace: 'Arial', margin: 0, wrap: true })

    s.addText('Fix Applied', { x: 0.7, y: y + 1.35, w: 1.5, h: 0.22,
      fontSize: 9, color: C.teal, bold: true, fontFace: 'Arial', margin: 0 })
    s.addText(b.fix, { x: 0.7, y: y + 1.57, w: 8.2, h: 0.45,
      fontSize: 10, color: C.dim, fontFace: 'Arial', margin: 0, wrap: true })
  })
}

// ── Slide 3: UI Improvements ────────────────────────────────────────────────
{
  const s = pres.addSlide()
  s.background = { color: C.navy }
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.45, fill: { color: C.cardBg } })
  s.addText('UI Improvements', { x: 0.5, y: 0.06, w: 8, h: 0.33,
    fontSize: 18, bold: true, color: C.white, fontFace: 'Arial', margin: 0 })

  const items = [
    {
      icon: '📊', color: C.purple, title: 'Analytics Tab — Rebuilt',
      detail: [
        'Added "Knowledge Corpus" section at top — always has data (doc counts per source, last sync, composition bar)',
        'Search Activity section shows graceful empty state when zero searches exist',
        '4-KPI strip: Total Searches · Unique Queries · Zero-Result Rate · Avg/Day',
        'Daily volume chart, Top Queries + Zero-Result Gaps side-by-side',
        'Source filter usage + Day of Week + Recent Searches row at bottom',
      ]
    },
    {
      icon: '📈', color: C.orange, title: 'Docs by Source — Enhanced on Dashboard',
      detail: [
        'Bars enlarged from h-1.5 to h-2 — more readable',
        'Per-source doc count shown in bold with source colour (was tiny grey text)',
        'Percentage of corpus shown beneath each bar',
        'Total document count header added',
      ]
    },
  ]

  items.forEach((item, i) => {
    const y = 0.6 + i * 2.45
    s.addShape(pres.ShapeType.roundRect, { x: 0.3, y, w: 9.4, h: 2.2,
      fill: { color: C.cardBg }, line: { color: C.border, width: 1 }, rectRadius: 0.1 })
    s.addShape(pres.ShapeType.rect, { x: 0.3, y, w: 0.25, h: 2.2,
      fill: { color: item.color }, line: { color: item.color, width: 0 } })

    s.addText(item.icon + '  ' + item.title, { x: 0.65, y: y + 0.12, w: 8.5, h: 0.35,
      fontSize: 14, bold: true, color: item.color, fontFace: 'Arial', margin: 0 })

    s.addText(item.detail.map((d, di) => ({
      text: '→  ' + d + (di < item.detail.length - 1 ? '\n' : ''),
      options: { color: di === 0 ? C.white : C.dim, breakLine: di < item.detail.length - 1 }
    })), { x: 0.65, y: y + 0.55, w: 8.5, h: 1.55,
      fontSize: 10, fontFace: 'Arial', margin: 0 })
  })
}

// ── Slide 4: What Changed Where ─────────────────────────────────────────────
{
  const s = pres.addSlide()
  s.background = { color: C.navy }
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.45, fill: { color: C.cardBg } })
  s.addText('File Change Log', { x: 0.5, y: 0.06, w: 8, h: 0.33,
    fontSize: 18, bold: true, color: C.white, fontFace: 'Arial', margin: 0 })

  const rows = [
    { file: 'backend/models.py',                 change: 'Added experts_at_risk: int = 0 to DashboardStats',          tag: 'Fix',      color: C.green  },
    { file: 'backend/routes/api.py',             change: 'Pass experts_at_risk in DashboardStats() constructor',       tag: 'Fix',      color: C.green  },
    { file: 'backend/utils/sme_ranker.py',       change: 'Added _classify_name() + type field on all SME dicts',      tag: 'Fix',      color: C.green  },
    { file: 'frontend/pages/Intelligence.jsx',   change: 'AnalyticsTab full rewrite — corpus + search sections',      tag: 'Feature',  color: C.purple },
    { file: 'frontend/pages/Dashboard.jsx',      change: 'Docs by Source — enlarged bars + bold numbers + % corpus',  tag: 'UI',       color: C.orange },
    { file: 'backend/routes/intelligence.py',    change: 'Velocity: handles string+BSON dates; /debug endpoint',      tag: 'Fix',      color: C.green  },
    { file: 'frontend/pages/Search.jsx',         change: 'Enterprise light theme; compact SME sidebar; PersonBanner', tag: 'UI',       color: C.teal   },
    { file: 'README.md',                         change: 'Updated to v3.2 with full change table',                    tag: 'Docs',     color: C.dim    },
  ]

  rows.forEach((r, i) => {
    const y = 0.6 + i * 0.58
    s.addShape(pres.ShapeType.rect, { x: 0.3, y: y + 0.01, w: 9.4, h: 0.5,
      fill: { color: i % 2 === 0 ? C.cardBg : C.navy }, line: { color: C.cardBg, width: 0 } })

    s.addText(r.file, { x: 0.4, y: y + 0.08, w: 3.2, h: 0.3,
      fontSize: 9.5, color: C.teal, fontFace: 'Courier New', bold: true, margin: 0 })
    s.addText(r.change, { x: 3.7, y: y + 0.08, w: 5.2, h: 0.3,
      fontSize: 10, color: C.white, fontFace: 'Arial', margin: 0 })
    s.addShape(pres.ShapeType.roundRect, { x: 9.0, y: y + 0.1, w: 0.8, h: 0.26,
      fill: { color: C.cardBg }, line: { color: r.color, width: 1 }, rectRadius: 0.05 })
    s.addText(r.tag, { x: 9.0, y: y + 0.1, w: 0.8, h: 0.26,
      fontSize: 9, color: r.color, bold: true, align: 'center', fontFace: 'Arial', margin: 0 })
  })
}

const outPath = '/home/claude/ekm-mvp/docs/EKM-Release-Notes-v3.2.pptx'
pres.writeFile({ fileName: outPath })
  .then(() => console.log('✓ Written:', outPath))
  .catch(e => { console.error(e); process.exit(1) })
