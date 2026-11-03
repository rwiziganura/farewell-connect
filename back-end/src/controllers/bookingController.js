import { validationResult } from 'express-validator';
import {
  createBooking,
  findCustomerBookings,
  findVerifiedProviderIdByUserId,
  findProviderBookings,
  updateBookingStatus,
} from '../models/bookingModel.js';

const MAX_SIGNED_BIGINT = 9223372036854775807n;

function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map(({ path, msg }) => ({ field: path, message: msg })),
    });
    return true;
  }
  return false;
}

function isPositiveBigIntId(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return false;

  const text = String(value);
  if (!/^[1-9]\d{0,18}$/.test(text)) return false;
  return BigInt(text) <= MAX_SIGNED_BIGINT;
}

function parseFutureBookingDate(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|([+-])(\d{2}):(\d{2}))$/,
  );
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText = '0', zone, sign, offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (year < 1000 || month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return null;

  const localDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    localDate.getUTCFullYear() !== year ||
    localDate.getUTCMonth() !== month - 1 ||
    localDate.getUTCDate() !== day
  ) return null;

  if (zone !== 'Z') {
    const offsetHours = Number(offsetHourText);
    const offsetMinutes = Number(offsetMinuteText);
    if (offsetHours > 14 || offsetMinutes > 59 || (offsetHours === 14 && offsetMinutes !== 0)) return null;
  }

  const parsedDate = new Date(value);
  if (!Number.isFinite(parsedDate.getTime()) || parsedDate.getTime() <= Date.now()) return null;

  const databaseDate = new Date(Math.ceil(parsedDate.getTime() / 1000) * 1000);
  if (databaseDate.getTime() <= Date.now()) return null;

  return databaseDate.toISOString().slice(0, 19).replace('T', ' ');
}

function sendDatabaseError(res, error, operation) {
  console.error(`[bookings] ${operation} failed:`, error.code || 'database error');
  res.status(500).json({
    success: false,
    message: `Unable to ${operation}. Please try again later.`,
  });
}

function sendKnownError(res, error, fallbackMessage) {
  if (error.status) {
    res.status(error.status).json({ success: false, message: error.message });
    return true;
  }
  sendDatabaseError(res, error, fallbackMessage);
  return false;
}

export async function createCustomerBooking(req, res) {
  if (handleValidationErrors(req, res)) return;

  const bookingDate = parseFutureBookingDate(req.body.booking_date);
  if (!bookingDate) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: [{
        field: 'booking_date',
        message: 'Booking date must be a valid future ISO 8601 date-time with a timezone.',
      }],
    });
  }

  try {
    const booking = await createBooking({
      customer_id: req.user.id,
      service_id: String(req.body.service_id),
      booking_date: bookingDate,
      customer_message: req.body.customer_message?.trim() || null,
      service_address: req.body.service_address?.trim() || null,
      district: req.body.district?.trim() || null,
    });
    return res.status(201).json({
      success: true,
      message: 'Booking request submitted. It is pending provider approval.',
      booking,
    });
  } catch (error) {
    sendKnownError(res, error, 'submit booking request');
  }
}

export async function getMyBookings(req, res) {
  try {
    const bookings = await findCustomerBookings(req.user.id);
    return res.status(200).json({ success: true, bookings });
  } catch (error) {
    sendDatabaseError(res, error, 'retrieve bookings');
  }
}

export async function getProviderBookings(req, res) {
  try {
    const providerId = await findVerifiedProviderIdByUserId(req.user.id);
    if (!providerId) {
      return res.status(403).json({
        success: false,
        message: 'A verified provider profile is required to view booking requests.',
      });
    }
    const bookings = await findProviderBookings(providerId);
    return res.status(200).json({ success: true, bookings });
  } catch (error) {
    sendDatabaseError(res, error, 'retrieve provider bookings');
  }
}

export async function patchProviderBookingStatus(req, res) {
  if (handleValidationErrors(req, res)) return;

  const nextStatus = req.body.status.toLowerCase();
  const cancellationReason = req.body.cancellation_reason?.trim();
  if (nextStatus === 'cancelled' && !cancellationReason) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: [{
        field: 'cancellation_reason',
        message: 'A cancellation reason is required.',
      }],
    });
  }

  try {
    const booking = await updateBookingStatus({
      bookingId: String(req.params.bookingId),
      providerUserId: req.user.id,
      changedBy: req.user.id,
      nextStatus,
      cancellationReason: cancellationReason || null,
    });
    return res.status(200).json({
      success: true,
      message: 'Booking status updated.',
      booking,
    });
  } catch (error) {
    sendKnownError(res, error, 'update booking status');
  }
}

export { isPositiveBigIntId, parseFutureBookingDate };
