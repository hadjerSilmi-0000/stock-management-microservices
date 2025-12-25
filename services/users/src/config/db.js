import mongoose from "mongoose";
import dotenv from "dotenv";
import logger from "../utils/logger.js";
import path from "path";

//dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const mongoUri = process.env.MONGO_URI;

// Connect to MongoDB
export const connectDB = async () => {
    try {
        if (!mongoUri) throw new Error("MONGO_URI not found in .env");
        await mongoose.connect(mongoUri);
        logger.info("MongoDB connected successfully");
    } catch (err) {
        logger.error(`MongoDB connection error: ${err.message}`);
        process.exit(1);
    }
};

// Disconnect MongoDB
export const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
        logger.info("MongoDB disconnected");
    } catch (err) {
        logger.error(`Error disconnecting DB: ${err.message}`);
    }
};