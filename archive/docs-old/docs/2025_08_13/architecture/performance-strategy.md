# Performance Optimization Strategy - Immersion Cooling TCO Calculator

## Executive Summary

This document defines a comprehensive performance optimization strategy for the Immersion Cooling TCO Calculator, targeting sub-2-second page load times, sub-1-second calculation processing, and optimal user experience across all supported devices and network conditions. The strategy encompasses frontend optimization, backend performance tuning, database optimization, caching strategies, and monitoring approaches.

## Performance Requirements and Targets

### Primary Performance Metrics

| Metric | Target | Critical Threshold | Measurement Method |
|--------|--------|-------------------|-------------------|
| **Page Load Time** | <2 seconds | <3 seconds | Largest Contentful Paint (LCP) |
| **Calculation Processing** | <1 second | <2 seconds | Time to Interactive (TTI) |
| **Chart Rendering** | <500ms | <1 second | First Meaningful Paint |
| **API Response Time** | <200ms | <500ms | 95th percentile response time |
| **Report Generation** | PDF <10s, Excel <5s | PDF <15s, Excel <8s | Job completion time |

### Secondary Performance Metrics

| Metric | Target | Critical Threshold | Purpose |
|--------|--------|-------------------|----------|
| **Time to First Byte (TTFB)** | <400ms | <800ms | Server response speed |
| **Cumulative Layout Shift (CLS)** | <0.1 | <0.25 | Visual stability |
| **First Input Delay (FID)** | <100ms | <300ms | Interactivity |
| **Memory Usage** | <100MB | <200MB | Browser resource usage |
| **Bundle Size** | <2MB total | <3MB total | Network efficiency |

## Frontend Performance Optimization

### Bundle Optimization Strategy

#### Code Splitting and Lazy Loading
```typescript
// Route-based code splitting with React.lazy
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load major route components
const Calculator = lazy(() => import('./pages/Calculator'));
const Reports = lazy(() => import('./pages/Reports'));
const Admin = lazy(() => import('./pages/Admin'));

// Component-level lazy loading for heavy features
const AdvancedChart = lazy(() => 
  import('./components/charts/AdvancedChart').then(module => ({
    default: module.AdvancedChart
  }))
);

const App: React.FC = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <Routes>
      <Route path="/calculator" element={<Calculator />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  </Suspense>
);

// Dynamic imports for conditional features
const ConditionalFeature: React.FC<{ showAdvanced: boolean }> = ({ showAdvanced }) => {
  const [AdvancedComponent, setAdvancedComponent] = useState<React.ComponentType | null>(null);
  
  useEffect(() => {
    if (showAdvanced && !AdvancedComponent) {
      import('./components/AdvancedFeature')
        .then(module => setAdvancedComponent(() => module.default))
        .catch(err => console.error('Failed to load advanced feature:', err));
    }
  }, [showAdvanced, AdvancedComponent]);
  
  return showAdvanced && AdvancedComponent ? <AdvancedComponent /> : null;
};
```

#### Advanced Webpack/Vite Configuration
```typescript
// vite.config.ts - Production optimizations
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Bundle } from 'rollup';

export default defineConfig({
  plugins: [react()],
  
  build: {
    // Chunk splitting strategy
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('mui') || id.includes('@emotion')) {
              return 'ui-vendor';
            }
            if (id.includes('recharts') || id.includes('d3')) {
              return 'chart-vendor';
            }
            if (id.includes('i18next')) {
              return 'i18n-vendor';
            }
            return 'vendor';
          }
          
          // Feature-based chunks
          if (id.includes('/features/calculator/')) {
            return 'calculator';
          }
          if (id.includes('/features/reports/')) {
            return 'reports';
          }
          if (id.includes('/features/admin/')) {
            return 'admin';
          }
        },
        
        // Optimize chunk naming for caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId 
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '') 
            : 'chunk';
          return `assets/${facadeModuleId}-[hash].js`;
        }
      }
    },
    
    // Compression and minification
    minify: 'esbuild',
    target: 'es2020',
    sourcemap: false, // Disable in production
    
    // Asset optimization
    assetsInlineLimit: 4096, // Inline assets < 4KB
    chunkSizeWarningLimit: 1000,
    
    // CSS optimization
    cssCodeSplit: true,
    cssMinify: true
  },
  
  // Production-specific optimizations
  define: {
    '__DEV__': false,
    'process.env.NODE_ENV': '"production"'
  },
  
  // Dependency pre-bundling optimization
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      '@mui/material',
      'recharts',
      'react-i18next'
    ],
    exclude: ['@mui/icons-material'] // Large icon library - load on demand
  }
});
```

