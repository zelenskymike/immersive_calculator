// Global variables
let currentChart = null;
let calculationData = null;
let currentChartType = 'tco';

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

// Translations
const translations = {
    'en': {
        'title': 'Immersion Cooling TCO Calculator',
        'airCooling': 'Air Cooling',
        'immersionCooling': 'Immersion Cooling',
        'totalSavings': 'Total Savings',
        'roi': 'ROI',
        'payback': 'Payback Period',        'energySavings': 'Energy Savings',
        'co2Reduction': 'CO₂ Reduction',
        'calculate': 'Calculate TCO Analysis',
        'exportPDF': 'Export PDF Report',
        'exportExcel': 'Export Excel Analysis',
        'shareLink': 'Generate Share Link',
        'airRacksLabel': 'Number of 42U Racks',
        'immersionTanksLabel': 'Number of Tanks (1U-23U)',
        'autoCalculate': 'Auto-calculate tanks:',
        'years': 'Years',
        'welcomeTitle': 'Welcome to TCO Calculator',
        'welcomeMessage': 'Configure your cooling systems and click "Calculate" to see the analysis'
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
        'autoCalculate': 'حساب تلقائي للخزانات:',        'years': 'سنوات',
        'welcomeTitle': 'مرحبًا بك في حاسبة TCO',
        'welcomeMessage': 'قم بتكوين أنظمة التبريد الخاصة بك واضغط على "حساب" لرؤية التحليل'
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Load parameters from URL if present
    loadUrlParameters();
    
    // Set up event listeners
    setupEventListeners();
});

