import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { appointments } from "./appointments.js";
import { requestsStatus } from "./requests-status.js";

export const requests = pgTable("requests", {
    id: text("id").primaryKey(),
    appointmentId: text("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    status: text("status").notNull().references(() => requestsStatus.id),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});
