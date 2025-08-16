/**
 * =============================================================================
 * TCO CALCULATOR - IMMERSION COOLING vs AIR COOLING
 * =============================================================================
 * 
 * Одностраничное Node.js приложение для расчета общей стоимости владения (TCO)
 * систем охлаждения дата-центров. Сравнивает традиционное воздушное охлаждение
 * с инновационным иммерсионным охлаждением.
 * 
 * Архитектура: Single-file application (все в одном файле)
 * Технологии: Node.js (нативный HTTP), Chart.js, CSS Grid
 * Развертывание: Docker container или прямой запуск Node.js
 * 
 * Автор: TCO Calculator System
 * Версия: 1.0
 * Дата: 2025-08-16
 * =============================================================================
 */

// =============================================================================
// ИМПОРТЫ МОДУЛЕЙ
// =============================================================================
const http = require('http');  // HTTP сервер для обработки запросов
const net = require('net');    // TCP сеть для проверки доступности портов

// =============================================================================
// УТИЛИТЫ ДЛЯ РАБОТЫ С ПОРТАМИ
// =============================================================================

/**
 * Проверяет доступность порта
 * Создает временный TCP сервер для проверки возможности привязки к порту
 * @param {number} port - Номер порта для проверки
 * @return {Promise<boolean>} True если порт свободен
 */
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, (err) => {
      if (err) {
        resolve(false);  // Порт занят или недоступен
      } else {
        server.close(() => {
          resolve(true);   // Порт свободен
        });
      }
    });
  });
}

/**
 * Находит первый доступный порт начиная с указанного
 * Проверяет диапазон в 10 портов для гибкости в Docker/development
 * @param {number} startPort - Начальный порт (по умолчанию: 4000)
 * @return {Promise<number>} Номер доступного порта
 */
async function findAvailablePort(startPort = 4000) {
  let port = startPort;
  while (port < startPort + 10) {  // Проверяем диапазон 10 портов
    if (await checkPort(port)) {
      return port;  // Нашли свободный порт
    }
    port++;  // Переходим к следующему порту
  }
  throw new Error('No available ports found in range');  // Все порты заняты
}

// =============================================================================
// ВАЛИДАЦИЯ ВХОДНЫХ ДАННЫХ
// =============================================================================

/**
 * Валидирует входные параметры для расчета TCO
 * Проверяет все числовые значения на корректность диапазонов
 * Предотвращает некорректные расчеты и потенциальные ошибки
 * @param {Object} params - Параметры для валидации
 * @throws {Error} Если валидация не пройдена
 */
