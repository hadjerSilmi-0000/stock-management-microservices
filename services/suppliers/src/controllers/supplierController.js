import Supplier from "../models/supplierModel.js";
import logger from "../utils/logger.js";

// @desc    Create new supplier
// @route   POST /api/suppliers
// @access  Private (Admin, Manager)
export const createSupplier = async (req, res, next) => {
    try {
        const { name, contactPerson, email, phone, address } = req.body;

        // Check if email already exists
        const existingSupplier = await Supplier.findOne({ email });
        if (existingSupplier) {
            return res.status(400).json({
                success: false,
                message: "Supplier with this email already exists",
            });
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
    } catch (err) {
        next(err);
    }
};

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private (Admin, Manager)
export const getAllSuppliers = async (req, res, next) => {
    try {
        // Admins see all suppliers, Managers see only active
        const filter = req.user.role === "admin" ? {} : { isActive: true };

        const suppliers = await Supplier.find(filter).sort({ createdAt: -1 });

        res.json({
            success: true,
            count: suppliers.length,
            suppliers,
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get single supplier by ID
// @route   GET /api/suppliers/:id
// @access  Private (Admin, Manager)
export const getSupplierById = async (req, res, next) => {
    try {
        const supplier = await Supplier.findById(req.params.id);

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
        }

        // Managers can only see active suppliers
        if (req.user.role === "manager" && !supplier.isActive) {
            return res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
        }

        res.json({
            success: true,
            supplier,
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Private (Admin, Manager)
export const updateSupplier = async (req, res, next) => {
    try {
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
                return res.status(400).json({
                    success: false,
                    message: "Email already in use by another supplier",
                });
            }
        }

        const supplier = await Supplier.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
        }

        logger.info(`Supplier updated: ${supplier.name} by user ${req.user.id}`);

        res.json({
            success: true,
            message: "Supplier updated successfully",
            supplier,
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete supplier (soft delete)
// @route   DELETE /api/suppliers/:id
// @access  Private (Admin only)
export const deleteSupplier = async (req, res, next) => {
    try {
        const supplier = await Supplier.findById(req.params.id);

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
        }

        // Soft delete
        await supplier.softDelete();

        logger.info(`Supplier soft-deleted: ${supplier.name} by user ${req.user.id}`);

        res.json({
            success: true,
            message: "Supplier deleted successfully",
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Search suppliers
// @route   GET /api/suppliers/search?q=query
// @access  Private (Admin, Manager)
export const searchSuppliers = async (req, res, next) => {
    try {
        const { q } = req.query;

        if (!q || q.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Search query is required",
            });
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
    } catch (err) {
        next(err);
    }
};

// @desc    Get active suppliers only
// @route   GET /api/suppliers/active
// @access  Private (Admin, Manager)
export const getActiveSuppliers = async (req, res, next) => {
    try {
        const suppliers = await Supplier.findActive().sort({ name: 1 });

        res.json({
            success: true,
            count: suppliers.length,
            suppliers,
        });
    } catch (err) {
        next(err);
    }
};