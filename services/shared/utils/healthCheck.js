import mongoose from 'mongoose';
import { getAllCircuitBreakerStats } from './circuitBreaker.js';

export async function createHealthCheck(serviceName, rabbitMQ = null) {
    const health = {
        status: "UP",
        service: serviceName,
        timestamp: new Date().toISOString(),
        dependencies: {
            database: "unknown",
            rabbitmq: "unknown",
            circuitBreakers: {}
        }
    };

    // Check MongoDB
    try {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.db.admin().ping();
            health.dependencies.database = "UP";
        } else {
            health.dependencies.database = "DOWN";
            health.status = "DEGRADED";
        }
    } catch (err) {
        health.dependencies.database = "DOWN";
        health.status = "DEGRADED";
    }

    // Check RabbitMQ
    if (rabbitMQ) {
        if (rabbitMQ.isConnected) {
            health.dependencies.rabbitmq = "UP";
        } else {
            health.dependencies.rabbitmq = "DOWN";
            health.status = "DEGRADED";
        }
    } else {
        health.dependencies.rabbitmq = "N/A";
    }

    // Circuit breaker stats
    health.dependencies.circuitBreakers = getAllCircuitBreakerStats();

    // Check if any circuit breakers are open
    const openBreakers = Object.values(health.dependencies.circuitBreakers)
        .filter(cb => cb.state === "OPEN");

    if (openBreakers.length > 0) {
        health.status = "DEGRADED";
    }

    return health;
}