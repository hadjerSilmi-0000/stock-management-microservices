/**
 * Complete Database Seeder
 * Run from project root: node scripts/seed.js
 * Seeds: users_db, suppliers_db, products_db, stock_db
 */

import mongoose from "mongoose";
import bcrypt from "bcrypt";

const USERS_URI = "mongodb://localhost:27017/users_db";
const SUPPLIERS_URI = "mongodb://localhost:27017/suppliers_db";
const PRODUCTS_URI = "mongodb://localhost:27017/products_db";
const STOCK_URI = "mongodb://localhost:27017/stock_db";

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "manager"], default: "manager" },
    status: { type: String, enum: ["active", "inactive", "pending"], default: "active" },
    emailVerified: { type: Boolean, default: true },
}, { timestamps: true });

// Hash password before save — mirrors the real userModel
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

const supplierSchema = new mongoose.Schema({
    name: { type: String, required: true },
    contactPerson: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
}, { timestamps: true });

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    category: { type: String, required: true, enum: ["Electronics", "Furniture", "Clothing", "Food", "Tools", "Other"] },
    price: { type: Number, required: true },
    sku: { type: String, required: true, unique: true, uppercase: true },
    supplierId: { type: String, required: true },
    lowStockThreshold: { type: Number, default: 10 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
}, { timestamps: true });

const stockLevelSchema = new mongoose.Schema({
    productId: { type: String, required: true, unique: true },
    currentQuantity: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
}, { timestamps: true });

