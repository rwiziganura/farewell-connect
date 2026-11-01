import pool from '../config/database.js';

/**
 * Find a user by email. Returns the full row including password_hash.
 * Used during login — the controller strips password_hash before responding.
 */
export async function findUserByEmail(email) {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

/**
 * Find a user by phone number.
 */
export async function findUserByPhone(phone) {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE phone = ? LIMIT 1',
    [phone]
  );
  return rows[0] || null;
}

/**
 * Find a user by id. Excludes password_hash — safe to return to clients.
 */
export async function findUserById(id) {
  const [rows] = await pool.query(
    `SELECT id, full_name, email, phone, role, account_status,
            email_verified, phone_verified, created_at
     FROM users WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Insert a new user row. Returns the auto-generated id.
 */
export async function createUser({ full_name, email, phone, password_hash, role = 'customer' }) {
  const [result] = await pool.query(
    `INSERT INTO users (full_name, email, phone, password_hash, role)
     VALUES (?, ?, ?, ?, ?)`,
    [full_name, email, phone, password_hash, role]
  );
  return result.insertId;
}
