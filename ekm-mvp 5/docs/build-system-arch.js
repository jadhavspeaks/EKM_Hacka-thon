const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.3 × 7.5 for more space

const C = {
  navy:    "1E3A5F",
  teal:    "0D9488",
  tealLt:  "5EEAD4",
  white:   "FFFFFF",
  offWhite:"F8FAFC",
  slate:   "475569",
  slateXl: "94A3B8",
  orange:  "F97316",
  gold:    "F59E0B",
  red:     "EF4444",
  green:   "10B981",
  purple:  "6D28D9",
  cardBdr: "E2E8F0",
  dark:    "0F172A",
};

const makeShadow = () => ({ type:"outer", color:"000000", blur:6, offset:2, angle:135, opacity:0.12 });

const s = pres.addSlide();
s.background = { color: C.offWhite };

// ── Title ────────────────────────────────────────────────────────────────────
s.addShape(pres.shapes.RECTANGLE, {
  x:0, y:0, w:13.3, h:0.72,
  fill:{color:C.navy}, line:{color:C.navy}
});
s.addShape(pres.shapes.RECTANGLE, {
  x:0, y:0.72, w:13.3, h:0.05,
  fill:{color:C.teal}, line:{color:C.teal}
});
s.addText("EKM — Enterprise Knowledge Management", {
  x:0.35, y:0.08, w:9, h:0.55,
  fontSize:22, bold:true, color:C.white, margin:0
});
s.addText("Architecture Diagram v2.0  ·  March 2026  ·  Editable", {
  x:9.5, y:0.15, w:3.6, h:0.4,
  fontSize:10, color:C.tealLt, align:"right", italic:true, margin:0
});

// ── Layer headers ─────────────────────────────────────────────────────────────
const layerX  = [0.3, 3.05, 5.75, 8.45, 10.85];
const layerW  = 2.55;
const layerColors = [C.orange, C.gold, C.teal, C.red, C.purple];
const layerLabels = ["DATA SOURCES", "CONNECTORS", "CORE ENGINE", "INTELLIGENCE", "FRONTEND"];

layerLabels.forEach((lbl, i) => {
  s.addShape(pres.shapes.RECTANGLE, {
    x:layerX[i], y:0.9, w:layerW, h:0.42,
    fill:{color:layerColors[i]}, line:{color:layerColors[i]}
  });
  s.addText(lbl, {
    x:layerX[i], y:0.9, w:layerW, h:0.42,
    fontSize:9, bold:true, color:C.white,
    align:"center", valign:"middle", charSpacing:1.8, margin:0
  });
});

// ── Helper: box ───────────────────────────────────────────────────────────────
function box(x, y, w, h, label, accentColor, textColor=C.navy, fontSize=10.5) {
  s.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill:{color:C.white}, line:{color:accentColor, width:1.5},
    shadow: makeShadow()
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x, y, w:0.07, h,
    fill:{color:accentColor}, line:{color:accentColor}
  });
  s.addText(label, {
    x:x+0.14, y, w:w-0.2, h,
    fontSize, bold:true, color:textColor,
    align:"left", valign:"middle", margin:0
  });
}

// ── Data Sources ──────────────────────────────────────────────────────────────
const sources = [
  { label:"🎫  Jira",        sub:"Issues · Comments · ADF"   },
  { label:"📖  Confluence",  sub:"Pages · Spaces · HTML→text"},
  { label:"📋  SharePoint",  sub:"SitePages · Doc libraries"  },
  { label:"💻  GitHub GHE",  sub:"Commits · Files · PRs"     },
];
sources.forEach((src, i) => {
  const y = 1.52 + i * 1.3;
  s.addShape(pres.shapes.RECTANGLE, {
    x:0.3, y, w:2.55, h:1.1,
    fill:{color:C.white}, line:{color:C.orange, width:1.5},
    shadow: makeShadow()
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x:0.3, y, w:2.55, h:0.07, fill:{color:C.orange}, line:{color:C.orange}
  });
  s.addText(src.label, {
    x:0.42, y:y+0.14, w:2.3, h:0.42,
    fontSize:12, bold:true, color:C.navy, margin:0
  });
  s.addText(src.sub, {
    x:0.42, y:y+0.6, w:2.3, h:0.38,
    fontSize:8.5, color:C.slate, italic:true, margin:0
  });
});

