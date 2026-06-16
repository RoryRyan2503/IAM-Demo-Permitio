/**
 * generate-word-doc.mjs  –  docx v9 compatible
 * node scripts/generate-word-doc.mjs
 */

import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, ShadingType, Header, Footer,
  PageNumberElement, PageNumber,
  convertInchesToTwip, PageBreak,
} from "docx";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), "..");

const RED    = "C8102E";
const DARKBG = "1F2937";
const GREY   = "6B7280";
const WHITE  = "FFFFFF";
const BDGREY = "D1D5DB";
const CODEBG = "F3F4F6";
const SANS   = "Calibri";
const MONO   = "Courier New";
const hp = n => n * 2;

const bord  = (color = BDGREY, sz = 4) => ({ style: BorderStyle.SINGLE, size: sz, color });

function inline(raw, overrides = {}) {
  const { bold: fb = false, color: fc, size: fs } = overrides;
  const runs = [];
  const parts = raw.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ text: part.slice(2,-2), font: SANS, size: fs ?? hp(11), bold: true, color: fc }));
    } else if (part.startsWith("`") && part.endsWith("`")) {
      runs.push(new TextRun({ text: part.slice(1,-1), font: MONO, size: fs ?? hp(10), color: "991B1B" }));
    } else {
      runs.push(new TextRun({ text: part, font: SANS, size: fs ?? hp(11), bold: fb, color: fc }));
    }
  }
  return runs;
}

function spacer(b=60,a=60){ return new Paragraph({children:[],spacing:{before:b,after:a}}); }
function hrule(){ return new Paragraph({children:[],border:{bottom:bord(BDGREY,6)},spacing:{before:200,after:200}}); }
function h1(t){ return new Paragraph({children:[new TextRun({text:t,font:SANS,size:hp(16),bold:true,color:WHITE})],heading:HeadingLevel.HEADING_1,shading:{type:ShadingType.SOLID,color:DARKBG,fill:DARKBG},spacing:{before:400,after:160}}); }
function h2(t){ return new Paragraph({children:[new TextRun({text:t,font:SANS,size:hp(14),bold:true,color:RED})],heading:HeadingLevel.HEADING_2,border:{bottom:bord(RED,8)},spacing:{before:360,after:120}}); }
function h3(t){ return new Paragraph({children:[new TextRun({text:t,font:SANS,size:hp(12),bold:true,color:DARKBG})],heading:HeadingLevel.HEADING_3,spacing:{before:280,after:80}}); }
function h4(t){ return new Paragraph({children:[new TextRun({text:t,font:SANS,size:hp(11),bold:true,color:DARKBG})],heading:HeadingLevel.HEADING_4,spacing:{before:200,after:60}}); }
function bdyp(t){ return new Paragraph({children:inline(t),spacing:{before:60,after:60}}); }
function bq(t){ return new Paragraph({children:[new TextRun({text:t,font:SANS,size:hp(10),color:GREY,italics:true})],indent:{left:convertInchesToTwip(0.4)},border:{left:bord(RED,12)},spacing:{before:80,after:80}}); }
function bul(t,lv=0){ return new Paragraph({children:inline(t),bullet:{level:lv},spacing:{before:40,after:40}}); }
function coderow(t){ return new Paragraph({children:[new TextRun({text:t,font:MONO,size:hp(9),color:DARKBG})],shading:{type:ShadingType.SOLID,color:CODEBG,fill:CODEBG},indent:{left:convertInchesToTwip(0.3)},spacing:{before:0,after:0}}); }

function mdTable(lines) {
  const rows = lines
    .filter(l => !/^\|[\s\-:|]+\|$/.test(l.trim()))
    .map(l => l.trim().replace(/^\|/,"").replace(/\|$/,"").split("|").map(c=>c.trim()));
  if (!rows.length) return [];
  const colCount = Math.max(...rows.map(r=>r.length));
  const colW = Math.floor(9360/colCount);
  const tableRows = rows.map((cells,ri) => {
    const isHdr = ri===0;
    while(cells.length<colCount) cells.push("");
    return new TableRow({
      tableHeader: isHdr,
      children: cells.map(ct => new TableCell({
        shading: isHdr ? {type:ShadingType.SOLID,color:DARKBG,fill:DARKBG} : undefined,
        borders: {top:bord(),bottom:bord(),left:bord(),right:bord()},
        margins: {top:80,bottom:80,left:120,right:120},
        width: {size:colW,type:WidthType.DXA},
        children: [new Paragraph({
          children: inline(ct, isHdr ? {bold:true,color:WHITE,size:hp(10)} : {}),
          spacing:{before:40,after:40}
        })],
      })),
    });
  });
  return [new Table({rows:tableRows,width:{size:100,type:WidthType.PERCENTAGE}}), spacer(80,80)];
}