### React Performance Optimizations

#### Memo and Callback Optimization
```typescript
// Optimized component with proper memoization
import { memo, useMemo, useCallback, useState } from 'react';
import { FixedSizeList as List } from 'react-window';

interface CalculationResultsProps {
  results: CalculationResults;
  configuration: CalculationConfig;
  onExport: (format: 'pdf' | 'excel') => void;
}

const CalculationResults = memo<CalculationResultsProps>(({ 
  results, 
  configuration, 
  onExport 
}) => {
  // Memoize expensive calculations
  const chartData = useMemo(() => {
    console.log('Recalculating chart data'); // Debug log
    return results.breakdown.tco_cumulative.map(item => ({
      year: item.year,
      airCooling: item.air_cooling,
      immersionCooling: item.immersion_cooling,
      savings: item.savings,
      cumulativeSavings: item.year === 1 ? item.savings : 
        item.savings + (chartData?.[item.year - 2]?.cumulativeSavings || 0)
    }));
  }, [results.breakdown.tco_cumulative]);
  
  // Memoize summary statistics
  const summaryStats = useMemo(() => ({
    totalSavings: results.summary.total_tco_savings_5yr,
    roiPercentage: results.summary.roi_percent,
    paybackMonths: results.summary.payback_months,
    energyEfficiencyGain: results.summary.energy_efficiency_improvement
  }), [results.summary]);
  
  // Stable callback references
  const handlePDFExport = useCallback(() => onExport('pdf'), [onExport]);
  const handleExcelExport = useCallback(() => onExport('excel'), [onExport]);
  
  return (
    <div className="calculation-results">
      <SummaryCards stats={summaryStats} />
      <ChartSection data={chartData} />
      <ExportButtons 
        onPDFExport={handlePDFExport}
        onExcelExport={handleExcelExport}
      />
    </div>
  );
});

// Optimized list rendering for large datasets
const OptimizedDataTable = memo<{ data: any[] }>(({ data }) => {
  const Row = useCallback(({ index, style }: { index: number; style: CSSProperties }) => (
    <div style={style}>
      {/* Render row data[index] */}
    </div>
  ), []);
  
  return (
    <List
      height={400}
      itemCount={data.length}
      itemSize={50}
      itemData={data}
    >
      {Row}
    </List>
  );
});

// Custom hook for debounced calculations
const useDebouncedCalculation = (config: CalculationConfig, delay: number = 500) => {
  const [debouncedConfig, setDebouncedConfig] = useState(config);
  const [isCalculating, setIsCalculating] = useState(false);
  
  useEffect(() => {
    setIsCalculating(true);
    const timer = setTimeout(() => {
      setDebouncedConfig(config);
      setIsCalculating(false);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [config, delay]);
  
  return { debouncedConfig, isCalculating };
};
```

