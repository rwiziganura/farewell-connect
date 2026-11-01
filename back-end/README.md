# Farewell Connect — Backend API

A REST API for the Farewell Connect funeral-services marketplace, built with Node.js, Express, and TiDB Cloud (MySQL-compatible).

## Requirements

- Node.js >= 18
- A TiDB Cloud account (or any MySQL-compatible database)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the example environment file and fill in your values:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` with your TiDB Cloud credentials and JWT secret.

## Running the server

Development (auto-restarts on file changes):
```bash
npm run dev
```

Production:
```bash
npm start
```

## Testing the health check

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Farewell Connect API is running",
  "environment": "development",
  "timestamp": "..."
}
```

## Project structure

```
src/
  config/       → Database connection
  controllers/  → Route handler logic
  middleware/   → Auth, error handling, validation
  models/       → Database query functions
  routes/       → Express route definitions
  services/     → Business logic
  utils/        → Helper functions
  app.js        → Express app setup
  server.js     → Server entry point
```
