import logger from "../utils/logger.js";
import {
    createPaginationResponse,
    parseSortParams,
    parseFieldsParams,
    buildFilterQuery,
} from "../utils/pagination.js";
import {
    NotFoundError,
    ConflictError,
    BadRequestError,
    asyncHandler,
} from "../utils/errors.js";

// @desc    Create new product
// @route   POST /api/v1/products
// @access  Private (Admin, Manager)
export const createProduct = asyncHandler(async (req, res) => {
    const { name, description, category, price, sku, supplierId, lowStockThreshold } = req.body;

    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
        throw new ConflictError("Product with this SKU", "PRODUCT_ALREADY_EXISTS");
    }

    const product = await Product.create({
        name,
        description,
        category,
        price,
        sku,
        supplierId,
        lowStockThreshold,
        createdBy: req.user.id,
    });

    logger.info(`Product created: ${product.sku} by user ${req.user.id}`);

    res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: product,
    });
});

// @desc    Get all products with pagination, filtering, and sorting
// @route   GET /api/v1/products?page=1&limit=20&category=Electronics&sort=-price
// @access  Private (Admin, Manager)
export const getAllProducts = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;

    // Build filter query
    const allowedFilters = ['category', 'sku', 'name', 'supplierId', 'isActive'];
    const filter = buildFilterQuery(req.query, allowedFilters);

    // Role-based filtering
    if (req.user.role !== "admin") {
        filter.isActive = true;
    }

    // Parse sort and fields
    const sort = parseSortParams(req.query.sort);
    const fields = parseFieldsParams(req.query.fields);

    // Execute query
    const [products, total] = await Promise.all([
        Product.find(filter)
            .select(fields)
            .sort(sort)
            .skip(skip)
            .limit(limit),
        Product.countDocuments(filter),
    ]);

    res.json(createPaginationResponse(products, total, page, limit));
});

// @desc    Get single product by ID
// @route   GET /api/v1/products/:id
// @access  Private (Admin, Manager)
export const getProductById = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        throw new NotFoundError("Product", "PRODUCT_NOT_FOUND");
    }

    if (req.user.role === "manager" && !product.isActive) {
        throw new NotFoundError("Product", "PRODUCT_NOT_FOUND");
    }

    res.json({
        success: true,
        data: product,
    });
});

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private (Admin, Manager)
export const updateProduct = asyncHandler(async (req, res) => {
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

    if (req.body.sku) {
        throw new BadRequestError("SKU cannot be modified", "INVALID_SKU");
    }

    const product = await Product.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true }
    );

    if (!product) {
        throw new NotFoundError("Product", "PRODUCT_NOT_FOUND");
    }

    logger.info(`Product updated: ${product.sku} by user ${req.user.id}`);

    res.json({
        success: true,
        message: "Product updated successfully",
        data: product,
    });
});

// @desc    Delete product (soft delete)
// @route   DELETE /api/v1/products/:id
// @access  Private (Admin only)
export const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        throw new NotFoundError("Product", "PRODUCT_NOT_FOUND");
    }

    await product.softDelete();

    logger.info(`Product soft-deleted: ${product.sku} by user ${req.user.id}`);

    res.json({
        success: true,
        message: "Product deleted successfully",
    });
});

// @desc    Search products
// @route   GET /api/v1/products/search?q=query
// @access  Private (Admin, Manager)
export const searchProducts = asyncHandler(async (req, res) => {
    const { q } = req.query;
    const { page, limit, skip } = req.pagination;

    if (!q || q.trim() === "") {
        throw new BadRequestError("Search query is required", "INVALID_INPUT");
    }

    const filter = req.user.role === "admin" ? {} : { isActive: true };

    filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { sku: { $regex: q, $options: "i" } },
    ];

    const [products, total] = await Promise.all([
        Product.find(filter).skip(skip).limit(limit),
        Product.countDocuments(filter),
    ]);

    res.json(createPaginationResponse(products, total, page, limit));
});