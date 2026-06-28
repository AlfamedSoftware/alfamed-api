import { pgTable, text, boolean } from "drizzle-orm/pg-core";
import { units } from "./units.js";

export const unitParameters = pgTable("unit_parameters", {
    id: text("id").primaryKey(),
    unitId: text("unit_id").notNull().unique().references(() => units.id, { onDelete: "cascade" }),
    modulo1GestaoExames: boolean("modulo_1_gestao_exames").default(false).notNull(),
});
