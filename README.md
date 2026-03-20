# StockFlow

A full-stack inventory management platform built with a microservices architecture. Designed as a portfolio project demonstrating real-world backend patterns alongside a polished React frontend.

![CI](https://github.com/hadjerSilmi-0000/stock-management-microservices/actions/workflows/ci-cd.yml/badge.svg) ![React](https://img.shields.io/badge/React-18-blue) ![Node.js](https://img.shields.io/badge/Node.js-18-green) ![MongoDB](https://img.shields.io/badge/MongoDB-6-green) ![JWT](https://img.shields.io/badge/Auth-JWT-orange) ![RabbitMQ](https://img.shields.io/badge/Events-RabbitMQ-orange)
---

## What it does

StockFlow lets a warehouse team track products, manage stock levels, record movements, and get low-stock alerts — all in one dashboard.

- **Products** — CRUD catalog with categories, pricing, and supplier links
- **Stock levels** — live inventory counts per product with visual progress bars
- **Stock movements** — every entry and exit logged with reason, reference, and timestamp
- **Low-stock alerts** — automatic threshold alerts surfaced in the dashboard
- **Suppliers** — contact management with product linking
- **Users** — role-based access (admin / manager) with email verification

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              React Frontend :3000            │
└─────────────────┬───────────────────────────┘
                  │ HTTP
┌─────────────────▼───────────────────────────┐
│              API Gateway :5000               │
│         (reverse proxy + CORS)               │
└──┬──────────┬──────────┬──────────┬─────────┘
   │          │          │          │
:5001      :5002      :5003      :5004
Users    Products    Stock    Suppliers
  │          │          │          │
users_db  products_db  stock_db  suppliers_db
         (MongoDB — separate DB per service)
```

Services communicate asynchronously via **RabbitMQ** — for example, when a product is created the stock service automatically creates a matching stock level entry. The **circuit breaker** pattern (via opossum) prevents cascading failures when an upstream service is unavailable.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, custom CSS design system |
| Backend | Node.js 18, Express 5, ES Modules |
| Database | MongoDB 6 (Mongoose) — one DB per service |
| Auth | JWT (access + refresh tokens), httpOnly cookies, bcrypt |
| Messaging | RabbitMQ (topic exchange, event-driven) |
| Service discovery | Consul |
| Resilience | Circuit breaker (opossum), graceful shutdown |
| Validation | Joi |
| Testing | Jest, Supertest, MongoDB Memory Server |
| API docs | Swagger/OpenAPI on each service |

---

## Getting started

See **[SETUP.md](./SETUP.md)** for the full local dev guide including secret generation.

**Quick version:**

```bash
# 1. Copy and fill .env files
cp services/users/.env.example services/users/.env
# (repeat for products, stock, suppliers, gateway, frontend)

# 2. Start services (separate terminals)
cd services/users     && npm install && npm run dev  # :5001
cd services/products  && npm install && npm run dev  # :5002
cd services/stock     && npm install && npm run dev  # :5003
cd services/suppliers && npm install && npm run dev  # :5004
cd services/gateway   && npm install && npm run dev  # :5000

# 3. Start frontend
cd frontend && npm install && npm start              # :3000
```

---

## Project structure

```
stock-management-microservices/
├── frontend/                  # React 18 SPA
│   └── src/
│       ├── context/           # Auth, Theme, Toast
│       ├── pages/             # public/, protected/, admin/, errors/
│       ├── components/        # layout/, ui/, charts/
│       └── services/api.js    # Axios client + interceptors
│
├── services/
│   ├── gateway/               # API Gateway (http-proxy-middleware)
│   ├── users/                 # Auth, JWT, sessions, email
│   ├── products/              # Product catalog, search, categories
│   ├── stock/                 # Levels, movements, alerts, summary
│   ├── suppliers/             # Supplier CRUD + product linking
│   └── shared/                # Shared middleware, utils, events
│
├── SETUP.md                   # Local dev guide
└── docs/
    └── INTEGRATION.md         # Service integration reference
```

---

## API response format

All endpoints return a consistent envelope:

```json
{ "success": true, "data": { ... }, "message": "optional" }
{ "success": true, "data": [...], "pagination": { "page": 1, "total": 42 } }
{ "success": false, "error": { "code": "NOT_FOUND", "message": "..." } }
```

---

## Running tests

```bash
cd services/users     && npm test
cd services/products  && npm test
cd services/stock     && npm test
cd services/suppliers && npm test
```

Each service has ~8–10 integration tests using an in-memory MongoDB instance (no external dependencies required).

---

## Key design decisions

**Separate databases per service** — each microservice owns its own MongoDB database. No cross-service DB queries. Data sharing happens through API calls and events.

**Cookie-based refresh tokens** — the refresh token is stored in an `httpOnly` cookie (`sameSite: lax`) and never exposed to JavaScript. The access token (15 min TTL) is stored in `localStorage` for the `Authorization` header. This eliminates the XSS attack surface for the long-lived token.

**Client-side product enrichment** — the stock service stores `productId` references, not embedded product names. The frontend loads the product map separately and joins client-side. This avoids tight coupling between services and the circuit breaker fallback showing "Unknown" in the UI.

**Circuit breaker on inter-service calls** — if the products service goes down, the stock service continues to work using fallback data rather than returning 500 errors.
