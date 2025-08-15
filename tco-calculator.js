const http = require('http');
const net = require('net');

/**
 * Check if a port is available
 * @param {number} port - Port number to check
 * @return {Promise<boolean>} True if port is available
 */
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, (err) => {
      if (err) {
        resolve(false);
      } else {
        server.close(() => {
          resolve(true);
        });
      }
    });
  });
}

/**
 * Find the first available port starting from the given port
 * @param {number} startPort - Starting port number (default: 4000)
 * @return {Promise<number>} Available port number
 */
async function findAvailablePort(startPort = 4000) {
  let port = startPort;
  while (port < startPort + 10) {
    if (await checkPort(port)) {
      return port;
    }
    port++;
  }
  throw new Error('No available ports found in range');
}

/**
 * Validate input parameters for TCO calculation
 * @param {Object} params - Input parameters to validate
 * @throws {Error} If validation fails
 */
function validateInput(params) {
  const {
    airRacks, airPowerPerRack, airRackCost, airPUE,
    immersionTanks, immersionPowerPerTank, immersionTankCost, immersionPUE,
    analysisYears, electricityPrice, discountRate, maintenanceCost
  } = params;

  // Air cooling validation
  if (!Number.isInteger(airRacks) || airRacks < 1 || airRacks > 1000) {
    throw new Error('Air racks must be integer between 1 and 1000');
  }
  if (airPowerPerRack < 1 || airPowerPerRack > 100) {
    throw new Error('Air power per rack must be between 1 and 100 kW');
  }
  if (airRackCost < 10000 || airRackCost > 500000) {
    throw new Error('Air rack cost must be between $10,000 and $500,000');
  }
  if (airPUE < 1.0 || airPUE > 3.0) {
    throw new Error('Air PUE must be between 1.0 and 3.0');
  }

  // Immersion cooling validation
  if (!Number.isInteger(immersionTanks) || immersionTanks < 1 || immersionTanks > 500) {
    throw new Error('Immersion tanks must be integer between 1 and 500');
  }
  if (immersionPowerPerTank < 5 || immersionPowerPerTank > 200) {
    throw new Error('Immersion power per tank must be between 5 and 200 kW');
  }
  if (immersionTankCost < 20000 || immersionTankCost > 1000000) {
    throw new Error('Immersion tank cost must be between $20,000 and $1,000,000');
  }
  if (immersionPUE < 1.0 || immersionPUE > 2.0) {
    throw new Error('Immersion PUE must be between 1.0 and 2.0');
  }

  // Analysis parameters validation
  if (!Number.isInteger(analysisYears) || analysisYears < 1 || analysisYears > 20) {
    throw new Error('Analysis years must be integer between 1 and 20');
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
}

/**
 * Calculate Total Cost of Ownership with comprehensive financial analysis
 * @param {Object} params - Calculation parameters
 * @return {Object} Detailed TCO analysis results
 */
function calculateTCO(params) {
  // Extract and set defaults for all parameters
  const {
    airRacks, 
    airPowerPerRack = 20, 
    airRackCost = 50000, 
    airPUE = 1.8,
    immersionTanks, 
    immersionPowerPerTank = 23, 
    immersionTankCost = 80000, 
    immersionPUE = 1.1,
    analysisYears, 
    electricityPrice = 0.12, 
    discountRate = 5, 
    maintenanceCost = 3
  } = params;

  // Input validation
  validateInput(params);

  // Convert percentage rates to decimals
  const discountRateDecimal = discountRate / 100;
  const maintenanceRateDecimal = maintenanceCost / 100;

  // Air cooling calculations
  const airTotalPower = airRacks * airPowerPerRack; // Total IT power in kW
  const airTotalWithPUE = airTotalPower * airPUE; // Total facility power including cooling
  const airCAPEX = airRacks * airRackCost; // Capital expenditure
  const airAnnualElectricity = airTotalWithPUE * 8760 * electricityPrice; // 8760 hours per year
  const airAnnualMaintenance = airCAPEX * maintenanceRateDecimal; // Annual maintenance cost
  const airAnnualOPEX = airAnnualElectricity + airAnnualMaintenance; // Total annual operating cost

  // Immersion cooling calculations  
  const immersionTotalPower = immersionTanks * immersionPowerPerTank;
  const immersionTotalWithPUE = immersionTotalPower * immersionPUE;
  const immersionCAPEX = immersionTanks * immersionTankCost;
  const immersionAnnualElectricity = immersionTotalWithPUE * 8760 * electricityPrice;
  const immersionAnnualMaintenance = immersionCAPEX * maintenanceRateDecimal;
  const immersionAnnualOPEX = immersionAnnualElectricity + immersionAnnualMaintenance;

  // Multi-year TCO calculation with Net Present Value (NPV)
  let airTCO = airCAPEX; // Start with initial CAPEX
  let immersionTCO = immersionCAPEX;

  // Add discounted OPEX for each year
  for (let year = 1; year <= analysisYears; year++) {
    const discountFactor = Math.pow(1 + discountRateDecimal, year);
    airTCO += airAnnualOPEX / discountFactor;
    immersionTCO += immersionAnnualOPEX / discountFactor;
  }

  // Financial analysis calculations
  const totalSavings = airTCO - immersionTCO;
  const annualSavings = airAnnualOPEX - immersionAnnualOPEX;
  const capexDifference = immersionCAPEX - airCAPEX; // Additional upfront investment
  const paybackYears = capexDifference > 0 ? capexDifference / annualSavings : 0;
  const roiPercent = totalSavings / immersionCAPEX * 100;

  // Energy efficiency calculations
  const pueImprovement = ((airPUE - immersionPUE) / airPUE) * 100;
  const annualEnergySavings = (airTotalWithPUE - immersionTotalWithPUE) * 8760 / 1000; // MWh per year
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
        annualConsumptionMWh: Math.round(airTotalWithPUE * 8760 / 1000)
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
        annualConsumptionMWh: Math.round(immersionTotalWithPUE * 8760 / 1000)
      }
    },
    comparison: {
      savings: {
        totalSavings: Math.round(totalSavings),
        annualSavings: Math.round(annualSavings),
        capexDifference: Math.round(capexDifference),
        paybackYears: Math.round(paybackYears * 10) / 10, // Round to 1 decimal
        roiPercent: Math.round(roiPercent * 10) / 10
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
 * Create and start the HTTP server
 * @param {number} port - Port number for the server
 * @return {http.Server} HTTP server instance
 */
function createServer(port) {
  const server = http.createServer((req, res) => {
    // Enable CORS for cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // API endpoint for TCO calculations
    if (req.method === 'POST' && req.url === '/api/calculate') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          console.log('📊 Processing TCO calculation request:', {
            airRacks: data.airRacks,
            immersionTanks: data.immersionTanks,
            years: data.analysisYears
          });
          
          const result = calculateTCO(data);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result, null, 2));
          
          console.log('✅ Calculation completed:', {
            totalSavings: result.comparison.savings.totalSavings,
            payback: result.comparison.savings.paybackYears + ' years',
            roi: result.comparison.savings.roiPercent + '%'
          });
        } catch (error) {
          console.error('❌ API Error:', error.message);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      return;
    }

    // Serve the main web interface
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html>
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
            margin-bottom: 40px;
            padding: 30px;
            background: rgba(255,255,255,0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
        }
        .header h1 { font-size: 3rem; margin-bottom: 15px; }
        .header p { font-size: 1.2rem; opacity: 0.9; }
        .status-bar {
            display: inline-block;
            padding: 8px 16px;
            background: rgba(76, 175, 80, 0.2);
            border: 1px solid rgba(76, 175, 80, 0.3);
            border-radius: 25px;
            font-size: 0.9rem;
            margin-top: 15px;
        }
        .form-section {
            background: rgba(255,255,255,0.95);
            color: #333;
            padding: 40px;
            border-radius: 20px;
            margin-bottom: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
        }
        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 1.5rem;
            margin-bottom: 25px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
            color: #333;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #555;
        }
        .form-group input, .form-group select {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e1e5e9;
            border-radius: 10px;
            font-size: 1rem;
            transition: all 0.3s ease;
            background: white;
        }
        .form-group input:focus, .form-group select:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .calculate-btn {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 15px;
            font-size: 1.2rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 20px;
        }
        .calculate-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }
        .results-section {
            display: none;
            background: rgba(255,255,255,0.95);
            color: #333;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
        }
        .results-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 25px;
            margin-bottom: 30px;
        }
        .result-card {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            border-left: 5px solid;
        }
        .result-card.air { border-left-color: #FF6B6B; }
        .result-card.immersion { border-left-color: #4ECDC4; }
        .result-card.savings { border-left-color: #45B7D1; }
        .result-card h3 { 
            font-size: 1.1rem; 
            margin-bottom: 15px; 
            color: #333; 
            display: flex; 
            align-items: center; 
            gap: 8px; 
        }
        .result-value {
            font-size: 1.8rem;
            font-weight: 700;
            margin-bottom: 8px;
            color: #2c3e50;
        }
        .result-subtitle {
            font-size: 0.9rem;
            color: #666;
            margin-bottom: 5px;
        }
        .savings-highlight {
            text-align: center;
            padding: 30px;
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            border-radius: 20px;
            margin-bottom: 30px;
            box-shadow: 0 15px 35px rgba(76, 175, 80, 0.3);
        }
        .savings-value {
            font-size: 3rem;
            font-weight: 800;
            margin: 15px 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .chart-container {
            background: rgba(255,255,255,0.95);
            padding: 20px;
            border-radius: 15px;
            margin: 20px 0;
            box-shadow: 0 8px 30px rgba(0,0,0,0.1);
        }
        .chart-switcher {
            background: rgba(255, 255, 255, 0.95);
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            margin-bottom: 20px;
        }
        .view-buttons {
            display: flex;
            justify-content: center;
            gap: 10px;
            flex-wrap: wrap;
        }
        .view-btn {
            padding: 10px 20px;
            border: 2px solid #667eea;
            background: transparent;
            color: #667eea;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 600;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        }
        .view-btn:hover {
            background: #667eea;
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        .view-btn.active {
            background: #667eea;
            color: white;
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        .single-chart-container {
            background: rgba(255, 255, 255, 0.95);
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            text-align: center;
        }
        .grid-charts {
            background: rgba(255, 255, 255, 0.95);
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
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
            .view-buttons { flex-direction: column; align-items: center; }
            .grid-charts div[style*="grid-template-columns"] {
                grid-template-columns: 1fr !important;
            }
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
                
                <!-- Chart View Switcher -->
                <div class="chart-switcher">
                    <h4 style="text-align: center; color: #333; margin-bottom: 15px;">📊 Data Visualization</h4>
                    <div class="view-buttons">
                        <button class="view-btn active" onclick="switchView('comparison')" id="btn-comparison">📊 TCO Comparison</button>
                        <button class="view-btn" onclick="switchView('breakdown')" id="btn-breakdown">🥧 Cost Breakdown</button>
                        <button class="view-btn" onclick="switchView('timeline')" id="btn-timeline">📈 Savings Timeline</button>
                        <button class="view-btn" onclick="switchView('grid')" id="btn-grid">⊞ All Charts</button>
                    </div>
                </div>
                
                <!-- Single Chart Container -->
                <div id="singleChartView" class="single-chart-container">
                    <canvas id="activeChart" width="800" height="400"></canvas>
                </div>
                
                <!-- Grid View Container -->
                <div id="gridChartView" class="grid-charts" style="display: none;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 15px; margin-bottom: 15px;">
                        <div class="chart-container" style="padding: 15px;">
                            <h5 style="text-align: center; color: #333; margin-bottom: 10px; font-size: 1rem;">TCO Comparison</h5>
                            <canvas id="tcoChart" width="350" height="250"></canvas>
                        </div>
                        <div class="chart-container" style="padding: 15px;">
                            <h5 style="text-align: center; color: #333; margin-bottom: 10px; font-size: 1rem;">Cost Breakdown</h5>
                            <canvas id="pieChart" width="350" height="250"></canvas>
                        </div>
                        <div class="chart-container" style="padding: 15px;">
                            <h5 style="text-align: center; color: #333; margin-bottom: 10px; font-size: 1rem;">Savings Timeline</h5>
                            <canvas id="savingsChart" width="350" height="250"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // Global chart instances for management
        let tcoChart = null;
        let pieChart = null;
        let savingsChart = null;
        let activeChart = null;
        let currentView = 'comparison';
        let chartData = null;
        
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
                    throw new Error('Server responded with status: ' + response.status);
                }
                
                const result = await response.json();
                chartData = result;
                displayResults(result);
                
                setTimeout(() => {
                    loading.style.display = 'none';
                    content.style.display = 'block';
                }, 800);
                
            } catch (err) {
                loading.style.display = 'none';
                const errorData = err.response ? await err.response.json() : { error: err.message };
                alert('❌ Calculation Error: ' + errorData.error);
            }
        }
        
        /**
         * Switch between different chart views
         * @param {string} view - View type: 'comparison', 'breakdown', 'timeline', 'grid'
         */
        function switchView(view) {
            currentView = view;
            
            // Update button states
            document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById(\`btn-\${view}\`).classList.add('active');
            
            // Get containers
            const singleView = document.getElementById('singleChartView');
            const gridView = document.getElementById('gridChartView');
            
            if (view === 'grid') {
                // Hide single view first
                singleView.style.display = 'none';
                
                // Show grid view and wait for layout
                gridView.style.display = 'block';
                gridView.style.opacity = '0';
                
                // Update charts after container is visible
                if (chartData) {
                    updateGridCharts(chartData);
                    
                    // Fade in after charts are ready
                    setTimeout(() => {
                        gridView.style.transition = 'opacity 0.3s ease';
                        gridView.style.opacity = '1';
                    }, 100);
                }
            } else {
                // Hide grid view
                gridView.style.display = 'none';
                gridView.style.opacity = '1';
                gridView.style.transition = 'none';
                
                // Show single view
                singleView.style.display = 'block';
                
                if (chartData) updateSingleChart(chartData, view);
            }
        }
        
        /**
         * Update single active chart based on view type
         * @param {Object} data - TCO calculation results
         * @param {string} view - Chart type to display
         */
        function updateSingleChart(data, view) {
            if (activeChart) {
                activeChart.destroy();
            }
            
            const ctx = document.getElementById('activeChart').getContext('2d');
            
            switch (view) {
                case 'comparison':
                    activeChart = createTCOChart(ctx, data);
                    break;
                case 'breakdown':
                    activeChart = createPieChart(ctx, data);
                    break;
                case 'timeline':
                    activeChart = createSavingsChart(ctx, data);
                    break;
            }
        }
        
        /**
         * Update all charts in grid view
         * @param {Object} data - TCO calculation results
         */
        function updateGridCharts(data) {
            // Destroy existing charts
            if (tcoChart) tcoChart.destroy();
            if (pieChart) pieChart.destroy();
            if (savingsChart) savingsChart.destroy();
            
            // Wait for DOM to be fully visible before creating charts
            setTimeout(() => {
                const tcoCtx = document.getElementById('tcoChart').getContext('2d');
                const pieCtx = document.getElementById('pieChart').getContext('2d');
                const savingsCtx = document.getElementById('savingsChart').getContext('2d');
                
                tcoChart = createTCOChart(tcoCtx, data, 'grid');
                pieChart = createPieChart(pieCtx, data, 'grid');
                savingsChart = createSavingsChart(savingsCtx, data, 'grid');
                
                // Force resize after creation to fix stretching
                requestAnimationFrame(() => {
                    if (tcoChart) tcoChart.resize();
                    if (pieChart) pieChart.resize();
                    if (savingsChart) savingsChart.resize();
                });
            }, 50);
        }
        
        /**
         * Create TCO comparison bar chart
         * @param {CanvasRenderingContext2D} ctx - Canvas context
         * @param {Object} data - TCO calculation results
         * @return {Chart} Chart.js instance
         */
        function createTCOChart(ctx, data, mode = 'single') {
            const { airCooling, immersionCooling, parameters } = data;
            
            return new Chart(ctx, {
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
                        label: \`OPEX (\${parameters.analysisYears} years)\`,
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
                    maintainAspectRatio: true,
                    aspectRatio: mode === 'grid' ? 1.4 : 2,
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
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': $' + context.parsed.y.toLocaleString();
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { color: '#333', font: { size: 12, weight: '600' } }
                        },
                        y: {
                            grid: { color: 'rgba(0, 0, 0, 0.1)' },
                            ticks: {
                                color: '#333',
                                font: { size: 12 },
                                callback: function(value) {
                                    return '$' + (value / 1000).toFixed(0) + 'k';
                                }
                            }
                        }
                    }
                }
            });
        }
        
        /**
         * Create cost breakdown pie chart
         * @param {CanvasRenderingContext2D} ctx - Canvas context
         * @param {Object} data - TCO calculation results
         * @return {Chart} Chart.js instance
         */
        function createPieChart(ctx, data, mode = 'single') {
            const { airCooling, immersionCooling } = data;
            
            return new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: [
                        'Air CAPEX', 'Air OPEX',
                        'Immersion CAPEX', 'Immersion OPEX'
                    ],
                    datasets: [{
                        data: [
                            airCooling.costs.capex,
                            airCooling.costs.annualOpex * data.parameters.analysisYears,
                            immersionCooling.costs.capex,
                            immersionCooling.costs.annualOpex * data.parameters.analysisYears
                        ],
                        backgroundColor: [
                            colors.airCooling.primary,
                            colors.airCooling.secondary,
                            colors.immersion.primary,
                            colors.immersion.secondary
                        ],
                        borderColor: '#fff',
                        borderWidth: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 1,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#333',
                                font: { size: 12, weight: '600' },
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            callbacks: {
                                label: function(context) {
                                    const percentage = ((context.parsed / context.dataset.data.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                                    return context.label + ': $' + context.parsed.toLocaleString() + ' (' + percentage + '%)';
                                }
                            }
                        }
                    }
                }
            });
        }
        
        /**
         * Create savings timeline chart
         * @param {CanvasRenderingContext2D} ctx - Canvas context
         * @param {Object} data - TCO calculation results
         * @return {Chart} Chart.js instance
         */
        function createSavingsChart(ctx, data, mode = 'single') {
            const yearsData = Array.from({length: data.parameters.analysisYears}, (_, i) => i + 1);
            const cumulativeSavings = yearsData.map(year => {
                // Calculate cumulative savings with discount factor
                let cumulative = 0;
                for (let y = 1; y <= year; y++) {
                    const discountFactor = Math.pow(1 + (data.parameters.discountRate / 100), y);
                    cumulative += data.comparison.savings.annualSavings / discountFactor;
                }
                return Math.round(cumulative - data.comparison.savings.capexDifference);
            });
            
            return new Chart(ctx, {
                type: 'line',
                data: {
                    labels: yearsData.map(year => \`Year \${year}\`),
                    datasets: [{
                        label: 'Cumulative Savings',
                        data: cumulativeSavings,
                        backgroundColor: colors.accent.success,
                        borderColor: colors.accent.success,
                        borderWidth: 4,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: colors.accent.success,
                        pointBorderWidth: 3,
                        pointRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: mode === 'grid' ? 1.4 : 2,
                    plugins: {
                        legend: {
                            display: true,
                            labels: {
                                color: '#333',
                                font: { size: 14, weight: '600' }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            callbacks: {
                                label: function(context) {
                                    const value = context.parsed.y;
                                    const prefix = value >= 0 ? 'Savings: $' : 'Loss: -$';
                                    return prefix + Math.abs(value).toLocaleString();
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { color: '#333', font: { size: 12, weight: '600' } }
                        },
                        y: {
                            grid: { color: 'rgba(0, 0, 0, 0.1)' },
                            ticks: {
                                color: '#333',
                                font: { size: 12 },
                                callback: function(value) {
                                    return '$' + (value / 1000).toFixed(0) + 'k';
                                }
                            }
                        }
                    }
                }
            });
        }
        
        /**
         * Client-side input validation
         * @param {Object} data - Form input data
         * @throws {Error} If validation fails
         */
        function validateInputs(data) {
            if (!Number.isInteger(data.airRacks) || data.airRacks < 1 || data.airRacks > 1000) {
                throw new Error('Air racks must be between 1 and 1000');
            }
            if (!Number.isInteger(data.immersionTanks) || data.immersionTanks < 1 || data.immersionTanks > 500) {
                throw new Error('Immersion tanks must be between 1 and 500');
            }
            if (!Number.isInteger(data.analysisYears) || data.analysisYears < 1 || data.analysisYears > 20) {
                throw new Error('Analysis years must be between 1 and 20');
            }
        }
        
        /**
         * Display comprehensive calculation results
         * @param {Object} data - TCO calculation results from API
         */
        function displayResults(data) {
            const { airCooling, immersionCooling, comparison, parameters } = data;
            
            // Update savings highlight
            const savingsHighlight = document.getElementById('savingsHighlight');
            const totalSavings = comparison.savings.totalSavings;
            const isPositive = totalSavings >= 0;
            
            savingsHighlight.innerHTML = \`
                <h2>\${isPositive ? '💰 Total Savings' : '💸 Additional Cost'}</h2>
                <div class="savings-value">\${isPositive ? '$' : '-$'}\${Math.abs(totalSavings).toLocaleString()}</div>
                <p>Over \${parameters.analysisYears} year\${parameters.analysisYears > 1 ? 's' : ''} • ROI: \${comparison.savings.roiPercent}% • Payback: \${comparison.savings.paybackYears} years</p>
            \`;
            
            if (!isPositive) {
                savingsHighlight.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
            }
            
            // Update results grid
            const resultsGrid = document.getElementById('resultsGrid');
            resultsGrid.innerHTML = \`
                <div class="result-card air">
                    <h3>🌪️ Air Cooling System</h3>
                    <div class="result-subtitle">Equipment: \${airCooling.equipment.count} × 42U Racks</div>
                    <div class="result-value">$\${airCooling.costs.totalTCO.toLocaleString()}</div>
                    <div class="result-subtitle">Total Cost of Ownership</div>
                    <div style="margin-top: 10px; font-size: 0.85rem; color: #666;">
                        CAPEX: $\${airCooling.costs.capex.toLocaleString()}<br>
                        Annual OPEX: $\${airCooling.costs.annualOpex.toLocaleString()}<br>
                        Power: \${airCooling.equipment.totalPowerKW}kW • PUE: \${airCooling.equipment.pue}
                    </div>
                </div>
                
                <div class="result-card immersion">
                    <h3>🧊 Immersion Cooling</h3>
                    <div class="result-subtitle">Equipment: \${immersionCooling.equipment.count} × Immersion Tanks</div>
                    <div class="result-value">$\${immersionCooling.costs.totalTCO.toLocaleString()}</div>
                    <div class="result-subtitle">Total Cost of Ownership</div>
                    <div style="margin-top: 10px; font-size: 0.85rem; color: #666;">
                        CAPEX: $\${immersionCooling.costs.capex.toLocaleString()}<br>
                        Annual OPEX: $\${immersionCooling.costs.annualOpex.toLocaleString()}<br>
                        Power: \${immersionCooling.equipment.totalPowerKW}kW • PUE: \${immersionCooling.equipment.pue}
                    </div>
                </div>
                
                <div class="result-card savings">
                    <h3>⚡ Efficiency Benefits</h3>
                    <div class="result-subtitle">PUE Improvement</div>
                    <div class="result-value">\${comparison.efficiency.pueImprovement}%</div>
                    <div class="result-subtitle">Power Usage Effectiveness</div>
                    <div style="margin-top: 10px; font-size: 0.85rem; color: #666;">
                        Energy Savings: \${comparison.efficiency.annualEnergySavingsMWh} MWh/year<br>
                        CO₂ Reduction: \${comparison.efficiency.annualCarbonReductionTons} tons/year<br>
                        Annual Savings: $\${comparison.savings.annualSavings.toLocaleString()}
                    </div>
                </div>
            \`;
            
            // Initialize charts with default view
            updateSingleChart(data, currentView);
        }
    </script>
</body>
</html>`);
      return;
    }

    // 404 for all other routes
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  return server;
}

/**
 * Main function to start the TCO Calculator server
 * Finds available port and starts the HTTP server
 */
async function main() {
  try {
    console.log('🔍 Finding available port...');
    const port = await findAvailablePort();
    
    const server = createServer(port);
    
    server.listen(port, () => {
      console.log('╔══════════════════════════════════════════════╗');
      console.log('║           🧊 TCO Calculator Started         ║');
      console.log('╠══════════════════════════════════════════════╣');
      console.log(`║  🌐 URL: http://localhost:${port}               ║`);
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
      console.log(`💡 Open your browser and navigate to: http://localhost:${port}`);
    });

    // Graceful shutdown handling
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down TCO Calculator server...');
      server.close(() => {
        console.log('✅ Server stopped successfully');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  main();
}

module.exports = { calculateTCO, createServer, findAvailablePort };