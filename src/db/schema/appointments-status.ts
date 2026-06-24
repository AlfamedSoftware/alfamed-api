import { pgTable, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

export const appointmentsStatus = pgTable("appointments_status", {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    code: integer("code").notNull(),
    description: text("description").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});
