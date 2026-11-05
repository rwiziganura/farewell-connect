import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

process.env.JWT_SECRET = 'user-account-tests-only';

const [{ default: app }, { default: pool }, { signToken }] = await Promise.all([
  import('../src/app.js'),
  import('../src/config/database.js'),
  import('../src/utils/jwt.js'),
]);

const oldPassword = 'OldPassword123';
const newPassword = 'NewSecurePassword456';
const initialPasswordHash = await bcrypt.hash(oldPassword, 4);
const users = new Map([
  [1, { id: 1, username: 'customer_one', full_name: 'Customer One', email: 'customer@example.test', phone: '+250780000001', role: 'customer', account_status: 'active', token_version: 0, password_hash: initialPasswordHash }],
  [2, { id: 2, username: 'provider_one', full_name: 'Provider One', email: 'provider@example.test', phone: '+250780000002', role: 'provider', account_status: 'active', token_version: 0, password_hash: initialPasswordHash }],
  [3, { id: 3, username: 'admin_one', full_name: 'Admin One', email: 'admin@example.test', phone: '+250780000003', role: 'admin', account_status: 'active', token_version: 0, password_hash: initialPasswordHash }],
  [4, { id: 4, username: 'taken_name', full_name: 'Other User', email: 'other@example.test', phone: null, role: 'customer', account_status: 'active', token_version: 0, password_hash: initialPasswordHash }],
]);
const providerProfiles = new Map([[2, { business_name: 'Separate Provider Business' }]]);

pool.execute = async (sql, values = []) => {
  const statement = sql.replace(/\s+/g, ' ').trim();
  if (statement === 'SELECT token_version FROM users WHERE id = ? LIMIT 1') {
    const user = users.get(Number(values[0]));
    return [[user ? { token_version: user.token_version } : undefined].filter(Boolean), []];
  }
  if (statement === 'SELECT * FROM users WHERE username = ? LIMIT 1') {
    const user = [...users.values()].find((candidate) => (
      candidate.username?.toLowerCase() === String(values[0]).toLowerCase()
    ));
    return [[user], []];
  }
  if (statement.startsWith('SELECT id, username, full_name, email, phone, role FROM users WHERE id = ?')) {
    const user = users.get(Number(values[0]));
    return [[user ? {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    } : undefined].filter(Boolean), []];
  }
  if (statement.startsWith('SELECT id FROM users WHERE username = ? AND id <> ?')) {
    const user = [...users.values()].find((candidate) => (
      candidate.username?.toLowerCase() === String(values[0]).toLowerCase()
      && candidate.id !== Number(values[1])
    ));
    return [[user ? { id: user.id } : undefined].filter(Boolean), []];
  }
  if (statement.startsWith('UPDATE users SET username = ?, full_name = ? WHERE id = ?')) {
    const user = users.get(Number(values[2]));
    if (!user) return [{ affectedRows: 0 }, []];
    if ([...users.values()].some((candidate) => (
      candidate.id !== user.id
      && candidate.username?.toLowerCase() === String(values[0]).toLowerCase()
    ))) {
      const error = new Error('Duplicate username');
      error.code = 'ER_DUP_ENTRY';
      throw error;
    }
    user.username = values[0];
    user.full_name = values[1];
    return [{ affectedRows: 1 }, []];
  }
  if (statement.startsWith('SELECT id, password_hash FROM users WHERE id = ?')) {
    const user = users.get(Number(values[0]));
    return [[user ? { id: user.id, password_hash: user.password_hash } : undefined].filter(Boolean), []];
  }
  if (statement.startsWith('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ? AND password_hash = ?')) {
    const user = users.get(Number(values[1]));
    if (!user || user.password_hash !== values[2]) return [{ affectedRows: 0 }, []];
    user.password_hash = values[0];
    user.token_version += 1;
    return [{ affectedRows: 1 }, []];
  }
  throw new Error(`Unexpected SQL in account test: ${statement}`);
};

pool.query = async (sql, values = []) => {
  const statement = sql.replace(/\s+/g, ' ').trim();
  if (statement === 'SELECT * FROM users WHERE email = ? LIMIT 1') {
    const user = [...users.values()].find((candidate) => candidate.email === values[0]);
    return [[user], []];
  }
  if (statement === 'SELECT * FROM users WHERE phone = ? LIMIT 1') {
    const user = [...users.values()].find((candidate) => candidate.phone === values[0]);
    return [[user], []];
  }
  if (
    statement.startsWith('SELECT u.id, u.username, u.full_name, u.email, u.phone, u.role, u.account_status')
    || statement.startsWith('SELECT id, username, full_name, email, phone, role, account_status,')
  ) {
    const user = users.get(Number(values[0]));
    return [[user ? {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      account_status: user.account_status,
    } : undefined].filter(Boolean), []];
  }
  throw new Error(`Unexpected SQL in account test: ${statement}`);
};

const server = app.listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

async function request(path, { userId, ...options } = {}) {
  const headers = new Headers(options.headers);
  if (userId) {
    const user = users.get(userId);
    headers.set('Authorization', `Bearer ${signToken({
      id: userId,
      role: user.role,
      token_version: user.token_version,
    })}`);
  }
  return fetch(`${baseUrl}${path}`, { ...options, headers });
}

