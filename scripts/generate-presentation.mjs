import PptxGenJS from 'pptxgenjs';

// ─── Honeywell Brand Colors ───────────────────────────────────────────────────
const C = {
  red:       'CC0000',  // Honeywell Red
  charcoal:  '2D2D2D',  // Charcoal Gray
  darkGray:  '3D3D3D',
  midGray:   '6B6B6B',
  lightGray: 'E8E8E8',
  offWhite:  'F5F5F5',
  white:     'FFFFFF',
  black:     '111111',
  redLight:  'F5E6E6',  // very light red tint for tables
};

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.33" x 7.5"

// ─── Master Slide Defaults ────────────────────────────────────────────────────
pptx.defineSlideMaster({
  title: 'MASTER_SLIDE',
  background: { color: C.white },
  objects: [
    // Top red bar
    { rect: { x: 0, y: 0, w: '100%', h: 0.08, fill: { color: C.red } } },
    // Bottom bar
    { rect: { x: 0, y: 7.3, w: '100%', h: 0.2, fill: { color: C.charcoal } } },
    // Bottom-right: slide label
    {
      text: {
        text: 'HONEYWELL INTERNAL  |  ARCHITECTURE REVIEW',
        options: {
          x: 0, y: 7.3, w: '100%', h: 0.2,
          align: 'center', valign: 'middle',
          fontSize: 7, color: C.lightGray, fontFace: 'Calibri',
        },
      },
    },
  ],
});

// ─── Helper Functions ─────────────────────────────────────────────────────────

function addTitleSlide(slide, title, subtitle) {
  // Red left panel
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 4.2, h: 7.5,
    fill: { color: C.red },
  });
  // Honeywell wordmark-style text
  slide.addText('HONEYWELL', {
    x: 0.3, y: 0.5, w: 3.6, h: 0.5,
    fontSize: 14, bold: true, color: C.white, fontFace: 'Calibri',
    charSpacing: 4,
  });
  slide.addText('Connected Enterprise', {
    x: 0.3, y: 0.95, w: 3.6, h: 0.3,
    fontSize: 9, color: 'FFCCCC', fontFace: 'Calibri', italic: true,
  });
  // Divider line
  slide.addShape(pptx.ShapeType.line, {
    x: 0.3, y: 1.35, w: 3.6, h: 0,
    line: { color: C.white, width: 0.5 },
  });
  slide.addText(title, {
    x: 0.3, y: 1.55, w: 3.6, h: 2.2,
    fontSize: 22, bold: true, color: C.white, fontFace: 'Calibri',
    wrap: true, valign: 'top',
  });
  slide.addText(subtitle, {
    x: 0.3, y: 3.85, w: 3.6, h: 1.2,
    fontSize: 11, color: 'FFCCCC', fontFace: 'Calibri', wrap: true,
  });
  slide.addText('June 2026', {
    x: 0.3, y: 6.9, w: 3.6, h: 0.3,
    fontSize: 9, color: C.white, fontFace: 'Calibri',
  });
  // Right content area - decorative
  slide.addShape(pptx.ShapeType.rect, {
    x: 4.2, y: 0, w: 9.13, h: 7.5,
    fill: { color: C.white },
  });
  slide.addText('API Authorization & Data Filtering\nArchitecture Assessment', {
    x: 4.6, y: 2.2, w: 8.4, h: 2,
    fontSize: 28, bold: false, color: C.charcoal, fontFace: 'Calibri',
    wrap: true,
  });
  slide.addText('B2B Commerce Platform  |  Permit.io Integration Strategy', {
    x: 4.6, y: 4.2, w: 8.4, h: 0.5,
    fontSize: 13, color: C.midGray, fontFace: 'Calibri',
  });
  // Red accent line under subtitle
  slide.addShape(pptx.ShapeType.line, {
    x: 4.6, y: 4.75, w: 4, h: 0,
    line: { color: C.red, width: 2 },
  });
  slide.addText('CONFIDENTIAL  |  INTERNAL USE ONLY', {
    x: 4.6, y: 6.9, w: 8.4, h: 0.3,
    fontSize: 8, color: C.midGray, fontFace: 'Calibri', charSpacing: 2,
  });
}

function addSectionHeader(slide, sectionNum, sectionTitle, description) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 7.5,
    fill: { color: C.charcoal },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.12, h: 7.5,
    fill: { color: C.red },
  });
  slide.addText(`0${sectionNum}`, {
    x: 0.5, y: 1.5, w: 3, h: 2,
    fontSize: 96, bold: true, color: '444444', fontFace: 'Calibri',
  });
  slide.addText(sectionTitle, {
    x: 0.5, y: 3.4, w: 12, h: 1.2,
    fontSize: 32, bold: true, color: C.white, fontFace: 'Calibri',
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 0.5, y: 4.7, w: 6, h: 0,
    line: { color: C.red, width: 2 },
  });
  if (description) {
    slide.addText(description, {
      x: 0.5, y: 4.9, w: 12, h: 1,
      fontSize: 14, color: C.lightGray, fontFace: 'Calibri', italic: true,
    });
  }
}

function slideHeader(slide, title, subtitle) {
  // Red top accent
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0.08, w: '100%', h: 0.72,
    fill: { color: C.offWhite },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.35, y: 0.12, w: 0.06, h: 0.6,
    fill: { color: C.red },
  });
  slide.addText(title, {
    x: 0.55, y: 0.12, w: 11, h: 0.38,
    fontSize: 18, bold: true, color: C.charcoal, fontFace: 'Calibri',
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.55, y: 0.5, w: 11, h: 0.28,
      fontSize: 10, color: C.midGray, fontFace: 'Calibri', italic: true,
    });
  }
}

function box(slide, x, y, w, h, fillColor, text, textColor, fontSize, bold) {
  slide.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: fillColor }, line: { color: 'CCCCCC', width: 0.5 } });
  if (text) {
    slide.addText(text, {
      x, y, w, h,
      fontSize: fontSize || 10, bold: bold || false,
      color: textColor || C.charcoal, fontFace: 'Calibri',
      align: 'center', valign: 'middle', wrap: true,
    });
  }
}

function arrow(slide, x, y, w, direction) {
  // direction: 'right' or 'down'
  if (direction === 'right') {
    slide.addShape(pptx.ShapeType.line, { x, y, w, h: 0, line: { color: C.midGray, width: 1.5 }, });
    // arrowhead approximation
    slide.addShape(pptx.ShapeType.line, { x: x + w - 0.1, y: y - 0.06, w: 0.12, h: 0, line: { color: C.midGray, width: 1.5 }, rotate: 45 });
  } else {
    slide.addShape(pptx.ShapeType.line, { x, y, w: 0, h: w, line: { color: C.midGray, width: 1.5 }, });
  }
}

// ─── SLIDE 1: Title ───────────────────────────────────────────────────────────
{
  const s = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
  addTitleSlide(s,
    'API Authorization &\nData Filtering\nArchitecture',
    'Permit.io Integration Strategy for B2B Commerce'
  );
}

