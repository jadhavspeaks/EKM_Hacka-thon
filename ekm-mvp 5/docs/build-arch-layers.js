const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");

// ── Shared palette ────────────────────────────────────────────────────────────
const C = {
  navy:"1E3A5F", teal:"0D9488", tealLt:"5EEAD4",
  white:"FFFFFF", offWhite:"F8FAFC", slate:"475569", slateXl:"94A3B8",
  orange:"F97316", gold:"F59E0B", red:"EF4444", green:"10B981",
  purple:"6D28D9", blue:"2563EB", dark:"0F172A",
  cardBdr:"E2E8F0", navyDk:"0F2033",
  layerBg1:"EFF6FF", layerBg2:"F0FDF4", layerBg3:"FFF7ED",
  layerBg4:"FDF4FF", layerBg5:"F0FDFA",
};
const ms = () => ({ type:"outer",color:"000000",blur:5,offset:2,angle:135,opacity:0.09 });

// ── Box helpers ────────────────────────────────────────────────────────────────
function box(s, pres, x, y, w, h, label, opts = {}) {
  const { fill=C.white, border=C.cardBdr, bw=1, accent=null, sub=null,
          textColor=C.navy, fontSize=9, bold=false, shadow=false,
          textY=null, subColor=C.slateXl } = opts;
  s.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill:{color:fill}, line:{color:border, width:bw},
    ...(shadow ? {shadow:ms()} : {})
  });
  if (accent) {
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w:0.06, h, fill:{color:accent}, line:{color:accent}
    });
  }
  const tx = accent ? x+0.1 : x+0.1;
  const ty = textY || (sub ? y+0.08 : y+(h-fontSize*0.014)/2-0.01);
  s.addText(label, { x:tx, y:ty, w:w-0.15, h:fontSize*0.018+0.02,
    fontSize, bold, color:textColor, align:"center", valign:"middle", margin:0 });
  if (sub) {
    s.addText(sub, { x:tx, y:ty+fontSize*0.018+0.04, w:w-0.15, h:0.14,
      fontSize:7.5, color:subColor, align:"center", margin:0, italic:true });
  }
}

function label(s, x, y, w, h, text, opts={}) {
  const {fontSize=8, bold=false, color=C.slateXl, align="left"} = opts;
  s.addText(text, {x,y,w,h,fontSize,bold,color,align,margin:0});
}

function arrow(s, pres, x1, y1, x2, y2, color=C.slateXl) {
  s.addShape(pres.shapes.LINE, {
    x:Math.min(x1,x2), y:Math.min(y1,y2),
    w:Math.abs(x2-x1)||0.01, h:Math.abs(y2-y1)||0.01,
    line:{color, width:1.2}
  });
}

