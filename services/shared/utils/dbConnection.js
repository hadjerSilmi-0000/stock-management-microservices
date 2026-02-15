import mongoose from "mongoose";

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

export async function connectWithRetry(mongoUri, serviceName = "Service") {
    let retries = 0;

    while (retries < MAX_RETRIES) {
        try {
            await mongoose.connect(mongoUri, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });

            console.log(`✅ [${serviceName}] MongoDB connected successfully`);

            // Handle connection events
            mongoose.connection.on('error', (err) => {
                console.error(`❌ [${serviceName}] MongoDB error:`, err);
            });

            mongoose.connection.on('disconnected', () => {
                console.warn(`⚠️  [${serviceName}] MongoDB disconnected. Attempting to reconnect...`);
            });

            mongoose.connection.on('reconnected', () => {
                console.log(`✅ [${serviceName}] MongoDB reconnected`);
            });

            return mongoose.connection;

        } catch (error) {
            retries++;
            console.error(
                `❌ [${serviceName}] MongoDB connection attempt ${retries}/${MAX_RETRIES} failed:`,
                error.message
            );

            if (retries < MAX_RETRIES) {
                console.log(`   Retrying in ${RETRY_DELAY / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            } else {
                console.error(`❌ [${serviceName}] Max retries reached. Exiting.`);
                throw error;
            }
        }
    }
}

export async function disconnectDB() {
    try {
        await mongoose.disconnect();
        console.log("MongoDB disconnected");
    } catch (err) {
        console.error(`Error disconnecting DB: ${err.message}`);
    }
}