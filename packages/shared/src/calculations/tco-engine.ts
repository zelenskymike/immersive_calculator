/**
 * Core TCO Calculation Engine
 * Implements all financial calculations for comparing air cooling vs immersion cooling
 */

import {
  EQUIPMENT_DEFAULTS,
  FINANCIAL_DEFAULTS,
  PUE_BENCHMARKS,
  CURRENCY_CONFIG,
} from '../constants';

import type {
  CalculationConfiguration,
  CalculationResults,
  CalculationSummary,
  CalculationBreakdown,
  CostBreakdown,
  AnnualCosts,
  PUEAnalysis,
  EnvironmentalImpact,
  ChartData,
  Currency,
} from '../types';

/**
 * Main TCO Calculation Engine Class
 */
export class TCOCalculationEngine {
  private config: CalculationConfiguration;
  private currency: Currency;
  private analysisYears: number;
  private discountRate: number;
  private energyCostPerKWh: number;

  constructor(config: CalculationConfiguration) {
    this.config = config;
    this.currency = config.financial.currency;
    this.analysisYears = config.financial.analysis_years;
    this.discountRate = config.financial.custom_discount_rate || FINANCIAL_DEFAULTS.DISCOUNT_RATE;
    this.energyCostPerKWh = config.financial.custom_energy_cost || 
      this.getDefaultEnergyCost(config.financial.region);
  }

  /**
   * Main calculation method that orchestrates all calculations
   */
  public calculate(): CalculationResults {
    const calculationId = this.generateCalculationId();
    const startTime = Date.now();

    // Step 1: Calculate system configurations
    const airCoolingConfig = this.calculateAirCoolingConfiguration();
    const immersionCoolingConfig = this.calculateImmersionCoolingConfiguration();

    // Step 2: Calculate CAPEX (Capital Expenditure)
    const capexResults = this.calculateCapex(airCoolingConfig, immersionCoolingConfig);

    // Step 3: Calculate OPEX (Operational Expenditure) for each year
    const opexResults = this.calculateOpexOverTime(airCoolingConfig, immersionCoolingConfig);

    // Step 4: Calculate cumulative TCO progression
    const tcoProgression = this.calculateTCOProgression(capexResults, opexResults);

    // Step 5: Calculate PUE analysis
    const pueAnalysis = this.calculatePUEAnalysis(airCoolingConfig, immersionCoolingConfig);

    // Step 6: Calculate environmental impact
    const environmentalImpact = this.calculateEnvironmentalImpact(pueAnalysis);

    // Step 7: Generate financial summary
    const summary = this.generateSummary(capexResults, opexResults, tcoProgression, pueAnalysis);

    // Step 8: Create detailed breakdown
    const breakdown = this.createBreakdown(capexResults, opexResults, tcoProgression);

    // Step 9: Generate chart data
    const chartData = this.generateChartData(summary, breakdown, tcoProgression, pueAnalysis);

    const processingTime = Date.now() - startTime;

    return {
      summary,
      breakdown,
      charts: chartData,
      environmental: environmentalImpact,
      pue_analysis: pueAnalysis,
      calculation_id: calculationId,
      calculated_at: new Date().toISOString(),
      calculation_version: '1.0',
      configuration_hash: this.generateConfigurationHash(),
    };
  }

