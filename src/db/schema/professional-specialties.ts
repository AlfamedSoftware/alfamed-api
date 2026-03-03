import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { professionals } from "./professionals";
import { specialties } from "./specialties";
import { randomUUIDv7 } from "bun";

export const professionalSpecialties = pgTable(
    "professional_specialties",
    {
        id: text("id").primaryKey().$defaultFn(() => randomUUIDv7()),
        professionalId: text("professional_id")
            .notNull()
            .references(() => professionals.id, { onDelete: "cascade" }),
        specialtyId: text("specialty_id")
            .notNull()
            .references(() => specialties.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
    },
    (table) => [
        uniqueIndex("professional_specialties_professional_id_specialty_id_uq").on(
            table.professionalId,
            table.specialtyId,
        ),
    ],
);

export const professionalSpecialtiesRelations = relations(
    professionalSpecialties,
    ({ one }) => ({
        professional: one(professionals, {
            fields: [professionalSpecialties.professionalId],
            references: [professionals.id],
        }),
        specialty: one(specialties, {
            fields: [professionalSpecialties.specialtyId],
            references: [specialties.id],
        }),
    }),
);
