import express      from "express";
import cors         from "cors";
import cookieParser from "cookie-parser";
import { requestIdMiddleware } from "../../shared/middlewares/requestId.js";
import { getCorsOptions }      from "../../shared/config/cors.js";
import { errorHandler }        from "./middlewares/errorMiddleware.js";
import supplierRoutes          from "./routes/supplierRoutes.js";

export default function createApp() {
    const app = express();

    app.use(cors(getCorsOptions()));
    app.use(requestIdMiddleware);
    app.use(express.json());
    app.use(cookieParser());

    // Test-mode auth injection — only active when NODE_ENV=test
    if (process.env.NODE_ENV === "test") {
        app.use((req, _res, next) => {
            const role = req.headers["x-test-role"];
            if (role) {
                req.user = role === "admin"
                    ? { id: "admin-id", _id: "admin-id", role: "admin" }
                    : { id: "mgr-id",   _id: "mgr-id",   role: "manager" };
            }
            next();
        });
    }

    app.use("/api/v1/suppliers", supplierRoutes);

    app.get("/", (req, res) => res.json({ service: "suppliers-service", status: "running" }));

    app.use(errorHandler);

    return app;
}
