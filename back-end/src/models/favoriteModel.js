import pool from '../config/database.js';

export async function findCustomerFavorites(customerId) {
  const [rows] = await pool.execute(
    `SELECT CAST(pp.id AS CHAR) AS id, pp.business_name,
            pp.business_description, pp.business_address, pp.district, pp.sector,
            pp.average_rating, pp.total_reviews
     FROM favorites f
     JOIN provider_profiles pp ON pp.id = f.provider_id
     JOIN users u ON u.id = pp.user_id
       AND u.role = 'provider' AND u.account_status = 'active'
     WHERE f.customer_id = ? AND pp.verification_status = 'verified'
     ORDER BY f.created_at DESC, pp.id DESC`,
    [customerId],
  );
  return rows;
}

export async function addCustomerFavorite(customerId, providerId) {
  const [providers] = await pool.execute(
    `SELECT pp.id
     FROM provider_profiles pp
     JOIN users u ON u.id = pp.user_id
       AND u.role = 'provider' AND u.account_status = 'active'
     WHERE pp.id = ? AND pp.verification_status = 'verified'
     LIMIT 1`,
    [providerId],
  );
  if (!providers[0]) return false;

  await pool.execute(
    `INSERT INTO favorites (customer_id, provider_id)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE provider_id = VALUES(provider_id)`,
    [customerId, providerId],
  );
  return true;
}

export async function removeCustomerFavorite(customerId, providerId) {
  const [result] = await pool.execute(
    'DELETE FROM favorites WHERE customer_id = ? AND provider_id = ?',
    [customerId, providerId],
  );
  return result.affectedRows > 0;
}
