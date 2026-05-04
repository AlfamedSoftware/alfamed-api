import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

export const roles = pgTable("roles", {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    description: text("description").notNull(),
    key: text("key").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    internal: boolean("internal").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});
