/**
 * Stock Controller with Event Publishing
 * File: services/stock/src/controllers/stockController.js
 * 
 * CHANGES:
 * - Import rabbitMQ from server.js
 * - Publish stock events after operations
 * - Publish alerts for low/critical/out-of-stock
 */

import StockMovement, { MOVEMENT_TYPES } from "../models/stockMovementModel.js";
import StockLevel from "../models/stockLevelModel.js";
import logger from "../utils/logger.js";
import { getCircuitBreaker } from "../../shared/utils/circuitBreaker.js";
import { asyncHandler } from "../utils/errors.js";

// ✅ NEW: Import RabbitMQ and events
import { rabbitMQ } from "../server.js";
import { EVENTS, EXCHANGES, createEvent } from "../../shared/events/eventTypes.js";

const PRODUCTS_SERVICE_URL = process.env.PRODUCTS_SERVICE_URL || "http://localhost:5002";

// Circuit Breaker
const productsBreaker = getCircuitBreaker(
    "products-service",
    {
        timeout: 5000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        volumeThreshold: 3,
    },
    () => ({
        _isFallback: true,
        name: "Unknown (products-service unavailable)",
        sku: "N/A",
        lowStockThreshold: parseInt(process.env.DEFAULT_LOW_STOCK_THRESHOLD) || 10,
    })
);

// Helper: Fetch product info
async function getProductInfo(productId, token) {
    try {
        const data = await productsBreaker.execute({
            method: "GET",
            url: `${PRODUCTS_SERVICE_URL}/api/products/${productId}`,
            headers: { Cookie: `accessToken=${token}` },
            timeout: 5000,
        });
        return data?.data || data?.product || null;
    } catch (error) {
        logger.error(`getProductInfo failed for ${productId}: ${error.message}`);
        return null;
    }
}

