import { validationResult } from 'express-validator';
import {
  createProviderService,
  deleteProviderService,
  getPublicService,
  getProviderService,
  listActiveCategories,
  listPublicServices,
  listProviderServices,
  setProviderServiceActive,
  updateProviderService,
} from '../models/serviceModel.js';

const MAX_SIGNED_BIGINT = 9223372036854775807n;
const createFields = new Set([
  'service_name',
  'category_id',
  'description',
  'price',
  'currency',
  'pricing_type',
  'location',
  'district',
  'availability_status',
  'is_active',
]);
const updateFields = new Set([
  'service_name',
  'category_id',
  'description',
  'price',
  'currency',
  'pricing_type',
  'location',
  'district',
  'availability_status',
]);

export function isPositiveBigIntId(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return false;
  const text = String(value);
  return /^[1-9]\d{0,18}$/.test(text) && BigInt(text) <= MAX_SIGNED_BIGINT;
}

function isValidPrice(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  if (typeof value === 'number' && !Number.isFinite(value)) return false;
  return /^\d{1,10}(?:\.\d{1,2})?$/.test(String(value));
}

function validateAllowedFields(req, allowedFields, requireOne = false) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new Error('Request body must be an object.');
  }
  const keys = Object.keys(req.body);
  const unknownFields = keys.filter((key) => !allowedFields.has(key));
  if (unknownFields.length) {
    throw new Error(`Unsupported field: ${unknownFields[0]}.`);
  }
  if (requireOne && !keys.length) {
    throw new Error('At least one service detail must be provided.');
  }
  return true;
}

function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  return res.status(400).json({
    success: false,
    message: 'Validation failed.',
    errors: errors.array().map(({ path, msg }) => ({ field: path, message: msg })),
  });
}

function sendError(res, error, operation) {
  if (error.status) {
    return res.status(error.status).json({ success: false, message: error.message });
  }
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'A service with these details already exists for your provider account.',
    });
  }
  console.error(`[services] ${operation} failed:`, error.code || 'database error');
  return res.status(500).json({
    success: false,
    message: `Unable to ${operation}. Please try again later.`,
  });
}

function normalizeServiceInput(body) {
  return {
    ...body,
    ...(typeof body.category_id === 'string' ? { category_id: body.category_id } : {}),
    ...(body.currency ? { currency: body.currency.trim().toUpperCase() } : {}),
    ...(body.description === undefined ? { description: null } : {}),
    ...(body.price === undefined ? { price: '0.00' } : {}),
    ...(body.currency === undefined ? { currency: 'RWF' } : {}),
    ...(body.pricing_type === undefined ? { pricing_type: 'fixed' } : {}),
    ...(body.location === undefined ? { location: null } : {}),
    ...(body.district === undefined ? { district: null } : {}),
    ...(body.availability_status === undefined ? { availability_status: 'available' } : {}),
    ...(body.is_active === undefined ? { is_active: false } : {}),
  };
}

function normalizeUpdates(body) {
  const updates = { ...body };
  if (updates.currency) updates.currency = updates.currency.trim().toUpperCase();
  return updates;
}

export async function createService(req, res) {
  if (handleValidationErrors(req, res)) return;
  try {
    const service = await createProviderService(req.user.id, normalizeServiceInput(req.body));
    return res.status(201).json({
      success: true,
      message: 'Service created successfully.',
      service,
    });
  } catch (error) {
    return sendError(res, error, 'create service');
  }
}

export async function getMyServices(req, res) {
  try {
    const services = await listProviderServices(req.user.id);
    return res.status(200).json({ success: true, services });
  } catch (error) {
    return sendError(res, error, 'retrieve services');
  }
}

export async function getActiveCategories(req, res) {
  try {
    const categories = await listActiveCategories();
    return res.status(200).json({ success: true, categories });
  } catch (error) {
    return sendError(res, error, 'retrieve categories');
  }
}

export async function getPublicServices(req, res) {
  if (handleValidationErrors(req, res)) return;

  const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const district = typeof req.query.district === 'string' ? req.query.district.trim() : undefined;
  const minPrice = typeof req.query.minPrice === 'string' ? req.query.minPrice : undefined;
  const maxPrice = typeof req.query.maxPrice === 'string' ? req.query.maxPrice : undefined;
  const page = typeof req.query.page === 'string' ? Number(req.query.page) : 1;
  const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 20;

  if (minPrice !== undefined && maxPrice !== undefined && Number(minPrice) > Number(maxPrice)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: [{ field: 'minPrice', message: 'Minimum price cannot exceed maximum price.' }],
    });
  }

  try {
    const result = await listPublicServices({
      search,
      category,
      district,
      minPrice,
      maxPrice,
      page,
      limit,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error, 'retrieve public services');
  }
}

export async function getPublicServiceDetails(req, res) {
  if (handleValidationErrors(req, res)) return;
  try {
    const service = await getPublicService(String(req.params.serviceId));
    return res.status(200).json({ success: true, service });
  } catch (error) {
    return sendError(res, error, 'retrieve public service');
  }
}

export async function getMyService(req, res) {
  if (handleValidationErrors(req, res)) return;
  try {
    const service = await getProviderService(req.user.id, String(req.params.serviceId));
    return res.status(200).json({ success: true, service });
  } catch (error) {
    return sendError(res, error, 'retrieve service');
  }
}

export async function updateMyService(req, res) {
  if (handleValidationErrors(req, res)) return;
  try {
    const service = await updateProviderService(
      req.user.id,
      String(req.params.serviceId),
      normalizeUpdates(req.body),
    );
    return res.status(200).json({ success: true, message: 'Service updated successfully.', service });
  } catch (error) {
    return sendError(res, error, 'update service');
  }
}

export async function updateMyServiceStatus(req, res) {
  if (handleValidationErrors(req, res)) return;
  try {
    const isActive = req.body.status === 'active';
    const service = await setProviderServiceActive(
      req.user.id,
      String(req.params.serviceId),
      isActive,
    );
    return res.status(200).json({
      success: true,
      message: `Service ${isActive ? 'activated' : 'deactivated'} successfully.`,
      service,
    });
  } catch (error) {
    return sendError(res, error, 'update service status');
  }
}

export async function deleteMyService(req, res) {
  if (handleValidationErrors(req, res)) return;
  try {
    await deleteProviderService(req.user.id, String(req.params.serviceId));
    return res.status(200).json({ success: true, message: 'Service deleted successfully.' });
  } catch (error) {
    return sendError(res, error, 'delete service');
  }
}

export { isValidPrice, createFields, updateFields, validateAllowedFields };
