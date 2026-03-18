import express from "express";
import {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    searchProducts,
} from "../controllers/productController.js";
import { authMiddleware } from "../../../shared/middlewares/authMiddleware.js";
import { validateObjectId } from "../../../shared/middlewares/validateObjectId.js";
import { createOperationLimiter } from "../../../shared/middlewares/rateLimit.js";
import { createHealthCheck } from "../../../shared/utils/healthCheck.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";
import { validateRequest } from "../middlewares/validationMiddleware.js";
import { createProductSchema, updateProductSchema } from "../validations/productValidation.js";
import { paginationMiddleware } from "../utils/pagination.js";

const router = express.Router();

router.get("/health", async (req, res) => {
    const health = await createHealthCheck("products-service", null);
    const statusCode = health.status === "UP" ? 200 : 503;
    res.status(statusCode).json(health);
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
    createOperationLimiter,
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
    validateObjectId('id'),
    getProductById
);

router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    validateRequest(updateProductSchema),
    validateObjectId('id'),
    updateProduct
);

router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    validateObjectId('id'),
    deleteProduct
);

export default router;