import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { requests } from "./requests.js";
import { users } from "./users.js";
import { requestsStatus } from "./requests-status.js";

export const requestLogs = pgTable("request_logs", {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    requestId: text("request_id")
        .notNull()
        .references(() => requests.id, { onDelete: "cascade" }),
    oldStatusId: text("old_status_id").references(() => requestsStatus.id), // pode ser null
    newStatusId: text("new_status_id").notNull().references(() => requestsStatus.id),
    changedBy: text("changed_by").notNull().references(() => users.id),
    changedAt: timestamp("changed_at").defaultNow().notNull(),
    observation: text("observation"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});
