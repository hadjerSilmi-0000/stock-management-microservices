import Joi from "joi";

export const createSupplierSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            "string.empty": "Supplier name is required",
            "string.min": "Name must be at least 2 characters",
            "string.max": "Name cannot exceed 100 characters",
        }),

    contactPerson: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            "string.empty": "Contact person is required",
            "string.min": "Contact person must be at least 2 characters",
            "string.max": "Contact person cannot exceed 100 characters",
        }),

    email: Joi.string()
        .email()
        .required()
        .messages({
            "string.empty": "Email is required",
            "string.email": "Invalid email format",
        }),

    phone: Joi.string()
        .pattern(/^[\d\s\-\+\(\)]+$/)
        .required()
        .messages({
            "string.empty": "Phone number is required",
            "string.pattern.base": "Invalid phone number format",
        }),

    address: Joi.string()
        .max(500)
        .required()
        .messages({
            "string.empty": "Address is required",
            "string.max": "Address cannot exceed 500 characters",
        }),
});

export const updateSupplierSchema = Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    contactPerson: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().pattern(/^[\d\s\-\+\(\)]+$/).optional(),
    address: Joi.string().max(500).optional(),
}).min(1); 