// Set up event listeners
function setupEventListeners() {
    // Auto-calculate tanks toggle
    document.getElementById('autoCalculateTanks').addEventListener('change', function(e) {
        const tanksInput = document.getElementById('tanksInputGroup');
        if (e.target.checked) {
            tanksInput.style.display = 'none';
            autoCalculateTanks();
        } else {
            tanksInput.style.display = 'block';
        }
    });

    // Currency change handler
    document.getElementById('currency').addEventListener('change', function(e) {        const symbols = document.querySelectorAll('.currency-symbol');
        symbols.forEach(s => s.textContent = currencySymbols[e.target.value]);
        if (calculationData) {
            updateDisplay();
        }
    });

    // Language change handler
    document.getElementById('language').addEventListener('change', function(e) {
        updateLanguage(e.target.value);
    });

    // Input change listeners for auto-calculation
    if (document.getElementById('autoCalculateTanks').checked) {
        document.getElementById('airRacks').addEventListener('change', autoCalculateTanks);
        document.getElementById('airPowerPerRack').addEventListener('change', autoCalculateTanks);
        document.getElementById('immersionPowerPerTank').addEventListener('change', autoCalculateTanks);
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
    document.querySelector('.header h1').textContent = '🧊 ' + t.title;
    document.querySelector('.calculate-btn').textContent = t.calculate;
    
    // Update welcome message
    document.querySelector('.welcome-message h2').textContent = t.welcomeTitle;
    document.querySelector('.welcome-message p').textContent = t.welcomeMessage;
    
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
function calculate() {    // Get input values
    const currency = document.getElementById('currency').value;
    const exchangeRate = exchangeRates[currency];
    
    const params = {
        airRacks: parseInt(document.getElementById('airRacks').value),
        airPowerPerRack: parseFloat(document.getElementById('airPowerPerRack').value),
        airPUE: parseFloat(document.getElementById('airPUE').value),
        immersionTanks: parseInt(document.getElementById('immersionTanks').value),
        immersionPowerPerTank: parseFloat(document.getElementById('immersionPowerPerTank').value),
        immersionPUE: parseFloat(document.getElementById('immersionPUE').value),
        analysisYears: parseInt(document.getElementById('analysisYears').value),
        electricityPrice: parseFloat(document.getElementById('electricityPrice').value) * exchangeRate,
        discountRate: parseFloat(document.getElementById('discountRate').value)
    };
    
    // Validate inputs
    if (!validateInputs(params)) {
        return;
    }
    
    // Calculate TCO
    calculationData = calculateTCO(params);
    
    // Show results
    showResults();
    
    // Update display
    updateDisplay();
    
    // Show initial chart    switchChart('tco');
}

// Validate inputs
function validateInputs(params) {
    for (let key in params) {
        if (isNaN(params[key]) || params[key] <= 0) {
            alert('Please enter valid positive numbers for all fields');
            return false;
        }
    }
    return true;
}

// Show results sections
function showResults() {
    document.getElementById('welcomeMessage').style.display = 'none';
    document.getElementById('kpiGrid').style.display = 'grid';
    document.getElementById('chartsContainer').style.display = 'block';
    document.getElementById('exportButtons').style.display = 'flex';
}

// Calculate TCO
function calculateTCO(params) {
    // Constants
    const HOURS_PER_YEAR = 8760;
    const CO2_PER_MWH = 0.5; // tons CO2 per MWh
    
    // Air cooling equipment costs
    const AIR_RACK_COST = 50000; // $50k per rack    const AIR_MAINTENANCE_RATE = 0.05; // 5% of CAPEX annually
    
    // Immersion cooling equipment costs
    const IMMERSION_TANK_COST = 100000; // $100k per tank
    const IMMERSION_MAINTENANCE_RATE = 0.03; // 3% of CAPEX annually
    
    // Air cooling calculations
    const airTotalPower = params.airRacks * params.airPowerPerRack;
    const airTotalPowerWithPUE = airTotalPower * params.airPUE;
    const airAnnualEnergy = airTotalPowerWithPUE * HOURS_PER_YEAR / 1000; // MWh
    const airCapex = params.airRacks * AIR_RACK_COST;
    const airMaintenanceCost = airCapex * AIR_MAINTENANCE_RATE;
    const airEnergyCost = airAnnualEnergy * params.electricityPrice * 1000;
    const airAnnualOpex = airEnergyCost + airMaintenanceCost;
    
    // Immersion cooling calculations
    const immersionTotalPower = params.immersionTanks * params.immersionPowerPerTank;
    const immersionTotalPowerWithPUE = immersionTotalPower * params.immersionPUE;
    const immersionAnnualEnergy = immersionTotalPowerWithPUE * HOURS_PER_YEAR / 1000; // MWh
    const immersionCapex = params.immersionTanks * IMMERSION_TANK_COST;
    const immersionMaintenanceCost = immersionCapex * IMMERSION_MAINTENANCE_RATE;
    const immersionEnergyCost = immersionAnnualEnergy * params.electricityPrice * 1000;
    const immersionAnnualOpex = immersionEnergyCost + immersionMaintenanceCost;
    
    // NPV calculations
    let airNPV = airCapex;
    let immersionNPV = immersionCapex;
    const discountFactor = 1 + (params.discountRate / 100);
    
    // Arrays for timeline chart    const yearlyData = [];
    
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
    const roi = ((totalSavings / immersionCapex) * 100);
    const payback = totalSavings > 0 ? (immersionCapex - airCapex) / annualSavings : 0;
    
    // Environmental impact
    const energySavings = airAnnualEnergy - immersionAnnualEnergy; // MWh
    const co2Reduction = energySavings * CO2_PER_MWH; // tons CO2
    const pueImprovement = ((params.airPUE - params.immersionPUE) / params.airPUE * 100);
    
    // Calculate additional environmental equivalents
    const homesEquivalent = Math.round(energySavings / 10.812); // Avg US home uses 10.812 MWh/year
    const treesEquivalent = Math.round(co2Reduction * 16.5); // One tree absorbs ~60 lbs CO2/year    const carsEquivalent = Math.round(co2Reduction / 4.6); // Avg car emits 4.6 tons CO2/year
    
    return {
        air: {
            capex: airCapex,
            annualOpex: airAnnualOpex,
            totalNPV: airNPV,
            annualEnergy: airAnnualEnergy,
            energyCost: airEnergyCost,
            maintenanceCost: airMaintenanceCost
        },
        immersion: {
            capex: immersionCapex,
            annualOpex: immersionAnnualOpex,
            totalNPV: immersionNPV,
            annualEnergy: immersionAnnualEnergy,
            energyCost: immersionEnergyCost,
            maintenanceCost: immersionMaintenanceCost
        },
        savings: {
            total: totalSavings,
            annual: annualSavings,
            roi: roi,
            payback: payback > 0 ? payback : 0
        },
        environmental: {
            energySavings: energySavings,
            co2Reduction: co2Reduction,
            pueImprovement: pueImprovement,
            homesEquivalent: homesEquivalent,
            treesEquivalent: treesEquivalent,            carsEquivalent: carsEquivalent
        },
        params: params,
        yearlyData: yearlyData
    };
}

// Update display
function updateDisplay() {
    if (!calculationData) return;
    
    const currency = document.getElementById('currency').value;
    const symbol = currencySymbols[currency];
    
    // Format numbers with localization
    const formatNumber = (num) => Math.round(num).toLocaleString();
    const formatCurrency = (num) => `${symbol}${formatNumber(num)}`;
    
    // Update KPIs
    document.getElementById('totalSavings').textContent = formatCurrency(calculationData.savings.total);
    document.getElementById('savingsPercent').textContent = 
        `${Math.round(calculationData.savings.total / calculationData.air.totalNPV * 100)}% reduction`;
    document.getElementById('roi').textContent = `${Math.round(calculationData.savings.roi)}%`;
    document.getElementById('payback').textContent = 
        calculationData.savings.payback > 0 ? `${calculationData.savings.payback.toFixed(1)}` : 'Immediate';
    document.getElementById('energySavings').textContent = formatNumber(calculationData.environmental.energySavings);
    document.getElementById('co2Reduction').textContent = formatNumber(calculationData.environmental.co2Reduction);
    document.getElementById('pueImprovement').textContent = 
        `${calculationData.environmental.pueImprovement.toFixed(1)}%`;
}
// Switch chart
function switchChart(type) {
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
        currentChart.destroy();
    }
    
    // Create new chart
    const ctx = document.getElementById('chartCanvas').getContext('2d');
    
    switch(type) {
        case 'tco':
            createTCOChart(ctx);
            break;
        case 'breakdown':
            createBreakdownChart(ctx);
            break;        case 'timeline':
            createTimelineChart(ctx);
            break;
        case 'environmental':
            createEnvironmentalChart(ctx);
            break;
    }
}

// Create TCO comparison chart
function createTCOChart(ctx) {
    if (!calculationData) return;
    
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Air Cooling', 'Immersion Cooling'],
            datasets: [{
                label: 'Total Cost of Ownership',
                data: [calculationData.air.totalNPV, calculationData.immersion.totalNPV],
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
        },        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const currency = document.getElementById('currency').value;
                            const symbol = currencySymbols[currency];
                            return context.dataset.label + ': ' + symbol + context.parsed.y.toLocaleString();
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
    
    currentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Air CAPEX', 'Air OPEX', 'Immersion CAPEX', 'Immersion OPEX'],
            datasets: [{
                data: [
                    calculationData.air.capex,
                    calculationData.air.annualOpex * calculationData.params.analysisYears,
                    calculationData.immersion.capex,
                    calculationData.immersion.annualOpex * calculationData.params.analysisYears
                ],
                backgroundColor: [                    'rgba(255, 68, 68, 0.7)',
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
            plugins: {
                legend: {
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
                            return context.label + ': ' + symbol + context.parsed.toLocaleString();
                        }
                    }
                }
            }
        }    });
}

