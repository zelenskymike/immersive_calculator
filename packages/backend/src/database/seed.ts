#!/usr/bin/env tsx

/**
 * Database seed runner
 * Applies seed data files for initial application setup
 */

import { readdir, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { Client } from 'pg';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

const seedLogger = logger.child({ component: 'seed' });

interface SeedFile {
  id: string;
  filename: string;
  sql: string;
}

class SeedRunner {
  private client: Client;
  private seedsPath: string;

  constructor() {
    this.client = new Client({
      connectionString: config.database.url,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
    });
    this.seedsPath = resolve(__dirname, 'seeds');
  }

  async connect(): Promise<void> {
    await this.client.connect();
    seedLogger.info('Connected to database for seeding');
  }

  async disconnect(): Promise<void> {
    await this.client.end();
    seedLogger.info('Disconnected from database');
  }

  /**
   * Create seeds tracking table if it doesn't exist
   */
  async createSeedsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS _seeds (
        id VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        checksum VARCHAR(64) NOT NULL,
        environment VARCHAR(50) NOT NULL DEFAULT 'development'
      );
      
      CREATE INDEX IF NOT EXISTS idx_seeds_applied_at 
      ON _seeds(applied_at);
      
      CREATE INDEX IF NOT EXISTS idx_seeds_environment 
      ON _seeds(environment);
    `;

    await this.client.query(sql);
    seedLogger.info('Seeds tracking table ready');
  }

  /**
   * Load seed files from the seeds directory
   */
  async loadSeeds(): Promise<SeedFile[]> {
    try {
      const files = await readdir(this.seedsPath);
      const seedFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort(); // Ensure alphabetical order

      const seeds: SeedFile[] = [];

      for (const filename of seedFiles) {
        const filepath = join(this.seedsPath, filename);
        const sql = await readFile(filepath, 'utf-8');
        const id = filename.replace('.sql', '');

        seeds.push({
          id,
          filename,
          sql: sql.trim(),
        });
      }

      seedLogger.info(`Loaded ${seeds.length} seed files`);
      return seeds;
    } catch (error) {
      seedLogger.error('Failed to load seed files:', error);
      throw error;
    }
  }

  /**
   * Get list of applied seeds
   */
  async getAppliedSeeds(): Promise<Set<string>> {
    try {
      const result = await this.client.query(
        'SELECT id FROM _seeds WHERE environment = $1 ORDER BY applied_at',
        [config.nodeEnv]
      );
      return new Set(result.rows.map(row => row.id));
    } catch (error) {
      seedLogger.warn('Could not fetch applied seeds, assuming none applied');
      return new Set();
    }
  }

  /**
   * Calculate simple checksum for seed content
   */
  private calculateChecksum(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Check if database has existing data (to avoid duplicate seeding)
   */
  async hasExistingData(): Promise<boolean> {
    try {
      // Check if we have any equipment configurations
      const result = await this.client.query(
        'SELECT COUNT(*) as count FROM tco_config.equipment_configurations'
      );
      const count = parseInt(result.rows[0].count);
      return count > 0;
    } catch (error) {
      // If table doesn't exist, we definitely need to seed
      return false;
    }
  }

  /**
   * Apply a single seed file
   */
  async applySeed(seed: SeedFile, force: boolean = false): Promise<void> {
    const { id, filename, sql } = seed;
    const checksum = this.calculateChecksum(sql);

    seedLogger.info(`Applying seed: ${filename}`);

    try {
      // Begin transaction
      await this.client.query('BEGIN');

      // Execute the seed SQL
      await this.client.query(sql);

      // Record the seed as applied
      await this.client.query(
        'INSERT INTO _seeds (id, filename, checksum, environment) VALUES ($1, $2, $3, $4)',
        [id, filename, checksum, config.nodeEnv]
      );

      // Commit transaction
      await this.client.query('COMMIT');

      seedLogger.info(`Seed applied successfully: ${filename}`);
    } catch (error) {
      // Rollback transaction on error
      await this.client.query('ROLLBACK');
      seedLogger.error(`Failed to apply seed ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Run all seeds
   */
  async runSeeds(options: { force?: boolean; skipExisting?: boolean } = {}): Promise<void> {
    const { force = false, skipExisting = true } = options;

    try {
      seedLogger.info('Starting database seeding process');

      await this.connect();
      await this.createSeedsTable();

      // Check if we should skip seeding due to existing data
      if (skipExisting && !force) {
        const hasData = await this.hasExistingData();
        if (hasData) {
          seedLogger.info('Database already contains data, skipping seeding (use --force to override)');
          return;
        }
      }

      const seeds = await this.loadSeeds();
      const appliedSeeds = await this.getAppliedSeeds();

      let seedsToApply: SeedFile[];

      if (force) {
        seedsToApply = seeds;
        seedLogger.info('Force mode: applying all seeds');
      } else {
        seedsToApply = seeds.filter(seed => !appliedSeeds.has(seed.id));
      }

      if (seedsToApply.length === 0) {
        seedLogger.info('No seeds to apply');
        return;
      }

      seedLogger.info(`Applying ${seedsToApply.length} seeds`);

      // Apply seeds
      for (const seed of seedsToApply) {
        await this.applySeed(seed, force);
      }

      seedLogger.info('All seeds applied successfully');
    } catch (error) {
      seedLogger.error('Seeding process failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  /**
   * Reset seeds (remove tracking records)
   */
  async resetSeeds(): Promise<void> {
    try {
      seedLogger.info('Resetting seed tracking');
      
      await this.connect();
      await this.createSeedsTable();

      await this.client.query(
        'DELETE FROM _seeds WHERE environment = $1',
        [config.nodeEnv]
      );

      seedLogger.info('Seed tracking reset successfully');
    } catch (error) {
      seedLogger.error('Failed to reset seeds:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  /**
   * Get seeding status
   */
  async getSeedStatus(): Promise<{
    total: number;
    applied: number;
    pending: number;
    environment: string;
    hasExistingData: boolean;
    lastApplied?: string;
  }> {
    try {
      await this.connect();
      await this.createSeedsTable();

      const seeds = await this.loadSeeds();
      const appliedSeeds = await this.getAppliedSeeds();
      const hasData = await this.hasExistingData();

      // Get last applied seed
      let lastApplied: string | undefined;
      try {
        const result = await this.client.query(
          'SELECT filename FROM _seeds WHERE environment = $1 ORDER BY applied_at DESC LIMIT 1',
          [config.nodeEnv]
        );
        lastApplied = result.rows[0]?.filename;
      } catch (error) {
        // Ignore error if no seeds applied
      }

      return {
        total: seeds.length,
        applied: appliedSeeds.size,
        pending: seeds.length - appliedSeeds.size,
        environment: config.nodeEnv,
        hasExistingData: hasData,
        lastApplied,
      };
    } finally {
      await this.disconnect();
    }
  }
}

/**
 * Command line interface
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'seed';
  const flags = args.slice(1);

  const force = flags.includes('--force') || flags.includes('-f');
  const skipExisting = !flags.includes('--no-skip');

  const runner = new SeedRunner();

  try {
    switch (command) {
      case 'seed':
      case 'run':
        await runner.runSeeds({ force, skipExisting });
        break;

      case 'reset':
        if (!force) {
          console.log('This will reset all seed tracking. Use --force to confirm.');
          process.exit(1);
        }
        await runner.resetSeeds();
        break;

      case 'status':
        const status = await runner.getSeedStatus();
        console.log('\nSeed Status:');
        console.log(`  Environment: ${status.environment}`);
        console.log(`  Total seeds: ${status.total}`);
        console.log(`  Applied: ${status.applied}`);
        console.log(`  Pending: ${status.pending}`);
        console.log(`  Has existing data: ${status.hasExistingData ? 'Yes' : 'No'}`);
        if (status.lastApplied) {
          console.log(`  Last applied: ${status.lastApplied}`);
        }
        console.log('');
        break;

      case 'help':
        console.log('\nTCO Calculator Seed Tool\n');
        console.log('Usage: npm run db:seed [command] [options]\n');
        console.log('Commands:');
        console.log('  seed, run      Apply seed files (default)');
        console.log('  reset          Reset seed tracking (requires --force)');
        console.log('  status         Show seeding status');
        console.log('  help           Show this help message');
        console.log('\nOptions:');
        console.log('  --force, -f    Force apply seeds even if data exists');
        console.log('  --no-skip      Don\'t skip seeding when data exists');
        console.log('');
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Run "npm run db:seed help" for usage information');
        process.exit(1);
    }
  } catch (error) {
    seedLogger.error('Seed command failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
}

export { SeedRunner };
export default SeedRunner;