// @desc    Add stock entry
// @route   POST /api/stock/entry
// @access  Private (Admin, Manager)
export const addStockEntry = asyncHandler(async (req, res) => {
    const { productId, quantity, reason, reference } = req.body;

    const token = req.cookies?.accessToken;
    const product = await getProductInfo(productId, token);

    if (!product) {
        return res.status(404).json({
            success: false,
            message: "Product not found",
        });
    }

    if (product._isFallback) {
        logger.warn(`addStockEntry: using fallback for product ${productId}`);
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

    // ✅ NEW: Publish STOCK_MOVEMENT_IN event
    try {
        const event = createEvent(EVENTS.STOCK_MOVEMENT_IN, {
            productId: productId,
            sku: product.sku || "N/A",
            quantity,
            previousQuantity,
            newQuantity: stockLevel.currentQuantity,
            location: "Main Warehouse",
            reason,
            reference,
            performedBy: req.user.id,
        });

        await rabbitMQ.publish(EXCHANGES.STOCK, EVENTS.STOCK_MOVEMENT_IN, event);
        logger.info(`Event published: STOCK_MOVEMENT_IN for ${productId}`);
    } catch (error) {
        logger.error(`Failed to publish STOCK_MOVEMENT_IN event: ${error.message}`);
    }

    res.status(201).json({
        success: true,
        message: "Stock entry recorded successfully",
        movement,
        currentStock: stockLevel.currentQuantity,
        ...(product._isFallback && {
            warning: "Product details unavailable — products service is down",
        }),
    });
});

// @desc    Remove stock (exit)
// @route   POST /api/stock/exit
// @access  Private (Admin, Manager)
export const removeStockExit = asyncHandler(async (req, res) => {
    const { productId, quantity, reason, reference } = req.body;

    const token = req.cookies?.accessToken;
    const product = await getProductInfo(productId, token);

    if (!product) {
        return res.status(404).json({
            success: false,
            message: "Product not found",
        });
    }

    if (product._isFallback) {
        logger.warn(`removeStockExit: using fallback for product ${productId}`);
    }

    const stockLevel = await StockLevel.getOrCreate(productId);
    const previousQuantity = stockLevel.currentQuantity;

    if (stockLevel.currentQuantity < quantity) {
        return res.status(400).json({
            success: false,
            message: "Insufficient stock",
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

    // ✅ NEW: Publish STOCK_MOVEMENT_OUT event
    try {
        const event = createEvent(EVENTS.STOCK_MOVEMENT_OUT, {
            productId: productId,
            sku: product.sku || "N/A",
            quantity,
            previousQuantity,
            newQuantity: stockLevel.currentQuantity,
            location: "Main Warehouse",
            reason,
            reference,
            performedBy: req.user.id,
        });

        await rabbitMQ.publish(EXCHANGES.STOCK, EVENTS.STOCK_MOVEMENT_OUT, event);
        logger.info(`Event published: STOCK_MOVEMENT_OUT for ${productId}`);
    } catch (error) {
        logger.error(`Failed to publish STOCK_MOVEMENT_OUT event: ${error.message}`);
    }

    // ✅ NEW: Check for low/critical/out-of-stock conditions
    try {
        const threshold = product.lowStockThreshold || 10;
        const newQuantity = stockLevel.currentQuantity;

        if (newQuantity === 0) {
            // Out of stock
            const outEvent = createEvent(EVENTS.STOCK_OUT, {
                productId: productId,
                sku: product.sku || "N/A",
                name: product.name || "Unknown",
                location: "Main Warehouse",
            });
            await rabbitMQ.publish(EXCHANGES.STOCK, EVENTS.STOCK_OUT, outEvent);
            logger.warn(`🚨 STOCK OUT: ${product.sku}`);

        } else if (newQuantity <= threshold / 2) {
            // Critical stock
            const criticalEvent = createEvent(EVENTS.STOCK_CRITICAL, {
                productId: productId,
                sku: product.sku || "N/A",
                name: product.name || "Unknown",
                currentQuantity: newQuantity,
                minimumStock: threshold,
                location: "Main Warehouse",
                severity: "critical",
            });
            await rabbitMQ.publish(EXCHANGES.STOCK, EVENTS.STOCK_CRITICAL, criticalEvent);
            logger.warn(`🔴 CRITICAL STOCK: ${product.sku} - ${newQuantity} units remaining`);

        } else if (newQuantity <= threshold) {
            // Low stock
            const lowEvent = createEvent(EVENTS.STOCK_LOW, {
                productId: productId,
                sku: product.sku || "N/A",
                name: product.name || "Unknown",
                currentQuantity: newQuantity,
                minimumStock: threshold,
                location: "Main Warehouse",
                severity: "low",
            });
            await rabbitMQ.publish(EXCHANGES.STOCK, EVENTS.STOCK_LOW, lowEvent);
            logger.warn(`🟡 LOW STOCK: ${product.sku} - ${newQuantity} units remaining`);
        }
    } catch (error) {
        logger.error(`Failed to publish stock alert events: ${error.message}`);
    }

    res.status(201).json({
        success: true,
        message: "Stock exit recorded successfully",
        movement,
        currentStock: stockLevel.currentQuantity,
        ...(product._isFallback && {
            warning: "Product details unavailable — products service is down",
        }),
    });
});

// @desc    Get current stock level for a product
// @route   GET /api/stock/product/:id
// @access  Private (Admin, Manager)
export const getProductStockLevel = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const stockLevel = await StockLevel.getOrCreate(id);
    const recentMovements = await StockMovement.getByProduct(id, 10);

    res.json({
        success: true,
        productId: id,
        currentQuantity: stockLevel.currentQuantity,
        lastUpdated: stockLevel.lastUpdated,
        recentMovements,
    });
});

// @desc    Get stock movement history
// @route   GET /api/stock/movements
// @access  Private (Admin, Manager)
export const getStockMovements = asyncHandler(async (req, res) => {
    const { productId, type, limit = 50, page = 1 } = req.query;

    const filter = {};
    if (productId) filter.productId = productId;
    if (type) filter.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [movements, total] = await Promise.all([
        StockMovement.find(filter)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip(skip),
        StockMovement.countDocuments(filter),
    ]);

    res.json({
        success: true,
        movements,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
        },
    });
});

// @desc    Get low stock alerts
// @route   GET /api/stock/alerts
// @access  Private (Admin, Manager)
export const getLowStockAlerts = asyncHandler(async (req, res) => {
    const threshold =
        parseInt(req.query.threshold) ||
        parseInt(process.env.DEFAULT_LOW_STOCK_THRESHOLD) ||
        10;

    const lowStockItems = await StockLevel.getLowStock(threshold);
    const token = req.cookies?.accessToken;

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

    res.json({
        success: true,
        count: alerts.length,
        threshold,
        alerts,
        ...(failedCount > 0 && {
            warning: `${failedCount} item(s) could not be fully resolved`,
        }),
    });
});

// @desc    Get stock summary / statistics
// @route   GET /api/stock/summary
// @access  Private (Admin, Manager)
export const getStockSummary = asyncHandler(async (req, res) => {
    const threshold = parseInt(process.env.DEFAULT_LOW_STOCK_THRESHOLD) || 10;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalProducts, totalQuantityAgg, lowStockCount, recentMovementsCount] =
        await Promise.all([
            StockLevel.countDocuments(),
            StockLevel.aggregate([{ $group: { _id: null, total: { $sum: "$currentQuantity" } } }]),
            StockLevel.countDocuments({ currentQuantity: { $lte: threshold } }),
            StockMovement.countDocuments({ timestamp: { $gte: yesterday } }),
        ]);

    res.json({
        success: true,
        summary: {
            totalProducts,
            totalQuantity: totalQuantityAgg[0]?.total || 0,
            lowStockCount,
            recentMovementsCount,
        },
    });
});

export { productsBreaker };