#### State Management Optimization
```typescript
// Zustand store with optimized selectors and actions
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface CalculatorStore {
  // Separated state for better granular updates
  configuration: CalculationConfig;
  results: CalculationResults | null;
  ui: {
    currentStep: number;
    isCalculating: boolean;
    errors: ValidationError[];
  };
  
  // Optimized actions
  updateConfiguration: (updater: (draft: CalculationConfig) => void) => void;
  setResults: (results: CalculationResults) => void;
  setCalculating: (calculating: boolean) => void;
  
  // Computed selectors (cached)
  getCapexSavings: () => number;
  getOpexSavings: () => number;
  getTotalSavings: () => number;
}

const useCalculatorStore = create<CalculatorStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      configuration: initialConfig,
      results: null,
      ui: {
        currentStep: 1,
        isCalculating: false,
        errors: []
      },
      
      // Immer-based updates for performance
      updateConfiguration: (updater) => set((state) => {
        updater(state.configuration);
        state.ui.errors = []; // Clear errors on update
      }),
      
      setResults: (results) => set((state) => {
        state.results = results;
        state.ui.isCalculating = false;
      }),
      
      setCalculating: (calculating) => set((state) => {
        state.ui.isCalculating = calculating;
      }),
      
      // Memoized getters
      getCapexSavings: () => {
        const { results } = get();
        return results ? 
          results.breakdown.capex.air_cooling.total - results.breakdown.capex.immersion_cooling.total : 
          0;
      }
    }))
  )
);

// Optimized selectors to prevent unnecessary re-renders
export const useConfigurationState = () => useCalculatorStore(state => state.configuration);
export const useResultsState = () => useCalculatorStore(state => state.results);
export const useUIState = () => useCalculatorStore(state => state.ui);
export const useSavingsCalculation = () => useCalculatorStore(state => ({
  capexSavings: state.getCapexSavings(),
  opexSavings: state.getOpexSavings(),
  totalSavings: state.getTotalSavings()
}));
```

### Asset Optimization

#### Image and Asset Loading
```typescript
// Optimized image loading with lazy loading and WebP support
import { useState, useRef, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({ 
  src, 
  alt, 
  width, 
  height, 
  className 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !imageSrc) {
          // Check WebP support and load appropriate format
          const webpSrc = src.replace(/\.(jpg|jpeg|png)$/, '.webp');
          const img = new Image();
          
          img.onload = () => setImageSrc(webpSrc);
          img.onerror = () => setImageSrc(src); // Fallback to original
          img.src = webpSrc;
        }
      },
      { threshold: 0.1 }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, [src, imageSrc]);
  
  return (
    <div 
      ref={imgRef}
      className={className}
      style={{ width, height, backgroundColor: '#f0f0f0' }}
    >
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          onLoad={() => setIsLoaded(true)}
          style={{ 
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}
    </div>
  );
};

// Service Worker for asset caching
// public/sw.js
const CACHE_NAME = 'tco-calculator-v1';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/assets/logo.webp'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});
```

## Backend Performance Optimization

### API Response Optimization

#### Response Compression and Caching
```typescript
// Express middleware for performance optimization
import compression from 'compression';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

// Compression middleware with custom logic
app.use(compression({
  // Only compress responses larger than 1KB
  threshold: 1024,
  // Compression level (1-9, 6 is default)
  level: 6,
  // Custom filter for compressible content
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Cache control middleware
const cacheControl = (duration: number = 300) => {
  return (req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', `public, max-age=${duration}`);
    next();
  };
};

// Apply different cache strategies
app.get('/api/v1/config/*', cacheControl(3600), getConfiguration); // 1 hour
app.get('/api/v1/health', cacheControl(60), getHealth); // 1 minute
app.post('/api/v1/calculations/calculate', cacheControl(0), calculateTCO); // No cache

// ETags for conditional requests
app.use((req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(body: any) {
    if (req.method === 'GET' && res.statusCode === 200) {
      const etag = require('crypto')
        .createHash('md5')
        .update(JSON.stringify(body))
        .digest('hex');
      
      res.set('ETag', etag);
      
      if (req.get('If-None-Match') === etag) {
        res.status(304).end();
        return res;
      }
    }
    
    return originalSend.call(this, body);
  };
  
  next();
});
```

