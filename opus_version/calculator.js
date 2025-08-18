// Global variables
let currentChart = null;
let calculationData = null;
let currentChartType = 'tco';
let loadScenario = 'constant';

// Currency symbols
const currencySymbols = {
    'USD': '$',
    'EUR': '€',
    'SAR': '﷼',
    'AED': 'د.إ'
};

// Exchange rates (simplified - in production would fetch from API)
const exchangeRates = {
    'USD': 1,
    'EUR': 0.92,
    'SAR': 3.75,
    'AED': 3.67
};

// Load scenarios
const loadScenarios = {
    'constant': {
        name: 'Constant Load (24/7)',
        description: 'Steady workload throughout the day',
        profile: Array(24).fill(1.0),
        yearlyUtilization: 1.0
    },
    'business': {
        name: 'Business Hours',
        description: 'Peak during 9-5, reduced nights/weekends',
        profile: [0.3, 0.3, 0.3, 0.3, 0.3, 0.4, 0.6, 0.8, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.8, 0.6, 0.5, 0.4, 0.3, 0.3, 0.3],
        yearlyUtilization: 0.65
    },    'ai_training': {
        name: 'AI/ML Training',
        description: 'Intensive compute cycles with cooling breaks',
        profile: [1.0, 1.0, 1.0, 0.8, 0.8, 0.8, 1.0, 1.0, 1.0, 0.9, 0.9, 0.9, 1.0, 1.0, 1.0, 0.8, 0.8, 0.8, 1.0, 1.0, 1.0, 0.9, 0.9, 0.9],
        yearlyUtilization: 0.92
    },
    'batch': {
        name: 'Batch Processing',
        description: 'Heavy night processing, light day usage',
        profile: [0.9, 0.9, 0.9, 0.9, 0.8, 0.6, 0.4, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.9, 0.9],
        yearlyUtilization: 0.58
    },
    'web_hosting': {
        name: 'Web Hosting',
        description: 'Variable load with traffic peaks',
        profile: [0.4, 0.3, 0.3, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.9, 0.9, 0.8, 0.9, 0.9, 0.8, 0.7, 0.8, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4],
        yearlyUtilization: 0.65
    }
};

// Translations
const translations = {
    'en': {
        'title': 'Immersion Cooling TCO Calculator',
        'airCooling': 'Air Cooling',
        'immersionCooling': 'Immersion Cooling',
        'totalSavings': 'Total Savings',
        'roi': 'ROI',
        'payback': 'Payback Period',
        'energySavings': 'Energy Savings',
        'co2Reduction': 'CO₂ Reduction',
        'calculate': 'Calculate TCO Analysis',
        'exportPDF': 'Export PDF Report',        'exportExcel': 'Export Excel Analysis',
        'shareLink': 'Generate Share Link',
        'airRacksLabel': 'Number of 42U Racks',
        'immersionTanksLabel': 'Number of Tanks (1U-23U)',
        'autoCalculate': 'Auto-calculate tanks:',
        'years': 'Years',
        'welcomeTitle': 'Welcome to TCO Calculator',
        'welcomeMessage': 'Configure your cooling systems and click "Calculate" to see the analysis',
        'loadScenario': 'Load Scenario'
    },
    'ar': {
        'title': 'حاسبة التكلفة الإجمالية للتبريد بالغمر',
        'airCooling': 'التبريد بالهواء',
        'immersionCooling': 'التبريد بالغمر',
        'totalSavings': 'إجمالي التوفير',
        'roi': 'العائد على الاستثمار',
        'payback': 'فترة الاسترداد',
        'energySavings': 'توفير الطاقة',
        'co2Reduction': 'تقليل CO₂',
        'calculate': 'حساب تحليل TCO',
        'exportPDF': 'تصدير تقرير PDF',
        'exportExcel': 'تصدير تحليل Excel',
        'shareLink': 'إنشاء رابط مشاركة',
        'airRacksLabel': 'عدد الرفوف 42U',
        'immersionTanksLabel': 'عدد الخزانات (1U-23U)',
        'autoCalculate': 'حساب تلقائي للخزانات:',
        'years': 'سنوات',
        'welcomeTitle': 'مرحبًا بك في حاسبة TCO',
        'welcomeMessage': 'قم بتكوين أنظمة التبريد الخاصة بك واضغط على "حساب" لرؤية التحليل',
        'loadScenario': 'سيناريو الحمل'    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Calculator initialized');
    
    // Load parameters from URL if present
    loadUrlParameters();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize load scenario selector if it exists
    initializeLoadScenarios();
});

