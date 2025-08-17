# Руководство по стилизации TCO Calculator

## Структура CSS файлов

Стили TCO Calculator теперь организованы в модульную структуру для лучшей поддержки и расширяемости.

### 📁 Структура файлов

```
styles/
├── main.css         # Главный файл - импортирует все остальные
├── base.css         # Базовые стили и CSS reset
├── header.css       # Стили заголовка и навигации
├── form.css         # Стили форм и элементов ввода
├── results.css      # Стили результатов и карточек
├── charts.css       # Стили графиков Chart.js
└── responsive.css   # Адаптивные стили для всех устройств
```

## 🎨 Как изменять стили

### 1. Изменение цветовой схемы

**Файл:** `styles/main.css`

```css
:root {
    /* Основные цвета */
    --color-primary: #667eea;        /* Основной цвет */
    --color-primary-dark: #764ba2;   /* Темный оттенок */
    --color-success: #4CAF50;        /* Успех */
    --color-warning: #ff9800;        /* Предупреждение */
    --color-error: #f44336;          /* Ошибка */
    
    /* Градиенты */
    --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --gradient-success: linear-gradient(135deg, #10b981 0%, #059669 100%);
}
```

**Пример изменения на синюю тему:**
```css
:root {
    --color-primary: #3b82f6;
    --color-primary-dark: #1e40af;
    --gradient-primary: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
}
```

### 2. Изменение шрифтов

**Файл:** `styles/base.css`

```css
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

**Пример изменения на Google Fonts:**
```css
/* В HTML добавить */
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

/* В CSS изменить */
body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

### 3. Изменение размеров и отступов

**Файл:** `styles/main.css`

```css
:root {
    /* Размеры отступов */
    --spacing-xs: 5px;
    --spacing-sm: 10px;
    --spacing-md: 20px;
    --spacing-lg: 30px;
    --spacing-xl: 40px;
    
    /* Размеры шрифтов */
    --font-size-xs: 0.75rem;
    --font-size-sm: 0.875rem;
    --font-size-base: 1rem;
    --font-size-lg: 1.125rem;
    --font-size-xl: 1.25rem;
    --font-size-2xl: 1.5rem;
    --font-size-3xl: 2rem;
}
```

### 4. Изменение стилей конкретных компонентов

#### Заголовок
**Файл:** `styles/header.css`
```css
.header h1 {
    font-size: 3rem;
    background: linear-gradient(45deg, #fff, #e0e7ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}
```

#### Кнопки
**Файл:** `styles/form.css`
```css
.btn-calculate {
    background: var(--gradient-primary);
    padding: 15px 40px;
    border-radius: 50px;
    font-size: 1.1rem;
    font-weight: 600;
}
```

#### Карточки результатов
**Файл:** `styles/results.css`
```css
.result-card {
    background: var(--gradient-card);
    padding: 25px;
    border-radius: 15px;
    border-left: 5px solid var(--color-primary);
}
```

## 🔧 Техническая информация

### Подключение стилей

Стили подключаются в HTML:
```html
<!-- Основной CSS файл -->
<link rel="stylesheet" href="/styles/main.css">
```

В `main.css` все остальные файлы импортируются:
```css
@import url('./base.css');
@import url('./header.css');
@import url('./form.css');
@import url('./results.css');
@import url('./charts.css');
@import url('./responsive.css');
```

### Серверная часть

CSS файлы обслуживаются через Node.js сервер:

```javascript
// В tco-calculator.js
if (req.method === 'GET' && req.url.startsWith('/styles/')) {
  const fs = require('fs');
  const path = require('path');
  
  const relativePath = req.url.substring(1);
  const filePath = path.join(process.cwd(), relativePath);
  const cssContent = fs.readFileSync(filePath, 'utf8');
  
  res.writeHead(200, { 
    'Content-Type': 'text/css',
    'Cache-Control': 'public, max-age=3600'
  });
  res.end(cssContent);
}
```

### Docker интеграция

В `Dockerfile` CSS файлы копируются:
```dockerfile
COPY tco-calculator.js ./
COPY styles/ ./styles/
```

