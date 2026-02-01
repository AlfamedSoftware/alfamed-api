import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { randomUUIDv7 } from "bun";

export const sessions = pgTable(
    "sessions",
    {
        id: text("id").primaryKey().$defaultFn(() => randomUUIDv7()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        expiresAt: timestamp("expires_at").notNull(),
        token: text("token").notNull().unique(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),

    },
    (table) => [index("sessions_userId_idx").on(table.userId)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
    users: one(users, {
        fields: [sessions.userId],
        references: [users.id],
    }),
}));