// Initialize load scenarios
function initializeLoadScenarios() {
    const scenarioSelect = document.getElementById('loadScenario');
    if (scenarioSelect && scenarioSelect.options.length === 0) {
        Object.keys(loadScenarios).forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = loadScenarios[key].name;
            scenarioSelect.appendChild(option);
        });
    }
}

// Set up event listeners
function setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Auto-calculate tanks toggle
    const autoCalcToggle = document.getElementById('autoCalculateTanks');
    if (autoCalcToggle) {
        autoCalcToggle.addEventListener('change', function(e) {            const tanksInput = document.getElementById('tanksInputGroup');
            if (e.target.checked) {
                tanksInput.style.display = 'none';
                autoCalculateTanks();
                
                // Add listeners for auto-calculation
                document.getElementById('airRacks').addEventListener('input', autoCalculateTanks);
                document.getElementById('airPowerPerRack').addEventListener('input', autoCalculateTanks);
                document.getElementById('immersionPowerPerTank').addEventListener('input', autoCalculateTanks);
            } else {
                tanksInput.style.display = 'block';
                
                // Remove listeners
                document.getElementById('airRacks').removeEventListener('input', autoCalculateTanks);
                document.getElementById('airPowerPerRack').removeEventListener('input', autoCalculateTanks);
                document.getElementById('immersionPowerPerTank').removeEventListener('input', autoCalculateTanks);
            }
        });
    }

    // Currency change handler
    const currencySelect = document.getElementById('currency');
    if (currencySelect) {
        currencySelect.addEventListener('change', function(e) {
            const symbols = document.querySelectorAll('.currency-symbol');
            symbols.forEach(s => s.textContent = currencySymbols[e.target.value]);
            if (calculationData) {
                updateDisplay();
            }
        });
    }

    // Language change handler
    const languageSelect = document.getElementById('language');
    if (languageSelect) {        languageSelect.addEventListener('change', function(e) {
            updateLanguage(e.target.value);
        });
    }

    // Load scenario change handler
    const scenarioSelect = document.getElementById('loadScenario');
    if (scenarioSelect) {
        scenarioSelect.addEventListener('change', function(e) {
            loadScenario = e.target.value;
            updateScenarioDescription();
        });
    }
}

// Update scenario description
function updateScenarioDescription() {
    const descElement = document.getElementById('scenarioDescription');
    if (descElement && loadScenarios[loadScenario]) {
        descElement.textContent = loadScenarios[loadScenario].description;
    }
}

// Update language
function updateLanguage(lang) {
    const t = translations[lang];
    
    // Update direction
    if (lang === 'ar') {
        document.dir = 'rtl';
    } else {
        document.dir = 'ltr';
    }
    
    // Update text elements
    const h1 = document.querySelector('.header h1');
    if (h1) h1.textContent = '🧊 ' + t.title;    
    const calcBtn = document.querySelector('.calculate-btn');
    if (calcBtn) calcBtn.textContent = t.calculate;
    
    // Update welcome message
    const welcomeH2 = document.querySelector('.welcome-message h2');
    if (welcomeH2) welcomeH2.textContent = t.welcomeTitle;
    
    const welcomeP = document.querySelector('.welcome-message p');
    if (welcomeP) welcomeP.textContent = t.welcomeMessage;
    
    // Update export buttons
    const exportBtns = document.querySelectorAll('.export-btn');
    if (exportBtns[0]) exportBtns[0].innerHTML = '📄 ' + t.exportPDF;
    if (exportBtns[1]) exportBtns[1].innerHTML = '📊 ' + t.exportExcel;
    if (exportBtns[2]) exportBtns[2].innerHTML = '🔗 ' + t.shareLink;
}

