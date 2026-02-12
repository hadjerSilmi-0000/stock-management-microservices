/**
 * Database Migration Script
 * Migrates from single shared database to separate databases per service
 * 
 * Run: node tools/migrate-databases.js
 */

import mongoose from 'mongoose';
import readline from 'readline';

// Source database (current shared database)
const SOURCE_DB = process.env.SOURCE_DB || 'mongodb://localhost:27017/stock-management';

// Target databases (one per service)
const TARGET_DBS = {
    users: 'mongodb://localhost:27017/users_db',
    products: 'mongodb://localhost:27017/products_db',
    stock: 'mongodb://localhost:27017/stock_db',
    suppliers: 'mongodb://localhost:27017/suppliers_db'
};

// Collection mappings
const COLLECTION_MAPPING = {
    users: ['users', 'sessions'],
    products: ['products'],
    stock: ['stocklevels', 'stockmovements'],
    suppliers: ['suppliers']
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise((resolve) => rl.question(query, resolve));
}

async function backupDatabase() {
    console.log('\n📦 Creating backup...');
    console.log('Run this command in another terminal:');
    console.log(`mongodump --uri="${SOURCE_DB}" --out=./backup_$(date +%Y%m%d_%H%M%S)`);

    const answer = await question('\nHave you created a backup? (yes/no): ');
    if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Please create a backup before proceeding!');
        process.exit(1);
    }
}

async function verifySourceDatabase() {
    console.log('\n🔍 Verifying source database...');

    const sourceConn = await mongoose.createConnection(SOURCE_DB).asPromise();
    const collections = await sourceConn.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    console.log(`✅ Connected to source database`);
    console.log(`📋 Found collections: ${collectionNames.join(', ')}`);

    // Check for required collections
    const allCollections = Object.values(COLLECTION_MAPPING).flat();
    const missingCollections = allCollections.filter(c => !collectionNames.includes(c));

    if (missingCollections.length > 0) {
        console.log(`⚠️  Warning: Missing collections: ${missingCollections.join(', ')}`);
        console.log('   These will be skipped.');
    }

    await sourceConn.close();
    return collectionNames;
}

async function migrateService(serviceName, collections, sourceConn, targetConnStr) {
    console.log(`\n📦 Migrating ${serviceName} service...`);

    const targetConn = await mongoose.createConnection(targetConnStr).asPromise();

    for (const collectionName of collections) {
        try {
            // Check if collection exists in source
            const sourceCollections = await sourceConn.db.listCollections({ name: collectionName }).toArray();

            if (sourceCollections.length === 0) {
                console.log(`   ⏭️  Skipping ${collectionName} (doesn't exist in source)`);
                continue;
            }

            const documents = await sourceConn.db.collection(collectionName).find().toArray();

            if (documents.length === 0) {
                console.log(`   ⏭️  Skipping ${collectionName} (empty)`);
                continue;
            }

            // Drop existing collection in target if it exists
            try {
                await targetConn.db.collection(collectionName).drop();
            } catch (err) {
                // Collection doesn't exist, that's fine
            }

            // Insert documents
            await targetConn.db.collection(collectionName).insertMany(documents);

            console.log(`   ✅ Migrated ${collectionName}: ${documents.length} documents`);

        } catch (error) {
            console.error(`   ❌ Error migrating ${collectionName}:`, error.message);
        }
    }

    await targetConn.close();
    console.log(`✅ ${serviceName} service migration complete`);
}

async function verifyMigration() {
    console.log('\n🔍 Verifying migration...');

    const results = {};

    for (const [serviceName, targetDb] of Object.entries(TARGET_DBS)) {
        const conn = await mongoose.createConnection(targetDb).asPromise();
        const collections = COLLECTION_MAPPING[serviceName];

        results[serviceName] = {};

        for (const collectionName of collections) {
            try {
                const count = await conn.db.collection(collectionName).countDocuments();
                results[serviceName][collectionName] = count;
            } catch (error) {
                results[serviceName][collectionName] = 0;
            }
        }

        await conn.close();
    }

    // Display results
    console.log('\n📊 Migration Summary:');
    console.log('═══════════════════════════════════════════════');

    for (const [serviceName, collections] of Object.entries(results)) {
        console.log(`\n${serviceName.toUpperCase()} SERVICE:`);
        for (const [collectionName, count] of Object.entries(collections)) {
            console.log(`  ${collectionName.padEnd(20)} ${count} documents`);
        }
    }

    console.log('\n═══════════════════════════════════════════════');
}