// ─── SLIDE 2: Executive Summary ───────────────────────────────────────────────
{
  const s = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
  slideHeader(s, 'Executive Summary', 'Architecture decision: What role should Permit.io play?');

  s.addText('The Central Question', {
    x: 0.4, y: 1.0, w: 12, h: 0.35,
    fontSize: 13, bold: true, color: C.red, fontFace: 'Calibri',
  });
  s.addText('Should Permit.io act only as an authorization engine, or should it also act as a retrieval layer for business attributes (e.g., Account-to-Sales Org mappings) used for downstream data filtering?', {
    x: 0.4, y: 1.35, w: 12.2, h: 0.65,
    fontSize: 11, color: C.charcoal, fontFace: 'Calibri', wrap: true,
  });

  // Three option boxes
  const opts = [
    { label: 'OPTION 1', title: 'Authorization\nEngine Only', sub: 'Recommended', color: C.red, tc: C.white },
    { label: 'OPTION 2', title: 'Authorization +\nBusiness Context', sub: 'Higher Complexity', color: C.charcoal, tc: C.white },
    { label: 'OPTION 3', title: 'Hybrid\nArchitecture', sub: 'Middle Ground', color: C.darkGray, tc: C.white },
  ];
  opts.forEach((o, i) => {
    const x = 0.4 + i * 4.2;
    s.addShape(pptx.ShapeType.rect, { x, y: 2.2, w: 3.9, h: 2.2, fill: { color: o.color }, line: { color: o.color, width: 0 } });
    s.addText(o.label, { x, y: 2.3, w: 3.9, h: 0.3, fontSize: 8, bold: true, color: 'AAAAAA', fontFace: 'Calibri', align: 'center', charSpacing: 3 });
    s.addText(o.title, { x, y: 2.6, w: 3.9, h: 0.9, fontSize: 16, bold: true, color: o.tc, fontFace: 'Calibri', align: 'center', valign: 'middle', wrap: true });
    s.addText(o.sub, { x, y: 3.7, w: 3.9, h: 0.4, fontSize: 9, color: i === 0 ? 'FFCCCC' : C.lightGray, fontFace: 'Calibri', align: 'center', italic: true });
    if (i === 0) {
      s.addShape(pptx.ShapeType.rect, { x, y: 4.4, w: 3.9, h: 0.25, fill: { color: 'AA0000' } });
      s.addText('★  RECOMMENDED', { x, y: 4.4, w: 3.9, h: 0.25, fontSize: 8, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', charSpacing: 2 });
    }
  });

  s.addText('Key Recommendation', {
    x: 0.4, y: 4.85, w: 12, h: 0.3,
    fontSize: 12, bold: true, color: C.charcoal, fontFace: 'Calibri',
  });
  const keyPoints = [
    'Oracle / MDM remains the authoritative source for all business data (accounts, sales orgs, entitlements)',
    'Permit.io focuses exclusively on authorization decisions: roles, permissions, and policies',
    'Separating authorization from business data minimizes duplication, synchronization risk, and operational overhead',
  ];
  keyPoints.forEach((pt, i) => {
    s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 5.2 + i * 0.38, w: 0.05, h: 0.22, fill: { color: C.red } });
    s.addText(pt, { x: 0.6, y: 5.2 + i * 0.38, w: 12, h: 0.28, fontSize: 10, color: C.charcoal, fontFace: 'Calibri', wrap: true });
  });
}

