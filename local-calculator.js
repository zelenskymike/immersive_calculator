#!/usr/bin/env node

const http = require('http');
const url = require('url');
const querystring = require('querystring');

// Create HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Handle API requests
  if (pathname === '/api/calculate' && req.method === 'POST') {
    handleCalculation(req, res);
    return;
  }
  
  // Serve the main calculator page
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.writeHead(200);
  res.end(getCalculatorHTML());
});

function handleCalculation(req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      const result = calculateTCO(data);
      
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify(result, null, 2));
    } catch (error) {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid request: ' + error.message }));
    }
  });
}

function calculateTCO(input) {
  // Parse input parameters with defaults
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
    maintenanceCost = 3,
    currency = 'USD'
  } = input;
  
  const discountRateDecimal = discountRate / 100;
  const maintenanceCostDecimal = maintenanceCost / 100;
  
  // Calculate total power requirements
  const airTotalPower = airRacks * airPowerPerRack; // kW
  const immersionTotalPower = immersionTanks * immersionPowerPerTank; // kW
  
  // CAPEX Calculations
  const airCAPEX = airRacks * airRackCost;
  const immersionCAPEX = immersionTanks * immersionTankCost;
  
  // Annual Energy Consumption (kWh per year)
  const hoursPerYear = 8760;
  const airAnnualEnergy = airTotalPower * hoursPerYear * airPUE;
  const immersionAnnualEnergy = immersionTotalPower * hoursPerYear * immersionPUE;
  
  // Annual Electricity Costs
  const airAnnualElectricity = airAnnualEnergy * electricityPrice;
  const immersionAnnualElectricity = immersionAnnualEnergy * electricityPrice;
  
  // Annual Maintenance Costs (% of CAPEX)
  const airAnnualMaintenance = airCAPEX * maintenanceCostDecimal;
  const immersionAnnualMaintenance = immersionCAPEX * maintenanceCostDecimal;
  
  // Total Annual OPEX
  const airAnnualOPEX = airAnnualElectricity + airAnnualMaintenance;
  const immersionAnnualOPEX = immersionAnnualElectricity + immersionAnnualMaintenance;
  
  // Calculate NPV (Net Present Value) for multi-year analysis
  function calculateNPV(capex, annualOpex, years, discountRate) {
    let totalCost = capex;
    for (let year = 1; year <= years; year++) {
      const presentValue = annualOpex / Math.pow(1 + discountRate, year);
      totalCost += presentValue;
    }
    return totalCost;
  }
  
  const airTCO = calculateNPV(airCAPEX, airAnnualOPEX, analysisYears, discountRateDecimal);
  const immersionTCO = calculateNPV(immersionCAPEX, immersionAnnualOPEX, analysisYears, discountRateDecimal);
  
  // Savings calculations
  const totalSavings = airTCO - immersionTCO;
  const annualSavings = airAnnualOPEX - immersionAnnualOPEX;
  const capexDifference = immersionCAPEX - airCAPEX;
  const paybackPeriod = Math.abs(capexDifference / annualSavings);
  const roi = (totalSavings / immersionCAPEX) * 100;
  
  // Energy and environmental benefits
  const annualEnergySavings = (airAnnualEnergy - immersionAnnualEnergy) / 1000; // MWh
  const pueImprovement = ((airPUE - immersionPUE) / airPUE) * 100;
  
  // Carbon footprint (assuming 0.4 kg CO2/kWh grid average)
  const carbonReduction = (annualEnergySavings * 1000 * 0.4) / 1000; // tons CO2/year
  
  return {
    timestamp: new Date().toISOString(),
    calculationId: 'calc_' + Date.now(),
    currency: currency,
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

function getCalculatorHTML() {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🧊 TCO Калькулятор - Иммерсионное охлаждение</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            line-height: 1.6;
        }
        
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
        .header p { font-size: 1.1rem; opacity: 0.9; }
        
        .form-section {
            background: rgba(255,255,255,0.15);
            padding: 30px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 1.4rem;
            margin-bottom: 20px;
            color: #4CAF50;
            border-bottom: 2px solid #4CAF50;
            padding-bottom: 10px;
        }
        
        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 30px;
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
            transform: translateY(-1px);
        }
        
        .calculate-btn {
            width: 100%;
            max-width: 400px;
            margin: 30px auto 0;
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
            margin-top: 40px;
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
        
        .error {
            background: rgba(244, 67, 54, 0.2);
            border: 1px solid #f44336;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: center;
        }
        
        .comparison-table {
            width: 100%;
            margin: 20px 0;
            border-collapse: collapse;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            overflow: hidden;
        }
        .comparison-table th, .comparison-table td {
            padding: 15px;
            text-align: center;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .comparison-table th {
            background: rgba(76, 175, 80, 0.3);
            font-weight: bold;
        }
        .comparison-table tr:hover {
            background: rgba(255,255,255,0.05);
        }
        
        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #4CAF50;
            margin-right: 8px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        @media (max-width: 768px) {
            .container { padding: 15px; }
            .header h1 { font-size: 2rem; }
            .form-grid { grid-template-columns: 1fr; }
            .results-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧊 TCO Калькулятор</h1>
            <p><span class="status-indicator"></span>Сравнение иммерсионного и воздушного охлаждения дата-центров</p>
        </div>
        
        <div class="form-section">
            <div class="form-grid">
                <div>
                    <h3 class="section-title">🌪️ Воздушное охлаждение</h3>
                    <div class="form-group">
                        <label for="airRacks">Количество стоек 42U:</label>
                        <input type="number" id="airRacks" value="10" min="1" max="1000">
                    </div>
                    <div class="form-group">
                        <label for="airPowerPerRack">Мощность на стойку (кВт):</label>
                        <input type="number" id="airPowerPerRack" value="20" min="1" max="50" step="0.5">
                    </div>
                    <div class="form-group">
                        <label for="airRackCost">Стоимость стойки ($):</label>
                        <input type="number" id="airRackCost" value="50000" min="10000" max="200000" step="1000">
                    </div>
                    <div class="form-group">
                        <label for="airPUE">PUE (коэффициент эффективности):</label>
                        <input type="number" id="airPUE" value="1.8" min="1.2" max="3.0" step="0.1">
                    </div>
                </div>
                
                <div>
                    <h3 class="section-title">🧊 Иммерсионное охлаждение</h3>
                    <div class="form-group">
                        <label for="immersionTanks">Количество емкостей:</label>
                        <input type="number" id="immersionTanks" value="9" min="1" max="500">
                    </div>
                    <div class="form-group">
                        <label for="immersionPowerPerTank">Мощность на емкость (кВт):</label>
                        <input type="number" id="immersionPowerPerTank" value="23" min="10" max="100" step="0.5">
                    </div>
                    <div class="form-group">
                        <label for="immersionTankCost">Стоимость емкости ($):</label>
                        <input type="number" id="immersionTankCost" value="80000" min="20000" max="300000" step="1000">
                    </div>
                    <div class="form-group">
                        <label for="immersionPUE">PUE (коэффициент эффективности):</label>
                        <input type="number" id="immersionPUE" value="1.1" min="1.0" max="1.5" step="0.1">
                    </div>
                </div>
            </div>
            
            <div style="max-width: 800px; margin: 30px auto 0;">
                <h3 class="section-title">📊 Параметры расчета</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px;">
                    <div class="form-group">
                        <label for="analysisYears">Период анализа:</label>
                        <select id="analysisYears">
                            <option value="1">1 год</option>
                            <option value="3">3 года</option>
                            <option value="5" selected>5 лет</option>
                            <option value="7">7 лет</option>
                            <option value="10">10 лет</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="electricityPrice">Электричество ($/кВт·ч):</label>
                        <input type="number" id="electricityPrice" value="0.12" min="0.05" max="0.50" step="0.01">
                    </div>
                    <div class="form-group">
                        <label for="discountRate">Дисконтирование (%):</label>
                        <input type="number" id="discountRate" value="5" min="0" max="20" step="0.5">
                    </div>
                    <div class="form-group">
                        <label for="maintenanceCost">Обслуживание (%):</label>
                        <input type="number" id="maintenanceCost" value="3" min="1" max="10" step="0.5">
                    </div>
                </div>
            </div>
            
            <button class="calculate-btn" onclick="calculateTCO()">🧮 Рассчитать TCO</button>
        </div>
        
        <div class="results-section" id="results">
            <div id="loadingIndicator" class="loading">
                <div style="font-size: 2rem; margin-bottom: 10px;">⚡</div>
                Выполняем расчет TCO...
            </div>
            
            <div id="resultsContent" style="display: none;">
                <div class="savings-highlight" id="savingsHighlight"></div>
                <div class="results-grid" id="resultsGrid"></div>
                <div class="chart-container">
                    <canvas id="tcoChart" width="400" height="200"></canvas>
                </div>
                <div id="comparisonTable"></div>
            </div>
            
            <div id="errorMessage" class="error" style="display: none;"></div>
        </div>
    </div>
    
    <script>
        let tcoChart = null;
        
        async function calculateTCO() {
            const results = document.getElementById('results');
            const loading = document.getElementById('loadingIndicator');
            const content = document.getElementById('resultsContent');
            const error = document.getElementById('errorMessage');
            
            results.style.display = 'block';
            loading.style.display = 'block';
            content.style.display = 'none';
            error.style.display = 'none';
            
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
                }, 500);
                
            } catch (err) {
                loading.style.display = 'none';
                error.style.display = 'block';
                error.innerHTML = '<h3>❌ Ошибка расчета</h3><p>' + err.message + '</p>';
                console.error('Calculation error:', err);
            }
        }
        
        function displayResults(result) {
            const { airCooling, immersionCooling, comparison } = result;
            
            // Savings highlight
            const savingsHighlight = document.getElementById('savingsHighlight');
            savingsHighlight.innerHTML = \`
                <h3>💰 Экономия от иммерсионного охлаждения</h3>
                <div class="savings-value">$\${formatNumber(comparison.savings.totalSavings)}</div>
                <div style="font-size: 1.2rem;">
                    за \${result.parameters.analysisYears} лет • 
                    ROI: \${comparison.savings.roiPercent}% • 
                    Окупаемость: \${comparison.savings.paybackYears} лет
                </div>
                <div style="margin-top: 15px; font-size: 1.1rem;">
                    PUE улучшение: \${comparison.efficiency.pueImprovement}% • 
                    Экономия энергии: \${comparison.efficiency.annualEnergySavingsMWh} МВт·ч/год
                </div>
            \`;
            
            // Results grid
            const resultsGrid = document.getElementById('resultsGrid');
            resultsGrid.innerHTML = \`
                <div class="result-card">
                    <h4>CAPEX - Воздушное</h4>
                    <div class="result-value">$\${formatNumber(airCooling.costs.capex)}</div>
                    <div class="result-subtitle">\${airCooling.equipment.count} стоек • \${airCooling.equipment.totalPowerKW} кВт</div>
                </div>
                <div class="result-card">
                    <h4>CAPEX - Иммерсионное</h4>
                    <div class="result-value">$\${formatNumber(immersionCooling.costs.capex)}</div>
                    <div class="result-subtitle">\${immersionCooling.equipment.count} емкостей • \${immersionCooling.equipment.totalPowerKW} кВт</div>
                </div>
                <div class="result-card">
                    <h4>OPEX - Воздушное</h4>
                    <div class="result-value">$\${formatNumber(airCooling.costs.annualOpex)}/год</div>
                    <div class="result-subtitle">PUE: \${airCooling.equipment.pue} • \${airCooling.energy.annualConsumptionMWh} МВт·ч/год</div>
                </div>
                <div class="result-card">
                    <h4>OPEX - Иммерсионное</h4>
                    <div class="result-value">$\${formatNumber(immersionCooling.costs.annualOpex)}/год</div>
                    <div class="result-subtitle">PUE: \${immersionCooling.equipment.pue} • \${immersionCooling.energy.annualConsumptionMWh} МВт·ч/год</div>
                </div>
                <div class="result-card">
                    <h4>TCO - Воздушное</h4>
                    <div class="result-value">$\${formatNumber(airCooling.costs.totalTCO)}</div>
                    <div class="result-subtitle">\${result.parameters.analysisYears} лет</div>
                </div>
                <div class="result-card">
                    <h4>TCO - Иммерсионное</h4>
                    <div class="result-value">$\${formatNumber(immersionCooling.costs.totalTCO)}</div>
                    <div class="result-subtitle">\${result.parameters.analysisYears} лет</div>
                </div>
            \`;
            
            // Comparison table
            const tableDiv = document.getElementById('comparisonTable');
            tableDiv.innerHTML = \`
                <h3 class="section-title">📊 Детальное сравнение</h3>
                <table class="comparison-table">
                    <thead>
                        <tr>
                            <th>Параметр</th>
                            <th>Воздушное охлаждение</th>
                            <th>Иммерсионное охлаждение</th>
                            <th>Разница</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Количество оборудования</strong></td>
                            <td>\${airCooling.equipment.count} стоек</td>
                            <td>\${immersionCooling.equipment.count} емкостей</td>
                            <td>-</td>
                        </tr>
                        <tr>
                            <td><strong>Общая мощность</strong></td>
                            <td>\${airCooling.equipment.totalPowerKW} кВт</td>
                            <td>\${immersionCooling.equipment.totalPowerKW} кВт</td>
                            <td>-</td>
                        </tr>
                        <tr>
                            <td><strong>PUE</strong></td>
                            <td>\${airCooling.equipment.pue}</td>
                            <td>\${immersionCooling.equipment.pue}</td>
                            <td style="color: #4CAF50;"><strong>\${comparison.efficiency.pueImprovement}% лучше</strong></td>
                        </tr>
                        <tr>
                            <td><strong>Годовое потребление энергии</strong></td>
                            <td>\${airCooling.energy.annualConsumptionMWh} МВт·ч</td>
                            <td>\${immersionCooling.energy.annualConsumptionMWh} МВт·ч</td>
                            <td style="color: #4CAF50;"><strong>-\${comparison.efficiency.annualEnergySavingsMWh} МВт·ч</strong></td>
                        </tr>
                        <tr>
                            <td><strong>Годовые затраты на электричество</strong></td>
                            <td>$\${formatNumber(airCooling.costs.annualElectricity)}</td>
                            <td>$\${formatNumber(immersionCooling.costs.annualElectricity)}</td>
                            <td style="color: #4CAF50;"><strong>-$\${formatNumber(airCooling.costs.annualElectricity - immersionCooling.costs.annualElectricity)}</strong></td>
                        </tr>
                        <tr>
                            <td><strong>Сокращение CO₂</strong></td>
                            <td>-</td>
                            <td>\${comparison.efficiency.annualCarbonReductionTons} тонн/год</td>
                            <td style="color: #4CAF50;"><strong>Экологичнее</strong></td>
                        </tr>
                    </tbody>
                </table>
            \`;
            
            createChart(result);
        }
        
        function createChart(result) {
            const { airCooling, immersionCooling, parameters } = result;
            
            if (tcoChart) tcoChart.destroy();
            
            const ctx = document.getElementById('tcoChart').getContext('2d');
            tcoChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Воздушное охлаждение', 'Иммерсионное охлаждение'],
                    datasets: [{
                        label: 'CAPEX',
                        data: [airCooling.costs.capex, immersionCooling.costs.capex],
                        backgroundColor: 'rgba(54, 162, 235, 0.8)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 2
                    }, {
                        label: \`OPEX (\${parameters.analysisYears} лет)\`,
                        data: [
                            airCooling.costs.annualOpex * parameters.analysisYears, 
                            immersionCooling.costs.annualOpex * parameters.analysisYears
                        ],
                        backgroundColor: 'rgba(255, 99, 132, 0.8)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: \`TCO Сравнение за \${parameters.analysisYears} лет\`,
                            font: { size: 16, weight: 'bold' },
                            color: '#333'
                        },
                        legend: {
                            display: true,
                            labels: { color: '#333', font: { size: 14 } }
                        }
                    },
                    scales: {
                        x: { 
                            ticks: { color: '#333', font: { size: 12 } },
                            grid: { color: 'rgba(51, 51, 51, 0.1)' }
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
                        easing: 'easeOutQuart'
                    }
                }
            });
        }
        
        function formatNumber(num) {
            return new Intl.NumberFormat('en-US').format(Math.round(num));
        }
        
        // Auto-calculate immersion tanks based on air cooling power
        function updateImmersionTanks() {
            const airRacks = parseInt(document.getElementById('airRacks').value) || 0;
            const airPower = parseFloat(document.getElementById('airPowerPerRack').value) || 0;
            const totalPower = airRacks * airPower;
            const immersionPowerPerTank = parseFloat(document.getElementById('immersionPowerPerTank').value) || 23;
            const recommendedTanks = Math.ceil(totalPower / immersionPowerPerTank);
            document.getElementById('immersionTanks').value = recommendedTanks;
        }
        
        // Event listeners for auto-calculation
        document.getElementById('airRacks').addEventListener('input', updateImmersionTanks);
        document.getElementById('airPowerPerRack').addEventListener('input', updateImmersionTanks);
        document.getElementById('immersionPowerPerTank').addEventListener('input', updateImmersionTanks);
        
        // Initialize
        updateImmersionTanks();
        
        console.log('🧊 TCO Calculator loaded successfully!');
        console.log('Ready for calculations...');
    </script>
</body>
</html>`;
}

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log('🧊 TCO Calculator Server Started');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(\`🌐 Server running at: http://localhost:\${PORT}\`);
  console.log('📊 Interactive TCO Calculator Ready');
  console.log('🧮 Features:');
  console.log('  • Real-time calculations');
  console.log('  • Interactive charts');
  console.log('  • Detailed cost comparison');
  console.log('  • Energy efficiency analysis');
  console.log('  • Environmental impact');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Ready to calculate TCO savings!');
});

module.exports = { server, calculateTCO };