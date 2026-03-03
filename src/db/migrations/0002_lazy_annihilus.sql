CREATE TYPE "public"."sex" AS ENUM('M', 'F');--> statement-breakpoint
CREATE TABLE "professionals" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"cpf" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "professionals_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "professionals_cpf_unique" UNIQUE("cpf")
);
--> statement-breakpoint
CREATE TABLE "specialties" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "specialties_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "professional_units" (
	"id" text PRIMARY KEY NOT NULL,
	"professional_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_specialties" (
	"id" text PRIMARY KEY NOT NULL,
	"professional_id" text NOT NULL,
	"specialty_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sex" "sex";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_units" ADD CONSTRAINT "professional_units_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_units" ADD CONSTRAINT "professional_units_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_specialties" ADD CONSTRAINT "professional_specialties_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_specialties" ADD CONSTRAINT "professional_specialties_specialty_id_specialties_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "professional_units_professional_id_unit_id_uq" ON "professional_units" USING btree ("professional_id","unit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "professional_specialties_professional_id_specialty_id_uq" ON "professional_specialties" USING btree ("professional_id","specialty_id");