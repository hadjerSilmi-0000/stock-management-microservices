/**
 * RabbitMQ Singleton
 * Import this anywhere instead of importing from server.js
 * services/shared/utils/rabbitmqSingleton.js
 */
import RabbitMQClient from "./rabbitmqClient.js";

const rabbitMQ = new RabbitMQClient();
export { rabbitMQ };
