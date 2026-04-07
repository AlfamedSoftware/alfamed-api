import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { requests } from "./requests.js";
import { users } from "./users.js";

export const requestStatusLogs = pgTable("request_status_logs", {
    id: text("id").primaryKey(),
    requestId: text("request_id").notNull().references(() => requests.id, { onDelete: "cascade" }),
    oldStatus: text("old_status"),
    newStatus: text("new_status").notNull(),
    changedBy: text("changed_by").references(() => users.id),
    changedAt: timestamp("changed_at").defaultNow().notNull(),
    observation: text("observation"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});