// ─── SLIDE 3: Business Context ────────────────────────────────────────────────
{
  const s = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
  slideHeader(s, 'Business Context', 'B2B Commerce – Multi-account, multi-Sales Org environment');

  // User card
  s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.1, w: 2.8, h: 3.8, fill: { color: C.charcoal }, line: { color: C.charcoal } });
  s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.1, w: 2.8, h: 0.35, fill: { color: C.red } });
  s.addText('USER', { x: 0.4, y: 1.1, w: 2.8, h: 0.35, fontSize: 9, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', charSpacing: 3 });
  s.addText('Ryan', { x: 0.4, y: 1.55, w: 2.8, h: 0.5, fontSize: 22, bold: true, color: C.white, fontFace: 'Calibri', align: 'center' });
  s.addText('B2B Buyer', { x: 0.4, y: 2.0, w: 2.8, h: 0.3, fontSize: 10, color: C.lightGray, fontFace: 'Calibri', align: 'center', italic: true });
  s.addShape(pptx.ShapeType.line, { x: 0.6, y: 2.4, w: 2.4, h: 0, line: { color: '555555', width: 0.5 } });
  s.addText('Associated Accounts:', { x: 0.5, y: 2.55, w: 2.6, h: 0.3, fontSize: 9, color: C.lightGray, fontFace: 'Calibri', align: 'center' });
  s.addText('• Tesla\n• Siemens', { x: 0.5, y: 2.85, w: 2.6, h: 0.7, fontSize: 11, color: C.white, fontFace: 'Calibri', align: 'center', wrap: true });

  // Arrow right
  s.addShape(pptx.ShapeType.line, { x: 3.3, y: 3.05, w: 0.5, h: 0, line: { color: C.red, width: 2 } });
  s.addText('Selects', { x: 3.2, y: 2.8, w: 0.8, h: 0.25, fontSize: 8, color: C.midGray, fontFace: 'Calibri', align: 'center' });

  // Account cards
  const accounts = [
    { name: 'Tesla', salesOrg: '1000', y: 1.1 },
    { name: 'Siemens', salesOrg: '2000', y: 3.3 },
  ];
  accounts.forEach((acc) => {
    s.addShape(pptx.ShapeType.rect, { x: 3.9, y: acc.y, w: 3.0, h: 1.8, fill: { color: C.offWhite }, line: { color: C.lightGray, width: 1 } });
    s.addShape(pptx.ShapeType.rect, { x: 3.9, y: acc.y, w: 3.0, h: 0.32, fill: { color: C.charcoal } });
    s.addText('CUSTOMER ACCOUNT', { x: 3.9, y: acc.y, w: 3.0, h: 0.32, fontSize: 8, bold: true, color: C.lightGray, fontFace: 'Calibri', align: 'center', charSpacing: 2 });
    s.addText(acc.name, { x: 3.9, y: acc.y + 0.4, w: 3.0, h: 0.5, fontSize: 20, bold: true, color: C.charcoal, fontFace: 'Calibri', align: 'center' });
    s.addShape(pptx.ShapeType.line, { x: 4.1, y: acc.y + 1.0, w: 2.6, h: 0, line: { color: C.lightGray, width: 0.5 } });
    s.addText('Sales Org:', { x: 4.0, y: acc.y + 1.1, w: 1.3, h: 0.3, fontSize: 9, color: C.midGray, fontFace: 'Calibri' });
    s.addText(acc.salesOrg, { x: 5.3, y: acc.y + 1.1, w: 1.4, h: 0.3, fontSize: 14, bold: true, color: C.red, fontFace: 'Calibri', align: 'right' });
  });

  // Arrow to impact
  s.addShape(pptx.ShapeType.line, { x: 7.05, y: 3.05, w: 0.5, h: 0, line: { color: C.red, width: 2 } });
  s.addText('Drives', { x: 6.95, y: 2.8, w: 0.7, h: 0.25, fontSize: 8, color: C.midGray, fontFace: 'Calibri', align: 'center' });

  // Impact panel
  s.addShape(pptx.ShapeType.rect, { x: 7.6, y: 1.1, w: 5.0, h: 4.0, fill: { color: C.offWhite }, line: { color: C.lightGray, width: 1 } });
  s.addShape(pptx.ShapeType.rect, { x: 7.6, y: 1.1, w: 5.0, h: 0.32, fill: { color: C.red } });
  s.addText('ACTIVE ACCOUNT DRIVES CONTEXT', { x: 7.6, y: 1.1, w: 5.0, h: 0.32, fontSize: 8, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', charSpacing: 1 });

  const impacts = [
    { icon: '◈', label: 'Product Visibility', detail: 'Filtered by Sales Org' },
    { icon: '◈', label: 'Order History', detail: 'Filtered by Account' },
    { icon: '◈', label: 'Pricing', detail: 'Filtered by Account' },
    { icon: '◈', label: 'Quotes', detail: 'Filtered by Account' },
    { icon: '◈', label: 'Invoice Access', detail: 'Filtered by Account' },
  ];
  impacts.forEach((imp, i) => {
    s.addShape(pptx.ShapeType.rect, { x: 7.75, y: 1.6 + i * 0.62, w: 4.7, h: 0.52, fill: { color: C.white }, line: { color: C.lightGray, width: 0.5 } });
    s.addShape(pptx.ShapeType.rect, { x: 7.75, y: 1.6 + i * 0.62, w: 0.08, h: 0.52, fill: { color: C.red } });
    s.addText(imp.label, { x: 7.95, y: 1.62 + i * 0.62, w: 2.8, h: 0.28, fontSize: 10, bold: true, color: C.charcoal, fontFace: 'Calibri' });
    s.addText(imp.detail, { x: 7.95, y: 1.9 + i * 0.62, w: 4.3, h: 0.22, fontSize: 8.5, color: C.midGray, fontFace: 'Calibri', italic: true });
  });

  s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 5.15, w: 12.2, h: 0.5, fill: { color: C.redLight }, line: { color: 'FFAAAA', width: 0.5 } });
  s.addText('Key Insight:  Ryan\'s selected account becomes the active business context for ALL downstream API calls and data filtering.', {
    x: 0.55, y: 5.15, w: 12, h: 0.5, fontSize: 10, color: C.charcoal, fontFace: 'Calibri', valign: 'middle', bold: false,
  });
}

// ─── SLIDE 4: Problem Statement ───────────────────────────────────────────────
{
  const s = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
  slideHeader(s, 'Problem Statement', 'The proposed requirement and the architectural question it raises');

  s.addText('Proposed Requirement', { x: 0.4, y: 1.05, w: 12, h: 0.32, fontSize: 13, bold: true, color: C.charcoal, fontFace: 'Calibri' });

  // Requirement box
  s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.42, w: 5.8, h: 3.0, fill: { color: C.offWhite }, line: { color: C.lightGray, width: 1 } });
  s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.42, w: 5.8, h: 0.3, fill: { color: C.charcoal } });
  s.addText('WHEN PRODUCT API IS CALLED:', { x: 0.4, y: 1.42, w: 5.8, h: 0.3, fontSize: 9, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', charSpacing: 2 });

  const steps = [
    '1.  Call Permit.io',
    '2.  Retrieve filtering attributes',
    '3.  Obtain Sales Org information',
    '4.  Pass Sales Org into Product API',
    '5.  Return only authorized products',
  ];
  steps.forEach((step, i) => {
    s.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.82 + i * 0.47, w: 5.6, h: 0.4, fill: { color: i % 2 === 0 ? C.white : C.offWhite }, line: { color: 'E0E0E0', width: 0.3 } });
    s.addText(step, { x: 0.65, y: 1.82 + i * 0.47, w: 5.4, h: 0.4, fontSize: 10.5, color: C.charcoal, fontFace: 'Calibri', valign: 'middle' });
  });

  // Conceptual flow
  s.addText('Conceptual Flow:', { x: 0.4, y: 4.6, w: 5.8, h: 0.3, fontSize: 10, bold: true, color: C.midGray, fontFace: 'Calibri' });
  const flowItems = ['User', 'Permit.io', 'Sales Org', 'Product API', 'Filtered\nProducts'];
  const flowColors = [C.charcoal, C.red, C.charcoal, C.darkGray, '2E7D32'];
  flowItems.forEach((item, i) => {
    s.addShape(pptx.ShapeType.rect, { x: 0.4 + i * 1.12, y: 4.95, w: 0.95, h: 0.65, fill: { color: flowColors[i] }, line: { color: flowColors[i] } });
    s.addText(item, { x: 0.4 + i * 1.12, y: 4.95, w: 0.95, h: 0.65, fontSize: 8.5, color: C.white, fontFace: 'Calibri', align: 'center', valign: 'middle', wrap: true });
    if (i < 4) {
      s.addText('→', { x: 1.3 + i * 1.12, y: 4.95, w: 0.17, h: 0.65, fontSize: 14, color: C.midGray, fontFace: 'Calibri', align: 'center', valign: 'middle' });
    }
  });

  // Question panel
  s.addShape(pptx.ShapeType.rect, { x: 6.6, y: 1.42, w: 6.0, h: 4.3, fill: { color: C.charcoal }, line: { color: C.charcoal } });
  s.addShape(pptx.ShapeType.rect, { x: 6.6, y: 1.42, w: 0.1, h: 4.3, fill: { color: C.red } });
  s.addText('THE ARCHITECTURAL QUESTION', { x: 6.75, y: 1.55, w: 5.7, h: 0.3, fontSize: 9, bold: true, color: C.red, fontFace: 'Calibri', charSpacing: 2 });
  s.addText('Should Permit.io be used as the retrieval layer for business attributes like Sales Org?', {
    x: 6.75, y: 1.95, w: 5.7, h: 0.85, fontSize: 13, bold: true, color: C.white, fontFace: 'Calibri', wrap: true,
  });
  s.addShape(pptx.ShapeType.line, { x: 6.75, y: 2.88, w: 5.5, h: 0, line: { color: '555555', width: 0.5 } });
  s.addText('This question touches on:', { x: 6.75, y: 3.0, w: 5.7, h: 0.3, fontSize: 10, color: C.lightGray, fontFace: 'Calibri', italic: true });

  const concerns = ['Data ownership boundaries', 'Authorization vs. business data responsibilities', 'Scalability at enterprise scale', 'Synchronization and operational overhead', 'Long-term maintainability'];
  concerns.forEach((c, i) => {
    s.addShape(pptx.ShapeType.rect, { x: 6.75, y: 3.38 + i * 0.44, w: 0.06, h: 0.28, fill: { color: C.red } });
    s.addText(c, { x: 6.9, y: 3.4 + i * 0.44, w: 5.5, h: 0.28, fontSize: 10, color: C.lightGray, fontFace: 'Calibri' });
  });
}

