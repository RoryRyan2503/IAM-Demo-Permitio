-- =============================================================================
-- IAM + FGAC Commerce Demo — Seed Data (Honeywell B2B Portal)
-- =============================================================================
-- Run AFTER 001_initial.sql in Supabase SQL Editor.
--
-- Three demo personas:
--   Miguel Patel    (admin)   — all tools, BlueRock + Prime accounts
--   Carlos Johnson  (buyer)   — Order Status + Cust. Support, Prime account
--   Sarah Chen      (viewer)  — My Invoices only, GreenTech account
--
-- Three accounts:
--   001ACC001  BlueRock Holdings   — salesOrgs: 4050, 8421, 1492
--   001ACC002  Prime Enterprises   — salesOrgs: 7332, 7511
--   001ACC003  GreenTech Systems   — salesOrgs: 1001
-- =============================================================================

-- ─── USERS ──────────────────────────────────────────────────────────────────
INSERT INTO public.users (id, email, name, role, persona) VALUES
  ('user-admin',  'admin@demo.com',  'Miguel Patel',    'admin',  'general'),
  ('user-buyer',  'buyer@demo.com',  'Carlos Johnson',  'buyer',  'general'),
  ('user-viewer', 'viewer@demo.com', 'Sarah Chen',      'viewer', 'general')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

-- ─── ACCOUNTS ───────────────────────────────────────────────────────────────
INSERT INTO public.accounts (id, account_name) VALUES
  ('001ACC001', 'BlueRock Holdings'),
  ('001ACC002', 'Prime Enterprises'),
  ('001ACC003', 'GreenTech Systems')
ON CONFLICT (id) DO UPDATE SET account_name = EXCLUDED.account_name;

-- ─── USER ↔ ACCOUNT ASSOCIATIONS ────────────────────────────────────────────
INSERT INTO public.user_accounts (user_id, account_id) VALUES
  ('user-admin',  '001ACC001'),   -- Miguel → BlueRock
  ('user-admin',  '001ACC002'),   -- Miguel → Prime
  ('user-buyer',  '001ACC002'),   -- Carlos → Prime
  ('user-viewer', '001ACC003')    -- Sarah  → GreenTech
ON CONFLICT DO NOTHING;

-- ─── SALES ORGANIZATIONS ────────────────────────────────────────────────────
INSERT INTO public.sales_orgs (id, name, account_id) VALUES
  ('4050', 'Fire – UK (GBP)',             '001ACC001'),
  ('8421', 'Fire – Canada (CAD)',         '001ACC001'),
  ('1492', 'Fire – India (INR)',          '001ACC001'),
  ('PT01', 'Process Technology – US',     '001ACC001'),
  ('PT02', 'Process Technology – EU',     '001ACC001'),
  ('7332', 'HBS – US (USD)',             '001ACC002'),
  ('7511', 'HBS – Canada (CAD)',         '001ACC002'),
  ('BA01', 'Building Automation – US',    '001ACC002'),
  ('BA02', 'Building Automation – EU',    '001ACC002'),
  ('1001', 'Industrial Automation – US',  '001ACC003'),
  ('IA01', 'IA – Americas',              '001ACC003'),
  ('IA02', 'IA – EMEA',                  '001ACC003')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ─── PRODUCTS ───────────────────────────────────────────────────────────────
-- Distributed across sales orgs so each user sees different catalogs.
-- Prices in cents (e.g., 129900 = $1,299.00)

