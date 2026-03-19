// services/shared/middlewares/authMiddleware.js
// Verifies JWT directly — no network call to users service needed.
// This is faster, more reliable, and works correctly across services.

import jwt from "jsonwebtoken";

export const authMiddleware = async (req, res, next) => {
    // Already set by test middleware
    if (req.user) return next();

    try {
        // Get token from cookie OR Authorization header
        const token =
            req.cookies?.accessToken ||
            req.headers.authorization?.replace("Bearer ", "")?.trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No access token provided",
            });
        }

        const secret = process.env.JWT_ACCESS_SECRET;
        if (!secret) {
            console.error("[authMiddleware] JWT_ACCESS_SECRET not set!");
            return res.status(500).json({
                success: false,
                message: "Server configuration error",
            });
        }

        const decoded = jwt.verify(token, secret);

        // Attach user info to request
        req.user = {
            id: decoded.userId,
            _id: decoded.userId,
            role: decoded.role,
            username: decoded.username || "",
            email: decoded.email || "",
        };

        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token expired",
                code: "TOKEN_EXPIRED",
            });
        }
        return res.status(401).json({
            success: false,
            message: "Invalid token",
        });
    }
};