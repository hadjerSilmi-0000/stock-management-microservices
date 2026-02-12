/**
 * Database Separation Verification Script
 * Tests that each service has its own isolated database
 * 
 * Run: node tools/verify-database-separation.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment files
const services = {
    users: {
        name: 'Users',
        envPath: resolve(__dirname, '../services/users/.env'),
        expectedCollections: ['users', 'sessions']
    },
    products: {
        name: 'Products',
        envPath: resolve(__dirname, '../services/products/.env'),
        expectedCollections: ['products']
    },
    stock: {
        name: 'Stock',
        envPath: resolve(__dirname, '../services/stock/.env'),
        expectedCollections: ['stocklevels', 'stockmovements']
    },
    suppliers: {
        name: 'Suppliers',
        envPath: resolve(__dirname, '../services/suppliers/.env'),
        expectedCollections: ['suppliers']
    }
};

async function verifyService(serviceKey, config) {
    console.log(`\n🔍 Verifying ${config.name} Service...`);

    // Load env file
    const envConfig = dotenv.config({ path: config.envPath });

    if (envConfig.error) {
        console.log(`   ❌ Failed to load .env file: ${config.envPath}`);
        return false;
    }

    const mongoUri = envConfig.parsed.MONGO_URI;

    if (!mongoUri) {
        console.log(`   ❌ MONGO_URI not found in .env`);
        return false;
    }

    console.log(`   📍 Database: ${mongoUri}`);

    // Extract database name from URI
    const dbName = mongoUri.split('/').pop().split('?')[0];
    const expectedDbName = `${serviceKey}_db`;

    if (dbName !== expectedDbName) {
        console.log(`   ⚠️  Warning: Database name is '${dbName}', expected '${expectedDbName}'`);
    }

    try {
        // Connect to database
        const conn = await mongoose.createConnection(mongoUri).asPromise();

        // Get collections
        const collections = await conn.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        console.log(`   📚 Collections found: ${collectionNames.length > 0 ? collectionNames.join(', ') : 'none'}`);

        // Check for expected collections
        const missingCollections = config.expectedCollections.filter(
            col => !collectionNames.includes(col)
        );

        if (missingCollections.length > 0) {
            console.log(`   ⚠️  Missing collections: ${missingCollections.join(', ')}`);
        }

        // Check for unexpected collections (from other services)
        const allExpectedCollections = Object.values(services)
            .flatMap(s => s.expectedCollections);

        const unexpectedCollections = collectionNames.filter(
            col => !config.expectedCollections.includes(col) && allExpectedCollections.includes(col)
        );

        if (unexpectedCollections.length > 0) {
            console.log(`   ❌ Found collections from other services: ${unexpectedCollections.join(', ')}`);
            console.log(`   ⚠️  Database separation is NOT properly configured!`);
            await conn.close();
            return false;
        }

        // Count documents
        const documentCounts = {};
        for (const collectionName of collectionNames) {
            const count = await conn.db.collection(collectionName).countDocuments();
            documentCounts[collectionName] = count;
        }

        console.log(`   📊 Document counts:`);
        for (const [col, count] of Object.entries(documentCounts)) {
            console.log(`      ${col}: ${count}`);
        }

        await conn.close();
        console.log(`   ✅ ${config.name} database is properly isolated`);
        return true;

    } catch (error) {
        console.log(`   ❌ Error connecting to database:`, error.message);
        return false;
    }
}

async function checkDatabaseUniqueness() {
    console.log('\n🔍 Checking database uniqueness...');

    const databases = {};

    for (const [serviceKey, config] of Object.entries(services)) {
        const envConfig = dotenv.config({ path: config.envPath });
        if (envConfig.error) continue;

        const mongoUri = envConfig.parsed.MONGO_URI;
        if (!mongoUri) continue;

        const dbName = mongoUri.split('/').pop().split('?')[0];

        if (databases[dbName]) {
            console.log(`   ❌ Database '${dbName}' is used by multiple services:`);
            console.log(`      - ${databases[dbName]}`);
            console.log(`      - ${config.name}`);
            return false;
        }

        databases[dbName] = config.name;
    }

    console.log(`   ✅ All services use unique databases`);
    console.log(`   📊 Databases in use:`);
    for (const [dbName, serviceName] of Object.entries(databases)) {
        console.log(`      ${dbName} → ${serviceName}`);
    }

    return true;
}

async function verify() {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║     Database Separation Verification Tool         ║');
    console.log('╚════════════════════════════════════════════════════╝');

    try {
        const results = [];

        // Verify each service
        for (const [serviceKey, config] of Object.entries(services)) {
            const result = await verifyService(serviceKey, config);
            results.push({ service: config.name, success: result });
        }

        // Check database uniqueness
        const uniqueDbsResult = await checkDatabaseUniqueness();

        // Summary
        console.log('\n╔════════════════════════════════════════════════════╗');
        console.log('║                    SUMMARY                         ║');
        console.log('╚════════════════════════════════════════════════════╝');

        const allPassed = results.every(r => r.success) && uniqueDbsResult;

        console.log('\nService Status:');
        for (const result of results) {
            const status = result.success ? '✅' : '❌';
            console.log(`  ${status} ${result.service}`);
        }

        console.log(`\nDatabase Uniqueness: ${uniqueDbsResult ? '✅' : '❌'}`);

        if (allPassed) {
            console.log('\n🎉 All checks passed! Database separation is correctly configured.');
        } else {
            console.log('\n⚠️  Some checks failed. Please review the issues above.');
        }

        process.exit(allPassed ? 0 : 1);

    } catch (error) {
        console.error('\n❌ Verification failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

verify();