// ─── SLIDE 5: Understanding Permit.io ────────────────────────────────────────
{
  const s = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
  slideHeader(s, 'Understanding the Role of Permit.io', 'What authorization platforms are designed to do — and what they are not');

  // What Permit IS
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 1.05, w: 5.9, h: 0.32, fill: { color: C.charcoal } });
  s.addText('WHAT PERMIT.IO IS', { x: 0.35, y: 1.05, w: 5.9, h: 0.32, fontSize: 9, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', charSpacing: 3 });

  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 1.37, w: 5.9, h: 4.7, fill: { color: C.offWhite }, line: { color: C.lightGray, width: 1 } });

  const permitIs = [
    { label: 'RBAC', detail: 'Role-Based Access Control' },
    { label: 'ABAC', detail: 'Attribute-Based Access Control' },
    { label: 'Policy Management', detail: 'Define and manage authorization policies' },
    { label: 'Permission Evaluation', detail: 'Evaluate user permissions at runtime' },
    { label: 'Authorization Decisions', detail: 'Return ALLOW or DENY decisions' },
    { label: 'Multi-tenant Support', detail: 'Tenant-scoped permission management' },
  ];
  permitIs.forEach((item, i) => {
    const bg = i % 2 === 0 ? C.white : C.offWhite;
    s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.42 + i * 0.68, w: 5.8, h: 0.62, fill: { color: bg }, line: { color: 'E5E5E5', width: 0.3 } });
    s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.42 + i * 0.68, w: 0.08, h: 0.62, fill: { color: '2E7D32' } });
    s.addText('✓', { x: 0.52, y: 1.42 + i * 0.68, w: 0.28, h: 0.62, fontSize: 12, color: '2E7D32', fontFace: 'Calibri', align: 'center', valign: 'middle' });
    s.addText(item.label, { x: 0.85, y: 1.47 + i * 0.68, w: 5.1, h: 0.25, fontSize: 11, bold: true, color: C.charcoal, fontFace: 'Calibri' });
    s.addText(item.detail, { x: 0.85, y: 1.72 + i * 0.68, w: 5.1, h: 0.22, fontSize: 9, color: C.midGray, fontFace: 'Calibri', italic: true });
  });

  // What Permit IS NOT
  s.addShape(pptx.ShapeType.rect, { x: 6.7, y: 1.05, w: 5.9, h: 0.32, fill: { color: C.red } });
  s.addText('WHAT PERMIT.IO IS NOT DESIGNED TO BE', { x: 6.7, y: 1.05, w: 5.9, h: 0.32, fontSize: 9, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', charSpacing: 1 });

  s.addShape(pptx.ShapeType.rect, { x: 6.7, y: 1.37, w: 5.9, h: 4.7, fill: { color: C.offWhite }, line: { color: C.lightGray, width: 1 } });

  const permitIsNot = [
    { label: 'Customer Master / MDM', detail: 'Oracle, SAP are authoritative sources' },
    { label: 'ERP System', detail: 'Business transactions & hierarchies' },
    { label: 'Product Repository', detail: 'Product catalog and entitlements' },
    { label: 'Pricing Repository', detail: 'Contract pricing, tier pricing' },
    { label: 'Customer Hierarchy Store', detail: 'Account relationships & org structures' },
    { label: 'CRM System', detail: 'Account-to-Sales Org mappings' },
  ];
  permitIsNot.forEach((item, i) => {
    const bg = i % 2 === 0 ? C.white : C.offWhite;
    s.addShape(pptx.ShapeType.rect, { x: 6.75, y: 1.42 + i * 0.68, w: 5.8, h: 0.62, fill: { color: bg }, line: { color: 'E5E5E5', width: 0.3 } });
    s.addShape(pptx.ShapeType.rect, { x: 6.75, y: 1.42 + i * 0.68, w: 0.08, h: 0.62, fill: { color: C.red } });
    s.addText('✗', { x: 6.87, y: 1.42 + i * 0.68, w: 0.28, h: 0.62, fontSize: 12, color: C.red, fontFace: 'Calibri', align: 'center', valign: 'middle' });
    s.addText(item.label, { x: 7.18, y: 1.47 + i * 0.68, w: 5.1, h: 0.25, fontSize: 11, bold: true, color: C.charcoal, fontFace: 'Calibri' });
    s.addText(item.detail, { x: 7.18, y: 1.72 + i * 0.68, w: 5.1, h: 0.22, fontSize: 9, color: C.midGray, fontFace: 'Calibri', italic: true });
  });

  // Bottom principle
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 6.18, w: 12.25, h: 0.65, fill: { color: C.charcoal }, line: { color: C.charcoal } });
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 6.18, w: 0.1, h: 0.65, fill: { color: C.red } });
  s.addText('Principle:  Authorization systems should authorize.  Master data systems should own business data.', {
    x: 0.55, y: 6.18, w: 12, h: 0.65, fontSize: 11, bold: true, color: C.white, fontFace: 'Calibri', valign: 'middle', italic: true,
  });
}

// ─── SLIDE 6: Option 1 – Authorization Engine Only ────────────────────────────
{
  const s = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
  slideHeader(s, 'Option 1 – Permit as Authorization Engine Only', 'Recommended approach: Clear separation of concerns');

  // Permit stores
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 1.05, w: 5.7, h: 0.32, fill: { color: C.red } });
  s.addText('PERMIT.IO STORES', { x: 0.35, y: 1.05, w: 5.7, h: 0.32, fontSize: 9, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', charSpacing: 3 });
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 1.37, w: 5.7, h: 2.7, fill: { color: C.offWhite }, line: { color: C.lightGray, width: 1 } });

  const permitStores = [
    'Roles  (Buyer, Admin, Sales Rep)',
    'Permissions  (view products, create orders)',
    'Policies  (Buyers can view products)',
    'Authorization Rules  (RBAC / ABAC)',
  ];
  permitStores.forEach((item, i) => {
    s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.42 + i * 0.6, w: 5.6, h: 0.52, fill: { color: i % 2 === 0 ? C.white : C.offWhite }, line: { color: 'E5E5E5', width: 0.3 } });
    s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.42 + i * 0.6, w: 0.08, h: 0.52, fill: { color: C.red } });
    s.addText(item, { x: 0.58, y: 1.47 + i * 0.6, w: 5.4, h: 0.42, fontSize: 10.5, color: C.charcoal, fontFace: 'Calibri', valign: 'middle' });
  });

  // Example
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 4.2, w: 5.7, h: 0.3, fill: { color: C.charcoal } });
  s.addText('EXAMPLE', { x: 0.35, y: 4.2, w: 5.7, h: 0.3, fontSize: 9, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', charSpacing: 2 });
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 4.5, w: 5.7, h: 1.85, fill: { color: C.charcoal }, line: { color: C.charcoal } });
  s.addText('Ryan   →   Role = Buyer\n\nPermissions:\n  • View Products\n  • Create Orders\n  • View Pricing', {
    x: 0.55, y: 4.6, w: 5.3, h: 1.65, fontSize: 10, color: C.lightGray, fontFace: 'Courier New', wrap: true, valign: 'top',
  });

  // Oracle/MDM stores
  s.addShape(pptx.ShapeType.rect, { x: 6.6, y: 1.05, w: 6.0, h: 0.32, fill: { color: C.charcoal } });
  s.addText('ORACLE / MDM STORES', { x: 6.6, y: 1.05, w: 6.0, h: 0.32, fontSize: 9, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', charSpacing: 3 });
  s.addShape(pptx.ShapeType.rect, { x: 6.6, y: 1.37, w: 6.0, h: 2.7, fill: { color: C.offWhite }, line: { color: C.lightGray, width: 1 } });

  const oracleStores = [
    'User-Account Relationships',
    'Customer Accounts & Hierarchies',
    'Sales Organizations',
    'Product Entitlements & Pricing',
    'Divisions, Regions',
  ];
  oracleStores.forEach((item, i) => {
    s.addShape(pptx.ShapeType.rect, { x: 6.65, y: 1.42 + i * 0.5, w: 5.9, h: 0.44, fill: { color: i % 2 === 0 ? C.white : C.offWhite }, line: { color: 'E5E5E5', width: 0.3 } });
    s.addShape(pptx.ShapeType.rect, { x: 6.65, y: 1.42 + i * 0.5, w: 0.08, h: 0.44, fill: { color: C.charcoal } });
    s.addText(item, { x: 6.82, y: 1.46 + i * 0.5, w: 5.7, h: 0.36, fontSize: 10.5, color: C.charcoal, fontFace: 'Calibri', valign: 'middle' });
  });

  s.addShape(pptx.ShapeType.rect, { x: 6.6, y: 4.2, w: 6.0, h: 0.3, fill: { color: C.charcoal } });
  s.addText('EXAMPLE', { x: 6.6, y: 4.2, w: 6.0, h: 0.3, fontSize: 9, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', charSpacing: 2 });
  s.addShape(pptx.ShapeType.rect, { x: 6.6, y: 4.5, w: 6.0, h: 1.85, fill: { color: C.charcoal }, line: { color: C.charcoal } });
  s.addText('Ryan  →  Tesla\nRyan  →  Siemens\n\nTesla   →  Sales Org 1000\nSiemens →  Sales Org 2000', {
    x: 6.8, y: 4.6, w: 5.7, h: 1.65, fontSize: 10, color: C.lightGray, fontFace: 'Courier New', wrap: true, valign: 'top',
  });

  // Key observation
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 6.45, w: 12.25, h: 0.55, fill: { color: C.redLight }, line: { color: 'FFAAAA', width: 0.5 } });
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 6.45, w: 0.1, h: 0.55, fill: { color: C.red } });
  s.addText('Key Observation:  Permit never returns the Sales Org.  Permit returns only ALLOW or DENY.  The Sales Org comes from the authoritative business system.', {
    x: 0.55, y: 6.45, w: 12, h: 0.55, fontSize: 10, color: C.charcoal, fontFace: 'Calibri', valign: 'middle', wrap: true,
  });
}

