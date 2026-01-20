import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;

        if (!mongoUri) {
            throw new Error("MONGO_URI not found in environment variables");
        }

        await mongoose.connect(mongoUri);
        console.log(" MongoDB connected successfully to:", mongoUri);
    } catch (err) {
        console.error(` MongoDB connection error: ${err.message}`);
        process.exit(1);
    }
};

export const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
        console.log("MongoDB disconnected");
    } catch (err) {
        console.error(`Error disconnecting DB: ${err.message}`);
    }
};