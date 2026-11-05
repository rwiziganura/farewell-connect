import { validationResult } from 'express-validator';
import {
  addCustomerFavorite,
  findCustomerFavorites,
  removeCustomerFavorite,
} from '../models/favoriteModel.js';

const MAX_SIGNED_BIGINT = 9223372036854775807n;

function isPositiveBigIntId(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return false;
  const text = String(value);
  return /^[1-9]\d{0,18}$/.test(text) && BigInt(text) <= MAX_SIGNED_BIGINT;
}

function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(422).json({
    success: false,
    message: 'Validation failed.',
    errors: errors.array().map(({ path, msg }) => ({ field: path, message: msg })),
  });
  return true;
}

function sendDatabaseError(res, error, operation) {
  console.error(`[favorites] ${operation} failed:`, error.code || 'database error');
  return res.status(500).json({
    success: false,
    message: `Unable to ${operation}. Please try again later.`,
  });
}

export async function getMyFavorites(req, res) {
  try {
    const favorites = await findCustomerFavorites(req.user.id);
    return res.status(200).json({ success: true, favorites });
  } catch (error) {
    return sendDatabaseError(res, error, 'retrieve saved providers');
  }
}

export async function saveFavorite(req, res) {
  if (handleValidationErrors(req, res)) return;
  try {
    const saved = await addCustomerFavorite(req.user.id, String(req.body.provider_id));
    if (!saved) {
      return res.status(404).json({
        success: false,
        message: 'Verified provider not found.',
      });
    }
    return res.status(201).json({ success: true, message: 'Provider saved.' });
  } catch (error) {
    return sendDatabaseError(res, error, 'save provider');
  }
}

export async function deleteFavorite(req, res) {
  if (handleValidationErrors(req, res)) return;
  try {
    await removeCustomerFavorite(req.user.id, String(req.params.providerId));
    return res.status(200).json({ success: true, message: 'Provider removed from saved providers.' });
  } catch (error) {
    return sendDatabaseError(res, error, 'remove saved provider');
  }
}

export { isPositiveBigIntId };
