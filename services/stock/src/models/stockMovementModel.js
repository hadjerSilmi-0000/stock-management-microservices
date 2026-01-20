import mongoose from "mongoose";

export const MOVEMENT_TYPES = {
    ENTRY: "entry",
    EXIT: "exit",
};

const stockMovementSchema = new mongoose.Schema(
    {
        productId: {
            type: String,
            required: [true, "Product ID is required"],
            index: true,
        },
        type: {
            type: String,
            enum: Object.values(MOVEMENT_TYPES),
            required: [true, "Movement type is required"],
        },
        quantity: {
            type: Number,
            required: [true, "Quantity is required"],
            min: [1, "Quantity must be positive"],
        },
        reason: {
            type: String,
            required: [true, "Reason is required"],
            trim: true,
            maxlength: [200, "Reason cannot exceed 200 characters"],
        },
        reference: {
            type: String,
            trim: true,
            maxlength: [100, "Reference cannot exceed 100 characters"],
        },
        performedBy: {
            type: String,
            required: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);


stockMovementSchema.index({ productId: 1, timestamp: -1 });
stockMovementSchema.index({ type: 1, timestamp: -1 });
stockMovementSchema.index({ performedBy: 1 });


stockMovementSchema.statics.getByProduct = function (productId, limit = 50) {
    return this.find({ productId })
        .sort({ timestamp: -1 })
        .limit(limit);
};

stockMovementSchema.statics.getByType = function (type, limit = 50) {
    return this.find({ type })
        .sort({ timestamp: -1 })
        .limit(limit);
};

const StockMovement = mongoose.model("StockMovement", stockMovementSchema);
export default StockMovement;