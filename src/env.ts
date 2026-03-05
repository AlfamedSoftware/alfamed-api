import { z } from "zod";

const envSchema = z.object({
    DATABASE_URL: z.url().startsWith("postgresql://"),
    PORT: z.coerce.number().int().positive().default(3333),
    CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
});

export const env = envSchema.parse(process.env);