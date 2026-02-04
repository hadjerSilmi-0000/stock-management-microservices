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
import { paginationMiddleware } from "../utils/pagination.js";

const router = express.Router();

router.get("/health", (req, res) => {
    res.json({
        status: "UP",
        service: "products-service",
        timestamp: new Date().toISOString(),
        port: process.env.PORT || 5002,
    });
});

router.get(
    "/search",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    paginationMiddleware,
    searchProducts
);

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
    paginationMiddleware,
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
    roleMiddleware("admin"),
    deleteProduct
);

export default router;