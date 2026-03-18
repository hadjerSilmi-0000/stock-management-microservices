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
    updateProfile,
    changePassword,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getCurrentUser,
    verifyToken,
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
    updateUserSchema,
} from "../validations/userValidation.js";

const router = express.Router();

// ─── Health ───────────────────────────────────────────────────────────────────
router.get("/health", (req, res) => {
    res.json({
        status: "UP",
        service: "users-service",
        timestamp: new Date().toISOString(),
        port: process.env.PORT || 5001,
    });
});

// ─── Public ───────────────────────────────────────────────────────────────────
router.post("/register",        loginLimiter, validateRequest(registerSchema),       register);
router.post("/login",           loginLimiter, validateRequest(loginSchema),          login);
router.get("/verify-email/:token",                                                   verifyEmail);
router.post("/forgot-password", validateRequest(forgotPasswordSchema),               forgotPassword);
router.post("/reset-password",  validateRequest(resetPasswordSchema),                resetPassword);
router.post("/refresh-token",                                                        refreshToken);

// ─── Token verification (called by other microservices via shared authMiddleware)
router.get("/verify-token", authMiddleware, verifyToken);

// ─── Protected — all authenticated users ─────────────────────────────────────
router.post("/logout",           authMiddleware, logout);
router.get("/profile",           authMiddleware, getProfile);
router.put("/profile",           authMiddleware, updateProfile);
router.put("/change-password",   authMiddleware, changePassword);
router.get("/me",                authMiddleware, getCurrentUser);

// ─── Admin dashboard ──────────────────────────────────────────────────────────
router.get(
    "/admin/dashboard",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        res.json({
            success: true,
            data: {
                message: "Welcome to Admin Dashboard!",
                user: { id: req.user._id, username: req.user.username, role: req.user.role },
            },
        });
    }
);

// ─── Admin — user management ──────────────────────────────────────────────────
router.get("/",     authMiddleware, roleMiddleware("admin"), getAllUsers);
router.get("/:id",  authMiddleware, roleMiddleware("admin"), getUserById);
router.put("/:id",  authMiddleware, roleMiddleware("admin"), validateRequest(updateUserSchema), updateUser);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deleteUser);

export default router;
