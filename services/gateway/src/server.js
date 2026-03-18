/**
 * API Gateway
 * Single entry point for the frontend.
 * Handles: CORS, authentication forwarding, rate limiting, reverse proxy.
 *
 * services/gateway/src/server.js
 *
 * Install deps:  npm install express http-proxy-middleware cors cookie-parser
 *                express-rate-limit dotenv morgan
 */

import express       from "express";
import cors          from "cors";
import cookieParser  from "cookie-parser";
import dotenv        from "dotenv";
import path          from "path";
import { fileURLToPath } from "url";
import { createProxyMiddleware } from "http-proxy-middleware";
import rateLimit     from "express-rate-limit";
import morgan        from "morgan";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(cors({
    origin: (origin, callback) => {
        const allowed = [
            FRONTEND_URL,
            "http://localhost:3000",
            "http://localhost:5173",
        ].filter(Boolean);

        if (!origin || allowed.includes(origin)) return callback(null, true);
        callback(new Error("Not allowed by CORS"));
    },
    credentials:    true,
    methods:        ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Request-ID"],
}));

// ─── Base Middleware ──────────────────────────────────────────────────────────
app.use(cookieParser());
app.use(morgan("dev"));

// ─── Global Rate Limiter ──────────────────────────────────────────────────────
app.use(rateLimit({
    windowMs:         15 * 60 * 1000, // 15 min
    max:              300,
    standardHeaders:  true,
    legacyHeaders:    false,
    message: {
        success: false,
        error:   { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests, please try again later." },
    },
}));

// ─── Stricter limiter for auth routes ─────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs:         15 * 60 * 1000,
    max:              10,
    standardHeaders:  true,
    legacyHeaders:    false,
    message: {
        success: false,
        error:   { code: "RATE_LIMIT_EXCEEDED", message: "Too many auth attempts, please try again in 15 minutes." },
    },
});

// ─── Service URLs (from env) ──────────────────────────────────────────────────
const USERS_URL     = process.env.USERS_SERVICE_URL     || "http://localhost:5001";
const PRODUCTS_URL  = process.env.PRODUCTS_SERVICE_URL  || "http://localhost:5002";
const STOCK_URL     = process.env.STOCK_SERVICE_URL     || "http://localhost:5003";
const SUPPLIERS_URL = process.env.SUPPLIERS_SERVICE_URL || "http://localhost:5004";

// ─── Proxy factory ────────────────────────────────────────────────────────────
const proxy = (target, pathRewrite = {}) =>
    createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite,
        on: {
            error: (err, req, res) => {
                console.error(`[Gateway] Proxy error → ${target}: ${err.message}`);
                res.status(502).json({
                    success: false,
                    error: {
                        code:      "BAD_GATEWAY",
                        message:   "Upstream service unavailable",
                        timestamp: new Date().toISOString(),
                    },
                });
            },
        },
    });

// ─── Routes ───────────────────────────────────────────────────────────────────

// Auth routes get stricter rate limiting
app.use("/api/v1/users/login",    authLimiter);
app.use("/api/v1/users/register", authLimiter);

// Proxy to each microservice — path is preserved 1:1
app.use("/api/v1/users",     proxy(USERS_URL));
app.use("/api/v1/products",  proxy(PRODUCTS_URL));
app.use("/api/v1/stock",     proxy(STOCK_URL));
app.use("/api/v1/suppliers", proxy(SUPPLIERS_URL));

// ─── Gateway Health ───────────────────────────────────────────────────────────
app.get("/health", async (req, res) => {
    const services = [
        { name: "users-service",     url: `${USERS_URL}/api/v1/users/health` },
        { name: "products-service",  url: `${PRODUCTS_URL}/api/v1/products/health` },
        { name: "stock-service",     url: `${STOCK_URL}/api/v1/stock/health` },
        { name: "suppliers-service", url: `${SUPPLIERS_URL}/api/v1/suppliers/health` },
    ];

    const results = await Promise.allSettled(
        services.map(async ({ name, url }) => {
            try {
                const controller = new AbortController();
                const timeout    = setTimeout(() => controller.abort(), 3000);
                const response   = await fetch(url, { signal: controller.signal });
                clearTimeout(timeout);
                return { name, status: response.ok ? "UP" : "DOWN" };
            } catch {
                return { name, status: "DOWN" };
            }
        })
    );

    const statuses  = results.map((r) => r.value);
    const allUp     = statuses.every((s) => s.status === "UP");
    const anyDown   = statuses.some((s)  => s.status === "DOWN");

    res.status(allUp ? 200 : 207).json({
        success:   true,
        data: {
            gateway:  "UP",
            status:   allUp ? "HEALTHY" : anyDown ? "DEGRADED" : "PARTIAL",
            services: statuses,
        },
        timestamp: new Date().toISOString(),
    });
});

// ─── 404 fallback ─────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error:   { code: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found` },
    });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`API Gateway running on http://localhost:${PORT}`);
    console.log(`  → Users:     ${USERS_URL}`);
    console.log(`  → Products:  ${PRODUCTS_URL}`);
    console.log(`  → Stock:     ${STOCK_URL}`);
    console.log(`  → Suppliers: ${SUPPLIERS_URL}`);
    console.log(`Health: http://localhost:${PORT}/health`);
});