  /**
   * Calculate air cooling system configuration
   */
  private calculateAirCoolingConfiguration() {
    const { air_cooling } = this.config;
    
    let totalRacks: number;
    let totalPowerKW: number;
    let powerPerRackKW: number;

    if (air_cooling.input_method === 'rack_count') {
      totalRacks = air_cooling.rack_count!;
      powerPerRackKW = air_cooling.power_per_rack_kw!;
      totalPowerKW = totalRacks * powerPerRackKW;
    } else {
      totalPowerKW = air_cooling.total_power_kw!;
      powerPerRackKW = EQUIPMENT_DEFAULTS.AIR_COOLING.RACK_42U.power_capacity_kw;
      totalRacks = Math.ceil(totalPowerKW / powerPerRackKW);
    }

    const hvacEfficiency = air_cooling.hvac_efficiency || 
      EQUIPMENT_DEFAULTS.AIR_COOLING.HVAC.efficiency;
    const powerDistributionEfficiency = air_cooling.power_distribution_efficiency || 
      EQUIPMENT_DEFAULTS.AIR_COOLING.INFRASTRUCTURE.power_distribution_efficiency;

    // Calculate cooling requirements
    const totalHeatKW = totalPowerKW; // Assume all power becomes heat
    const hvacPowerKW = totalHeatKW / (hvacEfficiency * EQUIPMENT_DEFAULTS.AIR_COOLING.HVAC.cop);
    const distributionLossesKW = totalPowerKW * (1 - powerDistributionEfficiency);
    
    // Calculate PUE
    const pue = (totalPowerKW + hvacPowerKW + distributionLossesKW) / totalPowerKW;

    return {
      totalRacks,
      totalPowerKW,
      powerPerRackKW,
      hvacPowerKW,
      distributionLossesKW,
      totalFacilityPowerKW: totalPowerKW + hvacPowerKW + distributionLossesKW,
      pue: Math.max(pue, 1.0), // PUE cannot be less than 1.0
      hvacEfficiency,
      powerDistributionEfficiency,
    };
  }

  /**
   * Calculate immersion cooling system configuration
   */
  private calculateImmersionCoolingConfiguration() {
    const { immersion_cooling } = this.config;
    
    let totalTanks: number;
    let totalPowerKW: number;
    let tankConfigurations: Array<{ size: string; quantity: number; powerKW: number }>;

    if (immersion_cooling.input_method === 'auto_optimize') {
      totalPowerKW = immersion_cooling.target_power_kw!;
      // Auto-optimize tank configuration for maximum efficiency
      tankConfigurations = this.optimizeTankConfiguration(totalPowerKW);
      totalTanks = tankConfigurations.reduce((sum, config) => sum + config.quantity, 0);
    } else {
      tankConfigurations = immersion_cooling.tank_configurations!.map(tank => {
        const heightUnits = parseInt(tank.size.replace('U', ''));
        const powerKW = heightUnits * tank.power_density_kw_per_u * tank.quantity;
        return {
          size: tank.size,
          quantity: tank.quantity,
          powerKW,
        };
      });
      totalPowerKW = tankConfigurations.reduce((sum, config) => sum + config.powerKW, 0);
      totalTanks = tankConfigurations.reduce((sum, config) => sum + config.quantity, 0);
    }

    // Calculate system parameters
    const pumpingEfficiency = immersion_cooling.pumping_efficiency || 
      EQUIPMENT_DEFAULTS.IMMERSION_COOLING.TANK_STANDARD.pump_efficiency;
    const heatExchangerEfficiency = immersion_cooling.heat_exchanger_efficiency || 
      EQUIPMENT_DEFAULTS.IMMERSION_COOLING.TANK_STANDARD.heat_exchanger_efficiency;

    // Calculate pump power requirements (typically 1-2% of total power)
    const pumpPowerKW = totalPowerKW * 0.015; // 1.5% of total power
    const heatExchangerPowerKW = totalPowerKW * 0.005; // 0.5% for heat exchanger fans

    // Calculate total coolant volume
    const totalCoolantLiters = this.calculateTotalCoolantVolume(tankConfigurations);

    // Calculate PUE for immersion cooling
    const pue = (totalPowerKW + pumpPowerKW + heatExchangerPowerKW) / totalPowerKW;

    return {
      totalTanks,
      totalPowerKW,
      tankConfigurations,
      pumpPowerKW,
      heatExchangerPowerKW,
      totalFacilityPowerKW: totalPowerKW + pumpPowerKW + heatExchangerPowerKW,
      pue: Math.max(pue, 1.0),
      pumpingEfficiency,
      heatExchangerEfficiency,
      totalCoolantLiters,
    };
  }

