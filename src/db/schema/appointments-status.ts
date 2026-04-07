import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

export const appointmentsStatus = pgTable("appointments_status", {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});
