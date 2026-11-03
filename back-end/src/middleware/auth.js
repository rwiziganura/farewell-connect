import { verifyToken } from '../utils/jwt.js';

/**
 * authenticate
 *
 * Reads the Bearer token from the Authorization header, verifies it,
 * and attaches { id, role } to req.user so downstream handlers know
 * who is making the request.
 *
 * Rejects with 401 if the token is missing, malformed, or expired.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    // Attach only what downstream handlers need — never the full payload
    req.user = { id: decoded.id, role: decoded.role };
    next();
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
