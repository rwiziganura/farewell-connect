import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

process.env.JWT_SECRET = 'customer-data-tests-only';

const [{ default: app }, { default: pool }, { signToken }] = await Promise.all([
  import('../src/app.js'),
  import('../src/config/database.js'),
  import('../src/utils/jwt.js'),
]);

const users = new Map();
users.set(50, {
  id: 50,
  role: 'provider',
  account_status: 'active',
  token_version: 0,
});
const customerProfiles = new Set();
const providers = new Map([
  ['50', {
    id: '50',
    user_id: 50,
    business_name: 'Verified Provider',
    business_description: 'Support for local families.',
    business_address: 'Kigali',
    business_phone: null,
    business_email: null,
    district: 'Gasabo',
    sector: null,
    verification_status: 'verified',
    average_rating: '4.8',
    total_reviews: 5,
    user_status: 'active',
  }],
]);
const services = new Map([
  ['75', {
    id: '75',
    provider_id: '50',
    service_name: 'Memorial service',
    description: 'A verified memorial service.',
    price: '125000.00',
    currency: 'RWF',
    availability_status: 'available',
    location: 'Kigali',
    district: 'Gasabo',
    business_name: 'Verified Provider',
  }],
]);
const favorites = new Set();
const bookings = new Map();
let nextUserId = 10;
let nextBookingId = 1;

function favoriteKey(customerId, providerId) {
  return `${customerId}:${providerId}`;
}

function bookingSummary(booking) {
  const service = services.get(booking.service_id);
  return {
    id: booking.id,
    booking_reference: booking.booking_reference,
    customer_id: String(booking.customer_id),
    booking_date: booking.booking_date,
    customer_message: booking.customer_message,
    agreed_price: booking.agreed_price,
    currency: booking.currency,
    status: booking.status,
    service_address: booking.service_address,
    district: booking.district,
    service_id: booking.service_id,
    service_name: service.service_name,
    service_location: service.location,
    provider_id: booking.provider_id,
    business_name: service.business_name,
    created_at: '2026-11-05 10:00:00',
  };
}

pool.query = async (sql, values = []) => {
  const statement = sql.replace(/\s+/g, ' ').trim();
  if (statement === 'SELECT * FROM users WHERE email = ? LIMIT 1') {
    return [[[...users.values()].find((user) => user.email === values[0])].filter(Boolean), []];
  }
  if (statement === 'SELECT * FROM users WHERE phone = ? LIMIT 1') {
    return [[[...users.values()].find((user) => user.phone === values[0])].filter(Boolean), []];
  }
  if (statement.startsWith('INSERT INTO users (full_name, email, phone, password_hash, role)')) {
    const [full_name, email, phone, password_hash, role] = values;
    const id = nextUserId++;
    users.set(id, {
      id,
      full_name,
      email,
      phone,
      password_hash,
      role,
      username: null,
      account_status: 'active',
      token_version: 0,
    });
    return [{ insertId: id }, []];
  }
  if (statement === 'INSERT INTO customer_profiles (user_id) VALUES (?)') {
    customerProfiles.add(Number(values[0]));
    return [{ affectedRows: 1 }, []];
  }
  throw new Error(`Unexpected SQL in customer data test: ${statement}`);
};