// ── Arrows: Sources → Connectors ─────────────────────────────────────────────
[1.97, 3.27, 4.57, 5.87].forEach(y => {
  s.addShape(pres.shapes.LINE, {
    x:2.85, y, w:0.2, h:0,
    line:{color:C.slateXl, width:1.5}
  });
});

// ── Connectors ────────────────────────────────────────────────────────────────
const connectors = ["⚡  jira.py", "⚡  confluence.py", "⚡  sharepoint.py", "⚡  github.py"];
connectors.forEach((c, i) => {
  box(3.05, 1.52 + i * 1.3, 2.5, 1.1, c, C.gold);
});

// ── Arrows: Connectors → Core ─────────────────────────────────────────────────
[1.97, 3.27, 4.57, 5.87].forEach(y => {
  s.addShape(pres.shapes.LINE, {
    x:5.55, y, w:0.2, h:0,
    line:{color:C.teal, width:1.5}
  });
});

// ── Core Engine ───────────────────────────────────────────────────────────────
s.addShape(pres.shapes.RECTANGLE, {
  x:5.75, y:1.52, w:2.5, h:5.75,
  fill:{color:C.navy}, line:{color:C.teal, width:2},
  shadow: makeShadow()
});
s.addShape(pres.shapes.RECTANGLE, {
  x:5.75, y:1.52, w:2.5, h:0.07,
  fill:{color:C.teal}, line:{color:C.teal}
});

const coreItems = [
  { text:"🍃  MongoDB",         big:true,  col:C.tealLt },
  { text:"BM25 Full-text Index", big:false, col:C.slateXl },
  { text:"Unique upsert",        big:false, col:C.slateXl },
  { text:"Entity extraction",    big:false, col:C.slateXl },
  { text:"───────────────",      big:false, col:"2D5A8A" },
  { text:"⚡  FastAPI",           big:true,  col:C.teal   },
  { text:"/api/search",          big:false, col:C.slateXl },
  { text:"/api/sync",            big:false, col:C.slateXl },
  { text:"/api/people",          big:false, col:C.slateXl },
  { text:"/api/analytics",       big:false, col:C.slateXl },
  { text:"/api/intelligence",    big:false, col:C.slateXl },
  { text:"/api/explain",         big:false, col:C.slateXl },
  { text:"───────────────",      big:false, col:"2D5A8A" },
  { text:"⏱  APScheduler",       big:true,  col:C.gold   },
  { text:"Incremental sync",     big:false, col:C.slateXl },
  { text:"Force Full sync",      big:false, col:C.slateXl },
];
coreItems.forEach((item, i) => {
  s.addText(item.text, {
    x:5.88, y:1.65 + i*0.34, w:2.25, h:0.32,
    fontSize:item.big ? 11 : 9, bold:item.big,
    color:item.col, align:"left", margin:0
  });
});

// ── Utils column (below core label) ──────────────────────────────────────────
// actually embed in narrative below

// ── Arrows: Core → Intelligence ───────────────────────────────────────────────
[1.97, 3.27, 4.57, 5.87].forEach(y => {
  s.addShape(pres.shapes.LINE, {
    x:8.25, y, w:0.2, h:0,
    line:{color:C.red, width:1.5}
  });
});

// ── Intelligence tabs ─────────────────────────────────────────────────────────
const intTabs = [
  { label:"📊  Analytics",       col:C.teal   },
  { label:"📈  Velocity",        col:C.teal   },
  { label:"🔴  Risk & Vendors",  col:C.red    },
  { label:"❤️  Health",          col:C.red    },
  { label:"🕳️  Knowledge Gaps",  col:C.orange },
  { label:"⚠️  Experts At Risk", col:C.orange },
  { label:"📋  Coverage Score",  col:C.purple },
  { label:"📦  Handover Tracker",col:C.navy   },
  { label:"👤  People",          col:C.teal   },
  { label:"🎓  Learning Path",   col:C.teal   },
];
intTabs.forEach((tab, i) => {
  const y = 1.52 + i * 0.57;
  s.addShape(pres.shapes.RECTANGLE, {
    x:8.45, y, w:2.2, h:0.47,
    fill:{color:C.white}, line:{color:tab.col, width:1.2},
    shadow: makeShadow()
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x:8.45, y, w:0.07, h:0.47,
    fill:{color:tab.col}, line:{color:tab.col}
  });
  s.addText(tab.label, {
    x:8.57, y:y+0.04, w:1.98, h:0.38,
    fontSize:9.5, bold:true, color:C.navy, margin:0
  });
});

