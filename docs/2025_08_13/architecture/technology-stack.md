# Technology Stack Selection and Justification

## Executive Summary

This document outlines the complete technology stack selection for the Immersion Cooling TCO Calculator, providing detailed justification for each choice based on requirements analysis, performance criteria, team expertise, and long-term maintainability considerations.

## Decision Framework

### Selection Criteria
1. **Performance Requirements**: <2s load times, <1s calculations
2. **Scalability Needs**: 100+ concurrent users, horizontal scaling capability
3. **Security Standards**: Comprehensive input validation, XSS/CSRF protection
4. **Internationalization**: English/Arabic with RTL support
5. **Team Expertise**: Minimize learning curve while ensuring quality
6. **Maintenance Burden**: Long-term supportability and community backing
7. **Cost Effectiveness**: Balance licensing costs with development efficiency

### Risk Assessment Matrix
| Technology Choice | Performance Risk | Security Risk | Maintenance Risk | Learning Curve | Overall Risk |
|------------------|-----------------|---------------|----------------|---------------|-------------|
| React + TypeScript | Low | Low | Low | Low | **LOW** |
| Node.js + Express | Low | Medium | Low | Low | **LOW** |
| PostgreSQL | Low | Low | Low | Low | **LOW** |
| Redis | Low | Low | Medium | Low | **LOW-MEDIUM** |

## Frontend Technology Stack

### JavaScript Framework: React 18

**Decision**: React 18 with TypeScript
**Alternatives Considered**: Vue.js 3, Angular 15

#### Justification
```typescript
// React 18 advantages for our use case:
// 1. Concurrent rendering for calculation updates
// 2. Automatic batching for performance
// 3. Strong ecosystem for financial applications

import { useDeferredValue, useTransition } from 'react';

const CalculatorDashboard = () => {
  const [config, setConfig] = useState<CalculationConfig>();
  const [isPending, startTransition] = useTransition();
  const deferredConfig = useDeferredValue(config);
  
  // Real-time calculation updates without blocking UI
  const handleConfigChange = (newConfig: CalculationConfig) => {
    setConfig(newConfig); // Immediate UI update
    startTransition(() => {
      // Deferred expensive calculation
      performCalculation(deferredConfig);
    });
  };
  
  return (
    <div>
      {isPending && <CalculationSpinner />}
      <ConfigurationForm onChange={handleConfigChange} />
      <ResultsDashboard data={deferredConfig} />
    </div>
  );
};
```

#### Comparison Analysis
| Factor | React 18 | Vue.js 3 | Angular 15 | Score |
|--------|----------|----------|------------|-------|
| **Performance** | Concurrent rendering, automatic batching | Fast reactivity system | Zone.js overhead | **React** |
| **TypeScript Integration** | Excellent, first-class support | Good, improving rapidly | Native TypeScript | **Tie** |
| **Ecosystem Maturity** | Massive ecosystem | Growing rapidly | Enterprise-focused | **React** |
| **Learning Curve** | Moderate, team familiar | Low to moderate | Steep learning curve | **Vue** |
| **i18n Support** | react-i18next (mature) | vue-i18n (good) | Angular i18n (complex) | **React** |
| **Chart Libraries** | Recharts, Chart.js | Vue-chartjs | ng-chartjs | **React** |

### UI Component Library: Material-UI v5

**Decision**: Material-UI (MUI) v5
**Alternatives Considered**: Ant Design, Chakra UI, Tailwind + Headless UI

```typescript
// MUI v5 advantages for our application
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Box, Paper, Typography } from '@mui/material';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';

// RTL support for Arabic layout
const rtlCache = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

const theme = createTheme({
  direction: 'rtl', // Full RTL support
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' }
  },
  typography: {
    fontFamily: ['Roboto', 'Noto Sans Arabic', 'sans-serif'].join(',')
  }
});

const App = () => (
  <CacheProvider value={rtlCache}>
    <ThemeProvider theme={theme}>
      <CalculatorApplication />
    </ThemeProvider>
  </CacheProvider>
);
```

#### Feature Comparison
| Feature | Material-UI | Ant Design | Chakra UI | Tailwind + Headless |
|---------|-------------|------------|-----------|-------------------|
| **RTL Support** | Excellent | Good | Limited | Manual implementation |
| **TypeScript** | Excellent | Good | Excellent | Manual types |
| **Accessibility** | WCAG compliant | Good | Excellent | Manual implementation |
| **Chart Integration** | Good | Excellent | Limited | Manual integration |
| **Bundle Size** | Medium (tree-shakable) | Large | Small | Minimal |
| **Customization** | Theme system | Less flexible | Highly customizable | Maximum flexibility |

