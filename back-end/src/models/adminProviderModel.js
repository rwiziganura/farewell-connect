import pool from '../config/database.js';

const providerApplicationColumns = `
  CAST(pp.id AS CHAR) AS provider_id,
  CAST(pp.user_id AS CHAR) AS user_id,
  u.full_name,
  u.email AS user_email,
  u.phone AS user_phone,
  pp.business_name,
  pp.business_phone,
  pp.business_email,
  pp.business_address,
  pp.province,
  pp.district,
  pp.sector,
  pp.business_registration_number,
  pp.verification_status,
  pp.verification_notes,
  pp.verified_at,
  CAST(pp.verified_by AS CHAR) AS verified_by,
  pp.created_at AS application_submitted_at,
  pp.updated_at
`;

export async function findProviderApplications(status) {
  const [rows] = status
    ? await pool.execute(
      `SELECT ${providerApplicationColumns}
       FROM provider_profiles pp
       JOIN users u ON u.id = pp.user_id
       WHERE pp.verification_status = ?
       ORDER BY pp.created_at ASC, pp.id ASC`,
      [status],
    )
    : await pool.query(
      `SELECT ${providerApplicationColumns}
       FROM provider_profiles pp
       JOIN users u ON u.id = pp.user_id
       ORDER BY pp.created_at DESC, pp.id DESC`,
    );
  return rows;
}

export async function updateProviderApplication({
  providerId,
  adminId,
  status,
  verificationNotes,
}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [providers] = await connection.execute(
      `SELECT verification_status
       FROM provider_profiles
       WHERE id = ?
       FOR UPDATE`,
      [providerId],
    );
    const provider = providers[0];
    if (!provider) {
      const error = new Error('Provider application not found.');
      error.status = 404;
      throw error;
    }

    if (provider.verification_status !== 'pending') {
      const error = new Error('Only pending provider applications can be reviewed.');
      error.status = 409;
      throw error;
    }

    if (status === 'verified') {
      await connection.execute(
        `UPDATE provider_profiles
         SET verification_status = 'verified',
             verification_notes = NULL,
             verified_at = CURRENT_TIMESTAMP,
             verified_by = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [adminId, providerId],
      );
    } else {
      await connection.execute(
        `UPDATE provider_profiles
         SET verification_status = 'rejected',
             verification_notes = ?,
             verified_at = NULL,
             verified_by = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [verificationNotes, providerId],
      );
    }

    const action = status === 'verified' ? 'provider.approved' : 'provider.rejected';
    const description = status === 'verified'
      ? 'Provider application approved.'
      : `Provider application rejected: ${verificationNotes}`;
    await connection.execute(
      `INSERT INTO admin_activity_logs
         (admin_id, action, target_type, target_id, description)
       VALUES (?, ?, 'provider_profile', ?, ?)`,
      [adminId, action, providerId, description],
    );

    const [updatedProviders] = await connection.execute(
      `SELECT ${providerApplicationColumns}
       FROM provider_profiles pp
       JOIN users u ON u.id = pp.user_id
       WHERE pp.id = ?
       LIMIT 1`,
      [providerId],
    );
    if (!updatedProviders[0]) {
      throw new Error('Updated provider application could not be retrieved.');
    }

    await connection.commit();
    return updatedProviders[0];
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('[admin providers] Transaction rollback failed:', rollbackError.code || 'database error');
    }
    throw error;
  } finally {
    connection.release();
  }
}