// Auto-calculate tanks
function autoCalculateTanks() {
    const airRacks = parseInt(document.getElementById('airRacks').value) || 10;
    const airPower = parseFloat(document.getElementById('airPowerPerRack').value) || 10;
    const immersionPower = parseFloat(document.getElementById('immersionPowerPerTank').value) || 20;
    
    const totalPower = airRacks * airPower;
    const tanks = Math.ceil(totalPower / immersionPower);
    
    document.getElementById('immersionTanks').value = tanks;
}

// Main calculation function
function calculate() {
    console.log('Calculate function called');    
    try {
        // Get input values
        const currency = document.getElementById('currency').value;
        const exchangeRate = exchangeRates[currency];
        
        const params = {
            airRacks: parseInt(document.getElementById('airRacks').value) || 10,
            airPowerPerRack: parseFloat(document.getElementById('airPowerPerRack').value) || 10,
            airPUE: parseFloat(document.getElementById('airPUE').value) || 1.7,
            immersionTanks: parseInt(document.getElementById('immersionTanks').value) || 5,
            immersionPowerPerTank: parseFloat(document.getElementById('immersionPowerPerTank').value) || 20,
            immersionPUE: parseFloat(document.getElementById('immersionPUE').value) || 1.03,
            analysisYears: parseInt(document.getElementById('analysisYears').value) || 5,
            electricityPrice: parseFloat(document.getElementById('electricityPrice').value) || 0.10 * exchangeRate,
            discountRate: parseFloat(document.getElementById('discountRate').value) || 5,
            loadScenario: loadScenario || 'constant'
        };
        
        console.log('Calculation parameters:', params);
        
        // Validate inputs
        if (!validateInputs(params)) {
            return;
        }
        
        // Calculate TCO
        calculationData = calculateTCO(params);
        console.log('Calculation result:', calculationData);
        
        // Show results
        showResults();        
        // Update display
        updateDisplay();
        
        // Show initial chart
        setTimeout(() => {
            switchChart(null, 'tco');
        }, 100);
        
    } catch (error) {
        console.error('Calculation error:', error);
        alert('An error occurred during calculation. Please check your inputs.');
    }
}

// Validate inputs
function validateInputs(params) {
    for (let key in params) {
        if (key === 'loadScenario') continue;
        if (isNaN(params[key]) || params[key] <= 0) {
            alert('Please enter valid positive numbers for all fields');
            return false;
        }
    }
    return true;
}

// Show results sections
function showResults() {
    console.log('Showing results');
    const welcomeMsg = document.getElementById('welcomeMessage');
    const kpiGrid = document.getElementById('kpiGrid');
    const chartsContainer = document.getElementById('chartsContainer');
    const exportButtons = document.getElementById('exportButtons');
    
    if (welcomeMsg) welcomeMsg.style.display = 'none';
    if (kpiGrid) kpiGrid.style.display = 'grid';    if (chartsContainer) chartsContainer.style.display = 'block';
    if (exportButtons) exportButtons.style.display = 'flex';
}

