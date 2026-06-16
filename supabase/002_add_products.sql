-- =============================================================================
-- INCREMENTAL: Add new sales orgs + products (run AFTER initial seed)
-- Paste this in Supabase SQL Editor → Run
-- =============================================================================

-- ─── NEW SALES ORGANIZATIONS ────────────────────────────────────────────────
INSERT INTO public.sales_orgs (id, name, account_id) VALUES
  ('PT01', 'Process Technology – US',     '001ACC001'),
  ('PT02', 'Process Technology – EU',     '001ACC001'),
  ('BA01', 'Building Automation – US',    '001ACC002'),
  ('BA02', 'Building Automation – EU',    '001ACC002'),
  ('IA01', 'IA – Americas',              '001ACC003'),
  ('IA02', 'IA – EMEA',                  '001ACC003')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ─── NEW PRODUCTS: Industrial Automation (IA01, IA02 → GreenTech) ───────────
INSERT INTO public.products (id, name, description, price, sku, sales_org_id, category) VALUES
  ('11111111-1111-1111-1111-000000000019', 'Experion C300 Process Controller',       'High-performance, redundant process controller engineered for Experion PKS deployments. Supports advanced regulatory and logic strategies with deterministic execution and on-process migration.', 1245000, 'IA-EXP-C300-PM',  'IA01', 'Process Controllers'),
  ('11111111-1111-1111-1111-000000000020', 'SmartLine Multivariable Transmitter',    'Multivariable smart transmitter measuring differential pressure, static pressure and process temperature with HART and FOUNDATION Fieldbus protocols.', 321000, 'IA-SMV-800',      'IA01', 'Field Instruments'),
  ('11111111-1111-1111-1111-000000000021', 'Vibration Monitoring Sensor 500',        'Battery-powered wireless triaxial vibration and temperature sensor for predictive maintenance of pumps, compressors and motors.', 118000, 'IA-RAD-VBR-500',  'IA01', 'Asset Monitoring'),
  ('11111111-1111-1111-1111-000000000022', 'Forge for Industrial Performance',       'Subscription analytics software unifying historian, alarm and KPI data across plants for performance management.', 4800000, 'IA-SW-FORGE-OPS', 'IA01', 'Industrial Software'),
  ('11111111-1111-1111-1111-000000000023', 'Commissioning Services - On-site',       'Engineering and commissioning services for control system migrations, including loop checking, FAT/SAT support and operator training.', 185000, 'IA-SVC-COMM',     'IA01', 'Services'),
  ('11111111-1111-1111-1111-000000000024', 'RTU 2020 LX Remote Terminal Unit',       'Hardened Linux RTU for oil & gas, water and pipeline SCADA. Cellular, Ethernet and serial connectivity with edge computing.', 412000, 'IA-RTU-2020-LX',  'IA02', 'SCADA'),
  ('11111111-1111-1111-1111-000000000025', 'Coriolis Flowmeter G3',                  'Coriolis mass flowmeter delivering 0.05% accuracy for custody transfer applications across hydrocarbons and chemicals.', 895000, 'IA-FLW-CORIO-G3', 'IA02', 'Field Instruments')
ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, description = EXCLUDED.description, category = EXCLUDED.category;

-- ─── NEW PRODUCTS: Building Automation (BA01, BA02 → Prime) ─────────────────
INSERT INTO public.products (id, name, description, price, sku, sales_org_id, category) VALUES
  ('11111111-1111-1111-1111-000000000026', 'T7 Pro Commercial Thermostat',           'Smart commercial thermostat with BACnet/IP, occupancy sensing and remote management via Niagara framework.', 32000, 'BA-TST-T7-PRO',    'BA01', 'HVAC Controls'),
  ('11111111-1111-1111-1111-000000000027', 'VAV Controller V8',                      'DDC controller for VAV boxes with integrated differential pressure sensor and BACnet MS/TP communication.', 54000, 'BA-VAV-CTRL-V8',   'BA01', 'HVAC Controls'),
  ('11111111-1111-1111-1111-000000000028', 'NFXI Fire Alarm Panel',                  'UL-listed addressable fire alarm panel supporting up to 318 devices, voice evacuation and network configurations.', 485000, 'BA-FIRE-NFXI-3030','BA01', 'Life Safety'),
  ('11111111-1111-1111-1111-000000000029', 'Niagara N4 Supervisor License',          'Open framework supervisor license for integrating mechanical, electrical and life-safety systems across a building portfolio.', 690000, 'BA-SW-NIAGARA-N4','BA01', 'Building Software'),
  ('11111111-1111-1111-1111-000000000030', 'Pro-Watch Access Controller',            'IP-based access control panel supporting up to 4 readers, integrates with Pro-Watch enterprise security platform.', 162000, 'BA-SEC-PROWATCH', 'BA01', 'Security'),
  ('11111111-1111-1111-1111-000000000031', 'CO2 / Occupancy Sensor W900',            'Indoor air quality sensor measuring CO2, temperature, humidity and occupancy with BACnet output for DCV strategies.', 41000, 'BA-SEN-CO2-W900',  'BA02', 'HVAC Controls'),
  ('11111111-1111-1111-1111-000000000032', 'BMS Commissioning Package',              'Field commissioning services for BMS deployments including point-to-point checkout, sequence verification and turnover documentation.', 145000, 'BA-SVC-COMM-BMS','BA02', 'Services')
ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, description = EXCLUDED.description, category = EXCLUDED.category;

-- ─── NEW PRODUCTS: Process Technology (PT01, PT02 → BlueRock) ───────────────
INSERT INTO public.products (id, name, description, price, sku, sales_org_id, category) VALUES
  ('11111111-1111-1111-1111-000000000033', 'Refining Catalyst X12 (per kg)',          'Fluid catalytic cracking catalyst optimized for high residue feeds, improving propylene yield and bottoms upgrading.', 3800, 'PT-CAT-RFG-X12',      'PT01', 'Catalysts'),
  ('11111111-1111-1111-1111-000000000034', 'Molecular Sieve 13X (drum)',             'High-capacity 13X molecular sieve adsorbent for natural gas dehydration, CO2 removal and air pre-purification units.', 92000, 'PT-ADS-MOLSV-13X',   'PT01', 'Adsorbents'),
  ('11111111-1111-1111-1111-000000000035', 'CCR Platforming Process License',        'Continuous catalyst regeneration platforming process license including basic engineering design package, training and start-up support.', 125000000, 'PT-SVC-LICENSE-CCR','PT01', 'Process Licensing'),
  ('11111111-1111-1111-1111-000000000036', 'Hydrocracking Catalyst Z9 (per kg)',     'High-activity hydrocracking catalyst optimized for distillate maximization with extended cycle length and low hydrogen consumption.', 6200, 'PT-CAT-HYDRO-Z9',    'PT02', 'Catalysts'),
  ('11111111-1111-1111-1111-000000000037', 'UniSim Design Suite License',            'Steady-state and dynamic process simulation software for refining, gas processing and petrochemicals engineering workflows.', 2850000, 'PT-SW-UNISIM-DESIGN','PT02', 'Process Software')
ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, description = EXCLUDED.description, category = EXCLUDED.category;

-- ─── VERIFY ─────────────────────────────────────────────────────────────────
SELECT sales_org_id, count(*) as product_count
FROM public.products
GROUP BY sales_org_id
ORDER BY sales_org_id;
