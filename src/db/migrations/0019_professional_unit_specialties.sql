CREATE TABLE "professional_unit_specialties" (
	"id" text PRIMARY KEY NOT NULL,
	"professional_unit_id" text NOT NULL,
	"specialty_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "professional_unit_specialties" ADD CONSTRAINT "professional_unit_specialties_professional_unit_id_professional_units_id_fk" FOREIGN KEY ("professional_unit_id") REFERENCES "public"."professional_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_unit_specialties" ADD CONSTRAINT "professional_unit_specialties_specialty_id_specialties_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "professional_unit_specialties_professional_unit_id_specialty_id_uq" ON "professional_unit_specialties" USING btree ("professional_unit_id","specialty_id");--> statement-breakpoint
INSERT INTO "professional_unit_specialties" ("id", "professional_unit_id", "specialty_id", "created_at", "updated_at")
SELECT
	gen_random_uuid()::text,
	pu."id",
	ps."specialty_id",
	ps."created_at",
	ps."updated_at"
FROM "professional_specialties" ps
INNER JOIN "professional_units" pu
	ON pu."professional_id" = ps."professional_id";--> statement-breakpoint
UPDATE "schedules" AS s
SET "professional_specialty_id" = pus."id"
FROM "professional_specialties" ps,
	"professional_units" pu,
	"professional_unit_specialties" pus
WHERE s."professional_specialty_id" = ps."id"
	AND s."professional_unit_id" = pu."id"
	AND pu."professional_id" = ps."professional_id"
	AND pus."professional_unit_id" = pu."id"
	AND pus."specialty_id" = ps."specialty_id";--> statement-breakpoint
ALTER TABLE "schedules" DROP CONSTRAINT IF EXISTS "schedules_professional_specialty_id_professional_specialties_id_fk";--> statement-breakpoint
ALTER TABLE "schedules" DROP CONSTRAINT IF EXISTS "schedules_professional_specialty_id_professional_specialties_id";--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_professional_specialty_id_professional_unit_specialties_id_fk" FOREIGN KEY ("professional_specialty_id") REFERENCES "public"."professional_unit_specialties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DROP TABLE "professional_specialties";