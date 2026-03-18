import request   from "supertest";
import mongoose  from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let app;
let mongod;
const PRODUCT_ID = "507f1f77bcf86cd799439011";
const adminHeader = { "x-test-role": "admin" };

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongod.getUri();
    process.env.NODE_ENV  = "test";

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

describe("POST /api/v1/stock/entry", () => {
    it("creates a stock entry and returns 201 with { success, data }", async () => {
        const res = await request(app).post("/api/v1/stock/entry").set(adminHeader)
            .send({ productId: PRODUCT_ID, quantity: 50, reason: "Initial stock" });
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty("currentStock", 50);
        expect(res.body.data).toHaveProperty("movement");
    });

    it("returns 400 when quantity is 0", async () => {
        const res = await request(app).post("/api/v1/stock/entry").set(adminHeader)
            .send({ productId: PRODUCT_ID, quantity: 0, reason: "Test" });
        expect(res.status).toBe(400);
    });

    it("accumulates stock across multiple entries", async () => {
        await request(app).post("/api/v1/stock/entry").set(adminHeader)
            .send({ productId: PRODUCT_ID, quantity: 30, reason: "First" });
        await request(app).post("/api/v1/stock/entry").set(adminHeader)
            .send({ productId: PRODUCT_ID, quantity: 20, reason: "Second" });

        const res = await request(app).get(`/api/v1/stock/product/${PRODUCT_ID}`).set(adminHeader);
        expect(res.body.data.currentQuantity).toBe(50);
    });
});

describe("POST /api/v1/stock/exit", () => {
    beforeEach(async () => {
        await request(app).post("/api/v1/stock/entry").set(adminHeader)
            .send({ productId: PRODUCT_ID, quantity: 100, reason: "Setup" });
    });

    it("removes stock and returns updated currentStock", async () => {
        const res = await request(app).post("/api/v1/stock/exit").set(adminHeader)
            .send({ productId: PRODUCT_ID, quantity: 40, reason: "Sale" });
        expect(res.status).toBe(201);
        expect(res.body.data.currentStock).toBe(60);
    });

    it("returns 400 when requesting more than available", async () => {
        const res = await request(app).post("/api/v1/stock/exit").set(adminHeader)
            .send({ productId: PRODUCT_ID, quantity: 999, reason: "Oversell" });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("INSUFFICIENT_STOCK");
    });
});

describe("GET /api/v1/stock/product/:id", () => {
    it("returns stock level wrapped in data key", async () => {
        await request(app).post("/api/v1/stock/entry").set(adminHeader)
            .send({ productId: PRODUCT_ID, quantity: 25, reason: "Setup" });

        const res = await request(app).get(`/api/v1/stock/product/${PRODUCT_ID}`).set(adminHeader);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty("currentQuantity", 25);
        expect(Array.isArray(res.body.data.recentMovements)).toBe(true);
    });
});

describe("GET /api/v1/stock/movements", () => {
    beforeEach(async () => {
        await request(app).post("/api/v1/stock/entry").set(adminHeader)
            .send({ productId: PRODUCT_ID, quantity: 100, reason: "Entry" });
    });

    it("returns paginated movements list", async () => {
        const res = await request(app).get("/api/v1/stock/movements").set(adminHeader);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.pagination).toBeDefined();
    });
});

describe("GET /api/v1/stock/summary", () => {
    it("returns summary under data key", async () => {
        const res = await request(app).get("/api/v1/stock/summary").set(adminHeader);
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty("totalProducts");
        expect(res.body.data).toHaveProperty("totalQuantity");
    });
});