**Final Decision**: Material-UI for comprehensive RTL support and WCAG compliance

### State Management: Zustand

**Decision**: Zustand
**Alternatives Considered**: Redux Toolkit, Jotai, Valtio

```typescript
// Zustand store for calculator state
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface CalculatorStore {
  // Configuration state
  configuration: CalculationConfig;
  results: CalculationResults | null;
  
  // UI state
  currentStep: number;
  isCalculating: boolean;
  errors: ValidationError[];
  
  // Locale state
  language: 'en' | 'ar';
  currency: 'USD' | 'EUR' | 'SAR' | 'AED';
  
  // Actions
  updateConfiguration: (config: Partial<CalculationConfig>) => void;
  performCalculation: () => Promise<void>;
  setLanguage: (lang: 'en' | 'ar') => void;
  setCurrency: (currency: string) => void;
  
  // Computed selectors
  get capexSavings(): number;
  get totalTcoSavings(): number;
  get roiPercentage(): number;
}

const useCalculatorStore = create<CalculatorStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    configuration: initialConfig,
    results: null,
    currentStep: 1,
    isCalculating: false,
    errors: [],
    language: 'en',
    currency: 'USD',
    
    // Actions
    updateConfiguration: (config) => set((state) => ({
      configuration: { ...state.configuration, ...config },
      errors: [] // Clear errors on update
    })),
    
    performCalculation: async () => {
      set({ isCalculating: true, errors: [] });
      try {
        const results = await calculateTCO(get().configuration);
        set({ results, isCalculating: false });
      } catch (error) {
        set({ 
          errors: [{ field: 'calculation', message: error.message }],
          isCalculating: false 
        });
      }
    },
    
    // Computed getters
    get capexSavings() {
      const { results } = get();
      return results 
        ? results.breakdown.capex.airCooling.total - results.breakdown.capex.immersionCooling.total
        : 0;
    }
  }))
);
```

#### State Management Comparison
| Factor | Zustand | Redux Toolkit | Jotai | Decision |
|--------|---------|---------------|-------|----------|
| **Bundle Size** | 2.7kb | 11kb+ | 3.8kb | **Zustand** |
| **Learning Curve** | Minimal | Moderate | Moderate | **Zustand** |
| **TypeScript Support** | Excellent | Excellent | Good | **Tie** |
| **DevTools** | Basic | Excellent | Basic | **Redux** |
| **Boilerplate** | Minimal | Low | Minimal | **Zustand** |
| **Performance** | Excellent | Good | Excellent | **Tie** |

### Internationalization: react-i18next

**Decision**: react-i18next
**Alternatives Considered**: Format.js (react-intl), Lingui

```typescript
// i18n configuration with RTL support
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    lng: 'en',
    
    resources: {
      en: {
        common: {
          'calculate': 'Calculate',
          'air_cooling': 'Air Cooling',
          'immersion_cooling': 'Immersion Cooling',
          'total_savings': 'Total Savings: {{amount, currency}}'
        },
        calculator: {
          'rack_count': 'Number of Racks',
          'power_per_rack': 'Power per Rack (kW)',
          'analysis_period': 'Analysis Period (Years)'
        }
      },
      ar: {
        common: {
          'calculate': 'احسب',
          'air_cooling': 'التبريد الهوائي',
          'immersion_cooling': 'التبريد بالغمر',
          'total_savings': 'إجمالي الوفورات: {{amount, currency}}'
        }
      }
    },
    
    interpolation: {
      escapeValue: false,
      format: (value, format, lng) => {
        if (format === 'currency') {
          return new Intl.NumberFormat(lng, {
            style: 'currency',
            currency: getCurrentCurrency()
          }).format(value);
        }
        return value;
      }
    }
  });

// RTL detection and layout switching
const useRTLSupport = () => {
  const { i18n } = useTranslation();
  
  useEffect(() => {
    const isRTL = i18n.language === 'ar';
    document.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);
};
```

### Charts and Visualization: Recharts

**Decision**: Recharts
**Alternatives Considered**: Chart.js with react-chartjs-2, D3.js, Victory

