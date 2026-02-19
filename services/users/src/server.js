// services/users/src/server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import { swaggerServe, swaggerSetup } from "./config/swagger.js";
import userRoutes from "./routes/userRoutes.js";
import { errorHandler } from "./middlewares/errorMiddleware.js";
import { requestIdMiddleware } from "../shared/middlewares/requestId.js";
import {
    requestLogger,
    performanceMonitor,
    extractClientIP,
} from "./middlewares/requestLogger.js";
import { getCorsOptions } from "../shared/config/cors.js";
import { validateServiceKeys } from "../shared/config/serviceKeys.js";

import ConsulClient from "../shared/utils/consulClient.js";
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

if (!process.env.MONGO_URI) {
    console.error("ERROR: MONGO_URI not found in .env file!");
    process.exit(1);
}

// Validate service keys
try {
    validateServiceKeys();
} catch (error) {
    console.error("Service key validation failed:", error.message);
    if (process.env.NODE_ENV === "production") {
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

// Swagger
app.use("/api-docs", swaggerServe, swaggerSetup);

// Routes
app.use("/api/v1/users", userRoutes);

// Root health check
app.get("/", (req, res) => {
    res.json({
        service: "users-service",
        status: "running",
        port: process.env.PORT || 5001,
        timestamp: new Date().toISOString(),
    });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
let server;

connectDB()
    .then(async () => {
        server = app.listen(PORT, async () => {
            console.log(`Users Service running on http://localhost:${PORT}`);
            console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
            console.log(`Health Check: http://localhost:${PORT}/api/v1/users/health`);

            // Register with Consul
            const SERVICE_NAME = process.env.SERVICE_NAME || "users-service";
            const consulClient = new ConsulClient(
                SERVICE_NAME,
                PORT,
                `/api/v1/users/health`
            );
            await consulClient.register();
        });
    })
    .catch((err) => {
        console.error("Failed to connect to MongoDB:", err);
        process.exit(1);
    });

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    if (server) {
        server.close(() => console.log("HTTP server closed"));
    }

    try {
        await mongoose.connection.close();
        console.log("MongoDB connection closed");
        process.exit(0);
    } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
    }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));