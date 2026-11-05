import { findUserTokenVersion } from '../models/userModel.js';
import { verifyToken } from '../utils/jwt.js';

const VALID_ROLES = new Set(['customer', 'provider', 'admin']);

function isValidUserId(id) {
  if (typeof id === 'number') return Number.isSafeInteger(id) && id > 0;
  return typeof id === 'string' && /^[1-9]\d*$/.test(id);
}

/**
 * authenticate
 *
 * Reads the Bearer token from the Authorization header, verifies it,
 * and attaches { id, role } to req.user so downstream handlers know
 * who is making the request.
 *
 * Rejects with 401 if the token is missing, malformed, or expired.
 */
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    console.error('[auth] JWT verification failed:', {
      name: err?.name || 'Error',
      message: err?.message || 'Unknown verification error',
    });
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }

  if (
    !decoded
    || !isValidUserId(decoded.id)
    || !VALID_ROLES.has(decoded.role)
    || !Number.isSafeInteger(decoded.token_version)
    || decoded.token_version < 0
  ) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please sign in again.',
    });
  }

  try {
    const currentTokenVersion = await findUserTokenVersion(decoded.id);
    if (currentTokenVersion === null || decoded.token_version !== currentTokenVersion) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token. Please sign in again.',
      });
    }

    // Attach only what downstream handlers need — never the full payload.
    req.user = { id: decoded.id, role: decoded.role };
    return next();
  } catch (error) {
    console.error('[auth] Token version lookup failed:', error.code || 'database error');
    return res.status(500).json({
      success: false,
      message: 'Unable to verify your session. Please try again later.',
    });
  }
}

/**
 * authorise(...roles)
 *
 * Factory that returns a middleware restricting access to specific roles.
 * Must be used AFTER authenticate.
 *
 * Example:
 *   router.get('/admin-only', authenticate, authorise('admin'), handler)
 */
export function authorise(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource.',
      });
    }
    next();
  };
}
