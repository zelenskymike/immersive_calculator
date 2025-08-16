#!/usr/bin/env node

const http = require('http');
const net = require('net');

/**
 * Checks if a given port is available for use
 * @param {number} port - The port number to check
 * @returns {Promise<boolean>} Promise that resolves to true if port is available, false otherwise
 */
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    // Try to listen on the port
    server.listen(port, () => {
      // Port is available, close the server and return true
      server.close(() => {
        resolve(true);
      });
    });
    
    // Port is in use, return false
    server.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Finds the first available port starting from a given port number
 * @param {number} startPort - The starting port number (default: 4000)
 * @returns {Promise<number>} Promise that resolves to the first available port number
 * @throws {Error} When no available ports are found within the range
 */
async function findAvailablePort(startPort = 4000) {
  // Check 100 consecutive ports starting from startPort
  for (let port = startPort; port < startPort + 100; port++) {
    if (await checkPort(port)) {
      return port;
    }
  }
  throw new Error('No available ports found in range ' + startPort + '-' + (startPort + 99));
}

/**
 * Calculates Total Cost of Ownership (TCO) comparison between air cooling and immersion cooling systems
 * 
 * This function performs comprehensive TCO analysis including:
 * - CAPEX (Capital Expenditure) calculations
 * - OPEX (Operating Expenditure) calculations with NPV discounting
 * - Energy consumption and efficiency metrics
 * - ROI, payback period, and savings analysis
 * - Environmental impact calculations (CO2 reduction)
 * 
 * @param {Object} input - Configuration object with calculation parameters
 * @param {number} [input.airRacks=10] - Number of air-cooled 42U racks
 * @param {number} [input.airPowerPerRack=20] - Power consumption per air-cooled rack (kW)
 * @param {number} [input.airRackCost=50000] - Cost per air-cooled rack setup ($)
 * @param {number} [input.airPUE=1.8] - Power Usage Effectiveness for air cooling
 * @param {number} [input.immersionTanks=9] - Number of immersion cooling tanks
 * @param {number} [input.immersionPowerPerTank=23] - Power consumption per tank (kW)
 * @param {number} [input.immersionTankCost=80000] - Cost per immersion tank setup ($)
 * @param {number} [input.immersionPUE=1.1] - Power Usage Effectiveness for immersion cooling
 * @param {number} [input.analysisYears=5] - Analysis period in years
 * @param {number} [input.electricityPrice=0.12] - Electricity cost per kWh ($)
 * @param {number} [input.discountRate=5] - Annual discount rate for NPV calculation (%)
 * @param {number} [input.maintenanceCost=3] - Annual maintenance as % of CAPEX
 * 
 * @returns {Object} Comprehensive TCO analysis results
 * @returns {string} returns.timestamp - ISO timestamp of calculation
 * @returns {string} returns.calculationId - Unique calculation identifier
 * @returns {Object} returns.parameters - Input parameters used for calculation
 * @returns {Object} returns.airCooling - Air cooling system analysis
 * @returns {Object} returns.immersionCooling - Immersion cooling system analysis
 * @returns {Object} returns.comparison - Comparative analysis and savings
 */
