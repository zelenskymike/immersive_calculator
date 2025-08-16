# TCO Calculator - Руководство по коду

## Обзор файла tco-calculator.js

Это полное руководство поможет вам понимать и изменять код TCO Calculator. Файл содержит ~1700 строк кода, организованных в логические блоки.

## Структура файла

### 1. Заголовок и импорты (строки 1-25)
```javascript
// Заголовок с описанием приложения
const http = require('http');  // HTTP сервер
const net = require('net');    // Проверка портов
```

### 2. Утилиты портов (строки 26-66)
```javascript
function checkPort(port)           // Проверяет доступность порта
function findAvailablePort(start)  // Находит свободный порт
```

### 3. Валидация данных (строки 67-128)
```javascript
function validateInput(params)     // Валидирует все входные параметры
```
**Проверяет:**
- Количество стоек/танков (1-1000/500)
- Мощность оборудования (1-100/5-200 кВт)
- Стоимость оборудования ($10K-$500K/$20K-$1M)
- PUE значения (1.0-3.0/1.0-2.0)
- Период анализа (1-20 лет)
- Цена электричества ($0.01-$1.00/кВт⋅ч)

### 4. Основная функция расчета (строки 129-300)
```javascript
function calculateTCO(params)      // Главная функция расчета
```

#### Этапы расчета:
1. **Валидация** - проверка входных данных
2. **Воздушное охлаждение** - расчет CAPEX/OPEX
3. **Иммерсионное охлаждение** - расчет CAPEX/OPEX  
4. **NPV расчеты** - дисконтирование по годам
5. **Финансовый анализ** - ROI, payback, savings
6. **Экологический анализ** - энергосбережение, CO₂

#### Ключевые формулы:
```javascript
// Общая мощность с учетом PUE
totalPowerWithPUE = equipment * powerPerUnit * PUE

// Годовые затраты на электричество
annualElectricity = totalPowerWithPUE * 8760 * electricityPrice

// Дисконтированная стоимость
discountedCost = annualCost / Math.pow(1 + discountRate, year)

// ROI (Return on Investment)
roiPercent = totalSavings / totalInvestment * 100
```

### 5. HTML генерация (строки 301-900)
```javascript
function generateHTML()            // Создает HTML страницу
```

#### Секции HTML:
- **Meta теги** - viewport, charset, description
- **CSS стили** - responsive design, анимации
- **HTML форма** - inputs с валидацией
- **Results containers** - для отображения результатов

#### CSS особенности:
- **CSS Grid** для layout
- **Flexbox** для компонентов
- **Media queries** для мобильных устройств
- **Custom properties** для цветовых схем

### 6. HTTP сервер (строки 901-1000)
```javascript
const server = http.createServer()  // Основной сервер
```

#### Маршруты:
- `GET /` - главная страница с формой
- `POST /api/calculate` - API для расчетов
- `GET /health` - health check для Docker

#### Обработка запросов:
- **URL parsing** - разбор URL и query параметров
- **Body parsing** - обработка POST данных
- **Error handling** - перехват и обработка ошибок
- **Content-Type** - правильные заголовки

### 7. Client-side JavaScript (строки 1001-1700)
```javascript
// JavaScript код для браузера (внутри <script> тега)
```

#### Функции браузера:
```javascript
calculateTCO()                     // Отправка AJAX запросов
displayResults(data)               // Отображение результатов
createChart(type, data)            // Создание Chart.js графиков
updateChartView(view)              // Переключение видов графиков
validateForm()                     // Валидация формы
```

#### Chart.js интеграция:
- **Bar charts** - сравнение CAPEX/OPEX
- **Line charts** - ROI по годам
- **Pie charts** - структура затрат
- **Responsive** - адаптация под экран

#### Error handling:
- **Try-catch** блоки вокруг критических операций
- **Fallback** значения для всех расчетов
- **User-friendly** сообщения об ошибках

