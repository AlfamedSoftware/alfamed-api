CREATE TABLE "unit_parameters" (
	"id" text PRIMARY KEY NOT NULL,
	"unit_id" text NOT NULL,
	"modulo_1_gestao_exames" boolean DEFAULT false NOT NULL,
	CONSTRAINT "unit_parameters_unit_id_unique" UNIQUE("unit_id")
);
--> statement-breakpoint
ALTER TABLE "unit_parameters" ADD CONSTRAINT "unit_parameters_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "unit_parameters" ("id", "unit_id", "modulo_1_gestao_exames")
SELECT gen_random_uuid(), u.id, false
FROM "units" u
WHERE NOT EXISTS (
    SELECT 1 FROM "unit_parameters" up WHERE up.unit_id = u.id
);