  /**
   * Calculate CAPEX (Capital Expenditure) for both systems
   */
  private calculateCapex(airCoolingConfig: any, immersionCoolingConfig: any) {
    // Air cooling CAPEX
    const airCoolingCapex = this.calculateAirCoolingCapex(airCoolingConfig);
    
    // Immersion cooling CAPEX  
    const immersionCoolingCapex = this.calculateImmersionCoolingCapex(immersionCoolingConfig);
    
    const savings = airCoolingCapex.total - immersionCoolingCapex.total;
    const savingsPercent = savings / airCoolingCapex.total * 100;

    return {
      air_cooling: airCoolingCapex,
      immersion_cooling: immersionCoolingCapex,
      savings,
      savings_percent: savingsPercent,
    };
  }

  /**
   * Calculate air cooling CAPEX breakdown
   */
  private calculateAirCoolingCapex(config: any): CostBreakdown {
    const equipmentCostPerRack = this.getCurrencyValue(2500, 'equipment_cost_42u_rack');
    const installationCostPerRack = this.getCurrencyValue(1000, 'installation_cost_42u_rack');
    
    // HVAC costs (30kW CRAC units)
    const hvacUnitsNeeded = Math.ceil(config.hvacPowerKW / 30);
    const hvacCostPerUnit = this.getCurrencyValue(25000, 'hvac_cost_30kw');
    const hvacInstallationPerUnit = this.getCurrencyValue(8000, 'hvac_installation_30kw');
    
    // Infrastructure costs (UPS, PDU, etc.)
    const infrastructureCostPerKW = this.getCurrencyValue(500, 'infrastructure_cost_per_kw');
    
    const equipment = (config.totalRacks * equipmentCostPerRack) + 
                     (hvacUnitsNeeded * hvacCostPerUnit);
    const installation = (config.totalRacks * installationCostPerRack) + 
                        (hvacUnitsNeeded * hvacInstallationPerUnit);
    const infrastructure = config.totalFacilityPowerKW * infrastructureCostPerKW;

    return {
      equipment,
      installation,
      infrastructure,
      total: equipment + installation + infrastructure,
    };
  }

  /**
   * Calculate immersion cooling CAPEX breakdown
   */
  private calculateImmersionCoolingCapex(config: any): CostBreakdown {
    let equipmentCost = 0;
    let installationCost = 0;
    let coolantCost = 0;

    // Calculate costs per tank configuration
    for (const tankConfig of config.tankConfigurations) {
      const heightUnits = parseInt(tankConfig.size.replace('U', ''));
      const tankCostBase = this.getCurrencyValue(35000, 'immersion_tank_23u_base');
      const costPerU = tankCostBase / 23; // Scale based on height
      const tankCost = costPerU * heightUnits;
      const tankInstallation = tankCost * 0.25; // 25% of equipment cost
      
      equipmentCost += tankConfig.quantity * tankCost;
      installationCost += tankConfig.quantity * tankInstallation;
    }

    // Coolant costs
    const coolantCostPerLiter = this.getCurrencyValue(25, 'coolant_cost_per_liter');
    coolantCost = config.totalCoolantLiters * coolantCostPerLiter;

    // Pump and heat exchanger costs
    const pumpSystemCost = this.getCurrencyValue(8000 * config.totalTanks / 10, 'pump_system_cost');
    const heatExchangerCost = this.getCurrencyValue(5000 * config.totalTanks / 15, 'heat_exchanger_cost');
    
    equipmentCost += pumpSystemCost + heatExchangerCost;
    
    // Infrastructure (simplified - immersion cooling requires less infrastructure)
    const infrastructureCostPerKW = this.getCurrencyValue(200, 'immersion_infrastructure_per_kw');
    const infrastructure = config.totalFacilityPowerKW * infrastructureCostPerKW;

    return {
      equipment: equipmentCost,
      installation: installationCost,
      infrastructure,
      coolant: coolantCost,
      total: equipmentCost + installationCost + infrastructure + coolantCost,
    };
  }

