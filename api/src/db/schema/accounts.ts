
import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, index, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";
import { randomUUIDv7 } from "bun";

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().$defaultFn(() => randomUUIDv7()),
    accountId: uuid("account_id").notNull(),
    providerId: uuid("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    idToken: text("id_token"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("accounts_userId_idx").on(table.userId)],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  users: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));
