import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { requests } from "./requests.js";
import { professionalUnits } from "./professional-units.js";

export const requestResults = pgTable("request_results", {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    requestId: text("request_id")
        .notNull()
        .unique()
        .references(() => requests.id, { onDelete: "cascade" }),
    professionalUnitId: text("professional_unit_id")
        .references(() => professionalUnits.id, { onDelete: "restrict" }),
    complementaryInfo: text("complementary_info"),
    attachmentUrl: text("attachment_url"),
    releasedAt: timestamp("released_at"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});
