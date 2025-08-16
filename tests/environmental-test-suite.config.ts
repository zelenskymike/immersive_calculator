/**
 * Environmental Test Suite Configuration
 * Comprehensive test configuration for environmental impact display validation
 * Supports 88/100 validator score improvement with professional ESG reporting standards
 */

export const ENVIRONMENTAL_TEST_CONFIG = {
  // Validator benchmark metrics (88/100 score targets)
  VALIDATOR_TARGETS: {
    PUE_IMPROVEMENT: 38.9, // Percentage
    ENERGY_SAVINGS_MWH: 1159, // MWh per year
    CARBON_SAVINGS_TONS: 464, // Tons CO₂ per year
    WATER_SAVINGS_GALLONS: 579500, // Gallons per year
    QUALITY_SCORE: 88, // Out of 100
  },

  // Test data configurations for different scenarios
  TEST_SCENARIOS: {
    // Validator benchmark scenario
    VALIDATOR_BENCHMARK: {
      air_cooling: {
        input_method: 'rack_count' as const,
        rack_count: 77,
        power_per_rack_kw: 15.5,
        hvac_efficiency: 0.83,
        power_distribution_efficiency: 0.94,
      },
      immersion_cooling: {
        input_method: 'auto_optimize' as const,
        target_power_kw: 1193.5,
        pumping_efficiency: 0.92,
        heat_exchanger_efficiency: 0.95,
      },
      financial: {
        analysis_years: 5,
        currency: 'USD' as const,
        region: 'US' as const,
        energy_cost_kwh: 0.12,
      },
    },

    // Small enterprise deployment
    SMALL_ENTERPRISE: {
      air_cooling: {
        input_method: 'rack_count' as const,
        rack_count: 25,
        power_per_rack_kw: 12,
      },
      immersion_cooling: {
        input_method: 'auto_optimize' as const,
        target_power_kw: 300,
      },
      financial: {
        analysis_years: 3,
        currency: 'USD' as const,
        region: 'US' as const,
      },
    },

    // Large enterprise deployment
    LARGE_ENTERPRISE: {
      air_cooling: {
        input_method: 'rack_count' as const,
        rack_count: 500,
        power_per_rack_kw: 20,
      },
      immersion_cooling: {
        input_method: 'auto_optimize' as const,
        target_power_kw: 10000,
      },
      financial: {
        analysis_years: 7,
        currency: 'USD' as const,
        region: 'US' as const,
      },
    },

    // Multi-regional deployment
    GLOBAL_DEPLOYMENT: {
      air_cooling: {
        input_method: 'rack_count' as const,
        rack_count: 200,
        power_per_rack_kw: 18,
      },
      immersion_cooling: {
        input_method: 'auto_optimize' as const,
        target_power_kw: 3600,
      },
      financial: {
        analysis_years: 5,
        currency: 'USD' as const,
        region: 'EU' as const, // Different carbon factors
      },
    },
  },

  // Expected environmental outcomes for validation
  EXPECTED_OUTCOMES: {
    VALIDATOR_BENCHMARK: {
      pue_improvement_min: 35,
      pue_improvement_max: 45,
      energy_savings_mwh_min: 1000,
      energy_savings_mwh_max: 1400,
      carbon_savings_tons_min: 400,
      carbon_savings_tons_max: 550,
      water_savings_gallons_min: 500000,
      water_savings_gallons_max: 700000,
    },
    SMALL_ENTERPRISE: {
      pue_improvement_min: 20,
      energy_savings_mwh_min: 200,
      carbon_savings_tons_min: 80,
    },
    LARGE_ENTERPRISE: {
      pue_improvement_min: 30,
      energy_savings_mwh_min: 5000,
      carbon_savings_tons_min: 2000,
    },
  },

  // Performance thresholds
  PERFORMANCE_THRESHOLDS: {
    CALCULATION_TIME_MS: 3000, // 3 seconds max
    CHART_RENDER_TIME_MS: 1000, // 1 second max
    MEMORY_LIMIT_MB: 50, // 50MB max
    UI_RESPONSE_TIME_MS: 200, // 200ms max for UI updates
  },

  // ESG reporting standards compliance
  ESG_COMPLIANCE: {
    GRI_STANDARDS: {
      ENERGY_INTENSITY: 'GRI 302-3',
      GHG_EMISSIONS: 'GRI 305-1,2,3',
      WATER_CONSUMPTION: 'GRI 303-5',
      MATERIALITY_THRESHOLD: 100000, // $100k financial impact
    },
    SASB_METRICS: {
      ENERGY_MANAGEMENT: 'TC-SI-130a.1',
      ENVIRONMENTAL_INTEGRATION: 'TC-SI-130a.2',
      RISK_MITIGATION: 'TC-SI-130a.3',
    },
    TCFD_REQUIREMENTS: {
      CLIMATE_RISKS: true,
      SCENARIO_ANALYSIS: true,
      METRICS_TARGETS: true,
      GOVERNANCE: true,
    },
    EU_TAXONOMY: {
      CLIMATE_MITIGATION: true,
      DNSH_COMPLIANCE: true,
      SOCIAL_SAFEGUARDS: true,
    },
  },

  // Accessibility requirements (WCAG 2.1 AA)
  ACCESSIBILITY_STANDARDS: {
    COLOR_CONTRAST_RATIO: 4.5, // Minimum AA standard
    TOUCH_TARGET_SIZE: 44, // 44px minimum
    KEYBOARD_NAVIGATION: true,
    SCREEN_READER_SUPPORT: true,
    HIGH_CONTRAST_MODE: true,
    ZOOM_SUPPORT: 200, // 200% zoom support
  },

  // Chart visualization requirements
  CHART_REQUIREMENTS: {
    PUE_GAUGE: {
      MIN_VALUE: 1.0,
      MAX_VALUE: 3.0,
      TARGET_ZONES: [
        { min: 1.0, max: 1.2, color: 'green', label: 'Excellent' },
        { min: 1.2, max: 1.5, color: 'yellow', label: 'Good' },
        { min: 1.5, max: 2.0, color: 'orange', label: 'Average' },
        { min: 2.0, max: 3.0, color: 'red', label: 'Poor' },
      ],
    },
    ENVIRONMENTAL_DOUGHNUT: {
      SEGMENTS: ['Carbon Savings', 'Energy Savings', 'Water Savings'],
      COLORS: ['#2e7d32', '#1976d2', '#0288d1'], // Green theme
      ACCESSIBILITY_PATTERNS: true,
    },
    RESPONSIVE_BREAKPOINTS: [375, 768, 1024, 1920], // px
  },

  // Professional presentation standards
  PRESENTATION_STANDARDS: {
    EXECUTIVE_SUMMARY: {
      METRICS_CARDS: 3, // Carbon, Energy, Water
      KEY_INSIGHTS: 2, // Improvement %, Equivalents
      VISUAL_HIERARCHY: true,
      PROFESSIONAL_STYLING: true,
    },
    ESG_SECTION: {
      BENEFITS_ALERT: true,
      METRIC_PRECISION: {
        CARBON_TONS: 1, // 1 decimal place
        ENERGY_MWH: 0, // Whole numbers
        WATER_GALLONS: 0, // Comma-separated
        PERCENTAGES: 1, // 1 decimal place
      },
      CONTEXTUAL_EQUIVALENTS: true,
      EXPORT_READY: true,
    },
  },

  // Error handling scenarios
  ERROR_SCENARIOS: {
    INVALID_INPUTS: [
      { rack_count: 0 },
      { rack_count: -5 },
      { power_per_rack_kw: 0 },
      { power_per_rack_kw: -10 },
      { target_power_kw: 0 },
      { analysis_years: 0 },
      { analysis_years: 15 },
    ],
    EXTREME_VALUES: [
      { rack_count: 1000000 },
      { power_per_rack_kw: 1000 },
      { target_power_kw: 1000000000 },
    ],
    EDGE_CASES: [
      { hvac_efficiency: 0 },
      { hvac_efficiency: 1.5 },
      { pumping_efficiency: 0 },
      { pumping_efficiency: 1.2 },
    ],
  },

  // Regional configurations for testing
  REGIONAL_CONFIGS: {
    US: {
      carbon_factor: 0.4, // kg CO₂/kWh
      energy_cost: 0.12, // $/kWh
      water_factor: 0.5, // gallons/kWh
    },
    EU: {
      carbon_factor: 0.3,
      energy_cost: 0.18,
      water_factor: 0.4,
    },
    ME: {
      carbon_factor: 0.5,
      energy_cost: 0.08,
      water_factor: 0.6,
    },
  },

  // Test timeouts and intervals
  TEST_TIMEOUTS: {
    UNIT_TEST: 10000, // 10 seconds
    INTEGRATION_TEST: 30000, // 30 seconds
    E2E_TEST: 60000, // 60 seconds
    PERFORMANCE_TEST: 120000, // 2 minutes
    ACCESSIBILITY_TEST: 45000, // 45 seconds
  },

  // Mock data for consistent testing
  MOCK_RESULTS: {
    VALIDATOR_COMPLIANT: {
      summary: {
        energy_efficiency_improvement: 38.9,
        pue_air_cooling: 1.68,
        pue_immersion_cooling: 1.03,
        total_tco_savings_5yr: 1590000,
        roi_percent: 142.8,
        payback_months: 16.2,
      },
      environmental: {
        carbon_savings_kg_co2_annual: 464000,
        energy_savings_kwh_annual: 1159000,
        water_savings_gallons_annual: 579500,
        carbon_footprint_reduction_percent: 37.2,
      },
      pue_analysis: {
        air_cooling: 1.68,
        immersion_cooling: 1.03,
        improvement_percent: 38.9,
        energy_savings_kwh_annual: 1159000,
      },
    },
  },
};

