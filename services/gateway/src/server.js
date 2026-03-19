// services/gateway/src/server.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createProxyMiddleware } from "http-proxy-middleware";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const USERS_URL = process.env.USERS_SERVICE_URL || "http://localhost:5001";
const PRODUCTS_URL = process.env.PRODUCTS_SERVICE_URL || "http://localhost:5002";
const STOCK_URL = process.env.STOCK_SERVICE_URL || "http://localhost:5003";
const SUPPLIERS_URL = process.env.SUPPLIERS_SERVICE_URL || "http://localhost:5004";

app.use(cors({
    origin: [FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Request-ID"],
}));

app.use(cookieParser());
app.use(morgan("dev"));

// ─── Proxy using filter function (v2 syntax) ──────────────────────────────────
// First argument is a filter — receives the full original pathname.
// This prevents Express from stripping the prefix, so the full path
// is forwarded to the upstream service unchanged.

app.use(
    createProxyMiddleware(
        (pathname) => pathname.startsWith("/api/v1/users"),
        { target: USERS_URL, changeOrigin: true }
    )
);

app.use(
    createProxyMiddleware(
        (pathname) => pathname.startsWith("/api/v1/products"),
        { target: PRODUCTS_URL, changeOrigin: true }
    )
);

app.use(
    createProxyMiddleware(
        (pathname) => pathname.startsWith("/api/v1/stock"),
        { target: STOCK_URL, changeOrigin: true }
    )
);

app.use(
    createProxyMiddleware(
        (pathname) => pathname.startsWith("/api/v1/suppliers"),
        { target: SUPPLIERS_URL, changeOrigin: true }
    )
);

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", async (req, res) => {
    const checks = [
        { name: "users-service", url: `${USERS_URL}/api/v1/users/health` },
        { name: "products-service", url: `${PRODUCTS_URL}/api/v1/products/health` },
        { name: "stock-service", url: `${STOCK_URL}/api/v1/stock/health` },
        { name: "suppliers-service", url: `${SUPPLIERS_URL}/api/v1/suppliers/health` },
    ];
    const results = await Promise.allSettled(
        checks.map(async ({ name, url }) => {
            try {
                const ctrl = new AbortController();
                const t = setTimeout(() => ctrl.abort(), 3000);
                const r = await fetch(url, { signal: ctrl.signal });
                clearTimeout(t);
                return { name, status: r.ok ? "UP" : "DOWN" };
            } catch {
                return { name, status: "DOWN" };
            }
        })
    );
    const services = results.map(r => r.value ?? { name: "unknown", status: "DOWN" });
    res.json({ success: true, data: { gateway: "UP", services } });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found` },
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n✅ API Gateway running on http://localhost:${PORT}`);
    console.log(`   → Users:     ${USERS_URL}`);
    console.log(`   → Products:  ${PRODUCTS_URL}`);
    console.log(`   → Stock:     ${STOCK_URL}`);
    console.log(`   → Suppliers: ${SUPPLIERS_URL}\n`);
});