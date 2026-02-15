import userService from "../services/userService.js";
import Session from "../models/sessionModel.js";
import User, { USER_STATUS } from "../models/userModel.js";
import { JWTManager } from "../config/jwt.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/errors.js";

// Get current user (via access token)
export const getCurrentUser = async (req, res) => {
    try {
        const token = req.cookies?.accessToken;
        if (!token) {
            return res.status(401).json({ success: false, message: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        const user = await User.findById(decoded.userId).select("username email role status");

        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                status: user.status,
            },
        });
    } catch (error) {
        res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};

// Register new user
export const register = async (req, res, next) => {
    try {
        const { username, email, password, role } = req.body;

        const { userId, verificationToken } = await userService.createUser({
            username,
            email,
            password,
            role,
        });

        await userService.sendVerificationEmail(email, username, verificationToken);

        res.status(201).json({
            success: true,
            message: "User registered. Please verify your email.",
            userId,
        });
    } catch (err) {
        next(err);
    }
};

// Login
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const ipAddress = req.clientIP || req.ip;
        const userAgent = req.headers["user-agent"];

        const user = await userService.findUserByEmail(email);
        if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

        const { locked, minutesRemaining } = userService.isAccountLocked(user);
        if (locked)
            return res
                .status(403)
                .json({ success: false, message: `Account locked. Try again in ${minutesRemaining} minutes.` });

        const validPassword = await userService.validatePassword(password, user.password);
        if (!validPassword) {
            await userService.handleFailedLogin(user._id, user.loginAttempts || 0, ipAddress);
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        await userService.resetFailedLoginAttempts(user._id, ipAddress);
        const { accessToken, refreshToken } = await userService.generateAndStoreTokens(user, {
            ipAddress,
            userAgent,
        });

        userService.setAuthCookies(res, accessToken, refreshToken);

        res.json({
            success: true,
            message: "Login successful",
            user: { id: user._id, username: user.username, email: user.email, role: user.role },
        });
    } catch (err) {
        next(err);
    }
};

// Refresh Token
export const refreshToken = async (req, res, next) => {
    try {
        const refreshTokenCookie = req.cookies.refreshToken;
        if (!refreshTokenCookie)
            return res.status(401).json({ success: false, message: "No refresh token provided" });

        const { valid, decoded } = await userService.validateRefreshToken(refreshTokenCookie);
        if (!valid) return res.status(403).json({ success: false, message: "Invalid refresh token" });

        const session = await Session.findActiveSession(refreshTokenCookie);
        if (!session) return res.status(403).json({ success: false, message: "Session not found" });

        const { token: newAccess } = JWTManager.generateAccessToken({
            userId: decoded.userId,
            role: decoded.role,
        });
        const { token: newRefresh } = JWTManager.generateRefreshToken({ userId: decoded.userId });

        await session.refreshSession(newAccess, newRefresh);
        userService.setAuthCookies(res, newAccess, newRefresh);

        res.json({ success: true, accessToken: newAccess });
    } catch (err) {
        next(err);
    }
};

// Verify email
export const verifyEmail = async (req, res, next) => {
    try {
        const token = req.params.token || req.query.token;
        const { email } = await userService.verifyEmailToken(token);
        res.json({ success: true, message: "Email verified", email });
    } catch (err) {
        next(err);
    }
};

// Resend verification
export const resendVerification = async (req, res, next) => {
    try {
        const { email } = req.body;
        await userService.resendVerificationEmail(email);
        res.json({ success: true, message: "Verification email resent" });
    } catch (err) {
        next(err);
    }
};

// Forgot password
export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const token = await userService.createPasswordResetToken(user._id);
        await userService.sendPasswordResetEmail(email, user.username, token);

        res.json({ success: true, message: "Password reset email sent" });
    } catch (err) {
        next(err);
    }
};

// Reset password
export const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;
        const record = await userService.validatePasswordResetToken(token);
        await userService.updatePassword(record.userId, password);
        res.json({ success: true, message: "Password updated successfully" });
    } catch (err) {
        next(err);
    }
};

// Get profile (protected) - SIMPLE, can use asyncHandler
export const getProfile = asyncHandler(async (req, res) => {
    res.json({ success: true, user: req.user });
});

// Update profile - SIMPLE, can use asyncHandler
export const updateProfile = asyncHandler(async (req, res) => {
    const allowed = ["username", "email"];
    const updates = {};

    for (let key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
        new: true,
        runValidators: true,
    }).select("-password");

    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
});

// Change password
export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id).select("+password");

        const valid = await userService.validatePassword(currentPassword, user.password);
        if (!valid)
            return res.status(400).json({ success: false, message: "Current password incorrect" });

        await userService.updatePassword(user._id, newPassword);
        res.json({ success: true, message: "Password changed successfully" });
    } catch (err) {
        next(err);
    }
};

// Logout
export const logout = async (req, res, next) => {
    try {
        const userId = req.user?._id;
        const refreshToken =
            req.body?.refreshToken ||
            req.cookies?.refreshToken ||
            req.headers["x-refresh-token"];

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: "Refresh token required",
            });
        }

        if (!userId) {
            const session = await Session.findOne({ refreshToken });
            if (session) {
                await Session.findByIdAndDelete(session._id);
            }
        } else {
            await Session.revokeSession(userId, refreshToken);
        }

        res.clearCookie("accessToken", {
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production",
        });
        res.clearCookie("refreshToken", {
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production",
        });

        return res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });
    } catch (err) {
        console.error("Logout error:", err);
        next(err);
    }
};

// ADMIN USER MANAGEMENT
// Get all users (admin only)
export const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find()
            .select('-password -passwordResetToken -passwordResetExpires')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: users.length,
            users
        });
    } catch (err) {
        next(err);
    }
};

// Get single user by ID (admin only)
export const getUserById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password -passwordResetToken -passwordResetExpires');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({ success: true, user });
    } catch (err) {
        next(err);
    }
};

// Update user (admin only)
export const updateUser = async (req, res, next) => {
    try {
        const allowedUpdates = ['username', 'email', 'role', 'status', 'emailVerified'];
        const updates = {};

        for (let key of allowedUpdates) {
            if (req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        }

        // Prevent changing password through this endpoint
        if (req.body.password) {
            return res.status(400).json({
                success: false,
                message: 'Use change-password endpoint to update password'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).select('-password -passwordResetToken -passwordResetExpires');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({ success: true, user });
    } catch (err) {
        next(err);
    }
};

// Delete user (admin only - soft delete)
export const deleteUser = async (req, res, next) => {
    try {
        // Prevent admin from deleting themselves
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }

        // Soft delete - set status to inactive
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status: USER_STATUS.INACTIVE },
            { new: true }
        ).select('-password');

        // Also revoke all sessions for this user
        await Session.deleteManyByUser(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User deactivated successfully',
            user
        });
    } catch (err) {
        next(err);
    }
};