import Joi from "joi";

export const stockEntrySchema = Joi.object({
    productId: Joi.string()
        .required()
        .messages({
            "string.empty": "Product ID is required",
            "any.required": "Product ID is required",
        }),

    quantity: Joi.number()
        .integer()
        .min(1)
        .required()
        .messages({
            "number.base": "Quantity must be a number",
            "number.min": "Quantity must be at least 1",
            "any.required": "Quantity is required",
        }),

    reason: Joi.string()
        .max(200)
        .required()
        .messages({
            "string.empty": "Reason is required",
            "string.max": "Reason cannot exceed 200 characters",
            "any.required": "Reason is required",
        }),

    reference: Joi.string()
        .max(100)
        .allow("", null)
        .optional()
        .messages({
            "string.max": "Reference cannot exceed 100 characters",
        }),
});

export const stockExitSchema = stockEntrySchema;