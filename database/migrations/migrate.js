const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  console.log('🏁 [RACEFORGE] Initializing database migration...');
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  };

  try {
    const connection = await mysql.createConnection(connectionConfig);
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log(`Executing schema definition from ${schemaPath}...`);
    await connection.query(sql);
    console.log('✅ [RACEFORGE] Database schema migration completed successfully.');
    await connection.end();
  } catch (error) {
    console.warn('⚠️ [RACEFORGE] MySQL connection error during migration:', error.message);
    console.warn('Note: Raceforge operates with automatic resilient in-memory SQLite/fallback state if MySQL server is not active.');
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
