/**
 * RabbitMQ Messaging Client
 * Place in: services/shared/utils/rabbitmqClient.js
 */

import amqp from 'amqplib';

class RabbitMQClient {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        this.isConnected = false;
        this.reconnectInterval = 5000; // 5 seconds
        this.maxReconnectAttempts = 10;
        this.reconnectAttempts = 0;
    }

    /**
     * Connect to RabbitMQ server
     */
    async connect() {
        try {
            this.connection = await amqp.connect(this.url);
            this.channel = await this.connection.createChannel();
            this.isConnected = true;
            this.reconnectAttempts = 0;

            console.log('✅ [RabbitMQ] Connected successfully');
            console.log(`   - URL: ${this.url}`);

            // Handle connection errors
            this.connection.on('error', (err) => {
                console.error('❌ [RabbitMQ] Connection error:', err.message);
                this.isConnected = false;
            });

            this.connection.on('close', () => {
                console.log('⚠️ [RabbitMQ] Connection closed');
                this.isConnected = false;
                this.handleReconnect();
            });

            // Handle channel errors
            this.channel.on('error', (err) => {
                console.error('❌ [RabbitMQ] Channel error:', err.message);
            });

            this.channel.on('close', () => {
                console.log('⚠️ [RabbitMQ] Channel closed');
            });

            return this.channel;
        } catch (error) {
            console.error('❌ [RabbitMQ] Connection failed:', error.message);
            console.error('   Make sure RabbitMQ is running on localhost:5672');
            this.handleReconnect();
            throw error;
        }
    }

    /**
     * Handle automatic reconnection
     */
    async handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(`❌ [RabbitMQ] Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
            return;
        }

        this.reconnectAttempts++;
        console.log(`🔄 [RabbitMQ] Reconnecting... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(async () => {
            try {
                await this.connect();
            } catch (error) {
                // Will trigger another reconnect attempt
            }
        }, this.reconnectInterval);
    }

    /**
     * Create an exchange
     * @param {string} exchangeName
     * @param {string} exchangeType - 'direct', 'topic', 'fanout', 'headers'
     */
    async createExchange(exchangeName, exchangeType = 'topic') {
        if (!this.channel) {
            await this.connect();
        }

        await this.channel.assertExchange(exchangeName, exchangeType, {
            durable: true, // Survive broker restart
        });

        console.log(`📢 [RabbitMQ] Exchange created: ${exchangeName} (${exchangeType})`);
        return exchangeName;
    }

    /**
     * Publish a message to an exchange
     * @param {string} exchangeName
     * @param {string} routingKey
     * @param {object} message
     * @param {object} options
     */
    async publish(exchangeName, routingKey, message, options = {}) {
        if (!this.channel) {
            await this.connect();
        }

        const messageBuffer = Buffer.from(JSON.stringify(message));

        const publishOptions = {
            persistent: true, // Survive broker restart
            timestamp: Date.now(),
            contentType: 'application/json',
            ...options,
        };

        const success = this.channel.publish(
            exchangeName,
            routingKey,
            messageBuffer,
            publishOptions
        );

        if (success) {
            console.log(`📤 [RabbitMQ] Published to ${exchangeName}/${routingKey}`);
            if (process.env.LOG_LEVEL === 'debug') {
                console.log('   Message:', JSON.stringify(message, null, 2));
            }
        } else {
            console.warn(`⚠️ [RabbitMQ] Failed to publish to ${exchangeName}/${routingKey}`);
        }

        return success;
    }

    /**
     * Subscribe to messages from a queue
     * @param {string} exchangeName
     * @param {string} queueName
     * @param {string} routingKey - Can use wildcards: * (one word), # (zero or more words)
     * @param {function} callback - async (message, originalMsg) => {}
     * @param {object} options
     */
    async subscribe(exchangeName, queueName, routingKey, callback, options = {}) {
        if (!this.channel) {
            await this.connect();
        }

        // Assert queue
        await this.channel.assertQueue(queueName, {
            durable: true,
            ...options.queueOptions,
        });

        // Bind queue to exchange with routing key
        await this.channel.bindQueue(queueName, exchangeName, routingKey);

        // Set prefetch count (how many messages to process at once)
        await this.channel.prefetch(options.prefetch || 1);

        // Consume messages
        await this.channel.consume(
            queueName,
            async (msg) => {
                if (msg) {
                    try {
                        const content = JSON.parse(msg.content.toString());

                        console.log(`📥 [RabbitMQ] Received from ${queueName}`);
                        if (process.env.LOG_LEVEL === 'debug') {
                            console.log('   Message:', JSON.stringify(content, null, 2));
                        }

                        // Call the callback
                        await callback(content, msg);

                        // Acknowledge message (remove from queue)
                        this.channel.ack(msg);

                    } catch (error) {
                        console.error(`❌ [RabbitMQ] Error processing message from ${queueName}:`, error);

                        // Negative acknowledgment
                        // false, false = don't requeue (send to dead letter if configured)
                        // false, true = requeue for retry
                        this.channel.nack(msg, false, options.requeue !== false);
                    }
                }
            },
            {
                noAck: false, // Manual acknowledgment
            }
        );

        console.log(`👂 [RabbitMQ] Subscribed to queue: ${queueName}`);
        console.log(`   - Exchange: ${exchangeName}`);
        console.log(`   - Routing Key: ${routingKey}`);
    }

    /**
     * Send RPC request and wait for response
     * @param {string} queueName
     * @param {object} message
     * @param {number} timeout - Timeout in milliseconds
     */
    async sendRPC(queueName, message, timeout = 30000) {
        if (!this.channel) {
            await this.connect();
        }

        return new Promise(async (resolve, reject) => {
            // Create temporary reply queue
            const { queue: replyQueue } = await this.channel.assertQueue('', {
                exclusive: true,
                autoDelete: true,
            });

            const correlationId = this.generateUuid();
            let timeoutHandle;

            // Listen for response
            await this.channel.consume(
                replyQueue,
                (msg) => {
                    if (msg.properties.correlationId === correlationId) {
                        clearTimeout(timeoutHandle);
                        const response = JSON.parse(msg.content.toString());
                        resolve(response);
                    }
                },
                { noAck: true }
            );

            // Send request
            this.channel.sendToQueue(
                queueName,
                Buffer.from(JSON.stringify(message)),
                {
                    correlationId,
                    replyTo: replyQueue,
                    contentType: 'application/json',
                }
            );

            console.log(`🔄 [RabbitMQ] RPC request sent to ${queueName}`);

            // Set timeout
            timeoutHandle = setTimeout(() => {
                reject(new Error(`RPC timeout: ${queueName} did not respond within ${timeout}ms`));
            }, timeout);
        });
    }

    /**
     * Handle RPC requests
     * @param {string} queueName
     * @param {function} callback - async (message) => response
     */
    async handleRPC(queueName, callback) {
        if (!this.channel) {
            await this.connect();
        }

        await this.channel.assertQueue(queueName, { durable: true });
        await this.channel.prefetch(1);

        await this.channel.consume(queueName, async (msg) => {
            try {
                const request = JSON.parse(msg.content.toString());
                console.log(`🔄 [RabbitMQ] RPC request received on ${queueName}`);

                // Process request
                const response = await callback(request);

                // Send response back
                this.channel.sendToQueue(
                    msg.properties.replyTo,
                    Buffer.from(JSON.stringify(response)),
                    {
                        correlationId: msg.properties.correlationId,
                        contentType: 'application/json',
                    }
                );

                this.channel.ack(msg);
            } catch (error) {
                console.error(`❌ [RabbitMQ] RPC handler error:`, error);
                this.channel.nack(msg, false, false);
            }
        });

        console.log(`🎧 [RabbitMQ] RPC handler listening on ${queueName}`);
    }

    /**
     * Get queue statistics
     * @param {string} queueName
     */
    async getQueueStats(queueName) {
        if (!this.channel) {
            await this.connect();
        }

        try {
            const queueInfo = await this.channel.checkQueue(queueName);
            return {
                messageCount: queueInfo.messageCount,
                consumerCount: queueInfo.consumerCount,
            };
        } catch (error) {
            console.error(`❌ [RabbitMQ] Failed to get stats for ${queueName}:`, error.message);
            return null;
        }
    }

    /**
     * Purge all messages from a queue
     * @param {string} queueName
     */
    async purgeQueue(queueName) {
        if (!this.channel) {
            await this.connect();
        }

        try {
            const result = await this.channel.purgeQueue(queueName);
            console.log(`🗑️ [RabbitMQ] Purged ${result.messageCount} messages from ${queueName}`);
            return result.messageCount;
        } catch (error) {
            console.error(`❌ [RabbitMQ] Failed to purge ${queueName}:`, error.message);
            return 0;
        }
    }

    /**
     * Close connection gracefully
     */
    async close() {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            this.isConnected = false;
            console.log('🔌 [RabbitMQ] Disconnected');
        } catch (error) {
            console.error('❌ [RabbitMQ] Error during close:', error.message);
        }
    }

    /**
     * Generate UUID for correlation IDs
     */
    generateUuid() {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }
}

export default RabbitMQClient;