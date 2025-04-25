import fs from 'fs';
import path from 'path';
import { pool } from '../index';

async function runMigrations() {
  try {
    console.log('Running migrations...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'interview_preps.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Error running migrations:', error);
  } finally {
    await pool.end();
  }
}

runMigrations();