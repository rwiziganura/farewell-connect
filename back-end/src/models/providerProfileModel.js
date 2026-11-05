import pool from '../config/database.js';

/**
 * Create a provider_profiles row for a newly registered provider.
 * verification_status defaults to 'pending' in the schema — never auto-approved.
 */
export async function createProviderProfile({
  user_id,
  business_name,
  business_description,
  business_phone,
  business_email,
  business_address,
  district,
  sector,
}) {
  await pool.query(
    `INSERT INTO provider_profiles
       (user_id, business_name, business_description, business_phone,
        business_email, business_address, district, sector, verification_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      user_id,
      business_name,
      business_description || null,
      business_phone || null,
      business_email || null,
      business_address || null,
      district || null,
      sector || null,
    ]
  );
}

/**
 * Fetch the provider profile joined with user data.
 */
export async function findProviderProfileByUserId(userId) {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.full_name, u.email, u.phone, u.role,
            u.account_status,
            pp.business_name, pp.business_description, pp.business_phone,
            pp.business_email, pp.business_address, pp.district, pp.sector,
            pp.verification_status, pp.average_rating, pp.total_reviews,
            u.created_at
     FROM users u
     JOIN provider_profiles pp ON pp.user_id = u.id
     WHERE u.id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

export async function findPublicProviderById(providerId) {
  const [rows] = await pool.execute(
    `SELECT CAST(pp.id AS CHAR) AS id, pp.business_name,
            pp.business_description, pp.business_phone, pp.business_email,
            pp.business_address, pp.district, pp.sector,
            pp.verification_status, pp.average_rating, pp.total_reviews
     FROM provider_profiles pp
     JOIN users u ON u.id = pp.user_id
     WHERE pp.id = ? AND pp.verification_status = 'verified'
       AND u.role = 'provider' AND u.account_status = 'active'
     LIMIT 1`,
    [providerId],
  );
  return rows[0] || null;
}
