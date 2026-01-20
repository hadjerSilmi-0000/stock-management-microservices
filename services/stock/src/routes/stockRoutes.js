// services/stock/src/routes/stockRoutes.js
import express from "express";
import {
    addStockEntry,
    removeStockExit,
    getProductStockLevel,
    getStockMovements,
    getLowStockAlerts,
    getStockSummary,
} from "../controllers/stockController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";
import { validateRequest } from "../middlewares/validationMiddleware.js";
import { stockEntrySchema, stockExitSchema } from "../validations/stockValidation.js";

const router = express.Router();

router.get("/health", (req, res) => {
    res.json({
        status: "UP",
        service: "stock-service",
        timestamp: new Date().toISOString(),
        port: process.env.PORT || 5003,
    });
});

// Add stock entry
router.post(
    "/entry",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    validateRequest(stockEntrySchema),
    addStockEntry
);

// Remove stock (exit)
router.post(
    "/exit",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    validateRequest(stockExitSchema),
    removeStockExit
);

// Get stock level for a specific product
router.get(
    "/product/:id",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    getProductStockLevel
);

// Get stock movement history
router.get(
    "/movements",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    getStockMovements
);

// Get low stock alerts
router.get(
    "/alerts",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    getLowStockAlerts
);

// Get stock summary/statistics
router.get(
    "/summary",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    getStockSummary
);

export default router;