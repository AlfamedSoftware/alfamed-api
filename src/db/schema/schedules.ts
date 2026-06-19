import { pgTable, text, integer, boolean, timestamp, date, time } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { professionalUnits } from "./professional-units.js";
import { specialties } from "./specialties.js";
import { procedures } from "./procedures.js";

export const schedules = pgTable("schedules", {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    professionalUnitId: text("professional_unit_id")
        .notNull()
        .references(() => professionalUnits.id, { onDelete: "cascade" }),
    specialtyId: text("specialty_id")
        .notNull()
        .references(() => specialties.id, { onDelete: "cascade" }),
    procedureId: text("procedure_id")
        .references(() => procedures.id, { onDelete: "set null" }),
    slots: integer("slots").notNull(),
    emptySlots: integer("empty_slots").notNull(),
    allocatedSlots: integer("allocated_slots").notNull(),
    date: date("date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});
