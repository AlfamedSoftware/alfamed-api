import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const requestsProcedures = pgTable("requests_procedures", {
    id: text("id").primaryKey(),
    requestId: text("request_id").notNull(),
    procedureId: text("procedure_id").notNull(),
    status: text("status").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});
