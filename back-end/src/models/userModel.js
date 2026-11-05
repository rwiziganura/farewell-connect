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

export async function findUserByUsername(username) {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE username = ? LIMIT 1',
    [username]
  );
  return rows[0] || null;
}

/**
 * Find a user by id. Excludes password_hash — safe to return to clients.
 */
export async function findUserById(id) {
  const [rows] = await pool.query(
    `SELECT id, username, full_name, email, phone, role, account_status,
            email_verified, phone_verified, created_at
     FROM users WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function findAccountUserById(id) {
  const [rows] = await pool.execute(
    `SELECT id, username, full_name, email, phone, role
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

export async function findUserTokenVersion(id) {
  const [rows] = await pool.execute(
    'SELECT token_version FROM users WHERE id = ? LIMIT 1',
    [id],
  );
  return rows[0] ? Number(rows[0].token_version) : null;
}

export async function findUserIdByUsername(username, excludeUserId) {
  const [rows] = await pool.execute(
    `SELECT id
     FROM users
     WHERE username = ? AND id <> ?
     LIMIT 1`,
    [username, excludeUserId],
  );
  return rows[0] || null;
}

export async function updateUserAccount(id, { username, full_name }) {
  const [result] = await pool.execute(
    `UPDATE users
     SET username = ?, full_name = ?
     WHERE id = ?`,
    [username, full_name, id],
  );
  return result.affectedRows;
}

export async function findUserCredentialsById(id) {
  const [rows] = await pool.execute(
    'SELECT id, password_hash FROM users WHERE id = ? LIMIT 1',
    [id],
  );
  return rows[0] || null;
}

export async function updateUserPassword(id, currentHash, newHash) {
  const [result] = await pool.execute(
    `UPDATE users
     SET password_hash = ?, token_version = token_version + 1
     WHERE id = ? AND password_hash = ?`,
    [newHash, id, currentHash],
  );
  return result.affectedRows;
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
