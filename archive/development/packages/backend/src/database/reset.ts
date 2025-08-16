#!/usr/bin/env tsx

/**
 * Database reset utility
 * Drops all tables and re-runs migrations and seeds
 */

import { Client } from 'pg';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import MigrationRunner from './migrate';
import SeedRunner from './seed';

const resetLogger = logger.child({ component: 'reset' });

class DatabaseReset {
  private client: Client;

  constructor() {
    this.client = new Client({
      connectionString: config.database.url,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
    resetLogger.info('Connected to database for reset');
  }

  async disconnect(): Promise<void> {
    await this.client.end();
    resetLogger.info('Disconnected from database');
  }

  /**
   * Drop all schemas and their contents
   */
  async dropAllSchemas(): Promise<void> {
    try {
      resetLogger.info('Dropping all application schemas...');

      // Drop schemas in reverse dependency order
      const schemas = ['tco_temp', 'tco_audit', 'tco_core', 'tco_config'];

      for (const schema of schemas) {
        try {
          await this.client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
          resetLogger.info(`Dropped schema: ${schema}`);
        } catch (error) {
          resetLogger.warn(`Could not drop schema ${schema}:`, error);
        }
      }

      // Drop tracking tables
      await this.client.query('DROP TABLE IF EXISTS _migrations CASCADE');
      await this.client.query('DROP TABLE IF EXISTS _seeds CASCADE');
      
      resetLogger.info('All schemas dropped successfully');
    } catch (error) {
      resetLogger.error('Failed to drop schemas:', error);
      throw error;
    }
  }

  /**
   * Drop all tables in current schema (alternative approach)
   */
  async dropAllTables(): Promise<void> {
    try {
      resetLogger.info('Dropping all tables...');

      // Get all table names
      const result = await this.client.query(`
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_schema IN ('tco_core', 'tco_config', 'tco_audit', 'tco_temp', 'public')
        AND table_type = 'BASE TABLE'
        ORDER BY table_schema, table_name
      `);

      // Drop each table
      for (const row of result.rows) {
        const fullTableName = `${row.table_schema}.${row.table_name}`;
        try {
          await this.client.query(`DROP TABLE IF EXISTS ${fullTableName} CASCADE`);
          resetLogger.info(`Dropped table: ${fullTableName}`);
        } catch (error) {
          resetLogger.warn(`Could not drop table ${fullTableName}:`, error);
        }
      }

      // Drop tracking tables specifically
      await this.client.query('DROP TABLE IF EXISTS _migrations CASCADE');
      await this.client.query('DROP TABLE IF EXISTS _seeds CASCADE');

      resetLogger.info('All tables dropped successfully');
    } catch (error) {
      resetLogger.error('Failed to drop tables:', error);
      throw error;
    }
  }

  /**
   * Drop all functions
   */
  async dropAllFunctions(): Promise<void> {
    try {
      resetLogger.info('Dropping all custom functions...');

      // Get all custom functions
      const result = await this.client.query(`
        SELECT routine_schema, routine_name, routine_type
        FROM information_schema.routines 
        WHERE routine_schema IN ('tco_core', 'tco_config', 'tco_audit', 'tco_temp', 'public')
        AND routine_type = 'FUNCTION'
        ORDER BY routine_schema, routine_name
      `);

      // Drop each function
      for (const row of result.rows) {
        const functionName = `${row.routine_schema}.${row.routine_name}`;
        try {
          await this.client.query(`DROP FUNCTION IF EXISTS ${functionName} CASCADE`);
          resetLogger.info(`Dropped function: ${functionName}`);
        } catch (error) {
          resetLogger.warn(`Could not drop function ${functionName}:`, error);
        }
      }

      resetLogger.info('All functions dropped successfully');
    } catch (error) {
      resetLogger.error('Failed to drop functions:', error);
      throw error;
    }
  }

  /**
   * Complete database reset
   */
  async performReset(options: { 
    migrateAfter?: boolean; 
    seedAfter?: boolean; 
    confirmReset?: boolean 
  } = {}): Promise<void> {
    const { 
      migrateAfter = true, 
      seedAfter = true, 
      confirmReset = true 
    } = options;

    if (confirmReset && config.isProduction) {
      throw new Error('Database reset is not allowed in production environment');
    }

    try {
      resetLogger.info('Starting complete database reset...');

      await this.connect();

      // Drop everything
      await this.dropAllSchemas();
      await this.dropAllFunctions();

      resetLogger.info('Database reset completed');

      // Re-run migrations if requested
      if (migrateAfter) {
        resetLogger.info('Running migrations after reset...');
        await this.disconnect(); // Close connection before migration
        
        const migrationRunner = new MigrationRunner();
        await migrationRunner.runMigrations();
      }

      // Re-run seeds if requested
      if (seedAfter && migrateAfter) {
        resetLogger.info('Running seeds after reset...');
        
        const seedRunner = new SeedRunner();
        await seedRunner.runSeeds({ force: true });
      }

      resetLogger.info('Database reset and setup completed successfully');

    } catch (error) {
      resetLogger.error('Database reset failed:', error);
      throw error;
    } finally {
      if (this.client) {
        await this.disconnect();
      }
    }
  }

  /**
   * Soft reset - only clear data, keep structure
   */
  async performSoftReset(): Promise<void> {
    try {
      resetLogger.info('Starting soft database reset (data only)...');

      await this.connect();

      // Disable triggers to avoid foreign key issues
      await this.client.query('SET session_replication_role = replica');

      // Clear data from all tables in reverse dependency order
      const clearQueries = [
        'TRUNCATE tco_audit.usage_analytics CASCADE',
        'TRUNCATE tco_audit.configuration_audit CASCADE',
        'TRUNCATE tco_core.generated_reports CASCADE',
        'TRUNCATE tco_core.calculation_sessions CASCADE',
        'TRUNCATE tco_core.admin_users CASCADE',
        'TRUNCATE tco_config.exchange_rates CASCADE',
        'TRUNCATE tco_config.financial_parameters CASCADE',
        'TRUNCATE tco_config.equipment_configurations CASCADE',
        'TRUNCATE _migrations CASCADE',
        'TRUNCATE _seeds CASCADE',
      ];

      for (const query of clearQueries) {
        try {
          await this.client.query(query);
          resetLogger.info(`Cleared: ${query.split(' ')[1]}`);
        } catch (error) {
          resetLogger.warn(`Could not clear ${query}:`, error);
        }
      }

      // Re-enable triggers
      await this.client.query('SET session_replication_role = DEFAULT');

      resetLogger.info('Soft reset completed - structure preserved, data cleared');

    } catch (error) {
      resetLogger.error('Soft reset failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  /**
   * Get database information
   */
  async getDatabaseInfo(): Promise<{
    schemas: string[];
    tableCount: number;
    functionCount: number;
    dataSize: string;
  }> {
    try {
      await this.connect();

      // Get schemas
      const schemaResult = await this.client.query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name IN ('tco_core', 'tco_config', 'tco_audit', 'tco_temp')
        ORDER BY schema_name
      `);
      const schemas = schemaResult.rows.map(row => row.schema_name);

      // Get table count
      const tableResult = await this.client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables 
        WHERE table_schema IN ('tco_core', 'tco_config', 'tco_audit', 'tco_temp', 'public')
        AND table_type = 'BASE TABLE'
      `);
      const tableCount = parseInt(tableResult.rows[0].count);

      // Get function count
      const functionResult = await this.client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.routines 
        WHERE routine_schema IN ('tco_core', 'tco_config', 'tco_audit', 'tco_temp', 'public')
        AND routine_type = 'FUNCTION'
      `);
      const functionCount = parseInt(functionResult.rows[0].count);

      // Get database size
      const sizeResult = await this.client.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      const dataSize = sizeResult.rows[0].size;

      return {
        schemas,
        tableCount,
        functionCount,
        dataSize,
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
  const command = args[0] || 'help';
  const flags = args.slice(1);

  const force = flags.includes('--force') || flags.includes('-f');
  const noMigrate = flags.includes('--no-migrate');
  const noSeed = flags.includes('--no-seed');

  const resetTool = new DatabaseReset();

  try {
    switch (command) {
      case 'reset':
      case 'hard':
        if (!force && config.isProduction) {
          console.log('Database reset in production requires --force flag');
          process.exit(1);
        }
        if (!force) {
          console.log('This will completely reset the database. Use --force to confirm.');
          process.exit(1);
        }
        await resetTool.performReset({
          migrateAfter: !noMigrate,
          seedAfter: !noSeed,
          confirmReset: true,
        });
        break;

      case 'soft':
        if (!force) {
          console.log('This will clear all data. Use --force to confirm.');
          process.exit(1);
        }
        await resetTool.performSoftReset();
        break;

      case 'info':
        const info = await resetTool.getDatabaseInfo();
        console.log('\nDatabase Information:');
        console.log(`  Schemas: ${info.schemas.join(', ') || 'None'}`);
        console.log(`  Tables: ${info.tableCount}`);
        console.log(`  Functions: ${info.functionCount}`);
        console.log(`  Size: ${info.dataSize}`);
        console.log('');
        break;

      case 'help':
        console.log('\nTCO Calculator Database Reset Tool\n');
        console.log('Usage: npm run db:reset [command] [options]\n');
        console.log('Commands:');
        console.log('  reset, hard    Complete reset - drop everything and rebuild (default)');
        console.log('  soft           Soft reset - clear data but keep structure');
        console.log('  info           Show database information');
        console.log('  help           Show this help message');
        console.log('\nOptions:');
        console.log('  --force, -f    Force the reset operation');
        console.log('  --no-migrate   Skip running migrations after reset');
        console.log('  --no-seed      Skip running seeds after reset');
        console.log('\nWarning: This tool will destroy data. Use with caution!\n');
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Run "npm run db:reset help" for usage information');
        process.exit(1);
    }
  } catch (error) {
    resetLogger.error('Reset command failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Database reset failed:', error);
    process.exit(1);
  });
}

export { DatabaseReset };
export default DatabaseReset;