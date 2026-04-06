import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { appointments } from "./appointments";
import { users } from "./users";
import { appointmentsStatus } from "./appointments-status";

export const appointmentStatusLogs = pgTable("appointment_status_logs", {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    appointmentId: text("appointment_id")
        .notNull()
        .references(() => appointments.id, { onDelete: "cascade" }),
    oldStatusId: text("old_status_id").references(() => appointmentsStatus.id), // pode ser null
    newStatusId: text("new_status_id").notNull().references(() => appointmentsStatus.id),
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
