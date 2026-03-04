CREATE TABLE "patients" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "patients_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "professionals" DROP CONSTRAINT "professionals_cpf_unique";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "cpf" text;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professionals" DROP COLUMN "cpf";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_cpf_unique" UNIQUE("cpf");