# StockFlow — Local Development Setup

## Prerequisites

- Node.js 18+
- MongoDB running locally (or MongoDB Atlas URI)
- RabbitMQ (optional — services degrade gracefully without it)

---

## 1. Generate secrets

Run this once to get values for all the secret fields:

```bash
node -e "
const crypto = require('crypto');
console.log('JWT secrets (use one per field):');
for (let i = 0; i < 4; i++) console.log(crypto.randomBytes(64).toString('hex'));
console.log('\nService API keys (use one per service):');
for (let i = 0; i < 4; i++) console.log(crypto.randomBytes(32).toString('hex'));
"
```

---

## 2. Copy and fill .env files

Each service has a `.env.example`. Copy it to `.env` and fill in your values:

```bash
cp services/users/.env.example      services/users/.env
cp services/products/.env.example   services/products/.env
cp services/stock/.env.example      services/stock/.env
cp services/suppliers/.env.example  services/suppliers/.env
cp services/gateway/.env.example    services/gateway/.env
cp frontend/.env.example            frontend/.env.local
```

### Key rules

| Field | Rule |
|-------|------|
| `JWT_ACCESS_SECRET` | **Same value** in all 4 services — they all verify the same tokens |
| `*_SERVICE_KEY` | **Same values** in all 4 services — used for inter-service auth |
| `MONGO_URI` | **Different database name** per service (`users_db`, `products_db`, etc.) |
| `SMTP_*` | Use [Mailtrap](https://mailtrap.io) in dev — free, catches all emails |

---

## 3. Start services

```bash
# Terminal 1 — Users service
cd services/users && npm install && npm run dev

# Terminal 2 — Products service
cd services/products && npm install && npm run dev

# Terminal 3 — Stock service
cd services/stock && npm install && npm run dev

# Terminal 4 — Suppliers service
cd services/suppliers && npm install && npm run dev

# Terminal 5 — API Gateway
cd services/gateway && npm install && npm run dev

# Terminal 6 — Frontend
cd frontend && npm install && npm start
```

Open [http://localhost:3000](http://localhost:3000)

---

## 4. Seed demo data (optional)

Login credentials are set when you register. To get started quickly,
register an admin account at `/register` then verify via the Mailtrap inbox.

---

## 5. Health checks

| Service | URL |
|---------|-----|
| Gateway | http://localhost:5000/health |
| Users | http://localhost:5001/api/v1/users/health |
| Products | http://localhost:5002/api/v1/products/health |
| Stock | http://localhost:5003/api/v1/stock/health |
| Suppliers | http://localhost:5004/api/v1/suppliers/health |