#### Calculation Engine Optimization
```typescript
// Optimized calculation service with parallel processing
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { cpus } from 'os';

class OptimizedCalculationService {
  private workerPool: Worker[] = [];
  private readonly MAX_WORKERS = Math.min(cpus().length, 4);
  
  constructor() {
    // Initialize worker pool
    for (let i = 0; i < this.MAX_WORKERS; i++) {
      this.createWorker();
    }
  }
  
  private createWorker(): Worker {
    const worker = new Worker(__filename, {
      workerData: { isWorker: true }
    });
    
    worker.on('error', (error) => {
      console.error('Worker error:', error);
      // Replace failed worker
      this.replaceWorker(worker);
    });
    
    this.workerPool.push(worker);
    return worker;
  }
  
  async calculateTCO(config: CalculationConfig): Promise<CalculationResults> {
    const startTime = Date.now();
    
    try {
      // Parallel calculation of different components
      const [capexResults, opexResults, pueResults] = await Promise.all([
        this.calculateCapexParallel(config),
        this.calculateOpexParallel(config),
        this.calculatePUEParallel(config)
      ]);
      
      // Combine results
      const results = this.combineResults(capexResults, opexResults, pueResults);
      
      // Log performance metrics
      const calculationTime = Date.now() - startTime;
      console.log(`Calculation completed in ${calculationTime}ms`);
      
      return results;
      
    } catch (error) {
      console.error('Calculation error:', error);
      throw new Error('Calculation failed');
    }
  }
  
  private async calculateCapexParallel(config: CalculationConfig): Promise<CapexResults> {
    return new Promise((resolve, reject) => {
      const worker = this.getAvailableWorker();
      
      worker.postMessage({
        type: 'CALCULATE_CAPEX',
        config
      });
      
      const timeout = setTimeout(() => {
        reject(new Error('CAPEX calculation timeout'));
      }, 5000);
      
      worker.once('message', (result) => {
        clearTimeout(timeout);
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result.data);
        }
      });
    });
  }
  
  private getAvailableWorker(): Worker {
    // Simple round-robin selection
    return this.workerPool[Math.floor(Math.random() * this.workerPool.length)];
  }
}

// Worker thread implementation
if (workerData?.isWorker) {
  parentPort?.on('message', async ({ type, config }) => {
    try {
      let result;
      
      switch (type) {
        case 'CALCULATE_CAPEX':
          result = await calculateCapexOptimized(config);
          break;
        case 'CALCULATE_OPEX':
          result = await calculateOpexOptimized(config);
          break;
        case 'CALCULATE_PUE':
          result = await calculatePUEOptimized(config);
          break;
      }
      
      parentPort?.postMessage({ data: result });
    } catch (error) {
      parentPort?.postMessage({ error: error.message });
    }
  });
}

// Optimized calculation functions with memoization
const memoize = <T extends (...args: any[]) => any>(fn: T): T => {
  const cache = new Map();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    // Cleanup old cache entries
    if (cache.size > 1000) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  }) as T;
};

// Memoized calculation functions
const calculateCapexOptimized = memoize(async (config: CalculationConfig): Promise<CapexResults> => {
  // Vectorized calculations for better performance
  const airCoolingCosts = config.airCooling.rackCount * getEquipmentCost('42U_rack', config.financial.currency);
  const immersionCoolingCosts = config.immersionCooling.tankConfigurations.reduce((total, tank) => {
    return total + (tank.quantity * getEquipmentCost(`tank_${tank.size}`, config.financial.currency));
  }, 0);
  
  return {
    airCooling: {
      equipment: airCoolingCosts * 0.6,
      installation: airCoolingCosts * 0.25,
      infrastructure: airCoolingCosts * 0.15,
      total: airCoolingCosts
    },
    immersionCooling: {
      equipment: immersionCoolingCosts * 0.7,
      installation: immersionCoolingCosts * 0.2,
      infrastructure: immersionCoolingCosts * 0.1,
      total: immersionCoolingCosts
    }
  };
});
```

### Database Performance Optimization