  /**
   * Calculate OPEX over the analysis period
   */
  private calculateOpexOverTime(airCoolingConfig: any, immersionCoolingConfig: any): AnnualCosts[] {
    const annualCosts: AnnualCosts[] = [];
    const energyEscalationRate = this.config.financial.energy_escalation_rate || 
      FINANCIAL_DEFAULTS.ESCALATION_RATES.ENERGY;
    const maintenanceEscalationRate = this.config.financial.maintenance_escalation_rate || 
      FINANCIAL_DEFAULTS.ESCALATION_RATES.MAINTENANCE;

    for (let year = 1; year <= this.analysisYears; year++) {
      const escalatedEnergyCost = this.energyCostPerKWh * Math.pow(1 + energyEscalationRate, year - 1);
      
      const airCoolingOpex = this.calculateAnnualAirCoolingOpex(
        airCoolingConfig, 
        year, 
        escalatedEnergyCost, 
        maintenanceEscalationRate
      );
      
      const immersionCoolingOpex = this.calculateAnnualImmersionCoolingOpex(
        immersionCoolingConfig, 
        year, 
        escalatedEnergyCost, 
        maintenanceEscalationRate
      );

      const savings = airCoolingOpex.total - immersionCoolingOpex.total;
      const savingsPercent = (savings / airCoolingOpex.total) * 100;

      annualCosts.push({
        year,
        air_cooling: airCoolingOpex,
        immersion_cooling: immersionCoolingOpex,
        savings,
        savings_percent: savingsPercent,
      });
    }

    return annualCosts;
  }

  /**
   * Calculate annual air cooling OPEX
   */
  private calculateAnnualAirCoolingOpex(
    config: any, 
    year: number, 
    energyCost: number, 
    maintenanceEscalationRate: number
  ): CostBreakdown {
    // Energy costs (8760 hours per year)
    const annualEnergyKWh = config.totalFacilityPowerKW * 8760;
    const energy = annualEnergyKWh * energyCost;

    // Maintenance costs (escalated over time)
    const baseMaintenanceRate = EQUIPMENT_DEFAULTS.AIR_COOLING.HVAC.maintenance_factor;
    const escalatedMaintenanceRate = baseMaintenanceRate * Math.pow(1 + maintenanceEscalationRate, year - 1);
    const maintenance = config.totalRacks * this.getCurrencyValue(2500, 'rack_cost') * escalatedMaintenanceRate;

    // Labor costs (technician hours for maintenance)
    const laborHoursPerYear = config.totalRacks * 24; // 24 hours per rack per year
    const laborCostPerHour = this.config.financial.custom_labor_cost || 
      this.getDefaultLaborCost(this.config.financial.region);
    const labor = laborHoursPerYear * laborCostPerHour;

    return {
      energy,
      maintenance,
      labor,
      total: energy + maintenance + labor,
    };
  }

