import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

// GET /api/health
// Confirms the Express server process is running.
// Does NOT check the database — use /api/health/db for that.
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Farewell Connect API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// GET /api/health/db
// Borrows one connection from the pool, executes SELECT 1, then releases it.
// Returns 200 when the database is reachable, 503 when it is not.
// Credentials and internal error details are never included in the response.
router.get('/db', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query('SELECT 1');
    res.status(200).json({
      success: true,
      message: 'Database connection is healthy',
      database: process.env.TIDB_DATABASE,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    // Log the message server-side for debugging, but never send it to the client
    console.error('DB health check failed:', err.message);
    res.status(503).json({
      success: false,
      message: 'Database is not reachable. Check server configuration.',
    });
  } finally {
    if (connection) connection.release();
  }
});

export default router;
