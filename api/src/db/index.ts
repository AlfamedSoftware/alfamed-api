import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const supabaseUrl = process.env.SUPABASE_URL!;
console.log(supabaseUrl);
const client = postgres(process.env.SUPABASE_URL!);
export const db = drizzle(client);