import { pgTable, text, timestamp, boolean, integer, numeric } from "drizzle-orm/pg-core";

export const procedures = pgTable("procedures", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    code: text("code").notNull(),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
