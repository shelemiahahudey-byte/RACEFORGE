const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runSeed() {
  console.log('🏁 [RACEFORGE] Seeding database...');
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'raceforge',
    multipleStatements: true
  };

  try {
    const connection = await mysql.createConnection(connectionConfig);
    const seedsPath = path.join(__dirname, 'seeds.sql');
    const sql = fs.readFileSync(seedsPath, 'utf8');

    await connection.query(sql);
    console.log('✅ [RACEFORGE] Seed data populated successfully.');
    await connection.end();
  } catch (error) {
    console.warn('⚠️ [RACEFORGE] MySQL seed warning:', error.message);
  }
}

if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };
