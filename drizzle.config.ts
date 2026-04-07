import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to generate and run migrations.");
}

export default defineConfig({
    schema: "./src/db/schema/**",
    out: "./src/db/migrations",
    dialect: "postgresql",
    dbCredentials: {
        url: databaseUrl,

    },
    casing: "snake_case"
});
