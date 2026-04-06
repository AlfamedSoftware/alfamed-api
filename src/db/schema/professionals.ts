import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";
import { randomUUID } from "node:crypto";

export const professionals = pgTable("professionals", {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    userId: text("user_id")
        .notNull()
        .unique()
        .references(() => users.id, { onDelete: "cascade" }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});

export const professionalsRelations = relations(professionals, ({ one }) => ({
    user: one(users, {
        fields: [professionals.userId],
        references: [users.id],
    }),
}));
