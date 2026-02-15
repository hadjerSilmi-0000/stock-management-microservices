export const getCorsOptions = () => {
    const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5001", // Users service
        "http://localhost:5002", // Products service
        "http://localhost:5003", // Stock service
        "http://localhost:5004", // Suppliers service
        process.env.FRONTEND_URL,
        process.env.ALLOWED_ORIGINS?.split(',') || [],
    ].flat().filter(Boolean);

    return {
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps, Postman, etc.)
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Service-Key', 'X-Service-Name']
    };
};