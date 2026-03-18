/**
 * Stock Routes
 * services/stock/src/routes/stockRoutes.js
 */

import express from "express";
import {
    addStockEntry,
    removeStockExit,
    getProductStockLevel,
    getStockMovements,
    getLowStockAlerts,
    getStockSummary,
} from "../controllers/stockController.js";
import { authMiddleware } from "../../../shared/middlewares/authMiddleware.js";
import { getAllCircuitBreakerStats } from "../../../shared/utils/circuitBreaker.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";
import { validateRequest } from "../middlewares/validationMiddleware.js";
import { stockEntrySchema, stockExitSchema } from "../validations/stockValidation.js";

const router = express.Router();

// ─── Health ───────────────────────────────────────────────────────────────────

router.get("/health", (req, res) => {
    res.json({
        status: "UP",
        service: "stock-service",
        timestamp: new Date().toISOString(),
        port: process.env.PORT || 5003,
    });
});

router.get(
    "/health/circuit-breakers",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        const stats = getAllCircuitBreakerStats();
        const anyOpen = Object.values(stats).some((s) => s.state === "OPEN");
        const anyHalf = Object.values(stats).some((s) => s.state === "HALF_OPEN");

        res.json({
            success: true,
            status: anyOpen ? "DEGRADED" : anyHalf ? "RECOVERING" : "HEALTHY",
            circuitBreakers: stats,
            timestamp: new Date().toISOString(),
        });
    }
);

// ─── Stock Operations ─────────────────────────────────────────────────────────

router.post(
    "/entry",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    validateRequest(stockEntrySchema),
    addStockEntry
);

router.post(
    "/exit",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    validateRequest(stockExitSchema),
    removeStockExit
);

router.get(
    "/product/:id",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    getProductStockLevel
);

router.get(
    "/movements",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    getStockMovements
);

router.get(
    "/alerts",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    getLowStockAlerts
);

router.get(
    "/summary",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    getStockSummary
);

export default router;