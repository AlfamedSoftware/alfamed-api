import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { appointments } from "./appointments.js";
import { requestsStatus } from "./requests-status.js";
import { procedures } from "./procedures.js";
import { professionalUnits } from "./professional-units.js";

export const requests = pgTable("requests", {
    id: text("id").primaryKey(),
    appointmentId: text("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
    procedureId: text("procedure_id").notNull().references(() => procedures.id, { onDelete: "restrict" }),
    professionalUnitId: text("professional_unit_id").references(() => professionalUnits.id, { onDelete: "restrict" }),
    complementaryInfo: text("complementary_info"),
    performedAt: timestamp("performed_at"),
    justification: text("justification"),
    statusId: text("status_id").notNull().references(() => requestsStatus.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});