// Calculate TCO with load scenarios
function calculateTCO(params) {
    console.log('Calculating TCO with params:', params);
    
    // Constants
    const HOURS_PER_YEAR = 8760;
    const CO2_PER_MWH = 0.5; // tons CO2 per MWh
    
    // Get load scenario
    const scenario = loadScenarios[params.loadScenario] || loadScenarios['constant'];
    const utilizationFactor = scenario.yearlyUtilization;
    
    // Air cooling equipment costs
    const AIR_RACK_COST = 50000; // $50k per rack
    const AIR_MAINTENANCE_RATE = 0.05; // 5% of CAPEX annually
    const AIR_COOLING_INFRASTRUCTURE = 15000; // Additional cooling per rack
    
    // Immersion cooling equipment costs
    const IMMERSION_TANK_COST = 100000; // $100k per tank
    const IMMERSION_MAINTENANCE_RATE = 0.03; // 3% of CAPEX annually
    const IMMERSION_FLUID_COST = 5000; // Initial fluid cost per tank
    
    // Calculate effective power with load scenario
    const airTotalPower = params.airRacks * params.airPowerPerRack;
    const airEffectivePower = airTotalPower * utilizationFactor;
    const airTotalPowerWithPUE = airEffectivePower * params.airPUE;
    const airAnnualEnergy = airTotalPowerWithPUE * HOURS_PER_YEAR / 1000; // MWh
    
    // Air cooling CAPEX and OPEX    
    const airCapex = (params.airRacks * AIR_RACK_COST) + (params.airRacks * AIR_COOLING_INFRASTRUCTURE);
    const airMaintenanceCost = airCapex * AIR_MAINTENANCE_RATE;
    const airEnergyCost = airAnnualEnergy * params.electricityPrice * 1000;
    const airAnnualOpex = airEnergyCost + airMaintenanceCost;
    
    // Immersion cooling calculations
    const immersionTotalPower = params.immersionTanks * params.immersionPowerPerTank;
    const immersionEffectivePower = immersionTotalPower * utilizationFactor;
    const immersionTotalPowerWithPUE = immersionEffectivePower * params.immersionPUE;
    const immersionAnnualEnergy = immersionTotalPowerWithPUE * HOURS_PER_YEAR / 1000; // MWh
    
    // Immersion cooling CAPEX and OPEX
    const immersionCapex = (params.immersionTanks * IMMERSION_TANK_COST) + (params.immersionTanks * IMMERSION_FLUID_COST);
    const immersionMaintenanceCost = immersionCapex * IMMERSION_MAINTENANCE_RATE;
    const immersionEnergyCost = immersionAnnualEnergy * params.electricityPrice * 1000;
    const immersionAnnualOpex = immersionEnergyCost + immersionMaintenanceCost;
    
    // NPV calculations
    let airNPV = airCapex;
    let immersionNPV = immersionCapex;
    const discountFactor = 1 + (params.discountRate / 100);
    
    // Arrays for timeline chart
    const yearlyData = [];
    
    for (let year = 1; year <= params.analysisYears; year++) {
        const discountedAirOpex = airAnnualOpex / Math.pow(discountFactor, year);
        const discountedImmersionOpex = immersionAnnualOpex / Math.pow(discountFactor, year);
        
        airNPV += discountedAirOpex;
        immersionNPV += discountedImmersionOpex;        
        yearlyData.push({
            year: year,
            airCumulative: airNPV,
            immersionCumulative: immersionNPV,
            savings: airNPV - immersionNPV
        });
    }
    
    // Savings calculations
    const totalSavings = airNPV - immersionNPV;
    const annualSavings = airAnnualOpex - immersionAnnualOpex;
    const roi = immersionCapex > 0 ? ((totalSavings / immersionCapex) * 100) : 0;
    const payback = annualSavings > 0 ? ((immersionCapex - airCapex) / annualSavings) : 0;
    
    // Environmental impact
    const energySavings = airAnnualEnergy - immersionAnnualEnergy; // MWh
    const co2Reduction = energySavings * CO2_PER_MWH; // tons CO2
    const pueImprovement = params.airPUE > 0 ? ((params.airPUE - params.immersionPUE) / params.airPUE * 100) : 0;
    
    // Calculate additional environmental equivalents
    const homesEquivalent = Math.round(energySavings / 10.812); // Avg US home uses 10.812 MWh/year
    const treesEquivalent = Math.round(co2Reduction * 16.5); // One tree absorbs ~60 lbs CO2/year
    const carsEquivalent = Math.round(co2Reduction / 4.6); // Avg car emits 4.6 tons CO2/year
    
    const result = {
        air: {
            capex: airCapex,
            annualOpex: airAnnualOpex,
            totalNPV: airNPV,
            annualEnergy: airAnnualEnergy,
            energyCost: airEnergyCost,            maintenanceCost: airMaintenanceCost,
            powerTotal: airTotalPower,
            effectivePower: airEffectivePower
        },
        immersion: {
            capex: immersionCapex,
            annualOpex: immersionAnnualOpex,
            totalNPV: immersionNPV,
            annualEnergy: immersionAnnualEnergy,
            energyCost: immersionEnergyCost,
            maintenanceCost: immersionMaintenanceCost,
            powerTotal: immersionTotalPower,
            effectivePower: immersionEffectivePower
        },
        savings: {
            total: totalSavings,
            annual: annualSavings,
            roi: roi,
            payback: payback > 0 && payback < 100 ? payback : 0
        },
        environmental: {
            energySavings: energySavings,
            co2Reduction: co2Reduction,
            pueImprovement: pueImprovement,
            homesEquivalent: homesEquivalent,
            treesEquivalent: treesEquivalent,
            carsEquivalent: carsEquivalent
        },
        params: params,
        yearlyData: yearlyData,
        scenario: scenario
    };
    
    console.log('TCO Calculation result:', result);    return result;
}

