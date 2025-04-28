import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../index';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  try {
    console.log('Running migrations...');
    
    // Define all migration files in order
    const migrationFiles = [
      'interview_preps.sql',
      'user_responses.sql'
    ];
    
    // Execute each migration in sequence
    for (const file of migrationFiles) {
      console.log(`Applying migration: ${file}`);
      const sqlPath = path.join(__dirname, file);
      
      // Check if file exists
      if (!fs.existsSync(sqlPath)) {
        console.warn(`Migration file ${file} not found, skipping...`);
        continue;
      }
      
      // Read and execute the SQL
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await pool.query(sql);
      console.log(`Migration ${file} applied successfully`);
    }
    
    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Error running migrations:', error);
  } finally {
    await pool.end();
  }
}

runMigrations();