import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// Resolve __dirname for ES modules.
// import.meta.url is always the URL of THIS file (src/config/database.js),
// so the cert path is always relative to the backend project root —
// regardless of which directory you run `node` from.
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// The backend project root is two levels up from src/config/
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const sslEnabled = process.env.TIDB_ENABLE_SSL === 'true';

// Build the pool configuration.
const poolConfig = {
  host:     process.env.TIDB_HOST,
  port:     Number(process.env.TIDB_PORT) || 4000,
  user:     process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_DATABASE,

  // TiDB Cloud Starter free tier has a low connection ceiling.
  waitForConnections: true,
  connectionLimit:    5,
  queueLimit:         0,

  enableKeepAlive:        true,
  keepAliveInitialDelay:  10000,
};

if (sslEnabled) {
  // TIDB_CA_PATH is relative to the backend project root, e.g. /certs/isrgrootx1.pem
  // path.join ensures this resolves correctly on Windows and Unix alike.
  const caPath = path.join(PROJECT_ROOT, process.env.TIDB_CA_PATH);

  // Fail fast at startup if the cert file is missing rather than at connection time.
  if (!fs.existsSync(caPath)) {
    throw new Error(
      `CA certificate not found at: ${caPath}\n` +
      `Check TIDB_CA_PATH in your .env file.`
    );
  }

  poolConfig.ssl = {
    minVersion:           'TLSv1.2',
    ca:                   fs.readFileSync(caPath), // explicit CA verification
    rejectUnauthorized:   true,                   // never set this to false
  };
}

// The pool is created once when this module is first imported.
// All routes share this single instance — no new connections per request.
const pool = mysql.createPool(poolConfig);

/**
 * testConnection()
 *
 * Borrows one connection from the pool, runs SELECT 1, then releases it.
 * Call this on server startup to catch bad credentials or network issues early.
 *
 * Only err.message is logged — the full error object can contain the
 * connection string including host and credentials.
 */
export async function testConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query('SELECT 1');
    console.log('✓ Database connection established successfully.');
  } catch (err) {
    console.error('✗ Database connection failed:', err.message);
    throw new Error(
      'Unable to connect to the database. Check your TIDB_* variables in .env.'
    );
  } finally {
    if (connection) connection.release();
  }
}

export default pool;
