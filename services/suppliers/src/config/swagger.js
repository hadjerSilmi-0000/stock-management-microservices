import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Suppliers Service API",
            version: "1.0.0",
            description: "Suppliers microservice API documentation",
        },
        servers: [
            { url: `http://localhost:${process.env.PORT || 5004}` }
        ],
    },
    apis: ["./routes/*.js", "./models/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export const swaggerServe = swaggerUi.serve;
export const swaggerSetup = swaggerUi.setup(swaggerSpec);