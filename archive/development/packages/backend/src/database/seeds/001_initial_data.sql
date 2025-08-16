-- Initial seed data for TCO Calculator
-- This file populates the database with default equipment configurations,
-- financial parameters, and exchange rates

-- Set search path
SET search_path = tco_core, tco_config, tco_audit, tco_temp, public;

-- Insert equipment configurations
INSERT INTO tco_config.equipment_configurations 
(category, subcategory, item_code, display_name, description, manufacturer, model, specifications, base_pricing, regional_adjustments) VALUES

-- Air Cooling Equipment
('air_cooling', 'rack', '42U_STANDARD', 
 '{"en": "42U Standard Server Rack", "ar": "رف خادم قياسي 42 وحدة"}',
 '{"en": "Standard 42U server rack with 15kW power capacity", "ar": "رف خادم قياسي 42 وحدة بسعة 15 كيلوواط"}',
 'Dell', 'PowerEdge Rack 4220',
 '{
   "physical": {"height_units": 42, "width_mm": 600, "depth_mm": 1200, "weight_kg": 85},
   "electrical": {"power_capacity_kw": 15, "power_consumption_kw": 0.5, "efficiency_rating": 0.95},
   "thermal": {"heat_dissipation_kw": 15, "cooling_airflow_cfm": 500},
   "capacity": {"server_slots": 42, "max_density_kw_per_u": 0.36}
 }',
 '{
   "USD": {"equipment_cost": 2500, "installation_cost": 1000, "maintenance_annual_pct": 0.05},
   "EUR": {"equipment_cost": 2100, "installation_cost": 840, "maintenance_annual_pct": 0.05},
   "SAR": {"equipment_cost": 9375, "installation_cost": 3750, "maintenance_annual_pct": 0.05},
   "AED": {"equipment_cost": 9188, "installation_cost": 3675, "maintenance_annual_pct": 0.05}
 }',
 '{
   "US": {"cost_multiplier": 1.0, "availability": true},
   "EU": {"cost_multiplier": 1.1, "availability": true, "import_duty_pct": 0.05},
   "ME": {"cost_multiplier": 1.15, "availability": true, "import_duty_pct": 0.08}
 }'
),

('air_cooling', 'rack', '42U_HIGH_DENSITY',
 '{"en": "42U High Density Server Rack", "ar": "رف خادم عالي الكثافة 42 وحدة"}',
 '{"en": "High density 42U server rack with 25kW power capacity", "ar": "رف خادم عالي الكثافة 42 وحدة بسعة 25 كيلوواط"}',
 'HPE', 'ProLiant Rack G10',
 '{
   "physical": {"height_units": 42, "width_mm": 600, "depth_mm": 1200, "weight_kg": 95},
   "electrical": {"power_capacity_kw": 25, "power_consumption_kw": 0.75, "efficiency_rating": 0.96},
   "thermal": {"heat_dissipation_kw": 25, "cooling_airflow_cfm": 800},
   "capacity": {"server_slots": 42, "max_density_kw_per_u": 0.60}
 }',
 '{
   "USD": {"equipment_cost": 3800, "installation_cost": 1500, "maintenance_annual_pct": 0.06},
   "EUR": {"equipment_cost": 3200, "installation_cost": 1260, "maintenance_annual_pct": 0.06},
   "SAR": {"equipment_cost": 14250, "installation_cost": 5625, "maintenance_annual_pct": 0.06},
   "AED": {"equipment_cost": 13966, "installation_cost": 5513, "maintenance_annual_pct": 0.06}
 }',
 '{
   "US": {"cost_multiplier": 1.0, "availability": true},
   "EU": {"cost_multiplier": 1.1, "availability": true, "import_duty_pct": 0.05},
   "ME": {"cost_multiplier": 1.2, "availability": true, "import_duty_pct": 0.10}
 }'
),

