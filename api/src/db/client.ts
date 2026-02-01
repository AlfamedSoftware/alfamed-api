import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL!;
console.log(databaseUrl);
const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, {
    schema,
    casing: "snake_case"
});