// ── Arrows: Core/Intel → Frontend ────────────────────────────────────────────
[1.97, 3.87].forEach(y => {
  s.addShape(pres.shapes.LINE, {
    x:10.65, y, w:0.2, h:0,
    line:{color:C.purple, width:1.5}
  });
});

// ── Frontend box ─────────────────────────────────────────────────────────────
s.addShape(pres.shapes.RECTANGLE, {
  x:10.85, y:1.52, w:2.15, h:5.75,
  fill:{color:"1A1042"}, line:{color:C.purple, width:1.5},
  shadow: makeShadow()
});
s.addShape(pres.shapes.RECTANGLE, {
  x:10.85, y:1.52, w:2.15, h:0.07,
  fill:{color:C.purple}, line:{color:C.purple}
});

const feItems = [
  { text:"⚛️  React 18",         big:true,  col:C.tealLt },
  { text:"Tailwind CSS",         big:false, col:C.slateXl },
  { text:"React Router",         big:false, col:C.slateXl },
  { text:"───────────",          big:false, col:"2D1F5A"  },
  { text:"Dashboard",            big:true,  col:C.white  },
  { text:"Force Full toggle",    big:false, col:C.slateXl },
  { text:"───────────",          big:false, col:"2D1F5A"  },
  { text:"Search",               big:true,  col:C.white  },
  { text:"BM25 + SME panel",     big:false, col:C.slateXl },
  { text:"───────────",          big:false, col:"2D1F5A"  },
  { text:"Intelligence",         big:true,  col:C.white  },
  { text:"10 tabs",              big:false, col:C.slateXl },
  { text:"───────────",          big:false, col:"2D1F5A"  },
  { text:"⌨️  / Global Search",  big:true,  col:C.tealLt },
  { text:"Modal, keyboard nav",  big:false, col:C.slateXl },
  { text:"───────────",          big:false, col:"2D1F5A"  },
  { text:"🔗  /join/:topic",     big:true,  col:C.tealLt },
  { text:"Public, no login",     big:false, col:C.slateXl },
];
feItems.forEach((item, i) => {
  s.addText(item.text, {
    x:10.98, y:1.65 + i*0.31, w:1.92, h:0.29,
    fontSize:item.big ? 10.5 : 8.5, bold:item.big,
    color:item.col, align:"left", margin:0
  });
});

// ── Utils strip at bottom ─────────────────────────────────────────────────────
s.addShape(pres.shapes.RECTANGLE, {
  x:0.3, y:7.0, w:10.35, h:0.38,
  fill:{color:"EFF6FF"}, line:{color:C.cardBdr, width:1}
});
s.addText("🔧  Utils:   bm25.py   ·   sme_ranker.py   ·   extractor.py   ·   sync_service.py   ·   file_extractor.py   ·   code_explainer.py", {
  x:0.45, y:7.03, w:10.05, h:0.3,
  fontSize:9, color:C.slate, margin:0
});

// ── Flow arrows label ─────────────────────────────────────────────────────────
s.addText("Data flow →", {
  x:0.3, y:7.42, w:4, h:0.28,
  fontSize:8.5, italic:true, color:C.slateXl, margin:0
});
s.addText("All shapes are editable — select any box or arrow to move/resize/recolour in PowerPoint", {
  x:4.5, y:7.42, w:8.5, h:0.28,
  fontSize:8.5, italic:true, color:C.slateXl, align:"right", margin:0
});

pres.writeFile({ fileName: "/home/claude/ekm-mvp/docs/EKM-Architecture.pptx" })
  .then(() => console.log("✅ EKM-Architecture.pptx written"))
  .catch(e => { console.error(e); process.exit(1); });
