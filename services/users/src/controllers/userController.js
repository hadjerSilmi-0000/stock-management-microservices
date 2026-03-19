import userService from "../services/userService.js";
import Session from "../models/sessionModel.js";
import User, { USER_STATUS } from "../models/userModel.js";
import { JWTManager } from "../config/jwt.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/errors.js";
import { sendSuccess, sendError, buildPagination } from "../../../shared/utils/sendResponse.js";
import { parsePaginationParams } from "../utils/pagination.js";

// ─── Token Verification ───────────────────────────────────────────────────────
export const verifyToken = asyncHandler(async (req, res) => {
    return sendSuccess(res, 200, {
        valid: true,
        user: {
            id: req.user._id,
            username: req.user.username,
            email: req.user.email,
            role: req.user.role,
            status: req.user.status,
            emailVerified: req.user.emailVerified,
        },
    });
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const getCurrentUser = asyncHandler(async (req, res) => {
    const token = req.cookies?.accessToken;
    if (!token) return sendError(res, 401, "No token provided", "UNAUTHORIZED");
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.userId).select("username email role status");
    if (!user) return sendError(res, 404, "User not found", "USER_NOT_FOUND");
    return sendSuccess(res, 200, { id: user._id, username: user.username, email: user.email, role: user.role, status: user.status });
});

export const register = async (req, res, next) => {
    try {
        const { username, email, password, role } = req.body;
        const { userId, verificationToken } = await userService.createUser({ username, email, password, role });
        await userService.sendVerificationEmail(email, username, verificationToken);
        return sendSuccess(res, 201, { userId }, "User registered. Please verify your email.");
    } catch (err) { next(err); }
};

// ── LOGIN — returns both tokens in body so frontend can store them ─────────────
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const ipAddress = req.clientIP || req.ip;
        const userAgent = req.headers["user-agent"];

        const user = await userService.findUserByEmail(email);
        if (!user) return sendError(res, 401, "Invalid credentials", "INVALID_CREDENTIALS");

        const { locked, minutesRemaining } = userService.isAccountLocked(user);
        if (locked) return sendError(res, 403, `Account locked. Try again in ${minutesRemaining} minutes.`, "ACCOUNT_LOCKED");

        const validPassword = await userService.validatePassword(password, user.password);
        if (!validPassword) {
            await userService.handleFailedLogin(user._id, user.loginAttempts || 0, ipAddress);
            return sendError(res, 401, "Invalid credentials", "INVALID_CREDENTIALS");
        }

        await userService.resetFailedLoginAttempts(user._id, ipAddress);
        const { accessToken, refreshToken } = await userService.generateAndStoreTokens(user, { ipAddress, userAgent });

        // Set httpOnly cookies (for browser requests on same domain)
        userService.setAuthCookies(res, accessToken, refreshToken);

        // Also return BOTH tokens in body so frontend can store them
        // (needed when frontend and API run on different ports in dev)
        return sendSuccess(res, 200, {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            accessToken,
            refreshToken,
        }, "Login successful");
    } catch (err) { next(err); }
};

// ── REFRESH TOKEN — accepts token from cookie OR request body ─────────────────
export const refreshToken = async (req, res, next) => {
    try {
        // Accept refreshToken from cookie (same-domain) or body (cross-port dev)
        const refreshTokenCookie = req.cookies.refreshToken || req.body?.refreshToken;
        if (!refreshTokenCookie) return sendError(res, 401, "No refresh token provided", "UNAUTHORIZED");

        const { valid, decoded } = await userService.validateRefreshToken(refreshTokenCookie);
        if (!valid) return sendError(res, 403, "Invalid refresh token", "INVALID_TOKEN");

        const session = await Session.findActiveSession(refreshTokenCookie);
        if (!session) return sendError(res, 403, "Session not found", "INVALID_TOKEN");

        const { token: newAccess } = JWTManager.generateAccessToken({ userId: decoded.userId, role: decoded.role });
        const { token: newRefresh } = JWTManager.generateRefreshToken({ userId: decoded.userId });

        await session.refreshSession(newAccess, newRefresh);
        userService.setAuthCookies(res, newAccess, newRefresh);

        // Return both tokens in body so frontend can update localStorage
        return sendSuccess(res, 200, { accessToken: newAccess, refreshToken: newRefresh });
    } catch (err) { next(err); }
};

