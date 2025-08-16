# TCO Calculator - Архитектура приложения

## Обзор системы

TCO Calculator - это одностраничное Node.js приложение для расчета общей стоимости владения (Total Cost of Ownership) систем охлаждения дата-центров. Приложение сравнивает традиционное воздушное охлаждение с иммерсионным охлаждением.

## Архитектурные принципы

### 1. Single-File Architecture
- **Философия**: Все в одном файле для максимальной простоты развертывания
- **Преимущества**: Нет зависимостей, легкое развертывание, простота отладки
- **Файл**: `tco-calculator.js` (~1700 строк)

### 2. Stateless Design
- **Без сессий**: Каждый запрос независим
- **Без базы данных**: Все расчеты выполняются в реальном времени
- **Масштабируемость**: Легко горизонтальное масштабирование

### 3. Progressive Enhancement
- **Базовая функциональность**: Работает без JavaScript на клиенте
- **Расширенный UX**: JavaScript добавляет интерактивность
- **Graceful Degradation**: Приложение работает даже при ошибках

## Компонентная архитектура

### HTTP Server Layer
```
┌─────────────────────────────────────┐
│           HTTP Server               │
│  (Express-like routing на Node.js)  │
├─────────────────────────────────────┤
│ Routes:                             │
│  GET  /           → HTML Form       │
│  POST /api/calculate → JSON API     │
│  GET  /health     → Health Check    │
└─────────────────────────────────────┘
```

### Business Logic Layer
```
┌─────────────────────────────────────┐
│        Calculation Engine           │
├─────────────────────────────────────┤
│ • calculateTCO()                    │
│ • calculateAirCooling()             │
│ • calculateImmersionCooling()       │
│ • calculateComparison()             │
│ • calculateEnvironmentalImpact()    │
└─────────────────────────────────────┘
```

### Presentation Layer
```
┌─────────────────────────────────────┐
│         Frontend Components        │
├─────────────────────────────────────┤
│ • HTML Form (server-rendered)       │
│ • Chart.js Visualizations          │
│ • Real-time Calculations           │
│ • Environmental Impact Display     │
│ • Error Handling & Validation      │
└─────────────────────────────────────┘
```

## Структура данных

### Input Parameters
```javascript
{
  airRacks: number,           // Количество воздушных стоек (1-50)
  immersionTanks: number,     // Количество иммерсионных танков (1-50)
  analysisYears: number,      // Период анализа в годах (1-10)
  electricityPrice: number,   // Цена электричества ($/kWh)
  discountRate: number,       // Ставка дисконтирования (%)
  maintenanceCost: number     // Стоимость обслуживания (%)
}
```

### Calculation Result
```javascript
{
  timestamp: string,
  calculationId: string,
  parameters: InputParameters,
  airCooling: {
    equipment: { count, totalPowerKW, pue },
    costs: { capex, annualOpex, totalTCO },
    energy: { annualConsumptionMWh }
  },
  immersionCooling: {
    equipment: { count, totalPowerKW, pue },
    costs: { capex, annualOpex, totalTCO },
    energy: { annualConsumptionMWh }
  },
  comparison: {
    savings: { totalSavings, annualSavings, roiPercent, paybackYears },
    efficiency: { pueImprovement, energySavingsPercent }
  },
  environmental: {
    annualEnergySavingsMWh: number,
    annualCarbonReductionTons: number,
    pueImprovement: number
  }
}
```

## Функциональные модули

### 1. Server Infrastructure (`lines 1-150`)
**Назначение**: HTTP сервер и маршрутизация
```javascript
// Поиск свободного порта
// HTTP сервер с обработкой маршрутов
// Graceful shutdown handling
// Error handling middleware
```

### 2. Financial Calculations (`lines 200-600`)
**Назначение**: Основные TCO расчеты
```javascript
function calculateTCO(parameters) {
  // Расчет воздушного охлаждения
  // Расчет иммерсионного охлаждения  
  // Сравнительный анализ
  // ROI и payback период
}
```

### 3. Environmental Impact (`lines 600-800`)
**Назначение**: Экологические показатели
```javascript
// PUE improvement calculation
// CO₂ emissions reduction
// Energy savings analysis
// ESG compliance metrics
```