function parseMd(md) {
  const lines = md.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i];
    if (ln.startsWith("<!--") || /^---+$/.test(ln.trim())) { i++; continue; }
    const clean = s => s.replace(/^#{1,6}\s*/,"").replace(/\*\*/g,"");
    if (ln.startsWith("#### ")) { out.push(h4(clean(ln))); i++; continue; }
    if (ln.startsWith("### "))  { out.push(h3(clean(ln))); i++; continue; }
    if (ln.startsWith("## "))   { out.push(h2(clean(ln))); i++; continue; }
    if (ln.startsWith("# "))    { out.push(h1(clean(ln))); i++; continue; }
    if (ln.startsWith("```")) {
      i++;
      while (i<lines.length && !lines[i].startsWith("```")) { out.push(coderow(lines[i])); i++; }
      i++; out.push(spacer(80,80)); continue;
    }
    if (ln.startsWith("|")) {
      const tbl=[];
      while(i<lines.length && lines[i].startsWith("|")){tbl.push(lines[i]);i++;}
      out.push(...mdTable(tbl)); continue;
    }
    if (ln.startsWith("> "))  { out.push(bq(ln.replace(/^>\s*/,""))); i++; continue; }
    if (/^(\s*)[-*+]\s+/.test(ln)) { const lv=Math.floor(ln.match(/^(\s*)/)[1].length/2); out.push(bul(ln.replace(/^\s*[-*+]\s+/,""),lv)); i++; continue; }
    if (/^\d+\.\s+/.test(ln)) { out.push(bul(ln.replace(/^\d+\.\s+/,""),0)); i++; continue; }
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(ln.trim())) { out.push(hrule()); i++; continue; }
    if (!ln.trim()) { out.push(spacer()); i++; continue; }
    out.push(bdyp(ln));
    i++;
  }
  return out;
}

function cover() {
  const cpar = (text,sz,col,bold=false) => new Paragraph({children:[new TextRun({text,font:SANS,size:hp(sz),color:col,bold})],alignment:AlignmentType.CENTER,spacing:{before:60,after:60}});
  return [
    spacer(600,0),
    cpar("HONEYWELL",10,GREY),
    spacer(80,0),
    new Paragraph({children:[new TextRun({text:"IAM Proof-of-Concept",font:SANS,size:hp(30),bold:true,color:RED})],alignment:AlignmentType.CENTER,spacing:{before:60,after:40}}),
    new Paragraph({children:[new TextRun({text:"Requirements Specification Document",font:SANS,size:hp(18),color:DARKBG})],alignment:AlignmentType.CENTER,spacing:{before:40,after:160}}),
    new Paragraph({children:[],border:{bottom:bord(RED,8)},spacing:{before:40,after:160}}),
    cpar("Version 1.0   ·   June 2, 2026",11,GREY),
    cpar("Classification: Internal — Vendor Evaluation",11,RED,true),
    spacer(120,0),
    cpar("Prepared for:",10,GREY),
    cpar("IAM Architects · Solution Engineers · Vendor Pre-Sales · Business Stakeholders",10,DARKBG),
    spacer(800,0),
    new Paragraph({children:[new PageBreak()],spacing:{before:0,after:0}}),
  ];
}

async function main() {
  const mdPath  = join(ROOT,"IAM_POC_Requirements_Specification.md");
  const outPath = join(ROOT,"IAM_POC_Requirements_Specification.docx");
  const raw = readFileSync(mdPath,"utf-8");
  const cleaned = raw.replace(/^#\s+IAM[^\n]*\n/,"").replace(/^>.*\n/gm,"").trim();
  const bodyElems = parseMd(cleaned);

  const doc = new Document({
    creator:"IAM PoC Generator",
    title:"IAM PoC Requirements Specification",
    styles:{default:{document:{run:{font:SANS,size:hp(11),color:"111827"}}}},
    sections:[{
      properties:{page:{margin:{top:convertInchesToTwip(1),right:convertInchesToTwip(1),bottom:convertInchesToTwip(1),left:convertInchesToTwip(1.25)}}},
      headers:{
        default: new Header({children:[new Paragraph({children:[
          new TextRun({text:"Honeywell B2B Portal — IAM Requirements Specification",font:SANS,size:hp(9),color:GREY}),
          new TextRun({text:"   |   CONFIDENTIAL",font:SANS,size:hp(9),color:RED,bold:true}),
        ],border:{bottom:bord(BDGREY,4)},spacing:{after:80}})]})
      },
      footers:{
        default: new Footer({children:[new Paragraph({children:[
          new TextRun({text:"Version 1.0   ·   June 2, 2026   ·   Page ",font:SANS,size:hp(9),color:GREY}),
          new PageNumberElement(PageNumber.CURRENT,{font:SANS,size:hp(9)}),
          new TextRun({text:"   ·   Internal — Vendor Evaluation",font:SANS,size:hp(9),color:GREY}),
        ],alignment:AlignmentType.CENTER,border:{top:bord(BDGREY,4)},spacing:{before:80}})]})
      },
      children:[...cover(),...bodyElems],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  writeFileSync(outPath,buf);
  console.log("✅  Written: "+outPath);
  console.log("   Size: "+(buf.length/1024).toFixed(1)+" KB");
}

main().catch(err => { console.error("❌ Failed:", err.message, err.stack); process.exit(1); });
