import { validationResult } from 'express-validator';
import {
  findProviderApplications,
  updateProviderApplication,
} from '../models/adminProviderModel.js';

const supportedStatuses = new Set(['pending', 'verified', 'rejected']);

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

function sendDatabaseError(res, error, operation) {
  console.error(`[admin providers] ${operation} failed:`, error.code || 'database error');
  return res.status(500).json({
    success: false,
    message: `Unable to ${operation}. Please try again later.`,
  });
}

function sendOperationError(res, error, operation) {
  if (error.status) {
    return res.status(error.status).json({ success: false, message: error.message });
  }
  return sendDatabaseError(res, error, operation);
}

export async function getPendingProviderApplications(req, res) {
  try {
    const providers = await findProviderApplications('pending');
    return res.status(200).json({ success: true, providers });
  } catch (error) {
    return sendDatabaseError(res, error, 'retrieve pending provider applications');
  }
}

export async function getProviderApplications(req, res) {
  if (handleValidationErrors(req, res)) return;

  try {
    const providers = await findProviderApplications(req.query.status);
    return res.status(200).json({ success: true, providers });
  } catch (error) {
    return sendDatabaseError(res, error, 'retrieve provider applications');
  }
}

export async function approveProviderApplication(req, res) {
  if (handleValidationErrors(req, res)) return;

  try {
    const provider = await updateProviderApplication({
      providerId: String(req.params.providerId),
      adminId: req.user.id,
      status: 'verified',
    });
    return res.status(200).json({
      success: true,
      message: 'Provider application approved.',
      provider,
    });
  } catch (error) {
    return sendOperationError(res, error, 'approve provider application');
  }
}

export async function rejectProviderApplication(req, res) {
  if (handleValidationErrors(req, res)) return;

  const verificationNotes = req.body.reason.trim();
  try {
    const provider = await updateProviderApplication({
      providerId: String(req.params.providerId),
      adminId: req.user.id,
      status: 'rejected',
      verificationNotes,
    });
    return res.status(200).json({
      success: true,
      message: 'Provider application rejected.',
      provider,
    });
  } catch (error) {
    return sendOperationError(res, error, 'reject provider application');
  }
}

export { supportedStatuses };
