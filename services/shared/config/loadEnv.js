// services/shared/config/loadEnv.js
// This file is imported as the FIRST import in every service's server.js
// Because ES module imports are hoisted, this ensures .env is loaded
// before jwt.js, db.js, or any other config module reads process.env

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Walk up from shared/config/ → shared/ → services/ → project root
// then back down to the calling service's .env
// We detect which service is calling by checking which PORT env is set,
// but the simplest approach: load from CWD/.env (works when running
// `npm run dev` from inside the service folder)
const cwdEnv = path.resolve(process.cwd(), ".env");
const result = dotenv.config({ path: cwdEnv });

if (result.error) {
    // Fallback: try one level up
    const fallback = path.resolve(process.cwd(), "../.env");
    const r2 = dotenv.config({ path: fallback });
    if (r2.error) {
        console.error("⚠️  [loadEnv] Could not find .env at:", cwdEnv);
        console.error("⚠️  [loadEnv] Also tried:", fallback);
    } else {
        console.log(`[loadEnv] Loaded ${Object.keys(r2.parsed || {}).length} vars from ${fallback}`);
    }
} else {
    console.log(`[loadEnv] Loaded ${Object.keys(result.parsed || {}).length} vars from ${cwdEnv}`);
}