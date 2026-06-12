import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { professionalUnits } from "./professional-units.js";

export const professionalAvailabilityBlocks = pgTable("professional_availability_blocks", {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    professionalUnitId: text("professional_unit_id")
        .notNull()
        .references(() => professionalUnits.id, { onDelete: "cascade" }),
    startAt: timestamp("start_at", { mode: "date" }).notNull(),
    endAt: timestamp("end_at", { mode: "date" }).notNull(),
    reason: text("reason"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});