```typescript
// Recharts implementation for TCO visualization
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const TCOProgressionChart = ({ data }: { data: TCOData[] }) => {
  const { t } = useTranslation();
  
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="year" 
          label={{ value: t('chart.year'), position: 'insideBottom', offset: -10 }}
        />
        <YAxis 
          label={{ value: t('chart.cost_usd'), angle: -90, position: 'insideLeft' }}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
        />
        <Tooltip 
          formatter={(value, name) => [
            new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(value as number),
            t(`chart.${name}`)
          ]}
          labelFormatter={(year) => `${t('chart.year')} ${year}`}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="airCooling" 
          stroke="#ff7300" 
          name="air_cooling"
          strokeWidth={3}
        />
        <Line 
          type="monotone" 
          dataKey="immersionCooling" 
          stroke="#387908" 
          name="immersion_cooling"
          strokeWidth={3}
        />
        <Line 
          type="monotone" 
          dataKey="savings" 
          stroke="#8884d8" 
          name="cumulative_savings"
          strokeDasharray="5 5"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

#### Visualization Library Comparison
| Feature | Recharts | Chart.js | D3.js | Victory |
|---------|----------|----------|-------|---------|
| **React Integration** | Native | Wrapper needed | Manual | Native |
| **Bundle Size** | 400kb | 400kb+ | Modular | 500kb+ |
| **Responsiveness** | Excellent | Good | Manual | Good |
| **Accessibility** | Basic | Basic | Manual | Good |
| **Customization** | Good | Excellent | Unlimited | Good |
| **Performance** | Good | Excellent | Excellent | Good |
| **RTL Support** | Manual | Manual | Manual | Manual |

## Backend Technology Stack

### Runtime Environment: Node.js 18

**Decision**: Node.js 18 LTS with TypeScript
**Alternatives Considered**: Python 3.11, Go 1.20

```typescript
// Node.js advantages for our use case
import cluster from 'cluster';
import os from 'os';

// Cluster mode for performance
if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`Master ${process.pid} is running`);
  
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork(); // Replace dead worker
  });
} else {
  // Worker process
  startServer();
}

async function startServer() {
  const app = createExpressApp();
  const server = app.listen(process.env.PORT || 3000);
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    server.close((err) => {
      if (err) console.error('Server close error:', err);
      process.exit(0);
    });
  });
}
```

#### Runtime Comparison
| Factor | Node.js 18 | Python 3.11 | Go 1.20 | Decision |
|--------|------------|--------------|---------|----------|
| **Performance** | Good (V8 engine) | Moderate (interpreted) | Excellent (compiled) | **Go** |
| **Development Speed** | Fast (JS ecosystem) | Fast (rapid prototyping) | Moderate (static typing) | **Node.js** |
| **Team Expertise** | High | Medium | Low | **Node.js** |
| **Library Ecosystem** | Massive | Large | Growing | **Node.js** |
| **JSON Processing** | Excellent | Good | Good | **Node.js** |
| **Deployment** | Simple | Simple | Single binary | **Go** |
| **Memory Usage** | Medium | High | Low | **Go** |

**Final Decision**: Node.js for team expertise and development velocity

### Web Framework: Express.js with TypeScript

**Decision**: Express.js 4.18 with TypeScript
**Alternatives Considered**: Fastify, Koa.js, NestJS

```typescript
// Express.js with comprehensive middleware setup
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { body, validationResult } from 'express-validator';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:']
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', apiLimiter);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Calculation endpoint with validation
app.post('/api/v1/calculations/calculate',
  [
    body('configuration.airCooling.racks')
      .isInt({ min: 1, max: 1000 })
      .withMessage('Rack count must be between 1 and 1000'),
    body('configuration.financial.analysisYears')
      .isInt({ min: 1, max: 10 })
      .withMessage('Analysis period must be between 1 and 10 years'),
    body('locale')
      .isIn(['en', 'ar'])
      .withMessage('Locale must be either en or ar'),
    body('currency')
      .isIn(['USD', 'EUR', 'SAR', 'AED'])
      .withMessage('Currency must be USD, EUR, SAR, or AED')
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input parameters',
          details: errors.array()
        }
      });
    }

    try {
      const calculationService = new CalculationService();
      const results = await calculationService.calculateTCO(req.body);
      
      res.json({
        success: true,
        data: results,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          locale: req.body.locale,
          currency: req.body.currency
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'CALCULATION_ERROR',
          message: 'Calculation failed',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }
);
```

#### Framework Comparison
| Factor | Express.js | Fastify | NestJS | Koa.js |
|--------|------------|---------|---------|---------|
| **Performance** | Good | Excellent | Good | Good |
| **Learning Curve** | Low | Low | High | Medium |
| **Middleware Ecosystem** | Massive | Growing | Built-in | Medium |
| **TypeScript Support** | Good (community) | Excellent | Native | Good |
| **Documentation** | Excellent | Good | Excellent | Good |
| **Enterprise Features** | Community add-ons | Built-in | Built-in | Manual |

### Database: PostgreSQL 14

**Decision**: PostgreSQL 14
**Alternatives Considered**: MySQL 8.0, MongoDB, SQLite

```sql
-- PostgreSQL advantages for financial calculations
-- ACID compliance and precise decimal arithmetic
CREATE TABLE calculation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Financial data with precise decimal storage
    capex_air_cooling DECIMAL(15,2) NOT NULL,
    capex_immersion_cooling DECIMAL(15,2) NOT NULL,
    annual_opex_savings DECIMAL(15,2) NOT NULL,
    
    -- JSON storage for flexible configuration
    configuration JSONB NOT NULL,
    results JSONB NOT NULL,
    
    -- Multi-currency support
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    exchange_rate DECIMAL(10,6) NOT NULL DEFAULT 1.0,
    
    -- Internationalization
    locale VARCHAR(5) NOT NULL DEFAULT 'en',
    
    -- Temporal data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Full-text search capability
    search_vector tsvector GENERATED ALWAYS AS (
      to_tsvector('english', 
        COALESCE(configuration->>'description', '') || ' ' ||
        COALESCE(configuration->>'tags', '')
      )
    ) STORED
);

