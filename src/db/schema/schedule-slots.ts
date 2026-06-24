import { pgTable, text, boolean, timestamp, time } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { schedules } from "./schedules.js";

export const scheduleSlots = pgTable("schedule_slots", {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    scheduleId: text("schedule_id")
        .notNull()
        .references(() => schedules.id, { onDelete: "cascade" }),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    isAvailable: boolean("is_available").default(true).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});
