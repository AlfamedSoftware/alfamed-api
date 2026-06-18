import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { professionalUnits } from "./professional-units.js";
import { patients } from "./patients.js";
import { appointmentsStatus } from "./appointments-status.js";
import { scheduleSlots } from "./schedule-slots.js";

export const appointments = pgTable("appointments", {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    patientId: text("patient_id")
        .notNull()
        .references(() => patients.id, { onDelete: "cascade" }),
    professionalUnitId: text("professional_unit_id")
        .notNull()
        .references(() => professionalUnits.id, { onDelete: "cascade" }),
    scheduleSlotId: text("schedule_slot_id")
        .notNull()
        .references(() => scheduleSlots.id, { onDelete: "restrict" }),
    startAt: timestamp("start_at", { mode: "date" }).notNull(),
    endAt: timestamp("end_at", { mode: "date" }).notNull(),
    diagnostics: text("diagnostics"),
    evolution: text("evolution"),
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