// ─── SLIDE 7: Runtime Flow Diagram ────────────────────────────────────────────
{
  const s = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
  slideHeader(s, 'Runtime Flow – Option 1 (Recommended)', 'Ryan selects Tesla → only Tesla products returned via Sales Org 1000');

  // Flow steps as vertical swimlane
  const steps7 = [
    { num: '1', actor: 'Frontend', action: 'Ryan selects Tesla account', note: 'AccountId = TESLA', color: C.charcoal },
    { num: '2', actor: 'Frontend → Backend', action: 'Request includes AccountId = TESLA', note: 'HTTP Header / Body', color: C.darkGray },
    { num: '3', actor: 'Backend → Oracle/MDM', action: 'Retrieve account context', note: 'Tesla → Sales Org = 1000', color: C.midGray },
    { num: '4', actor: 'Backend → Permit.io', action: 'Can Ryan view products?', note: 'Permit evaluates: Role=Buyer → ALLOW', color: C.red },
    { num: '5', actor: 'Backend → Product DB', action: 'Execute filtered query', note: 'WHERE SALES_ORG = \'1000\'', color: '1B5E20' },
    { num: '6', actor: 'Response', action: 'Return authorized products only', note: 'Tesla product catalog', color: '2E7D32' },
  ];

  steps7.forEach((step, i) => {
    const row = i < 3 ? i : i;
    const x = 0.35;
    const y = 1.1 + i * 0.99;
    const w = 12.25;
    const h = 0.88;

    s.addShape(pptx.ShapeType.rect, { x, y, w: 0.55, h, fill: { color: step.color }, line: { color: step.color } });
    s.addText(step.num, { x, y, w: 0.55, h, fontSize: 16, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', valign: 'middle' });

    s.addShape(pptx.ShapeType.rect, { x: 0.9, y, w: 2.0, h, fill: { color: C.offWhite }, line: { color: C.lightGray, width: 0.5 } });
    s.addText(step.actor, { x: 0.92, y, w: 1.96, h, fontSize: 8.5, bold: true, color: C.charcoal, fontFace: 'Calibri', align: 'center', valign: 'middle', wrap: true });

    s.addShape(pptx.ShapeType.rect, { x: 2.92, y, w: 5.8, h, fill: { color: C.white }, line: { color: C.lightGray, width: 0.5 } });
    s.addShape(pptx.ShapeType.rect, { x: 2.92, y, w: 0.07, h, fill: { color: step.color } });
    s.addText(step.action, { x: 3.05, y: y + 0.05, w: 5.6, h: 0.45, fontSize: 11.5, bold: true, color: C.charcoal, fontFace: 'Calibri', valign: 'middle' });
    s.addText(step.note, { x: 3.05, y: y + 0.5, w: 5.6, h: 0.32, fontSize: 9, color: C.midGray, fontFace: 'Calibri', italic: true });

    // result pill
    s.addShape(pptx.ShapeType.rect, { x: 8.78, y: y + 0.14, w: 3.8, h: 0.6, fill: { color: step.num === '4' ? C.redLight : C.offWhite }, line: { color: C.lightGray, width: 0.5 }, rectRadius: 0.05 });
    if (step.num === '4') {
      s.addText('→  ALLOW', { x: 8.82, y: y + 0.14, w: 3.75, h: 0.6, fontSize: 13, bold: true, color: '2E7D32', fontFace: 'Calibri', align: 'center', valign: 'middle' });
    } else {
      s.addText(step.note, { x: 8.82, y: y + 0.14, w: 3.72, h: 0.6, fontSize: 9, color: C.midGray, fontFace: 'Calibri', align: 'center', valign: 'middle', italic: true, wrap: true });
    }
  });
}

// ─── SLIDE 8: Option 2 ────────────────────────────────────────────────────────
{
  const s = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
  slideHeader(s, 'Option 2 – Permit as Authorization + Business Context Store', 'The alternative approach: Permit as a retrieval layer for filtering attributes');

  // Flow diagram top
  const flowBoxes = ['User', 'Permit.io', 'Sales Org', 'Product API', 'Filtered\nProducts'];
  const flowColors2 = [C.charcoal, C.red, C.charcoal, C.darkGray, '1B5E20'];
  flowBoxes.forEach((label, i) => {
    s.addShape(pptx.ShapeType.rect, { x: 0.5 + i * 2.48, y: 1.05, w: 2.1, h: 0.8, fill: { color: flowColors2[i] }, line: { color: flowColors2[i] } });
    s.addText(label, { x: 0.5 + i * 2.48, y: 1.05, w: 2.1, h: 0.8, fontSize: 11, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', valign: 'middle', wrap: true });
    if (i < 4) {
      s.addText('→', { x: 2.55 + i * 2.48, y: 1.05, w: 0.43, h: 0.8, fontSize: 18, color: C.midGray, fontFace: 'Calibri', align: 'center', valign: 'middle' });
    }
  });

  // Permit payload example
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 2.1, w: 5.8, h: 0.3, fill: { color: C.red } });
  s.addText('PERMIT STORES BUSINESS CONTEXT', { x: 0.35, y: 2.1, w: 5.8, h: 0.3, fontSize: 9, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', charSpacing: 2 });
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 2.4, w: 5.8, h: 2.4, fill: { color: C.charcoal }, line: { color: C.charcoal } });
  s.addText('{\n  "accounts": [\n    {\n      "accountId": "TESLA",\n      "salesOrg": "1000"\n    },\n    {\n      "accountId": "SIEMENS",\n      "salesOrg": "2000"\n    }\n  ]\n}', {
    x: 0.55, y: 2.5, w: 5.4, h: 2.2, fontSize: 9.5, color: 'A8D8A8', fontFace: 'Courier New', wrap: false, valign: 'top',
  });

  // Advantages
  s.addShape(pptx.ShapeType.rect, { x: 6.6, y: 2.1, w: 2.75, h: 0.3, fill: { color: '2E7D32' } });
  s.addText('ADVANTAGES', { x: 6.6, y: 2.1, w: 2.75, h: 0.3, fontSize: 9, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', charSpacing: 2 });
  s.addShape(pptx.ShapeType.rect, { x: 6.6, y: 2.4, w: 2.75, h: 2.4, fill: { color: C.offWhite }, line: { color: C.lightGray, width: 0.5 } });
  const advs = ['Simpler API flow', 'Single lookup call', 'Easier data filtering', 'Direct filtering from Permit', 'Faster developer experience'];
  advs.forEach((a, i) => {
    s.addText(`✓  ${a}`, { x: 6.7, y: 2.48 + i * 0.42, w: 2.6, h: 0.38, fontSize: 9.5, color: '2E7D32', fontFace: 'Calibri' });
  });

  // Challenges
  s.addShape(pptx.ShapeType.rect, { x: 9.65, y: 2.1, w: 2.95, h: 0.3, fill: { color: C.red } });
  s.addText('CHALLENGES', { x: 9.65, y: 2.1, w: 2.95, h: 0.3, fontSize: 9, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', charSpacing: 2 });
  s.addShape(pptx.ShapeType.rect, { x: 9.65, y: 2.4, w: 2.95, h: 2.4, fill: { color: C.offWhite }, line: { color: C.lightGray, width: 0.5 } });
  const chals = ['Data exists in two places', 'Synchronization required', 'Data ownership confusion', 'Potential stale data', 'Operational overhead'];
  chals.forEach((c, i) => {
    s.addText(`✗  ${c}`, { x: 9.75, y: 2.48 + i * 0.42, w: 2.8, h: 0.38, fontSize: 9.5, color: C.red, fontFace: 'Calibri' });
  });

  // Example scenario
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 4.95, w: 12.25, h: 0.3, fill: { color: C.charcoal } });
  s.addText('SYNCHRONIZATION RISK EXAMPLE', { x: 0.35, y: 4.95, w: 12.25, h: 0.3, fontSize: 9, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', charSpacing: 2 });
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 5.25, w: 12.25, h: 1.0, fill: { color: C.redLight }, line: { color: 'FFAAAA', width: 1 } });

  const syncSteps = ['Tesla Sales Org changes\n1000  →  1500', 'Oracle must be\nupdated', 'Permit must also\nbe updated', 'If sync fails:\nstale data returned', 'Wrong products\nshown to user'];
  const syncColors = [C.charcoal, C.darkGray, C.red, 'B71C1C', 'C62828'];
  syncSteps.forEach((step, i) => {
    s.addShape(pptx.ShapeType.rect, { x: 0.5 + i * 2.4, y: 5.35, w: 2.1, h: 0.72, fill: { color: syncColors[i] }, line: { color: syncColors[i] } });
    s.addText(step, { x: 0.5 + i * 2.4, y: 5.35, w: 2.1, h: 0.72, fontSize: 8.5, color: C.white, fontFace: 'Calibri', align: 'center', valign: 'middle', wrap: true });
    if (i < 4) {
      s.addText('→', { x: 2.55 + i * 2.4, y: 5.35, w: 0.35, h: 0.72, fontSize: 14, color: C.red, fontFace: 'Calibri', align: 'center', valign: 'middle' });
    }
  });

  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 6.38, w: 12.25, h: 0.5, fill: { color: C.charcoal }, line: { color: C.charcoal } });
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 6.38, w: 0.1, h: 0.5, fill: { color: C.red } });
  s.addText('This architecture is viable, but it means Permit.io becomes a secondary synchronized repository for business metadata in addition to being an authorization platform.', {
    x: 0.55, y: 6.38, w: 12, h: 0.5, fontSize: 9.5, color: C.lightGray, fontFace: 'Calibri', valign: 'middle', italic: true, wrap: true,
  });
}

