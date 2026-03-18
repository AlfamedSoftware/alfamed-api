import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const requestsProceduresOutcomes = pgTable("requests_procedures_outcomes", {
    id: text("id").primaryKey(),
    requestProcedureId: text("request_procedure_id").notNull(),
    professionalId: text("professional_id").notNull(),
    description: text("description"),
    outcomeDate: timestamp("outcome_date").defaultNow().notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});