// Update display
function updateDisplay() {
    console.log('Updating display with data:', calculationData);
    
    if (!calculationData) {
        console.error('No calculation data available');
        return;
    }
    
    const currency = document.getElementById('currency').value;
    const symbol = currencySymbols[currency];
    
    // Format numbers with localization
    const formatNumber = (num) => {
        if (isNaN(num) || num === null || num === undefined) return '0';
        return Math.round(num).toLocaleString();
    };
    
    const formatCurrency = (num) => {
        if (isNaN(num) || num === null || num === undefined) return `${symbol}0`;
        return `${symbol}${formatNumber(num)}`;
    };
    
    // Update KPIs with error handling
    try {
        const totalSavingsEl = document.getElementById('totalSavings');
        if (totalSavingsEl) {
            totalSavingsEl.textContent = formatCurrency(calculationData.savings.total);
        }
        
        const savingsPercentEl = document.getElementById('savingsPercent');        if (savingsPercentEl && calculationData.air.totalNPV > 0) {
            const percent = Math.round(calculationData.savings.total / calculationData.air.totalNPV * 100);
            savingsPercentEl.textContent = `${percent}% reduction`;
        }
        
        const roiEl = document.getElementById('roi');
        if (roiEl) {
            roiEl.textContent = `${Math.round(calculationData.savings.roi)}%`;
        }
        
        const paybackEl = document.getElementById('payback');
        if (paybackEl) {
            const payback = calculationData.savings.payback;
            paybackEl.textContent = payback > 0 && payback < 100 ? `${payback.toFixed(1)}` : 'Immediate';
        }
        
        const energySavingsEl = document.getElementById('energySavings');
        if (energySavingsEl) {
            energySavingsEl.textContent = formatNumber(calculationData.environmental.energySavings);
        }
        
        const co2ReductionEl = document.getElementById('co2Reduction');
        if (co2ReductionEl) {
            co2ReductionEl.textContent = formatNumber(calculationData.environmental.co2Reduction);
        }
        
        const pueImprovementEl = document.getElementById('pueImprovement');
        if (pueImprovementEl) {
            pueImprovementEl.textContent = `${calculationData.environmental.pueImprovement.toFixed(1)}%`;
        }
    } catch (error) {
        console.error('Error updating display:', error);
    }
}
// Switch chart
function switchChart(event, type) {
    console.log('Switching chart to:', type);
    
    // Handle both direct calls and button clicks
    if (typeof event === 'string') {
        type = event;
        event = null;
    }
    
    if (event) {
        event.preventDefault();
    }
    
    if (!calculationData) {
        console.error('No calculation data available for charts');
        return;
    }
    
    currentChartType = type;
    
    // Update active tab
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Find and activate the clicked tab
    const tabs = document.querySelectorAll('.chart-tab');
    const tabIndex = ['tco', 'breakdown', 'timeline', 'environmental'].indexOf(type);
    if (tabs[tabIndex]) {
        tabs[tabIndex].classList.add('active');
    }
    
    // Destroy existing chart
    if (currentChart) {
        try {
            currentChart.destroy();
        } catch (e) {            console.warn('Error destroying chart:', e);
        }
        currentChart = null;
    }
    
    // Get canvas
    const canvas = document.getElementById('chartCanvas');
    if (!canvas) {
        console.error('Chart canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    try {
        switch(type) {
            case 'tco':
                createTCOChart(ctx);
                break;
            case 'breakdown':
                createBreakdownChart(ctx);
                break;
            case 'timeline':
                createTimelineChart(ctx);
                break;
            case 'environmental':
                createEnvironmentalChart(ctx);
                break;
            default:
                console.error('Unknown chart type:', type);
        }
    } catch (error) {
        console.error('Error creating chart:', error);
    }
}

// Create TCO comparison chart
function createTCOChart(ctx) {
    if (!calculationData) return;
    
    console.log('Creating TCO chart');
    
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Air Cooling', 'Immersion Cooling'],
            datasets: [{
                label: 'Total Cost of Ownership',
                data: [
                    calculationData.air.totalNPV || 0,
                    calculationData.immersion.totalNPV || 0
                ],
                backgroundColor: [
                    'rgba(255, 68, 68, 0.5)',
                    'rgba(0, 212, 255, 0.5)'
                ],
                borderColor: [
                    'rgba(255, 68, 68, 1)',
                    'rgba(0, 212, 255, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {                            const currency = document.getElementById('currency').value;
                            const symbol = currencySymbols[currency];
                            return context.dataset.label + ': ' + symbol + Math.round(context.parsed.y).toLocaleString();
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8',
                        callback: function(value) {
                            const currency = document.getElementById('currency').value;
                            const symbol = currencySymbols[currency];
                            return symbol + value.toLocaleString();
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                }
            }
        }
    });
}

