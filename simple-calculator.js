const http = require('http');

// Create server
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
  
  // Handle API calculation
  if (req.url === '/api/calculate' && req.method === 'POST') {
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
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }
  
  // Serve main page
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.writeHead(200);
  res.end(getHTML());
});

function calculateTCO(input) {
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
  
  // Convert percentages
  const discountRateDecimal = discountRate / 100;
  const maintenanceCostDecimal = maintenanceCost / 100;
  
  // Calculate power
  const airTotalPower = airRacks * airPowerPerRack;
  const immersionTotalPower = immersionTanks * immersionPowerPerTank;
  
  // CAPEX
  const airCAPEX = airRacks * airRackCost;
  const immersionCAPEX = immersionTanks * immersionTankCost;
  
  // Annual energy consumption (kWh)
  const airAnnualEnergy = airTotalPower * 8760 * airPUE;
  const immersionAnnualEnergy = immersionTotalPower * 8760 * immersionPUE;
  
  // Annual costs
  const airAnnualElectricity = airAnnualEnergy * electricityPrice;
  const immersionAnnualElectricity = immersionAnnualEnergy * electricityPrice;
  
  const airAnnualMaintenance = airCAPEX * maintenanceCostDecimal;
  const immersionAnnualMaintenance = immersionCAPEX * maintenanceCostDecimal;
  
  const airAnnualOPEX = airAnnualElectricity + airAnnualMaintenance;
  const immersionAnnualOPEX = immersionAnnualElectricity + immersionAnnualMaintenance;
  
  // TCO calculation with NPV
  let airTCO = airCAPEX;
  let immersionTCO = immersionCAPEX;
  
  for (let year = 1; year <= analysisYears; year++) {
    const discountFactor = Math.pow(1 + discountRateDecimal, year);
    airTCO += airAnnualOPEX / discountFactor;
    immersionTCO += immersionAnnualOPEX / discountFactor;
  }
  
  // Savings
  const totalSavings = airTCO - immersionTCO;
  const annualSavings = airAnnualOPEX - immersionAnnualOPEX;
  const paybackPeriod = Math.abs((immersionCAPEX - airCAPEX) / annualSavings);
  const roi = (totalSavings / immersionCAPEX) * 100;
  const pueImprovement = ((airPUE - immersionPUE) / airPUE) * 100;
  const annualEnergySavings = (airAnnualEnergy - immersionAnnualEnergy) / 1000;
  
  return {
    airCooling: {
      equipment: {
        count: airRacks,
        totalPowerKW: airTotalPower,
        pue: airPUE
      },
      costs: {
        capex: Math.round(airCAPEX),
        annualOpex: Math.round(airAnnualOPEX),
        annualElectricity: Math.round(airAnnualElectricity),
        totalTCO: Math.round(airTCO)
      },
      energy: {
        annualConsumptionMWh: Math.round(airAnnualEnergy / 1000)
      }
    },
    immersionCooling: {
      equipment: {
        count: immersionTanks,
        totalPowerKW: immersionTotalPower,
        pue: immersionPUE
      },
      costs: {
        capex: Math.round(immersionCAPEX),
        annualOpex: Math.round(immersionAnnualOPEX),
        annualElectricity: Math.round(immersionAnnualElectricity),
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
        paybackYears: Math.round(paybackPeriod * 10) / 10,
        roiPercent: Math.round(roi * 10) / 10
      },
      efficiency: {
        pueImprovement: Math.round(pueImprovement * 10) / 10,
        annualEnergySavingsMWh: Math.round(annualEnergySavings)
      }
    },
    parameters: {
      analysisYears: analysisYears
    }
  };
}

