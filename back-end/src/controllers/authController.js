import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import { signToken } from '../utils/jwt.js';
import {
  findUserByEmail,
  findUserByPhone,
  findUserById,
  createUser,
} from '../models/userModel.js';
import { createCustomerProfile, findCustomerProfileByUserId } from '../models/customerProfileModel.js';
import { createProviderProfile, findProviderProfileByUserId } from '../models/providerProfileModel.js';

const SALT_ROUNDS = 12;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Return validation errors as a 422 response.
 * Returns true if errors were found (caller should return early).
 */
function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
    return true;
  }
  return false;
}

// ─── Customer Registration ───────────────────────────────────────────────────

/**
 * POST /api/auth/register
 *
 * Creates a new customer account and a matching customer_profiles row.
 * Role is always forced to 'customer' — clients cannot choose their own role.
 */
export async function registerCustomer(req, res, next) {
  try {
    if (handleValidationErrors(req, res)) return;

    const { full_name, email, phone, password } = req.body;

    // Check for duplicate email
    if (email) {
      const existingEmail = await findUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.',
        });
      }
    }

    // Check for duplicate phone
    if (phone) {
      const existingPhone = await findUserByPhone(phone);
      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message: 'An account with this phone number already exists.',
        });
      }
    }

    // Hash the password — never store plain text
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user row with role locked to 'customer'
    const userId = await createUser({
      full_name,
      email: email || null,
      phone: phone || null,
      password_hash,
      role: 'customer',
    });

    // Create the linked customer profile
    await createCustomerProfile(userId);

    // Sign a token so the client is immediately authenticated
    const token = signToken({ id: userId, role: 'customer' });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        id: userId,
        full_name,
        email: email || null,
        phone: phone || null,
        role: 'customer',
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Provider Registration ───────────────────────────────────────────────────

/**
 * POST /api/auth/provider-register
 *
 * Creates a provider user account and a provider_profiles row.
 * verification_status is always set to 'pending' — admin must approve.
 */
export async function registerProvider(req, res, next) {
  try {
    if (handleValidationErrors(req, res)) return;

    const {
      full_name, email, phone, password,
      business_name, business_description,
      business_phone, business_email,
      business_address, district, sector,
    } = req.body;

    // Duplicate checks
    if (email) {
      const existingEmail = await findUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.',
        });
      }
    }

    if (phone) {
      const existingPhone = await findUserByPhone(phone);
      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message: 'An account with this phone number already exists.',
        });
      }
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user with role locked to 'provider'
    const userId = await createUser({
      full_name,
      email: email || null,
      phone: phone || null,
      password_hash,
      role: 'provider',
    });

    // Create provider profile — verification_status defaults to 'pending'
    await createProviderProfile({
      user_id: userId,
      business_name,
      business_description,
      business_phone,
      business_email,
      business_address,
      district,
      sector,
    });

    return res.status(201).json({
      success: true,
      message: 'Provider application submitted. Your account is pending administrator verification.',
      user: {
        id: userId,
        full_name,
        email: email || null,
        phone: phone || null,
        role: 'provider',
        verification_status: 'pending',
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Login ───────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 *
 * Accepts email or phone + password.
 * Returns a JWT and safe user data on success.
 * Uses a generic error message for both "user not found" and "wrong password"
 * to avoid leaking which accounts exist.
 */
export async function login(req, res, next) {
  try {
    if (handleValidationErrors(req, res)) return;

    const { identifier, password } = req.body;

    // Try email first, then phone
    let user = await findUserByEmail(identifier);
    if (!user) user = await findUserByPhone(identifier);

    // Generic message — do not reveal whether the account exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    // Check account status before comparing password
    if (user.account_status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.',
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    const token = signToken({ id: user.id, role: user.role });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        account_status: user.account_status,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Get Current User ────────────────────────────────────────────────────────

/**
 * GET /api/auth/me
 *
 * Returns the full profile of the authenticated user.
 * Customers get their customer_profiles data.
 * Providers get their provider_profiles data.
 * Admins get basic user data.
 */
export async function getMe(req, res, next) {
  try {
    const { id, role } = req.user;

    let profile = null;

    if (role === 'customer') {
      profile = await findCustomerProfileByUserId(id);
    } else if (role === 'provider') {
      profile = await findProviderProfileByUserId(id);
    } else {
      profile = await findUserById(id);
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      user: profile,
    });
  } catch (err) {
    next(err);
  }
}