#### Query Optimization
```sql
-- Optimized database queries with proper indexing

-- Configuration query optimization
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
    ec.id,
    ec.category,
    ec.subcategory,
    ec.item_code,
    ec.display_name,
    ec.specifications,
    ec.base_pricing->>$2 as pricing
FROM tco_config.equipment_configurations ec
WHERE ec.category = $1 
  AND ec.status = 'active'
  AND (ec.expiry_date IS NULL OR ec.expiry_date > NOW())
  AND ec.effective_date <= NOW()
ORDER BY ec.subcategory, ec.item_code;

-- Optimized indexes for the above query
CREATE INDEX CONCURRENTLY idx_equipment_config_category_status_dates 
ON tco_config.equipment_configurations (category, status, effective_date DESC)
WHERE status = 'active' 
  AND (expiry_date IS NULL OR expiry_date > NOW());

-- Partial index for frequently queried active configurations
CREATE INDEX CONCURRENTLY idx_equipment_config_active_lookup
ON tco_config.equipment_configurations (category, subcategory, item_code, effective_date DESC)
WHERE status = 'active';

-- Materialized view for current pricing (refreshed hourly)
CREATE MATERIALIZED VIEW tco_config.current_equipment_pricing AS
SELECT DISTINCT ON (category, subcategory, item_code)
    id,
    category,
    subcategory, 
    item_code,
    display_name,
    specifications,
    base_pricing,
    regional_adjustments,
    effective_date
FROM tco_config.equipment_configurations
WHERE status = 'active'
  AND (expiry_date IS NULL OR expiry_date > NOW())
  AND effective_date <= NOW()
ORDER BY category, subcategory, item_code, effective_date DESC;

-- Unique index on materialized view for fast lookups
CREATE UNIQUE INDEX idx_current_pricing_lookup
ON tco_config.current_equipment_pricing (category, subcategory, item_code);

-- Function to refresh pricing cache
CREATE OR REPLACE FUNCTION refresh_pricing_cache()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY tco_config.current_equipment_pricing;
    -- Log the refresh
    INSERT INTO tco_audit.system_events (event_type, event_data)
    VALUES ('PRICING_CACHE_REFRESH', '{"timestamp": "' || NOW() || '"}');
END;
$$ LANGUAGE plpgsql;

-- Optimized calculation session queries
-- Compound index for session lookups
CREATE INDEX CONCURRENTLY idx_calculation_sessions_compound
ON tco_core.calculation_sessions (session_token, status, expires_at)
WHERE status IN ('active', 'shared');

-- Partial index for active sessions
CREATE INDEX CONCURRENTLY idx_calculation_sessions_active
ON tco_core.calculation_sessions (created_at DESC, currency, locale)
WHERE status = 'active' AND expires_at > NOW();

-- Query optimization for calculation retrieval
PREPARE get_calculation_session (text) AS
SELECT 
    id,
    session_token,
    configuration,
    results,
    locale,
    currency,
    created_at,
    last_accessed_at
FROM tco_core.calculation_sessions
WHERE session_token = $1
  AND status = 'active'
  AND (expires_at IS NULL OR expires_at > NOW());

-- Execute the prepared statement
EXECUTE get_calculation_session('session_token_here');
```

