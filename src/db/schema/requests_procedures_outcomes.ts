import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { requestsProcedures } from "./requests-procedures";
import { professionals } from "./professionals";

export const requestsProceduresOutcomes = pgTable("requests_procedures_outcomes", {
    id: text("id").primaryKey(),
    requestProcedureId: text("request_procedure_id").notNull().references(() => requestsProcedures.id, { onDelete: "cascade" }),
    professionalId: text("professional_id").notNull().references(() => professionals.id),
    description: text("description"),
    outcomeDate: timestamp("outcome_date").defaultNow().notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});
