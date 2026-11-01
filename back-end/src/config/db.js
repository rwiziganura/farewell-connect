import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create a connection pool.
// A pool keeps a set of reusable connections open so the app does not pay
// the cost of opening a new TCP connection on every request.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 4000,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    // TiDB Cloud requires TLS — never disable this in production
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
  },
  waitForConnections: true,  // queue requests when all connections are busy
  connectionLimit: 10,       // maximum simultaneous connections in the pool
  queueLimit: 0,             // unlimited queue (0 = no limit)
});

/**
 * Borrow one connection from the pool, run a lightweight ping query,
 * then release the connection back immediately.
 *
 * Call this on server startup to catch misconfigured credentials early.
 * Never log the error object directly — it may contain the connection string.
 */
export async function testConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query('SELECT 1');
    console.log('Database connection established successfully.');
  } catch (err) {
    // Log only the message, never the full error (which may include credentials)
    console.error('Database connection failed:', err.message);
    throw new Error('Unable to connect to the database. Check your .env credentials.');
  } finally {
    // Always release — even if the query threw
    if (connection) connection.release();
  }
}

export default pool;
