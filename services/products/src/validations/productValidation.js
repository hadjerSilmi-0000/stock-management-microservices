import Joi from "joi";

// Create Product Schema
export const createProductSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            "string.empty": "Product name is required",
            "string.min": "Name must be at least 2 characters",
            "string.max": "Name cannot exceed 100 characters",
        }),

    description: Joi.string()
        .max(500)
        .allow("", null)
        .messages({
            "string.max": "Description cannot exceed 500 characters",
        }),

    category: Joi.string()
        .valid("Electronics", "Furniture", "Clothing", "Food", "Tools", "Other")
        .required()
        .messages({
            "any.only": "Category must be one of: Electronics, Furniture, Clothing, Food, Tools, Other",
            "string.empty": "Category is required",
        }),

    price: Joi.number()
        .min(0)
        .required()
        .messages({
            "number.base": "Price must be a number",
            "number.min": "Price cannot be negative",
            "any.required": "Price is required",
        }),

    sku: Joi.string()
        .uppercase()
        .trim()
        .pattern(/^[A-Z0-9-]+$/)
        .required()
        .messages({
            "string.empty": "SKU is required",
            "string.pattern.base": "SKU must contain only uppercase letters, numbers, and hyphens",
        }),

    supplierId: Joi.string()
        .required()
        .messages({
            "string.empty": "Supplier ID is required",
        }),

    lowStockThreshold: Joi.number()
        .min(0)
        .default(10)
        .messages({
            "number.min": "Low stock threshold cannot be negative",
        }),
});

// Update Product Schema (all fields optional)
export const updateProductSchema = Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).allow("", null).optional(),
    category: Joi.string()
        .valid("Electronics", "Furniture", "Clothing", "Food", "Tools", "Other")
        .optional(),
    price: Joi.number().min(0).optional(),
    supplierId: Joi.string().optional(),
    lowStockThreshold: Joi.number().min(0).optional(),
}).min(1); // At least one field must be provided