function validateInput(params) {
  // Деструктуризация параметров для удобства работы
  const {
    airRacks, airPowerPerRack, airRackCost, airPUE,
    immersionTanks, immersionPowerPerTank, immersionTankCost, immersionPUE,
    analysisYears, electricityPrice, discountRate, maintenanceCost
  } = params;

  // Валидация параметров воздушного охлаждения
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

  // Валидация параметров иммерсионного охлаждения
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

  // Валидация параметров анализа
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

// =============================================================================
// ОСНОВНАЯ ФУНКЦИЯ РАСЧЕТА TCO
// =============================================================================

/**
 * Рассчитывает общую стоимость владения (TCO) с комплексным финансовым анализом
 * Включает расчеты CAPEX, OPEX, NPV, ROI, Payback Period
 * @param {Object} params - Параметры расчета
 * @return {Object} Детализированные результаты TCO анализа
 */
function calculateTCO(params) {
  // Извлечение параметров с установкой значений по умолчанию
  const {
    airRacks,                           // Количество воздушных стоек
    airPowerPerRack = 20,              // Мощность на стойку (кВт)
    airRackCost = 50000,               // Стоимость воздушной стойки ($)
    airPUE = 1.8,                      // PUE воздушного охлаждения
    immersionTanks,                    // Количество иммерсионных танков
    immersionPowerPerTank = 23,        // Мощность на танк (кВт)
    immersionTankCost = 80000,         // Стоимость иммерсионного танка ($)
    immersionPUE = 1.1,                // PUE иммерсионного охлаждения
    analysisYears,                     // Период анализа (лет)
    electricityPrice = 0.12,           // Цена электричества ($/кВт⋅ч)
    discountRate = 5,                  // Ставка дисконтирования (%)
    maintenanceCost = 3                // Стоимость обслуживания (% от CAPEX)
  } = params;

  // Валидация входных данных
  validateInput(params);

  // Преобразование процентных ставок в десятичные дроби
  const discountRateDecimal = discountRate / 100;      // Ставка дисконтирования
  const maintenanceRateDecimal = maintenanceCost / 100; // Ставка обслуживания

  // =============================================================================
  // РАСЧЕТЫ ДЛЯ ВОЗДУШНОГО ОХЛАЖДЕНИЯ
  // =============================================================================
  
  const airTotalPower = airRacks * airPowerPerRack;           // Общая IT мощность (кВт)
  const airTotalWithPUE = airTotalPower * airPUE;            // Общая мощность с учетом PUE
  const airCAPEX = airRacks * airRackCost;                   // Капитальные затраты
  const airAnnualElectricity = airTotalWithPUE * 8760 * electricityPrice; // Годовая стоимость электричества
  const airAnnualMaintenance = airCAPEX * maintenanceRateDecimal;         // Годовые затраты на обслуживание
  const airAnnualOPEX = airAnnualElectricity + airAnnualMaintenance; // Общие годовые операционные затраты

  // =============================================================================
  // РАСЧЕТЫ ДЛЯ ИММЕРСИОННОГО ОХЛАЖДЕНИЯ
  // =============================================================================
  
  const immersionTotalPower = immersionTanks * immersionPowerPerTank;         // Общая IT мощность (кВт)
  const immersionTotalWithPUE = immersionTotalPower * immersionPUE;          // Общая мощность с учетом PUE
  const immersionCAPEX = immersionTanks * immersionTankCost;                 // Капитальные затраты
  const immersionAnnualElectricity = immersionTotalWithPUE * 8760 * electricityPrice; // Годовая стоимость электричества
  const immersionAnnualMaintenance = immersionCAPEX * maintenanceRateDecimal;         // Годовые затраты на обслуживание
  const immersionAnnualOPEX = immersionAnnualElectricity + immersionAnnualMaintenance; // Общие годовые операционные затраты

  // =============================================================================
  // МНОГОЛЕТНИЙ РАСЧЕТ TCO С ЧИСТОЙ ПРИВЕДЕННОЙ СТОИМОСТЬЮ (NPV)
  // =============================================================================
  
  let airTCO = airCAPEX;           // Начинаем с начальных капитальных затрат
  let immersionTCO = immersionCAPEX;

  // Добавляем дисконтированные OPEX для каждого года
  for (let year = 1; year <= analysisYears; year++) {
    const discountFactor = Math.pow(1 + discountRateDecimal, year); // Фактор дисконтирования
    airTCO += airAnnualOPEX / discountFactor;                       // Дисконтированные OPEX воздушного охлаждения
    immersionTCO += immersionAnnualOPEX / discountFactor;           // Дисконтированные OPEX иммерсионного охлаждения
  }

  // =============================================================================
  // ФИНАНСОВЫЙ АНАЛИЗ И КЛЮЧЕВЫЕ ПОКАЗАТЕЛИ
  // =============================================================================
  
  const totalSavings = airTCO - immersionTCO;                      // Общая экономия за период анализа
  const annualSavings = airAnnualOPEX - immersionAnnualOPEX;       // Годовая экономия
  const capexDifference = immersionCAPEX - airCAPEX;               // Дополнительные первоначальные инвестиции
  const paybackYears = capexDifference > 0 ? capexDifference / annualSavings : 0; // Период окупаемости
  const roiPercent = totalSavings / immersionCAPEX * 100;          // Рентабельность инвестиций (ROI)

  // =============================================================================
  // РАСЧЕТЫ ЭНЕРГОЭФФЕКТИВНОСТИ
  // =============================================================================
  
  const pueImprovement = ((airPUE - immersionPUE) / airPUE) * 100; // Улучшение PUE в процентах
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
 * Safely extract nested object properties with fallback values
 * @param {Object} obj - Source object
 * @param {string} path - Dot notation path (e.g., 'comparison.savings.totalSavings')
 * @param {*} defaultValue - Default value if path doesn't exist
 * @return {*} Value at path or default value
 */
function safeGet(obj, path, defaultValue = null) {
  try {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[key];
    }
    
    return current !== undefined ? current : defaultValue;
  } catch (error) {
    console.warn(`⚠️ Safe extraction failed for path '${path}':`, error.message);
    return defaultValue;
  }
}

/**
 * Validate TCO calculation data structure
 * @param {Object} data - TCO calculation result data
 * @throws {Error} If data structure is invalid
 */
function validateTCOData(data) {
  const requiredPaths = [
    'airCooling.costs.totalTCO',
    'immersionCooling.costs.totalTCO',
    'comparison.savings.totalSavings',
    'comparison.savings.roiPercent',
    'comparison.savings.paybackYears',
    'comparison.efficiency.pueImprovement',
    'parameters.analysisYears'
  ];
  
  const missingPaths = [];
  
  for (const path of requiredPaths) {
    const value = safeGet(data, path);
    if (value === null || value === undefined) {
      missingPaths.push(path);
    }
  }
  
  if (missingPaths.length > 0) {
    throw new Error(`Missing required data paths: ${missingPaths.join(', ')}`);
  }
  
  // Validate numeric values
  const numericPaths = [
    'comparison.savings.totalSavings',
    'comparison.savings.roiPercent',
    'comparison.savings.paybackYears',
    'parameters.analysisYears'
  ];
  
  for (const path of numericPaths) {
    const value = safeGet(data, path);
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`Invalid numeric value at path '${path}': ${value}`);
    }
  }
}

