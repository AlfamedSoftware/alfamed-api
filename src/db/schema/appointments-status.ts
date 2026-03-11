import { pgTable, text } from "drizzle-orm/pg-core";
import { randomUUIDv7 } from "bun";

export const appointmentsStatus = pgTable("appointments_status", {
    id: text("id").primaryKey().$defaultFn(() => randomUUIDv7()),
    name: text("name").notNull(),
    description: text("description"),
});
