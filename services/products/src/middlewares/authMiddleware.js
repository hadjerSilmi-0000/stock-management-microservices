import axios from "axios";

const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || "http://localhost:5001";

// Middleware to verify token with Users Service
export const authMiddleware = async (req, res, next) => {
    try {
        // Get token from cookies or Authorization header
        const token = req.cookies?.accessToken || req.headers.authorization?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No access token provided",
            });
        }

        // Verify token with Users Service
        const response = await axios.get(`${USERS_SERVICE_URL}/api/users/verify-token`, {
            headers: {
                Cookie: `accessToken=${token}`,
            },
        });

        if (!response.data.success) {
            return res.status(401).json({
                success: false,
                message: "Invalid token",
            });
        }

        // Attach user to request
        req.user = response.data.user;
        next();
    } catch (error) {
        console.error("Auth middleware error:", error.message);

        // Handle different error scenarios
        if (error.response?.status === 401) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token",
            });
        }

        if (error.code === "ECONNREFUSED") {
            return res.status(503).json({
                success: false,
                message: "Authentication service unavailable",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Authentication failed",
        });
    }
};