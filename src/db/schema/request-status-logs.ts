import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const requestStatusLogs = pgTable("request_status_logs", {
    id: text("id").primaryKey(),
    requestId: text("request_id").notNull(),
    oldStatus: text("old_status"),
    newStatus: text("new_status").notNull(),
    changedBy: text("changed_by"),
    changedAt: timestamp("changed_at").defaultNow().notNull(),
    observation: text("observation"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});
