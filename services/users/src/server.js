// services/users/src/server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB, swaggerServe, swaggerSetup } from "./config/index.js";
import userRoutes from "./routes/userRoutes.js";
import { errorHandler } from "./middlewares/errorMiddleware.js";

import ConsulClient from "../shared/utils/consulClient.js";
import RabbitMQClient from "../shared/utils/rabbitmqClient.js";
import { EXCHANGES } from "../shared/events/eventTypes.js";

dotenv.config();

// Create Express app
const app = express();

// MICROSERVICES CORS CONFIGURATION
const allowedOrigins = [
    "http://localhost:3000", // Frontend (React production build)
    "http://localhost:5173", // Frontend (Vite dev server)
    "http://localhost:5002", // Products microservice
    "http://localhost:5003", // Stock microservice
    "http://localhost:5004", // Suppliers microservice
    process.env.FRONTEND_URL, // Production frontend URL
].filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Swagger documentation
app.use("/api-docs", swaggerServe, swaggerSetup);

// API ROUTES
app.use("/api/users", userRoutes);

// Root health check
app.get("/", (req, res) => {
    res.json({
        service: "users-service",
        status: "running",
        port: process.env.PORT || 5001,
        timestamp: new Date().toISOString(),
    });
});

// ERROR HANDLER
app.use(errorHandler);

// RabbitMQ Setup
const rabbitMQ = new RabbitMQClient();
async function setupRabbitMQ() {
    try {
        await rabbitMQ.connect();
        await rabbitMQ.createExchange(EXCHANGES.USERS, "topic");
        console.log("RabbitMQ connected");
    } catch (error) {
        console.error("RabbitMQ failed:", error.message);
    }
}

// SERVER STARTUP
const PORT = process.env.PORT || 5001;
connectDB()
    .then(async () => {
        app.listen(PORT, async () => {
            console.log(`Users Service running on http://localhost:${PORT}`);
            console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
            console.log(`Health Check: http://localhost:${PORT}/api/users/health`);

            // Setup RabbitMQ
            await setupRabbitMQ();

            // Register with Consul
            const SERVICE_NAME = process.env.SERVICE_NAME || "users-service";
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
