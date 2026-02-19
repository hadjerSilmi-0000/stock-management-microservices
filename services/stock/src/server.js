// services/stock/src/server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import { swaggerServe, swaggerSetup } from "./config/swagger.js";
import stockRoutes from "./routes/stockRoutes.js";
import { errorHandler } from "./middlewares/errorMiddleware.js";
import { requestIdMiddleware } from "../shared/middlewares/requestId.js";
import {
    requestLogger,
    performanceMonitor,
    extractClientIP
} from "./middlewares/requestLogger.js";
import { getCorsOptions } from "../shared/config/cors.js";
import { validateServiceKeys } from "../shared/config/serviceKeys.js";
import { setupStockEventSubscribers } from "./events/subscribers.js"; // ✅ ADDED

import ConsulClient from "../shared/utils/consulClient.js";
import RabbitMQClient from "../shared/utils/rabbitmqClient.js";
import { EXCHANGES } from "../shared/events/eventTypes.js";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
const envPath = path.resolve(__dirname, "../.env");
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error("WARNING: Could not load .env file from:", envPath);
    console.error("   Error:", result.error.message);
    console.error("   Falling back to process environment variables");
}

// Verify MONGO_URI
if (!process.env.MONGO_URI) {
    console.error("ERROR: MONGO_URI not found in .env file!");
    process.exit(1);
}

// Validate service keys
try {
    validateServiceKeys();
} catch (error) {
    console.error('Service key validation failed:', error.message);
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

const app = express();

app.use(cors(getCorsOptions()));
app.use(requestIdMiddleware);
app.use(extractClientIP);
app.use(requestLogger);
app.use(performanceMonitor);
app.use(express.json());
app.use(cookieParser());

app.use("/api-docs", swaggerServe, swaggerSetup);
app.use("/api/v1/stock", stockRoutes);

app.get("/", (req, res) => {
    res.json({
        service: "stock-service",
        status: "running",
        port: process.env.PORT || 5003,
        timestamp: new Date().toISOString(),
    });
});

app.use(errorHandler);

// RabbitMQ Setup
const rabbitMQ = new RabbitMQClient();

async function setupRabbitMQ() {
    try {
        await rabbitMQ.connect();
        await rabbitMQ.createExchange(EXCHANGES.STOCK, "topic");

        // ✅ ADDED: wire up event subscribers
        await setupStockEventSubscribers(rabbitMQ);

        console.log("✅ RabbitMQ connected and subscribers registered");
    } catch (error) {
        console.error("RabbitMQ failed:", error.message);
    }
}

const PORT = process.env.PORT || 5003;
let server;

connectDB()
    .then(async () => {
        server = app.listen(PORT, async () => {
            console.log(`Stock Service running on http://localhost:${PORT}`);
            console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
            console.log(`Health Check: http://localhost:${PORT}/api/v1/stock/health`);

            await setupRabbitMQ();

            const SERVICE_NAME = process.env.SERVICE_NAME || "stock-service";
            const consulClient = new ConsulClient(
                SERVICE_NAME,
                PORT,
                `/api/v1/${SERVICE_NAME.split("-")[0]}/health`
            );
            await consulClient.register();
        });
    })
    .catch((err) => {
        console.error("Failed to connect to MongoDB:", err);
        process.exit(1);
    });

const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    if (server) {
        server.close(() => console.log('HTTP server closed'));
    }

    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');

        if (rabbitMQ && rabbitMQ.isConnected) {
            await rabbitMQ.close();
            console.log('RabbitMQ connection closed');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { rabbitMQ };