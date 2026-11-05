import pool from '../config/database.js';

/**
 * Create a blank customer_profiles row for a newly registered customer.
 * Additional fields (city, district, etc.) can be updated later via profile settings.
 */
export async function createCustomerProfile(userId) {
  await pool.query(
    'INSERT INTO customer_profiles (user_id) VALUES (?)',
    [userId]
  );
}

/**
 * Fetch the customer profile joined with user data.
 * Returns null if not found.
 */
export async function findCustomerProfileByUserId(userId) {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.full_name, u.email, u.phone, u.role,
            u.account_status, u.email_verified, u.phone_verified,
            cp.profile_image_url, cp.preferred_language, cp.city, cp.district,
            u.created_at
     FROM users u
     JOIN customer_profiles cp ON cp.user_id = u.id
     WHERE u.id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}