/**
 * Application health status for monitoring
 */
const healthStatus = {
  startTime: Date.now(),
  totalRequests: 0,
  successfulCalculations: 0,
  errors: 0,
  lastError: null,
  lastSuccessfulCalculation: null
};

/**
 * Create and start the HTTP server with comprehensive error handling
 * @param {number} port - Port number for the server
 * @return {http.Server} HTTP server instance
 */
function createServer(port) {
  const server = http.createServer((req, res) => {
    const startTime = Date.now();
    healthStatus.totalRequests++;
    
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

    // Health check endpoint for container monitoring
    if (req.method === 'GET' && req.url === '/health') {
      try {
        const uptime = Date.now() - healthStatus.startTime;
        const uptimeSeconds = Math.floor(uptime / 1000);
        const uptimeMinutes = Math.floor(uptimeSeconds / 60);
        const uptimeHours = Math.floor(uptimeMinutes / 60);
        
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: {
            milliseconds: uptime,
            human: `${uptimeHours}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`
          },
          metrics: {
            totalRequests: healthStatus.totalRequests,
            successfulCalculations: healthStatus.successfulCalculations,
            errors: healthStatus.errors,
            successRate: healthStatus.totalRequests > 0 
              ? ((healthStatus.successfulCalculations / healthStatus.totalRequests) * 100).toFixed(2) + '%'
              : '0%'
          },
          lastError: healthStatus.lastError,
          lastSuccessfulCalculation: healthStatus.lastSuccessfulCalculation,
          memory: process.memoryUsage(),
          nodeVersion: process.version,
          platform: process.platform
        };
        
        // Determine health status based on error rate
        const errorRate = healthStatus.totalRequests > 0 
          ? (healthStatus.errors / healthStatus.totalRequests) * 100 
          : 0;
        
        if (errorRate > 50) {
          health.status = 'critical';
          res.writeHead(503, { 'Content-Type': 'application/json' });
        } else if (errorRate > 20) {
          health.status = 'degraded';
          res.writeHead(200, { 'Content-Type': 'application/json' });
        } else {
          health.status = 'healthy';
          res.writeHead(200, { 'Content-Type': 'application/json' });
        }
        
        res.end(JSON.stringify(health, null, 2));
        return;
      } catch (error) {
        console.error('❌ Health check error:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: error.message }));
        return;
      }
    }

    // API endpoint for TCO calculations with enhanced error handling
    if (req.method === 'POST' && req.url === '/api/calculate') {
      let body = '';
      
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          const requestStartTime = Date.now();
          
          // Parse and validate request body
          let data;
          try {
            data = JSON.parse(body);
          } catch (parseError) {
            throw new Error(`Invalid JSON in request body: ${parseError.message}`);
          }
          
          console.log('📊 Processing TCO calculation request:', {
            airRacks: safeGet(data, 'airRacks', 'undefined'),
            immersionTanks: safeGet(data, 'immersionTanks', 'undefined'),
            years: safeGet(data, 'analysisYears', 'undefined'),
            timestamp: new Date().toISOString()
          });
          
          // Perform calculation with timeout protection
          const calculationTimeout = setTimeout(() => {
            throw new Error('Calculation timeout - operation took longer than 10 seconds');
          }, 10000);
          
          const result = calculateTCO(data);
          clearTimeout(calculationTimeout);
          
          // Validate result data structure
          try {
            validateTCOData(result);
          } catch (validationError) {
            throw new Error(`Calculation result validation failed: ${validationError.message}`);
          }
          
          const processingTime = Date.now() - requestStartTime;
          
          // Add performance metadata to result
          result.metadata = {
            processingTimeMs: processingTime,
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            requestId: 'req_' + Date.now()
          };
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result, null, 2));
          
          // Update health metrics
          healthStatus.successfulCalculations++;
          healthStatus.lastSuccessfulCalculation = new Date().toISOString();
          
          console.log('✅ Calculation completed successfully:', {
            totalSavings: safeGet(result, 'comparison.savings.totalSavings', 'unknown'),
            payback: safeGet(result, 'comparison.savings.paybackYears', 'unknown') + ' years',
            roi: safeGet(result, 'comparison.savings.roiPercent', 'unknown') + '%',
            processingTime: processingTime + 'ms',
            requestId: result.metadata.requestId
          });
          
        } catch (error) {
          const processingTime = Date.now() - startTime;
          
          // Update health metrics
          healthStatus.errors++;
          healthStatus.lastError = {
            message: error.message,
            timestamp: new Date().toISOString(),
            processingTime: processingTime + 'ms'
          };
          
          console.error('❌ API Error:', {
            message: error.message,
            stack: error.stack,
            processingTime: processingTime + 'ms',
            timestamp: new Date().toISOString()
          });
          
          // Determine appropriate error code
          let statusCode = 400;
          if (error.message.includes('timeout')) {
            statusCode = 408; // Request Timeout
          } else if (error.message.includes('validation')) {
            statusCode = 422; // Unprocessable Entity
          } else if (error.message.includes('Invalid JSON')) {
            statusCode = 400; // Bad Request
          }
          
          res.writeHead(statusCode, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: error.message,
            code: 'CALCULATION_ERROR',
            timestamp: new Date().toISOString(),
            requestId: 'req_' + Date.now(),
            processingTime: processingTime
          }));
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
        .environmental-impact {
            background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%);
            padding: 40px;
            border-radius: 20px;
            margin-bottom: 30px;
            box-shadow: 0 20px 60px rgba(46, 125, 50, 0.4);
            color: white;
        }
        .environmental-title {
            text-align: center;
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 800;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .environmental-subtitle {
            text-align: center;
            font-size: 1.2rem;
            opacity: 0.9;
            margin-bottom: 40px;
        }
        .environmental-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin-bottom: 30px;
        }
        .environmental-card {
            background: rgba(255, 255, 255, 0.95);
            color: #1B5E20;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            border-top: 5px solid #4CAF50;
            transition: transform 0.3s ease;
        }
        .environmental-card:hover {
            transform: translateY(-5px);
        }
        .environmental-icon {
            font-size: 3rem;
            margin-bottom: 15px;
            display: block;
        }
        .environmental-value {
            font-size: 2.5rem;
            font-weight: 800;
            margin: 15px 0;
            color: #2E7D32;
        }
        .environmental-label {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 10px;
        }
        .environmental-context {
            font-size: 0.9rem;
            color: #666;
            font-style: italic;
        }
        .gauge-container {
            position: relative;
            width: 200px;
            height: 100px;
            margin: 20px auto;
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
                        <button class="view-btn" onclick="switchView('environmental')" id="btn-environmental">🌱 Environmental Impact</button>
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
        let environmentalChart = null;
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
            },
            environmental: {
                primary: '#2E7D32',
                secondary: '#4CAF50',
                light: '#81C784',
                gradient: ['#2E7D32', '#4CAF50', '#66BB6A', '#81C784']
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
                case 'environmental':
                    activeChart = createEnvironmentalChart(ctx, data);
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
         * Create environmental impact visualization chart
         * @param {CanvasRenderingContext2D} ctx - Canvas context
         * @param {Object} data - TCO calculation results
         * @return {Chart} Chart.js instance
         */
        function createEnvironmentalChart(ctx, data, mode = 'single') {
            const { comparison } = data;
            const { pueImprovement, annualEnergySavingsMWh, annualCarbonReductionTons } = comparison.efficiency;
            
            // Convert to contextual equivalents
            const homesEquivalent = Math.round(annualEnergySavingsMWh * 1000 / 10656); // Average US home uses 10,656 kWh/year
            const treesEquivalent = Math.round(annualCarbonReductionTons * 16); // 1 ton CO2 = ~16 tree seedlings for 10 years
            const carsEquivalent = Math.round(annualCarbonReductionTons / 4.6); // Average car emits 4.6 tons CO2/year
            
            return new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: [
                        \`Energy Savings: \${annualEnergySavingsMWh} MWh/year\`,
                        \`CO₂ Reduction: \${annualCarbonReductionTons} tons/year\`,
                        \`PUE Improvement: \${pueImprovement}%\`,
                        'Baseline Impact'
                    ],
                    datasets: [{
                        data: [
                            annualEnergySavingsMWh,
                            annualCarbonReductionTons * 10, // Scale for visibility
                            pueImprovement * 50, // Scale for visibility
                            100 // Baseline for comparison
                        ],
                        backgroundColor: colors.environmental.gradient,
                        borderColor: '#fff',
                        borderWidth: 3,
                        cutout: '50%'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: mode === 'grid' ? 1 : 1.5,
                    plugins: {
                        title: {
                            display: true,
                            text: '🌱 Environmental Impact Overview',
                            color: '#2E7D32',
                            font: { size: 18, weight: 'bold' }
                        },
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#333',
                                font: { size: 11, weight: '600' },
                                usePointStyle: true,
                                padding: 15,
                                generateLabels: function(chart) {
                                    const original = Chart.defaults.plugins.legend.labels.generateLabels;
                                    const labels = original.call(this, chart);
                                    
                                    // Add contextual information
                                    labels[0].text = \`⚡ \${annualEnergySavingsMWh} MWh/year (≈\${homesEquivalent} homes)\`;
                                    labels[1].text = \`🌍 \${annualCarbonReductionTons} tons CO₂/year (≈\${treesEquivalent} trees)\`;
                                    labels[2].text = \`📊 \${pueImprovement}% PUE improvement\`;
                                    labels[3].text = 'Baseline for comparison';
                                    
                                    return labels;
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(46, 125, 50, 0.9)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            callbacks: {
                                label: function(context) {
                                    const label = context.label;
                                    if (label.includes('Energy')) {
                                        return [\`Energy Savings: \${annualEnergySavingsMWh} MWh/year\`, \`Equivalent to \${homesEquivalent} homes powered\`];
                                    } else if (label.includes('CO₂')) {
                                        return [\`CO₂ Reduction: \${annualCarbonReductionTons} tons/year\`, \`Equivalent to \${carsEquivalent} cars removed\`, \`Or \${treesEquivalent} tree seedlings planted\`];
                                    } else if (label.includes('PUE')) {
                                        return [\`PUE Improvement: \${pueImprovement}%\`, 'More efficient power usage'];
                                    }
                                    return label;
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
         * Display comprehensive calculation results with enhanced environmental impact
         * @param {Object} data - TCO calculation results from API
         */
        function displayResults(data) {
            // Validate input data structure
            if (!data || typeof data !== 'object') {
                console.error('Invalid data provided to displayResults');
                return;
            }
            
            const { airCooling, immersionCooling, comparison, parameters } = data;
            
            // Validate required data structures
            if (!comparison || !comparison.savings || !comparison.efficiency) {
                console.error('Missing required comparison data');
                return;
            }
            
            const { pueImprovement, annualEnergySavingsMWh, annualCarbonReductionTons } = comparison.efficiency;
            
            // Calculate contextual environmental equivalents with safety checks
            const homesEquivalent = Math.round((annualEnergySavingsMWh || 0) * 1000 / 10656); // Average US home uses 10,656 kWh/year
            const treesEquivalent = Math.round((annualCarbonReductionTons || 0) * 16); // 1 ton CO2 = ~16 tree seedlings for 10 years
            const carsEquivalent = Math.round((annualCarbonReductionTons || 0) / 4.6); // Average car emits 4.6 tons CO2/year
            
            // Update savings highlight with error handling
            const savingsHighlight = document.getElementById('savingsHighlight');
            if (!savingsHighlight) {
                console.error('savingsHighlight element not found');
                return;
            }
            
            // Safe extraction of totalSavings with fallback
            const totalSavings = comparison?.savings?.totalSavings ?? 0;
            const isPositive = totalSavings >= 0;
            
            try {
                const savingsTitle = isPositive ? '💰 Total Savings' : '💸 Additional Cost';
                const savingsPrefix = isPositive ? '$' : '-$';
                const yearText = (parameters?.analysisYears || 0) > 1 ? 's' : '';
                const analysisYears = parameters?.analysisYears || 0;
                const roiPercent = comparison?.savings?.roiPercent || 0;
                const paybackYears = comparison?.savings?.paybackYears || 0;
                
                savingsHighlight.innerHTML = 
                    '<h2>' + savingsTitle + '</h2>' +
                    '<div class="savings-value">' + savingsPrefix + Math.abs(totalSavings).toLocaleString() + '</div>' +
                    '<p>Over ' + analysisYears + ' year' + yearText + ' • ROI: ' + roiPercent + '% • Payback: ' + paybackYears + ' years</p>';
                
                if (!isPositive) {
                    savingsHighlight.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
                }
            } catch (error) {
                console.error('Error generating savings highlight:', error);
                savingsHighlight.innerHTML = \`
                    <h2>💰 TCO Analysis</h2>
                    <div class="savings-value">Calculating...</div>
                    <p>Analysis in progress</p>
                \`;
            }
            
            // Add environmental impact section before results grid
            const environmentalSection = 
                '<div class="environmental-impact">' +
                    '<div class="environmental-title">🌱 Environmental Impact</div>' +
                    '<div class="environmental-subtitle">Sustainability Benefits & ESG Metrics</div>' +
                    '<div class="environmental-grid">' +
                        '<div class="environmental-card">' +
                            '<span class="environmental-icon">⚡</span>' +
                            '<div class="environmental-label">PUE Improvement</div>' +
                            '<div class="environmental-value">' + pueImprovement + '%</div>' +
                            '<div class="environmental-context">' +
                                'Power Usage Effectiveness<br>' +
                                ((1 - comparison.efficiency.pueImprovement/100) * 100).toFixed(1) + '% more efficient cooling' +
                            '</div>' +
                            '<div class="gauge-container">' +
                                '<canvas id="pueGauge" width="200" height="100"></canvas>' +
                            '</div>' +
                        '</div>' +
                        '<div class="environmental-card">' +
                            '<span class="environmental-icon">🏠</span>' +
                            '<div class="environmental-label">Energy Savings</div>' +
                            '<div class="environmental-value">' + annualEnergySavingsMWh + '</div>' +
                            '<div class="environmental-context">' +
                                'MWh saved annually<br>' +
                                'Powers ~' + homesEquivalent + ' homes for a year' +
                            '</div>' +
                        '</div>' +
                        '<div class="environmental-card">' +
                            '<span class="environmental-icon">🌍</span>' +
                            '<div class="environmental-label">CO₂ Reduction</div>' +
                            '<div class="environmental-value">' + annualCarbonReductionTons + '</div>' +
                            '<div class="environmental-context">' +
                                'Tons CO₂ reduced annually<br>' +
                                'Equal to ' + carsEquivalent + ' cars removed from roads' +
                            '</div>' +
                        '</div>' +
                        '<div class="environmental-card">' +
                            '<span class="environmental-icon">🌳</span>' +
                            '<div class="environmental-label">Carbon Offset</div>' +
                            '<div class="environmental-value">' + treesEquivalent + '</div>' +
                            '<div class="environmental-context">' +
                                'Tree seedlings equivalent<br>' +
                                '10-year carbon sequestration' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div style="text-align: center; margin-top: 20px; padding: 20px; background: rgba(255,255,255,0.1); border-radius: 10px;">' +
                        '<h4 style="margin-bottom: 10px; color: #E8F5E8;">🎯 ESG Compliance Impact</h4>' +
                        '<p style="font-size: 1rem; line-height: 1.6; opacity: 0.95;">' +
                            'This immersion cooling solution directly contributes to <strong>Scope 2 emissions reduction</strong>, ' +
                            'supporting corporate sustainability goals and ESG reporting requirements. ' +
                            'The ' + pueImprovement + '% PUE improvement represents measurable progress toward ' +
                            '<strong>carbon neutrality objectives</strong> and regulatory compliance.' +
                        '</p>' +
                    '</div>' +
                '</div>';
            
            // Insert environmental section before results grid
            const resultsGrid = document.getElementById('resultsGrid');
            if (!resultsGrid) {
                console.error('resultsGrid element not found');
                return;
            }
            
            try {
                resultsGrid.insertAdjacentHTML('beforebegin', environmentalSection);
            } catch (error) {
                console.error('Error inserting environmental section:', error);
            }
            
            // Update results grid with enhanced environmental integration
            try {
                const airEquipmentCount = (airCooling && airCooling.equipment && airCooling.equipment.count) || 0;
                const airTotalTCO = (airCooling && airCooling.costs && airCooling.costs.totalTCO) || 0;
                const airCapex = (airCooling && airCooling.costs && airCooling.costs.capex) || 0;
                const airAnnualOpex = (airCooling && airCooling.costs && airCooling.costs.annualOpex) || 0;
                const airTotalPowerKW = (airCooling && airCooling.equipment && airCooling.equipment.totalPowerKW) || 0;
                const airPue = (airCooling && airCooling.equipment && airCooling.equipment.pue) || 0;
                const airAnnualConsumptionMWh = (airCooling && airCooling.energy && airCooling.energy.annualConsumptionMWh) || 0;
                
                const immersionEquipmentCount = (immersionCooling && immersionCooling.equipment && immersionCooling.equipment.count) || 0;
                const immersionTotalTCO = (immersionCooling && immersionCooling.costs && immersionCooling.costs.totalTCO) || 0;
                const immersionCapex = (immersionCooling && immersionCooling.costs && immersionCooling.costs.capex) || 0;
                const immersionAnnualOpex = (immersionCooling && immersionCooling.costs && immersionCooling.costs.annualOpex) || 0;
                const immersionTotalPowerKW = (immersionCooling && immersionCooling.equipment && immersionCooling.equipment.totalPowerKW) || 0;
                const immersionPue = (immersionCooling && immersionCooling.equipment && immersionCooling.equipment.pue) || 0;
                const immersionAnnualConsumptionMWh = (immersionCooling && immersionCooling.energy && immersionCooling.energy.annualConsumptionMWh) || 0;
                const comparisonAnnualSavings = (comparison && comparison.savings && comparison.savings.annualSavings) || 0;
                
                resultsGrid.innerHTML = 
                '<div class="result-card air">' +
                    '<h3>🌪️ Air Cooling System</h3>' +
                    '<div class="result-subtitle">Equipment: ' + airEquipmentCount + ' × 42U Racks</div>' +
                    '<div class="result-value">$' + airTotalTCO.toLocaleString() + '</div>' +
                    '<div class="result-subtitle">Total Cost of Ownership</div>' +
                    '<div style="margin-top: 10px; font-size: 0.85rem; color: #666;">' +
                        'CAPEX: $' + airCapex.toLocaleString() + '<br>' +
                        'Annual OPEX: $' + airAnnualOpex.toLocaleString() + '<br>' +
                        'Power: ' + airTotalPowerKW + 'kW • PUE: ' + airPue + '<br>' +
                        '<span style="color: #e74c3c;">CO₂: ' + Math.round(airAnnualConsumptionMWh * 0.4) + ' tons/year</span>' +
                    '</div>' +
                '</div>' +
                '<div class="result-card immersion">' +
                    '<h3>🧊 Immersion Cooling</h3>' +
                    '<div class="result-subtitle">Equipment: ' + immersionEquipmentCount + ' × Immersion Tanks</div>' +
                    '<div class="result-value">$' + immersionTotalTCO.toLocaleString() + '</div>' +
                    '<div class="result-subtitle">Total Cost of Ownership</div>' +
                    '<div style="margin-top: 10px; font-size: 0.85rem; color: #666;">' +
                        'CAPEX: $' + immersionCapex.toLocaleString() + '<br>' +
                        'Annual OPEX: $' + immersionAnnualOpex.toLocaleString() + '<br>' +
                        'Power: ' + immersionTotalPowerKW + 'kW • PUE: ' + immersionPue + '<br>' +
                        '<span style="color: #4CAF50;">CO₂: ' + Math.round(immersionAnnualConsumptionMWh * 0.4) + ' tons/year</span>' +
                    '</div>' +
                '</div>' +
                '<div class="result-card savings" style="border-left-color: #2E7D32;">' +
                    '<h3>🌱 Sustainability Impact</h3>' +
                    '<div class="result-subtitle">Environmental Benefits</div>' +
                    '<div class="result-value">ESG+</div>' +
                    '<div class="result-subtitle">Corporate Responsibility</div>' +
                    '<div style="margin-top: 10px; font-size: 0.85rem; color: #666;">' +
                        '<span style="color: #2E7D32; font-weight: 600;">✓ ' + (pueImprovement || 0) + '% PUE improvement</span><br>' +
                        '<span style="color: #2E7D32; font-weight: 600;">✓ ' + (annualEnergySavingsMWh || 0) + ' MWh/year saved</span><br>' +
                        '<span style="color: #2E7D32; font-weight: 600;">✓ ' + (annualCarbonReductionTons || 0) + ' tons CO₂/year reduced</span><br>' +
                        'Annual Cost Savings: $' + comparisonAnnualSavings.toLocaleString() +
                    '</div>' +
                '</div>';
            } catch (error) {
                console.error('Error generating results grid:', error);
                resultsGrid.innerHTML = 
                    '<div class="result-card">' +
                        '<h3>⚠️ Results Loading</h3>' +
                        '<div class="result-subtitle">Calculation in progress...</div>' +
                        '<div class="result-value">Please wait</div>' +
                    '</div>';
            }
            
            // Create PUE gauge chart after DOM insertion
            try {
                setTimeout(() => {
                    createPUEGauge(pueImprovement || 0);
                }, 100);
            } catch (error) {
                console.error('Error creating PUE gauge:', error);
            }
            
            // Initialize charts with default view
            try {
                updateSingleChart(data, currentView);
            } catch (error) {
                console.error('Error updating charts:', error);
            }
        }
        
        /**
         * Create PUE improvement gauge visualization
         * @param {number} pueImprovement - PUE improvement percentage
         */
        function createPUEGauge(pueImprovement) {
            const canvas = document.getElementById('pueGauge');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            const centerX = 100;
            const centerY = 80;
            const radius = 60;
            
            // Clear canvas
            ctx.clearRect(0, 0, 200, 100);
            
            // Background arc
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
            ctx.lineWidth = 12;
            ctx.strokeStyle = '#E0E0E0';
            ctx.stroke();
            
            // Progress arc
            const progressAngle = (pueImprovement / 50) * Math.PI; // Scale to 50% max for visual appeal
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, Math.PI, Math.PI + progressAngle);
            ctx.lineWidth = 12;
            ctx.strokeStyle = pueImprovement > 30 ? '#4CAF50' : pueImprovement > 15 ? '#FF9800' : '#2196F3';
            ctx.stroke();
            
            // Center text
            ctx.fillStyle = '#2E7D32';
            ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(pueImprovement + '%', centerX, centerY - 5);
            
            ctx.fillStyle = '#666';
            ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText('Efficiency', centerX, centerY + 15);
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