// Helper functions for test configuration
export const TestConfigHelpers = {
  /**
   * Validate environmental results against expected outcomes
   */
  validateEnvironmentalOutcome(results: any, scenario: keyof typeof ENVIRONMENTAL_TEST_CONFIG.EXPECTED_OUTCOMES) {
    const expected = ENVIRONMENTAL_TEST_CONFIG.EXPECTED_OUTCOMES[scenario];
    if (!expected) return false;

    const energySavingsMWh = results.environmental.energy_savings_kwh_annual / 1000;
    const carbonSavingsTons = results.environmental.carbon_savings_kg_co2_annual / 1000;
    const pueImprovement = results.pue_analysis.improvement_percent;

    return (
      pueImprovement >= expected.pue_improvement_min &&
      energySavingsMWh >= expected.energy_savings_mwh_min &&
      carbonSavingsTons >= expected.carbon_savings_tons_min
    );
  },

  /**
   * Generate test configuration for specific scenario
   */
  getTestConfig(scenario: keyof typeof ENVIRONMENTAL_TEST_CONFIG.TEST_SCENARIOS) {
    return ENVIRONMENTAL_TEST_CONFIG.TEST_SCENARIOS[scenario];
  },

  /**
   * Check if metrics meet ESG materiality thresholds
   */
  checkESGMateriality(results: any) {
    const threshold = ENVIRONMENTAL_TEST_CONFIG.ESG_COMPLIANCE.GRI_STANDARDS.MATERIALITY_THRESHOLD;
    return results.summary.total_tco_savings_5yr >= threshold;
  },

  /**
   * Validate professional presentation requirements
   */
  validatePresentationStandards(results: any) {
    const standards = ENVIRONMENTAL_TEST_CONFIG.PRESENTATION_STANDARDS;
    const envMetrics = results.environmental;

    return {
      carbonPrecision: Number.isInteger(envMetrics.carbon_savings_kg_co2_annual / 1000 * 10), // 1 decimal
      energyPrecision: Number.isInteger(envMetrics.energy_savings_kwh_annual / 1000), // Whole number
      waterFormatting: envMetrics.water_savings_gallons_annual > 100000, // Large enough for commas
      materialImpact: envMetrics.carbon_savings_kg_co2_annual > 100000, // Material carbon impact
    };
  },

  /**
   * Generate contextual equivalents for stakeholder communication
   */
  generateContextualEquivalents(results: any) {
    const environmental = results.environmental;
    
    return {
      carsRemoved: Math.round(environmental.carbon_savings_kg_co2_annual / 4000),
      homesPowered: Math.round(environmental.energy_savings_kwh_annual / 11000),
      treesPlanted: Math.round(environmental.carbon_savings_kg_co2_annual / 22),
      coalPlantsAvoided: Math.round(environmental.carbon_savings_kg_co2_annual / 820000), // kg CO₂ per year per MW coal plant
    };
  },
};

export default ENVIRONMENTAL_TEST_CONFIG;