// ─── SLIDE 9: Comparison Table ────────────────────────────────────────────────
{
  const s = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
  slideHeader(s, 'Architecture Comparison', 'Option 1 vs Option 2 vs Hybrid');

  const criteria = [
    'Permit.io Responsibility',
    'Business Data Ownership',
    'Data Duplication',
    'Synchronization Required',
    'Stale Data Risk',
    'Scalability (Millions of Accounts)',
    'Operational Overhead',
    'Developer Experience',
    'Long-term Maintainability',
    'Recommended for Enterprise',
  ];

  const opt1 = ['Authorization Only', 'Oracle / MDM (Single Source)', 'None', 'Not Required', 'None', 'High', 'Low', 'Moderate', 'High', '★ Yes'];
  const opt2 = ['Auth + Business Context', 'Oracle + Permit (Dual Source)', 'High', 'Required', 'Medium-High', 'Moderate', 'High', 'High', 'Low-Medium', 'No'];
  const hybrid = ['Auth + Metadata Cache', 'Oracle Primary, Permit Cache', 'Low-Medium', 'Required (Managed)', 'Low (if TTL managed)', 'High', 'Medium', 'High', 'Medium', 'Conditional'];

  // Headers
  const hdrY = 1.1;
  const cols = [
    { label: 'CRITERIA', x: 0.35, w: 3.3, bg: C.charcoal },
    { label: 'OPTION 1\nAUTH ENGINE ONLY', x: 3.7, w: 2.85, bg: C.red },
    { label: 'OPTION 2\nAUTH + BIZ CONTEXT', x: 6.6, w: 2.85, bg: C.darkGray },
    { label: 'OPTION 3\nHYBRID', x: 9.5, w: 3.1, bg: C.midGray },
  ];
  cols.forEach((col) => {
    s.addShape(pptx.ShapeType.rect, { x: col.x, y: hdrY, w: col.w, h: 0.5, fill: { color: col.bg }, line: { color: col.bg } });
    s.addText(col.label, { x: col.x, y: hdrY, w: col.w, h: 0.5, fontSize: 8, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', valign: 'middle', wrap: true });
  });

  criteria.forEach((criterion, i) => {
    const rowY = 1.65 + i * 0.49;
    const rowBg = i % 2 === 0 ? C.white : C.offWhite;
    const isLast = i === criteria.length - 1;
    const rowBgFinal = isLast ? C.redLight : rowBg;

    s.addShape(pptx.ShapeType.rect, { x: 0.35, y: rowY, w: 3.3, h: 0.46, fill: { color: rowBgFinal }, line: { color: C.lightGray, width: 0.3 } });
    s.addText(criterion, { x: 0.45, y: rowY, w: 3.1, h: 0.46, fontSize: 9, bold: isLast, color: C.charcoal, fontFace: 'Calibri', valign: 'middle' });

    // Option 1
    const o1Val = opt1[i];
    const o1Good = ['None', 'Not Required', 'High', 'Low', 'High', '★ Yes'].includes(o1Val);
    s.addShape(pptx.ShapeType.rect, { x: 3.7, y: rowY, w: 2.85, h: 0.46, fill: { color: rowBgFinal }, line: { color: C.lightGray, width: 0.3 } });
    s.addText(o1Val, { x: 3.75, y: rowY, w: 2.75, h: 0.46, fontSize: 9, bold: isLast || o1Val === '★ Yes', color: o1Val === '★ Yes' ? '1B5E20' : (o1Good ? '2E7D32' : C.charcoal), fontFace: 'Calibri', align: 'center', valign: 'middle', wrap: true });

    // Option 2
    const o2Bad = ['High', 'Required', 'Medium-High', 'Dual Source', 'High', 'Low-Medium', 'No'].some(v => opt2[i].includes(v));
    s.addShape(pptx.ShapeType.rect, { x: 6.6, y: rowY, w: 2.85, h: 0.46, fill: { color: rowBgFinal }, line: { color: C.lightGray, width: 0.3 } });
    s.addText(opt2[i], { x: 6.65, y: rowY, w: 2.75, h: 0.46, fontSize: 9, color: o2Bad ? C.red : C.charcoal, fontFace: 'Calibri', align: 'center', valign: 'middle', wrap: true });

    // Hybrid
    s.addShape(pptx.ShapeType.rect, { x: 9.5, y: rowY, w: 3.1, h: 0.46, fill: { color: rowBgFinal }, line: { color: C.lightGray, width: 0.3 } });
    s.addText(hybrid[i], { x: 9.55, y: rowY, w: 3.0, h: 0.46, fontSize: 9, color: C.charcoal, fontFace: 'Calibri', align: 'center', valign: 'middle', wrap: true });
  });
}

// ─── SLIDE 10: Scalability Considerations ────────────────────────────────────
{
  const s = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
  slideHeader(s, 'Scalability & Operational Considerations', 'Enterprise-scale factors that influence architectural choice');

  // Scale stats
  const stats = [
    { val: 'Millions', label: 'Customer Accounts\nGlobally', color: C.red },
    { val: '100K+', label: 'Users Across\nAccounts', color: C.charcoal },
    { val: 'Dynamic', label: 'Account Attribute\nChanges', color: C.darkGray },
    { val: 'Critical', label: 'Data Consistency\nRequirement', color: C.red },
  ];
  stats.forEach((stat, i) => {
    const x = 0.35 + i * 3.1;
    s.addShape(pptx.ShapeType.rect, { x, y: 1.05, w: 2.85, h: 1.3, fill: { color: stat.color }, line: { color: stat.color } });
    s.addText(stat.val, { x, y: 1.1, w: 2.85, h: 0.65, fontSize: 26, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', valign: 'middle' });
    s.addText(stat.label, { x, y: 1.75, w: 2.85, h: 0.52, fontSize: 9, color: i % 2 === 0 ? 'FFCCCC' : C.lightGray, fontFace: 'Calibri', align: 'center', wrap: true });
  });

  // Key questions
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 2.5, w: 5.9, h: 0.32, fill: { color: C.charcoal } });
  s.addText('KEY GOVERNANCE QUESTIONS', { x: 0.35, y: 2.5, w: 5.9, h: 0.32, fontSize: 9, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', charSpacing: 2 });
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 2.82, w: 5.9, h: 3.5, fill: { color: C.offWhite }, line: { color: C.lightGray, width: 0.5 } });

  const questions = [
    'How frequently do account attributes change?',
    'How frequently do user-account relationships change?',
    'What is the acceptable lag for Permit synchronization?',
    'What happens if synchronization fails?',
    'Which system is considered authoritative when conflicts exist?',
    'Who owns the synchronization pipeline and its SLA?',
  ];
  questions.forEach((q, i) => {
    s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 2.87 + i * 0.53, w: 5.8, h: 0.47, fill: { color: i % 2 === 0 ? C.white : C.offWhite }, line: { color: 'E5E5E5', width: 0.3 } });
    s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 2.87 + i * 0.53, w: 0.07, h: 0.47, fill: { color: C.red } });
    s.addText(`${i + 1}.  ${q}`, { x: 0.55, y: 2.9 + i * 0.53, w: 5.6, h: 0.42, fontSize: 9.5, color: C.charcoal, fontFace: 'Calibri', valign: 'middle', wrap: true });
  });

  // Risk matrix
  s.addShape(pptx.ShapeType.rect, { x: 6.6, y: 2.5, w: 6.0, h: 0.32, fill: { color: C.red } });
  s.addText('SYNCHRONIZATION RISK BY OPTION', { x: 6.6, y: 2.5, w: 6.0, h: 0.32, fontSize: 9, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', charSpacing: 2 });
  s.addShape(pptx.ShapeType.rect, { x: 6.6, y: 2.82, w: 6.0, h: 3.5, fill: { color: C.offWhite }, line: { color: C.lightGray, width: 0.5 } });

  const risks = [
    { opt: 'Option 1\n(Recommended)', sync: 'None Required', staleness: 'Zero Risk', ops: 'Low', riskColor: '2E7D32' },
    { opt: 'Option 2\nAuth + Biz Context', sync: 'Required', staleness: 'Medium-High Risk', ops: 'High', riskColor: C.red },
    { opt: 'Option 3\nHybrid', sync: 'Required (with TTL)', staleness: 'Low-Medium Risk', ops: 'Medium', riskColor: 'E65100' },
  ];

  // Risk table header
  const rHdrY = 2.88;
  [['OPTION', 6.65, 1.8], ['SYNC NEEDED', 8.5, 1.5], ['STALE DATA RISK', 10.05, 1.55], ['OPS OVERHEAD', 11.65, 0.88]].forEach(([label, x, w]) => {
    s.addShape(pptx.ShapeType.rect, { x, y: rHdrY, w, h: 0.35, fill: { color: C.charcoal }, line: { color: C.charcoal } });
    s.addText(label, { x, y: rHdrY, w, h: 0.35, fontSize: 7.5, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', valign: 'middle' });
  });

  risks.forEach((r, i) => {
    const ry = 3.28 + i * 0.7;
    const rbg = i % 2 === 0 ? C.white : C.offWhite;
    s.addShape(pptx.ShapeType.rect, { x: 6.65, y: ry, w: 1.8, h: 0.6, fill: { color: rbg }, line: { color: C.lightGray, width: 0.3 } });
    s.addText(r.opt, { x: 6.7, y: ry, w: 1.75, h: 0.6, fontSize: 8.5, bold: true, color: C.charcoal, fontFace: 'Calibri', align: 'center', valign: 'middle', wrap: true });

    s.addShape(pptx.ShapeType.rect, { x: 8.5, y: ry, w: 1.5, h: 0.6, fill: { color: rbg }, line: { color: C.lightGray, width: 0.3 } });
    s.addText(r.sync, { x: 8.52, y: ry, w: 1.46, h: 0.6, fontSize: 9, color: r.riskColor, fontFace: 'Calibri', align: 'center', valign: 'middle', wrap: true });

    s.addShape(pptx.ShapeType.rect, { x: 10.05, y: ry, w: 1.55, h: 0.6, fill: { color: rbg }, line: { color: C.lightGray, width: 0.3 } });
    s.addText(r.staleness, { x: 10.07, y: ry, w: 1.52, h: 0.6, fontSize: 9, color: r.riskColor, fontFace: 'Calibri', align: 'center', valign: 'middle', wrap: true });

    s.addShape(pptx.ShapeType.rect, { x: 11.65, y: ry, w: 0.88, h: 0.6, fill: { color: rbg }, line: { color: C.lightGray, width: 0.3 } });
    s.addText(r.ops, { x: 11.67, y: ry, w: 0.84, h: 0.6, fontSize: 9, color: r.riskColor, fontFace: 'Calibri', align: 'center', valign: 'middle' });
  });

  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 6.45, w: 12.25, h: 0.5, fill: { color: C.charcoal } });
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 6.45, w: 0.1, h: 0.5, fill: { color: C.red } });
  s.addText('At Honeywell scale, the synchronization and governance cost of storing business data in Permit grows significantly with account volume and change frequency.', {
    x: 0.55, y: 6.45, w: 12, h: 0.5, fontSize: 10, color: C.lightGray, fontFace: 'Calibri', valign: 'middle', italic: true, wrap: true,
  });
}