function getHTML() {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TCO Калькулятор - Иммерсионное охлаждение</title>
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
        }
        
        .form-section {
            background: rgba(255,255,255,0.15);
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 30px;
            backdrop-filter: blur(10px);
        }
        
        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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
        }
        
        .form-group input, .form-group select {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 8px;
            background: rgba(255,255,255,0.9);
            color: #333;
            font-size: 1rem;
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
        }
        
        .calculate-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(76, 175, 80, 0.4);
        }
        
        .results-section {
            display: none;
            margin-top: 30px;
        }
        
        .results-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .result-card {
            background: rgba(255,255,255,0.15);
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            transition: transform 0.3s;
        }
        
        .result-card:hover {
            transform: translateY(-5px);
        }
        
        .result-card h4 {
            color: #4CAF50;
            margin-bottom: 15px;
        }
        
        .result-value {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .savings-highlight {
            background: linear-gradient(45deg, #4CAF50, #45a049);
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            margin: 30px 0;
        }
        
        .savings-value {
            font-size: 3rem;
            font-weight: bold;
            margin: 20px 0;
        }
        
        .chart-container {
            background: rgba(255,255,255,0.95);
            padding: 25px;
            border-radius: 15px;
            margin: 30px 0;
        }
        
        @media (max-width: 768px) {
            .form-grid { grid-template-columns: 1fr; }
            .results-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧊 TCO Калькулятор</h1>
            <p>Сравнение иммерсионного и воздушного охлаждения дата-центров</p>
        </div>
        
        <div class="form-section">
            <div class="form-grid">
                <div>
                    <h3 class="section-title">🌪️ Воздушное охлаждение</h3>
                    <div class="form-group">
                        <label>Количество стоек 42U:</label>
                        <input type="number" id="airRacks" value="10" min="1">
                    </div>
                    <div class="form-group">
                        <label>Мощность на стойку (кВт):</label>
                        <input type="number" id="airPowerPerRack" value="20" min="1" step="0.5">
                    </div>
                    <div class="form-group">
                        <label>Стоимость стойки ($):</label>
                        <input type="number" id="airRackCost" value="50000" min="1000" step="1000">
                    </div>
                    <div class="form-group">
                        <label>PUE:</label>
                        <input type="number" id="airPUE" value="1.8" min="1.2" max="3.0" step="0.1">
                    </div>
                </div>
                
                <div>
                    <h3 class="section-title">🧊 Иммерсионное охлаждение</h3>
                    <div class="form-group">
                        <label>Количество емкостей:</label>
                        <input type="number" id="immersionTanks" value="9" min="1">
                    </div>
                    <div class="form-group">
                        <label>Мощность на емкость (кВт):</label>
                        <input type="number" id="immersionPowerPerTank" value="23" min="1" step="0.5">
                    </div>
                    <div class="form-group">
                        <label>Стоимость емкости ($):</label>
                        <input type="number" id="immersionTankCost" value="80000" min="1000" step="1000">
                    </div>
                    <div class="form-group">
                        <label>PUE:</label>
                        <input type="number" id="immersionPUE" value="1.1" min="1.0" max="1.5" step="0.1">
                    </div>
                </div>
            </div>
            
            <div style="max-width: 800px; margin: 30px auto 0;">
                <h3 class="section-title">📊 Параметры расчета</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px;">
                    <div class="form-group">
                        <label>Период анализа:</label>
                        <select id="analysisYears">
                            <option value="1">1 год</option>
                            <option value="3">3 года</option>
                            <option value="5" selected>5 лет</option>
                            <option value="10">10 лет</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Электричество ($/кВт·ч):</label>
                        <input type="number" id="electricityPrice" value="0.12" min="0.01" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Дисконтирование (%):</label>
                        <input type="number" id="discountRate" value="5" min="0" step="0.5">
                    </div>
                    <div class="form-group">
                        <label>Обслуживание (%):</label>
                        <input type="number" id="maintenanceCost" value="3" min="1" step="0.5">
                    </div>
                </div>
            </div>
            
            <button class="calculate-btn" onclick="calculateTCO()">🧮 Рассчитать TCO</button>
        </div>
        
        <div class="results-section" id="results">
            <div id="savingsHighlight" class="savings-highlight"></div>
            <div id="resultsGrid" class="results-grid"></div>
            <div class="chart-container">
                <canvas id="tcoChart" width="400" height="200"></canvas>
            </div>
        </div>
    </div>
    
    <script>
        let tcoChart = null;
        
        async function calculateTCO() {
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
                
                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.error || 'Calculation error');
                }
                
                displayResults(result);
                
            } catch (err) {
                alert('Ошибка: ' + err.message);
                console.error(err);
            }
        }
        
        function displayResults(result) {
            const { airCooling, immersionCooling, comparison, parameters } = result;
            
            // Show results section
            document.getElementById('results').style.display = 'block';
            
            // Savings highlight
            document.getElementById('savingsHighlight').innerHTML = 
                '<h3>💰 Экономия от иммерсионного охлаждения</h3>' +
                '<div class="savings-value">$' + formatNumber(comparison.savings.totalSavings) + '</div>' +
                '<div>за ' + parameters.analysisYears + ' лет • ROI: ' + comparison.savings.roiPercent + '% • Окупаемость: ' + comparison.savings.paybackYears + ' лет</div>' +
                '<div style="margin-top: 15px;">PUE улучшение: ' + comparison.efficiency.pueImprovement + '% • Экономия энергии: ' + comparison.efficiency.annualEnergySavingsMWh + ' МВт·ч/год</div>';
            
            // Results grid
            document.getElementById('resultsGrid').innerHTML = 
                '<div class="result-card"><h4>CAPEX - Воздушное</h4><div class="result-value">$' + formatNumber(airCooling.costs.capex) + '</div><div>' + airCooling.equipment.count + ' стоек</div></div>' +
                '<div class="result-card"><h4>CAPEX - Иммерсионное</h4><div class="result-value">$' + formatNumber(immersionCooling.costs.capex) + '</div><div>' + immersionCooling.equipment.count + ' емкостей</div></div>' +
                '<div class="result-card"><h4>OPEX - Воздушное</h4><div class="result-value">$' + formatNumber(airCooling.costs.annualOpex) + '/год</div><div>PUE: ' + airCooling.equipment.pue + '</div></div>' +
                '<div class="result-card"><h4>OPEX - Иммерсионное</h4><div class="result-value">$' + formatNumber(immersionCooling.costs.annualOpex) + '/год</div><div>PUE: ' + immersionCooling.equipment.pue + '</div></div>' +
                '<div class="result-card"><h4>TCO - Воздушное</h4><div class="result-value">$' + formatNumber(airCooling.costs.totalTCO) + '</div><div>' + parameters.analysisYears + ' лет</div></div>' +
                '<div class="result-card"><h4>TCO - Иммерсионное</h4><div class="result-value">$' + formatNumber(immersionCooling.costs.totalTCO) + '</div><div>' + parameters.analysisYears + ' лет</div></div>';
            
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
                        backgroundColor: 'rgba(54, 162, 235, 0.8)'
                    }, {
                        label: 'OPEX (' + parameters.analysisYears + ' лет)',
                        data: [airCooling.costs.annualOpex * parameters.analysisYears, immersionCooling.costs.annualOpex * parameters.analysisYears],
                        backgroundColor: 'rgba(255, 99, 132, 0.8)'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'TCO Сравнение за ' + parameters.analysisYears + ' лет',
                            font: { size: 16 },
                            color: '#333'
                        }
                    },
                    scales: {
                        x: { ticks: { color: '#333' } },
                        y: { 
                            ticks: { 
                                color: '#333',
                                callback: function(value) {
                                    return '$' + (value / 1000000).toFixed(1) + 'M';
                                }
                            }
                        }
                    }
                }
            });
        }
        
        function formatNumber(num) {
            return new Intl.NumberFormat('en-US').format(Math.round(num));
        }
        
        // Auto-update immersion tanks
        function updateImmersionTanks() {
            const airRacks = parseInt(document.getElementById('airRacks').value) || 0;
            const airPower = parseFloat(document.getElementById('airPowerPerRack').value) || 0;
            const totalPower = airRacks * airPower;
            const immersionPowerPerTank = parseFloat(document.getElementById('immersionPowerPerTank').value) || 23;
            const recommendedTanks = Math.ceil(totalPower / immersionPowerPerTank);
            document.getElementById('immersionTanks').value = recommendedTanks;
        }
        
        document.getElementById('airRacks').addEventListener('input', updateImmersionTanks);
        document.getElementById('airPowerPerRack').addEventListener('input', updateImmersionTanks);
        document.getElementById('immersionPowerPerTank').addEventListener('input', updateImmersionTanks);
        
        // Initialize
        updateImmersionTanks();
        console.log('TCO Calculator ready!');
    </script>
</body>
</html>`;
}

const PORT = 4000;
server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🧊 TCO Calculator Server Started');
  console.log('='.repeat(50));
  console.log('🌐 Server: http://localhost:' + PORT);
  console.log('📊 Interactive TCO Calculator Ready');
  console.log('✅ Ready for calculations!');
  console.log('='.repeat(50));
});