#### Connection Pooling Optimization
```typescript
// Optimized PostgreSQL connection pooling
import { Pool, PoolConfig } from 'pg';

const poolConfig: PoolConfig = {
  // Connection settings
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  // Pool configuration
  min: 2, // Minimum connections in pool
  max: 20, // Maximum connections in pool
  idleTimeoutMillis: 30000, // 30 seconds
  connectionTimeoutMillis: 2000, // 2 seconds
  
  // Performance settings
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  
  // SSL configuration
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  
  // Statement timeout
  statement_timeout: 10000, // 10 seconds
  query_timeout: 8000, // 8 seconds
  
  // Application name for monitoring
  application_name: 'tco-calculator-api'
};

class DatabaseService {
  private pool: Pool;
  private queryCache = new Map<string, { result: any; timestamp: number }>();
  private readonly CACHE_TTL = 300000; // 5 minutes
  
  constructor() {
    this.pool = new Pool(poolConfig);
    
    // Pool event listeners
    this.pool.on('connect', (client) => {
      console.log('Database client connected');
      // Set session-level optimizations
      client.query(`
        SET search_path TO tco_core, tco_config, public;
        SET timezone TO 'UTC';
        SET statement_timeout TO '10s';
      `);
    });
    
    this.pool.on('error', (err) => {
      console.error('Database pool error:', err);
    });
    
    this.pool.on('remove', () => {
      console.log('Database client removed from pool');
    });
    
    // Periodic cache cleanup
    setInterval(() => this.cleanupCache(), 60000); // Every minute
  }
  
  async query(text: string, params?: any[], useCache: boolean = false): Promise<any> {
    const cacheKey = useCache ? `${text}_${JSON.stringify(params)}` : null;
    
    // Check cache first
    if (cacheKey && this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.result;
      }
      this.queryCache.delete(cacheKey);
    }
    
    const start = Date.now();
    
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      // Log slow queries
      if (duration > 1000) {
        console.warn(`Slow query detected: ${duration}ms`, { text, params });
      }
      
      // Cache result if requested
      if (cacheKey) {
        this.queryCache.set(cacheKey, {
          result,
          timestamp: Date.now()
        });
      }
      
      return result;
      
    } catch (error) {
      console.error('Database query error:', error, { text, params });
      throw error;
    }
  }
  
  async getEquipmentConfiguration(category: string, currency: string): Promise<any[]> {
    return this.query(`
      SELECT 
        id, category, subcategory, item_code, display_name,
        specifications, base_pricing->$2 as pricing
      FROM tco_config.current_equipment_pricing
      WHERE category = $1
      ORDER BY subcategory, item_code
    `, [category, currency], true); // Use cache for equipment config
  }
  
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.queryCache.delete(key);
      }
    }
  }
  
  async getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }
}
```

## Caching Strategies

### Multi-Layer Caching Architecture