pool.execute = async (sql, values = []) => {
  const statement = sql.replace(/\s+/g, ' ').trim();
  if (statement === 'SELECT token_version FROM users WHERE id = ? LIMIT 1') {
    const user = users.get(Number(values[0]));
    return [[user ? { token_version: user.token_version } : undefined].filter(Boolean), []];
  }
  if (statement.includes('FROM favorites f')) {
    const customerId = Number(values[0]);
    const rows = [...favorites]
      .filter((key) => key.startsWith(`${customerId}:`))
      .map((key) => providers.get(key.split(':')[1]))
      .filter((provider) => provider && provider.verification_status === 'verified'
        && users.get(provider.user_id)?.account_status === 'active')
      .map((provider) => ({
        id: provider.id,
        business_name: provider.business_name,
        business_description: provider.business_description,
        business_address: provider.business_address,
        district: provider.district,
        sector: provider.sector,
        average_rating: provider.average_rating,
        total_reviews: provider.total_reviews,
      }));
    return [rows, []];
  }
  if (statement.startsWith('SELECT pp.id FROM provider_profiles pp')) {
    const provider = providers.get(String(values[0]));
    const user = provider && users.get(provider.user_id);
    return [[provider && user?.account_status === 'active'
      && provider.verification_status === 'verified' ? { id: provider.id } : undefined].filter(Boolean), []];
  }
  if (statement.startsWith('INSERT INTO favorites (customer_id, provider_id)')) {
    favorites.add(favoriteKey(Number(values[0]), String(values[1])));
    return [{ affectedRows: 1 }, []];
  }
  if (statement === 'DELETE FROM favorites WHERE customer_id = ? AND provider_id = ?') {
    const removed = favorites.delete(favoriteKey(Number(values[0]), String(values[1])));
    return [{ affectedRows: removed ? 1 : 0 }, []];
  }
  if (statement.includes('FROM bookings b') && statement.includes('WHERE b.customer_id = ?')) {
    return [[...bookings.values()]
      .filter((booking) => booking.customer_id === Number(values[0]))
      .map(bookingSummary), []];
  }
  if (statement.includes('FROM bookings b') && statement.includes('WHERE b.id = ? AND b.customer_id = ?')) {
    const booking = bookings.get(String(values[0]));
    return [[booking && booking.customer_id === Number(values[1]) ? bookingSummary(booking) : undefined].filter(Boolean), []];
  }
  if (statement.startsWith('SELECT CAST(s.id AS CHAR) AS id, s.service_name')) {
    return [[...services.values()]
      .filter((service) => service.provider_id === String(values[0]))
      .map((service) => ({
        id: service.id,
        service_name: service.service_name,
        description: service.description,
        price: service.price,
        currency: service.currency,
        pricing_type: 'fixed',
        availability_status: service.availability_status,
        location: service.location,
        district: service.district,
        category_id: '1',
        category_name: 'Memorial Services',
        provider_id: service.provider_id,
        business_name: service.business_name,
        provider_rating: '4.8',
        provider_review_count: '5',
      })), []];
  }
  if (statement.includes('FROM provider_profiles pp') && statement.includes('WHERE pp.id = ?')) {
    const provider = providers.get(String(values[0]));
    const user = provider && users.get(provider.user_id);
    return [[provider && user?.account_status === 'active'
      && provider.verification_status === 'verified'
      ? {
        id: provider.id,
        business_name: provider.business_name,
        business_description: provider.business_description,
        business_phone: provider.business_phone,
        business_email: provider.business_email,
        business_address: provider.business_address,
        district: provider.district,
        sector: provider.sector,
        verification_status: provider.verification_status,
        average_rating: provider.average_rating,
        total_reviews: provider.total_reviews,
      }
      : undefined].filter(Boolean), []];
  }
  throw new Error(`Unexpected SQL in customer data test: ${statement}`);
};

pool.getConnection = async () => ({
  beginTransaction: async () => {},
  commit: async () => {},
  rollback: async () => {},
  release: () => {},
  execute: async (sql, values = []) => {
    const statement = sql.replace(/\s+/g, ' ').trim();
    if (statement.startsWith('SELECT s.id, s.provider_id, s.service_name')) {
      const service = services.get(String(values[0]));
      return [[service ? {
        id: service.id,
        provider_id: service.provider_id,
        service_name: service.service_name,
        price: service.price,
        currency: service.currency,
        availability_status: service.availability_status,
        is_active: 1,
        verification_status: 'verified',
      } : undefined].filter(Boolean), []];
    }
    if (statement.startsWith('INSERT INTO bookings')) {
      const [booking_reference, customer_id, provider_id, service_id, booking_date,
        customer_message, service_address, district, agreed_price, currency] = values;
      const id = String(nextBookingId++);
      bookings.set(id, {
        id,
        booking_reference,
        customer_id: Number(customer_id),
        provider_id: String(provider_id),
        service_id: String(service_id),
        booking_date,
        customer_message,
        service_address,
        district,
        agreed_price,
        currency,
        status: 'pending',
      });
      return [{ insertId: Number(id) }, []];
    }
    if (statement.startsWith('INSERT INTO booking_status_history')) return [{ affectedRows: 1 }, []];
    if (statement.startsWith('SELECT CAST(b.id AS CHAR) AS id, b.booking_reference')) {
      const booking = bookings.get(String(values[0]));
      return [[booking ? bookingSummary(booking) : undefined].filter(Boolean), []];
    }
    throw new Error(`Unexpected transaction SQL in customer data test: ${statement}`);
  },
});

