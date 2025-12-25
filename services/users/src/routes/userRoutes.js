import express from "express";
import {
    register,
    login,
    verifyEmail,
    forgotPassword,
    resetPassword,
    refreshToken,
    logout,
    getProfile,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser
} from "../controllers/userController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";
import { loginLimiter } from "../middlewares/rateLimit.js";
import { validateRequest } from "../middlewares/validationMiddleware.js";
import {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    updateUserSchema
} from "../validations/userValidation.js";

const router = express.Router();

// ==================== MICROSERVICE HEALTH CHECK ====================
router.get("/health", (req, res) => {
    res.json({
        status: "UP",
        service: "users-service",
        timestamp: new Date().toISOString(),
        port: process.env.PORT || 5001
    });
});

// ==================== PUBLIC ROUTES (with validation) ====================
router.post("/register",
    loginLimiter,
    validateRequest(registerSchema),
    register
);

router.post("/login",
    loginLimiter,
    validateRequest(loginSchema),
    login
);

router.get("/verify-email/:token", verifyEmail);

router.post("/forgot-password",
    validateRequest(forgotPasswordSchema),
    forgotPassword
);

router.post("/reset-password",
    validateRequest(resetPasswordSchema),
    resetPassword
);

router.post("/refresh-token", refreshToken);

// ==================== TOKEN VERIFICATION (for other microservices) ====================
router.get("/verify-token", authMiddleware, (req, res) => {
    res.json({
        success: true,
        valid: true,
        user: {
            id: req.user._id,
            username: req.user.username,
            email: req.user.email,
            role: req.user.role,
            status: req.user.status,
            emailVerified: req.user.emailVerified
        }
    });
});

// ==================== PROTECTED ROUTES - ALL AUTHENTICATED USERS ====================
router.post("/logout", authMiddleware, logout);
router.get("/profile", authMiddleware, getProfile);

// ==================== ADMIN ONLY ROUTES - USER MANAGEMENT ====================
router.get("/",
    authMiddleware,
    roleMiddleware("admin"),
    getAllUsers
);

router.get("/:id",
    authMiddleware,
    roleMiddleware("admin"),
    getUserById
);

router.put("/:id",
    authMiddleware,
    roleMiddleware("admin"),
    validateRequest(updateUserSchema),
    updateUser
);

router.delete("/:id",
    authMiddleware,
    roleMiddleware("admin"),
    deleteUser
);

// ==================== ADMIN DASHBOARD (example endpoint) ====================
router.get("/admin/dashboard",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        res.json({
            success: true,
            message: "Welcome to Admin Dashboard!",
            user: {
                id: req.user._id,
                username: req.user.username,
                role: req.user.role
            }
        });
    }
);

export default router;