// Create cost breakdown chart
function createBreakdownChart(ctx) {
    if (!calculationData) return;
    
    console.log('Creating breakdown chart');
    
    const years = calculationData.params.analysisYears || 5;
    
    currentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Air CAPEX', 'Air OPEX', 'Immersion CAPEX', 'Immersion OPEX'],
            datasets: [{
                data: [
                    calculationData.air.capex || 0,
                    (calculationData.air.annualOpex * years) || 0,
                    calculationData.immersion.capex || 0,
                    (calculationData.immersion.annualOpex * years) || 0
                ],
                backgroundColor: [
                    'rgba(255, 68, 68, 0.7)',
                    'rgba(255, 68, 68, 0.4)',
                    'rgba(0, 212, 255, 0.7)',
                    'rgba(0, 212, 255, 0.4)'
                ],
                borderColor: '#0a0e27',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {                legend: {
                    position: 'right',
                    labels: {
                        color: '#94a3b8'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const currency = document.getElementById('currency').value;
                            const symbol = currencySymbols[currency];
                            return context.label + ': ' + symbol + Math.round(context.parsed).toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// Create timeline chart
function createTimelineChart(ctx) {
    if (!calculationData || !calculationData.yearlyData) return;
    
    console.log('Creating timeline chart');
    
    const years = ['Year 0'];
    const airCosts = [calculationData.air.capex || 0];
    const immersionCosts = [calculationData.immersion.capex || 0];
    const savings = [0];
    
    calculationData.yearlyData.forEach(data => {
        years.push(`Year ${data.year}`);        airCosts.push(data.airCumulative || 0);
        immersionCosts.push(data.immersionCumulative || 0);
        savings.push(data.savings || 0);
    });
    
    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Air Cooling',
                data: airCosts,
                borderColor: 'rgba(255, 68, 68, 1)',
                backgroundColor: 'rgba(255, 68, 68, 0.1)',
                tension: 0.4
            }, {
                label: 'Immersion Cooling',
                data: immersionCosts,
                borderColor: 'rgba(0, 212, 255, 1)',
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                tension: 0.4
            }, {
                label: 'Cumulative Savings',
                data: savings,
                borderColor: 'rgba(0, 255, 136, 1)',
                backgroundColor: 'rgba(0, 255, 136, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#94a3b8'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const currency = document.getElementById('currency').value;
                            const symbol = currencySymbols[currency];
                            return context.dataset.label + ': ' + symbol + Math.round(context.parsed.y).toLocaleString();
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8',
                        callback: function(value) {
                            const currency = document.getElementById('currency').value;
                            const symbol = currencySymbols[currency];
                            return symbol + value.toLocaleString();
                        }
                    }                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                }
            }
        }
    });
}

