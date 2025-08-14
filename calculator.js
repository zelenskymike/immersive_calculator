const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (path === '/api/calculate' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const result = calculateTCO(data);
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify(result));
      } catch (error) {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON input' }));
      }
    });
    return;
  }
  
  // Serve the calculator interface
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.writeHead(200);
  
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🧊 TCO Калькулятор - Иммерсионное охлаждение</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header {
            text-align: center;
            margin-bottom: 40px;
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.1em; opacity: 0.9; }
        
        .calculator-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }
        @media (max-width: 768px) {
            .calculator-grid { grid-template-columns: 1fr; }
        }
        
        .input-section {
            background: rgba(255,255,255,0.15);
            padding: 30px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }
        
        .section-title {
            font-size: 1.4em;
            margin-bottom: 20px;
            color: #4CAF50;
            border-bottom: 2px solid #4CAF50;
            padding-bottom: 10px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
        }
        .form-group input, .form-group select {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 8px;
            background: rgba(255,255,255,0.9);
            color: #333;
            font-size: 1em;
        }
        .form-group input:focus, .form-group select:focus {
            outline: none;
            box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.3);
        }
        
        .calculate-btn {
            width: 100%;
            padding: 15px;
            background: linear-gradient(45deg, #4CAF50, #45a049);
            color: white;
            border: none;
            border-radius: 25px;
            font-size: 1.2em;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 20px;
        }
        .calculate-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(76, 175, 80, 0.4);
        }
        
        .results-section {
            grid-column: 1 / -1;
            background: rgba(255,255,255,0.15);
            padding: 30px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            display: none;
        }
        
        .results-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .result-card {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            border: 1px solid rgba(255,255,255,0.2);
        }
        .result-card h4 {
            color: #4CAF50;
            margin-bottom: 10px;
        }
        .result-value {
            font-size: 1.8em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .result-comparison {
            font-size: 0.9em;
            opacity: 0.8;
        }
        
        .chart-container {
            margin-top: 30px;
            background: rgba(255,255,255,0.9);
            padding: 20px;
            border-radius: 10px;
        }
        
        .savings-highlight {
            background: linear-gradient(45deg, #4CAF50, #45a049);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin-top: 20px;
        }
        .savings-highlight h3 {
            font-size: 1.5em;
            margin-bottom: 10px;
        }
        
        .loading {
            text-align: center;
            padding: 20px;
            font-style: italic;
        }
        
        .error {
            background: rgba(244, 67, 54, 0.2);
            border: 1px solid #f44336;
            padding: 15px;
            border-radius: 8px;
            margin-top: 10px;
        }
        
        .currency-selector {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        .currency-btn {
            padding: 8px 16px;
            background: rgba(255,255,255,0.2);
            border: none;
            border-radius: 20px;
            color: white;
            cursor: pointer;
            transition: all 0.3s;
        }
        .currency-btn.active {
            background: #4CAF50;
        }
        .currency-btn:hover {
            background: rgba(76, 175, 80, 0.7);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧊 TCO Калькулятор</h1>
            <p>Сравнение иммерсионного и воздушного охлаждения дата-центров</p>
        </div>
        
        <div class="currency-selector">
            <button class="currency-btn active" onclick="setCurrency('USD')">USD ($)</button>
            <button class="currency-btn" onclick="setCurrency('EUR')">EUR (€)</button>
            <button class="currency-btn" onclick="setCurrency('SAR')">SAR (ر.س)</button>
            <button class="currency-btn" onclick="setCurrency('AED')">AED (د.إ)</button>
        </div>
        
        <div class="calculator-grid">
            <div class="input-section">
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
                    <label for="airPUE">PUE (Power Usage Effectiveness):</label>
                    <input type="number" id="airPUE" value="1.8" min="1.2" max="3.0" step="0.1">
                </div>
            </div>
            
            <div class="input-section">
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
                    <label for="immersionPUE">PUE (Power Usage Effectiveness):</label>
                    <input type="number" id="immersionPUE" value="1.1" min="1.0" max="1.5" step="0.1">
                </div>
            </div>
        </div>
        
        <div class="input-section">
            <h3 class="section-title">📊 Параметры расчета</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                <div class="form-group">
                    <label for="analysisYears">Период анализа (лет):</label>
                    <select id="analysisYears">
                        <option value="1">1 год</option>
                        <option value="3">3 года</option>
                        <option value="5" selected>5 лет</option>
                        <option value="7">7 лет</option>
                        <option value="10">10 лет</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="electricityPrice">Стоимость электричества ($/кВт·ч):</label>
                    <input type="number" id="electricityPrice" value="0.12" min="0.05" max="0.50" step="0.01">
                </div>
                <div class="form-group">
                    <label for="discountRate">Ставка дисконтирования (%):</label>
                    <input type="number" id="discountRate" value="5" min="0" max="20" step="0.5">
                </div>
                <div class="form-group">
                    <label for="maintenanceCost">Обслуживание (% от CAPEX в год):</label>
                    <input type="number" id="maintenanceCost" value="3" min="1" max="10" step="0.5">
                </div>
            </div>
            <button class="calculate-btn" onclick="calculateTCO()">🧮 Рассчитать TCO</button>
        </div>
        
        <div class="results-section" id="results">
            <h3 class="section-title">📈 Результаты расчета</h3>
            <div id="loadingIndicator" class="loading">
                Выполняем расчет...
            </div>
            <div id="resultsContent" style="display: none;">
                <div class="results-grid" id="resultsGrid"></div>
                <div class="savings-highlight" id="savingsHighlight"></div>
                <div class="chart-container">
                    <canvas id="tcoChart" width="400" height="200"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="pueChart" width="400" height="200"></canvas>
                </div>
            </div>
            <div id="errorMessage" class="error" style="display: none;"></div>
        </div>
    </div>
    
    <script>
        let currentCurrency = 'USD';
        let tcoChart = null;
        let pueChart = null;
        
        function setCurrency(currency) {
            currentCurrency = currency;
            document.querySelectorAll('.currency-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
        }
        
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
                air_racks: parseInt(document.getElementById('airRacks').value),
                air_power_per_rack: parseFloat(document.getElementById('airPowerPerRack').value),
                air_rack_cost: parseFloat(document.getElementById('airRackCost').value),
                air_pue: parseFloat(document.getElementById('airPUE').value),
                
                immersion_tanks: parseInt(document.getElementById('immersionTanks').value),
                immersion_power_per_tank: parseFloat(document.getElementById('immersionPowerPerTank').value),
                immersion_tank_cost: parseFloat(document.getElementById('immersionTankCost').value),
                immersion_pue: parseFloat(document.getElementById('immersionPUE').value),
                
                analysis_years: parseInt(document.getElementById('analysisYears').value),
                electricity_price: parseFloat(document.getElementById('electricityPrice').value),
                discount_rate: parseFloat(document.getElementById('discountRate').value) / 100,
                maintenance_cost: parseFloat(document.getElementById('maintenanceCost').value) / 100,
                currency: currentCurrency
            };
            
            try {
                const response = await fetch('/api/calculate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) throw new Error('Ошибка расчета');
                
                const result = await response.json();
                displayResults(result);
                
                loading.style.display = 'none';
                content.style.display = 'block';
                
            } catch (err) {
                loading.style.display = 'none';
                error.style.display = 'block';
                error.textContent = 'Ошибка: ' + err.message;
            }
        }
        
        function displayResults(result) {
            const { air, immersion, comparison } = result;
            const currency = getCurrencySymbol(currentCurrency);
            
            const resultsGrid = document.getElementById('resultsGrid');
            resultsGrid.innerHTML = \`
                <div class="result-card">
                    <h4>CAPEX - Воздушное</h4>
                    <div class="result-value">\${currency}\${formatNumber(air.capex)}</div>
                    <div class="result-comparison">\${air.equipment_count} стоек</div>
                </div>
                <div class="result-card">
                    <h4>CAPEX - Иммерсионное</h4>
                    <div class="result-value">\${currency}\${formatNumber(immersion.capex)}</div>
                    <div class="result-comparison">\${immersion.equipment_count} емкостей</div>
                </div>
                <div class="result-card">
                    <h4>OPEX (годовой) - Воздушное</h4>
                    <div class="result-value">\${currency}\${formatNumber(air.annual_opex)}</div>
                    <div class="result-comparison">PUE: \${air.pue}</div>
                </div>
                <div class="result-card">
                    <h4>OPEX (годовой) - Иммерсионное</h4>
                    <div class="result-value">\${currency}\${formatNumber(immersion.annual_opex)}</div>
                    <div class="result-comparison">PUE: \${immersion.pue}</div>
                </div>
                <div class="result-card">
                    <h4>TCO \${result.analysis_years} лет - Воздушное</h4>
                    <div class="result-value">\${currency}\${formatNumber(air.total_tco)}</div>
                </div>
                <div class="result-card">
                    <h4>TCO \${result.analysis_years} лет - Иммерсионное</h4>
                    <div class="result-value">\${currency}\${formatNumber(immersion.total_tco)}</div>
                </div>
            \`;
            
            const savingsHighlight = document.getElementById('savingsHighlight');
            savingsHighlight.innerHTML = \`
                <h3>💰 Экономия от иммерсионного охлаждения</h3>
                <div style="font-size: 2em; margin: 15px 0;">\${currency}\${formatNumber(comparison.total_savings)}</div>
                <div>за \${result.analysis_years} лет • ROI: \${comparison.roi_percentage}% • Окупаемость: \${comparison.payback_years} лет</div>
                <div style="margin-top: 10px;">PUE улучшение: \${comparison.pue_improvement}% • Годовая экономия энергии: \${comparison.annual_energy_savings} МВт·ч</div>
            \`;
            
            createCharts(result);
        }
        
        function createCharts(result) {
            const { air, immersion } = result;
            
            // TCO Chart
            if (tcoChart) tcoChart.destroy();
            const ctx1 = document.getElementById('tcoChart').getContext('2d');
            tcoChart = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: ['Воздушное охлаждение', 'Иммерсионное охлаждение'],
                    datasets: [{
                        label: 'CAPEX',
                        data: [air.capex, immersion.capex],
                        backgroundColor: 'rgba(54, 162, 235, 0.8)'
                    }, {
                        label: \`OPEX (\${result.analysis_years} лет)\`,
                        data: [air.annual_opex * result.analysis_years, immersion.annual_opex * result.analysis_years],
                        backgroundColor: 'rgba(255, 99, 132, 0.8)'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Сравнение TCO (Total Cost of Ownership)',
                            color: '#333'
                        }
                    },
                    scales: {
                        x: { color: '#333' },
                        y: { 
                            color: '#333',
                            ticks: { callback: value => '$' + (value/1000000).toFixed(1) + 'M' }
                        }
                    }
                }
            });
            
            // PUE Chart
            if (pueChart) pueChart.destroy();
            const ctx2 = document.getElementById('pueChart').getContext('2d');
            pueChart = new Chart(ctx2, {
                type: 'doughnut',
                data: {
                    labels: ['Полезная нагрузка', 'Инфраструктура охлаждения'],
                    datasets: [{
                        label: 'Воздушное охлаждение',
                        data: [1, air.pue - 1],
                        backgroundColor: ['rgba(76, 175, 80, 0.8)', 'rgba(244, 67, 54, 0.8)']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: \`PUE Сравнение: Воздушное \${air.pue} vs Иммерсионное \${immersion.pue}\`,
                            color: '#333'
                        }
                    }
                }
            });
        }
        
        function formatNumber(num) {
            return new Intl.NumberFormat('ru-RU').format(Math.round(num));
        }
        
        function getCurrencySymbol(currency) {
            const symbols = { USD: '$', EUR: '€', SAR: 'ر.س', AED: 'د.إ' };
            return symbols[currency] || '$';
        }
        
        // Auto-calculate immersion tanks based on air cooling power
        document.getElementById('airRacks').addEventListener('input', updateImmersionTanks);
        document.getElementById('airPowerPerRack').addEventListener('input', updateImmersionTanks);
        
        function updateImmersionTanks() {
            const airRacks = parseInt(document.getElementById('airRacks').value) || 0;
            const airPower = parseFloat(document.getElementById('airPowerPerRack').value) || 0;
            const totalPower = airRacks * airPower;
            const immersionPowerPerTank = parseFloat(document.getElementById('immersionPowerPerTank').value) || 23;
            const recommendedTanks = Math.ceil(totalPower / immersionPowerPerTank);
            document.getElementById('immersionTanks').value = recommendedTanks;
        }
        
        // Initialize
        updateImmersionTanks();
    </script>
</body>
</html>`;
  
  res.end(html);
});

function calculateTCO(data) {
  const {
    air_racks = 10,
    air_power_per_rack = 20,
    air_rack_cost = 50000,
    air_pue = 1.8,
    
    immersion_tanks = 9,
    immersion_power_per_tank = 23,
    immersion_tank_cost = 80000,
    immersion_pue = 1.1,
    
    analysis_years = 5,
    electricity_price = 0.12,
    discount_rate = 0.05,
    maintenance_cost = 0.03,
    currency = 'USD'
  } = data;
  
  // Currency conversion rates (simplified)
  const rates = { USD: 1, EUR: 0.85, SAR: 3.75, AED: 3.67 };
  const rate = rates[currency] || 1;
  
  // Air cooling calculations
  const airTotalPower = air_racks * air_power_per_rack;
  const airCAPEX = air_racks * air_rack_cost * rate;
  const airAnnualEnergy = airTotalPower * 8760 * air_pue; // kWh per year
  const airAnnualElectricity = airAnnualEnergy * electricity_price * rate;
  const airAnnualMaintenance = airCAPEX * maintenance_cost;
  const airAnnualOPEX = airAnnualElectricity + airAnnualMaintenance;
  
  // Immersion cooling calculations
  const immersionTotalPower = immersion_tanks * immersion_power_per_tank;
  const immersionCAPEX = immersion_tanks * immersion_tank_cost * rate;
  const immersionAnnualEnergy = immersionTotalPower * 8760 * immersion_pue; // kWh per year
  const immersionAnnualElectricity = immersionAnnualEnergy * electricity_price * rate;
  const immersionAnnualMaintenance = immersionCAPEX * maintenance_cost;
  const immersionAnnualOPEX = immersionAnnualElectricity + immersionAnnualMaintenance;
  
  // NPV calculations
  let airTCO = airCAPEX;
  let immersionTCO = immersionCAPEX;
  
  for (let year = 1; year <= analysis_years; year++) {
    const discountFactor = Math.pow(1 + discount_rate, year);
    airTCO += airAnnualOPEX / discountFactor;
    immersionTCO += immersionAnnualOPEX / discountFactor;
  }
  
  // Comparison metrics
  const totalSavings = airTCO - immersionTCO;
  const annualSavings = airAnnualOPEX - immersionAnnualOPEX;
  const paybackPeriod = Math.abs((immersionCAPEX - airCAPEX) / annualSavings);
  const roiPercentage = Math.round((totalSavings / immersionCAPEX) * 100);
  const pueImprovement = Math.round(((air_pue - immersion_pue) / air_pue) * 100);
  const annualEnergySavings = (airAnnualEnergy - immersionAnnualEnergy) / 1000; // MWh
  
  return {
    calculation_id: `calc_${Date.now()}`,
    timestamp: new Date().toISOString(),
    currency: currency,
    analysis_years: analysis_years,
    
    air: {
      equipment_count: air_racks,
      total_power: airTotalPower,
      capex: Math.round(airCAPEX),
      annual_opex: Math.round(airAnnualOPEX),
      annual_energy: Math.round(airAnnualEnergy),
      total_tco: Math.round(airTCO),
      pue: air_pue
    },
    
    immersion: {
      equipment_count: immersion_tanks,
      total_power: immersionTotalPower,
      capex: Math.round(immersionCAPEX),
      annual_opex: Math.round(immersionAnnualOPEX),
      annual_energy: Math.round(immersionAnnualEnergy),
      total_tco: Math.round(immersionTCO),
      pue: immersion_pue
    },
    
    comparison: {
      total_savings: Math.round(totalSavings),
      annual_savings: Math.round(annualSavings),
      payback_years: paybackPeriod.toFixed(1),
      roi_percentage: roiPercentage,
      pue_improvement: pueImprovement,
      annual_energy_savings: Math.round(annualEnergySavings)
    }
  };
}

server.listen(4000, () => {
  console.log('🧮 TCO Calculator running on http://localhost:4000');
  console.log('📊 Interactive calculator with real-time calculations');
  console.log('🧊 Immersion vs Air Cooling Comparison Tool');
});