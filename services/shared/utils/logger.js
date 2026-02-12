/**
 * Shared logger for utilities inside services/shared/
 * Falls back to console if Winston is not available.
 *
 * services/shared/utils/logger.js
 */

const logger = {
    info: (...args) => console.log("[INFO]", ...args),
    warn: (...args) => console.warn("[WARN]", ...args),
    error: (...args) => console.error("[ERROR]", ...args),
    debug: (...args) => console.debug("[DEBUG]", ...args),
};

export default logger;