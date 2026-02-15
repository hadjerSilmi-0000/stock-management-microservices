import crypto from 'crypto';

// NEVER commit real keys to git
// Load from environment or secure vault in production
const SERVICE_KEYS = {
    'users-service': process.env.USERS_SERVICE_KEY,
    'products-service': process.env.PRODUCTS_SERVICE_KEY,
    'stock-service': process.env.STOCK_SERVICE_KEY,
    'suppliers-service': process.env.SUPPLIERS_SERVICE_KEY,
};

// Validate all keys are present
export function validateServiceKeys() {
    const missing = Object.entries(SERVICE_KEYS)
        .filter(([service, key]) => !key)
        .map(([service]) => service);

    if (missing.length > 0) {
        console.error('❌ Missing service keys for:', missing.join(', '));
        console.error('   Set these in your .env file:');
        missing.forEach(service => {
            const envVar = service.toUpperCase().replace(/-/g, '_') + '_KEY';
            console.error(`   ${envVar}=<generate_random_key>`);
        });
        console.error('\n   Generate keys with:');
        console.error(`   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`);

        if (process.env.NODE_ENV === 'production') {
            throw new Error('Service keys must be configured in production');
        }

        console.warn('⚠️  WARNING: Running in development without proper service keys!');
    }

    return SERVICE_KEYS;
}

export function generateServiceKey() {
    return crypto.randomBytes(32).toString('hex');
}

export { SERVICE_KEYS };