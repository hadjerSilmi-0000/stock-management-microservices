import request   from "supertest";
import mongoose  from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let app;
let mongod;
const adminHeader   = { "x-test-role": "admin" };
const managerHeader = { "x-test-role": "manager" };

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

const validSupplier = {
    name: "ACME Corp", contactPerson: "John Doe", email: "john@acme.com",
    phone: "+1234567890", address: "123 Main Street, City, Country",
};

async function createSupplier(overrides = {}) {
    return request(app).post("/api/v1/suppliers")
        .set(adminHeader)
        .send({ ...validSupplier, ...overrides });
}

describe("POST /api/v1/suppliers", () => {
    it("creates supplier and returns 201 with { success, data }", async () => {
        const res = await createSupplier();
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toMatchObject({ name: "ACME Corp", email: "john@acme.com" });
    });

    it("returns 409 on duplicate email", async () => {
        await createSupplier();
        const res = await createSupplier();
        expect(res.status).toBe(409);
    });

    it("returns 400 when required fields are missing", async () => {
        const res = await request(app).post("/api/v1/suppliers")
            .set(adminHeader).send({ name: "Incomplete" });
        expect(res.status).toBe(400);
    });
});

describe("GET /api/v1/suppliers", () => {
    beforeEach(async () => {
        await createSupplier({ name: "Supplier A", email: "a@test.com" });
        await createSupplier({ name: "Supplier B", email: "b@test.com" });
    });

    it("returns paginated list with { success, data, pagination }", async () => {
        const res = await request(app).get("/api/v1/suppliers").set(adminHeader);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.pagination).toMatchObject({ total: 2 });
    });
});

describe("GET /api/v1/suppliers/:id", () => {
    it("returns single supplier wrapped in data", async () => {
        const { body: { data: supplier } } = await createSupplier();
        const res = await request(app).get(`/api/v1/suppliers/${supplier._id}`).set(adminHeader);
        expect(res.status).toBe(200);
        expect(res.body.data._id).toBe(supplier._id);
    });

    it("returns 404 for unknown id", async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app).get(`/api/v1/suppliers/${fakeId}`).set(adminHeader);
        expect(res.status).toBe(404);
    });
});

describe("PUT /api/v1/suppliers/:id", () => {
    it("updates supplier and returns updated data", async () => {
        const { body: { data: supplier } } = await createSupplier();
        const res = await request(app).put(`/api/v1/suppliers/${supplier._id}`)
            .set(adminHeader).send({ name: "ACME Corp Updated" });
        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe("ACME Corp Updated");
    });
});

describe("DELETE /api/v1/suppliers/:id", () => {
    it("soft-deletes a supplier (admin only)", async () => {
        const { body: { data: supplier } } = await createSupplier();
        const res = await request(app).delete(`/api/v1/suppliers/${supplier._id}`).set(adminHeader);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("returns 403 when manager tries to delete", async () => {
        const { body: { data: supplier } } = await createSupplier();
        const res = await request(app).delete(`/api/v1/suppliers/${supplier._id}`).set(managerHeader);
        expect(res.status).toBe(403);
    });
});

describe("GET /api/v1/suppliers/search", () => {
    beforeEach(async () => {
        await createSupplier({ name: "TechSupply Ltd",   email: "tech@test.com" });
        await createSupplier({ name: "FoodDistrib Corp", email: "food@test.com" });
    });

    it("returns matching suppliers", async () => {
        const res = await request(app).get("/api/v1/suppliers/search?q=Tech").set(adminHeader);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("returns 400 when q is empty", async () => {
        const res = await request(app).get("/api/v1/suppliers/search?q=").set(adminHeader);
        expect(res.status).toBe(400);
    });
});

describe("Response envelope consistency", () => {
    it("every success response has { success: true, data }", async () => {
        const { body: { data: supplier } } = await createSupplier();
        const endpoints = [
            { method: "get", url: "/api/v1/suppliers" },
            { method: "get", url: `/api/v1/suppliers/${supplier._id}` },
        ];
        for (const { method, url } of endpoints) {
            const res = await request(app)[method](url).set(adminHeader);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("data");
        }
    });
});
