import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { units } from "./units.js";
import { randomUUID } from "node:crypto";

export const specialties = pgTable(
    "specialties",
    {
        id: text("id").primaryKey().$defaultFn(() => randomUUID()),
        unitId: text("unit_id").references(() => units.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        isActive: boolean("is_active").default(true).notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
    },
    (table) => [
        uniqueIndex("specialties_unit_id_name_unique").on(table.unitId, table.name),
    ],
);

export const specialtiesRelations = relations(specialties, ({ one }) => ({
    unit: one(units, {
        fields: [specialties.unitId],
        references: [units.id],
    }),
}));
