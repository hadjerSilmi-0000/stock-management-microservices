import mongoose from 'mongoose';

/**
 * Validates MongoDB ObjectId in route parameters
 * @param {string} paramName - The name of the parameter to validate (default: 'id')
 */
export const validateObjectId = (paramName = 'id') => {
    return (req, res, next) => {
        const id = req.params[paramName];

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_OBJECT_ID',
                    message: `Invalid ${paramName} format. Must be a valid MongoDB ObjectId.`,
                    timestamp: new Date().toISOString()
                }
            });
        }

        next();
    };
};

/**
 * Validates multiple ObjectId parameters
 * @param {string[]} paramNames - Array of parameter names to validate
 */
export const validateObjectIds = (...paramNames) => {
    return (req, res, next) => {
        for (const paramName of paramNames) {
            const id = req.params[paramName];

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_OBJECT_ID',
                        message: `Invalid ${paramName} format. Must be a valid MongoDB ObjectId.`,
                        timestamp: new Date().toISOString()
                    }
                });
            }
        }

        next();
    };
};