import express from "express";
import {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    searchProducts,
} from "../controllers/productController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";
import { validateRequest } from "../middlewares/validationMiddleware.js";
import { createProductSchema, updateProductSchema } from "../validations/productValidation.js";

const router = express.Router();

// ==================== HEALTH CHECK ====================
router.get("/health", (req, res) => {
    res.json({
        status: "UP",
        service: "products-service",
        timestamp: new Date().toISOString(),
        port: process.env.PORT || 5002,
    });
});

// ==================== SEARCH ROUTE  ====================
router.get(
    "/search",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    searchProducts
);

// ==================== CRUD ROUTES ====================
router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    validateRequest(createProductSchema),
    createProduct
);

router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    getAllProducts
);

router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    getProductById
);

router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    validateRequest(updateProductSchema),
    updateProduct
);

router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"), // Admin only
    deleteProduct
);

export default router;