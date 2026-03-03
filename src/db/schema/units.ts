import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { randomUUIDv7 } from "bun";

export const units = pgTable("units", {
    id: text("id").primaryKey().$defaultFn(() => randomUUIDv7()),
    name: text("name").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});
