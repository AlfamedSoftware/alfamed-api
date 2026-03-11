import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { randomUUIDv7 } from "bun";
import { appointments } from "./appointments";
import { users } from "./users";
import { appointmentsStatus } from "./appointments-status";

export const appointmentStatusLogs = pgTable("appointment_status_logs", {
    id: text("id").primaryKey().$defaultFn(() => randomUUIDv7()),
    appointmentId: text("appointment_id")
        .notNull()
        .references(() => appointments.id, { onDelete: "cascade" }),
    oldStatusId: text("old_status_id").references(() => appointmentsStatus.id), // pode ser null
    newStatusId: text("new_status_id").notNull().references(() => appointmentsStatus.id),
    changedBy: text("changed_by").references(() => users.id),
    changedAt: timestamp("changed_at").defaultNow().notNull(),
    observation: text("observation"),
});