const stockMovementSchema = new mongoose.Schema({
    productId: { type: String, required: true },
    type: { type: String, enum: ["entry", "exit"], required: true },
    quantity: { type: Number, required: true },
    reason: { type: String, required: true },
    reference: { type: String },
    performedBy: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

const USERS_DATA = [
    { username: "admin", email: "admin@stockmanager.com", password: "Admin@123", role: "admin", status: "active" },
    { username: "sarah_manager", email: "sarah@stockmanager.com", password: "Manager@123", role: "manager", status: "active" },
    { username: "john_ops", email: "john@stockmanager.com", password: "Manager@123", role: "manager", status: "active" },
    { username: "lisa_inv", email: "lisa@stockmanager.com", password: "Manager@123", role: "manager", status: "active" },
    { username: "mike_stock", email: "mike@stockmanager.com", password: "Manager@123", role: "manager", status: "active" },
    { username: "emma_supply", email: "emma@stockmanager.com", password: "Manager@123", role: "manager", status: "active" },
    { username: "david_mgr", email: "david@stockmanager.com", password: "Manager@123", role: "manager", status: "active" },
    { username: "anna_ops", email: "anna@stockmanager.com", password: "Manager@123", role: "manager", status: "active" },
];

const SUPPLIERS_DATA = [
    { name: "TechVision Electronics", contactPerson: "Robert Chen", email: "robert@techvision.com", phone: "+1-555-0101", address: "123 Silicon Valley Blvd, San Jose, CA 95101" },
    { name: "GlobalFurniture Co.", contactPerson: "Marie Dubois", email: "marie@globalfurniture.com", phone: "+1-555-0102", address: "456 Design District, Chicago, IL 60601" },
    { name: "FreshFood Distributors", contactPerson: "Carlos Rodriguez", email: "carlos@freshfood.com", phone: "+1-555-0103", address: "789 Market Street, Miami, FL 33101" },
    { name: "StyleForward Apparel", contactPerson: "Jennifer Kim", email: "jennifer@styleforward.com", phone: "+1-555-0104", address: "321 Fashion Ave, New York, NY 10001" },
    { name: "ProTools Manufacturing", contactPerson: "Marcus Johnson", email: "marcus@protools.com", phone: "+1-555-0105", address: "654 Industrial Park, Detroit, MI 48201" },
    { name: "SmartGadgets Ltd", contactPerson: "Yuki Tanaka", email: "yuki@smartgadgets.com", phone: "+1-555-0106", address: "987 Tech Hub, Seattle, WA 98101" },
    { name: "EcoHome Furniture", contactPerson: "Sophie Laurent", email: "sophie@ecohome.com", phone: "+1-555-0107", address: "147 Green Street, Portland, OR 97201" },
    { name: "OrganicHarvest Foods", contactPerson: "Tom Williams", email: "tom@organicharvest.com", phone: "+1-555-0108", address: "258 Farm Road, Austin, TX 73301" },
    { name: "UrbanThreads Clothing", contactPerson: "Amara Diallo", email: "amara@urbanthreads.com", phone: "+1-555-0109", address: "369 Style Boulevard, Los Angeles, CA 90001" },
    { name: "PowerBuild Tools", contactPerson: "Hans Mueller", email: "hans@powerbuild.com", phone: "+1-555-0110", address: "741 Workshop Lane, Denver, CO 80201" },
];

const PRODUCTS = [
    { name: "4K Ultra HD Smart TV 55 inch", desc: "55 inch 4K Smart TV with HDR and built-in streaming apps", cat: "Electronics", price: 599.99, sku: "TV554K", threshold: 8 },
    { name: "Wireless Noise-Cancelling Headphones", desc: "Premium over-ear headphones with 30hr battery life", cat: "Electronics", price: 249.99, sku: "HPWNC001", threshold: 15 },
    { name: "Mechanical Gaming Keyboard", desc: "RGB backlit mechanical keyboard with Cherry MX switches", cat: "Electronics", price: 129.99, sku: "KBMCHRGB", threshold: 20 },
    { name: "USB-C Fast Charger 65W", desc: "65W GaN USB-C charger compatible with laptops and phones", cat: "Electronics", price: 49.99, sku: "CHG65WUC", threshold: 30 },
    { name: "Wireless Gaming Mouse", desc: "High-precision wireless gaming mouse with 20000 DPI", cat: "Electronics", price: 79.99, sku: "MSWLSGMG", threshold: 25 },
    { name: "Smart Home Security Camera", desc: "1080p indoor security camera with night vision and motion alerts", cat: "Electronics", price: 89.99, sku: "CAMSMSEC", threshold: 12 },
    { name: "Portable Bluetooth Speaker", desc: "Waterproof portable speaker with 360 sound and 20hr battery", cat: "Electronics", price: 69.99, sku: "SPKBTPTB", threshold: 20 },
    { name: "Smart Watch Series X", desc: "Advanced smartwatch with health tracking and GPS", cat: "Electronics", price: 299.99, sku: "SWSRSX01", threshold: 10 },
    { name: "Tablet 10 inch 128GB", desc: "10 inch tablet with 128GB storage and 2K display", cat: "Electronics", price: 349.99, sku: "TAB10128", threshold: 8 },
    { name: "True Wireless Earbuds", desc: "Active noise cancellation earbuds with 36hr total battery", cat: "Electronics", price: 159.99, sku: "EBTWSANC", threshold: 20 },
    { name: "Executive Office Chair", desc: "Ergonomic office chair with lumbar support and adjustable height", cat: "Furniture", price: 399.99, sku: "CHEXCOFF", threshold: 5 },
    { name: "Standing Desk 160x80cm", desc: "Height-adjustable standing desk with memory settings", cat: "Furniture", price: 699.99, sku: "DKSTD160", threshold: 4 },
    { name: "3-Seater Fabric Sofa", desc: "Modern 3-seater sofa in premium fabric, multiple colors", cat: "Furniture", price: 849.99, sku: "SF3STFAB", threshold: 3 },
    { name: "Bookshelf 5 Tier", desc: "Industrial style 5-tier bookshelf in wood and metal", cat: "Furniture", price: 149.99, sku: "BS5TRIND", threshold: 8 },
    { name: "Coffee Table Glass Top", desc: "Modern coffee table with tempered glass top and steel frame", cat: "Furniture", price: 229.99, sku: "CTGLSMOD", threshold: 6 },
    { name: "King Size Bed Frame", desc: "Solid wood king size bed frame with headboard", cat: "Furniture", price: 599.99, sku: "BFKNGSLW", threshold: 4 },
    { name: "Dining Table 6 Person", desc: "Extendable dining table for 6-8 persons in oak finish", cat: "Furniture", price: 479.99, sku: "DT6PSOAK", threshold: 4 },
    { name: "Filing Cabinet 3 Drawer", desc: "Metal filing cabinet with lock, A4 compatible", cat: "Furniture", price: 179.99, sku: "FC3DWMTL", threshold: 7 },
    { name: "Mens Slim Fit Chinos", desc: "Premium stretch chinos in multiple colors, slim fit", cat: "Clothing", price: 59.99, sku: "CHMNSLM", threshold: 25 },
    { name: "Womens Running Leggings", desc: "High-waist compression leggings for running and yoga", cat: "Clothing", price: 44.99, sku: "LGWMRUN", threshold: 30 },
    { name: "Unisex Hoodie Premium", desc: "Heavy cotton blend hoodie with kangaroo pocket", cat: "Clothing", price: 54.99, sku: "HDUNIPRE", threshold: 30 },
    { name: "Mens Oxford Dress Shirt", desc: "Classic Oxford weave dress shirt, wrinkle-resistant", cat: "Clothing", price: 49.99, sku: "SHMNOXF", threshold: 25 },
    { name: "Womens Blazer Fitted", desc: "Professional fitted blazer in stretch fabric", cat: "Clothing", price: 89.99, sku: "BLWMFIT", threshold: 20 },
    { name: "Casual Sneakers Unisex", desc: "Lightweight canvas sneakers with rubber sole", cat: "Clothing", price: 64.99, sku: "SNUNICNV", threshold: 25 },
    { name: "Organic Coffee Beans 1kg", desc: "Single origin Arabica coffee beans, medium roast", cat: "Food", price: 24.99, sku: "CBORG1KG", threshold: 50 },
    { name: "Extra Virgin Olive Oil 500ml", desc: "Cold-pressed extra virgin olive oil from Greece", cat: "Food", price: 14.99, sku: "OOEXV500", threshold: 60 },
    { name: "Organic Honey Raw 400g", desc: "Raw unfiltered organic honey from local farms", cat: "Food", price: 12.99, sku: "HNORG400", threshold: 50 },
    { name: "Protein Powder Whey 2kg", desc: "Whey protein isolate, 25g protein per serving", cat: "Food", price: 49.99, sku: "PTWHY2KG", threshold: 40 },
    { name: "Mixed Nuts Premium 500g", desc: "Premium mix of almonds, cashews, and walnuts", cat: "Food", price: 19.99, sku: "NTMIX500", threshold: 60 },
    { name: "Green Tea Matcha 100g", desc: "Ceremonial grade matcha green tea powder from Japan", cat: "Food", price: 22.99, sku: "GTMAT100", threshold: 45 },
    { name: "Cordless Drill 18V", desc: "18V lithium-ion cordless drill with 2 batteries and case", cat: "Tools", price: 149.99, sku: "DRCLS18V", threshold: 12 },
    { name: "Circular Saw 7 inch", desc: "7.25 inch circular saw with laser guide and dust blower", cat: "Tools", price: 119.99, sku: "SWCRC725", threshold: 8 },
    { name: "Tool Set 215 Piece", desc: "Comprehensive home repair tool set in carry case", cat: "Tools", price: 89.99, sku: "TS215HOM", threshold: 15 },
    { name: "Digital Multimeter Pro", desc: "Professional digital multimeter with auto-ranging", cat: "Tools", price: 59.99, sku: "MMDIGPRO", threshold: 15 },
    { name: "Angle Grinder 115mm", desc: "4.5 inch angle grinder with disc guard and side handle", cat: "Tools", price: 79.99, sku: "AG115ANG", threshold: 10 },
    { name: "Laser Level Self-Leveling", desc: "3-line self-leveling cross-line laser level with tripod", cat: "Tools", price: 69.99, sku: "LLSLF3LN", threshold: 10 },
    { name: "Yoga Mat Premium 6mm", desc: "Non-slip yoga mat with carry strap, eco-friendly material", cat: "Other", price: 34.99, sku: "YMPRE6MM", threshold: 25 },
    { name: "Water Bottle 1L Insulated", desc: "Double-wall insulated stainless steel water bottle", cat: "Other", price: 29.99, sku: "WB1LINS", threshold: 30 },
    { name: "Backpack 30L Hiking", desc: "30L waterproof hiking backpack with hydration system", cat: "Other", price: 79.99, sku: "BP30LHIK", threshold: 15 },
    { name: "Desk Organizer Set", desc: "5-piece bamboo desk organizer set for home office", cat: "Other", price: 39.99, sku: "DO5PCBMB", threshold: 20 },
];

const ENTRY_REASONS = ["Initial stock", "Purchase order", "Supplier delivery", "Stock replenishment", "Transfer in", "Return from customer"];
const EXIT_REASONS = ["Customer sale", "Damaged goods", "Internal use", "Transfer out", "Quality control reject", "Sample"];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const randDate = days => { const n = Date.now(); return new Date(n - days * 864e5 + Math.random() * days * 864e5); };

async function seedUsers() {
    console.log("\n📦 Seeding users_db...");
    const conn = await mongoose.createConnection(USERS_URI).asPromise();
    const User = conn.model("User", userSchema);
    await User.deleteMany({});

    const saved = [];
    for (const u of USERS_DATA) {
        const doc = new User(u);
        await doc.save(); // triggers pre('save') hash hook
        saved.push(doc);
    }

    console.log(`   ✅ Created ${saved.length} users`);
    console.log(`   👤 Admin:   admin@stockmanager.com  /  Admin@123`);
    console.log(`   👤 Manager: sarah@stockmanager.com  /  Manager@123`);
    await conn.close();
    return saved[0]._id.toString();
}

async function seedSuppliers(adminId) {
    console.log("\n📦 Seeding suppliers_db...");
    const conn = await mongoose.createConnection(SUPPLIERS_URI).asPromise();
    const Supplier = conn.model("Supplier", supplierSchema);
    await Supplier.deleteMany({});
    const suppliers = await Supplier.insertMany(SUPPLIERS_DATA.map(s => ({ ...s, createdBy: adminId })));
    console.log(`   ✅ Created ${suppliers.length} suppliers`);
    await conn.close();
    return suppliers;
}

async function seedProducts(suppliers, adminId) {
    console.log("\n📦 Seeding products_db...");
    const conn = await mongoose.createConnection(PRODUCTS_URI).asPromise();
    const Product = conn.model("Product", productSchema);
    await Product.deleteMany({});
    const products = await Product.insertMany(
        PRODUCTS.map((p, i) => ({
            name: p.name,
            description: p.desc,
            category: p.cat,
            price: p.price,
            sku: p.sku,
            supplierId: suppliers[i % suppliers.length]._id.toString(),
            lowStockThreshold: p.threshold,
            isActive: true,
            createdBy: adminId,
        }))
    );
    console.log(`   ✅ Created ${products.length} products`);
    await conn.close();
    return products;
}

async function seedStock(products, adminId) {
    console.log("\n📦 Seeding stock_db...");
    const conn = await mongoose.createConnection(STOCK_URI).asPromise();
    const StockLevel = conn.model("StockLevel", stockLevelSchema);
    const StockMovement = conn.model("StockMovement", stockMovementSchema);
    await StockLevel.deleteMany({});
    await StockMovement.deleteMany({});

    const levels = [], movements = [];

    for (const product of products) {
        const pid = product._id.toString();
        let totalIn = 0;

        for (let i = 0; i < rand(3, 8); i++) {
            const qty = rand(20, 200);
            totalIn += qty;
            movements.push({ productId: pid, type: "entry", quantity: qty, reason: pick(ENTRY_REASONS), reference: `PO-${rand(10000, 99999)}`, performedBy: adminId, timestamp: randDate(90) });
        }

        let totalOut = 0;
        const exits = rand(1, 5);
        for (let i = 0; i < exits; i++) {
            const qty = rand(5, Math.max(10, Math.floor(totalIn * 0.6 / exits)));
            totalOut += qty;
            movements.push({ productId: pid, type: "exit", quantity: qty, reason: pick(EXIT_REASONS), reference: `SO-${rand(10000, 99999)}`, performedBy: adminId, timestamp: randDate(60) });
        }

        levels.push({ productId: pid, currentQuantity: Math.max(0, totalIn - totalOut), lastUpdated: new Date() });
    }

    await StockLevel.insertMany(levels);
    await StockMovement.insertMany(movements);

    const totalQty = levels.reduce((s, l) => s + l.currentQuantity, 0);
    const lowStock = levels.filter(l => l.currentQuantity <= 20).length;
    console.log(`   ✅ Created ${levels.length} stock levels`);
    console.log(`   ✅ Created ${movements.length} stock movements`);
    console.log(`   📊 Total units in stock: ${totalQty}`);
    console.log(`   ⚠️  Low stock items: ${lowStock}`);
    await conn.close();
}

async function main() {
    console.log("🌱 Starting database seeder...");
    console.log("━".repeat(50));
    try {
        const adminId = await seedUsers();
        const suppliers = await seedSuppliers(adminId);
        const products = await seedProducts(suppliers, adminId);
        await seedStock(products, adminId);
        console.log("\n" + "━".repeat(50));
        console.log("✅ All databases seeded successfully!");
        console.log("\n🔑 Login credentials:");
        console.log("   Admin:   admin@stockmanager.com  /  Admin@123");
        console.log("   Manager: sarah@stockmanager.com  /  Manager@123");
        console.log("━".repeat(50));
    } catch (err) {
        console.error("❌ Seeder failed:", err.message);
        process.exit(1);
    }
    process.exit(0);
}

main();