export const verifyEmail = async (req, res, next) => {
    try {
        const token = req.params.token || req.query.token;
        const { email } = await userService.verifyEmailToken(token);
        return sendSuccess(res, 200, { email }, "Email verified");
    } catch (err) { next(err); }
};

export const resendVerification = async (req, res, next) => {
    try {
        const { email } = req.body;
        await userService.resendVerificationEmail(email);
        return sendSuccess(res, 200, null, "Verification email resent");
    } catch (err) { next(err); }
};

export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return sendError(res, 404, "User not found", "USER_NOT_FOUND");
        const token = await userService.createPasswordResetToken(user._id);
        await userService.sendPasswordResetEmail(email, user.username, token);
        return sendSuccess(res, 200, null, "Password reset email sent");
    } catch (err) { next(err); }
};

export const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;
        const record = await userService.validatePasswordResetToken(token);
        await userService.updatePassword(record.userId, password);
        return sendSuccess(res, 200, null, "Password updated successfully");
    } catch (err) { next(err); }
};

export const logout = async (req, res, next) => {
    try {
        const userId = req.user?._id;
        const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken || req.headers["x-refresh-token"];

        if (refreshToken) {
            if (userId) {
                await Session.revokeSession(userId, refreshToken).catch(() => { });
            } else {
                const session = await Session.findOne({ refreshToken });
                if (session) await Session.findByIdAndDelete(session._id);
            }
        }

        const cookieOpts = { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" };
        res.clearCookie("accessToken", cookieOpts);
        res.clearCookie("refreshToken", cookieOpts);

        return sendSuccess(res, 200, null, "Logged out successfully");
    } catch (err) { next(err); }
};

// ─── Profile ──────────────────────────────────────────────────────────────────
export const getProfile = asyncHandler(async (req, res) => {
    return sendSuccess(res, 200, req.user);
});

export const updateProfile = asyncHandler(async (req, res) => {
    const allowed = ["username", "email"];
    const updates = {};
    for (let key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select("-password");
    if (!user) return sendError(res, 404, "User not found", "USER_NOT_FOUND");
    return sendSuccess(res, 200, user, "Profile updated");
});

export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id).select("+password");
        const valid = await userService.validatePassword(currentPassword, user.password);
        if (!valid) return sendError(res, 400, "Current password incorrect", "INVALID_CREDENTIALS");
        await userService.updatePassword(user._id, newPassword);
        return sendSuccess(res, 200, null, "Password changed successfully");
    } catch (err) { next(err); }
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const getAllUsers = async (req, res, next) => {
    try {
        const { page, limit, skip } = parsePaginationParams(req.query);
        const [users, total] = await Promise.all([
            User.find().select("-password -passwordResetToken -passwordResetExpires").sort({ createdAt: -1 }).skip(skip).limit(limit),
            User.countDocuments(),
        ]);
        return sendSuccess(res, 200, users, null, buildPagination(page, limit, total));
    } catch (err) { next(err); }
};

export const getUserById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select("-password -passwordResetToken -passwordResetExpires");
        if (!user) return sendError(res, 404, "User not found", "USER_NOT_FOUND");
        return sendSuccess(res, 200, user);
    } catch (err) { next(err); }
};

export const updateUser = async (req, res, next) => {
    try {
        const allowedUpdates = ["username", "email", "role", "status", "emailVerified"];
        const updates = {};
        for (let key of allowedUpdates) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }
        if (req.body.password) return sendError(res, 400, "Use change-password endpoint", "INVALID_INPUT");
        const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select("-password -passwordResetToken -passwordResetExpires");
        if (!user) return sendError(res, 404, "User not found", "USER_NOT_FOUND");
        return sendSuccess(res, 200, user, "User updated");
    } catch (err) { next(err); }
};

export const deleteUser = async (req, res, next) => {
    try {
        if (req.params.id === req.user._id.toString()) return sendError(res, 400, "Cannot delete your own account", "INVALID_INPUT");
        const user = await User.findByIdAndUpdate(req.params.id, { status: USER_STATUS.INACTIVE }, { new: true }).select("-password");
        await Session.deleteManyByUser(req.params.id);
        if (!user) return sendError(res, 404, "User not found", "USER_NOT_FOUND");
        return sendSuccess(res, 200, user, "User deactivated successfully");
    } catch (err) { next(err); }
};