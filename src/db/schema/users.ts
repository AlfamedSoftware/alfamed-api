import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { sessions } from "./sessions.js";
import { accounts } from "./accounts.js";
import { twoFactor } from "./two-factor.js";
import { professionals } from "./professionals.js";
import { randomUUID } from "node:crypto";

export const sexEnum = pgEnum("sex", ["M", "F"]);

export const users = pgTable("users", {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    name: text("name").notNull(),
    socialName: text("social_name"),
    cpf: text("cpf").notNull().unique(),
    birthdate: timestamp("birthdate", { mode: "date" }).notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull().unique(),
    sex: sexEnum("sex"),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    isActive: boolean("is_active").default(true).notNull(),
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
    professional: one(professionals, {
        fields: [users.id],
        references: [professionals.userId],
    }),
    twoFactor: one(twoFactor, {
        fields: [users.id],
        references: [twoFactor.userId],
    }),
}));