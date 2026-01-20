import mongoose from "mongoose";

const stockLevelSchema = new mongoose.Schema(
    {
        productId: {
            type: String,
            required: [true, "Product ID is required"],
            unique: true,
            index: true,
        },
        currentQuantity: {
            type: Number,
            required: true,
            default: 0,
            min: [0, "Quantity cannot be negative"],
        },
        lastUpdated: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

stockLevelSchema.methods.updateQuantity = async function (delta) {
    this.currentQuantity += delta;
    if (this.currentQuantity < 0) {
        throw new Error("Insufficient stock");
    }
    this.lastUpdated = new Date();
    return await this.save();
};

stockLevelSchema.statics.getOrCreate = async function (productId) {
    let stockLevel = await this.findOne({ productId });
    if (!stockLevel) {
        stockLevel = await this.create({
            productId,
            currentQuantity: 0,
        });
    }
    return stockLevel;
};

stockLevelSchema.statics.getLowStock = async function (threshold = 10) {
    return this.find({
        currentQuantity: { $lte: threshold },
    }).sort({ currentQuantity: 1 });
};

const StockLevel = mongoose.model("StockLevel", stockLevelSchema);
export default StockLevel;