## 📱 Адаптивный дизайн

### Breakpoints

**Файл:** `styles/responsive.css`

```css
/* Tablet */
@media (max-width: 1024px) { ... }

/* Mobile */
@media (max-width: 768px) { ... }

/* Small mobile */
@media (max-width: 480px) { ... }

/* Landscape mobile */
@media (max-width: 768px) and (orientation: landscape) { ... }
```

### Адаптивные утилиты

```css
/* Автоматические сетки */
.results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 25px;
}

/* Flex контейнеры */
.charts-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
}
```

## 🎯 Утилитарные классы

### Spacing
```css
.mt-sm { margin-top: var(--spacing-sm); }
.mb-md { margin-bottom: var(--spacing-md); }
.p-lg { padding: var(--spacing-lg); }
```

### Typography
```css
.text-center { text-align: center; }
.font-bold { font-weight: 700; }
.font-semibold { font-weight: 600; }
```

### Display
```css
.hidden { display: none; }
.flex { display: flex; }
.grid { display: grid; }
```

### Colors
```css
.text-primary { color: var(--color-primary); }
.text-success { color: var(--color-success); }
.text-error { color: var(--color-error); }
```

## 🚀 Практические примеры

### Создание новой темы

1. **Скопируйте переменные из `main.css`**
2. **Создайте файл `theme-dark.css`:**

```css
:root {
    --color-primary: #60a5fa;
    --color-primary-dark: #3b82f6;
    --gradient-primary: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --text-primary: #f1f5f9;
    --text-secondary: #cbd5e1;
}

body {
    background: var(--gradient-primary);
    color: var(--text-primary);
}

.form-section, .results, .charts-container {
    background: var(--bg-secondary);
    color: var(--text-primary);
}
```

3. **Подключите после основных стилей:**
```html
<link rel="stylesheet" href="/styles/main.css">
<link rel="stylesheet" href="/styles/theme-dark.css">
```

### Создание кастомного компонента

**Файл:** `styles/custom-components.css`

```css
.custom-alert {
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    border-left: 4px solid var(--color-primary);
    background: rgba(102, 126, 234, 0.1);
    color: var(--color-primary);
    margin: var(--spacing-md) 0;
}

.custom-alert.success {
    border-left-color: var(--color-success);
    background: rgba(76, 175, 80, 0.1);
    color: var(--color-success);
}

.custom-alert.error {
    border-left-color: var(--color-error);
    background: rgba(244, 67, 54, 0.1);
    color: var(--color-error);
}
```

### Анимации и переходы

```css
/* Hover эффекты */
.hover-lift {
    transition: transform var(--transition-base);
}

.hover-lift:hover {
    transform: translateY(-2px);
}

/* Загрузочные анимации */
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.loading-pulse {
    animation: pulse 2s infinite;
}

/* Появление элементов */
.fade-in-up {
    animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
```

## 🔍 Отладка стилей

### Browser DevTools

1. **Откройте DevTools** (F12)
2. **Найдите элемент** (Ctrl+Shift+C)
3. **Проверьте переменные CSS:**
```css
/* В консоли браузера */
getComputedStyle(document.documentElement).getPropertyValue('--color-primary');
```

### CSS Debugging

```css
/* Временные границы для отладки layout */
* {
    outline: 1px solid red !important;
}

/* Или более селективно */
.debug-layout > * {
    border: 1px solid rgba(255, 0, 0, 0.3);
}
```

## 📚 Полезные ресурсы

- **CSS Grid Generator**: https://cssgrid-generator.netlify.app/
- **Flexbox Guide**: https://css-tricks.com/snippets/css/a-guide-to-flexbox/
- **Color Palette**: https://coolors.co/
- **CSS Variables**: https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties
- **CSS Custom Properties**: https://css-tricks.com/a-complete-guide-to-custom-properties/

---

*Руководство обновлено: 2025-08-16*  
*Для технических вопросов смотрите ARCHITECTURE.md и CODE_GUIDE.md*