async function requestWithToken(path, token, options = {}) {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${baseUrl}${path}`, { ...options, headers });
}

test('legacy tokens without a token version require a new login', async () => {
  const legacyToken = signToken({ id: 1, role: 'customer' });
  assert.equal((await requestWithToken('/api/users/me', legacyToken)).status, 401);
});

test('login preserves account details for every role and identifier and restores them from the session', async () => {
  for (const [userId, role] of [[1, 'customer'], [2, 'provider'], [3, 'admin']]) {
    const user = users.get(userId);
    for (const identifier of [user.email, user.phone, user.username]) {
      const response = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: oldPassword }),
      });
      assert.equal(response.status, 200);
      const payload = await response.json();
      assert.equal(payload.user.username, user.username);
      assert.equal(payload.user.full_name, user.full_name);
      assert.equal(payload.user.role, role);
      assert.equal('password_hash' in payload.user, false);

      const restoredResponse = await requestWithToken('/api/auth/me', payload.token);
      assert.equal(restoredResponse.status, 200);
      const restoredPayload = await restoredResponse.json();
      assert.equal(restoredPayload.user.username, user.username);
      assert.equal(restoredPayload.user.full_name, user.full_name);
      assert.equal(restoredPayload.user.role, role);
      assert.equal('password_hash' in restoredPayload.user, false);
    }
  }
});

test('authenticated roles can update only their own username and personal name', async () => {
  for (const [userId, role] of [[1, 'customer'], [2, 'provider'], [3, 'admin']]) {
    const response = await request('/api/users/me', {
      userId,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: ` new_${role} `, full_name: ` Updated ${role} ` }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.user.username, `new_${role}`);
    assert.equal(payload.user.full_name, `Updated ${role}`);
    assert.equal('password_hash' in payload.user, false);
  }

  const account = await request('/api/users/me', { userId: 1 });
  assert.equal(account.status, 200);
  const accountPayload = await account.json();
  assert.equal(accountPayload.user.username, 'new_customer');
  assert.equal('password_hash' in accountPayload.user, false);

  assert.equal(users.get(4).username, 'taken_name');
  assert.deepEqual(providerProfiles.get(2), { business_name: 'Separate Provider Business' });
});

test('account reads and profile writes require authentication and reject privileged fields', async () => {
  assert.equal((await request('/api/users/me')).status, 401);
  assert.equal((await request('/api/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'new_user', full_name: 'Someone' }),
  })).status, 401);
  assert.equal((await request('/api/users/me/password', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      current_password: oldPassword,
      new_password: newPassword,
      confirm_password: newPassword,
    }),
  })).status, 401);

  const otherUserBefore = { ...users.get(4) };
  const response = await request('/api/users/me', {
    userId: 1,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'attempted_admin',
      full_name: 'Customer One',
      id: 4,
      role: 'admin',
      account_status: 'active',
    }),
  });
  assert.equal(response.status, 422);
  assert.equal(users.get(1).role, 'customer');
  assert.equal(users.get(1).account_status, 'active');
  assert.deepEqual(users.get(4), otherUserBefore);
});

test('duplicate usernames are rejected without changing the user', async () => {
  const before = { ...users.get(1) };
  const response = await request('/api/users/me', {
    userId: 1,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'TAKEN_NAME', full_name: 'Customer One' }),
  });
  assert.equal(response.status, 409);
  assert.equal(users.get(1).username, before.username);
  assert.equal(users.get(1).full_name, before.full_name);
});

test('password change validates current password, confirmation and strength, and updates login credentials', async () => {
  const oldToken = signToken({ id: 1, role: 'customer', token_version: 0 });
  const otherDeviceToken = signToken({
    id: 1,
    role: 'customer',
    token_version: 0,
    jti: 'second-device-session',
  });

  const badCurrent = await request('/api/users/me/password', {
    userId: 1,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      current_password: 'IncorrectPassword123',
      new_password: newPassword,
      confirm_password: newPassword,
    }),
  });
  assert.equal(badCurrent.status, 401);

  const mismatch = await request('/api/users/me/password', {
    userId: 1,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      current_password: oldPassword,
      new_password: newPassword,
      confirm_password: 'DifferentPassword456',
    }),
  });
  assert.equal(mismatch.status, 422);

  const weak = await request('/api/users/me/password', {
    userId: 1,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      current_password: oldPassword,
      new_password: 'weak',
      confirm_password: 'weak',
    }),
  });
  assert.equal(weak.status, 422);

  const changed = await request('/api/users/me/password', {
    userId: 1,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      current_password: oldPassword,
      new_password: newPassword,
      confirm_password: newPassword,
    }),
  });
  assert.equal(changed.status, 200);
  const changedPayload = await changed.json();
  assert.equal('password_hash' in changedPayload, false);
  assert.equal('token' in changedPayload, false);
  assert.equal(users.get(1).token_version, 1);
  assert.equal((await bcrypt.compare(oldPassword, users.get(1).password_hash)), false);
  assert.equal((await bcrypt.compare(newPassword, users.get(1).password_hash)), true);
  assert.equal((await requestWithToken('/api/users/me', oldToken)).status, 401);
  assert.equal((await requestWithToken('/api/users/me', otherDeviceToken)).status, 401);

  const oldLogin = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'customer@example.test', password: oldPassword }),
  });
  assert.equal(oldLogin.status, 401);

  const newLogin = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'customer@example.test', password: newPassword }),
  });
  assert.equal(newLogin.status, 200);
  const emailLoginPayload = await newLogin.json();
  assert.equal((await requestWithToken('/api/users/me', emailLoginPayload.token)).status, 200);

  const usernameLogin = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'new_customer', password: newPassword }),
  });
  assert.equal(usernameLogin.status, 200);
  const usernameLoginPayload = await usernameLogin.json();
  assert.equal((await requestWithToken('/api/users/me', usernameLoginPayload.token)).status, 200);
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});
