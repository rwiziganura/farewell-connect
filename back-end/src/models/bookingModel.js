import { randomBytes } from 'node:crypto';
import pool from '../config/database.js';

const MAX_REFERENCE_ATTEMPTS = 5;

function createBookingReference() {
  return `FC-${Date.now().toString(36).toUpperCase()}-${randomBytes(6).toString('hex').toUpperCase()}`;
}

function isDuplicateReferenceError(error) {
  return error.code === 'ER_DUP_ENTRY';
}

export async function findVerifiedProviderIdByUserId(userId) {
  const [rows] = await pool.execute(
    `SELECT CAST(id AS CHAR) AS id
     FROM provider_profiles
     WHERE user_id = ? AND verification_status = 'verified'
     LIMIT 1`,
    [userId],
  );
  return rows[0]?.id || null;
}

export async function createBooking({
  customer_id,
  service_id,
  booking_date,
  customer_message,
  service_address,
  district,
}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [services] = await connection.execute(
      `SELECT s.id, s.provider_id, s.service_name, s.price, s.currency,
              s.availability_status, s.is_active, pp.verification_status
       FROM services s
       LEFT JOIN provider_profiles pp ON pp.id = s.provider_id
       WHERE s.id = ?
       FOR UPDATE`,
      [service_id],
    );
    const service = services[0];
    if (!service) {
      const error = new Error('Service not found.');
      error.status = 404;
      throw error;
    }

    if (Number(service.is_active) !== 1 || service.availability_status !== 'available') {
      const error = new Error('This service is not currently available for booking.');
      error.status = 409;
      throw error;
    }

    if (service.verification_status === null) {
      const error = new Error('The service provider profile is not available.');
      error.status = 409;
      throw error;
    }
    if (service.verification_status !== 'verified') {
      const error = new Error('This service provider is not verified for bookings.');
      error.status = 409;
      throw error;
    }

    let bookingId;
    let bookingReference;
    for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt += 1) {
      bookingReference = createBookingReference();
      try {
        const [result] = await connection.execute(
          `INSERT INTO bookings
             (booking_reference, customer_id, provider_id, service_id, booking_date,
              customer_message, service_address, district, agreed_price, currency, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [
            bookingReference,
            customer_id,
            service.provider_id,
            service_id,
            booking_date,
            customer_message,
            service_address,
            district,
            service.price,
            service.currency,
          ],
        );
        bookingId = String(result.insertId);
        break;
      } catch (error) {
        if (!isDuplicateReferenceError(error) || attempt === MAX_REFERENCE_ATTEMPTS - 1) {
          throw error;
        }
      }
    }

    await connection.execute(
      `INSERT INTO booking_status_history
         (booking_id, previous_status, new_status, changed_by, notes)
       VALUES (?, NULL, 'pending', ?, NULL)`,
      [bookingId, customer_id],
    );

    const [createdBookings] = await connection.execute(
      `SELECT CAST(b.id AS CHAR) AS id, b.booking_reference,
              CAST(b.customer_id AS CHAR) AS customer_id,
              CAST(b.provider_id AS CHAR) AS provider_id,
              CAST(b.service_id AS CHAR) AS service_id,
              b.booking_date, b.customer_message, b.service_address, b.district,
              b.agreed_price, b.currency, b.status, b.created_at
       FROM bookings b
       WHERE b.id = ?
       LIMIT 1`,
      [bookingId],
    );
    if (!createdBookings[0]) {
      throw new Error('Created booking could not be retrieved.');
    }

    await connection.commit();
    return createdBookings[0];
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('[bookings] Transaction rollback failed:', rollbackError.code || 'database error');
    }
    throw error;
  } finally {
    connection.release();
  }
}

export async function findCustomerBookings(customerId) {
  const [rows] = await pool.execute(
    `SELECT CAST(b.id AS CHAR) AS id, b.booking_reference, b.booking_date,
            b.agreed_price, b.currency, b.status, b.service_address, b.district,
            CAST(b.service_id AS CHAR) AS service_id,
            s.service_name, s.location AS service_location,
            CAST(b.provider_id AS CHAR) AS provider_id,
            pp.business_name, b.created_at
     FROM bookings b
     JOIN services s ON s.id = b.service_id
     JOIN provider_profiles pp ON pp.id = b.provider_id
     WHERE b.customer_id = ?
     ORDER BY b.created_at DESC, b.id DESC`,
    [customerId],
  );
  return rows;
}

export async function findCustomerBooking(bookingId, customerId) {
  const [rows] = await pool.execute(
    `SELECT CAST(b.id AS CHAR) AS id, b.booking_reference,
            b.booking_date, b.customer_message, b.agreed_price, b.currency,
            b.status, b.service_address, b.district,
            CAST(b.service_id AS CHAR) AS service_id, s.service_name,
            s.location AS service_location,
            CAST(b.provider_id AS CHAR) AS provider_id, pp.business_name,
            b.created_at
     FROM bookings b
     JOIN services s ON s.id = b.service_id
     JOIN provider_profiles pp ON pp.id = b.provider_id
     WHERE b.id = ? AND b.customer_id = ?
     LIMIT 1`,
    [bookingId, customerId],
  );
  return rows[0] || null;
}

export async function findProviderBookings(providerId) {
  const [rows] = await pool.execute(
    `SELECT CAST(b.id AS CHAR) AS id, b.booking_reference, b.booking_date,
            b.agreed_price, b.currency, b.status, b.service_address, b.district,
            CAST(b.service_id AS CHAR) AS service_id,
            s.service_name, s.location AS service_location,
            CAST(b.customer_id AS CHAR) AS customer_id,
            u.full_name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
            b.created_at
     FROM bookings b
     JOIN services s ON s.id = b.service_id
     JOIN users u ON u.id = b.customer_id
     WHERE b.provider_id = ?
     ORDER BY b.created_at DESC, b.id DESC`,
    [providerId],
  );
  return rows;
}

export async function updateBookingStatus({
  bookingId,
  providerUserId,
  changedBy,
  nextStatus,
  cancellationReason,
}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [providers] = await connection.execute(
      `SELECT CAST(id AS CHAR) AS id
       FROM provider_profiles
       WHERE user_id = ? AND verification_status = 'verified'
       FOR UPDATE`,
      [providerUserId],
    );
    const providerId = providers[0]?.id;
    if (!providerId) {
      const error = new Error('A verified provider profile is required to update booking requests.');
      error.status = 403;
      throw error;
    }

    const [rows] = await connection.execute(
      `SELECT status
       FROM bookings
       WHERE id = ? AND provider_id = ?
       FOR UPDATE`,
      [bookingId, providerId],
    );
    const booking = rows[0];
    if (!booking) {
      const error = new Error('Booking not found.');
      error.status = 404;
      throw error;
    }

    const allowedTransitions = {
      pending: ['accepted', 'rejected'],
      accepted: ['confirmed', 'completed', 'cancelled'],
      confirmed: ['completed', 'cancelled'],
    };
    if (!allowedTransitions[booking.status]?.includes(nextStatus)) {
      const error = new Error(`Cannot change booking status from ${booking.status} to ${nextStatus}.`);
      error.status = 409;
      throw error;
    }

    const timestampColumn = nextStatus === 'accepted'
      ? 'accepted_at'
      : nextStatus === 'completed'
        ? 'completed_at'
        : null;
    const timestampUpdate = timestampColumn ? `, ${timestampColumn} = CURRENT_TIMESTAMP` : '';
    const cancellationUpdate = nextStatus === 'cancelled' ? ', cancellation_reason = ?' : '';
    const updateValues = nextStatus === 'cancelled'
      ? [nextStatus, cancellationReason, bookingId, providerId]
      : [nextStatus, bookingId, providerId];

    await connection.execute(
      `UPDATE bookings
       SET status = ?${timestampUpdate}${cancellationUpdate}
       WHERE id = ? AND provider_id = ?`,
      updateValues,
    );
    await connection.execute(
      `INSERT INTO booking_status_history
         (booking_id, previous_status, new_status, changed_by, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [bookingId, booking.status, nextStatus, changedBy, nextStatus === 'cancelled' ? cancellationReason : null],
    );

    const [updatedRows] = await connection.execute(
      `SELECT CAST(id AS CHAR) AS id, booking_reference, status,
              accepted_at, completed_at, updated_at
       FROM bookings
       WHERE id = ?
       LIMIT 1`,
      [bookingId],
    );

    await connection.commit();
    return updatedRows[0];
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('[bookings] Transaction rollback failed:', rollbackError.code || 'database error');
    }
    throw error;
  } finally {
    connection.release();
  }
}
