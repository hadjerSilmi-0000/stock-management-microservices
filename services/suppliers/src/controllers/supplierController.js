import Supplier from "../models/supplierModel.js";
import logger from "../utils/logger.js";
import { asyncHandler, ConflictError, NotFoundError, BadRequestError } from "../utils/errors.js";

// @desc    Create new supplier
// @route   POST /api/suppliers
// @access  Private (Admin, Manager)
export const createSupplier = asyncHandler(async (req, res) => {
    const { name, contactPerson, email, phone, address } = req.body;

    // Check if email already exists
    const existingSupplier = await Supplier.findOne({ email });
    if (existingSupplier) {
        throw new ConflictError("Supplier with this email", "SUPPLIER_ALREADY_EXISTS");
    }

    // Create supplier with createdBy from authenticated user
    const supplier = await Supplier.create({
        name,
        contactPerson,
        email,
        phone,
        address,
        createdBy: req.user.id,
    });

    logger.info(`Supplier created: ${supplier.name} by user ${req.user.id}`);

    res.status(201).json({
        success: true,
        message: "Supplier created successfully",
        supplier,
    });
});

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private (Admin, Manager)
export const getAllSuppliers = asyncHandler(async (req, res) => {
    // Admins see all suppliers, Managers see only active
    const filter = req.user.role === "admin" ? {} : { isActive: true };

    const suppliers = await Supplier.find(filter).sort({ createdAt: -1 });

    res.json({
        success: true,
        count: suppliers.length,
        suppliers,
    });
});

// @desc    Get single supplier by ID
// @route   GET /api/suppliers/:id
// @access  Private (Admin, Manager)
export const getSupplierById = asyncHandler(async (req, res) => {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
        throw new NotFoundError("Supplier", "SUPPLIER_NOT_FOUND");
    }

    // Managers can only see active suppliers
    if (req.user.role === "manager" && !supplier.isActive) {
        throw new NotFoundError("Supplier", "SUPPLIER_NOT_FOUND");
    }

    res.json({
        success: true,
        supplier,
    });
});

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Private (Admin, Manager)
export const updateSupplier = asyncHandler(async (req, res) => {
    const allowedUpdates = [
        "name",
        "contactPerson",
        "email",
        "phone",
        "address",
    ];

    const updates = {};
    for (let key of allowedUpdates) {
        if (req.body[key] !== undefined) {
            updates[key] = req.body[key];
        }
    }

    // Check if updating email to an existing one
    if (updates.email) {
        const existingSupplier = await Supplier.findOne({
            email: updates.email,
            _id: { $ne: req.params.id },
        });
        if (existingSupplier) {
            throw new ConflictError("Email already in use by another supplier", "SUPPLIER_ALREADY_EXISTS");
        }
    }

    const supplier = await Supplier.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true }
    );

    if (!supplier) {
        throw new NotFoundError("Supplier", "SUPPLIER_NOT_FOUND");
    }

    logger.info(`Supplier updated: ${supplier.name} by user ${req.user.id}`);

    res.json({
        success: true,
        message: "Supplier updated successfully",
        supplier,
    });
});

// @desc    Delete supplier (soft delete)
// @route   DELETE /api/suppliers/:id
// @access  Private (Admin only)
export const deleteSupplier = asyncHandler(async (req, res) => {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
        throw new NotFoundError("Supplier", "SUPPLIER_NOT_FOUND");
    }

    // Soft delete
    await supplier.softDelete();

    logger.info(`Supplier soft-deleted: ${supplier.name} by user ${req.user.id}`);

    res.json({
        success: true,
        message: "Supplier deleted successfully",
    });
});

// @desc    Search suppliers
// @route   GET /api/suppliers/search?q=query
// @access  Private (Admin, Manager)
export const searchSuppliers = asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q || q.trim() === "") {
        throw new BadRequestError("Search query is required", "INVALID_INPUT");
    }

    const filter = req.user.role === "admin" ? {} : { isActive: true };

    const suppliers = await Supplier.find({
        ...filter,
        $or: [
            { name: { $regex: q, $options: "i" } },
            { contactPerson: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
        ],
    });

    res.json({
        success: true,
        count: suppliers.length,
        suppliers,
    });
});

// @desc    Get active suppliers only
// @route   GET /api/suppliers/active
// @access  Private (Admin, Manager)
export const getActiveSuppliers = asyncHandler(async (req, res) => {
    const suppliers = await Supplier.findActive().sort({ name: 1 });

    res.json({
        success: true,
        count: suppliers.length,
        suppliers,
    });
});