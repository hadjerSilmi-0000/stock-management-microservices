/**
 * Stock Controller
 * All inter-service calls go through circuit breakers so a downstream
 * failure (Products service down) never crashes the Stock service.
 *
 * services/stock/src/controllers/stockController.js
 */

import StockMovement, { MOVEMENT_TYPES } from "../models/stockMovementModel.js";
import StockLevel from "../models/stockLevelModel.js";
import logger from "../utils/logger.js";
import { getCircuitBreaker } from "../../shared/utils/circuitBreaker.js";
import { asyncHandler } from "../utils/errors.js";

const PRODUCTS_SERVICE_URL =
    process.env.PRODUCTS_SERVICE_URL || "http://localhost:5002";

// ─── Circuit Breakers ────────────────────────────────────────────────────────
// Defined once at module level so the state (OPEN/CLOSED) persists across
// requests and stats keep accumulating.

const productsBreaker = getCircuitBreaker(
    "products-service",
    {
        timeout: 5000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        volumeThreshold: 3,
    },
    // Fallback: return a minimal object so the stock operation can continue
    () => ({
        _isFallback: true,
        name: "Unknown (products-service unavailable)",
        sku: "N/A",
        lowStockThreshold: parseInt(process.env.DEFAULT_LOW_STOCK_THRESHOLD) || 10,
    })
);

// ─── Helper ──────────────────────────────────────────────────────────────────
/**
 * Fetch product info from the Products service.
 * Returns fallback object if the circuit is open or the call fails.
 */
async function getProductInfo(productId, token) {
    try {
        const data = await productsBreaker.execute({
            method: "GET",
            url: `${PRODUCTS_SERVICE_URL}/api/products/${productId}`,
            headers: {
                Cookie: `accessToken=${token}`,
            },
            timeout: 5000,
        });

        // Products service returns { success, data: product }
        return data?.data || data?.product || null;
    } catch (error) {
        logger.error(
            `[StockController] getProductInfo failed for ${productId}: ${error.message}`
        );
        // Fallback already handled by circuit breaker — if we reach here
        // the fallback itself threw (shouldn't happen with our config).
        return null;
    }
}

// ─── Controllers ─────────────────────────────────────────────────────────────

// @desc    Add stock entry
// @route   POST /api/stock/entry
// @access  Private (Admin, Manager)
export const addStockEntry = asyncHandler(async (req, res) => {
    const { productId, quantity, reason, reference } = req.body;

    const token = req.cookies?.accessToken;
    const product = await getProductInfo(productId, token);

    // If fallback was used, _isFallback is true — product exists but service
    // is down. We still allow the stock operation to proceed.
    if (!product) {
        return res.status(404).json({
            success: false,
            message: "Product not found",
        });
    }

    if (product._isFallback) {
        logger.warn(
            `[StockController] addStockEntry: using fallback for product ${productId}`
        );
    }

    const stockLevel = await StockLevel.getOrCreate(productId);

    const movement = await StockMovement.create({
        productId,
        type: MOVEMENT_TYPES.ENTRY,
        quantity,
        reason,
        reference,
        performedBy: req.user.id,
    });

    await stockLevel.updateQuantity(quantity);

    logger.info(
        `Stock entry: ${quantity} units of ${productId} by user ${req.user.id}`
    );

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
        logger.warn(
            `[StockController] removeStockExit: using fallback for product ${productId}`
        );
    }

    const stockLevel = await StockLevel.getOrCreate(productId);

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

    logger.info(
        `Stock exit: ${quantity} units of ${productId} by user ${req.user.id}`
    );

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

    // Use Promise.allSettled so one failed lookup doesn't abort everything
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
    const threshold =
        parseInt(process.env.DEFAULT_LOW_STOCK_THRESHOLD) || 10;

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

// ─── Export breaker for health route ─────────────────────────────────────────
export { productsBreaker };