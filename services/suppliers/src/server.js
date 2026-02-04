// services/suppliers/src/server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import { swaggerServe, swaggerSetup } from "./config/swagger.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import { errorHandler } from "./middlewares/errorMiddleware.js";

import ConsulClient from "../shared/utils/consulClient.js";
import RabbitMQClient from "../shared/utils/rabbitmqClient.js";
import { EXCHANGES } from "../shared/events/eventTypes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
const envPath = path.resolve(__dirname, "../.env");
const result = dotenv.config({ path: envPath });
if (result.error) {
    console.error("ERROR: Could not load .env file!", result.error.message);
    process.exit(1);
}

// Verify MONGO_URI
if (!process.env.MONGO_URI) {
    console.error("ERROR: MONGO_URI not found in .env file!");
    process.exit(1);
}

// Express app
const app = express();

// CORS Configuration
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5001", // Users service
    "http://localhost:5002", // Products service
    "http://localhost:5003", // Stock service
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Swagger Documentation
app.use("/api-docs", swaggerServe, swaggerSetup);

// API Routes
app.use("/api/suppliers", supplierRoutes);

// Root Health Check
app.get("/", (req, res) => {
    res.json({
        service: "suppliers-service",
        status: "running",
        port: process.env.PORT || 5004,
        timestamp: new Date().toISOString(),
    });
});

// Error Handler
app.use(errorHandler);

// RabbitMQ Setup
const rabbitMQ = new RabbitMQClient();
async function setupRabbitMQ() {
    try {
        await rabbitMQ.connect();
        await rabbitMQ.createExchange(EXCHANGES.SUPPLIERS, "topic");
        console.log("RabbitMQ connected");
    } catch (error) {
        console.error("RabbitMQ failed:", error.message);
    }
}

// Start Server
const PORT = process.env.PORT || 5004;
connectDB()
    .then(async () => {
        app.listen(PORT, async () => {
            console.log(`Suppliers Service running on http://localhost:${PORT}`);
            console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
            console.log(`Health Check: http://localhost:${PORT}/api/suppliers/health`);

            // Setup RabbitMQ
            await setupRabbitMQ();

            // Register with Consul
            const SERVICE_NAME = process.env.SERVICE_NAME || "suppliers-service";
            const consulClient = new ConsulClient(
                SERVICE_NAME,
                PORT,
                `/api/${SERVICE_NAME.split("-")[0]}/health`
            );
            await consulClient.register();
        });
    })
    .catch((err) => {
        console.error("Failed to connect to MongoDB:", err);
        process.exit(1);
    });

export { rabbitMQ };