// ════════════════════════════════════════════════════════════════════════════
// FILE 1 — BUSINESS ARCHITECTURE  (TOGAF-inspired, colourful blocks)
// ════════════════════════════════════════════════════════════════════════════
async function buildBusiness() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.3 × 7.5
  const s = pres.addSlide();
  s.background = { color: C.offWhite };

  // ── Title bar ──
  s.addShape(pres.shapes.RECTANGLE, {x:0,y:0,w:13.3,h:0.6,fill:{color:C.navy},line:{color:C.navy}});
  s.addShape(pres.shapes.RECTANGLE, {x:0,y:0.6,w:13.3,h:0.04,fill:{color:C.teal},line:{color:C.teal}});
  s.addText("EKM — Business Architecture", {x:0.35,y:0.1,w:8,h:0.4,fontSize:20,bold:true,color:C.white,margin:0});
  s.addText("Stakeholders · Value Streams · Capabilities · Outcomes", {x:8.5,y:0.18,w:4.6,h:0.28,fontSize:9.5,color:C.tealLt,italic:true,align:"right",margin:0});

  // ══ ROW 1 — Motivation layer ═══════════════════════════════════════════════
  s.addShape(pres.shapes.RECTANGLE, {x:0.25,y:0.78,w:12.8,h:1.62,fill:{color:"FFF7ED"},line:{color:"FED7AA",width:1.5}});
  label(s,0.35,0.82,3,0.22,"MOTIVATION LAYER",{bold:true,color:C.orange,fontSize:7.5});

  const motivations = [
    {label:"🔍 Find Knowledge", sub:"Engineers locate answers\nwithout tool-switching"},
    {label:"🛡️ Govern Risk",    sub:"Vendor dependency\nand audit evidence"},
    {label:"🎓 Onboard Fast",   sub:"New joiners productive\nin days, not months"},
    {label:"📈 Measure Health", sub:"Coverage, velocity\nand freshness signals"},
    {label:"📦 Transfer Safely",sub:"Handover packs before\nSMEs or vendors exit"},
  ];
  motivations.forEach((m,i) => {
    box(s,pres, 0.4+i*2.5, 1.05, 2.3, 1.1, m.label, {
      fill:C.white, border:"FED7AA", bw:1.2, textColor:C.navy,
      fontSize:10, bold:true, shadow:true, sub:m.sub, subColor:C.slate,
      textY:1.12
    });
  });

  // ══ ROW 2 — three-column: Stakeholders | Value Streams | Capabilities ═════
  const row2Y = 2.6, row2H = 3.45;

  // Stakeholders
  s.addShape(pres.shapes.RECTANGLE, {x:0.25,y:row2Y,w:3.9,h:row2H,fill:{color:"EFF6FF"},line:{color:"BFDBFE",width:1.5}});
  label(s,0.35,row2Y+0.08,3,0.22,"STAKEHOLDERS",{bold:true,color:C.blue,fontSize:7.5});
  const stakeholders=[
    {icon:"💻",role:"Engineer / Developer",   need:"Fast answers, no context switching"},
    {icon:"📊",role:"Team Lead / Manager",    need:"Risk visibility, health scores"},
    {icon:"🎓",role:"New Joiner",             need:"Structured learning paths"},
    {icon:"🛡️",role:"Risk & Compliance",     need:"On-demand audit evidence"},
    {icon:"📦",role:"Programme / Delivery",  need:"Handover tracking & alerts"},
    {icon:"🏦",role:"Executive / CTO",       need:"Knowledge ROI & risk posture"},
  ];
  stakeholders.forEach((st,i) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x:0.35, y:row2Y+0.38+i*0.49, w:3.7, h:0.42,
      fill:{color:C.white}, line:{color:"BFDBFE",width:1}, shadow:ms()
    });
    s.addText(st.icon, {x:0.42,y:row2Y+0.42+i*0.49,w:0.35,h:0.35,fontSize:14,margin:0});
    s.addText(st.role, {x:0.8,y:row2Y+0.42+i*0.49,w:2.0,h:0.2,fontSize:8.5,bold:true,color:C.navy,margin:0});
    s.addText(st.need, {x:0.8,y:row2Y+0.62+i*0.49,w:2.9,h:0.16,fontSize:7.5,color:C.slate,italic:true,margin:0});
  });

  // Value Streams
  s.addShape(pres.shapes.RECTANGLE, {x:4.3,y:row2Y,w:4.55,h:row2H,fill:{color:"F0FDF4"},line:{color:"BBF7D0",width:1.5}});
  label(s,4.4,row2Y+0.08,4,0.22,"VALUE STREAMS",{bold:true,color:C.green,fontSize:7.5});
  const streams=[
    {name:"🔍 FIND",       col:C.teal,  steps:["Type query in EKM","BM25 returns ranked results","SME identified inline","Answer found < 30s"]},
    {name:"🎓 ONBOARD",    col:C.gold,  steps:["Manager generates path","Shareable URL sent","Reads Confluence first","Productive in days"]},
    {name:"🛡️ GOVERN",     col:C.red,   steps:["Risk tab flags vendors","Gaps surface missing docs","Handover initiated","Audit pack on demand"]},
    {name:"📈 MEASURE",    col:C.purple,steps:["Velocity chart trends","Health report freshness","Coverage graded A–F","Leadership always live"]},
  ];
  streams.forEach((vs,i) => {
    const sy = row2Y+0.38+i*0.78;
    s.addShape(pres.shapes.RECTANGLE, {x:4.4,y:sy,w:4.35,h:0.68,fill:{color:C.white},line:{color:vs.col,width:1.2},shadow:ms()});
    s.addShape(pres.shapes.RECTANGLE, {x:4.4,y:sy,w:4.35,h:0.25,fill:{color:vs.col},line:{color:vs.col}});
    s.addText(vs.name, {x:4.52,y:sy+0.03,w:4.1,h:0.19,fontSize:9.5,bold:true,color:C.white,margin:0});
    vs.steps.forEach((st,j) => {
      s.addText(`${j+1}. ${st}`, {x:4.52,y:sy+0.3+j*0.095,w:4.1,h:0.09,fontSize:7.5,color:C.slate,margin:0});
    });
  });

  // Capabilities
  s.addShape(pres.shapes.RECTANGLE, {x:9.0,y:row2Y,w:4.1,h:row2H,fill:{color:"FDF4FF"},line:{color:"E9D5FF",width:1.5}});
  label(s,9.1,row2Y+0.08,3,0.22,"CAPABILITIES",{bold:true,color:C.purple,fontSize:7.5});
  const caps=[
    {cap:"Unified Search",      items:["BM25 across 4 sources","SME ranking","Fuzzy fallback"]},
    {cap:"Knowledge Intelligence",items:["Velocity trends","Risk scoring","Gap detection"]},
    {cap:"Risk Management",     items:["Vendor classification","Expert-at-risk alerts","Coverage grades"]},
    {cap:"Enablement",          items:["Learning paths","Shareable URLs","Global / search"]},
    {cap:"Operations",          items:["Incremental sync","Force Full override","Health monitoring"]},
  ];
  caps.forEach((c,i) => {
    const cy = row2Y+0.38+i*0.62;
    s.addShape(pres.shapes.RECTANGLE, {x:9.1,y:cy,w:3.9,h:0.55,fill:{color:C.white},line:{color:"E9D5FF",width:1},shadow:ms()});
    s.addShape(pres.shapes.RECTANGLE, {x:9.1,y:cy,w:0.06,h:0.55,fill:{color:C.purple},line:{color:C.purple}});
    s.addText(c.cap, {x:9.22,y:cy+0.06,w:3.65,h:0.2,fontSize:9,bold:true,color:C.navy,margin:0});
    s.addText(c.items.join(" · "), {x:9.22,y:cy+0.28,w:3.65,h:0.18,fontSize:7.5,color:C.slate,margin:0,italic:true});
  });

  // ══ ROW 3 — Outcomes bar ═══════════════════════════════════════════════════
  s.addShape(pres.shapes.RECTANGLE, {x:0.25,y:6.22,w:12.8,h:1.0,fill:{color:"F0FDFA"},line:{color:"99F6E4",width:1.5}});
  label(s,0.35,6.28,3,0.22,"MEASURABLE OUTCOMES",{bold:true,color:C.teal,fontSize:7.5});
  const outcomes=[
    {val:"1 day/wk",lbl:"reclaimed per person"},
    {val:"£100K+",  lbl:"saved per 10-person team/yr"},
    {val:"Days→Min",lbl:"audit evidence compile"},
    {val:"3–6mo→wk",lbl:"new joiner ramp time"},
    {val:"Zero",    lbl:"undetected vendor exits"},
    {val:"100%",    lbl:"knowledge visibility"},
  ];
  outcomes.forEach((o,i) => {
    s.addText(o.val, {x:0.4+i*2.1,y:6.52,w:2.0,h:0.35,fontSize:16,bold:true,color:C.teal,align:"center",margin:0});
    s.addText(o.lbl, {x:0.4+i*2.1,y:6.88,w:2.0,h:0.2,fontSize:8,color:C.slate,align:"center",margin:0,italic:true});
  });

  s.addText("Editable shapes — click any element to move, resize or recolour in PowerPoint", {
    x:0.25,y:7.35,w:12.8,h:0.15,fontSize:7.5,color:C.slateXl,italic:true,align:"right",margin:0
  });

  await pres.writeFile({fileName:"/home/claude/arch2/EKM-Business-Architecture.pptx"});
  console.log("✅ Business Architecture written");
}