### 4. Web Interface (`lines 800-1200`)
**Назначение**: HTML form и CSS стили
```javascript
// Responsive HTML form
// CSS стилизация
// Input validation
// Mobile optimization
```

### 5. Client-Side Logic (`lines 1200-1700`)
**Назначение**: JavaScript для браузера
```javascript
// Real-time calculations
// Chart.js integration
// Form validation
// Error handling
```

## Технические решения

### 1. Port Discovery
```javascript
// Автоматический поиск свободного порта
// Fallback на стандартные порты
// Docker-friendly configuration
```

### 2. Error Handling Strategy
```javascript
// Try-catch на всех уровнях
// Graceful degradation
// User-friendly error messages
// Detailed logging
```

### 3. Data Validation
```javascript
// Server-side validation
// Client-side validation
// Type checking
// Range validation
```

### 4. Memory Management
```javascript
// Stateless operations
// No memory leaks
// Efficient calculations
// Minimal resource usage
```

## Интеграции

### External Libraries
- **Chart.js 4.4.0**: Графики и диаграммы
- **No other dependencies**: Vanilla Node.js

### Browser Compatibility
- **Modern browsers**: Chrome, Firefox, Safari, Edge
- **Mobile responsive**: iOS Safari, Chrome Mobile
- **Fallback**: Базовая функциональность без JavaScript

## Deployment Architecture

### Development
```bash
node tco-calculator.js
# Порт: 3000
# Режим: development logging
```

### Production (Docker)
```bash
docker-compose -f docker-compose.simple.yml up
# Порт: 3001 (external) → 4000 (internal)
# Режим: production optimized
# Health checks: enabled
```

### Scaling Options
1. **Горизонтальное масштабирование**: Множественные контейнеры за load balancer
2. **Вертикальное масштабирование**: Увеличение ресурсов контейнера
3. **CDN integration**: Статические ресурсы через CDN

## Security Architecture

### Input Validation
- Numeric range validation
- Type checking
- Sanitization
- XSS prevention

### HTTP Security
- No sensitive data storage
- Stateless operations
- Rate limiting ready
- CORS headers

## Performance Characteristics

### Response Times
- **Form render**: <50ms
- **Calculation**: <10ms
- **Chart generation**: <100ms
- **Total page load**: <200ms

### Resource Usage
- **Memory**: ~50MB base
- **CPU**: Minimal (calculation-bound)
- **Network**: ~500KB page size
- **Storage**: Stateless (0 persistent data)

## Monitoring & Observability

### Health Checks
```javascript
GET /health
// Returns: system status, uptime, memory usage
// Used by: Docker health checks, load balancers
```

### Logging
```javascript
// Request logging
// Error logging  
// Performance metrics
// Calculation auditing
```

### Metrics
- Request count and latency
- Error rates
- Memory usage
- Calculation accuracy

## Development Guidelines

### Code Organization
1. **Server setup** (top of file)
2. **Business logic** (calculation functions)
3. **HTML generation** (template functions)
4. **Client-side code** (browser JavaScript)

### Naming Conventions
- **Functions**: camelCase (`calculateTCO`)
- **Variables**: camelCase (`totalSavings`)
- **Constants**: UPPER_CASE (`PUE_AIR_COOLING`)
- **IDs**: kebab-case (`results-grid`)

### Error Handling
- Always use try-catch for critical operations
- Provide fallback values for all calculations
- Log errors with context
- Return user-friendly error messages

### Testing Strategy
- Manual testing in development
- Docker container health checks
- Integration testing via curl/API calls
- Visual testing in multiple browsers

## Future Enhancements

### Planned Features
1. **Multi-language support**: i18n implementation
2. **Advanced charts**: More visualization types
3. **Export functionality**: PDF/Excel reports
4. **Comparison scenarios**: Multiple configuration comparison

### Architecture Evolution
1. **Microservices**: Split into calculation service + UI service
2. **Database integration**: Store calculation history
3. **Authentication**: User accounts and saved calculations
4. **Real-time updates**: WebSocket for live calculations

---

*Документация обновлена: 2025-08-16*  
*Версия приложения: Single-file TCO Calculator v1.0*