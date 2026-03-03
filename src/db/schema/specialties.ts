import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { randomUUIDv7 } from "bun";

export const specialties = pgTable("specialties", {
    id: text("id").primaryKey().$defaultFn(() => randomUUIDv7()),
    name: text("name").notNull().unique(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});
