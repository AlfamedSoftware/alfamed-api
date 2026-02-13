import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { sessions } from "./sessions";
import { accounts } from "./accounts";
import { twoFactor } from "./two-factor";
import { randomUUIDv7 } from "bun";

export const users = pgTable("users", {
    id: text("id").primaryKey().$defaultFn(() => randomUUIDv7()),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
    sessions: many(sessions),
    accounts: many(accounts),
    twoFactor: one(twoFactor, {
        fields: [users.id],
        references: [twoFactor.userId],
    }),
}));