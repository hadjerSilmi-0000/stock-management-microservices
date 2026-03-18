import StockMovement, { MOVEMENT_TYPES } from "../models/stockMovementModel.js";
import StockLevel from "../models/stockLevelModel.js";
import logger from "../utils/logger.js";
import { getCircuitBreaker } from "../../../shared/utils/circuitBreaker.js";
import { asyncHandler } from "../utils/errors.js";
import { sendSuccess, sendError, buildPagination } from "../../../shared/utils/sendResponse.js";

import { rabbitMQ } from "../../../shared/utils/rabbitmqSingleton.js";
import { EVENTS, EXCHANGES, createEvent } from "../../../shared/events/eventTypes.js";

const PRODUCTS_SERVICE_URL = process.env.PRODUCTS_SERVICE_URL || "http://localhost:5002";

const productsBreaker = getCircuitBreaker(
    "products-service",
    { timeout: 5000, errorThresholdPercentage: 50, resetTimeout: 30000, volumeThreshold: 3 },
    () => ({
        _isFallback: true,
        name: "Unknown (products-service unavailable)",
        sku: "N/A",
        lowStockThreshold: parseInt(process.env.DEFAULT_LOW_STOCK_THRESHOLD) || 10,
    })
);

async function getProductInfo(productId, token) {
    try {
        const data = await productsBreaker.execute({
            method: "GET",
            url: `${PRODUCTS_SERVICE_URL}/api/products/${productId}`,
            headers: { Cookie: `accessToken=${token}` },
            timeout: 5000,
        });
        // If circuit breaker returned a fallback object, return it directly
        if (data?._isFallback) return data;
        return data?.data || data?.product || data || null;
    } catch (error) {
        logger.error(`getProductInfo failed for ${productId}: ${error.message}`);
        // Return a fallback so stock operations still work when products service is down
        return {
            _isFallback: true,
            name: "Unknown",
            sku: "N/A",
            lowStockThreshold: parseInt(process.env.DEFAULT_LOW_STOCK_THRESHOLD) || 10,
        };
    }
}

async function publishEvent(exchange, eventType, data) {
    try {
        const event = createEvent(eventType, data);
        await rabbitMQ.publish(exchange, eventType, event);
    } catch (error) {
        logger.error(`Failed to publish ${eventType}: ${error.message}`);
    }
}

// @desc    Add stock entry
// @route   POST /api/v1/stock/entry
// @access  Private (Admin, Manager)
export const addStockEntry = asyncHandler(async (req, res) => {
    const { productId, quantity, reason, reference } = req.body;

    const token = req.cookies?.accessToken;
    const product = await getProductInfo(productId, token);

    if (!product) {
        return sendError(res, 404, "Product not found", "PRODUCT_NOT_FOUND");
    }

    const stockLevel = await StockLevel.getOrCreate(productId);
    const previousQuantity = stockLevel.currentQuantity;

    const movement = await StockMovement.create({
        productId,
        type: MOVEMENT_TYPES.ENTRY,
        quantity,
        reason,
        reference,
        performedBy: req.user.id,
    });

    await stockLevel.updateQuantity(quantity);

    logger.info(`Stock entry: ${quantity} units of ${productId} by user ${req.user.id}`);

    await publishEvent(EXCHANGES.STOCK, EVENTS.STOCK_MOVEMENT_IN, {
        productId,
        sku: product.sku || "N/A",
        quantity,
        previousQuantity,
        newQuantity: stockLevel.currentQuantity,
        location: "Main Warehouse",
        reason,
        reference,
        performedBy: req.user.id,
    });

    return sendSuccess(
        res,
        201,
        { movement, currentStock: stockLevel.currentQuantity },
        "Stock entry recorded successfully"
    );
});