// ─── SLIDE 11: Recommendation ─────────────────────────────────────────────────
{
  const s = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
  slideHeader(s, 'Recommendation', 'Preferred architecture for Honeywell B2B Commerce');

  // Left: what each system owns
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 1.05, w: 5.9, h: 0.32, fill: { color: C.charcoal } });
  s.addText('ORACLE / MDM OWNS', { x: 0.35, y: 1.05, w: 5.9, h: 0.32, fontSize: 9, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', charSpacing: 3 });
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 1.37, w: 5.9, h: 2.5, fill: { color: C.offWhite }, line: { color: C.lightGray, width: 0.5 } });

  const oracleOwns = ['Customer Accounts', 'Sales Organizations', 'Product Entitlements', 'Pricing', 'Customer Hierarchies', 'User-Account Relationships'];
  oracleOwns.forEach((item, i) => {
    s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.42 + i * 0.38, w: 5.8, h: 0.34, fill: { color: i % 2 === 0 ? C.white : C.offWhite }, line: { color: 'E5E5E5', width: 0.3 } });
    s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.42 + i * 0.38, w: 0.07, h: 0.34, fill: { color: C.charcoal } });
    s.addText(item, { x: 0.56, y: 1.46 + i * 0.38, w: 5.6, h: 0.28, fontSize: 10, color: C.charcoal, fontFace: 'Calibri', valign: 'middle' });
  });

  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 4.0, w: 5.9, h: 0.32, fill: { color: C.red } });
  s.addText('PERMIT.IO OWNS', { x: 0.35, y: 4.0, w: 5.9, h: 0.32, fontSize: 9, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', charSpacing: 3 });
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 4.32, w: 5.9, h: 1.85, fill: { color: C.offWhite }, line: { color: C.lightGray, width: 0.5 } });

  const permitOwns = ['Roles & Role Assignments', 'Permissions', 'Authorization Policies', 'Access Decisions (ALLOW / DENY)'];
  permitOwns.forEach((item, i) => {
    s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 4.37 + i * 0.43, w: 5.8, h: 0.38, fill: { color: i % 2 === 0 ? C.white : C.offWhite }, line: { color: 'E5E5E5', width: 0.3 } });
    s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 4.37 + i * 0.43, w: 0.07, h: 0.38, fill: { color: C.red } });
    s.addText(item, { x: 0.56, y: 4.41 + i * 0.43, w: 5.6, h: 0.3, fontSize: 10, color: C.charcoal, fontFace: 'Calibri', valign: 'middle' });
  });

  // Right: recommended flow
  s.addShape(pptx.ShapeType.rect, { x: 6.6, y: 1.05, w: 6.0, h: 0.32, fill: { color: C.red } });
  s.addText('RECOMMENDED RUNTIME FLOW', { x: 6.6, y: 1.05, w: 6.0, h: 0.32, fontSize: 9, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', charSpacing: 2 });
  s.addShape(pptx.ShapeType.rect, { x: 6.6, y: 1.37, w: 6.0, h: 5.0, fill: { color: C.charcoal }, line: { color: C.charcoal } });

  const recFlow = [
    { step: '1', text: 'Ryan selects Tesla account', sub: '' },
    { step: '2', text: 'Retrieve context from Oracle/MDM', sub: 'Tesla → Sales Org = 1000' },
    { step: '3', text: 'Ask Permit.io: Can Ryan view products?', sub: 'Permit evaluates policy: Buyer can view products' },
    { step: '4', text: 'Permit returns ALLOW', sub: '' },
    { step: '5', text: 'Execute product query', sub: 'WHERE SALES_ORG = \'1000\'' },
    { step: '6', text: 'Return Tesla products only', sub: 'Filtered, authorized result set' },
  ];
  recFlow.forEach((rf, i) => {
    const ry = 1.5 + i * 0.78;
    s.addShape(pptx.ShapeType.rect, { x: 6.7, y: ry, w: 0.42, h: 0.42, fill: { color: C.red }, line: { color: C.red } });
    s.addText(rf.step, { x: 6.7, y: ry, w: 0.42, h: 0.42, fontSize: 11, bold: true, color: C.white, fontFace: 'Calibri', align: 'center', valign: 'middle' });
    s.addText(rf.text, { x: 7.18, y: ry, w: 5.25, h: 0.26, fontSize: 10.5, bold: true, color: C.white, fontFace: 'Calibri', valign: 'middle' });
    if (rf.sub) {
      s.addText(rf.sub, { x: 7.18, y: ry + 0.26, w: 5.25, h: 0.22, fontSize: 8.5, color: C.lightGray, fontFace: 'Calibri', italic: true });
    }
    if (i < recFlow.length - 1) {
      s.addShape(pptx.ShapeType.line, { x: 6.9, y: ry + 0.44, w: 0, h: 0.32, line: { color: '555555', width: 0.8 } });
    }
  });

  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 6.38, w: 12.25, h: 0.5, fill: { color: C.redLight }, line: { color: 'FFAAAA', width: 0.5 } });
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 6.38, w: 0.1, h: 0.5, fill: { color: C.red } });
  s.addText('★  This architecture aligns with enterprise best practices, keeps ownership boundaries clear, and scales effectively as Honeywell\'s customer base grows.', {
    x: 0.55, y: 6.38, w: 12, h: 0.5, fontSize: 10, bold: true, color: C.charcoal, fontFace: 'Calibri', valign: 'middle', wrap: true,
  });
}

