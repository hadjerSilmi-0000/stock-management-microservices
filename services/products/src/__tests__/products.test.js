import request   from "supertest";
import mongoose  from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let app;
let mongod;

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

const adminHeader   = { "x-test-role": "admin" };
const managerHeader = { "x-test-role": "manager" };

const validProduct = {
    name: "Test Widget", category: "Electronics", price: 29.99,
    sku: "TEST-001", supplierId: "supplier-id-123", lowStockThreshold: 5,
};

async function createProduct(overrides = {}) {
    return request(app).post("/api/v1/products")
        .set(adminHeader)
        .send({ ...validProduct, ...overrides });
}

describe("POST /api/v1/products", () => {
    it("creates product and returns 201 with { success, data }", async () => {
        const res = await createProduct();
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toMatchObject({ sku: "TEST-001", name: "Test Widget" });
    });

    it("returns 409 on duplicate SKU", async () => {
        await createProduct();
        const res = await createProduct();
        expect(res.status).toBe(409);
    });

    it("returns 400 when required fields missing", async () => {
        const res = await request(app).post("/api/v1/products")
            .set(adminHeader).send({ name: "Incomplete" });
        expect(res.status).toBe(400);
    });
});

describe("GET /api/v1/products", () => {
    beforeEach(async () => {
        await createProduct({ sku: "P-001", name: "Product 1" });
        await createProduct({ sku: "P-002", name: "Product 2" });
    });

    it("returns paginated list with { success, data, pagination }", async () => {
        const res = await request(app).get("/api/v1/products").set(adminHeader);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.pagination).toMatchObject({ page: 1, total: 2 });
    });

    it("supports pagination params", async () => {
        const res = await request(app).get("/api/v1/products?page=1&limit=1").set(adminHeader);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.pagination.hasNextPage).toBe(true);
    });
});

describe("GET /api/v1/products/:id", () => {
    it("returns single product", async () => {
        const { body: { data: product } } = await createProduct();
        const res = await request(app).get(`/api/v1/products/${product._id}`).set(adminHeader);
        expect(res.status).toBe(200);
        expect(res.body.data._id).toBe(product._id);
    });

    it("returns 404 for unknown id", async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app).get(`/api/v1/products/${fakeId}`).set(adminHeader);
        expect(res.status).toBe(404);
    });
});

describe("PUT /api/v1/products/:id", () => {
    it("updates product and returns updated data", async () => {
        const { body: { data: product } } = await createProduct();
        const res = await request(app).put(`/api/v1/products/${product._id}`)
            .set(adminHeader).send({ price: 99.99 });
        expect(res.status).toBe(200);
        expect(res.body.data.price).toBe(99.99);
    });

    it("returns 400 when trying to change SKU", async () => {
        const { body: { data: product } } = await createProduct();
        const res = await request(app).put(`/api/v1/products/${product._id}`)
            .set(adminHeader).send({ sku: "NEW-SKU" });
        expect(res.status).toBe(400);
    });
});

describe("DELETE /api/v1/products/:id", () => {
    it("soft-deletes a product (admin only)", async () => {
        const { body: { data: product } } = await createProduct();
        const res = await request(app).delete(`/api/v1/products/${product._id}`).set(adminHeader);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("returns 403 when manager tries to delete", async () => {
        const { body: { data: product } } = await createProduct();
        const res = await request(app).delete(`/api/v1/products/${product._id}`).set(managerHeader);
        expect(res.status).toBe(403);
    });
});

describe("GET /api/v1/products/search", () => {
    beforeEach(async () => {
        await createProduct({ sku: "S-001", name: "Blue Widget" });
        await createProduct({ sku: "S-002", name: "Red Gadget" });
    });

    it("returns matching products", async () => {
        const res = await request(app).get("/api/v1/products/search?q=Widget").set(adminHeader);
        expect(res.status).toBe(200);
        expect(res.body.data.every((p) => /widget/i.test(p.name))).toBe(true);
    });

    it("returns 400 when query is empty", async () => {
        const res = await request(app).get("/api/v1/products/search?q=").set(adminHeader);
        expect(res.status).toBe(400);
    });
});