// ════════════════════════════════════════════════════════════════════════════
// FILE 2 — TECHNICAL / SYSTEM ARCHITECTURE  (layered swim-lane, Image 3 style)
// ════════════════════════════════════════════════════════════════════════════
async function buildTechnical() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  const s = pres.addSlide();
  s.background = {color:"F1F5F9"};

  // Title
  s.addShape(pres.shapes.RECTANGLE, {x:0,y:0,w:13.3,h:0.55,fill:{color:C.navyDk},line:{color:C.navyDk}});
  s.addShape(pres.shapes.RECTANGLE, {x:0,y:0.55,w:13.3,h:0.035,fill:{color:C.teal},line:{color:C.teal}});
  s.addText("EKM — Technical Architecture", {x:0.3,y:0.09,w:7,h:0.36,fontSize:19,bold:true,color:C.white,margin:0});
  s.addText("Layered system view  ·  Data flow  ·  Stack  ·  Deployment", {
    x:7.5,y:0.15,w:5.6,h:0.28,fontSize:9.5,color:C.tealLt,italic:true,align:"right",margin:0
  });

  // ── Left strip: user actors ───────────────────────────────────────────────
  const actors = ["💻 Engineers","📊 Managers","🎓 New Joiners","🛡️ Compliance"];
  s.addShape(pres.shapes.RECTANGLE, {x:0.1,y:0.72,w:1.25,h:6.4,fill:{color:"EFF6FF"},line:{color:"BFDBFE",width:1}});
  label(s,0.12,0.78,1.2,0.2,"USERS",{bold:true,color:C.blue,fontSize:7,align:"center"});
  actors.forEach((a,i) => {
    s.addShape(pres.shapes.RECTANGLE, {x:0.14,y:1.05+i*1.12,w:1.17,h:0.7,fill:{color:C.white},line:{color:"BFDBFE",width:1},shadow:ms()});
    s.addText(a, {x:0.14,y:1.05+i*1.12,w:1.17,h:0.7,fontSize:8.5,bold:true,color:C.navy,align:"center",valign:"middle",margin:0});
  });

  // ── Main layered content (5 horizontal swim-lane layers) ──────────────────
  const lx = 1.5, lw = 11.6;
  const layers = [
    { label:"PRESENTATION LAYER",    y:0.72,  h:1.2,  fill:"EFF6FF", border:"93C5FD", labelCol:C.blue   },
    { label:"API GATEWAY LAYER",      y:2.0,   h:0.75, fill:"F0FDF4", border:"86EFAC", labelCol:C.green  },
    { label:"INTELLIGENCE LAYER",     y:2.83,  h:1.5,  fill:"FFF7ED", border:"FCD34D", labelCol:C.gold   },
    { label:"CORE ENGINE",            y:4.41,  h:1.35, fill:"F0FDFA", border:"5EEAD4", labelCol:C.teal   },
    { label:"DATA SOURCES & CONNECTORS", y:5.84, h:1.22, fill:"FDF4FF", border:"C4B5FD", labelCol:C.purple },
  ];

  layers.forEach(l => {
    s.addShape(pres.shapes.RECTANGLE, {x:lx,y:l.y,w:lw,h:l.h,fill:{color:l.fill},line:{color:l.border,width:1.2}});
    s.addText(l.label, {x:lx+0.08,y:l.y+0.04,w:3,h:0.2,fontSize:7,bold:true,color:l.labelCol,margin:0,charSpacing:1.5});
  });

  // ── PRESENTATION ──────────────────────────────────────────────────────────
  const presItems = [
    {label:"React 18\nVite + Tailwind",         sub:"port 3000"},
    {label:"Dashboard\nExecutive KPIs",          sub:"/ route"},
    {label:"Search\nBM25 + SME panel",           sub:"/search"},
    {label:"Intelligence\nSidebar · 10 tabs",    sub:"/intelligence"},
    {label:"Global / Search\nModal · keyboard",  sub:"any page"},
    {label:"Learning Path\nPublic URL",           sub:"/join/:topic"},
  ];
  presItems.forEach((p,i) => {
    s.addShape(pres.shapes.RECTANGLE, {x:lx+0.12+i*1.9,y:0.98,w:1.78,h:0.82,fill:{color:C.white},line:{color:"93C5FD",width:1},shadow:ms()});
    s.addShape(pres.shapes.RECTANGLE, {x:lx+0.12+i*1.9,y:0.98,w:1.78,h:0.06,fill:{color:C.blue},line:{color:C.blue}});
    s.addText(p.label, {x:lx+0.18+i*1.9,y:1.06,w:1.65,h:0.42,fontSize:8.5,bold:true,color:C.navy,align:"center",margin:0});
    s.addText(p.sub, {x:lx+0.18+i*1.9,y:1.5,w:1.65,h:0.2,fontSize:7.5,color:C.blue,align:"center",italic:true,margin:0});
  });

  // ── API GATEWAY ───────────────────────────────────────────────────────────
  s.addShape(pres.shapes.RECTANGLE, {x:lx+0.12,y:2.12,w:3.8,h:0.5,fill:{color:C.white},line:{color:"86EFAC",width:1},shadow:ms()});
  s.addText("⚡ FastAPI — /api/search  · /api/sync  · /api/intelligence  · /api/people  · /api/analytics  · /api/explain", {
    x:lx+0.2,y:2.12,w:3.7,h:0.5,fontSize:8.5,bold:true,color:C.navy,align:"center",valign:"middle",margin:0
  });
  s.addShape(pres.shapes.RECTANGLE, {x:lx+4.1,y:2.12,w:3.5,h:0.5,fill:{color:C.white},line:{color:"86EFAC",width:1},shadow:ms()});
  s.addText("🔐 Auth & CORS  · HTTPS  · PAT tokens (per source, stored in .env)  · Read-only — no write-back", {
    x:lx+4.2,y:2.12,w:3.4,h:0.5,fontSize:8.5,color:C.slate,align:"center",valign:"middle",margin:0
  });
  s.addShape(pres.shapes.RECTANGLE, {x:lx+7.75,y:2.12,w:3.7,h:0.5,fill:{color:C.white},line:{color:"86EFAC",width:1},shadow:ms()});
  s.addText("⏱ APScheduler  · Incremental sync (default)  · Force Full override  · Configurable interval", {
    x:lx+7.85,y:2.12,w:3.6,h:0.5,fontSize:8.5,color:C.slate,align:"center",valign:"middle",margin:0
  });

  // ── INTELLIGENCE ──────────────────────────────────────────────────────────
  const intels = [
    {ico:"📊",n:"Analytics",     c:C.teal  },
    {ico:"📈",n:"Velocity",      c:C.teal  },
    {ico:"🔴",n:"Risk",          c:C.red   },
    {ico:"🕳️",n:"Gaps",          c:C.orange},
    {ico:"⚠️",n:"Experts",       c:C.gold  },
    {ico:"❤️",n:"Health",        c:C.red   },
    {ico:"📋",n:"Coverage",      c:C.purple},
    {ico:"📦",n:"Handover",      c:C.navy  },
    {ico:"👤",n:"People",        c:C.teal  },
    {ico:"🎓",n:"Learning",      c:C.green },
  ];
  intels.forEach((it,i) => {
    const bx = lx+0.12+i*1.14;
    s.addShape(pres.shapes.RECTANGLE, {x:bx,y:2.98,w:1.05,h:1.18,fill:{color:C.white},line:{color:it.c,width:1},shadow:ms()});
    s.addShape(pres.shapes.RECTANGLE, {x:bx,y:2.98,w:1.05,h:0.06,fill:{color:it.c},line:{color:it.c}});
    s.addText(it.ico, {x:bx,y:3.05,w:1.05,h:0.35,fontSize:16,align:"center",margin:0});
    s.addText(it.n, {x:bx,y:3.42,w:1.05,h:0.28,fontSize:7.5,bold:true,color:C.navy,align:"center",margin:0});
    s.addText("5-min cache", {x:bx,y:3.73,w:1.05,h:0.18,fontSize:6.5,color:C.slateXl,align:"center",italic:true,margin:0});
  });

  // ── CORE ENGINE ───────────────────────────────────────────────────────────
  const coreItems = [
    {label:"🍃 MongoDB 7",           sub:"Full-text index\nBM25 weighted",           col:C.teal  },
    {label:"🔍 BM25 Engine",         sub:"title 10× · tags 5×\ncontent 1×",          col:C.teal  },
    {label:"🏆 SME Ranker",          sub:"Recency weighting\nTop 5 experts",          col:C.gold  },
    {label:"🏷️ Entity Extractor",    sub:"Tickets · CHG\nVersions · Envs",           col:C.orange},
    {label:"💻 Code Explainer",      sub:"4-signal analysis\nJira+PR+Diff+Arch",      col:C.purple},
    {label:"📄 File Extractor",      sub:"docx/pptx/xlsx\npdf/txt",                  col:C.slate },
  ];
  coreItems.forEach((c,i) => {
    const bx = lx+0.12+i*1.9;
    s.addShape(pres.shapes.RECTANGLE, {x:bx,y:4.55,w:1.78,h:1.0,fill:{color:C.white},line:{color:c.col,width:1.2},shadow:ms()});
    s.addShape(pres.shapes.RECTANGLE, {x:bx,y:4.55,w:1.78,h:0.06,fill:{color:c.col},line:{color:c.col}});
    s.addText(c.label, {x:bx+0.06,y:4.63,w:1.65,h:0.3,fontSize:9,bold:true,color:C.navy,align:"center",margin:0});
    s.addText(c.sub, {x:bx+0.06,y:4.96,w:1.65,h:0.42,fontSize:8,color:C.slate,align:"center",valign:"top",margin:0,italic:true});
  });

  // ── DATA SOURCES ──────────────────────────────────────────────────────────
  const srcs = [
    {ico:"🎫",n:"Jira",       sub:"cedt-icg-jira\nPAT auth · JQL",      col:"F97316", docs:"4,979 docs"},
    {ico:"📖",n:"Confluence", sub:"cedt-confluence\nPAT auth · HTML→txt", col:"6D28D9", docs:"88+ pages"},
    {ico:"💻",n:"GitHub GHE", sub:"CitiInternal org\nPAT · commits+PRs",  col:"1F2937", docs:"90 items"},
    {ico:"📋",n:"SharePoint", sub:"Azure AD required\nRoadmap Q2 2026",   col:"2563EB", docs:"Pending"},
  ];
  srcs.forEach((src,i) => {
    const bx = lx+0.12+i*2.88;
    s.addShape(pres.shapes.RECTANGLE, {x:bx,y:5.98,w:2.7,h:0.92,fill:{color:C.white},line:{color:src.col,width:1.5},shadow:ms()});
    s.addShape(pres.shapes.RECTANGLE, {x:bx,y:5.98,w:2.7,h:0.07,fill:{color:src.col},line:{color:src.col}});
    s.addText(src.ico+" "+src.n, {x:bx+0.1,y:6.07,w:1.4,h:0.28,fontSize:11,bold:true,color:C.navy,margin:0});
    s.addText(src.docs, {x:bx+1.55,y:6.09,w:1.1,h:0.24,fontSize:8.5,bold:true,color:src.col,align:"right",margin:0});
    s.addText(src.sub, {x:bx+0.1,y:6.36,w:2.5,h:0.46,fontSize:8,color:C.slate,italic:true,margin:0});
    // Connector file
    s.addText(`⚡ ${src.n.toLowerCase()}.py`, {x:bx+0.1,y:6.58,w:2.5,h:0.22,fontSize:8,color:src.col,bold:true,margin:0});
  });

  // Vertical flow arrows between layers
  [[2.0,3.5],[2.83,3.5],[4.41,3.5],[5.84,3.5]].forEach(([y1,x]) => {
    arrow(s,pres, x,y1-0.12, x,y1, C.teal);
  });

  s.addText("All shapes are editable in PowerPoint — click any element to move, resize or recolour", {
    x:0.1,y:7.38,w:13.1,h:0.15,fontSize:7.5,color:C.slateXl,italic:true,align:"right",margin:0
  });

  await pres.writeFile({fileName:"/home/claude/arch2/EKM-Technical-Architecture.pptx"});
  console.log("✅ Technical Architecture written");
}

// ════════════════════════════════════════════════════════════════════════════
// BUILD
// ════════════════════════════════════════════════════════════════════════════
async function main() {
  await buildBusiness();
  await buildTechnical();
}
main().catch(e => { console.error(e); process.exit(1); });
