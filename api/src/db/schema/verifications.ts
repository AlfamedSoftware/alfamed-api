
import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, index, uuid } from "drizzle-orm/pg-core";
import { randomUUIDv7 } from "bun";

export const verifications = pgTable(
    "verifications",
    {
        id: uuid("id").primaryKey().$defaultFn(() => randomUUIDv7()),
        identifier: text("identifier").notNull(),
        value: text("value").notNull(),
        expiresAt: timestamp("expires_at").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
    },
    (table) => [index("verifications_identifier_idx").on(table.identifier)],
);