import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { randomUUIDv7 } from "bun";
import { schedules } from "./schedules";
import { patients } from "./patients";
import { appointmentsStatus } from "./appointments-status";

export const appointments = pgTable("appointments", {
    id: text("id").primaryKey().$defaultFn(() => randomUUIDv7()),
    patientId: text("patient_id")
        .notNull()
        .references(() => patients.id, { onDelete: "cascade" }),
    scheduleId: text("schedule_id")
        .notNull()
        .references(() => schedules.id, { onDelete: "cascade" }),
    statusId: text("status_id")
        .notNull()
        .references(() => appointmentsStatus.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});
