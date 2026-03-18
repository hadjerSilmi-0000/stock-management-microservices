# Backend Fixes — Setup & Integration Guide

## What's included in this patch

| File | Type | Purpose |
|------|------|---------|
| `services/shared/utils/sendResponse.js` | NEW | Standardized response helper |
| `services/users/src/app.js` | NEW | App factory (separates Express from server.listen) |
| `services/products/src/app.js` | NEW | App factory |
| `services/stock/src/app.js` | NEW | App factory |
| `services/suppliers/src/app.js` | NEW | App factory |
| `services/users/src/controllers/userController.js` | UPDATED | Standardized envelopes |
| `services/users/src/routes/userRoutes.js` | UPDATED | Uses exported verifyToken handler |
| `services/products/src/controllers/productController.js` | UPDATED | Standardized envelopes |
| `services/stock/src/controllers/stockController.js` | UPDATED | Standardized envelopes |
| `services/suppliers/src/controllers/supplierController.js` | UPDATED | Standardized envelopes |
| `services/gateway/src/server.js` | NEW | API Gateway |
| `services/gateway/.env` | NEW | Gateway environment config |
| `services/gateway/package.json` | NEW | Gateway dependencies |
| `jest.config.js` | NEW | Copy to each service root |
| `services/users/src/__tests__/users.test.js` | NEW | Users tests |
| `services/products/src/__tests__/products.test.js` | NEW | Products tests |
| `services/stock/src/__tests__/stock.test.js` | NEW | Stock tests |
| `services/suppliers/src/__tests__/suppliers.test.js` | NEW | Suppliers tests |

---

## Step 1 — Copy files into your project

Copy each file from this patch to its matching path in your project.

---

## Step 2 — Update server.js files to use app factories

Each service's `server.js` currently creates the Express app inline.
You need to refactor it to import from `app.js` instead.

### Pattern (same for all 4 services)

**Before** — `services/users/src/server.js` had all middleware inline.

**After** — replace the Express setup block with:

```js
// At the top of server.js, replace the app setup block with:
import createApp from "./app.js";
const app = createApp();
```

Remove these lines from server.js (they now live in app.js):
```js
// DELETE these from server.js — app.js handles them now:
app.use(cors(...))
app.use(requestIdMiddleware)
app.use(extractClientIP)
app.use(requestLogger)
app.use(performanceMonitor)
app.use(express.json())
app.use(cookieParser())
app.use("/api-docs", ...)
app.use("/api/v1/...", routes)
app.get("/", ...)
app.use(errorHandler)
```

Keep in server.js: MongoDB connect, RabbitMQ setup, Consul register, graceful shutdown, app.listen().

---

## Step 3 — Install test dependencies (in each service folder)

```bash
# Run this in each of the 4 service directories
cd services/users
npm install --save-dev jest supertest mongodb-memory-server

cd ../products
npm install --save-dev jest supertest mongodb-memory-server

cd ../stock
npm install --save-dev jest supertest mongodb-memory-server

cd ../suppliers
npm install --save-dev jest supertest mongodb-memory-server
```

---

## Step 4 — Add jest config and scripts to each service's package.json

Copy `jest.config.js` (from this patch) to each service root:
```
services/users/jest.config.js
services/products/jest.config.js
services/stock/jest.config.js
services/suppliers/jest.config.js
```

Add these scripts to each service's `package.json`:
```json
"scripts": {
  "test":          "node --experimental-vm-modules node_modules/.bin/jest",
  "test:watch":    "node --experimental-vm-modules node_modules/.bin/jest --watch",
  "test:coverage": "node --experimental-vm-modules node_modules/.bin/jest --coverage"
}
```

---

## Step 5 — Install and start the API Gateway

```bash
cd services/gateway
npm install
npm run dev
```

The gateway starts on **port 5000**.
Your frontend should point ALL requests to `http://localhost:5000` instead of individual service ports.

### Gateway routes

| Frontend calls | Gateway forwards to |
|----------------|---------------------|
| `POST /api/v1/users/login` | users-service :5001 |
| `GET /api/v1/products` | products-service :5002 |
| `POST /api/v1/stock/entry` | stock-service :5003 |
| `GET /api/v1/suppliers` | suppliers-service :5004 |

### Gateway health check
```
GET http://localhost:5000/health
```
Returns status of all 4 upstream services.

---

## Step 6 — Run the tests

```bash
# From each service directory:
cd services/users    && npm test
cd services/products && npm test
cd services/stock    && npm test
cd services/suppliers && npm test
```

Expected output: all green, ~8–10 tests per service.

---

## Step 7 — Update your frontend base URL

```js
// Before (calling services directly):
const USERS_API    = "http://localhost:5001/api/v1/users";
const PRODUCTS_API = "http://localhost:5002/api/v1/products";

// After (everything through the gateway):
const API_BASE = "http://localhost:5000/api/v1";
// Then: ${API_BASE}/users, ${API_BASE}/products, etc.
```

---

## Standard response envelope (what the frontend receives)

### Success — single item
```json
{
  "success": true,
  "data": { "_id": "...", "name": "...", "..." : "..." },
  "message": "Optional human note"
}
```

### Success — list
```json
{
  "success": true,
  "data": [ {...}, {...} ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Success — mutation with no body (delete, logout)
```json
{
  "success": true,
  "data": null,
  "message": "Deleted successfully"
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product not found",
    "timestamp": "2026-01-17T22:00:00.000Z",
    "details": [...]
  }
}
```

---

## Startup order (development)

```bash
# 1. Start infrastructure
mongod                          # MongoDB
rabbitmq-server                 # RabbitMQ
consul agent -dev               # Consul

# 2. Start microservices (each in a separate terminal)
cd services/users     && npm run dev   # :5001
cd services/products  && npm run dev   # :5002
cd services/stock     && npm run dev   # :5003
cd services/suppliers && npm run dev   # :5004

# 3. Start gateway
cd services/gateway   && npm run dev   # :5000

# 4. Start frontend
# Point it at http://localhost:5000
```
