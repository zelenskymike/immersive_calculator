# TCO Calculator - Simplified Single Container Setup

A professional Total Cost of Ownership calculator for comparing air cooling vs. immersion cooling data center systems.

## Features

- **Professional TCO Analysis**: Comprehensive CAPEX, OPEX, and NPV calculations
- **Interactive Web Interface**: Modern, responsive design with real-time validation
- **Multiple Chart Types**: Bar charts, pie charts, and savings trend analysis
- **Input Validation**: Both client-side and server-side validation with detailed error messages
- **Docker Ready**: Simple single-container deployment
- **Professional Documentation**: Complete JSDoc documentation for all functions

## Quick Start

### Run Locally
```bash
node tco-calculator.js
```
Then open: http://localhost:4000

### Run with Docker
```bash
# Build and run single container
docker build -t tco-calculator .
docker run -p 4000:4000 tco-calculator

# Or use Docker Compose
docker-compose -f docker-compose.simple.yml up --build
```

## API Usage

### Calculate TCO
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"airRacks": 10, "immersionTanks": 9, "analysisYears": 5}' \
  http://localhost:4000/api/calculate
```

### Response Format
```json
{
  "timestamp": "2025-08-14T19:57:12.347Z",
  "calculationId": "calc_1755201190072",
  "comparison": {
    "savings": {
      "totalSavings": 279538,
      "annualSavings": 80735,
      "paybackYears": 0.9,
      "roiPercent": 87.4
    },
    "efficiency": {
      "pueImprovement": 38.9,
      "annualEnergySavingsMWh": 567,
      "annualCarbonReductionTons": 227
    }
  }
}
```

## Input Parameters

### Air Cooling System
- `airRacks`: Number of 42U racks (1-1000)
- `airPowerPerRack`: Power per rack in kW (1-100)
- `airRackCost`: Cost per rack setup in $ (10,000-200,000)
- `airPUE`: Power Usage Effectiveness (1.0-3.0)

### Immersion Cooling System  
- `immersionTanks`: Number of tanks (1-500)
- `immersionPowerPerTank`: Power per tank in kW (5-200)
- `immersionTankCost`: Cost per tank in $ (20,000-300,000)
- `immersionPUE`: Power Usage Effectiveness (1.0-2.0)

### Analysis Parameters
- `analysisYears`: Analysis period (1-20 years)
- `electricityPrice`: Cost per kWh (0.01-1.00)
- `discountRate`: Annual discount rate % (0-30)
- `maintenanceCost`: Maintenance as % of CAPEX (0-15)

## Files

- **tco-calculator.js**: Main standalone application
- **Dockerfile**: Single container build
- **docker-compose.simple.yml**: Simple deployment
- **package-simple.json**: Simplified dependencies

## Architecture

The application is built as a single self-contained Node.js file with:
- HTTP server for web interface and API
- Embedded HTML/CSS/JavaScript for the frontend
- Comprehensive input validation
- Professional chart visualizations using Chart.js
- Enhanced error handling and logging

## Calculations

The calculator performs:
- **CAPEX Analysis**: Initial equipment investment costs
- **OPEX Analysis**: Annual operating costs (electricity + maintenance)
- **NPV Calculations**: Net Present Value with configurable discount rates
- **ROI Analysis**: Return on Investment and payback periods
- **Efficiency Metrics**: PUE improvements and energy savings
- **Environmental Impact**: CO2 reduction calculations

## Development

The code is fully documented with JSDoc comments and includes:
- Type definitions for all functions
- Parameter validation
- Error handling
- Professional code structure
- Comprehensive inline documentation