import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex, boolean } from "drizzle-orm/pg-core";
import { professionalUnits } from "./professional-units.js";
import { roles } from "./roles.js";
import { randomUUID } from "node:crypto";

export const professionalUnitRoles = pgTable(
    "professional_unit_roles",
    {
        id: text("id").primaryKey().$defaultFn(() => randomUUID()),
        professionalUnitId: text("professional_unit_id")
            .notNull()
            .references(() => professionalUnits.id, { onDelete: "cascade" }),
        roleId: text("role_id")
            .notNull()
            .references(() => roles.id, { onDelete: "cascade" }),
        isActive: boolean("is_active").default(true).notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
    },
    (table) => [
        uniqueIndex("professional_unit_roles_professional_unit_id_role_id_uq").on(
            table.professionalUnitId,
            table.roleId,
        ),
    ],
);

export const professionalUnitRolesRelations = relations(professionalUnitRoles, ({ one }) => ({
    professionalUnit: one(professionalUnits, {
        fields: [professionalUnitRoles.professionalUnitId],
        references: [professionalUnits.id],
    }),
    role: one(roles, {
        fields: [professionalUnitRoles.roleId],
        references: [roles.id],
    }),
}));
