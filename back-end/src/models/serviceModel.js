import pool from '../config/database.js';

const serviceColumns = `
  CAST(s.id AS CHAR) AS id,
  CAST(s.provider_id AS CHAR) AS provider_id,
  CAST(s.category_id AS CHAR) AS category_id,
  c.category_name,
  s.service_name,
  s.slug,
  s.description,
  s.price,
  s.currency,
  s.pricing_type,
  s.location,
  s.district,
  s.availability_status,
  s.is_active,
  s.created_at,
  s.updated_at
`;

function createStatusError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function findProvider(connection, userId, lock = false) {
  const [rows] = await connection.execute(
    `SELECT CAST(id AS CHAR) AS id, verification_status
     FROM provider_profiles
     WHERE user_id = ?
     LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [userId],
  );
  if (!rows[0]) {
    throw createStatusError(403, 'A provider profile is required to manage services.');
  }
  return rows[0];
}

async function requireActiveCategory(connection, categoryId) {
  const [rows] = await connection.execute(
    'SELECT id FROM categories WHERE id = ? AND is_active = 1 LIMIT 1',
    [categoryId],
  );
  if (!rows[0]) {
    throw createStatusError(400, 'The selected category does not exist or is inactive.');
  }
}

async function findOwnedService(connection, providerId, serviceId, lock = false) {
  const [rows] = await connection.execute(
    `SELECT id, is_active
     FROM services
     WHERE id = ? AND provider_id = ?
     LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [serviceId, providerId],
  );
  if (!rows[0]) throw createStatusError(404, 'Service not found.');
  return rows[0];
}

function createSlugBase(serviceName) {
  return serviceName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180)
    .replace(/-+$/g, '') || 'service';
}

async function findAvailableSlug(connection, providerId, serviceName, excludeServiceId = null) {
  const slugBase = createSlugBase(serviceName);
  for (let suffix = 1; suffix <= 100; suffix += 1) {
    const suffixText = suffix === 1 ? '' : `-${suffix}`;
    const slug = `${slugBase.slice(0, 220 - suffixText.length)}${suffixText}`;
    const [existing] = excludeServiceId
      ? await connection.execute(
        `SELECT id FROM services
         WHERE provider_id = ? AND slug = ? AND id <> ?
         LIMIT 1`,
        [providerId, slug, excludeServiceId],
      )
      : await connection.execute(
        'SELECT id FROM services WHERE provider_id = ? AND slug = ? LIMIT 1',
        [providerId, slug],
      );
    if (!existing.length) return slug;
  }
  throw createStatusError(409, 'Could not generate a unique service URL. Try a different service name.');
}

function isDuplicateEntry(error) {
  return error.code === 'ER_DUP_ENTRY';
}

async function getService(connection, providerId, serviceId) {
  const [rows] = await connection.execute(
    `SELECT ${serviceColumns}
     FROM services s
     JOIN categories c ON c.id = s.category_id
     WHERE s.id = ? AND s.provider_id = ?
     LIMIT 1`,
    [serviceId, providerId],
  );
  if (!rows[0]) throw createStatusError(404, 'Service not found.');
  return rows[0];
}

export async function listProviderServices(userId) {
  const connection = await pool.getConnection();
  try {
    const provider = await findProvider(connection, userId);
    const [rows] = await connection.execute(
      `SELECT ${serviceColumns}
       FROM services s
       JOIN categories c ON c.id = s.category_id
       WHERE s.provider_id = ?
       ORDER BY s.created_at DESC, s.id DESC`,
      [provider.id],
    );
    return rows;
  } finally {
    connection.release();
  }
}

export async function getProviderService(userId, serviceId) {
  const connection = await pool.getConnection();
  try {
    const provider = await findProvider(connection, userId);
    return await getService(connection, provider.id, serviceId);
  } finally {
    connection.release();
  }
}

export async function createProviderService(userId, service) {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const provider = await findProvider(connection, userId, true);

    if (service.is_active && provider.verification_status !== 'verified') {
      throw createStatusError(403, 'Only verified providers can publish active services.');
    }

    await requireActiveCategory(connection, service.category_id);
    let insertedId = null;

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const slug = await findAvailableSlug(connection, provider.id, service.service_name);
      try {
        const [result] = await connection.execute(
          `INSERT INTO services
             (provider_id, category_id, service_name, slug, description, price, currency,
              pricing_type, location, district, availability_status, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            provider.id,
            service.category_id,
            service.service_name,
            slug,
            service.description,
            service.price,
            service.currency,
            service.pricing_type,
            service.location,
            service.district,
            service.availability_status,
            service.is_active ? 1 : 0,
          ],
        );
        insertedId = String(result.insertId);
        break;
      } catch (error) {
        if (!isDuplicateEntry(error) || attempt === 5) throw error;
      }
    }

    if (!insertedId) {
      throw createStatusError(409, 'Could not generate a unique service URL. Try a different service name.');
    }

    const created = await getService(connection, provider.id, insertedId);
    await connection.commit();
    transactionStarted = false;
    return created;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      throw createStatusError(400, 'The selected category is no longer available.');
    }
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateProviderService(userId, serviceId, updates) {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const provider = await findProvider(connection, userId, true);
    const existing = await findOwnedService(connection, provider.id, serviceId, true);

    if (Number(existing.is_active) === 1 && provider.verification_status !== 'verified') {
      throw createStatusError(403, 'Only verified providers can update a published active service.');
    }
    if (Object.hasOwn(updates, 'category_id')) {
      await requireActiveCategory(connection, updates.category_id);
    }
    if (Object.hasOwn(updates, 'service_name')) {
      updates.slug = await findAvailableSlug(connection, provider.id, updates.service_name, serviceId);
    }

    const fields = {
      service_name: 'service_name',
      slug: 'slug',
      category_id: 'category_id',
      description: 'description',
      price: 'price',
      currency: 'currency',
      pricing_type: 'pricing_type',
      location: 'location',
      district: 'district',
      availability_status: 'availability_status',
    };
    const assignments = [];
    const values = [];
    for (const [field, column] of Object.entries(fields)) {
      if (Object.hasOwn(updates, field)) {
        assignments.push(`${column} = ?`);
        values.push(updates[field]);
      }
    }

    if (!assignments.length) throw createStatusError(400, 'At least one service detail must be provided.');
    values.push(serviceId, provider.id);
    await connection.execute(
      `UPDATE services SET ${assignments.join(', ')} WHERE id = ? AND provider_id = ?`,
      values,
    );

    const updated = await getService(connection, provider.id, serviceId);
    await connection.commit();
    transactionStarted = false;
    return updated;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      throw createStatusError(400, 'The selected category is no longer available.');
    }
    throw error;
  } finally {
    connection.release();
  }
}

export async function setProviderServiceActive(userId, serviceId, isActive) {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const provider = await findProvider(connection, userId, true);
    await findOwnedService(connection, provider.id, serviceId, true);

    if (isActive && provider.verification_status !== 'verified') {
      throw createStatusError(403, 'Only verified providers can activate services.');
    }

    await connection.execute(
      'UPDATE services SET is_active = ? WHERE id = ? AND provider_id = ?',
      [isActive ? 1 : 0, serviceId, provider.id],
    );
    const updated = await getService(connection, provider.id, serviceId);
    await connection.commit();
    transactionStarted = false;
    return updated;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteProviderService(userId, serviceId) {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const provider = await findProvider(connection, userId, true);
    await findOwnedService(connection, provider.id, serviceId, true);
    await connection.execute(
      'DELETE FROM services WHERE id = ? AND provider_id = ?',
      [serviceId, provider.id],
    );
    await connection.commit();
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
