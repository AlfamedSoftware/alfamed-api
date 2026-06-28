import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { appointments } from "./appointments.js";

export const anamnesis = pgTable("anamnesis", {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    appointmentId: text("appointment_id")
        .notNull()
        .references(() => appointments.id, { onDelete: "cascade" }),
    mainComplaint: text("main_complaint"),
    painLevel: integer("pain_level"),
    takingMedication: text("taking_medication"),
    knownAllergy: text("known_allergy"),
    hadSurgery: boolean("had_surgery"),
    surgeryDetails: text("surgery_details"),
    familyHistory: boolean("family_history"),
    familyHistoryDetails: text("family_history_details"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});
