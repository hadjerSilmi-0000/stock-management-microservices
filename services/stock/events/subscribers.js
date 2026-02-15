/**
 * Stock Service - Event Subscribers
 * File: services/stock/src/events/subscribers.js
 * 
 * PURPOSE:
 * - Listen to PRODUCT events from Products service
 * - Automatically create/update/delete stock entries
 */

import StockLevel from "../models/stockLevelModel.js";
import logger from "../utils/logger.js";
import { EVENTS, EXCHANGES, QUEUES } from "../../shared/events/eventTypes.js";

/**
 * Setup all event subscribers for Stock service
 * @param {RabbitMQClient} rabbitMQ 
 */
export async function setupStockEventSubscribers(rabbitMQ) {
    logger.info("📡 Setting up Stock service event subscribers...");

    try {
        // Ensure Products exchange exists
        await rabbitMQ.createExchange(EXCHANGES.PRODUCTS, "topic");

        // ════════════════════════════════════════════════════════════════
        // Subscribe to PRODUCT_CREATED
        // ════════════════════════════════════════════════════════════════
        await rabbitMQ.subscribe(
            EXCHANGES.PRODUCTS,
            QUEUES.STOCK_PRODUCT_EVENTS,
            EVENTS.PRODUCT_CREATED,
            async (event) => {
                try {
                    logger.info(`📥 Received PRODUCT_CREATED event for: ${event.data.sku}`);

                    // Check if stock entry already exists
                    const existingStock = await StockLevel.findOne({
                        productId: event.data.productId
                    });

                    if (existingStock) {
                        logger.warn(`Stock entry already exists for product: ${event.data.productId}`);
                        return;
                    }

                    // Create initial stock entry
                    const stockLevel = await StockLevel.create({
                        productId: event.data.productId,
                        currentQuantity: 0,
                    });

                    logger.info(`✅ Created stock entry for product: ${event.data.sku} (ID: ${event.data.productId})`);

                } catch (error) {
                    logger.error(`❌ Error handling PRODUCT_CREATED event: ${error.message}`);
                    throw error; // Requeue the message
                }
            }
        );

        // ════════════════════════════════════════════════════════════════
        // Subscribe to PRODUCT_DELETED
        // ════════════════════════════════════════════════════════════════
        await rabbitMQ.subscribe(
            EXCHANGES.PRODUCTS,
            QUEUES.STOCK_PRODUCT_EVENTS,
            EVENTS.PRODUCT_DELETED,
            async (event) => {
                try {
                    logger.info(`📥 Received PRODUCT_DELETED event for: ${event.data.sku}`);

                    // Delete stock entry for this product
                    const result = await StockLevel.deleteMany({
                        productId: event.data.productId
                    });

                    if (result.deletedCount > 0) {
                        logger.info(`✅ Deleted stock entry for product: ${event.data.sku}`);
                    } else {
                        logger.warn(`No stock entry found for deleted product: ${event.data.productId}`);
                    }

                } catch (error) {
                    logger.error(`❌ Error handling PRODUCT_DELETED event: ${error.message}`);
                    throw error;
                }
            }
        );

        // ════════════════════════════════════════════════════════════════
        // Subscribe to PRODUCT_UPDATED (optional - for logging)
        // ════════════════════════════════════════════════════════════════
        await rabbitMQ.subscribe(
            EXCHANGES.PRODUCTS,
            QUEUES.STOCK_PRODUCT_EVENTS,
            EVENTS.PRODUCT_UPDATED,
            async (event) => {
                try {
                    logger.info(`📥 Received PRODUCT_UPDATED event for: ${event.data.sku}`);

                    // Log the changes (no action needed in stock for most updates)
                    if (event.data.changes) {
                        logger.info(`Product ${event.data.sku} changes: ${JSON.stringify(event.data.changes)}`);
                    }

                } catch (error) {
                    logger.error(`❌ Error handling PRODUCT_UPDATED event: ${error.message}`);
                    // Don't throw - this is just logging
                }
            }
        );

        logger.info("✅ Stock service event subscribers setup complete");

    } catch (error) {
        logger.error(`❌ Failed to setup Stock event subscribers: ${error.message}`);
        throw error;
    }
}