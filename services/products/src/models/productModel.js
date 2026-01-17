import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Product name is required"],
            trim: true,
            minlength: [2, "Name must be at least 2 characters"],
            maxlength: [100, "Name cannot exceed 100 characters"],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, "Description cannot exceed 500 characters"],
        },
        category: {
            type: String,
            required: [true, "Category is required"],
            trim: true,
            enum: {
                values: ["Electronics", "Furniture", "Clothing", "Food", "Tools", "Other"],
                message: "{VALUE} is not a valid category",
            },
        },
        price: {
            type: Number,
            required: [true, "Price is required"],
            min: [0, "Price cannot be negative"],
        },
        sku: {
            type: String,
            required: [true, "SKU is required"],
            unique: true,
            trim: true,
            uppercase: true,
        },
        supplierId: {
            type: String,
            required: [true, "Supplier ID is required"],
        },
        lowStockThreshold: {
            type: Number,
            default: 10,
            min: [0, "Threshold cannot be negative"],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: String, // userId from Users Service
            required: true,
        },
    },
    {
        timestamps: true, // adds createdAt and updatedAt
    }
);

// Indexes for better query performance
productSchema.index({ sku: 1 });
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ name: "text", description: "text" }); // Text search

// Instance method: Soft delete
productSchema.methods.softDelete = async function () {
    this.isActive = false;
    return await this.save();
};

// Static method: Find active products
productSchema.statics.findActive = function () {
    return this.find({ isActive: true });
};

// Static method: Search products
productSchema.statics.searchProducts = function (query) {
    return this.find({
        $or: [
            { name: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
            { sku: { $regex: query, $options: "i" } },
        ],
    });
};

const Product = mongoose.model("Product", productSchema);

export default Product;