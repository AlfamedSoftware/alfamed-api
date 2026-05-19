import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex, boolean } from "drizzle-orm/pg-core";
import { professionalUnits } from "./professional-units.js";
import { specialties } from "./specialties.js";
import { randomUUID } from "node:crypto";

export const professionalUnitSpecialties = pgTable(
    "professional_unit_specialties",
    {
        id: text("id").primaryKey().$defaultFn(() => randomUUID()),
        professionalUnitId: text("professional_unit_id")
            .notNull()
            .references(() => professionalUnits.id, { onDelete: "cascade" }),
        specialtyId: text("specialty_id")
            .notNull()
            .references(() => specialties.id, { onDelete: "cascade" }),
        isActive: boolean("is_active").default(true).notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
    },
    (table) => [
        uniqueIndex("professional_unit_specialties_professional_unit_id_specialty_id_uq").on(
            table.professionalUnitId,
            table.specialtyId,
        ),
    ],
);

export const professionalUnitSpecialtiesRelations = relations(
    professionalUnitSpecialties,
    ({ one }) => ({
        professionalUnit: one(professionalUnits, {
            fields: [professionalUnitSpecialties.professionalUnitId],
            references: [professionalUnits.id],
        }),
        specialty: one(specialties, {
            fields: [professionalUnitSpecialties.specialtyId],
            references: [specialties.id],
        }),
    }),
);