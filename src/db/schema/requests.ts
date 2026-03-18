import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const requests = pgTable("requests", {
    id: text("id").primaryKey(),
    appointmentId: text("appointment_id").notNull(),
    type: text("type").notNull(),
    status: text("status").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});
