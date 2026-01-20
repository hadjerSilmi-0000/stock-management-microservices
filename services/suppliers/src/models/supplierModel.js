import mongoose from "mongoose";
import validator from "validator";

const supplierSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Supplier name is required"],
            trim: true,
            minlength: [2, "Name must be at least 2 characters"],
            maxlength: [100, "Name cannot exceed 100 characters"],
        },
        contactPerson: {
            type: String,
            required: [true, "Contact person is required"],
            trim: true,
            minlength: [2, "Contact person must be at least 2 characters"],
            maxlength: [100, "Contact person cannot exceed 100 characters"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            validate: {
                validator: validator.isEmail,
                message: "Invalid email format",
            },
            index: true,
        },
        phone: {
            type: String,
            required: [true, "Phone number is required"],
            trim: true,
            validate: {
                validator: function (v) {
                    // Accepts various phone formats: +1234567890, 123-456-7890, (123) 456-7890, etc.
                    return /^[\d\s\-\+\(\)]+$/.test(v);
                },
                message: "Invalid phone number format",
            },
        },
        address: {
            type: String,
            required: [true, "Address is required"],
            trim: true,
            maxlength: [500, "Address cannot exceed 500 characters"],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

supplierSchema.index({ name: 1 });
supplierSchema.index({ email: 1 });
supplierSchema.index({ isActive: 1 });
supplierSchema.index({ name: "text", contactPerson: "text" }); // Text search

supplierSchema.methods.softDelete = async function () {
    this.isActive = false;
    return await this.save();
};

supplierSchema.statics.findActive = function () {
    return this.find({ isActive: true });
};

supplierSchema.statics.searchSuppliers = function (query) {
    return this.find({
        $or: [
            { name: { $regex: query, $options: "i" } },
            { contactPerson: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
        ],
    });
};

const Supplier = mongoose.model("Supplier", supplierSchema);

export default Supplier;