INSERT INTO public.products (id, name, description, price, sku, sales_org_id, category) VALUES
  -- BlueRock / 4050 (Fire UK)
  ('11111111-1111-1111-1111-000000000001', 'Notifier NFS2-3030 Panel',       'Intelligent fire alarm control panel, 318 points',           589900, 'FIRE-NFS2-3030', '4050', 'Fire Panels'),
  ('11111111-1111-1111-1111-000000000002', 'System Sensor 2WTA-B',           'Photoelectric smoke detector with thermal sensor',            4500, 'FIRE-2WTA-B',    '4050', 'Detectors'),
  ('11111111-1111-1111-1111-000000000003', 'Silent Knight SK-5208',          '8-zone conventional fire alarm panel',                       129900, 'FIRE-SK5208',    '4050', 'Fire Panels'),

  -- BlueRock / 8421 (Fire Canada)
  ('11111111-1111-1111-1111-000000000004', 'Gamewell-FCI E3 Series',         'Networked fire alarm system, up to 2000 devices',            899900, 'FIRE-E3-NET',    '8421', 'Fire Panels'),
  ('11111111-1111-1111-1111-000000000005', 'Farenhyt IFP-300ECS',            'Emergency communication system with voice evacuation',        449900, 'FIRE-IFP300',    '8421', 'Communication'),
  ('11111111-1111-1111-1111-000000000006', 'Notifier FSP-851T',              'Intelligent thermal detector, fixed/rate-of-rise',              6900, 'FIRE-FSP851T',   '8421', 'Detectors'),

  -- BlueRock / 1492 (Fire India)
  ('11111111-1111-1111-1111-000000000007', 'Morley-IAS ZX5Se Panel',         'Conventional 5-zone fire panel, EN54 certified',              34900, 'FIRE-ZX5SE',     '1492', 'Fire Panels'),
  ('11111111-1111-1111-1111-000000000008', 'System Sensor BEAM1224S',        'Reflected beam smoke detector, 5-100m range',                 28900, 'FIRE-BEAM1224',  '1492', 'Detectors'),

  -- Prime / 7332 (HBS US)
  ('11111111-1111-1111-1111-000000000009', 'Honeywell T6 Pro Thermostat',    'Programmable thermostat with auto changeover',                 14900, 'HBS-T6PRO',      '7332', 'HVAC'),
  ('11111111-1111-1111-1111-000000000010', 'Honeywell Home Water Leak Sensor','WiFi water leak and freeze detector',                          5900, 'HBS-WATER-01',   '7332', 'Sensors'),
  ('11111111-1111-1111-1111-000000000011', 'Resideo VISTA-20P Panel',        'Residential/commercial security system, 48 zones',             18900, 'HBS-VISTA20P',   '7332', 'Security'),
  ('11111111-1111-1111-1111-000000000012', 'Honeywell DC Motor Drive',       'Variable frequency drive, 3HP, 460V',                        249900, 'HBS-VFD-3HP',    '7332', 'Motors'),

  -- Prime / 7511 (HBS Canada)
  ('11111111-1111-1111-1111-000000000013', 'Honeywell C7189U Room Sensor',   'Remote indoor temperature sensor for thermostats',              3900, 'HBS-C7189U',     '7511', 'Sensors'),
  ('11111111-1111-1111-1111-000000000014', 'Honeywell 5800PIR-RES',          'Wireless passive infrared motion detector',                     8900, 'HBS-5800PIR',    '7511', 'Security'),

  -- GreenTech / 1001 (Industrial Automation US)
  ('11111111-1111-1111-1111-000000000015', 'Honeywell HC900 Controller',     'Hybrid process controller with Ethernet, 16 loops',           679900, 'IA-HC900',       '1001', 'Controllers'),
  ('11111111-1111-1111-1111-000000000016', 'Honeywell STT850 Transmitter',   'SmartLine temperature transmitter, HART/4-20mA',               44900, 'IA-STT850',      '1001', 'Instrumentation'),
  ('11111111-1111-1111-1111-000000000017', 'Honeywell ST3000 Pressure',      'Smart pressure transmitter, 0.04% accuracy',                   89900, 'IA-ST3000',      '1001', 'Instrumentation'),
  ('11111111-1111-1111-1111-000000000018', 'Honeywell Limitless LSXM Switch','Wireless limit switch for industrial automation',               19900, 'IA-LSXM',        '1001', 'Switches'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- NEW PRODUCTS — Industrial Automation (IA01, IA02 → GreenTech)
  -- ═══════════════════════════════════════════════════════════════════════════
  ('11111111-1111-1111-1111-000000000019', 'Experion C300 Process Controller',       'High-performance, redundant process controller engineered for Experion PKS deployments. Supports advanced regulatory and logic strategies with deterministic execution and on-process migration.', 1245000, 'IA-EXP-C300-PM',  'IA01', 'Process Controllers'),
  ('11111111-1111-1111-1111-000000000020', 'SmartLine Multivariable Transmitter',    'Multivariable smart transmitter measuring differential pressure, static pressure and process temperature with HART and FOUNDATION Fieldbus protocols.', 321000, 'IA-SMV-800',      'IA01', 'Field Instruments'),
  ('11111111-1111-1111-1111-000000000021', 'Vibration Monitoring Sensor 500',        'Battery-powered wireless triaxial vibration and temperature sensor for predictive maintenance of pumps, compressors and motors.', 118000, 'IA-RAD-VBR-500',  'IA01', 'Asset Monitoring'),
  ('11111111-1111-1111-1111-000000000022', 'Forge for Industrial Performance',       'Subscription analytics software unifying historian, alarm and KPI data across plants for performance management.', 4800000, 'IA-SW-FORGE-OPS', 'IA01', 'Industrial Software'),
  ('11111111-1111-1111-1111-000000000023', 'Commissioning Services - On-site',       'Engineering and commissioning services for control system migrations, including loop checking, FAT/SAT support and operator training.', 185000, 'IA-SVC-COMM',     'IA01', 'Services'),
  ('11111111-1111-1111-1111-000000000024', 'RTU 2020 LX Remote Terminal Unit',       'Hardened Linux RTU for oil & gas, water and pipeline SCADA. Cellular, Ethernet and serial connectivity with edge computing.', 412000, 'IA-RTU-2020-LX',  'IA02', 'SCADA'),
  ('11111111-1111-1111-1111-000000000025', 'Coriolis Flowmeter G3',                  'Coriolis mass flowmeter delivering 0.05% accuracy for custody transfer applications across hydrocarbons and chemicals.', 895000, 'IA-FLW-CORIO-G3', 'IA02', 'Field Instruments'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- NEW PRODUCTS — Building Automation (BA01, BA02 → Prime)
  -- ═══════════════════════════════════════════════════════════════════════════
  ('11111111-1111-1111-1111-000000000026', 'T7 Pro Commercial Thermostat',           'Smart commercial thermostat with BACnet/IP, occupancy sensing and remote management via Niagara framework.', 32000, 'BA-TST-T7-PRO',    'BA01', 'HVAC Controls'),
  ('11111111-1111-1111-1111-000000000027', 'VAV Controller V8',                      'DDC controller for VAV boxes with integrated differential pressure sensor and BACnet MS/TP communication.', 54000, 'BA-VAV-CTRL-V8',   'BA01', 'HVAC Controls'),
  ('11111111-1111-1111-1111-000000000028', 'NFXI Fire Alarm Panel',                  'UL-listed addressable fire alarm panel supporting up to 318 devices, voice evacuation and network configurations.', 485000, 'BA-FIRE-NFXI-3030','BA01', 'Life Safety'),
  ('11111111-1111-1111-1111-000000000029', 'Niagara N4 Supervisor License',          'Open framework supervisor license for integrating mechanical, electrical and life-safety systems across a building portfolio.', 690000, 'BA-SW-NIAGARA-N4','BA01', 'Building Software'),
  ('11111111-1111-1111-1111-000000000030', 'Pro-Watch Access Controller',            'IP-based access control panel supporting up to 4 readers, integrates with Pro-Watch enterprise security platform.', 162000, 'BA-SEC-PROWATCH', 'BA01', 'Security'),
  ('11111111-1111-1111-1111-000000000031', 'CO2 / Occupancy Sensor W900',            'Indoor air quality sensor measuring CO2, temperature, humidity and occupancy with BACnet output for DCV strategies.', 41000, 'BA-SEN-CO2-W900',  'BA02', 'HVAC Controls'),
  ('11111111-1111-1111-1111-000000000032', 'BMS Commissioning Package',              'Field commissioning services for BMS deployments including point-to-point checkout, sequence verification and turnover documentation.', 145000, 'BA-SVC-COMM-BMS','BA02', 'Services'),

  -- ═══════════════════════════════════════════════════════════════════════════
  -- NEW PRODUCTS — Process Technology (PT01, PT02 → BlueRock)
  -- ═══════════════════════════════════════════════════════════════════════════
  ('11111111-1111-1111-1111-000000000033', 'Refining Catalyst X12 (per kg)',          'Fluid catalytic cracking catalyst optimized for high residue feeds, improving propylene yield and bottoms upgrading.', 3800, 'PT-CAT-RFG-X12',      'PT01', 'Catalysts'),
  ('11111111-1111-1111-1111-000000000034', 'Molecular Sieve 13X (drum)',             'High-capacity 13X molecular sieve adsorbent for natural gas dehydration, CO2 removal and air pre-purification units.', 92000, 'PT-ADS-MOLSV-13X',   'PT01', 'Adsorbents'),
  ('11111111-1111-1111-1111-000000000035', 'CCR Platforming Process License',        'Continuous catalyst regeneration platforming process license including basic engineering design package, training and start-up support.', 125000000, 'PT-SVC-LICENSE-CCR','PT01', 'Process Licensing'),
  ('11111111-1111-1111-1111-000000000036', 'Hydrocracking Catalyst Z9 (per kg)',     'High-activity hydrocracking catalyst optimized for distillate maximization with extended cycle length and low hydrogen consumption.', 6200, 'PT-CAT-HYDRO-Z9',    'PT02', 'Catalysts'),
  ('11111111-1111-1111-1111-000000000037', 'UniSim Design Suite License',            'Steady-state and dynamic process simulation software for refining, gas processing and petrochemicals engineering workflows.', 2850000, 'PT-SW-UNISIM-DESIGN','PT02', 'Process Software')
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- ─── ORDERS ─────────────────────────────────────────────────────────────────
-- Miguel's orders on BlueRock account
INSERT INTO public.orders (id, account_id, user_id, status, total) VALUES
  ('22222222-2222-2222-2222-000000000001', '001ACC001', 'user-admin', 'delivered',   624400),
  ('22222222-2222-2222-2222-000000000002', '001ACC001', 'user-admin', 'processing',  905800),
  ('22222222-2222-2222-2222-000000000003', '001ACC001', 'user-admin', 'pending',     163800)
ON CONFLICT (id) DO NOTHING;

-- Carlos's orders on Prime account
INSERT INTO public.orders (id, account_id, user_id, status, total) VALUES
  ('22222222-2222-2222-2222-000000000004', '001ACC002', 'user-buyer', 'confirmed',    39700),
  ('22222222-2222-2222-2222-000000000005', '001ACC002', 'user-buyer', 'shipped',     268800),
  ('22222222-2222-2222-2222-000000000006', '001ACC002', 'user-buyer', 'pending',      14900)
ON CONFLICT (id) DO NOTHING;

-- Sarah's orders on GreenTech account (she shouldn't see these via TL003, only via invoices TL009)
INSERT INTO public.orders (id, account_id, user_id, status, total) VALUES
  ('22222222-2222-2222-2222-000000000007', '001ACC003', 'user-viewer', 'delivered',  769800),
  ('22222222-2222-2222-2222-000000000008', '001ACC003', 'user-viewer', 'processing', 134800)
ON CONFLICT (id) DO NOTHING;

-- ─── ORDER ITEMS ────────────────────────────────────────────────────────────
INSERT INTO public.order_items (id, order_id, product_id, product_name, quantity, unit_price) VALUES
  -- Order 1 (Miguel, BlueRock): NFS2-3030 + 2WTA-B × 8
  (gen_random_uuid(), '22222222-2222-2222-2222-000000000001', '11111111-1111-1111-1111-000000000001', 'Notifier NFS2-3030 Panel', 1, 589900),
  (gen_random_uuid(), '22222222-2222-2222-2222-000000000001', '11111111-1111-1111-1111-000000000002', 'System Sensor 2WTA-B',     8,   4500),

  -- Order 2 (Miguel, BlueRock): E3 Series + FSP-851T × 8
  (gen_random_uuid(), '22222222-2222-2222-2222-000000000002', '11111111-1111-1111-1111-000000000004', 'Gamewell-FCI E3 Series',   1, 899900),
  (gen_random_uuid(), '22222222-2222-2222-2222-000000000002', '11111111-1111-1111-1111-000000000006', 'Notifier FSP-851T',        8,   6900),

  -- Order 3 (Miguel, BlueRock): ZX5Se × 4 + BEAM1224S
  (gen_random_uuid(), '22222222-2222-2222-2222-000000000003', '11111111-1111-1111-1111-000000000007', 'Morley-IAS ZX5Se Panel',   4,  34900),
  (gen_random_uuid(), '22222222-2222-2222-2222-000000000003', '11111111-1111-1111-1111-000000000008', 'System Sensor BEAM1224S',   1,  28900),

  -- Order 4 (Carlos, Prime): T6 Pro × 2 + Water Leak Sensor
  (gen_random_uuid(), '22222222-2222-2222-2222-000000000004', '11111111-1111-1111-1111-000000000009', 'Honeywell T6 Pro Thermostat', 2, 14900),
  (gen_random_uuid(), '22222222-2222-2222-2222-000000000004', '11111111-1111-1111-1111-000000000010', 'Honeywell Home Water Leak Sensor', 1, 5900),

  -- Order 5 (Carlos, Prime): VFD-3HP + VISTA-20P
  (gen_random_uuid(), '22222222-2222-2222-2222-000000000005', '11111111-1111-1111-1111-000000000012', 'Honeywell DC Motor Drive',  1, 249900),
  (gen_random_uuid(), '22222222-2222-2222-2222-000000000005', '11111111-1111-1111-1111-000000000011', 'Resideo VISTA-20P Panel',   1,  18900),

  -- Order 6 (Carlos, Prime): T6 Pro
  (gen_random_uuid(), '22222222-2222-2222-2222-000000000006', '11111111-1111-1111-1111-000000000009', 'Honeywell T6 Pro Thermostat', 1, 14900),

  -- Order 7 (Sarah, GreenTech): HC900 + STT850
  (gen_random_uuid(), '22222222-2222-2222-2222-000000000007', '11111111-1111-1111-1111-000000000015', 'Honeywell HC900 Controller',    1, 679900),
  (gen_random_uuid(), '22222222-2222-2222-2222-000000000007', '11111111-1111-1111-1111-000000000016', 'Honeywell STT850 Transmitter',  2,  44900),

  -- Order 8 (Sarah, GreenTech): ST3000 + LSXM
  (gen_random_uuid(), '22222222-2222-2222-2222-000000000008', '11111111-1111-1111-1111-000000000017', 'Honeywell ST3000 Pressure',     1,  89900),
  (gen_random_uuid(), '22222222-2222-2222-2222-000000000008', '11111111-1111-1111-1111-000000000018', 'Honeywell Limitless LSXM Switch', 2, 19900)
ON CONFLICT DO NOTHING;

-- ─── QUOTES ─────────────────────────────────────────────────────────────────
INSERT INTO public.quotes (id, account_id, user_id, status, total) VALUES
  ('33333333-3333-3333-3333-000000000001', '001ACC001', 'user-admin', 'approved',  1250000),
  ('33333333-3333-3333-3333-000000000002', '001ACC002', 'user-buyer', 'draft',      185600),
  ('33333333-3333-3333-3333-000000000003', '001ACC003', 'user-viewer', 'submitted',  449900)
ON CONFLICT (id) DO NOTHING;

-- ─── QUOTE ITEMS ────────────────────────────────────────────────────────────
INSERT INTO public.quote_items (id, quote_id, product_id, product_name, quantity, unit_price) VALUES
  (gen_random_uuid(), '33333333-3333-3333-3333-000000000001', '11111111-1111-1111-1111-000000000004', 'Gamewell-FCI E3 Series', 1, 899900),
  (gen_random_uuid(), '33333333-3333-3333-3333-000000000001', '11111111-1111-1111-1111-000000000005', 'Farenhyt IFP-300ECS',    1, 449900),
  (gen_random_uuid(), '33333333-3333-3333-3333-000000000002', '11111111-1111-1111-1111-000000000009', 'Honeywell T6 Pro Thermostat', 10, 14900),
  (gen_random_uuid(), '33333333-3333-3333-3333-000000000002', '11111111-1111-1111-1111-000000000010', 'Honeywell Home Water Leak Sensor', 6, 5900),
  (gen_random_uuid(), '33333333-3333-3333-3333-000000000003', '11111111-1111-1111-1111-000000000015', 'Honeywell HC900 Controller', 1, 679900)
ON CONFLICT DO NOTHING;

-- ─── DONE ───────────────────────────────────────────────────────────────────
-- Summary:
--   3 users, 3 accounts, 6 sales orgs, 18 products, 8 orders, 3 quotes
--   Each persona sees ONLY their authorized account's data through the API.
-- =============================================================================