function calculateTCO(input) {
  // Input validation and sanitization
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid input: Expected object with calculation parameters');
  }

  const {
    airRacks = 10,
    airPowerPerRack = 20,
    airRackCost = 50000,
    airPUE = 1.8,
    
    immersionTanks = 9,
    immersionPowerPerTank = 23,
    immersionTankCost = 80000,
    immersionPUE = 1.1,
    
    analysisYears = 5,
    electricityPrice = 0.12,
    discountRate = 5,
    maintenanceCost = 3
  } = input;
  
  // Validate input ranges and business logic
  if (airRacks < 1 || airRacks > 1000) {
    throw new Error('Air racks must be between 1 and 1000');
  }
  if (immersionTanks < 1 || immersionTanks > 500) {
    throw new Error('Immersion tanks must be between 1 and 500');
  }
  if (airPowerPerRack < 1 || airPowerPerRack > 100) {
    throw new Error('Air power per rack must be between 1 and 100 kW');
  }
  if (immersionPowerPerTank < 5 || immersionPowerPerTank > 200) {
    throw new Error('Immersion power per tank must be between 5 and 200 kW');
  }
  if (airPUE < 1.0 || airPUE > 3.0) {
    throw new Error('Air cooling PUE must be between 1.0 and 3.0');
  }
  if (immersionPUE < 1.0 || immersionPUE > 2.0) {
    throw new Error('Immersion cooling PUE must be between 1.0 and 2.0');
  }
  if (analysisYears < 1 || analysisYears > 20) {
    throw new Error('Analysis period must be between 1 and 20 years');
  }
  if (electricityPrice < 0.01 || electricityPrice > 1.0) {
    throw new Error('Electricity price must be between $0.01 and $1.00 per kWh');
  }
  if (discountRate < 0 || discountRate > 30) {
    throw new Error('Discount rate must be between 0% and 30%');
  }
  if (maintenanceCost < 0 || maintenanceCost > 15) {
    throw new Error('Maintenance cost must be between 0% and 15% of CAPEX');
  }
  
  // Business logic validation
  if (immersionPUE > airPUE) {
    console.warn('Warning: Immersion PUE is higher than air cooling PUE - this is unusual');
  }
  
  // Convert percentage inputs to decimal values for calculations
  const discountRateDecimal = discountRate / 100;
  const maintenanceCostDecimal = maintenanceCost / 100;
  
  // Calculate total IT power requirements for each cooling system
  const airTotalPower = airRacks * airPowerPerRack; // Total kW for air cooling
  const immersionTotalPower = immersionTanks * immersionPowerPerTank; // Total kW for immersion
  
  // Calculate Capital Expenditure (CAPEX) for both systems
  const airCAPEX = airRacks * airRackCost; // Initial investment for air cooling
  const immersionCAPEX = immersionTanks * immersionTankCost; // Initial investment for immersion
  
  // Calculate annual energy consumption including PUE overhead
  const hoursPerYear = 8760; // Hours in a year (24 * 365)
  
  // Total facility energy consumption = IT power × operating hours × PUE
  const airAnnualEnergy = airTotalPower * hoursPerYear * airPUE; // kWh/year
  const immersionAnnualEnergy = immersionTotalPower * hoursPerYear * immersionPUE; // kWh/year
  
  // Calculate annual electricity costs
  const airAnnualElectricity = airAnnualEnergy * electricityPrice;
  const immersionAnnualElectricity = immersionAnnualEnergy * electricityPrice;
  
  // Calculate annual maintenance costs as percentage of CAPEX
  const airAnnualMaintenance = airCAPEX * maintenanceCostDecimal;
  const immersionAnnualMaintenance = immersionCAPEX * maintenanceCostDecimal;
  
  // Total Annual Operating Expenditure (OPEX) = Electricity + Maintenance
  const airAnnualOPEX = airAnnualElectricity + airAnnualMaintenance;
  const immersionAnnualOPEX = immersionAnnualElectricity + immersionAnnualMaintenance;
  
  // Calculate Total Cost of Ownership using Net Present Value (NPV) methodology
  // TCO = CAPEX + NPV of all future OPEX
  let airTCO = airCAPEX; // Start with initial capital investment
  let immersionTCO = immersionCAPEX;
  
  // Discount future operating costs to present value
  for (let year = 1; year <= analysisYears; year++) {
    // Discount factor = (1 + discount_rate)^year
    const discountFactor = Math.pow(1 + discountRateDecimal, year);
    
    // Add discounted annual OPEX to TCO
    airTCO += airAnnualOPEX / discountFactor;
    immersionTCO += immersionAnnualOPEX / discountFactor;
  }
  
  // Calculate financial metrics and savings
  const totalSavings = airTCO - immersionTCO; // Total NPV savings over analysis period
  const annualSavings = airAnnualOPEX - immersionAnnualOPEX; // Annual OPEX savings
  const capexDifference = immersionCAPEX - airCAPEX; // Additional upfront investment
  
  // Simple payback period = Additional CAPEX / Annual Savings
  const paybackPeriod = Math.abs(capexDifference / annualSavings);
  
  // Return on Investment = (Total Savings / Investment) * 100%
  const roi = (totalSavings / immersionCAPEX) * 100;
  
  // Calculate efficiency and environmental metrics
  const pueImprovement = ((airPUE - immersionPUE) / airPUE) * 100; // PUE improvement percentage
  const annualEnergySavings = (airAnnualEnergy - immersionAnnualEnergy) / 1000; // Convert to MWh
  
  // Carbon footprint reduction (assuming 0.4 kg CO2 per kWh average grid emissions)
  const carbonReduction = (annualEnergySavings * 1000 * 0.4) / 1000; // tons CO2 per year
  
  return {
    timestamp: new Date().toISOString(), // ISO 8601 timestamp
    calculationId: 'calc_' + Date.now(), // Unique calculation identifier
    parameters: {
      analysisYears,
      electricityPrice,
      discountRate,
      maintenanceCost
    },
    airCooling: {
      equipment: {
        count: airRacks,
        type: '42U racks',
        totalPowerKW: airTotalPower,
        pue: airPUE
      },
      costs: {
        capex: Math.round(airCAPEX),
        annualOpex: Math.round(airAnnualOPEX),
        annualElectricity: Math.round(airAnnualElectricity),
        annualMaintenance: Math.round(airAnnualMaintenance),
        totalTCO: Math.round(airTCO)
      },
      energy: {
        annualConsumptionMWh: Math.round(airAnnualEnergy / 1000)
      }
    },
    immersionCooling: {
      equipment: {
        count: immersionTanks,
        type: 'Immersion tanks',
        totalPowerKW: immersionTotalPower,
        pue: immersionPUE
      },
      costs: {
        capex: Math.round(immersionCAPEX),
        annualOpex: Math.round(immersionAnnualOPEX),
        annualElectricity: Math.round(immersionAnnualElectricity),
        annualMaintenance: Math.round(immersionAnnualMaintenance),
        totalTCO: Math.round(immersionTCO)
      },
      energy: {
        annualConsumptionMWh: Math.round(immersionAnnualEnergy / 1000)
      }
    },
    comparison: {
      savings: {
        totalSavings: Math.round(totalSavings),
        annualSavings: Math.round(annualSavings),
        capexDifference: Math.round(capexDifference),
        paybackYears: Math.round(paybackPeriod * 10) / 10,
        roiPercent: Math.round(roi * 10) / 10
      },
      efficiency: {
        pueImprovement: Math.round(pueImprovement * 10) / 10,
        annualEnergySavingsMWh: Math.round(annualEnergySavings),
        annualCarbonReductionTons: Math.round(carbonReduction)
      }
    }
  };
}