  /**
   * Calculate annual immersion cooling OPEX
   */
  private calculateAnnualImmersionCoolingOpex(
    config: any, 
    year: number, 
    energyCost: number, 
    maintenanceEscalationRate: number
  ): CostBreakdown {
    // Energy costs (lower due to better PUE)
    const annualEnergyKWh = config.totalFacilityPowerKW * 8760;
    const energy = annualEnergyKWh * energyCost;

    // Maintenance costs (lower percentage for immersion cooling)
    const baseMaintenanceRate = EQUIPMENT_DEFAULTS.IMMERSION_COOLING.MAINTENANCE.annual_percentage;
    const escalatedMaintenanceRate = baseMaintenanceRate * Math.pow(1 + maintenanceEscalationRate, year - 1);
    const tankValue = config.totalTanks * this.getCurrencyValue(35000, 'tank_cost');
    const maintenance = tankValue * escalatedMaintenanceRate;

    // Coolant costs (replacement and filtration)
    const coolantReplacementCycle = EQUIPMENT_DEFAULTS.IMMERSION_COOLING.COOLANT.replacement_cycle_months;
    const coolantCostPerLiter = this.getCurrencyValue(25, 'coolant_cost_per_liter');
    const coolantReplacementCost = year % (coolantReplacementCycle / 12) === 0 ? 
      config.totalCoolantLiters * coolantCostPerLiter * 0.1 : 0; // 10% top-up annually

    // Labor costs (reduced for immersion cooling)
    const laborHoursPerYear = config.totalTanks * 8; // 8 hours per tank per year
    const laborCostPerHour = this.config.financial.custom_labor_cost || 
      this.getDefaultLaborCost(this.config.financial.region);
    const labor = laborHoursPerYear * laborCostPerHour;

    return {
      energy,
      maintenance,
      coolant: coolantReplacementCost,
      labor,
      total: energy + maintenance + coolantReplacementCost + labor,
    };
  }

  /**
   * Calculate TCO progression over time with NPV
   */
  private calculateTCOProgression(capexResults: any, opexResults: AnnualCosts[]) {
    const progression = [];
    let airCoolingCumulative = capexResults.air_cooling.total;
    let immersionCoolingCumulative = capexResults.immersion_cooling.total;

    for (let year = 1; year <= this.analysisYears; year++) {
      const opexYear = opexResults[year - 1];
      
      airCoolingCumulative += opexYear.air_cooling.total;
      immersionCoolingCumulative += opexYear.immersion_cooling.total;
      
      const savings = airCoolingCumulative - immersionCoolingCumulative;
      
      // Calculate NPV of savings
      const discountFactor = 1 / Math.pow(1 + this.discountRate, year);
      const npvSavings = opexYear.savings * discountFactor;

      progression.push({
        year,
        air_cooling: airCoolingCumulative,
        immersion_cooling: immersionCoolingCumulative,
        savings,
        npv_savings: npvSavings,
      });
    }

    return progression;
  }

  /**
   * Calculate PUE analysis
   */
  private calculatePUEAnalysis(airCoolingConfig: any, immersionCoolingConfig: any): PUEAnalysis {
    const airCoolingPUE = airCoolingConfig.pue;
    const immersionCoolingPUE = immersionCoolingConfig.pue;
    const improvementPercent = ((airCoolingPUE - immersionCoolingPUE) / airCoolingPUE) * 100;
    
    // Calculate annual energy savings in kWh
    const airCoolingAnnualKWh = airCoolingConfig.totalFacilityPowerKW * 8760;
    const immersionCoolingAnnualKWh = immersionCoolingConfig.totalFacilityPowerKW * 8760;
    const energySavingsKWhAnnual = airCoolingAnnualKWh - immersionCoolingAnnualKWh;

    return {
      air_cooling: airCoolingPUE,
      immersion_cooling: immersionCoolingPUE,
      improvement_percent: improvementPercent,
      energy_savings_kwh_annual: energySavingsKWhAnnual,
    };
  }

  /**
   * Calculate environmental impact
   */
  private calculateEnvironmentalImpact(pueAnalysis: PUEAnalysis): EnvironmentalImpact {
    // Carbon emissions factor (kg CO2 per kWh) - varies by region
    const carbonFactorKgCO2PerKWh = this.getCarbonEmissionFactor(this.config.financial.region);
    const carbonSavingsKgCO2Annual = pueAnalysis.energy_savings_kwh_annual * carbonFactorKgCO2PerKWh;
    
    // Water savings (cooling towers vs immersion cooling)
    const waterSavingsGallonsAnnual = pueAnalysis.energy_savings_kwh_annual * 0.5; // Approximate factor
    
    const carbonFootprintReductionPercent = (pueAnalysis.improvement_percent / pueAnalysis.air_cooling) * 100;

    return {
      carbon_savings_kg_co2_annual: carbonSavingsKgCO2Annual,
      water_savings_gallons_annual: waterSavingsGallonsAnnual,
      energy_savings_kwh_annual: pueAnalysis.energy_savings_kwh_annual,
      carbon_footprint_reduction_percent: carbonFootprintReductionPercent,
    };
  }

