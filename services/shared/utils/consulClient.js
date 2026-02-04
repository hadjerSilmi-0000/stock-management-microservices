/**
 * Consul Service Discovery Client
 * Place in: services/shared/utils/consulClient.js
 */

import Consul from 'consul';
import os from 'os';

class ConsulClient {
    constructor(serviceName, port, healthCheckPath = '/health') {
        this.serviceName = serviceName;
        this.port = port;
        this.healthCheckPath = healthCheckPath;
        this.serviceId = `${serviceName}-${os.hostname()}-${port}`;

        this.consul = new Consul({
            host: process.env.CONSUL_HOST || 'localhost',
            port: process.env.CONSUL_PORT || 8500,
            promisify: true,
        });

        this.isRegistered = false;
    }

    /**
     * Register this service with Consul
     */
    async register() {
        const serviceDefinition = {
            id: this.serviceId,
            name: this.serviceName,
            address: process.env.SERVICE_ADDRESS || 'localhost',
            port: parseInt(this.port),
            tags: [
                'traefik.enable=true',
                `traefik.http.routers.${this.serviceName}.rule=PathPrefix(\`/api/${this.serviceName.split('-')[0]}\`)`,
                `traefik.http.services.${this.serviceName}.loadbalancer.server.port=${this.port}`,
            ],
            check: {
                http: `http://localhost:${this.port}${this.healthCheckPath}`,
                interval: '10s',
                timeout: '5s',
                deregistercriticalserviceafter: '1m',
            },
            meta: {
                version: process.env.npm_package_version || '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                startTime: new Date().toISOString(),
            },
        };

        try {
            await this.consul.agent.service.register(serviceDefinition);
            this.isRegistered = true;
            console.log(`✅ [Consul] Service registered: ${this.serviceId}`);
            console.log(`   - Name: ${this.serviceName}`);
            console.log(`   - Address: localhost:${this.port}`);
            console.log(`   - Health: ${this.healthCheckPath}`);

            // Setup graceful shutdown
            this.setupGracefulShutdown();

            return true;
        } catch (error) {
            console.error(`❌ [Consul] Registration failed:`, error.message);
            console.error(`   Make sure Consul is running on localhost:8500`);
            return false;
        }
    }

    /**
     * Deregister this service from Consul
     */
    async deregister() {
        if (!this.isRegistered) {
            return true;
        }

        try {
            await this.consul.agent.service.deregister(this.serviceId);
            this.isRegistered = false;
            console.log(`✅ [Consul] Service deregistered: ${this.serviceId}`);
            return true;
        } catch (error) {
            console.error(`❌ [Consul] Deregistration failed:`, error.message);
            return false;
        }
    }

    /**
     * Setup handlers for graceful shutdown
     */
    async setupGracefulShutdown() {
        const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

        signals.forEach(signal => {
            process.on(signal, async () => {
                console.log(`\n⚠️ [Consul] ${signal} received, deregistering service...`);
                await this.deregister();
                process.exit(0);
            });
        });

        // Handle Windows Ctrl+C
        if (process.platform === 'win32') {
            const readline = await import('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });

            rl.on('SIGINT', async () => {
                console.log('\n⚠️ [Consul] CTRL+C detected, deregistering service...');
                await this.deregister();
                process.exit(0);
            });
        }
    }

    /**
     * Discover a service by name
     * @param {string} serviceName - Name of the service to find
     * @returns {Promise<{address: string, port: number, url: string}>}
     */
    async getService(serviceName) {
        try {
            const result = await this.consul.health.service({
                service: serviceName,
                passing: true, // Only healthy instances
            });

            if (result.length === 0) {
                throw new Error(`No healthy instances of ${serviceName} found in Consul`);
            }

            // Client-side load balancing: pick random healthy instance
            const instance = result[Math.floor(Math.random() * result.length)];

            return {
                address: instance.Service.Address,
                port: instance.Service.Port,
                url: `http://${instance.Service.Address}:${instance.Service.Port}`,
                id: instance.Service.ID,
                tags: instance.Service.Tags,
            };
        } catch (error) {
            console.error(`❌ [Consul] Service discovery failed for ${serviceName}:`, error.message);
            throw error;
        }
    }

    /**
     * Get all instances of a service
     * @param {string} serviceName
     * @returns {Promise<Array>}
     */
    async getAllServiceInstances(serviceName) {
        try {
            const result = await this.consul.health.service({
                service: serviceName,
                passing: true,
            });

            return result.map(instance => ({
                address: instance.Service.Address,
                port: instance.Service.Port,
                url: `http://${instance.Service.Address}:${instance.Service.Port}`,
                id: instance.Service.ID,
                health: instance.Checks[0]?.Status || 'unknown',
            }));
        } catch (error) {
            console.error(`❌ [Consul] Failed to get instances of ${serviceName}:`, error.message);
            return [];
        }
    }

    /**
     * Store a key-value pair in Consul
     * @param {string} key
     * @param {any} value
     */
    async setKeyValue(key, value) {
        try {
            const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
            await this.consul.kv.set(key, valueStr);
            console.log(`✅ [Consul KV] Set: ${key}`);
            return true;
        } catch (error) {
            console.error(`❌ [Consul KV] Failed to set ${key}:`, error.message);
            return false;
        }
    }

    /**
     * Get a value from Consul KV store
     * @param {string} key
     * @returns {Promise<any>}
     */
    async getKeyValue(key) {
        try {
            const result = await this.consul.kv.get(key);
            if (!result) return null;

            try {
                return JSON.parse(result.Value);
            } catch {
                return result.Value;
            }
        } catch (error) {
            console.error(`❌ [Consul KV] Failed to get ${key}:`, error.message);
            return null;
        }
    }
}

export default ConsulClient;