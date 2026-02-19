import { getCircuitBreaker } from '../utils/circuitBreaker.js';

const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || "http://localhost:5001";

const usersBreaker = getCircuitBreaker('users-service', {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    volumeThreshold: 3,
}, () => {
    throw new Error('Authentication service unavailable');
});

export const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken ||
            req.headers.authorization?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No access token provided"
            });
        }

        const response = await usersBreaker.execute({
            method: 'GET',
            url: `${USERS_SERVICE_URL}/api/v1/users/verify-token`,
            headers: { Cookie: `accessToken=${token}` }
        });

        if (!response.success) {
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }

        req.user = response.user;
        next();
    } catch (error) {
        if (error.message.includes('unavailable')) {
            return res.status(503).json({
                success: false,
                message: "Authentication service temporarily unavailable"
            });
        }

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};