/**
 * Generates the complete HTML interface for the TCO Calculator
 * 
 * Creates a responsive, professional web interface with:
 * - Interactive form for input parameters
 * - Real-time calculation results
 * - Multiple chart visualizations
 * - Responsive design for mobile and desktop
 * 
 * @returns {string} Complete HTML document as string
 */
function getHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🧊 TCO Calculator - Immersion Cooling Analysis</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            padding: 20px;
            line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header {
            text-align: center;
            margin-bottom: 30px;
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
        .header p { font-size: 1.1rem; opacity: 0.9; }
        .status-bar {
            background: rgba(76, 175, 80, 0.2);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
            border: 1px solid rgba(76, 175, 80, 0.3);
        }
        .form-section {
            background: rgba(255,255,255,0.15);
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 30px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }
        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 30px;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            font-size: 0.95rem;
        }
        .form-group input, .form-group select {
            width: 100%;
            padding: 12px 15px;
            border: none;
            border-radius: 8px;
            background: rgba(255,255,255,0.9);
            color: #333;
            font-size: 1rem;
            transition: all 0.3s;
        }
        .form-group input:focus, .form-group select:focus {
            outline: none;
            background: rgba(255,255,255,1);
            box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.3);
            transform: translateY(-2px);
        }
        .section-title {
            font-size: 1.4rem;
            margin-bottom: 20px;
            color: #4CAF50;
            border-bottom: 2px solid #4CAF50;
            padding-bottom: 10px;
        }
        .calculate-btn {
            width: 100%;
            max-width: 400px;
            margin: 0 auto;
            display: block;
            padding: 18px 30px;
            background: linear-gradient(45deg, #4CAF50, #45a049);
            color: white;
            border: none;
            border-radius: 25px;
            font-size: 1.3rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
        }
        .calculate-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(76, 175, 80, 0.4);
        }
        .calculate-btn:active {
            transform: translateY(-1px);
        }
        .results-section {
            display: none;
            margin-top: 30px;
            animation: fadeInUp 0.6s ease;
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .results-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .result-card {
            background: rgba(255,255,255,0.15);
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            border: 1px solid rgba(255,255,255,0.2);
            transition: all 0.3s;
        }
        .result-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .result-card h4 {
            color: #4CAF50;
            margin-bottom: 15px;
            font-size: 1.1rem;
        }
        .result-value {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 8px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        }
        .result-subtitle {
            font-size: 0.9rem;
            opacity: 0.8;
        }
        .savings-highlight {
            background: linear-gradient(45deg, #4CAF50, #45a049);
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            margin: 30px 0;
            box-shadow: 0 8px 30px rgba(76, 175, 80, 0.3);
        }
        .savings-highlight h3 {
            font-size: 1.8rem;
            margin-bottom: 15px;
        }
        .savings-value {
            font-size: 3rem;
            font-weight: bold;
            margin: 20px 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .chart-container {
            background: rgba(255,255,255,0.95);
            padding: 25px;
            border-radius: 15px;
            margin: 30px 0;
            box-shadow: 0 8px 30px rgba(0,0,0,0.1);
        }
        .loading {
            text-align: center;
            padding: 40px;
            font-style: italic;
            font-size: 1.1rem;
        }
        .loading::before {
            content: '⚡';
            font-size: 2rem;
            display: block;
            margin-bottom: 10px;
        }
        @media (max-width: 768px) {
            .container { padding: 15px; }
            .form-grid { grid-template-columns: 1fr; }
            .results-grid { grid-template-columns: 1fr; }
            .header h1 { font-size: 2rem; }
            .savings-value { font-size: 2.5rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧊 TCO Calculator</h1>
            <p>Professional Total Cost of Ownership analysis for immersion cooling technology</p>
            <div class="status-bar">
                ✅ Server Running • Ready for Calculations • All Systems Operational
            </div>
        </div>
        
        <div class="form-section">
            <div class="form-grid">
                <div>
                    <h3 class="section-title">🌪️ Air Cooling System</h3>
                    <div class="form-group">
                        <label>Number of 42U Racks:</label>
                        <input type="number" id="airRacks" value="10" min="1" max="1000">
                    </div>
                    <div class="form-group">
                        <label>Power per Rack (kW):</label>
                        <input type="number" id="airPowerPerRack" value="20" min="1" max="50" step="0.5">
                    </div>
                    <div class="form-group">
                        <label>Cost per Rack Setup ($):</label>
                        <input type="number" id="airRackCost" value="50000" min="10000" max="200000" step="1000">
                    </div>
                    <div class="form-group">
                        <label>PUE (Power Usage Effectiveness):</label>
                        <input type="number" id="airPUE" value="1.8" min="1.2" max="3.0" step="0.1">
                    </div>
                </div>
                
                <div>
                    <h3 class="section-title">🧊 Immersion Cooling System</h3>
                    <div class="form-group">
                        <label>Number of Immersion Tanks:</label>
                        <input type="number" id="immersionTanks" value="9" min="1" max="500">
                    </div>
                    <div class="form-group">
                        <label>Power per Tank (kW):</label>
                        <input type="number" id="immersionPowerPerTank" value="23" min="10" max="100" step="0.5">
                    </div>
                    <div class="form-group">
                        <label>Cost per Tank Setup ($):</label>
                        <input type="number" id="immersionTankCost" value="80000" min="20000" max="300000" step="1000">
                    </div>
                    <div class="form-group">
                        <label>PUE (Power Usage Effectiveness):</label>
                        <input type="number" id="immersionPUE" value="1.1" min="1.0" max="1.5" step="0.1">
                    </div>
                </div>
            </div>
            
            <div style="max-width: 800px; margin: 30px auto 0;">
                <h3 class="section-title">📊 Analysis Parameters</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px;">
                    <div class="form-group">
                        <label>Analysis Period:</label>
                        <select id="analysisYears">
                            <option value="1">1 Year</option>
                            <option value="3">3 Years</option>
                            <option value="5" selected>5 Years</option>
                            <option value="7">7 Years</option>
                            <option value="10">10 Years</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Electricity Cost ($/kWh):</label>
                        <input type="number" id="electricityPrice" value="0.12" min="0.05" max="0.50" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Discount Rate (%):</label>
                        <input type="number" id="discountRate" value="5" min="0" max="20" step="0.5">
                    </div>
                    <div class="form-group">
                        <label>Maintenance (% of CAPEX):</label>
                        <input type="number" id="maintenanceCost" value="3" min="1" max="10" step="0.5">
                    </div>
                </div>
            </div>
            
            <button class="calculate-btn" onclick="calculateTCO()">🧮 Calculate TCO & Savings</button>
        </div>
        
        <div class="results-section" id="results">
            <div id="loadingIndicator" class="loading">
                Calculating TCO analysis...
            </div>
            
            <div id="resultsContent" style="display: none;">
                <div id="savingsHighlight" class="savings-highlight"></div>
                <div id="resultsGrid" class="results-grid"></div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 30px;">
                    <div class="chart-container">
                        <h4 style="text-align: center; color: #333; margin-bottom: 20px;">TCO Comparison Analysis</h4>
                        <canvas id="tcoChart" width="400" height="200"></canvas>
                    </div>
                    <div class="chart-container">
                        <h4 style="text-align: center; color: #333; margin-bottom: 20px;">Cost Breakdown</h4>
                        <canvas id="pieChart" width="400" height="200"></canvas>
                    </div>
                </div>
                <div class="chart-container">
                    <h4 style="text-align: center; color: #333; margin-bottom: 20px;">Savings Over Time</h4>
                    <canvas id="savingsChart" width="400" height="200"></canvas>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // Global chart instances for management
        let tcoChart = null;
        let pieChart = null;
        let savingsChart = null;
        
        // Enhanced color schemes for professional visualization
        const colors = {
            airCooling: {
                primary: '#FF6B6B',
                secondary: 'rgba(255, 107, 107, 0.8)',
                light: 'rgba(255, 107, 107, 0.2)'
            },
            immersion: {
                primary: '#4ECDC4',
                secondary: 'rgba(78, 205, 196, 0.8)',
                light: 'rgba(78, 205, 196, 0.2)'
            },
            accent: {
                primary: '#45B7D1',
                success: '#96CEB4',
                warning: '#FFEAA7',
                info: '#74B9FF'
            }
        };
        
        /**
         * Main calculation function with client-side validation
         * Validates inputs, calls API, and displays results
         */
        async function calculateTCO() {
            const results = document.getElementById('results');
            const loading = document.getElementById('loadingIndicator');
            const content = document.getElementById('resultsContent');
            
            // Collect and validate form data
            const data = {
                airRacks: parseInt(document.getElementById('airRacks').value),
                airPowerPerRack: parseFloat(document.getElementById('airPowerPerRack').value),
                airRackCost: parseFloat(document.getElementById('airRackCost').value),
                airPUE: parseFloat(document.getElementById('airPUE').value),
                
                immersionTanks: parseInt(document.getElementById('immersionTanks').value),
                immersionPowerPerTank: parseFloat(document.getElementById('immersionPowerPerTank').value),
                immersionTankCost: parseFloat(document.getElementById('immersionTankCost').value),
                immersionPUE: parseFloat(document.getElementById('immersionPUE').value),
                
                analysisYears: parseInt(document.getElementById('analysisYears').value),
                electricityPrice: parseFloat(document.getElementById('electricityPrice').value),
                discountRate: parseFloat(document.getElementById('discountRate').value),
                maintenanceCost: parseFloat(document.getElementById('maintenanceCost').value)
            };
            
            // Client-side validation
            try {
                validateInputs(data);
            } catch (err) {
                alert('❌ Input Validation Error: ' + err.message);
                return;
            }
            
            results.style.display = 'block';
            loading.style.display = 'block';
            content.style.display = 'none';
            
            try {
                const response = await fetch('/api/calculate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Ошибка расчета');
                }
                
                const result = await response.json();
                displayResults(result);
                
                setTimeout(() => {
                    loading.style.display = 'none';
                    content.style.display = 'block';
                }, 800);
                
            } catch (err) {
                loading.style.display = 'none';
                const errorData = err.response ? await err.response.json() : { error: err.message };
                alert('❌ Calculation Error: ' + errorData.error);
                console.error('TCO Calculation error:', errorData);
            }
        }
        
        /**
         * Display comprehensive TCO analysis results with enhanced visualizations
         * @param {Object} result - Complete calculation results from the API
         */
        function displayResults(result) {
            const { airCooling, immersionCooling, comparison, parameters } = result;
            
            // Create savings highlight section with professional metrics
            document.getElementById('savingsHighlight').innerHTML = 
                '<h3>💰 Immersion Cooling Savings</h3>' +
                '<div class="savings-value">$' + formatNumber(comparison.savings.totalSavings) + '</div>' +
                '<div style="font-size: 1.2rem;">' +
                'over ' + parameters.analysisYears + ' years • ' +
                'ROI: ' + comparison.savings.roiPercent + '% • ' +
                'Payback: ' + comparison.savings.paybackYears + ' years' +
                '</div>' +
                '<div style="margin-top: 15px; font-size: 1.1rem;">' +
                'PUE Improvement: ' + comparison.efficiency.pueImprovement + '% • ' +
                'Energy Savings: ' + comparison.efficiency.annualEnergySavingsMWh + ' MWh/year • ' +
                'CO₂ Reduction: ' + comparison.efficiency.annualCarbonReductionTons + ' tons/year' +
                '</div>';
            
            // Create professional results grid with clear English labels
            document.getElementById('resultsGrid').innerHTML = 
                '<div class="result-card">' +
                '<h4>CAPEX - Air Cooling</h4>' +
                '<div class="result-value">$' + formatNumber(airCooling.costs.capex) + '</div>' +
                '<div class="result-subtitle">' + airCooling.equipment.count + ' racks • ' + airCooling.equipment.totalPowerKW + ' kW total</div>' +
                '</div>' +
                '<div class="result-card">' +
                '<h4>CAPEX - Immersion Cooling</h4>' +
                '<div class="result-value">$' + formatNumber(immersionCooling.costs.capex) + '</div>' +
                '<div class="result-subtitle">' + immersionCooling.equipment.count + ' tanks • ' + immersionCooling.equipment.totalPowerKW + ' kW total</div>' +
                '</div>' +
                '<div class="result-card">' +
                '<h4>OPEX - Air Cooling</h4>' +
                '<div class="result-value">$' + formatNumber(airCooling.costs.annualOpex) + '/year</div>' +
                '<div class="result-subtitle">PUE: ' + airCooling.equipment.pue + ' • ' + airCooling.energy.annualConsumptionMWh + ' MWh/year</div>' +
                '</div>' +
                '<div class="result-card">' +
                '<h4>OPEX - Immersion Cooling</h4>' +
                '<div class="result-value">$' + formatNumber(immersionCooling.costs.annualOpex) + '/year</div>' +
                '<div class="result-subtitle">PUE: ' + immersionCooling.equipment.pue + ' • ' + immersionCooling.energy.annualConsumptionMWh + ' MWh/year</div>' +
                '</div>' +
                '<div class="result-card">' +
                '<h4>TCO - Air Cooling</h4>' +
                '<div class="result-value">$' + formatNumber(airCooling.costs.totalTCO) + '</div>' +
                '<div class="result-subtitle">' + parameters.analysisYears + ' years with NPV discount</div>' +
                '</div>' +
                '<div class="result-card">' +
                '<h4>TCO - Immersion Cooling</h4>' +
                '<div class="result-value">$' + formatNumber(immersionCooling.costs.totalTCO) + '</div>' +
                '<div class="result-subtitle">' + parameters.analysisYears + ' years with NPV discount</div>' +
                '</div>';
            
            // Create all chart visualizations
            createTCOChart(result);
            createPieChart(result);
            createSavingsChart(result);
        }
        
        /**
         * Create enhanced TCO comparison bar chart
         * @param {Object} result - Complete calculation results
         */
        function createTCOChart(result) {
            const { airCooling, immersionCooling, parameters } = result;
            
            if (tcoChart) tcoChart.destroy();
            
            const ctx = document.getElementById('tcoChart').getContext('2d');
            tcoChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Air Cooling', 'Immersion Cooling'],
                    datasets: [{
                        label: 'CAPEX',
                        data: [airCooling.costs.capex, immersionCooling.costs.capex],
                        backgroundColor: colors.accent.primary,
                        borderColor: colors.accent.primary,
                        borderWidth: 2
                    }, {
                        label: 'OPEX (' + parameters.analysisYears + ' years)',
                        data: [
                            airCooling.costs.annualOpex * parameters.analysisYears, 
                            immersionCooling.costs.annualOpex * parameters.analysisYears
                        ],
                        backgroundColor: colors.accent.warning,
                        borderColor: colors.accent.warning,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: false
                        },
                        legend: {
                            display: true,
                            labels: { 
                                color: '#333', 
                                font: { size: 14, weight: '600' },
                                usePointStyle: true,
                                pointStyle: 'rectRounded'
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            borderColor: '#333',
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': $' + formatNumber(context.raw);
                                }
                            }
                        }
                    },
                    scales: {
                        x: { 
                            ticks: { color: '#333', font: { size: 12, weight: '600' } },
                            grid: { display: false }
                        },
                        y: { 
                            ticks: { 
                                color: '#333',
                                font: { size: 12 },
                                callback: function(value) {
                                    return '$' + (value / 1000000).toFixed(1) + 'M';
                                }
                            },
                            grid: { color: 'rgba(51, 51, 51, 0.1)' }
                        }
                    },
                    animation: {
                        duration: 1500,
                        easing: 'easeOutCubic'
                    }
                }
            });
        }
        
        /**
         * Create pie chart showing cost breakdown
         * @param {Object} result - Complete calculation results
         */
        function createPieChart(result) {
            const { airCooling, immersionCooling } = result;
            
            if (pieChart) pieChart.destroy();
            
            const ctx = document.getElementById('pieChart').getContext('2d');
            pieChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['Air CAPEX', 'Air OPEX', 'Immersion CAPEX', 'Immersion OPEX'],
                    datasets: [{
                        data: [
                            airCooling.costs.capex,
                            airCooling.costs.annualOpex * 5, // 5 year OPEX for comparison
                            immersionCooling.costs.capex,
                            immersionCooling.costs.annualOpex * 5
                        ],
                        backgroundColor: [
                            colors.airCooling.primary,
                            colors.airCooling.secondary,
                            colors.immersion.primary,
                            colors.immersion.secondary
                        ],
                        borderColor: '#fff',
                        borderWidth: 3,
                        hoverBorderWidth: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: false
                        },
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#333',
                                font: { size: 12, weight: '600' },
                                usePointStyle: true,
                                pointStyle: 'circle',
                                padding: 15
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            callbacks: {
                                label: function(context) {
                                    const percentage = ((context.raw / context.dataset.data.reduce((a, b) => a + b)) * 100).toFixed(1);
                                    return context.label + ': $' + formatNumber(context.raw) + ' (' + percentage + '%)';
                                }
                            }
                        }
                    },
                    animation: {
                        duration: 2000,
                        easing: 'easeOutBounce'
                    }
                }
            });
        }
        
        /**
         * Create line chart showing cumulative savings over time
         * @param {Object} result - Complete calculation results
         */
        function createSavingsChart(result) {
            const { comparison, parameters } = result;
            
            if (savingsChart) savingsChart.destroy();
            
            // Calculate cumulative savings over time
            const years = Array.from({ length: parameters.analysisYears }, (_, i) => i + 1);
            const cumulativeSavings = years.map(year => {
                return comparison.savings.annualSavings * year - comparison.savings.capexDifference;
            });
            
            const ctx = document.getElementById('savingsChart').getContext('2d');
            savingsChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: years,
                    datasets: [{
                        label: 'Cumulative Savings',
                        data: cumulativeSavings,
                        borderColor: colors.accent.success,
                        backgroundColor: 'rgba(150, 206, 180, 0.1)',
                        borderWidth: 4,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: colors.accent.success,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 3,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }, {
                        label: 'Break-even Line',
                        data: years.map(() => 0),
                        borderColor: '#999',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: false
                        },
                        legend: {
                            display: true,
                            labels: {
                                color: '#333',
                                font: { size: 14, weight: '600' },
                                usePointStyle: true,
                                pointStyle: 'line'
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    const prefix = value >= 0 ? 'Savings: $' : 'Investment: $';
                                    return prefix + formatNumber(Math.abs(value));
                                },
                                afterLabel: function(context) {
                                    if (context.datasetIndex === 0) {
                                        const payback = comparison.savings.paybackYears;
                                        return context.parsed.x >= payback ? 'ROI Positive' : 'Payback Period';
                                    }
                                    return '';
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Years',
                                color: '#333',
                                font: { size: 14, weight: '600' }
                            },
                            ticks: { color: '#333', font: { size: 12 } },
                            grid: { color: 'rgba(51, 51, 51, 0.1)' }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Cumulative Savings ($)',
                                color: '#333',
                                font: { size: 14, weight: '600' }
                            },
                            ticks: {
                                color: '#333',
                                font: { size: 12 },
                                callback: function(value) {
                                    return '$' + (value / 1000000).toFixed(1) + 'M';
                                }
                            },
                            grid: { color: 'rgba(51, 51, 51, 0.1)' }
                        }
                    },
                    animation: {
                        duration: 2000,
                        easing: 'easeInOutQuart'
                    }
                }
            });
        }
        
        /**
         * Format numbers with proper thousands separators for display
         * @param {number} num - Number to format
         * @returns {string} Formatted number string with commas
         */
        function formatNumber(num) {
            return new Intl.NumberFormat('en-US').format(Math.round(num));
        }
        
        /**
         * Automatically calculate the recommended number of immersion tanks
         * based on the total power requirements from air cooling setup
         * This ensures equivalent computing capacity between systems
         */
        function updateImmersionTanks() {
            // Get current air cooling configuration
            const airRacks = parseInt(document.getElementById('airRacks').value) || 0;
            const airPower = parseFloat(document.getElementById('airPowerPerRack').value) || 0;
            
            // Calculate total IT power requirement
            const totalPower = airRacks * airPower;
            
            // Get immersion tank capacity
            const immersionPowerPerTank = parseFloat(document.getElementById('immersionPowerPerTank').value) || 23;
            
            // Calculate minimum tanks needed (round up to ensure sufficient capacity)
            const recommendedTanks = Math.ceil(totalPower / immersionPowerPerTank);
            
            // Update the form field
            document.getElementById('immersionTanks').value = recommendedTanks;
        }
        
        // Event listeners
        document.getElementById('airRacks').addEventListener('input', updateImmersionTanks);
        document.getElementById('airPowerPerRack').addEventListener('input', updateImmersionTanks);
        document.getElementById('immersionPowerPerTank').addEventListener('input', updateImmersionTanks);
        
        // Initialize
        updateImmersionTanks();
        /**
         * Client-side input validation function
         * @param {Object} data - Form data to validate
         * @throws {Error} When validation fails
         */
        function validateInputs(data) {
            // Check for NaN values
            const numericFields = [
                'airRacks', 'airPowerPerRack', 'airRackCost', 'airPUE',
                'immersionTanks', 'immersionPowerPerTank', 'immersionTankCost', 'immersionPUE',
                'analysisYears', 'electricityPrice', 'discountRate', 'maintenanceCost'
            ];
            
            for (const field of numericFields) {
                if (isNaN(data[field]) || data[field] === null || data[field] === undefined) {
                    throw new Error(field + ' must be a valid number');
                }
            }
            
            // Basic range validation (mirrors server-side validation)
            if (data.airRacks < 1 || data.airRacks > 1000) {
                throw new Error('Number of air racks must be between 1 and 1000');
            }
            if (data.immersionTanks < 1 || data.immersionTanks > 500) {
                throw new Error('Number of immersion tanks must be between 1 and 500');
            }
            if (data.airPUE < 1.0 || data.airPUE > 3.0) {
                throw new Error('Air cooling PUE must be between 1.0 and 3.0');
            }
            if (data.immersionPUE < 1.0 || data.immersionPUE > 2.0) {
                throw new Error('Immersion cooling PUE must be between 1.0 and 2.0');
            }
            if (data.analysisYears < 1 || data.analysisYears > 20) {
                throw new Error('Analysis period must be between 1 and 20 years');
            }
            
            // Business logic validation
            if (data.immersionPUE > data.airPUE) {
                console.warn('Warning: Immersion PUE is higher than air cooling PUE');
            }
        }
        
        console.log('🧊 TCO Calculator loaded successfully! Ready for professional analysis.'); 
    </script>
