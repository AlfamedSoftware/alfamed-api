import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { requests } from "./requests";
import { procedures } from "./procedures";

export const requestsProcedures = pgTable("requests_procedures", {
    id: text("id").primaryKey(),
    requestId: text("request_id").notNull().references(() => requests.id, { onDelete: "cascade" }),
    procedureId: text("procedure_id").notNull().references(() => procedures.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});
