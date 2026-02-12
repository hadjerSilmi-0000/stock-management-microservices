/**
 * Circuit Breaker Utility
 * Wraps axios HTTP calls with fault tolerance.
 *
 * States:
 *   CLOSED   → Normal operation, requests go through
 *   OPEN     → Too many failures, requests blocked immediately (fallback used)
 *   HALF_OPEN → Testing if service recovered, one request allowed through
 *
 * Place in: services/shared/utils/circuitBreaker.js
 */

import CircuitBreaker from "opossum";
import axios from "axios";
import logger from "./logger.js";

// ─── Default Options ────────────────────────────────────────────────────────
const DEFAULT_OPTIONS = {
    timeout: 5000,                  // Request timeout in ms
    errorThresholdPercentage: 50,   // Open circuit if 50% of requests fail
    resetTimeout: 30000,            // Try again after 30 seconds
    volumeThreshold: 3,             // Min requests before circuit can open
    rollingCountTimeout: 10000,     // 10-second rolling window
    rollingCountBuckets: 10,
};

// ─── Internal HTTP function wrapped by the breaker ──────────────────────────
async function httpRequest(config) {
    const response = await axios(config);
    return response.data;
}

// ─── Circuit Breaker Factory ─────────────────────────────────────────────────
/**
 * Creates a circuit breaker for a target service.
 *
 * @param {string} serviceName  - Human-readable name e.g. "products-service"
 * @param {object} options      - Override default opossum options
 * @param {function} fallbackFn - Called when circuit is OPEN (receives error)
 *
 * @returns {{ execute, getState, getStats, resetBreaker }}
 *
 * Usage:
 *   const breaker = createCircuitBreaker("products-service", {}, () => null);
 *   const data    = await breaker.execute({ method:"GET", url:"http://..." });
 */
export function createCircuitBreaker(serviceName, options = {}, fallbackFn = null) {
    const breaker = new CircuitBreaker(httpRequest, {
        ...DEFAULT_OPTIONS,
        ...options,
        name: serviceName,
    });

    // ── Fallback ─────────────────────────────────────────────────────────────
    if (fallbackFn) {
        breaker.fallback(fallbackFn);
    }

    // ── Event Logging ────────────────────────────────────────────────────────
    breaker.on("open", () =>
        logger.error(`🔴 [CircuitBreaker] OPENED  — ${serviceName} is unavailable`)
    );

    breaker.on("halfOpen", () =>
        logger.warn(`🟡 [CircuitBreaker] HALF-OPEN — testing ${serviceName}`)
    );

    breaker.on("close", () =>
        logger.info(`🟢 [CircuitBreaker] CLOSED  — ${serviceName} recovered`)
    );

    breaker.on("fallback", (result) =>
        logger.warn(`🔄 [CircuitBreaker] FALLBACK used for ${serviceName}`)
    );

    breaker.on("timeout", () =>
        logger.warn(`⏱️  [CircuitBreaker] TIMEOUT — ${serviceName} took too long`)
    );

    breaker.on("reject", () =>
        logger.warn(`⛔ [CircuitBreaker] REJECTED — ${serviceName} circuit is open`)
    );

    // ── Public API ────────────────────────────────────────────────────────────
    return {
        /**
         * Execute an axios request config through the circuit breaker.
         * @param {import("axios").AxiosRequestConfig} config
         */
        execute: (config) => breaker.fire(config),

        /** Returns "CLOSED" | "OPEN" | "HALF_OPEN" */
        getState: () => {
            if (breaker.opened) return "OPEN";
            if (breaker.halfOpen) return "HALF_OPEN";
            return "CLOSED";
        },

        /** Returns raw opossum stats for health endpoints */
        getStats: () => ({
            name: serviceName,
            state: breaker.opened ? "OPEN" : breaker.halfOpen ? "HALF_OPEN" : "CLOSED",
            enabled: !breaker.opened,
            fires: breaker.stats.fires,
            successes: breaker.stats.successes,
            failures: breaker.stats.failures,
            rejects: breaker.stats.rejects,
            timeouts: breaker.stats.timeouts,
            fallbacks: breaker.stats.fallbacks,
        }),

        /** Manually reset the circuit back to CLOSED (useful in tests) */
        resetBreaker: () => breaker.close(),
    };
}

// ─── Singleton Registry ──────────────────────────────────────────────────────
// Keeps one breaker per service so stats accumulate correctly across the app.
const registry = new Map();

/**
 * Get-or-create a circuit breaker from the registry.
 * Call this in your service file once, then reuse the instance.
 *
 * @param {string}   serviceName
 * @param {object}   options
 * @param {function} fallbackFn
 */
export function getCircuitBreaker(serviceName, options = {}, fallbackFn = null) {
    if (!registry.has(serviceName)) {
        registry.set(
            serviceName,
            createCircuitBreaker(serviceName, options, fallbackFn)
        );
    }
    return registry.get(serviceName);
}

/**
 * Returns stats for every registered circuit breaker.
 * Used by the health endpoint.
 */
export function getAllCircuitBreakerStats() {
    const stats = {};
    for (const [name, breaker] of registry.entries()) {
        stats[name] = breaker.getStats();
    }
    return stats;
}

export default { createCircuitBreaker, getCircuitBreaker, getAllCircuitBreakerStats };