</body>
</html>`;
}

/**
 * Create HTTP server with comprehensive TCO calculation API
 * Serves both the web interface and REST API endpoints
 * @param {number} port - Port number to bind the server
 * @returns {http.Server} HTTP server instance
 */
function createServer(port) {
  const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    // Handle TCO calculation API endpoint
    // POST /api/calculate - Accepts JSON with calculation parameters
    if (req.url === '/api/calculate' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          // Parse and validate JSON input
          if (!body.trim()) {
            throw new Error('Request body is empty');
          }
          
          const data = JSON.parse(body);
          
          // Additional API-level validation
          if (typeof data !== 'object' || data === null) {
            throw new Error('Invalid JSON: Expected object');
          }
          
          // Perform TCO calculation with validation
          const result = calculateTCO(data);
          
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(200);
          res.end(JSON.stringify(result, null, 2));
        } catch (error) {
          // Enhanced error handling with appropriate HTTP status codes
          const isValidationError = error.message.includes('must be between') || 
                                   error.message.includes('Invalid input');
          const statusCode = isValidationError ? 400 : 500;
          
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(statusCode);
          res.end(JSON.stringify({ 
            error: error.message,
            code: isValidationError ? 'VALIDATION_ERROR' : 'CALCULATION_ERROR',
            timestamp: new Date().toISOString()
          }));
        }
      });
      return;
    }
    
    // Serve main application page
    // GET / - Returns complete HTML interface
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.writeHead(200);
    res.end(getHTML());
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error('❌ Port ' + port + ' is already in use');
      process.exit(1);
    } else {
      console.error('❌ Server error:', err);
      process.exit(1);
    }
  });

  return server;
}

// Main function
async function main() {
  try {
    console.log('🔍 Finding available port...');
    const port = await findAvailablePort();
    
    const server = createServer(port);
    
    server.listen(port, () => {
      console.log('╔══════════════════════════════════════════════╗');
      console.log('║           🧊 TCO Calculator Started         ║');
      console.log('╠══════════════════════════════════════════════╣');
      console.log('║  🌐 URL: http://localhost:' + port.toString().padEnd(19) + '║');
      console.log('║  📊 Status: Ready for calculations          ║');
      console.log('║  ✅ All systems operational                 ║');
      console.log('╚══════════════════════════════════════════════╝');
      console.log('');
      console.log('🚀 Calculator features:');
      console.log('  • Interactive TCO calculations');
      console.log('  • Real-time cost analysis');
      console.log('  • Professional charts and graphs');
      console.log('  • Auto-calculation of equipment needs');
      console.log('  • ROI and payback period analysis');
      console.log('');
      console.log('💡 Open your browser and navigate to: http://localhost:' + port);
      console.log('');
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\\n🛑 Shutting down TCO Calculator...');
      server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  main();
}

module.exports = { calculateTCO, findAvailablePort, createServer };