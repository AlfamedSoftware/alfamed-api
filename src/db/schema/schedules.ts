import { pgTable, text, integer, date, time, boolean, timestamp } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { professionalUnitSpecialties } from "./professional-unit-specialties.js";
import { professionalUnits } from "./professional-units.js";

export const schedules = pgTable("schedules", {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    professionalUnitSpecialtyId: text("professional_unit_specialty_id")
        .notNull()
        .references(() => professionalUnitSpecialties.id, { onDelete: "cascade" }),
    professionalUnitId: text("professional_unit_id")
        .notNull()
        .references(() => professionalUnits.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    time: time("time").notNull(),
    slots: integer("slots").notNull(),
    slotsUsed: integer("slots_used").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});
