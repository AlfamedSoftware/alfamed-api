import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, numeric, integer } from "drizzle-orm/pg-core";
import { units } from "./units.js";
import { specialties } from "./specialties.js";
import { randomUUID } from "node:crypto";

export const procedures = pgTable("procedures", {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    unitId: text("unit_id").references(() => units.id, { onDelete: "cascade" }),
    specialtyId: text("specialty_id").references(() => specialties.id, { onDelete: "set null" }),
    type: integer("type").notNull(),
    description: text("description").notNull(),
    observation: text("observation"),
    code: text("code").notNull(),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const proceduresRelations = relations(procedures, ({ one }) => ({
    unit: one(units, {
        fields: [procedures.unitId],
        references: [units.id],
    }),
    specialty: one(specialties, {
        fields: [procedures.specialtyId],
        references: [specialties.id],
    }),
}));