-- HVAC Systems
('air_cooling', 'hvac', 'CRAC_30KW',
 '{"en": "30kW Computer Room Air Conditioning Unit", "ar": "وحدة تكييف غرفة الحاسوب 30 كيلوواط"}',
 '{"en": "Precision air conditioning unit for data centers", "ar": "وحدة تكييف دقيق لمراكز البيانات"}',
 'Liebert', 'CRV-30',
 '{
   "thermal": {"cooling_capacity_kw": 30, "power_consumption_kw": 12, "operating_temp_range": {"min": 18, "max": 27}},
   "electrical": {"efficiency_rating": 0.85, "power_consumption_kw": 12},
   "performance": {"cop": 2.5, "efficiency": 0.85},
   "physical": {"width_mm": 800, "depth_mm": 1200, "weight_kg": 250}
 }',
 '{
   "USD": {"equipment_cost": 25000, "installation_cost": 8000, "maintenance_annual_pct": 0.08},
   "EUR": {"equipment_cost": 21000, "installation_cost": 6720, "maintenance_annual_pct": 0.08},
   "SAR": {"equipment_cost": 93750, "installation_cost": 30000, "maintenance_annual_pct": 0.08},
   "AED": {"equipment_cost": 91875, "installation_cost": 29400, "maintenance_annual_pct": 0.08}
 }',
 '{
   "US": {"cost_multiplier": 1.0, "availability": true},
   "EU": {"cost_multiplier": 1.15, "availability": true, "import_duty_pct": 0.08},
   "ME": {"cost_multiplier": 1.25, "availability": true, "import_duty_pct": 0.12}
 }'
),

('air_cooling', 'hvac', 'CRAC_50KW',
 '{"en": "50kW Computer Room Air Conditioning Unit", "ar": "وحدة تكييف غرفة الحاسوب 50 كيلوواط"}',
 '{"en": "High capacity precision air conditioning for large data centers", "ar": "تكييف دقيق عالي السعة لمراكز البيانات الكبيرة"}',
 'Schneider Electric', 'InRow ACRC',
 '{
   "thermal": {"cooling_capacity_kw": 50, "power_consumption_kw": 18, "operating_temp_range": {"min": 18, "max": 27}},
   "electrical": {"efficiency_rating": 0.88, "power_consumption_kw": 18},
   "performance": {"cop": 2.8, "efficiency": 0.88},
   "physical": {"width_mm": 900, "depth_mm": 1400, "weight_kg": 350}
 }',
 '{
   "USD": {"equipment_cost": 38000, "installation_cost": 12000, "maintenance_annual_pct": 0.075},
   "EUR": {"equipment_cost": 32000, "installation_cost": 10080, "maintenance_annual_pct": 0.075},
   "SAR": {"equipment_cost": 142500, "installation_cost": 45000, "maintenance_annual_pct": 0.075},
   "AED": {"equipment_cost": 139650, "installation_cost": 44100, "maintenance_annual_pct": 0.075}
 }',
 '{
   "US": {"cost_multiplier": 1.0, "availability": true},
   "EU": {"cost_multiplier": 1.12, "availability": true, "import_duty_pct": 0.08},
   "ME": {"cost_multiplier": 1.18, "availability": true, "import_duty_pct": 0.10}
 }'
),

-- Immersion Cooling Equipment
('immersion_cooling', 'tank', 'IMMERSION_TANK_23U',
 '{"en": "23U Single-Phase Immersion Cooling Tank", "ar": "خزان التبريد بالغمر أحادي الطور 23 وحدة"}',
 '{"en": "Complete immersion cooling solution for high-density computing", "ar": "حل تبريد بالغمر متكامل للحوسبة عالية الكثافة"}',
 '3M', 'Novec 7100 Tank',
 '{
   "physical": {"height_units": 23, "width_mm": 600, "depth_mm": 1200, "weight_kg": 120},
   "capacity": {"server_slots": 48, "max_density_kw_per_u": 4.2, "coolant_volume_liters": 500},
   "thermal": {"cooling_capacity_kw": 96, "heat_dissipation_kw": 96},
   "performance": {"pue": 1.03, "efficiency": 0.98},
   "electrical": {"power_consumption_kw": 2.5}
 }',
 '{
   "USD": {"equipment_cost": 35000, "installation_cost": 8000, "maintenance_annual_pct": 0.03},
   "EUR": {"equipment_cost": 29400, "installation_cost": 6720, "maintenance_annual_pct": 0.03},
   "SAR": {"equipment_cost": 131250, "installation_cost": 30000, "maintenance_annual_pct": 0.03},
   "AED": {"equipment_cost": 128625, "installation_cost": 29400, "maintenance_annual_pct": 0.03}
 }',
 '{
   "US": {"cost_multiplier": 1.0, "availability": true},
   "EU": {"cost_multiplier": 1.08, "availability": true, "import_duty_pct": 0.06},
   "ME": {"cost_multiplier": 1.12, "availability": true, "import_duty_pct": 0.08}
 }'
),

