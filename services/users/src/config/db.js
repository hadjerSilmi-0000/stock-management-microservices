import { connectWithRetry, disconnectDB } from "../../shared/utils/dbConnection.js";

export const connectDB = async () => {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
        throw new Error("MONGO_URI not found in environment variables");
    }

    const serviceName = process.env.SERVICE_NAME || "users-service";
    return await connectWithRetry(mongoUri, serviceName);
};

export { disconnectDB };