const server = app.listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

async function request(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${baseUrl}${path}`, { ...options, headers });
}

async function registerCustomer(fullName, email) {
  const response = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: fullName,
      email,
      password: 'TestPassword123',
    }),
  });
  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.equal(payload.user.role, 'customer');
  assert.equal('password_hash' in payload.user, false);
  return { id: payload.user.id, token: payload.token };
}

test('new customers see only their own favorites and bookings; save, remove, and detail routes are customer-scoped', async () => {
  const firstCustomer = await registerCustomer('New Customer One', 'new-customer-one@example.test');
  const secondCustomer = await registerCustomer('New Customer Two', 'new-customer-two@example.test');
  assert.equal(customerProfiles.has(firstCustomer.id), true);
  assert.equal(customerProfiles.has(secondCustomer.id), true);

  const firstInitialFavorites = await request('/api/favorites/me', { token: firstCustomer.token });
  assert.deepEqual((await firstInitialFavorites.json()).favorites, []);
  const firstInitialBookings = await request('/api/bookings/my', { token: firstCustomer.token });
  assert.deepEqual((await firstInitialBookings.json()).bookings, []);

  const spoofedFavorite = await request('/api/favorites', {
    token: firstCustomer.token,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider_id: '50', customer_id: secondCustomer.id }),
  });
  assert.equal(spoofedFavorite.status, 422);

  const savedProvider = await request('/api/favorites', {
    token: firstCustomer.token,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider_id: '50' }),
  });
  assert.equal(savedProvider.status, 201);
  const savedFavorites = await request('/api/favorites/me', { token: firstCustomer.token });
  assert.equal((await savedFavorites.json()).favorites[0].id, '50');
  const otherFavorites = await request('/api/favorites/me', { token: secondCustomer.token });
  assert.deepEqual((await otherFavorites.json()).favorites, []);
  const otherCustomerRemoval = await request('/api/favorites/50', {
    token: secondCustomer.token,
    method: 'DELETE',
  });
  assert.equal(otherCustomerRemoval.status, 200);
  assert.equal((await (await request('/api/favorites/me', { token: firstCustomer.token })).json()).favorites[0].id, '50');

  const providerPageData = await request('/api/providers/50');
  assert.equal(providerPageData.status, 200);
  assert.equal((await providerPageData.json()).provider.id, '50');

  const removedProvider = await request('/api/favorites/50', {
    token: firstCustomer.token,
    method: 'DELETE',
  });
  assert.equal(removedProvider.status, 200);
  assert.deepEqual((await (await request('/api/favorites/me', { token: firstCustomer.token })).json()).favorites, []);

  const bookingDate = new Date(Date.now() + 86_400_000).toISOString();
  const createdBooking = await request('/api/bookings', {
    token: firstCustomer.token,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: '75',
      booking_date: bookingDate,
      customer_id: secondCustomer.id,
      customer_message: 'Please contact me about this service.',
    }),
  });
  assert.equal(createdBooking.status, 201);
  const createdBookingPayload = await createdBooking.json();
  assert.equal(createdBookingPayload.booking.customer_id, String(firstCustomer.id));
  assert.equal('password_hash' in createdBookingPayload.booking, false);

  const firstBookings = await request('/api/bookings/my', { token: firstCustomer.token });
  const firstBookingsPayload = await firstBookings.json();
  assert.equal(firstBookingsPayload.bookings.length, 1);
  assert.equal(firstBookingsPayload.bookings[0].service_id, '75');
  const secondBookings = await request('/api/bookings/my', { token: secondCustomer.token });
  assert.deepEqual((await secondBookings.json()).bookings, []);

  const ownerBooking = await request(`/api/bookings/${createdBookingPayload.booking.id}`, { token: firstCustomer.token });
  assert.equal(ownerBooking.status, 200);
  assert.equal((await ownerBooking.json()).booking.service_name, 'Memorial service');
  const otherCustomerBooking = await request(`/api/bookings/${createdBookingPayload.booking.id}`, { token: secondCustomer.token });
  assert.equal(otherCustomerBooking.status, 404);
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});
