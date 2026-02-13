import { relations } from "drizzle-orm";
import { pgTable, text } from "drizzle-orm/pg-core";
import { users } from "./users";
import { randomUUIDv7 } from "bun";

export const twoFactor = pgTable("two_factor", {
    id: text("id").primaryKey().$defaultFn(() => randomUUIDv7()),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
});

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
    user: one(users, {
        fields: [twoFactor.userId],
        references: [users.id],
    }),
}));
