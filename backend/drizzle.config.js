"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const drizzle_kit_1 = require("drizzle-kit");
require("dotenv/config");
exports.default = (0, drizzle_kit_1.defineConfig)({
    schema: './src/db/schema.ts',
    out: './src/db/migrations',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.USE_MOCK_DB === 'true' ? (process.env.MOCK_DATABASE_URL || process.env.DATABASE_URL) : process.env.DATABASE_URL,
    },
});
//# sourceMappingURL=drizzle.config.js.map