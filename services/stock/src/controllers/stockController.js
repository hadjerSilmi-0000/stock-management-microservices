import StockMovement, { MOVEMENT_TYPES } from "../models/stockMovementModel.js";
import StockLevel from "../models/stockLevelModel.js";
import logger from "../utils/logger.js";
import axios from "axios";

const PRODUCTS_SERVICE_URL = process.env.PRODUCTS_SERVICE_URL || "http://localhost:5002";

async function getProductInfo(productId, token) {
    try {
        const response = await axios.get(`${PRODUCTS_SERVICE_URL}/api/products/${productId}`, {
            headers: {
                Cookie: `accessToken=${token}`,
            },
        });
        return response.data.product;
    } catch (error) {
        logger.error(`Failed to fetch product ${productId}: ${error.message}`);
        return null;
    }
}

// @desc    Add stock entry
// @route   POST /api/stock/entry
// @access  Private (Admin, Manager)
export const addStockEntry = async (req, res, next) => {
    try {
        const { productId, quantity, reason, reference } = req.body;

        // Verify product exists
        const token = req.cookies?.accessToken;
        const product = await getProductInfo(productId, token);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        // Get or create stock level
        const stockLevel = await StockLevel.getOrCreate(productId);

        // Create movement record
        const movement = await StockMovement.create({
            productId,
            type: MOVEMENT_TYPES.ENTRY,
            quantity,
            reason,
            reference,
            performedBy: req.user.id,
        });

        // Update stock level
        await stockLevel.updateQuantity(quantity);

        logger.info(`Stock entry: ${quantity} units of ${productId} by user ${req.user.id}`);

        res.status(201).json({
            success: true,
            message: "Stock entry recorded successfully",
            movement,
            currentStock: stockLevel.currentQuantity,
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Remove stock (exit)
// @route   POST /api/stock/exit
// @access  Private (Admin, Manager)
export const removeStockExit = async (req, res, next) => {
    try {
        const { productId, quantity, reason, reference } = req.body;

        // Verify product exists
        const token = req.cookies?.accessToken;
        const product = await getProductInfo(productId, token);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        // Get stock level
        const stockLevel = await StockLevel.getOrCreate(productId);

        // Check if sufficient stock
        if (stockLevel.currentQuantity < quantity) {
            return res.status(400).json({
                success: false,
                message: "Insufficient stock",
                available: stockLevel.currentQuantity,
                requested: quantity,
            });
        }

        // Create movement record
        const movement = await StockMovement.create({
            productId,
            type: MOVEMENT_TYPES.EXIT,
            quantity,
            reason,
            reference,
            performedBy: req.user.id,
        });

        // Update stock level
        await stockLevel.updateQuantity(-quantity);

        logger.info(`Stock exit: ${quantity} units of ${productId} by user ${req.user.id}`);

        res.status(201).json({
            success: true,
            message: "Stock exit recorded successfully",
            movement,
            currentStock: stockLevel.currentQuantity,
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get current stock level for a product
// @route   GET /api/stock/product/:id
// @access  Private (Admin, Manager)
export const getProductStockLevel = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Get stock level
        const stockLevel = await StockLevel.getOrCreate(id);

        // Get recent movements
        const recentMovements = await StockMovement.getByProduct(id, 10);

        res.json({
            success: true,
            productId: id,
            currentQuantity: stockLevel.currentQuantity,
            lastUpdated: stockLevel.lastUpdated,
            recentMovements,
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get stock movement history
// @route   GET /api/stock/movements
// @access  Private (Admin, Manager)
export const getStockMovements = async (req, res, next) => {
    try {
        const { productId, type, limit = 50, page = 1 } = req.query;

        const filter = {};
        if (productId) filter.productId = productId;
        if (type) filter.type = type;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const movements = await StockMovement.find(filter)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await StockMovement.countDocuments(filter);

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
    } catch (err) {
        next(err);
    }
};

// @desc    Get low stock alerts
// @route   GET /api/stock/alerts
// @access  Private (Admin, Manager)
export const getLowStockAlerts = async (req, res, next) => {
    try {
        const threshold = parseInt(req.query.threshold) ||
            parseInt(process.env.DEFAULT_LOW_STOCK_THRESHOLD) || 10;

        // Get all low stock items
        const lowStockItems = await StockLevel.getLowStock(threshold);

        // Fetch product details for each low stock item
        const token = req.cookies?.accessToken;
        const alerts = await Promise.all(
            lowStockItems.map(async (item) => {
                const product = await getProductInfo(item.productId, token);
                return {
                    productId: item.productId,
                    productName: product?.name || "Unknown",
                    sku: product?.sku || "N/A",
                    currentQuantity: item.currentQuantity,
                    threshold: product?.lowStockThreshold || threshold,
                    lastUpdated: item.lastUpdated,
                };
            })
        );

        res.json({
            success: true,
            count: alerts.length,
            threshold,
            alerts,
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get stock summary/statistics
// @route   GET /api/stock/summary
// @access  Private (Admin, Manager)
export const getStockSummary = async (req, res, next) => {
    try {
        // Total products with stock
        const totalProducts = await StockLevel.countDocuments();

        // Total stock value (sum of all quantities)
        const totalQuantity = await StockLevel.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: "$currentQuantity" },
                },
            },
        ]);

        // Low stock count
        const threshold = parseInt(process.env.DEFAULT_LOW_STOCK_THRESHOLD) || 10;
        const lowStockCount = await StockLevel.countDocuments({
            currentQuantity: { $lte: threshold },
        });

        // Recent movements count (last 24 hours)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentMovementsCount = await StockMovement.countDocuments({
            timestamp: { $gte: yesterday },
        });

        res.json({
            success: true,
            summary: {
                totalProducts,
                totalQuantity: totalQuantity[0]?.total || 0,
                lowStockCount,
                recentMovementsCount,
            },
        });
    } catch (err) {
        next(err);
    }
};