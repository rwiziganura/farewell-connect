import { validationResult } from 'express-validator';
import { findPublicProviderById } from '../models/providerProfileModel.js';
import { findPublicProviderServices } from '../models/serviceModel.js';

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

export async function getPublicProvider(req, res) {
  if (handleValidationErrors(req, res)) return;
  try {
    const provider = await findPublicProviderById(String(req.params.providerId));
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }
    const services = await findPublicProviderServices(String(req.params.providerId));
    return res.status(200).json({ success: true, provider, services });
  } catch (error) {
    console.error('[providers] retrieve public provider failed:', error.code || 'database error');
    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve provider. Please try again later.',
    });
  }
}
