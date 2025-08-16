#!/usr/bin/env tsx

/**
 * Database migration runner
 * Applies SQL migration files in order
 */

import { readdir, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { Client } from 'pg';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

const migrationLogger = logger.child({ component: 'migration' });

interface Migration {
  id: string;
  filename: string;
  sql: string;
}

class MigrationRunner {
  private client: Client;
  private migrationsPath: string;

  constructor() {
    this.client = new Client({
      connectionString: config.database.url,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
    });
    this.migrationsPath = resolve(__dirname, 'migrations');
  }

  async connect(): Promise<void> {
    await this.client.connect();
    migrationLogger.info('Connected to database for migrations');
  }

  async disconnect(): Promise<void> {
    await this.client.end();
    migrationLogger.info('Disconnected from database');
  }

  /**
   * Create migrations tracking table if it doesn't exist
   */
  async createMigrationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS _migrations (
        id VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        checksum VARCHAR(64) NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_migrations_applied_at 
      ON _migrations(applied_at);
    `;

    await this.client.query(sql);
    migrationLogger.info('Migrations tracking table ready');
  }

  /**
   * Load migration files from the migrations directory
   */
  async loadMigrations(): Promise<Migration[]> {
    try {
      const files = await readdir(this.migrationsPath);
      const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort(); // Ensure alphabetical order

      const migrations: Migration[] = [];

      for (const filename of migrationFiles) {
        const filepath = join(this.migrationsPath, filename);
        const sql = await readFile(filepath, 'utf-8');
        const id = filename.replace('.sql', '');

        migrations.push({
          id,
          filename,
          sql: sql.trim(),
        });
      }

      migrationLogger.info(`Loaded ${migrations.length} migration files`);
      return migrations;
    } catch (error) {
      migrationLogger.error('Failed to load migration files:', error);
      throw error;
    }
  }

  /**
   * Get list of applied migrations
   */
  async getAppliedMigrations(): Promise<Set<string>> {
    try {
      const result = await this.client.query(
        'SELECT id FROM _migrations ORDER BY applied_at'
      );
      return new Set(result.rows.map(row => row.id));
    } catch (error) {
      migrationLogger.warn('Could not fetch applied migrations, assuming none applied');
      return new Set();
    }
  }

  /**
   * Calculate simple checksum for migration content
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
   * Apply a single migration
   */
  async applyMigration(migration: Migration): Promise<void> {
    const { id, filename, sql } = migration;
    const checksum = this.calculateChecksum(sql);

    migrationLogger.info(`Applying migration: ${filename}`);

    try {
      // Begin transaction
      await this.client.query('BEGIN');

      // Execute the migration SQL
      await this.client.query(sql);

      // Record the migration as applied
      await this.client.query(
        'INSERT INTO _migrations (id, filename, checksum) VALUES ($1, $2, $3)',
        [id, filename, checksum]
      );

      // Commit transaction
      await this.client.query('COMMIT');

      migrationLogger.info(`Migration applied successfully: ${filename}`);
    } catch (error) {
      // Rollback transaction on error
      await this.client.query('ROLLBACK');
      migrationLogger.error(`Failed to apply migration ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Verify migration checksum (detect changes to applied migrations)
   */
  async verifyMigration(migration: Migration): Promise<boolean> {
    const { id, sql } = migration;
    const currentChecksum = this.calculateChecksum(sql);

    try {
      const result = await this.client.query(
        'SELECT checksum FROM _migrations WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return false; // Migration not applied
      }

      const storedChecksum = result.rows[0].checksum;
      return currentChecksum === storedChecksum;
    } catch (error) {
      migrationLogger.warn(`Could not verify migration ${id}:`, error);
      return false;
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    try {
      migrationLogger.info('Starting database migration process');

      await this.connect();
      await this.createMigrationsTable();

      const migrations = await this.loadMigrations();
      const appliedMigrations = await this.getAppliedMigrations();

      const pendingMigrations = migrations.filter(
        migration => !appliedMigrations.has(migration.id)
      );

      if (pendingMigrations.length === 0) {
        migrationLogger.info('No pending migrations to apply');
        return;
      }

      migrationLogger.info(`Found ${pendingMigrations.length} pending migrations`);

      // Verify checksums of already applied migrations
      for (const migration of migrations) {
        if (appliedMigrations.has(migration.id)) {
          const isValid = await this.verifyMigration(migration);
          if (!isValid) {
            throw new Error(`Migration ${migration.filename} has been modified after being applied`);
          }
        }
      }

      // Apply pending migrations
      for (const migration of pendingMigrations) {
        await this.applyMigration(migration);
      }

      migrationLogger.info('All migrations applied successfully');
    } catch (error) {
      migrationLogger.error('Migration process failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{
    total: number;
    applied: number;
    pending: number;
    lastApplied?: string;
  }> {
    try {
      await this.connect();
      await this.createMigrationsTable();

      const migrations = await this.loadMigrations();
      const appliedMigrations = await this.getAppliedMigrations();

      // Get last applied migration
      let lastApplied: string | undefined;
      try {
        const result = await this.client.query(
          'SELECT filename FROM _migrations ORDER BY applied_at DESC LIMIT 1'
        );
        lastApplied = result.rows[0]?.filename;
      } catch (error) {
        // Ignore error if no migrations applied
      }

      return {
        total: migrations.length,
        applied: appliedMigrations.size,
        pending: migrations.length - appliedMigrations.size,
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
  const command = args[0] || 'migrate';

  const runner = new MigrationRunner();

  try {
    switch (command) {
      case 'migrate':
      case 'up':
        await runner.runMigrations();
        break;

      case 'status':
        const status = await runner.getMigrationStatus();
        console.log('\nMigration Status:');
        console.log(`  Total migrations: ${status.total}`);
        console.log(`  Applied: ${status.applied}`);
        console.log(`  Pending: ${status.pending}`);
        if (status.lastApplied) {
          console.log(`  Last applied: ${status.lastApplied}`);
        }
        console.log('');
        break;

      case 'help':
        console.log('\nTCO Calculator Migration Tool\n');
        console.log('Usage: npm run db:migrate [command]\n');
        console.log('Commands:');
        console.log('  migrate, up    Apply pending migrations (default)');
        console.log('  status         Show migration status');
        console.log('  help           Show this help message');
        console.log('');
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Run "npm run db:migrate help" for usage information');
        process.exit(1);
    }
  } catch (error) {
    migrationLogger.error('Migration command failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

export { MigrationRunner };
export default MigrationRunner;