('immersion_cooling', 'tank', 'IMMERSION_TANK_20U',
 '{"en": "20U Single-Phase Immersion Cooling Tank", "ar": "خزان التبريد بالغمر أحادي الطور 20 وحدة"}',
 '{"en": "Compact immersion cooling solution for medium density applications", "ar": "حل تبريد بالغمر مدمج للتطبيقات متوسطة الكثافة"}',
 'Submer', 'SmartPodX',
 '{
   "physical": {"height_units": 20, "width_mm": 600, "depth_mm": 1200, "weight_kg": 105},
   "capacity": {"server_slots": 40, "max_density_kw_per_u": 3.8, "coolant_volume_liters": 425},
   "thermal": {"cooling_capacity_kw": 76, "heat_dissipation_kw": 76},
   "performance": {"pue": 1.04, "efficiency": 0.97},
   "electrical": {"power_consumption_kw": 2.2}
 }',
 '{
   "USD": {"equipment_cost": 28000, "installation_cost": 6500, "maintenance_annual_pct": 0.03},
   "EUR": {"equipment_cost": 23500, "installation_cost": 5460, "maintenance_annual_pct": 0.03},
   "SAR": {"equipment_cost": 105000, "installation_cost": 24375, "maintenance_annual_pct": 0.03},
   "AED": {"equipment_cost": 102900, "installation_cost": 23888, "maintenance_annual_pct": 0.03}
 }',
 '{
   "US": {"cost_multiplier": 1.0, "availability": true},
   "EU": {"cost_multiplier": 1.08, "availability": true, "import_duty_pct": 0.06},
   "ME": {"cost_multiplier": 1.15, "availability": true, "import_duty_pct": 0.08}
 }'
),

-- Coolant
('immersion_cooling', 'coolant', 'NOVEC_7100',
 '{"en": "3M Novec 7100 Engineered Fluid", "ar": "سائل هندسي 3M Novec 7100"}',
 '{"en": "Single-phase immersion cooling fluid with excellent thermal properties", "ar": "سائل تبريد بالغمر أحادي الطور بخصائص حرارية ممتازة"}',
 '3M', 'Novec 7100',
 '{
   "thermal": {"boiling_point_c": 61, "thermal_conductivity": 0.075, "operating_temp_range": {"min": 20, "max": 50}},
   "physical": {"density_kg_m3": 1520, "viscosity_cst": 0.38},
   "electrical": {"dielectric_strength_kv": 40, "volume_resistivity": 1e15}
 }',
 '{
   "USD": {"equipment_cost": 25, "installation_cost": 0, "maintenance_annual_pct": 0},
   "EUR": {"equipment_cost": 21, "installation_cost": 0, "maintenance_annual_pct": 0},
   "SAR": {"equipment_cost": 94, "installation_cost": 0, "maintenance_annual_pct": 0},
   "AED": {"equipment_cost": 92, "installation_cost": 0, "maintenance_annual_pct": 0}
 }',
 '{
   "US": {"cost_multiplier": 1.0, "availability": true},
   "EU": {"cost_multiplier": 1.05, "availability": true, "import_duty_pct": 0.03},
   "ME": {"cost_multiplier": 1.18, "availability": false, "import_duty_pct": 0.15}
 }'
),

