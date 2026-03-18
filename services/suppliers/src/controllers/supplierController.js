import Supplier from "../models/supplierModel.js";
import logger from "../utils/logger.js";
import { asyncHandler, ConflictError, NotFoundError, BadRequestError } from "../utils/errors.js";
import { sendSuccess, buildPagination } from "../../../shared/utils/sendResponse.js";
import { parsePaginationParams } from "../utils/pagination.js";

// @desc    Create new supplier
// @route   POST /api/v1/suppliers
// @access  Private (Admin, Manager)
export const createSupplier = asyncHandler(async (req, res) => {
    const { name, contactPerson, email, phone, address } = req.body;

    const existingSupplier = await Supplier.findOne({ email });
    if (existingSupplier) {
        throw new ConflictError("Supplier with this email", "SUPPLIER_ALREADY_EXISTS");
    }

    const supplier = await Supplier.create({
        name,
        contactPerson,
        email,
        phone,
        address,
        createdBy: req.user.id,
    });

    logger.info(`Supplier created: ${supplier.name} by user ${req.user.id}`);

    return sendSuccess(res, 201, supplier, "Supplier created successfully");
});

// @desc    Get all suppliers
// @route   GET /api/v1/suppliers
// @access  Private (Admin, Manager)
export const getAllSuppliers = asyncHandler(async (req, res) => {
    const filter = req.user.role === "admin" ? {} : { isActive: true };

    const { page, limit, skip } = parsePaginationParams(req.query);

    const [suppliers, total] = await Promise.all([
        Supplier.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Supplier.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, suppliers, null, buildPagination(page, limit, total));
});

// @desc    Get single supplier by ID
// @route   GET /api/v1/suppliers/:id
// @access  Private (Admin, Manager)
export const getSupplierById = asyncHandler(async (req, res) => {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
        throw new NotFoundError("Supplier", "SUPPLIER_NOT_FOUND");
    }

    if (req.user.role === "manager" && !supplier.isActive) {
        throw new NotFoundError("Supplier", "SUPPLIER_NOT_FOUND");
    }

    return sendSuccess(res, 200, supplier);
});

// @desc    Update supplier
// @route   PUT /api/v1/suppliers/:id
// @access  Private (Admin, Manager)
export const updateSupplier = asyncHandler(async (req, res) => {
    const allowedUpdates = ["name", "contactPerson", "email", "phone", "address"];

    const updates = {};
    for (let key of allowedUpdates) {
        if (req.body[key] !== undefined) {
            updates[key] = req.body[key];
        }
    }

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

    return sendSuccess(res, 200, supplier, "Supplier updated successfully");
});

// @desc    Delete supplier (soft delete)
// @route   DELETE /api/v1/suppliers/:id
// @access  Private (Admin only)
export const deleteSupplier = asyncHandler(async (req, res) => {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
        throw new NotFoundError("Supplier", "SUPPLIER_NOT_FOUND");
    }

    await supplier.softDelete();

    logger.info(`Supplier soft-deleted: ${supplier.name} by user ${req.user.id}`);

    return sendSuccess(res, 200, null, "Supplier deleted successfully");
});

// @desc    Search suppliers
// @route   GET /api/v1/suppliers/search?q=query
// @access  Private (Admin, Manager)
export const searchSuppliers = asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q || q.trim() === "") {
        throw new BadRequestError("Search query is required", "INVALID_INPUT");
    }

    const { page, limit, skip } = parsePaginationParams(req.query);
    const filter = req.user.role === "admin" ? {} : { isActive: true };

    filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { contactPerson: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
    ];

    const [suppliers, total] = await Promise.all([
        Supplier.find(filter).skip(skip).limit(limit),
        Supplier.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, suppliers, null, buildPagination(page, limit, total));
});

// @desc    Get active suppliers only
// @route   GET /api/v1/suppliers/active
// @access  Private (Admin, Manager)
export const getActiveSuppliers = asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePaginationParams(req.query);

    const [suppliers, total] = await Promise.all([
        Supplier.findActive().sort({ name: 1 }).skip(skip).limit(limit),
        Supplier.countDocuments({ isActive: true }),
    ]);

    return sendSuccess(res, 200, suppliers, null, buildPagination(page, limit, total));
});