// @desc    Remove stock (exit)
// @route   POST /api/v1/stock/exit
// @access  Private (Admin, Manager)
export const removeStockExit = asyncHandler(async (req, res) => {
    const { productId, quantity, reason, reference } = req.body;

    const token = req.cookies?.accessToken;
    const product = await getProductInfo(productId, token);

    if (!product) {
        return sendError(res, 404, "Product not found", "PRODUCT_NOT_FOUND");
    }

    const stockLevel = await StockLevel.getOrCreate(productId);
    const previousQuantity = stockLevel.currentQuantity;

    if (stockLevel.currentQuantity < quantity) {
        return sendError(res, 400, "Insufficient stock", "INSUFFICIENT_STOCK", {
            available: stockLevel.currentQuantity,
            requested: quantity,
        });
    }

    const movement = await StockMovement.create({
        productId,
        type: MOVEMENT_TYPES.EXIT,
        quantity,
        reason,
        reference,
        performedBy: req.user.id,
    });

    await stockLevel.updateQuantity(-quantity);

    logger.info(`Stock exit: ${quantity} units of ${productId} by user ${req.user.id}`);

    await publishEvent(EXCHANGES.STOCK, EVENTS.STOCK_MOVEMENT_OUT, {
        productId,
        sku: product.sku || "N/A",
        quantity,
        previousQuantity,
        newQuantity: stockLevel.currentQuantity,
        location: "Main Warehouse",
        reason,
        reference,
        performedBy: req.user.id,
    });

    // Stock level alerts
    const threshold = product.lowStockThreshold || 10;
    const newQuantity = stockLevel.currentQuantity;

    if (newQuantity === 0) {
        await publishEvent(EXCHANGES.STOCK, EVENTS.STOCK_OUT, {
            productId, sku: product.sku || "N/A", name: product.name || "Unknown", location: "Main Warehouse",
        });
        logger.warn(`STOCK OUT: ${product.sku}`);
    } else if (newQuantity <= threshold / 2) {
        await publishEvent(EXCHANGES.STOCK, EVENTS.STOCK_CRITICAL, {
            productId, sku: product.sku || "N/A", name: product.name || "Unknown",
            currentQuantity: newQuantity, minimumStock: threshold, location: "Main Warehouse", severity: "critical",
        });
        logger.warn(`CRITICAL STOCK: ${product.sku} - ${newQuantity} units remaining`);
    } else if (newQuantity <= threshold) {
        await publishEvent(EXCHANGES.STOCK, EVENTS.STOCK_LOW, {
            productId, sku: product.sku || "N/A", name: product.name || "Unknown",
            currentQuantity: newQuantity, minimumStock: threshold, location: "Main Warehouse", severity: "low",
        });
        logger.warn(`LOW STOCK: ${product.sku} - ${newQuantity} units remaining`);
    }

    return sendSuccess(
        res,
        201,
        { movement, currentStock: stockLevel.currentQuantity },
        "Stock exit recorded successfully"
    );
});

// @desc    Get current stock level for a product
// @route   GET /api/v1/stock/product/:id
// @access  Private (Admin, Manager)
export const getProductStockLevel = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const stockLevel = await StockLevel.getOrCreate(id);
    const recentMovements = await StockMovement.getByProduct(id, 10);

    return sendSuccess(res, 200, {
        productId: id,
        currentQuantity: stockLevel.currentQuantity,
        lastUpdated: stockLevel.lastUpdated,
        recentMovements,
    });
});

// @desc    Get stock movement history
// @route   GET /api/v1/stock/movements
// @access  Private (Admin, Manager)
export const getStockMovements = asyncHandler(async (req, res) => {
    const { productId, type, limit = 50, page = 1 } = req.query;

    const filter = {};
    if (productId) filter.productId = productId;
    if (type) filter.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);

    const [movements, total] = await Promise.all([
        StockMovement.find(filter).sort({ timestamp: -1 }).limit(parsedLimit).skip(skip),
        StockMovement.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, movements, null, buildPagination(parsedPage, parsedLimit, total));
});

// @desc    Get low stock alerts
// @route   GET /api/v1/stock/alerts
// @access  Private (Admin, Manager)
export const getLowStockAlerts = asyncHandler(async (req, res) => {
    const threshold = parseInt(req.query.threshold) || parseInt(process.env.DEFAULT_LOW_STOCK_THRESHOLD) || 10;
    const token = req.cookies?.accessToken;

    const lowStockItems = await StockLevel.getLowStock(threshold);

    const settled = await Promise.allSettled(
        lowStockItems.map(async (item) => {
            const product = await getProductInfo(item.productId, token);
            return {
                productId: item.productId,
                productName: product?.name || "Unknown",
                sku: product?.sku || "N/A",
                currentQuantity: item.currentQuantity,
                threshold: product?.lowStockThreshold || threshold,
                lastUpdated: item.lastUpdated,
                productAvailable: !product?._isFallback,
            };
        })
    );

    const alerts = settled.filter((r) => r.status === "fulfilled").map((r) => r.value);
    const failedCount = settled.length - alerts.length;

    return sendSuccess(
        res,
        200,
        alerts,
        failedCount > 0 ? `${failedCount} item(s) could not be fully resolved` : null,
        buildPagination(1, alerts.length || 1, alerts.length)
    );
});

// @desc    Get stock summary / statistics
// @route   GET /api/v1/stock/summary
// @access  Private (Admin, Manager)
export const getStockSummary = asyncHandler(async (req, res) => {
    const threshold = parseInt(process.env.DEFAULT_LOW_STOCK_THRESHOLD) || 10;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalProducts, totalQuantityAgg, lowStockCount, recentMovementsCount] = await Promise.all([
        StockLevel.countDocuments(),
        StockLevel.aggregate([{ $group: { _id: null, total: { $sum: "$currentQuantity" } } }]),
        StockLevel.countDocuments({ currentQuantity: { $lte: threshold } }),
        StockMovement.countDocuments({ timestamp: { $gte: yesterday } }),
    ]);

    return sendSuccess(res, 200, {
        totalProducts,
        totalQuantity: totalQuantityAgg[0]?.total || 0,
        lowStockCount,
        recentMovementsCount,
    });
});

export { productsBreaker };