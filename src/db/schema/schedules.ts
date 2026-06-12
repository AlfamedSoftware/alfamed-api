import { pgTable, text, integer, time, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { professionalUnits } from "./professional-units.js";

export const schedules = pgTable("schedules", {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    professionalUnitId: text("professional_unit_id")
        .notNull()
        .references(() => professionalUnits.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    appointmentDurationMinutes: integer("appointment_duration_minutes").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
},
    (table) => [
        uniqueIndex("schedules_professional_unit_id_day_of_week_start_time_end_time_uq").on(
            table.professionalUnitId,
            table.dayOfWeek,
            table.startTime,
            table.endTime,
        ),
    ],
);