-- Pumps and Heat Exchangers
('immersion_cooling', 'pump', 'COOLANT_PUMP_SYSTEM',
 '{"en": "Immersion Cooling Pump System", "ar": "نظام مضخة التبريد بالغمر"}',
 '{"en": "High-efficiency pump system for coolant circulation", "ar": "نظام مضخة عالي الكفاءة لتدوير السائل المبرد"}',
 'Grundfos', 'MAGNA3 Series',
 '{
   "electrical": {"power_consumption_kw": 1.2, "efficiency_rating": 0.92},
   "performance": {"flow_rate_lpm": 150, "pressure_bar": 2.5, "efficiency": 0.92},
   "physical": {"weight_kg": 45}
 }',
 '{
   "USD": {"equipment_cost": 8000, "installation_cost": 2000, "maintenance_annual_pct": 0.04},
   "EUR": {"equipment_cost": 6720, "installation_cost": 1680, "maintenance_annual_pct": 0.04},
   "SAR": {"equipment_cost": 30000, "installation_cost": 7500, "maintenance_annual_pct": 0.04},
   "AED": {"equipment_cost": 29400, "installation_cost": 7350, "maintenance_annual_pct": 0.04}
 }',
 '{
   "US": {"cost_multiplier": 1.0, "availability": true},
   "EU": {"cost_multiplier": 1.05, "availability": true},
   "ME": {"cost_multiplier": 1.12, "availability": true, "import_duty_pct": 0.05}
 }'
);

-- Insert financial parameters
INSERT INTO tco_config.financial_parameters 
(parameter_category, parameter_name, parameter_code, default_value, currency_code, unit, regional_values, description, source, confidence_level) VALUES

-- Discount Rates
('discount_rates', 'Corporate Discount Rate', 'discount_rate_corporate', 0.08, NULL, 'decimal',
 '{"US": {"value": 0.08}, "EU": {"value": 0.06}, "ME": {"value": 0.10}}',
 '{"en": "Standard corporate discount rate for NPV calculations", "ar": "معدل الخصم الشركاتي القياسي لحسابات صافي القيمة الحالية"}',
 'Industry Standard', 'high'),

('discount_rates', 'Technology Discount Rate', 'discount_rate_technology', 0.12, NULL, 'decimal',
 '{"US": {"value": 0.12}, "EU": {"value": 0.10}, "ME": {"value": 0.15}}',
 '{"en": "Higher discount rate for technology investments", "ar": "معدل خصم أعلى للاستثمارات التكنولوجية"}',
 'Industry Standard', 'high'),

-- Energy Costs
('energy_costs', 'US Industrial Rate', 'energy_rate_us_industrial', 0.12, 'USD', 'per_kwh',
 '{"US": {"value": 0.12, "unit": "per_kwh"}}',
 '{"en": "US average industrial electricity rate", "ar": "متوسط سعر الكهرباء الصناعية في أمريكا"}',
 'EIA Energy Data', 'high'),

('energy_costs', 'EU Industrial Rate', 'energy_rate_eu_industrial', 0.28, 'EUR', 'per_kwh',
 '{"EU": {"value": 0.28, "unit": "per_kwh"}}',
 '{"en": "EU average industrial electricity rate", "ar": "متوسط سعر الكهرباء الصناعية في أوروبا"}',
 'Eurostat', 'high'),

('energy_costs', 'Middle East Industrial Rate', 'energy_rate_me_industrial', 0.08, 'USD', 'per_kwh',
 '{"ME": {"value": 0.08, "unit": "per_kwh"}}',
 '{"en": "Middle East average industrial electricity rate", "ar": "متوسط سعر الكهرباء الصناعية في الشرق الأوسط"}',
 'Regional Utilities', 'medium'),

-- Labor Costs
('labor_costs', 'Data Center Technician - US', 'labor_dc_tech_us', 75.00, 'USD', 'per_hour',
 '{"US": {"value": 75.00, "unit": "per_hour"}}',
 '{"en": "Hourly rate for data center maintenance technician in US", "ar": "الأجر بالساعة لفني صيانة مركز البيانات في أمريكا"}',
 'Bureau of Labor Statistics', 'high'),

