import bcrypt from "bcrypt";
import { JWTManager } from "../config/jwt.js";
import { sendEmail } from "../utils/mail.js";
import User, { USER_STATUS } from "../models/userModel.js";
import Session from "../models/sessionModel.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5", 10);
const LOCKOUT_DURATION = parseInt(process.env.LOCKOUT_DURATION || "30", 10);

const userService = {
    //  Create new user
    async createUser({ username, email, password, role = "manager" }) {
        const user = await User.create({
            username,
            email,
            password,
            role,
            emailVerified: false,
        });

        const { token: verificationToken } = JWTManager.generateEmailToken({
            userId: user._id,
            email: user.email,
        });

        return { userId: user._id, verificationToken };
    },

    //  Email verification
    async sendVerificationEmail(email, username, token) {
        const verifyLink = `${FRONTEND_URL}/verify-email?token=${token}`;
        await sendEmail({
            to: email,
            subject: "Verify your Stock Management account",
            html: `<p>Hello ${username},</p>
             <p>Please verify your email by clicking the link below:</p>
             <a href="${verifyLink}" target="_blank">${verifyLink}</a>
             <p>This link expires in 24 hours.</p>`,
        });
    },

    async verifyEmailToken(token) {
        const { valid, decoded } = JWTManager.verifyEmailToken(token);
        if (!valid) throw new Error("Invalid or expired verification token");

        const user = await User.findById(decoded.userId);
        if (!user) throw new Error("User not found");

        user.emailVerified = true;
        user.status = USER_STATUS.ACTIVE;
        await user.save();

        return { email: user.email };
    },

    async resendVerificationEmail(email) {
        const user = await User.findOne({ email });
        if (!user) throw new Error("User not found");
        if (user.emailVerified) throw new Error("Email already verified");

        const { token } = JWTManager.generateEmailToken({ userId: user._id, email: user.email });
        await this.sendVerificationEmail(email, user.username, token);
    },

    //  Login helpers
    async findUserByEmail(email) {
        return User.findOne({ email }).select("+password");
    },

    async validatePassword(password, hashed) {
        return bcrypt.compare(password, hashed);
    },

    isAccountLocked(user) {
        const lockUntil = user.lockUntil;
        if (lockUntil && lockUntil > Date.now()) {
            const minutesRemaining = Math.ceil((lockUntil - Date.now()) / 60000);
            return { locked: true, minutesRemaining };
        }
        return { locked: false };
    },

    async handleFailedLogin(userId, attempts = 0) {
        const newAttempts = attempts + 1;
        const update = { loginAttempts: newAttempts };

        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
            update.lockUntil = new Date(Date.now() + LOCKOUT_DURATION * 60000);
        }

        await User.findByIdAndUpdate(userId, update);
    },

    async resetFailedLoginAttempts(userId) {
        await User.findByIdAndUpdate(userId, { loginAttempts: 0, lockUntil: null });
    },

    //  Tokens & sessions
    async generateAndStoreTokens(user) {
        const { token: accessToken } = JWTManager.generateAccessToken({
            userId: user._id,
            role: user.role,
        });
        const { token: refreshToken } = JWTManager.generateRefreshToken({ userId: user._id });

        await Session.createSession({
            userId: user._id,
            accessToken,
            refreshToken,
        });

        return { accessToken, refreshToken };
    },

    async validateRefreshToken(refreshToken) {
        return JWTManager.verifyRefreshToken(refreshToken);
    },

    setAuthCookies(res, accessToken, refreshToken) {
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production",
            maxAge: 15 * 60 * 1000,
        });
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
    },

    clearAuthCookies(res) {
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
    },

    //  Password reset
    async createPasswordResetToken(userId) {
        const { token } = JWTManager.generatePasswordResetToken({ userId });
        const user = await User.findById(userId);
        user.passwordResetToken = token;
        user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
        await user.save();
        return token;
    },

    async sendPasswordResetEmail(email, username, token) {
        const resetLink = `${FRONTEND_URL}/reset-password/${token}`;
        await sendEmail({
            to: email,
            subject: "Reset your password",
            html: `<p>Hi ${username},</p>
             <p>Click below to reset your password:</p>
             <a href="${resetLink}" target="_blank">${resetLink}</a>
             <p>This link expires in 1 hour.</p>`,
        });
    },

    async validatePasswordResetToken(token) {
        const { valid, decoded } = JWTManager.verifyPasswordResetToken(token);
        if (!valid) throw new Error("Invalid or expired reset token");
        const user = await User.findById(decoded.userId);
        if (!user || user.passwordResetExpires < Date.now())
            throw new Error("Reset token expired");
        return { userId: user._id };
    },

    async updatePassword(userId, newPassword) {
        const user = await User.findById(userId).select('+password');

        if (!user) {
            throw new Error('User not found');
        }
        user.password = newPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
    },
};

export default userService;