  /**
   * Generate financial summary
   */
  private generateSummary(
    capexResults: any, 
    opexResults: AnnualCosts[], 
    tcoProgression: any[], 
    pueAnalysis: PUEAnalysis
  ): CalculationSummary {
    const totalOpexSavings5yr = opexResults.reduce((sum, year) => sum + year.savings, 0);
    const totalTcoSavings5yr = capexResults.savings + totalOpexSavings5yr;
    
    // Calculate NPV of savings
    const npvSavings = this.calculateNPVSavings(opexResults);
    
    // Calculate payback period
    const paybackMonths = this.calculatePaybackPeriod(capexResults.savings, opexResults);
    
    // Calculate ROI
    const roiPercent = (totalTcoSavings5yr / capexResults.immersion_cooling.total) * 100;
    
    // Calculate cost per kW
    const airCoolingPowerKW = this.calculateAirCoolingConfiguration().totalPowerKW;
    const immersionCoolingPowerKW = this.calculateImmersionCoolingConfiguration().totalPowerKW;
    
    const costPerKwAirCooling = capexResults.air_cooling.total / airCoolingPowerKW;
    const costPerKwImmersionCooling = capexResults.immersion_cooling.total / immersionCoolingPowerKW;
    const costPerRackEquivalent = capexResults.immersion_cooling.total / this.calculateAirCoolingConfiguration().totalRacks;

    return {
      total_capex_savings: capexResults.savings,
      total_opex_savings_5yr: totalOpexSavings5yr,
      total_tco_savings_5yr: totalTcoSavings5yr,
      roi_percent: roiPercent,
      payback_months: paybackMonths,
      npv_savings: npvSavings,
      pue_air_cooling: pueAnalysis.air_cooling,
      pue_immersion_cooling: pueAnalysis.immersion_cooling,
      energy_efficiency_improvement: pueAnalysis.improvement_percent,
      cost_per_kw_air_cooling: costPerKwAirCooling,
      cost_per_kw_immersion_cooling: costPerKwImmersionCooling,
      cost_per_rack_equivalent: costPerRackEquivalent,
    };
  }

  /**
   * Create detailed breakdown
   */
  private createBreakdown(capexResults: any, opexResults: AnnualCosts[], tcoProgression: any[]): CalculationBreakdown {
    // Generate maintenance schedule
    const maintenanceSchedule = [];
    for (let year = 1; year <= this.analysisYears; year++) {
      const opexYear = opexResults[year - 1];
      const majorOverhaulYear = year % 5 === 0; // Major overhaul every 5 years
      const majorOverhaulCost = majorOverhaulYear ? 
        (opexYear.air_cooling.maintenance! * 2 + opexYear.immersion_cooling.maintenance! * 2) : 0;

      maintenanceSchedule.push({
        year,
        air_cooling_maintenance: opexYear.air_cooling.maintenance || 0,
        immersion_cooling_maintenance: opexYear.immersion_cooling.maintenance || 0,
        major_overhauls: majorOverhaulCost,
      });
    }

    return {
      capex: capexResults,
      opex_annual: opexResults,
      tco_cumulative: tcoProgression,
      maintenance_schedule: maintenanceSchedule,
    };
  }

