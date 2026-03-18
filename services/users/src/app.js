/**
 * App factory — separates Express setup from server.listen()
 * so tests can import the app without starting a port listener.
 *
 * services/users/src/app.js
 */

import express      from "express";
import cors         from "cors";
import cookieParser from "cookie-parser";
import { requestIdMiddleware } from "../../shared/middlewares/requestId.js";
import { getCorsOptions }      from "../../shared/config/cors.js";
import { errorHandler }        from "./middlewares/errorMiddleware.js";
import userRoutes              from "./routes/userRoutes.js";

export default function createApp() {
    const app = express();

    app.use(cors(getCorsOptions()));
    app.use(requestIdMiddleware);
    app.use(express.json());
    app.use(cookieParser());

    app.use("/api/v1/users", userRoutes);

    app.get("/", (req, res) => {
        res.json({ service: "users-service", status: "running" });
    });

    app.use(errorHandler);

    return app;
}