// Create timeline chart
function createTimelineChart(ctx) {
    if (!calculationData) return;
    
    const years = ['Year 0'];
    const airCosts = [calculationData.air.capex];
    const immersionCosts = [calculationData.immersion.capex];
    const savings = [0];
    
    calculationData.yearlyData.forEach(data => {
        years.push(`Year ${data.year}`);
        airCosts.push(data.airCumulative);
        immersionCosts.push(data.immersionCumulative);
        savings.push(data.savings);
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
                label: 'Immersion Cooling',                data: immersionCosts,
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
            interaction: {
                mode: 'index',
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
                            return context.dataset.label + ': ' + symbol + Math.round(context.parsed.y).toLocaleString();                        }
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
    
    // Calculate relative scores (0-100 scale)
    const airPUE = calculationData.params.airPUE;
    const immersionPUE = calculationData.params.immersionPUE;
    
    currentChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: [
                'Energy Efficiency',
                'Carbon Reduction',
                'PUE Improvement',
                'Water Usage',
                'Noise Reduction',
                'Space Efficiency'
            ],
            datasets: [{
                label: 'Air Cooling',
                data: [
                    30,  // Energy Efficiency
                    20,  // Carbon Reduction
                    (3 - airPUE) / 2 * 100,  // PUE (inverted scale)
                    70,  // Water Usage (air cooling uses more water)
                    20,  // Noise Reduction (fans are noisy)
                    40   // Space Efficiency
                ],
                borderColor: 'rgba(255, 68, 68, 1)',                backgroundColor: 'rgba(255, 68, 68, 0.2)'
            }, {
                label: 'Immersion Cooling',
                data: [
                    95,  // Energy Efficiency
                    90,  // Carbon Reduction
                    (3 - immersionPUE) / 2 * 100,  // PUE (inverted scale)
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
            plugins: {
                legend: {
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
                        color: 'rgba(255, 255, 255, 0.1)'                    },
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
    // In production, would use jsPDF library
    alert('PDF export feature will generate a comprehensive report with:\n' +
          '• Executive summary\n' +
          '• TCO analysis\n' +
          '• Environmental impact\n' +
          '• Charts and visualizations\n' +
          '• Detailed cost breakdown');
}

function exportExcel() {
    // In production, would use SheetJS library
    if (!calculationData) {
        alert('Please calculate TCO first');
        return;
    }    
    // Create CSV data
    let csv = 'TCO Analysis Report\n\n';
    csv += 'Parameter,Air Cooling,Immersion Cooling\n';
    csv += `CAPEX,${calculationData.air.capex},${calculationData.immersion.capex}\n`;
    csv += `Annual OPEX,${calculationData.air.annualOpex},${calculationData.immersion.annualOpex}\n`;
    csv += `Total NPV,${calculationData.air.totalNPV},${calculationData.immersion.totalNPV}\n`;
    csv += `Annual Energy (MWh),${calculationData.air.annualEnergy},${calculationData.immersion.annualEnergy}\n`;
    csv += `\nSavings Analysis\n`;
    csv += `Total Savings,${calculationData.savings.total}\n`;
    csv += `ROI,${calculationData.savings.roi}%\n`;
    csv += `Payback Period,${calculationData.savings.payback} years\n`;
    csv += `\nEnvironmental Impact\n`;
    csv += `Energy Savings (MWh/year),${calculationData.environmental.energySavings}\n`;
    csv += `CO2 Reduction (tons/year),${calculationData.environmental.co2Reduction}\n`;
    csv += `PUE Improvement,${calculationData.environmental.pueImprovement}%\n`;
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tco-analysis.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

function shareLink() {
    if (!calculationData) {
        alert('Please calculate TCO first');
        return;    }
    
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams({
        airRacks: document.getElementById('airRacks').value,
        airPower: document.getElementById('airPowerPerRack').value,
        airPUE: document.getElementById('airPUE').value,
        immersionTanks: document.getElementById('immersionTanks').value,
        immersionPower: document.getElementById('immersionPowerPerTank').value,
        immersionPUE: document.getElementById('immersionPUE').value,
        years: document.getElementById('analysisYears').value,
        electricity: document.getElementById('electricityPrice').value,
        discount: document.getElementById('discountRate').value,
        currency: document.getElementById('currency').value,
        language: document.getElementById('language').value
    });
    
    const shareUrl = `${baseUrl}?${params.toString()}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Share link copied to clipboard!\n\n' + shareUrl);
    }).catch(() => {
        prompt('Copy this link to share:', shareUrl);
    });
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
    if (params.has('immersionTanks')) {
        document.getElementById('immersionTanks').value = params.get('immersionTanks');
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
        document.getElementById('currency').value = params.get('currency');    }
    if (params.has('language')) {
        document.getElementById('language').value = params.get('language');
        updateLanguage(params.get('language'));
    }
    
    // Auto-calculate if parameters are present
    if (params.has('airRacks')) {
        calculate();
    }
}