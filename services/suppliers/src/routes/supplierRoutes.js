// services/suppliers/src/routes/supplierRoutes.js
import express from "express";
import {
    createSupplier,
    getAllSuppliers,
    getSupplierById,
    updateSupplier,
    deleteSupplier,
    searchSuppliers,
    getActiveSuppliers,
} from "../controllers/supplierController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";
import { validateRequest } from "../middlewares/validationMiddleware.js";
import { createSupplierSchema, updateSupplierSchema } from "../validations/supplierValidation.js";

const router = express.Router();

router.get("/health", (req, res) => {
    res.json({
        status: "UP",
        service: "suppliers-service",
        timestamp: new Date().toISOString(),
        port: process.env.PORT || 5004,
    });
});

router.get(
    "/search",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    searchSuppliers
);

router.get(
    "/active",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    getActiveSuppliers
);

router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    validateRequest(createSupplierSchema),
    createSupplier
);

router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    getAllSuppliers
);

router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    getSupplierById
);

router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    validateRequest(updateSupplierSchema),
    updateSupplier
);

router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    deleteSupplier
);

export default router;