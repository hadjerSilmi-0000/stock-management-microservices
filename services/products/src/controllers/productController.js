import Product from "../models/productModel.js";
import logger from "../utils/logger.js";

// @desc    Create new product
// @route   POST /api/products
// @access  Private (Admin, Manager)
export const createProduct = async (req, res, next) => {
    try {
        const { name, description, category, price, sku, supplierId, lowStockThreshold } = req.body;

        // Check if SKU already exists
        const existingProduct = await Product.findOne({ sku });
        if (existingProduct) {
            return res.status(400).json({
                success: false,
                message: "Product with this SKU already exists",
            });
        }

        // Create product with createdBy from authenticated user
        const product = await Product.create({
            name,
            description,
            category,
            price,
            sku,
            supplierId,
            lowStockThreshold,
            createdBy: req.user.id, // From authMiddleware
        });

        logger.info(`Product created: ${product.sku} by user ${req.user.id}`);

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            product,
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get all products
// @route   GET /api/products
// @access  Private (Admin, Manager)
export const getAllProducts = async (req, res, next) => {
    try {
        // Admins see all products, Managers see only active
        const filter = req.user.role === "admin" ? {} : { isActive: true };

        const products = await Product.find(filter).sort({ createdAt: -1 });

        res.json({
            success: true,
            count: products.length,
            products,
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Private (Admin, Manager)
export const getProductById = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        // Managers can only see active products
        if (req.user.role === "manager" && !product.isActive) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        res.json({
            success: true,
            product,
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Admin, Manager)
export const updateProduct = async (req, res, next) => {
    try {
        const allowedUpdates = [
            "name",
            "description",
            "category",
            "price",
            "supplierId",
            "lowStockThreshold",
        ];

        const updates = {};
        for (let key of allowedUpdates) {
            if (req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        }

        // SKU cannot be updated
        if (req.body.sku) {
            return res.status(400).json({
                success: false,
                message: "SKU cannot be modified",
            });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        logger.info(`Product updated: ${product.sku} by user ${req.user.id}`);

        res.json({
            success: true,
            message: "Product updated successfully",
            product,
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete product (soft delete)
// @route   DELETE /api/products/:id
// @access  Private (Admin only)
export const deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        // Soft delete
        await product.softDelete();

        logger.info(`Product soft-deleted: ${product.sku} by user ${req.user.id}`);

        res.json({
            success: true,
            message: "Product deleted successfully",
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Search products
// @route   GET /api/products/search?q=query
// @access  Private (Admin, Manager)
export const searchProducts = async (req, res, next) => {
    try {
        const { q } = req.query;

        if (!q || q.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Search query is required",
            });
        }

        const filter = req.user.role === "admin" ? {} : { isActive: true };

        const products = await Product.find({
            ...filter,
            $or: [
                { name: { $regex: q, $options: "i" } },
                { description: { $regex: q, $options: "i" } },
                { sku: { $regex: q, $options: "i" } },
            ],
        });

        res.json({
            success: true,
            count: products.length,
            products,
        });
    } catch (err) {
        next(err);
    }
};