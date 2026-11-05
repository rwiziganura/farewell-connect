import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import {
  findAccountUserById,
  findUserCredentialsById,
  findUserIdByUsername,
  updateUserAccount,
  updateUserPassword,
} from '../models/userModel.js';

const SALT_ROUNDS = 12;

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

function handleUnexpectedError(res, error, operation) {
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'That username is already in use.',
    });
  }
  console.error(`[users] ${operation} failed:`, error.code || 'database error');
  return res.status(500).json({
    success: false,
    message: `Unable to ${operation}. Please try again later.`,
  });
}

export async function getMyAccount(req, res) {
  try {
    const user = await findAccountUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }
    return res.status(200).json({ success: true, user });
  } catch (error) {
    return handleUnexpectedError(res, error, 'retrieve account');
  }
}

export async function updateMyAccount(req, res) {
  if (handleValidationErrors(req, res)) return;

  try {
    const username = req.body.username.trim().toLowerCase();
    const full_name = req.body.full_name.trim();
    const existing = await findUserIdByUsername(username, req.user.id);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'That username is already in use.',
        errors: [{ field: 'username', message: 'Choose a different username.' }],
      });
    }

    await updateUserAccount(req.user.id, { username, full_name });
    const user = await findAccountUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }
    return res.status(200).json({
      success: true,
      message: 'Account profile updated successfully.',
      user,
    });
  } catch (error) {
    return handleUnexpectedError(res, error, 'update account profile');
  }
}

export async function changeMyPassword(req, res) {
  if (handleValidationErrors(req, res)) return;

  try {
    const account = await findUserCredentialsById(req.user.id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    const currentMatches = await bcrypt.compare(req.body.current_password, account.password_hash);
    if (!currentMatches) {
      return res.status(401).json({
        success: false,
        message: 'The current password is incorrect.',
      });
    }

    if (await bcrypt.compare(req.body.new_password, account.password_hash)) {
      return res.status(422).json({
        success: false,
        message: 'The new password must be different from the current password.',
        errors: [{ field: 'new_password', message: 'Choose a different password.' }],
      });
    }

    const passwordHash = await bcrypt.hash(req.body.new_password, SALT_ROUNDS);
    const affectedRows = await updateUserPassword(
      req.user.id,
      account.password_hash,
      passwordHash,
    );
    if (affectedRows !== 1) {
      return res.status(409).json({
        success: false,
        message: 'The password changed during this request. Sign in again and retry.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please sign in again.',
    });
  } catch (error) {
    return handleUnexpectedError(res, error, 'change password');
  }
}
