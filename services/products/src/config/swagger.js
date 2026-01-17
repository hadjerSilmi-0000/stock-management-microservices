import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Products Service API",
            version: "1.0.0",
            description: "Products microservice API documentation",
        },
        servers: [
            { url: `http://localhost:${process.env.PORT || 5002}` }
        ],
    },
    apis: ["./routes/*.js", "./models/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export const swaggerServe = swaggerUi.serve;
export const swaggerSetup = swaggerUi.setup(swaggerSpec);