/**
 * Database Seed Script — Standardize sales org values and add products
 *
 * Run via: node scripts/seed-products.mjs
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_KEY env vars (or uses defaults from .env.local)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Read env from .env.local manually
const envContent = readFileSync(".env.local", "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const [key, ...vals] = line.split("=");
  if (key && vals.length) envVars[key.trim()] = vals.join("=").trim();
});

const supabaseUrl = envVars["NEXT_PUBLIC_SUPABASE_URL"];
const supabaseKey = envVars["SUPABASE_SERVICE_KEY"];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Standardized sales orgs:
// BA01, BA02 — Building Automation (Red)
// PT01, PT02, PT03 — Process Technology (Green)
// PA01, PA02 — Process Automation (Blue)
// IA01, IA02 — Industrial Automation (Yellow)

const PRODUCTS = [
  // Building Automation (BA01, BA02)
  { name: "Sensepoint XCL Gas Detector", description: "Fixed point gas detector for commercial buildings with Bluetooth connectivity", price: 189900, sku: "BA-SPX-001", sales_org_id: "BA01", category: "Gas Detection" },
  { name: "T6 Pro Smart Thermostat", description: "Programmable Wi-Fi thermostat with touchscreen display and geofencing", price: 24900, sku: "BA-T6P-002", sales_org_id: "BA01", category: "Controllers" },
  { name: "CIPer Model 50 Controller", description: "Building automation controller for HVAC and lighting management", price: 459900, sku: "BA-CIP-003", sales_org_id: "BA01", category: "Controllers" },
  { name: "JADE W7220A Economizer", description: "Rooftop economizer control for energy-efficient ventilation", price: 89900, sku: "BA-JDE-004", sales_org_id: "BA02", category: "Controllers" },
  { name: "Niagara Framework N4", description: "Open IoT platform for building automation and integration", price: 1299900, sku: "BA-NF4-005", sales_org_id: "BA02", category: "Software" },
  { name: "Fire-Lite MS-9200UDLS Panel", description: "Addressable fire alarm control panel with 636 point capacity", price: 349900, sku: "BA-FLP-006", sales_org_id: "BA01", category: "Fire Panels" },

  // Process Technology (PT01, PT02, PT03)
  { name: "STT850 Temperature Transmitter", description: "SmartLine temperature transmitter with dual input and HART protocol", price: 279900, sku: "PT-STT-001", sales_org_id: "PT01", category: "Transmitters" },
  { name: "ST800 Pressure Transmitter", description: "SmartLine pressure transmitter with ceramic sensor and SIL2 certified", price: 319900, sku: "PT-ST8-002", sales_org_id: "PT01", category: "Transmitters" },
  { name: "Experion PKS DCS System", description: "Distributed control system for process automation with C300 controller", price: 8999900, sku: "PT-PKS-003", sales_org_id: "PT01", category: "DCS" },
  { name: "Uniformance PHD Historian", description: "Plant-wide data historian for process optimization and analytics", price: 4599900, sku: "PT-PHD-004", sales_org_id: "PT02", category: "Analytics" },
  { name: "Safety Manager SC Controller", description: "SIL3 safety controller for emergency shutdown and fire & gas systems", price: 1599900, sku: "PT-SMC-005", sales_org_id: "PT02", category: "Controllers" },
  { name: "Searchline Excel OPGD", description: "Open-path infrared gas detector for perimeter monitoring", price: 569900, sku: "PT-SLX-006", sales_org_id: "PT03", category: "Gas Detection" },
  { name: "XYR 6000 Wireless Transmitter", description: "ISA100 wireless field transmitter for remote monitoring", price: 389900, sku: "PT-XYR-007", sales_org_id: "PT03", category: "Transmitters" },

  // Process Automation (PA01, PA02)
  { name: "MasterLogic PLC R200", description: "High-performance PLC for process and batch automation applications", price: 2199900, sku: "PA-MLR-001", sales_org_id: "PA01", category: "Controllers" },
  { name: "SK700 Series Control Valve", description: "Globe control valve with smart positioner for precise flow control", price: 449900, sku: "PA-SK7-002", sales_org_id: "PA01", category: "Valves" },
  { name: "Maxon OVENPAK 400 Burner", description: "Industrial gas burner system for process heating applications", price: 789900, sku: "PA-OVP-003", sales_org_id: "PA01", category: "Actuators" },
  { name: "Enraf CIU 880 Gauge", description: "Servo tank gauge for high-accuracy custody transfer measurement", price: 1899900, sku: "PA-CIU-004", sales_org_id: "PA02", category: "Sensors" },
  { name: "Versatilis Actuator Series", description: "Electric multi-turn actuator for valve automation in harsh environments", price: 299900, sku: "PA-VAS-005", sales_org_id: "PA02", category: "Actuators" },

  // Industrial Automation (IA01, IA02)
  { name: "Dolphin CT60 Mobile Computer", description: "Rugged mobile computer with Android OS for warehouse automation", price: 199900, sku: "IA-DCT-001", sales_org_id: "IA01", category: "Sensors" },
  { name: "Granit 1920i Barcode Scanner", description: "Ultra-rugged full-range area imager for industrial scanning", price: 89900, sku: "IA-GBS-002", sales_org_id: "IA01", category: "Sensors" },
  { name: "Intelligrated Momentum Sorter", description: "High-speed sliding shoe sorter for distribution center automation", price: 15999900, sku: "IA-IMS-003", sales_org_id: "IA01", category: "Actuators" },
  { name: "Vocollect A730 Headset", description: "Voice-directed warehousing headset with noise-cancelling microphone", price: 59900, sku: "IA-VA7-004", sales_org_id: "IA02", category: "Sensors" },
  { name: "Forge Cybersecurity Platform", description: "OT cybersecurity monitoring and threat detection for industrial networks", price: 5999900, sku: "IA-FCP-005", sales_org_id: "IA02", category: "Software" },
];

async function main() {
  console.log("Clearing dependent tables...");
  
  // Clear in dependency order
  await supabase.from("order_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("cart_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("quote_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("sales_orgs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("quotes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("accounts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("✓ Tables cleared");

  // 1. Create accounts
  console.log("Creating accounts...");
  const ACCOUNTS = [
    { id: "001ACC001", account_name: "Honeywell International" },
    { id: "001ACC002", account_name: "Whole Foods Market" },
    { id: "001ACC003", account_name: "GreenTech Systems" },
    { id: "001ACC004", account_name: "Tesla Energy" },
    { id: "001ACC005", account_name: "Siemens AG" },
  ];
  const { error: accError } = await supabase.from("accounts").insert(ACCOUNTS);
  if (accError) {
    console.error("Failed to insert accounts:", accError);
    process.exit(1);
  }
  console.log("✓ 5 accounts created");

  // 2. Create sales_orgs
  console.log("Creating sales orgs...");
  const SALES_ORGS = [
    { id: "BA01", name: "Building Automation 01", account_id: "001ACC001" },
    { id: "BA02", name: "Building Automation 02", account_id: "001ACC001" },
    { id: "PT01", name: "Process Technology 01", account_id: "001ACC001" },
    { id: "PT02", name: "Process Technology 02", account_id: "001ACC001" },
    { id: "PT03", name: "Process Technology 03", account_id: "001ACC004" },
    { id: "PA01", name: "Process Automation 01", account_id: "001ACC002" },
    { id: "PA02", name: "Process Automation 02", account_id: "001ACC002" },
    { id: "IA01", name: "Industrial Automation 01", account_id: "001ACC003" },
    { id: "IA02", name: "Industrial Automation 02", account_id: "001ACC003" },
  ];
  const { error: orgError } = await supabase.from("sales_orgs").insert(SALES_ORGS);
  if (orgError) {
    console.error("Failed to insert sales_orgs:", orgError);
    process.exit(1);
  }
  console.log("✓ 9 sales orgs created");

  console.log(`Inserting ${PRODUCTS.length} products...`);
  const { data, error } = await supabase.from("products").insert(PRODUCTS).select("id, name, sales_org_id");
  if (error) {
    console.error("Failed to insert products:", error);
    process.exit(1);
  }

  console.log(`✓ Inserted ${data.length} products`);
  data.forEach((p) => console.log(`  ${p.sales_org_id} → ${p.name}`));
}

main();
