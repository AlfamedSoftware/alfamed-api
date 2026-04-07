import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { professionals } from "./professionals.js";
import { units } from "./units.js";
import { randomUUID } from "node:crypto";

export const professionalUnits = pgTable(
    "professional_units",
    {
        id: text("id").primaryKey().$defaultFn(() => randomUUID()),
        professionalId: text("professional_id")
            .notNull()
            .references(() => professionals.id, { onDelete: "cascade" }),
        unitId: text("unit_id")
            .notNull()
            .references(() => units.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
    },
    (table) => [
        uniqueIndex("professional_units_professional_id_unit_id_uq").on(
            table.professionalId,
            table.unitId,
        ),
    ],
);

export const professionalUnitsRelations = relations(
    professionalUnits,
    ({ one }) => ({
        professional: one(professionals, {
            fields: [professionalUnits.professionalId],
            references: [professionals.id],
        }),
        unit: one(units, {
            fields: [professionalUnits.unitId],
            references: [units.id],
        }),
    }),
);
