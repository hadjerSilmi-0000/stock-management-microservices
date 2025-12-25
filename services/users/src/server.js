import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB, swaggerServe, swaggerSetup } from "./config/index.js";
import userRoutes from "./routes/userRoutes.js";
import { errorHandler } from "./middlewares/errorMiddleware.js";

dotenv.config();

// Create Express app
const app = express();

// MICROSERVICES CORS CONFIGURATION
const allowedOrigins = [
    'http://localhost:3000',        // Frontend (React production build)
    'http://localhost:5173',        // Frontend (Vite dev server)
    'http://localhost:5002',        // Products microservice
    'http://localhost:5003',        // Stock microservice
    'http://localhost:5004',        // Suppliers microservice
    process.env.FRONTEND_URL,       // Production frontend URL
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// GLOBAL MIDDLEWARES
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
        timestamp: new Date().toISOString()
    });
});

// ERROR HANDLER 
app.use(errorHandler);

// SERVER STARTUP
const PORT = process.env.PORT || 5001;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(` Users Service running on http://localhost:${PORT}`);
            console.log(` API Documentation: http://localhost:${PORT}/api-docs`);
            console.log(` Health Check: http://localhost:${PORT}/api/users/health`);
        });
    })
    .catch((err) => {
        console.error(" Failed to connect to MongoDB:", err);
        process.exit(1);
    });