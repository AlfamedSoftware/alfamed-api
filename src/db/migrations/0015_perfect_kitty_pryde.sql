ALTER TABLE "professionals" ADD COLUMN "crm" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "cnpj" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "owner_user_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "social_name" text;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;