// ─── SLIDE 12: Discussion Points ─────────────────────────────────────────────
{
  const s = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
  slideHeader(s, 'Discussion Points & Open Questions', 'Topics to resolve before finalizing architecture');

  const discussions = [
    {
      category: 'DATA OWNERSHIP',
      color: C.charcoal,
      items: [
        'Which system is designated as the authoritative source for Account-to-Sales Org mappings?',
        'Is Oracle / SAP / MDM available as an API for runtime context retrieval?',
        'What is the latency profile of retrieving account context from the authoritative system?',
      ],
    },
    {
      category: 'SYNCHRONIZATION (IF OPTION 2 OR 3)',
      color: C.red,
      items: [
        'What triggers a sync from Oracle to Permit?  Real-time event?  Scheduled batch?',
        'What is the acceptable synchronization lag?  Seconds?  Minutes?  Hours?',
        'Who is responsible for the synchronization pipeline and its SLA?',
        'What is the failure handling strategy when sync fails?',
      ],
    },
    {
      category: 'ARCHITECTURE ALIGNMENT',
      color: C.darkGray,
      items: [
        'Does Honeywell\'s enterprise architecture standards support dual-storage of business metadata?',
        'Is there an existing pattern for this type of context retrieval in other Honeywell platforms?',
        'How does this decision align with the long-term MDM / data governance strategy?',
      ],
    },
  ];

  let currentY = 1.1;
  discussions.forEach((disc) => {
    s.addShape(pptx.ShapeType.rect, { x: 0.35, y: currentY, w: 12.25, h: 0.32, fill: { color: disc.color } });
    s.addText(disc.category, { x: 0.45, y: currentY, w: 12, h: 0.32, fontSize: 9, bold: true, color: C.white, fontFace: 'Calibri', charSpacing: 2, valign: 'middle' });
    currentY += 0.32;

    disc.items.forEach((item, i) => {
      const rowH = 0.4;
      s.addShape(pptx.ShapeType.rect, { x: 0.35, y: currentY, w: 12.25, h: rowH, fill: { color: i % 2 === 0 ? C.white : C.offWhite }, line: { color: C.lightGray, width: 0.3 } });
      s.addShape(pptx.ShapeType.rect, { x: 0.35, y: currentY, w: 0.08, h: rowH, fill: { color: disc.color } });
      s.addText(`Q${i + 1}.  ${item}`, { x: 0.52, y: currentY + 0.02, w: 12, h: rowH - 0.04, fontSize: 10, color: C.charcoal, fontFace: 'Calibri', valign: 'middle', wrap: true });
      currentY += rowH;
    });
    currentY += 0.08;
  });

  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 6.42, w: 12.25, h: 0.5, fill: { color: C.charcoal }, line: { color: C.charcoal } });
  s.addShape(pptx.ShapeType.rect, { x: 0.35, y: 6.42, w: 0.1, h: 0.5, fill: { color: C.red } });
  s.addText('The key decision is not whether Permit can do it.  The key decision is whether Honeywell wants Permit to become a secondary repository for business metadata.', {
    x: 0.55, y: 6.42, w: 12, h: 0.5, fontSize: 10, bold: true, color: C.white, fontFace: 'Calibri', valign: 'middle', italic: true, wrap: true,
  });
}

// ─── Save ─────────────────────────────────────────────────────────────────────
const outputPath = './Honeywell_API_Authorization_Architecture.pptx';
await pptx.writeFile({ fileName: outputPath });
console.log(`\n✓ Presentation saved: ${outputPath}`);