// Create environmental impact chart
function createEnvironmentalChart(ctx) {
    if (!calculationData) return;
    
    console.log('Creating environmental chart');
    
    // Calculate relative scores (0-100 scale)
    const airPUE = calculationData.params.airPUE || 1.7;
    const immersionPUE = calculationData.params.immersionPUE || 1.03;
    
    currentChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: [
                'Energy Efficiency',
                'Carbon Reduction',
                'PUE Improvement',
                'Water Usage',
                'Noise Reduction',                'Space Efficiency'
            ],
            datasets: [{
                label: 'Air Cooling',
                data: [
                    30,  // Energy Efficiency
                    20,  // Carbon Reduction
                    Math.max(0, (3 - airPUE) / 2 * 100),  // PUE (inverted scale)
                    70,  // Water Usage (air cooling uses more water)
                    20,  // Noise Reduction (fans are noisy)
                    40   // Space Efficiency
                ],
                borderColor: 'rgba(255, 68, 68, 1)',
                backgroundColor: 'rgba(255, 68, 68, 0.2)'
            }, {
                label: 'Immersion Cooling',
                data: [
                    95,  // Energy Efficiency
                    90,  // Carbon Reduction
                    Math.max(0, (3 - immersionPUE) / 2 * 100),  // PUE (inverted scale)
                    10,  // Water Usage (minimal)
                    95,  // Noise Reduction (no fans)
                    85   // Space Efficiency (more compact)
                ],
                borderColor: 'rgba(0, 212, 255, 1)',
                backgroundColor: 'rgba(0, 212, 255, 0.2)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {                legend: {
                    labels: {
                        color: '#94a3b8'
                    }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    pointLabels: {
                        color: '#94a3b8'
                    },
                    ticks: {
                        color: '#94a3b8',
                        backdropColor: 'transparent'
                    }
                }
            }
        }
    });
}

// Export functions
function exportPDF() {
    if (!calculationData) {
        alert('Please calculate TCO first');
        return;
    }
    
    alert('PDF export feature coming soon!\n\n' +          'The report will include:\n' +
          '• Executive summary\n' +
          '• TCO analysis\n' +
          '• Environmental impact\n' +
          '• Charts and visualizations\n' +
          '• Detailed cost breakdown');
}