-- Indexes for performance
CREATE INDEX idx_calculation_sessions_currency_created 
ON calculation_sessions(currency, created_at DESC);

CREATE INDEX idx_calculation_sessions_expires 
ON calculation_sessions(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX idx_calculation_sessions_search 
ON calculation_sessions USING gin(search_vector);

-- Partition by date for scalability
CREATE TABLE calculation_sessions_y2025m08 
PARTITION OF calculation_sessions
FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

-- Automatic cleanup of expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM calculation_sessions 
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup
SELECT cron.schedule('cleanup-sessions', '0 2 * * *', 'SELECT cleanup_expired_sessions();');
```

#### Database Comparison
| Factor | PostgreSQL | MySQL | MongoDB | SQLite |
|--------|------------|-------|---------|---------|
| **ACID Compliance** | Full | Full | Limited | Full |
| **JSON Support** | Excellent (JSONB) | Good | Native | Limited |
| **Decimal Precision** | Excellent | Good | JavaScript numbers | Limited |
| **Full-text Search** | Built-in | Basic | Good | Basic |
| **Scalability** | Excellent | Good | Excellent | Limited |
| **Administration** | Advanced | Good | Simple | None |

### Caching Layer: Redis 6

**Decision**: Redis 6 with clustering support
**Alternatives Considered**: Memcached, In-memory caching, DragonflyDB

```typescript
// Redis implementation for caching and session management
import Redis from 'ioredis';

class CacheService {
  private redis: Redis.Cluster;
  private localCache = new Map<string, { data: any; expiry: number }>();
  
  constructor() {
    // Redis cluster configuration for high availability
    this.redis = new Redis.Cluster([
      { host: process.env.REDIS_HOST_1, port: 6379 },
      { host: process.env.REDIS_HOST_2, port: 6379 },
      { host: process.env.REDIS_HOST_3, port: 6379 }
    ], {
      redisOptions: {
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      },
      clusterRetryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: null
    });
  }
  
  // Configuration caching with versioning
  async getConfiguration(category: string, version?: string): Promise<any> {
    const key = version 
      ? `config:${category}:${version}` 
      : `config:${category}:latest`;
      
    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Cache miss - fetch from database
    const config = await this.fetchConfigFromDB(category, version);
    await this.redis.setex(key, 3600, JSON.stringify(config)); // 1 hour TTL
    
    return config;
  }
  
  // Calculation result caching
  async cacheCalculationResult(
    configHash: string, 
    results: CalculationResults,
    ttl: number = 1800 // 30 minutes
  ): Promise<void> {
    const key = `calc:${configHash}`;
    await this.redis.setex(key, ttl, JSON.stringify(results));
  }
  
  // Session management
  async createSession(
    sessionId: string, 
    data: SessionData, 
    expiry: number = 86400 // 24 hours
  ): Promise<void> {
    const key = `session:${sessionId}`;
    await this.redis.setex(key, expiry, JSON.stringify(data));
  }
  
  // Rate limiting with sliding window
  async checkRateLimit(
    identifier: string, 
    maxRequests: number, 
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const pipeline = this.redis.pipeline();
    
    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, now - windowMs);
    
    // Count current requests
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now, `${now}_${Math.random()}`);
    
    // Set expiry
    pipeline.expire(key, Math.ceil(windowMs / 1000));
    
    const results = await pipeline.exec();
    const currentCount = results?.[1]?.[1] as number || 0;
    
    return {
      allowed: currentCount < maxRequests,
      remaining: Math.max(0, maxRequests - currentCount - 1),
      resetTime: now + windowMs
    };
  }
}
```

## Development Tools and Infrastructure

### Build System: Vite

**Decision**: Vite for frontend, tsc for backend
**Alternatives Considered**: Webpack, Parcel, esbuild

```typescript
// vite.config.ts - Optimized for production
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  
  build: {
    // Code splitting strategy
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@mui/material', '@mui/icons-material'],
          charts: ['recharts'],
          i18n: ['react-i18next', 'i18next'],
          
          // Feature-based chunks
          calculator: ['./src/features/calculator'],
          reports: ['./src/features/reports'],
          admin: ['./src/features/admin']
        }
      }
    },
    
    // Optimization settings
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    
    // Asset optimization
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 500,
    
    // CSS optimization
    cssCodeSplit: true,
    cssMinify: true
  },
  
  // Development server
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  
  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/features': resolve(__dirname, './src/features'),
      '@/services': resolve(__dirname, './src/services'),
      '@/types': resolve(__dirname, './src/types')
    }
  },
  
  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
  }
});
```

### Testing Framework: Vitest + React Testing Library

**Decision**: Vitest for unit tests, Playwright for E2E
**Alternatives Considered**: Jest, Cypress

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Higher threshold for critical components
        'src/services/calculation': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        }
      }
    }
  }
});

// Example test for calculation service
import { describe, it, expect, vi } from 'vitest';
import { CalculationService } from '../services/calculation';

describe('CalculationService', () => {
  const calculationService = new CalculationService();
  
  it('should calculate CAPEX correctly for air cooling', async () => {
    const config = {
      airCooling: {
        racks: 100,
        powerPerRackKW: 12,
        rackType: '42U_standard'
      },
      currency: 'USD'
    };
    
    const result = await calculationService.calculateCapex(config);
    
    expect(result.airCooling.total).toBeCloseTo(850000, 2);
    expect(result.airCooling.equipment).toBeCloseTo(500000, 2);
    expect(result.airCooling.installation).toBeCloseTo(200000, 2);
    expect(result.airCooling.infrastructure).toBeCloseTo(150000, 2);
  });
  
  it('should handle currency conversion correctly', async () => {
    const configUSD = { /* config in USD */ };
    const configEUR = { ...configUSD, currency: 'EUR' };
    
    vi.spyOn(calculationService, 'getExchangeRate')
      .mockResolvedValue(0.85); // 1 USD = 0.85 EUR
    
    const resultUSD = await calculationService.calculateCapex(configUSD);
    const resultEUR = await calculationService.calculateCapex(configEUR);
    
    expect(resultEUR.airCooling.total).toBeCloseTo(
      resultUSD.airCooling.total * 0.85, 
      2
    );
  });
});
```