  /**
   * Generate chart data
   */
  private generateChartData(
    summary: CalculationSummary, 
    breakdown: CalculationBreakdown, 
    tcoProgression: any[], 
    pueAnalysis: PUEAnalysis
  ): ChartData {
    // TCO progression chart data
    const tcoProgressionData = tcoProgression.map(year => ({
      year: year.year,
      air_cooling: year.air_cooling,
      immersion_cooling: year.immersion_cooling,
      savings: year.savings,
      cumulative_savings: year.savings,
    }));

    // PUE comparison
    const pueComparison = {
      air_cooling: pueAnalysis.air_cooling,
      immersion_cooling: pueAnalysis.immersion_cooling,
    };

    // Cost categories breakdown
    const costCategories = {
      'Equipment': {
        air_cooling: breakdown.capex.air_cooling.equipment,
        immersion_cooling: breakdown.capex.immersion_cooling.equipment,
        difference: breakdown.capex.air_cooling.equipment - breakdown.capex.immersion_cooling.equipment,
      },
      'Installation': {
        air_cooling: breakdown.capex.air_cooling.installation,
        immersion_cooling: breakdown.capex.immersion_cooling.installation,
        difference: breakdown.capex.air_cooling.installation - breakdown.capex.immersion_cooling.installation,
      },
      'Infrastructure': {
        air_cooling: breakdown.capex.air_cooling.infrastructure,
        immersion_cooling: breakdown.capex.immersion_cooling.infrastructure,
        difference: breakdown.capex.air_cooling.infrastructure - breakdown.capex.immersion_cooling.infrastructure,
      },
      'Annual Energy': {
        air_cooling: breakdown.opex_annual[0]?.air_cooling.energy || 0,
        immersion_cooling: breakdown.opex_annual[0]?.immersion_cooling.energy || 0,
        difference: (breakdown.opex_annual[0]?.air_cooling.energy || 0) - (breakdown.opex_annual[0]?.immersion_cooling.energy || 0),
      },
    };

    return {
      tco_progression: tcoProgressionData,
      pue_comparison: pueComparison,
      cost_categories: costCategories,
    };
  }

  // Helper methods

  private getDefaultEnergyCost(region?: string): number {
    switch (region) {
      case 'US': return FINANCIAL_DEFAULTS.ENERGY_COSTS.US;
      case 'EU': return FINANCIAL_DEFAULTS.ENERGY_COSTS.EU;
      case 'ME': return FINANCIAL_DEFAULTS.ENERGY_COSTS.ME;
      default: return FINANCIAL_DEFAULTS.ENERGY_COSTS.US;
    }
  }

  private getDefaultLaborCost(region?: string): number {
    switch (region) {
      case 'US': return FINANCIAL_DEFAULTS.LABOR_COSTS.US;
      case 'EU': return FINANCIAL_DEFAULTS.LABOR_COSTS.EU;
      case 'ME': return FINANCIAL_DEFAULTS.LABOR_COSTS.ME;
      default: return FINANCIAL_DEFAULTS.LABOR_COSTS.US;
    }
  }

  private getCarbonEmissionFactor(region?: string): number {
    // kg CO2 per kWh by region (approximate values)
    switch (region) {
      case 'US': return 0.4; // US grid average
      case 'EU': return 0.3; // EU grid average
      case 'ME': return 0.5; // Middle East average (higher due to fossil fuels)
      default: return 0.4;
    }
  }

  private getCurrencyValue(baseValueUSD: number, itemType: string): number {
    // For now, return the base USD value
    // In a full implementation, this would convert to the target currency
    return baseValueUSD;
  }

  private optimizeTankConfiguration(totalPowerKW: number) {
    // Auto-optimize for best density and cost efficiency
    const targetPowerPerTank = 46; // 23U tank optimal power
    const tanksNeeded = Math.ceil(totalPowerKW / targetPowerPerTank);
    
    return [{
      size: '23U',
      quantity: tanksNeeded,
      powerKW: totalPowerKW,
    }];
  }

  private calculateTotalCoolantVolume(tankConfigurations: any[]): number {
    return tankConfigurations.reduce((total, config) => {
      const heightUnits = parseInt(config.size.replace('U', ''));
      const volumePerTank = heightUnits * 25; // ~25 liters per U
      return total + (config.quantity * volumePerTank);
    }, 0);
  }