function exportExcel() {
    if (!calculationData) {
        alert('Please calculate TCO first');
        return;
    }
    
    // Create CSV data
    let csv = 'TCO Analysis Report\n\n';
    csv += 'Load Scenario,' + (calculationData.scenario ? calculationData.scenario.name : 'Constant') + '\n';
    csv += 'Analysis Period,' + calculationData.params.analysisYears + ' years\n\n';
    csv += 'Parameter,Air Cooling,Immersion Cooling\n';
    csv += `CAPEX,${calculationData.air.capex},${calculationData.immersion.capex}\n`;
    csv += `Annual OPEX,${calculationData.air.annualOpex},${calculationData.immersion.annualOpex}\n`;
    csv += `Total NPV,${calculationData.air.totalNPV},${calculationData.immersion.totalNPV}\n`;
    csv += `Annual Energy (MWh),${calculationData.air.annualEnergy},${calculationData.immersion.annualEnergy}\n`;
    csv += `\nSavings Analysis\n`;
    csv += `Total Savings,${calculationData.savings.total}\n`;
    csv += `Annual Savings,${calculationData.savings.annual}\n`;
    csv += `ROI,${calculationData.savings.roi}%\n`;
    csv += `Payback Period,${calculationData.savings.payback} years\n`;
    csv += `\nEnvironmental Impact\n`;
    csv += `Energy Savings (MWh/year),${calculationData.environmental.energySavings}\n`;
    csv += `CO2 Reduction (tons/year),${calculationData.environmental.co2Reduction}\n`;
    csv += `PUE Improvement,${calculationData.environmental.pueImprovement}%\n`;    csv += `Equivalent to powering,${calculationData.environmental.homesEquivalent} homes\n`;
    csv += `Equivalent to planting,${calculationData.environmental.treesEquivalent} trees\n`;
    csv += `Cars removed from road,${calculationData.environmental.carsEquivalent}\n`;
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tco-analysis.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

function shareLink() {
    if (!calculationData) {
        alert('Please calculate TCO first');
        return;
    }
    
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams({
        airRacks: document.getElementById('airRacks').value,
        airPower: document.getElementById('airPowerPerRack').value,
        airPUE: document.getElementById('airPUE').value,
        immersionTanks: document.getElementById('immersionTanks').value,
        immersionPower: document.getElementById('immersionPowerPerTank').value,
        immersionPUE: document.getElementById('immersionPUE').value,
        years: document.getElementById('analysisYears').value,
        electricity: document.getElementById('electricityPrice').value,        discount: document.getElementById('discountRate').value,
        currency: document.getElementById('currency').value,
        language: document.getElementById('language').value,
        scenario: loadScenario
    });
    
    const shareUrl = `${baseUrl}?${params.toString()}`;
    
    // Copy to clipboard
    if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('Share link copied to clipboard!\n\n' + shareUrl);
        }).catch(() => {
            prompt('Copy this link to share:', shareUrl);
        });
    } else {
        prompt('Copy this link to share:', shareUrl);
    }
}

// Load parameters from URL
function loadUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    
    if (params.has('airRacks')) {
        document.getElementById('airRacks').value = params.get('airRacks');
    }
    if (params.has('airPower')) {
        document.getElementById('airPowerPerRack').value = params.get('airPower');
    }
    if (params.has('airPUE')) {
        document.getElementById('airPUE').value = params.get('airPUE');
    }
    if (params.has('immersionTanks')) {        document.getElementById('immersionTanks').value = params.get('immersionTanks');
    }
    if (params.has('immersionPower')) {
        document.getElementById('immersionPowerPerTank').value = params.get('immersionPower');
    }
    if (params.has('immersionPUE')) {
        document.getElementById('immersionPUE').value = params.get('immersionPUE');
    }
    if (params.has('years')) {
        document.getElementById('analysisYears').value = params.get('years');
    }
    if (params.has('electricity')) {
        document.getElementById('electricityPrice').value = params.get('electricity');
    }
    if (params.has('discount')) {
        document.getElementById('discountRate').value = params.get('discount');
    }
    if (params.has('currency')) {
        document.getElementById('currency').value = params.get('currency');
    }
    if (params.has('language')) {
        document.getElementById('language').value = params.get('language');
        updateLanguage(params.get('language'));
    }
    if (params.has('scenario')) {
        loadScenario = params.get('scenario');
        const scenarioSelect = document.getElementById('loadScenario');
        if (scenarioSelect) {
            scenarioSelect.value = loadScenario;
        }
    }
    
    // Auto-calculate if parameters are present    
     if (params.has('airRacks')) {
        setTimeout(() => {
            calculate();
        }, 500);
    }

}
// Make functions globally accessible
window.calculate = calculate;
window.switchChart = switchChart;
window.exportPDF = exportPDF;
window.exportExcel = exportExcel;
window.shareLink = shareLink;