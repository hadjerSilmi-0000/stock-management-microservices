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

// ES Module __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from STOCK service root
const envPath = path.resolve(__dirname, "../.env");
console.log("Loading .env from:", envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error(" ERROR: Could not load .env file!");
    console.error("Path:", envPath);
    console.error("Error:", result.error.message);
    process.exit(1);
}

console.log(" Loaded", Object.keys(result.parsed || {}).length, "environment variables");

// Verify MONGO_URI loaded
if (!process.env.MONGO_URI) {
    console.error(" ERROR: MONGO_URI not found in .env file!");
    console.error("Expected .env location:", envPath);
    console.error("\nYour .env file exists but MONGO_URI is missing or empty.");
    console.error("\nPlease add this line to your .env:");
    console.error("MONGO_URI=mongodb://localhost:27017/stock_db");
    process.exit(1);
}

console.log(" MONGO_URI loaded:", process.env.MONGO_URI);

// Create Express app
const app = express();

// CORS Configuration
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5001", // Users service
    "http://localhost:5002", // Products service
    "http://localhost:5004", // Suppliers service
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
    })
);

// Global Middlewares
app.use(express.json());
app.use(cookieParser());

// Swagger Documentation
app.use("/api-docs", swaggerServe, swaggerSetup);

// API Routes
app.use("/api/stock", stockRoutes);

// Root Health Check
app.get("/", (req, res) => {
    res.json({
        service: "stock-service",
        status: "running",
        port: process.env.PORT || 5003,
        timestamp: new Date().toISOString(),
    });
});

// Error Handler 
app.use(errorHandler);

// Server Startup
const PORT = process.env.PORT || 5003;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`\nStock Service running on http://localhost:${PORT}`);
            console.log(` API Documentation: http://localhost:${PORT}/api-docs`);
            console.log(`Health Check: http://localhost:${PORT}/api/stock/health\n`);
        });
    })
    .catch((err) => {
        console.error("Failed to connect to MongoDB:", err);
        process.exit(1);
    });