// services/users/src/server.js
import "../../shared/config/loadEnv.js"; // ← MUST be first import — loads .env before jwt.js initializes

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import { swaggerServe, swaggerSetup } from "./config/swagger.js";
import userRoutes from "./routes/userRoutes.js";
import { errorHandler } from "./middlewares/errorMiddleware.js";
import { requestIdMiddleware } from "../../shared/middlewares/requestId.js";
import {
    requestLogger,
    performanceMonitor,
    extractClientIP,
} from "./middlewares/requestLogger.js";
import { getCorsOptions } from "../../shared/config/cors.js";
import { validateServiceKeys } from "../../shared/config/serviceKeys.js";
import ConsulClient from "../../shared/utils/consulClient.js";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI not found — check services/users/.env");
    process.exit(1);
}

if (!process.env.JWT_ACCESS_SECRET) {
    console.error("❌ JWT_ACCESS_SECRET not found — check services/users/.env");
    process.exit(1);
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
app.use("/api/v1/users", userRoutes);

app.get("/", (req, res) => {
    res.json({
        service: "users-service",
        status: "running",
        port: process.env.PORT || 5001,
        timestamp: new Date().toISOString(),
    });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5001;
let server;

connectDB()
    .then(async () => {
        server = app.listen(PORT, async () => {
            console.log(`✅ Users Service running on http://localhost:${PORT}`);
            console.log(`   API Docs:     http://localhost:${PORT}/api-docs`);
            console.log(`   Health Check: http://localhost:${PORT}/api/v1/users/health`);

            const consulClient = new ConsulClient(
                process.env.SERVICE_NAME || "users-service",
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

const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    if (server) server.close(() => console.log("HTTP server closed"));
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