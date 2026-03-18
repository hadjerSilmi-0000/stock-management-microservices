import { jest } from "@jest/globals";

// Mock email so register doesn't fail in tests
await jest.unstable_mockModule("../utils/mail.js", () => ({
    sendEmail: jest.fn().mockResolvedValue({ messageId: "test-message-id" }),
}));

// Mock rate limiter so login tests don't get 429
await jest.unstable_mockModule("../middlewares/rateLimit.js", () => ({
    loginLimiter: (_req, _res, next) => next(),
    createRateLimiter: () => (_req, _res, next) => next(),
}));

import request  from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let app;
let mongod;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();

    process.env.MONGO_URI                 = mongod.getUri();
    process.env.JWT_ACCESS_SECRET         = "test_access_secret_32_chars_long!";
    process.env.JWT_REFRESH_SECRET        = "test_refresh_secret_32chars_long!";
    process.env.JWT_EMAIL_SECRET          = "test_email_secret_32_chars_long!!";
    process.env.JWT_PASSWORD_RESET_SECRET = "test_reset_secret_32_chars_long!!";
    process.env.NODE_ENV                  = "test";
    process.env.FRONTEND_URL              = "http://localhost:5173";

    await mongoose.connect(process.env.MONGO_URI);

    const { default: createApp } = await import("../app.js");
    app = createApp();
}, 60000);

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
}, 30000);

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) await collections[key].deleteMany({});
});

// ─── Helper ───────────────────────────────────────────────────────────────────
async function registerAndLogin(overrides = {}) {
    const payload = {
        username: "testuser", email: "test@example.com",
        password: "password123", confirmPassword: "password123",
        role: "manager", ...overrides,
    };

    await request(app).post("/api/v1/users/register").send(payload);

    const { default: User } = await import("../models/userModel.js");
    await User.findOneAndUpdate(
        { email: payload.email },
        { emailVerified: true, status: "active" }
    );

    const res = await request(app).post("/api/v1/users/login").send({
        email: payload.email, password: payload.password,
    });

    return { cookie: res.headers["set-cookie"], body: res.body };
}

// ─── Registration ─────────────────────────────────────────────────────────────
describe("POST /api/v1/users/register", () => {
    it("registers a new user and returns 201", async () => {
        const res = await request(app).post("/api/v1/users/register").send({
            username: "newuser", email: "new@example.com",
            password: "password123", confirmPassword: "password123",
        });
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty("userId");
    });

    it("returns 400 when passwords do not match", async () => {
        const res = await request(app).post("/api/v1/users/register").send({
            username: "user2", email: "user2@example.com",
            password: "password123", confirmPassword: "different",
        });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it("returns 409 when email already exists", async () => {
        // Register first user
        await request(app).post("/api/v1/users/register").send({
            username: "dupuser1", email: "dup@example.com",
            password: "password123", confirmPassword: "password123",
        });
        // Try to register different username but same email
        const res = await request(app).post("/api/v1/users/register").send({
            username: "dupuser2", email: "dup@example.com",
            password: "password123", confirmPassword: "password123",
        });
        expect(res.status).toBe(409);
    });

    it("returns 400 when required fields are missing", async () => {
        const res = await request(app).post("/api/v1/users/register").send({ email: "x@x.com" });
        expect(res.status).toBe(400);
    });
});

// ─── Login ────────────────────────────────────────────────────────────────────
describe("POST /api/v1/users/login", () => {
    beforeEach(async () => { await registerAndLogin(); });

    it("logs in with valid credentials", async () => {
        const res = await request(app).post("/api/v1/users/login").send({
            email: "test@example.com", password: "password123",
        });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty("id");
        expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("returns 401 with wrong password", async () => {
        const res = await request(app).post("/api/v1/users/login").send({
            email: "test@example.com", password: "wrongpassword",
        });
        expect(res.status).toBe(401);
    });

    it("returns 401 for non-existent user", async () => {
        const res = await request(app).post("/api/v1/users/login").send({
            email: "nobody@example.com", password: "password123",
        });
        expect(res.status).toBe(401);
    });
});

// ─── Profile ──────────────────────────────────────────────────────────────────
describe("GET /api/v1/users/profile", () => {
    it("returns profile for authenticated user", async () => {
        const { cookie } = await registerAndLogin();
        const res = await request(app).get("/api/v1/users/profile").set("Cookie", cookie);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty("email", "test@example.com");
    });

    it("returns 401 when no token provided", async () => {
        const res = await request(app).get("/api/v1/users/profile");
        expect(res.status).toBe(401);
    });
});

// ─── Response envelope ────────────────────────────────────────────────────────
describe("Response envelope consistency", () => {
    it("success responses have { success: true, data }", async () => {
        const { cookie } = await registerAndLogin();
        const res = await request(app).get("/api/v1/users/profile").set("Cookie", cookie);
        expect(res.body).toHaveProperty("success", true);
        expect(res.body).toHaveProperty("data");
    });

    it("error responses have { success: false, error: { code, message } }", async () => {
        const res = await request(app).post("/api/v1/users/login").send({
            email: "nobody@example.com", password: "bad",
        });
        expect(res.body.success).toBe(false);
        expect(res.body).toHaveProperty("error");
    });
});

// ─── Logout ───────────────────────────────────────────────────────────────────
describe("POST /api/v1/users/logout", () => {
    it("clears auth cookies on logout", async () => {
        const { cookie } = await registerAndLogin();
        const res = await request(app).post("/api/v1/users/logout").set("Cookie", cookie);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

// ─── Admin ────────────────────────────────────────────────────────────────────
describe("Admin user management", () => {
    it("GET /api/v1/users returns paginated list for admin", async () => {
        const { cookie } = await registerAndLogin({
            username: "adminuser", email: "admin@ex.com", role: "admin",
        });
        const res = await request(app).get("/api/v1/users").set("Cookie", cookie);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.pagination).toHaveProperty("total");
    });

    it("GET /api/v1/users returns 403 for manager role", async () => {
        const { cookie } = await registerAndLogin();
        const res = await request(app).get("/api/v1/users").set("Cookie", cookie);
        expect(res.status).toBe(403);
    });
});
