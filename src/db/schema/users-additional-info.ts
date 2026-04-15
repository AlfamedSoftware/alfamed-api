import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { randomUUID } from "node:crypto";

export const sexEnum = pgEnum("sex", ["M", "F", "N", "O"]);

export const usersAdditionalInfo = pgTable("users_additional_info", {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    userId: text("user_id")
        .notNull()
        .unique()
        .references(() => users.id, { onDelete: "cascade" }),
    socialName: text("social_name"),
    sex: sexEnum("sex"),
    image: text("image"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});

export const usersAdditionalInfoRelations = relations(usersAdditionalInfo, ({ one }) => ({
    user: one(users, {
        fields: [usersAdditionalInfo.userId],
        references: [users.id],
    }),
}));
