import test from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.RUN_TIDB_INTEGRATION_TESTS === '1'
  && /^[1-9]\d*$/.test(process.env.TIDB_AUTH_TEST_USER_ID || '');

test('TiDB-backed authentication accepts the current token version and rejects a stale one', {
  skip: !enabled
    ? 'Set RUN_TIDB_INTEGRATION_TESTS=1 and TIDB_AUTH_TEST_USER_ID after applying the token-version migration.'
    : false,
}, async () => {
  const [{ default: app }, { default: pool }, { signToken }] = await Promise.all([
    import('../src/app.js'),
    import('../src/config/database.js'),
    import('../src/utils/jwt.js'),
  ]);
  const userId = process.env.TIDB_AUTH_TEST_USER_ID;
  const [rows] = await pool.execute(
    'SELECT id, role, token_version FROM users WHERE id = ? LIMIT 1',
    [userId],
  );
  assert.equal(rows.length, 1, 'The configured test user must exist.');

  const user = rows[0];
  const version = Number(user.token_version);
  assert.ok(Number.isSafeInteger(version) && version >= 0);

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const requestWithVersion = (tokenVersion) => fetch(`${baseUrl}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${signToken({
          id: user.id,
          role: user.role,
          token_version: tokenVersion,
        })}`,
      },
    });

    assert.equal((await requestWithVersion(version)).status, 200);
    assert.equal((await requestWithVersion(version === 0 ? 1 : version - 1)).status, 401);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await pool.end();
  }
});