#### Redis Caching Implementation
```typescript
// Advanced Redis caching with multiple strategies
import Redis from 'ioredis';

interface CacheOptions {
  ttl?: number;
  useCompression?: boolean;
  tags?: string[];
}

class AdvancedCacheService {
  private redis: Redis;
  private localCache = new Map<string, { data: any; expiry: number; size: number }>();
  private readonly LOCAL_CACHE_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB
  private currentLocalCacheSize = 0;
  
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      
      // Connection pool
      lazyConnect: true,
      keepAlive: 30000,
      
      // Compression
      compression: 'gzip',
      
      // Cluster configuration (if using Redis Cluster)
      enableReadyCheck: true,
      maxRetriesPerRequest: null
    });
    
    // Setup Redis event handlers
    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });
    
    this.redis.on('ready', () => {
      console.log('Redis connection ready');
    });
    
    // Periodic cleanup of local cache
    setInterval(() => this.cleanupLocalCache(), 60000);
  }
  
  async get<T>(key: string): Promise<T | null> {
    // L1 Cache: Local memory
    const localResult = this.getFromLocalCache<T>(key);
    if (localResult !== null) {
      return localResult;
    }
    
    try {
      // L2 Cache: Redis
      const redisResult = await this.redis.get(key);
      if (redisResult) {
        const data = JSON.parse(redisResult);
        
        // Store in local cache with size limit
        this.setInLocalCache(key, data, 30000); // 30 second local cache
        
        return data;
      }
    } catch (error) {
      console.error('Redis get error:', error);
    }
    
    return null;
  }
  
  async set(
    key: string, 
    value: any, 
    options: CacheOptions = {}
  ): Promise<void> {
    const { ttl = 300, useCompression = true, tags = [] } = options;
    
    try {
      const serialized = JSON.stringify(value);
      
      // Store in Redis with TTL
      await this.redis.setex(key, ttl, serialized);
      
      // Store tags for cache invalidation
      if (tags.length > 0) {
        const tagOperations = tags.map(tag => 
          this.redis.sadd(`tag:${tag}`, key)
        );
        await Promise.all(tagOperations);
      }
      
      // Store in local cache
      this.setInLocalCache(key, value, ttl * 1000);
      
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }
  
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        const keys = await this.redis.smembers(`tag:${tag}`);
        
        if (keys.length > 0) {
          // Delete from Redis
          await this.redis.del(...keys);
          
          // Delete from local cache
          keys.forEach(key => {
            this.localCache.delete(key);
          });
          
          // Clean up tag set
          await this.redis.del(`tag:${tag}`);
        }
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
  
  // Configuration-specific caching
  async cacheEquipmentConfig(
    category: string, 
    currency: string, 
    data: any
  ): Promise<void> {
    const key = `equipment:${category}:${currency}`;
    await this.set(key, data, {
      ttl: 3600, // 1 hour
      tags: ['equipment', 'configuration', category]
    });
  }
  
  async cacheCalculationResult(
    configHash: string, 
    results: any
  ): Promise<void> {
    const key = `calculation:${configHash}`;
    await this.set(key, results, {
      ttl: 1800, // 30 minutes
      tags: ['calculations', 'results']
    });
  }
  
  // Exchange rates caching with automatic refresh
  async cacheExchangeRates(rates: any): Promise<void> {
    await this.set('exchange_rates', rates, {
      ttl: 86400, // 24 hours
      tags: ['exchange_rates', 'configuration']
    });
    
    // Schedule refresh 1 hour before expiry
    setTimeout(() => {
      this.refreshExchangeRates();
    }, 82800000); // 23 hours
  }
  
  private async refreshExchangeRates(): Promise<void> {
    try {
      // This would call your exchange rate service
      // const newRates = await exchangeRateService.getCurrentRates();
      // await this.cacheExchangeRates(newRates);
      console.log('Exchange rates refresh triggered');
    } catch (error) {
      console.error('Failed to refresh exchange rates:', error);
    }
  }
  
  private getFromLocalCache<T>(key: string): T | null {
    const cached = this.localCache.get(key);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    
    if (cached) {
      this.currentLocalCacheSize -= cached.size;
      this.localCache.delete(key);
    }
    
    return null;
  }
  
  private setInLocalCache(key: string, data: any, ttl: number): void {
    const serialized = JSON.stringify(data);
    const size = Buffer.byteLength(serialized, 'utf8');
    
    // Check size limit
    if (this.currentLocalCacheSize + size > this.LOCAL_CACHE_SIZE_LIMIT) {
      this.evictLocalCacheEntries(size);
    }
    
    this.localCache.set(key, {
      data,
      expiry: Date.now() + ttl,
      size
    });
    
    this.currentLocalCacheSize += size;
  }
  
  private evictLocalCacheEntries(requiredSize: number): void {
    // LRU eviction based on access time
    const entries = Array.from(this.localCache.entries())
      .sort(([, a], [, b]) => a.expiry - b.expiry);
    
    let freedSize = 0;
    for (const [key, entry] of entries) {
      this.localCache.delete(key);
      this.currentLocalCacheSize -= entry.size;
      freedSize += entry.size;
      
      if (freedSize >= requiredSize) {
        break;
      }
    }
  }
  
  private cleanupLocalCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.localCache.entries()) {
      if (entry.expiry < now) {
        this.localCache.delete(key);
        this.currentLocalCacheSize -= entry.size;
      }
    }
  }
  
  async getStats() {
    const redisInfo = await this.redis.info('memory');
    
    return {
      redis: {
        memoryUsage: redisInfo.split('\n')
          .find(line => line.startsWith('used_memory_human:'))
          ?.split(':')[1]?.trim(),
        connections: await this.redis.info('clients')
      },
      localCache: {
        entries: this.localCache.size,
        sizeBytes: this.currentLocalCacheSize,
        sizeMB: Math.round(this.currentLocalCacheSize / 1024 / 1024 * 100) / 100
      }
    };
  }
}
```