async function createIndexes() {
    console.log('\n🔧 Creating indexes...');

    // Users database indexes
    const usersConn = await mongoose.createConnection(TARGET_DBS.users).asPromise();
    await usersConn.db.collection('users').createIndex({ email: 1 }, { unique: true });
    await usersConn.db.collection('users').createIndex({ username: 1 }, { unique: true });
    await usersConn.db.collection('sessions').createIndex({ userId: 1 });
    await usersConn.db.collection('sessions').createIndex({ refreshToken: 1 });
    await usersConn.close();
    console.log('   ✅ Users indexes created');

    // Products database indexes
    const productsConn = await mongoose.createConnection(TARGET_DBS.products).asPromise();
    await productsConn.db.collection('products').createIndex({ sku: 1 }, { unique: true });
    await productsConn.db.collection('products').createIndex({ category: 1 });
    await productsConn.db.collection('products').createIndex({ isActive: 1 });
    await productsConn.close();
    console.log('   ✅ Products indexes created');

    // Stock database indexes
    const stockConn = await mongoose.createConnection(TARGET_DBS.stock).asPromise();
    await stockConn.db.collection('stocklevels').createIndex({ productId: 1 }, { unique: true });
    await stockConn.db.collection('stockmovements').createIndex({ productId: 1, timestamp: -1 });
    await stockConn.db.collection('stockmovements').createIndex({ type: 1 });
    await stockConn.close();
    console.log('   ✅ Stock indexes created');

    // Suppliers database indexes
    const suppliersConn = await mongoose.createConnection(TARGET_DBS.suppliers).asPromise();
    await suppliersConn.db.collection('suppliers').createIndex({ email: 1 }, { unique: true });
    await suppliersConn.db.collection('suppliers').createIndex({ name: 1 });
    await suppliersConn.db.collection('suppliers').createIndex({ isActive: 1 });
    await suppliersConn.close();
    console.log('   ✅ Suppliers indexes created');
}

async function migrate() {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║   Database Migration: Single DB → Multiple DBs    ║');
    console.log('╚════════════════════════════════════════════════════╝');

    try {
        // Step 1: Backup warning
        await backupDatabase();

        // Step 2: Verify source
        await verifySourceDatabase();

        // Step 3: Confirm migration
        console.log('\n⚠️  This will create new databases and migrate data.');
        console.log('Source:', SOURCE_DB);
        console.log('Targets:');
        for (const [service, db] of Object.entries(TARGET_DBS)) {
            console.log(`  - ${service}: ${db}`);
        }

        const confirm = await question('\nProceed with migration? (yes/no): ');
        if (confirm.toLowerCase() !== 'yes') {
            console.log('❌ Migration cancelled');
            process.exit(0);
        }

        // Step 4: Migrate each service
        const sourceConn = await mongoose.createConnection(SOURCE_DB).asPromise();

        for (const [serviceName, targetDb] of Object.entries(TARGET_DBS)) {
            const collections = COLLECTION_MAPPING[serviceName];
            await migrateService(serviceName, collections, sourceConn, targetDb);
        }

        await sourceConn.close();

        // Step 5: Create indexes
        await createIndexes();

        // Step 6: Verify migration
        await verifyMigration();

        console.log('\n✅ Migration completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('1. Update .env files for each service with new MONGO_URI');
        console.log('2. Restart all services');
        console.log('3. Test functionality');
        console.log('4. Delete old database after verification');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Run migration
migrate().catch(console.error);