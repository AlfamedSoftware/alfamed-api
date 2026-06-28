import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { appointments } from "./appointments.js";
import { procedures } from "./procedures.js";

export const externalRequests = pgTable("external_requests", {
    id: text("id").primaryKey(),
    appointmentId: text("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
    procedureId: text("procedure_id").notNull().references(() => procedures.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});