## Chart and Visualization Performance

### Optimized Chart Rendering
```typescript
// Optimized chart components with virtualization and performance improvements
import React, { memo, useMemo, useCallback, useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';

interface OptimizedChartProps {
  data: TCOData[];
  currency: string;
  locale: string;
}

const OptimizedTCOChart = memo<OptimizedChartProps>(({ data, currency, locale }) => {
  // Memoize processed data to avoid recalculation
  const processedData = useMemo(() => {
    console.log('Processing chart data...'); // Debug log
    
    return data.map((item, index) => ({
      ...item,
      // Pre-calculate display values
      airCoolingFormatted: new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(item.airCooling),
      
      immersionCoolingFormatted: new Intl.NumberFormat(locale, {
        style: 'currency', 
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(item.immersionCooling),
      
      // Add trend indicators
      trend: index > 0 ? 
        (item.savings > data[index - 1].savings ? 'up' : 'down') : 
        'neutral'
    }));
  }, [data, currency, locale]);
  
  // Memoize chart configuration
  const chartConfig = useMemo(() => ({
    margin: { top: 20, right: 30, left: 20, bottom: 5 },
    
    // Performance optimizations
    animationDuration: data.length > 50 ? 0 : 300, // Disable animation for large datasets
    dot: data.length > 20 ? false : true, // Hide dots for large datasets
    
    // Responsive breakpoints
    aspectRatio: window.innerWidth < 768 ? 1.2 : 2
  }), [data.length]);
  
  // Optimized tooltip formatter
  const tooltipFormatter = useCallback((value: number, name: string) => {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    return [formatter.format(value), name];
  }, [locale, currency]);
  
  // Custom tooltip to avoid re-renders
  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{`Year ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${tooltipFormatter(entry.value, entry.name)[0]}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  }, [tooltipFormatter]);
  
  return (
    <div className="tco-chart-container">
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={processedData}
          margin={chartConfig.margin}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="year" 
            stroke="#666"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            stroke="#666"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              // Simplified Y-axis formatting
              if (value >= 1000000) {
                return `${(value / 1000000).toFixed(1)}M`;
              }
              if (value >= 1000) {
                return `${(value / 1000).toFixed(0)}K`;
              }
              return value.toString();
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="airCooling"
            stroke="#ff7300"
            strokeWidth={2}
            dot={chartConfig.dot}
            animationDuration={chartConfig.animationDuration}
            name="Air Cooling"
          />
          <Line
            type="monotone"
            dataKey="immersionCooling"
            stroke="#387908"
            strokeWidth={2}
            dot={chartConfig.dot}
            animationDuration={chartConfig.animationDuration}
            name="Immersion Cooling"
          />
          <Line
            type="monotone"
            dataKey="savings"
            stroke="#8884d8"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            animationDuration={chartConfig.animationDuration}
            name="Cumulative Savings"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

// Canvas-based chart for very large datasets
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const CanvasChart: React.FC<{ data: any[] }> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.year),
        datasets: [
          {
            label: 'Air Cooling',
            data: data.map(d => d.airCooling),
            borderColor: '#ff7300',
            backgroundColor: 'rgba(255, 115, 0, 0.1)',
            tension: 0.1
          },
          {
            label: 'Immersion Cooling',
            data: data.map(d => d.immersionCooling),
            borderColor: '#387908',
            backgroundColor: 'rgba(56, 121, 8, 0.1)',
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Year'
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Cost (USD)'
            }
          }
        },
        // Performance optimizations for large datasets
        elements: {
          point: {
            radius: data.length > 100 ? 0 : 3
          }
        },
        animation: {
          duration: data.length > 100 ? 0 : 1000
        }
      }
    });
    
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data]);
  
  return (
    <div style={{ height: '400px' }}>
      <canvas ref={canvasRef} />
    </div>
  );
};
```

This comprehensive performance optimization strategy provides the foundation for achieving the target performance metrics while maintaining a high-quality user experience across all supported devices and network conditions.