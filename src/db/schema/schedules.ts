import { pgTable, text, integer, date, time, boolean, timestamp } from "drizzle-orm/pg-core";
import { randomUUIDv7 } from "bun";
import { professionalSpecialties } from "./professional-specialties";
import { professionalUnits } from "./professional-units";

export const schedules = pgTable("schedules", {
    id: text("id").primaryKey().$defaultFn(() => randomUUIDv7()),
    professionalSpecialtyId: text("professional_specialty_id")
        .notNull()
        .references(() => professionalSpecialties.id, { onDelete: "cascade" }),
    professionalUnitId: text("professional_unit_id")
        .notNull()
        .references(() => professionalUnits.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    time: time("time").notNull(),
    slots: integer("slots").notNull(),
    slotsUsed: integer("slots_used").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