  private calculateNPVSavings(opexResults: AnnualCosts[]): number {
    return opexResults.reduce((npv, year) => {
      const discountFactor = 1 / Math.pow(1 + this.discountRate, year.year);
      return npv + (year.savings * discountFactor);
    }, 0);
  }

  private calculatePaybackPeriod(capexSavings: number, opexResults: AnnualCosts[]): number {
    let cumulativeSavings = capexSavings;
    
    if (cumulativeSavings >= 0) return 0; // Immediate payback if CAPEX is positive

    for (const yearData of opexResults) {
      cumulativeSavings += yearData.savings;
      if (cumulativeSavings >= 0) {
        // Linear interpolation for more accurate payback
        const prevCumulative = cumulativeSavings - yearData.savings;
        const monthsIntoYear = (-prevCumulative / yearData.savings) * 12;
        return (yearData.year - 1) * 12 + monthsIntoYear;
      }
    }
    
    return this.analysisYears * 12; // If no payback within analysis period
  }

  private generateCalculationId(): string {
    return `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateConfigurationHash(): string {
    const configString = JSON.stringify(this.config);
    // Simple hash function - in production, use a proper crypto hash
    let hash = 0;
    for (let i = 0; i < configString.length; i++) {
      const char = configString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `hash_${Math.abs(hash).toString(36)}`;
  }
}

/**
 * Convenience function to perform TCO calculation
 */
export function calculateTCO(configuration: CalculationConfiguration): CalculationResults {
  const engine = new TCOCalculationEngine(configuration);
  return engine.calculate();
}

/**
 * Export calculation utilities
 */
export const CalculationUtils = {
  /**
   * Validate configuration completeness
   */
  validateConfiguration(config: CalculationConfiguration): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate air cooling configuration
    if (config.air_cooling.input_method === 'rack_count') {
      if (!config.air_cooling.rack_count || !config.air_cooling.power_per_rack_kw) {
        errors.push('Rack count and power per rack are required for rack count input method');
      }
    } else if (config.air_cooling.input_method === 'total_power') {
      if (!config.air_cooling.total_power_kw) {
        errors.push('Total power is required for total power input method');
      }
    }

    // Validate immersion cooling configuration
    if (config.immersion_cooling.input_method === 'manual_config') {
      if (!config.immersion_cooling.tank_configurations || config.immersion_cooling.tank_configurations.length === 0) {
        errors.push('Tank configurations are required for manual configuration method');
      }
    } else if (config.immersion_cooling.input_method === 'auto_optimize') {
      if (!config.immersion_cooling.target_power_kw) {
        errors.push('Target power is required for auto-optimize method');
      }
    }

    // Validate financial configuration
    if (config.financial.analysis_years < 1 || config.financial.analysis_years > 10) {
      errors.push('Analysis years must be between 1 and 10');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Estimate calculation processing time
   */
  estimateProcessingTime(config: CalculationConfiguration): number {
    // Base processing time in milliseconds
    let estimatedTimeMs = 100;
    
    // Add time for complexity
    if (config.immersion_cooling.tank_configurations) {
      estimatedTimeMs += config.immersion_cooling.tank_configurations.length * 10;
    }
    
    estimatedTimeMs += config.financial.analysis_years * 20;
    
    return Math.min(estimatedTimeMs, 5000); // Cap at 5 seconds
  },

  /**
   * Convert currency amounts
   */
  convertCurrency(amount: number, fromCurrency: Currency, toCurrency: Currency, exchangeRates: Record<string, number>): number {
    if (fromCurrency === toCurrency) return amount;
    
    const rateKey = `${fromCurrency}_${toCurrency}`;
    const rate = exchangeRates[rateKey];
    
    if (!rate) {
      // Try inverse rate
      const inverseKey = `${toCurrency}_${fromCurrency}`;
      const inverseRate = exchangeRates[inverseKey];
      if (inverseRate) {
        return amount / inverseRate;
      }
      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    }
    
    return amount * rate;
  },
};