('labor_costs', 'Data Center Technician - EU', 'labor_dc_tech_eu', 65.00, 'EUR', 'per_hour',
 '{"EU": {"value": 65.00, "unit": "per_hour"}}',
 '{"en": "Hourly rate for data center maintenance technician in EU", "ar": "الأجر بالساعة لفني صيانة مركز البيانات في أوروبا"}',
 'EU Labor Statistics', 'high'),

('labor_costs', 'Data Center Technician - ME', 'labor_dc_tech_me', 45.00, 'USD', 'per_hour',
 '{"ME": {"value": 45.00, "unit": "per_hour"}}',
 '{"en": "Hourly rate for data center maintenance technician in Middle East", "ar": "الأجر بالساعة لفني صيانة مركز البيانات في الشرق الأوسط"}',
 'Regional Market Data', 'medium'),

-- Escalation Rates
('escalation_rates', 'Energy Cost Escalation', 'escalation_energy', 0.03, NULL, 'decimal',
 '{"US": {"value": 0.03}, "EU": {"value": 0.025}, "ME": {"value": 0.035}}',
 '{"en": "Annual energy cost escalation rate", "ar": "معدل تصاعد تكلفة الطاقة السنوي"}',
 'Historical Analysis', 'medium'),

('escalation_rates', 'Maintenance Cost Escalation', 'escalation_maintenance', 0.025, NULL, 'decimal',
 '{"US": {"value": 0.025}, "EU": {"value": 0.02}, "ME": {"value": 0.03}}',
 '{"en": "Annual maintenance cost escalation rate", "ar": "معدل تصاعد تكلفة الصيانة السنوي"}',
 'Industry Analysis', 'medium'),

('escalation_rates', 'Labor Cost Escalation', 'escalation_labor', 0.04, NULL, 'decimal',
 '{"US": {"value": 0.04}, "EU": {"value": 0.035}, "ME": {"value": 0.05}}',
 '{"en": "Annual labor cost escalation rate", "ar": "معدل تصاعد تكلفة العمالة السنوي"}',
 'Labor Market Data', 'medium');

-- Insert initial exchange rates (as of 2025-08-13)
INSERT INTO tco_config.exchange_rates (from_currency, to_currency, rate, source, effective_date) VALUES
('USD', 'EUR', 0.85, 'ECB', '2025-08-13'),
('USD', 'SAR', 3.75, 'SAMA', '2025-08-13'),
('USD', 'AED', 3.67, 'CBUAE', '2025-08-13'),
('EUR', 'USD', 1.18, 'ECB', '2025-08-13'),
('EUR', 'SAR', 4.41, 'ECB', '2025-08-13'),
('EUR', 'AED', 4.33, 'ECB', '2025-08-13'),
('SAR', 'USD', 0.27, 'SAMA', '2025-08-13'),
('SAR', 'EUR', 0.23, 'SAMA', '2025-08-13'),
('SAR', 'AED', 0.98, 'SAMA', '2025-08-13'),
('AED', 'USD', 0.27, 'CBUAE', '2025-08-13'),
('AED', 'EUR', 0.23, 'CBUAE', '2025-08-13'),
('AED', 'SAR', 1.02, 'CBUAE', '2025-08-13');

-- Create default admin user (password: 'admin123!' - should be changed in production)
-- Password hash for 'admin123!' using bcrypt with 12 rounds
INSERT INTO tco_core.admin_users (email, password_hash, role, permissions, is_active) VALUES
('admin@tco-calculator.local', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewfyNMb.e8GMh2TW', 'super_admin', 
 ARRAY['config.read', 'config.write', 'audit.read', 'system.monitor', 'users.manage'], true);

-- Refresh the materialized view
SELECT refresh_current_pricing();

-- Update statistics for better query planning
ANALYZE tco_config.equipment_configurations;
ANALYZE tco_config.financial_parameters;
ANALYZE tco_config.exchange_rates;