## Ключевые концепции

### 1. TCO (Total Cost of Ownership)
```
TCO = CAPEX + NPV(OPEX_1) + NPV(OPEX_2) + ... + NPV(OPEX_n)

где:
- CAPEX = Капитальные затраты (первоначальные)
- OPEX = Операционные затраты (ежегодные)
- NPV = Чистая приведенная стоимость
```

### 2. PUE (Power Usage Effectiveness)
```
PUE = Общая мощность дата-центра / IT мощность

Типичные значения:
- Воздушное охлаждение: 1.8-2.0
- Иммерсионное охлаждение: 1.1-1.2
```

### 3. NPV (Net Present Value)
```
NPV = Будущая_стоимость / (1 + discount_rate)^год

Учитывает снижение стоимости денег во времени
```

## Как изменять код

### Добавление нового параметра:

1. **Валидация** (функция `validateInput`):
```javascript
if (newParam < minValue || newParam > maxValue) {
  throw new Error('New parameter must be between min and max');
}
```

2. **Расчеты** (функция `calculateTCO`):
```javascript
const newCalculation = newParam * someMultiplier;
```

3. **HTML форма** (функция `generateHTML`):
```javascript
<input type="number" id="newParam" name="newParam" 
       min="minValue" max="maxValue" value="defaultValue">
```

4. **Client-side** (browser JavaScript):
```javascript
const newParam = parseFloat(formData.get('newParam'));
```

### Изменение внешнего вида:

1. **CSS стили** (в функции `generateHTML`):
```css
.new-style {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
}
```

2. **Responsive design**:
```css
@media (max-width: 768px) {
  .container {
    padding: 1rem;
    grid-template-columns: 1fr;
  }
}
```

### Добавление нового типа графика:

1. **Chart creation** (browser JavaScript):
```javascript
function createNewChart(canvasId, data) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  return new Chart(ctx, {
    type: 'doughnut', // или 'radar', 'scatter'
    data: {
      labels: data.labels,
      datasets: data.datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: true
    }
  });
}
```

## Debugging и тестирование

### Логирование:
```javascript
console.log('🔍 Debug info:', { variable1, variable2 });
console.error('❌ Error:', error.message);
console.warn('⚠️ Warning:', warningMessage);
```

### Тестирование API:
```bash
# Тест расчета
curl -X POST http://localhost:3001/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"airRacks":2,"immersionTanks":1,"analysisYears":3}'

# Health check
curl http://localhost:3001/health
```

### Проверка валидации:
```javascript
// Тест с некорректными данными
try {
  validateInput({ airRacks: -1 }); // Должен выбросить ошибку
} catch (error) {
  console.log('✅ Validation working:', error.message);
}
```

## Performance оптимизация

### 1. Кэширование результатов:
```javascript
const calculationCache = new Map();
const cacheKey = JSON.stringify(params);
if (calculationCache.has(cacheKey)) {
  return calculationCache.get(cacheKey);
}
```

### 2. Lazy loading для графиков:
```javascript
// Создавать графики только при первом показе
if (!chart.initialized) {
  createChart(chartData);
  chart.initialized = true;
}
```

### 3. Debouncing для real-time расчетов:
```javascript
let timeout;
function debouncedCalculate() {
  clearTimeout(timeout);
  timeout = setTimeout(calculateTCO, 300);
}
```

## Безопасность

### Input sanitization:
```javascript
function sanitizeInput(value) {
  return parseFloat(value) || 0; // Преобразует в число или 0
}
```

### XSS защита:
```javascript
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  })[m]);
}
```

## Deployment

### Docker build:
```bash
docker build -t tco-calculator .
docker run -p 3001:4000 tco-calculator
```

### Environment variables:
```javascript
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';
```

---

*Руководство обновлено: 2025-08-16*  
*Для вопросов по коду обращайтесь к ARCHITECTURE.md*