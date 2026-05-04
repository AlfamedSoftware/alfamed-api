CREATE TABLE "professional_unit_roles" (
    "id" text PRIMARY KEY NOT NULL,
    "professional_unit_id" text NOT NULL,
    "role_id" text NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "professional_unit_roles" ADD CONSTRAINT "professional_unit_roles_professional_unit_id_professional_units_id_fk" FOREIGN KEY ("professional_unit_id") REFERENCES "public"."professional_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_unit_roles" ADD CONSTRAINT "professional_unit_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "professional_unit_roles_professional_unit_id_role_id_uq" ON "professional_unit_roles" USING btree ("professional_unit_id","role_id");