### Code Quality and Formatting

```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "@typescript-eslint/recommended-requiring-type-checking",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off",
    "import/order": ["error", {
      "groups": [
        "builtin",
        "external", 
        "internal",
        "parent",
        "sibling",
        "index"
      ],
      "newlines-between": "always"
    }]
  }
}
```

## Deployment and DevOps Stack

### Containerization: Docker

```dockerfile
# Multi-stage production Docker build
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --production=false

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build
RUN pnpm install --frozen-lockfile --production

# Runtime stage
FROM node:18-alpine AS runner
WORKDIR /app

# Security: Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/healthcheck.js

CMD ["node", "dist/server.js"]
```

### CI/CD: GitHub Actions

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: 18
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    name: Test Suite
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: tco_calculator_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:6-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint code
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Run unit tests
        run: npm run test:coverage
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/tco_calculator_test
          REDIS_URL: redis://localhost:6379
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
  
  build:
    name: Build and Push Image
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    name: Deploy to Production
    needs: [test, build]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - name: Deploy to Kubernetes
        run: |
          # Kubernetes deployment logic
          echo "Deploying to production..."
```

This comprehensive technology stack provides a solid foundation for building the Immersion Cooling TCO Calculator with modern best practices, security considerations, and scalability in mind. Each technology choice has been carefully evaluated against the specific requirements and constraints of the project.