ALTER TYPE "public"."sex" ADD VALUE 'N';--> statement-breakpoint
ALTER TYPE "public"."sex" ADD VALUE 'O';--> statement-breakpoint
CREATE TABLE "users_additional_info" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"social_name" text,
	"sex" "sex",
	"image" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_additional_info_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "users_additional_info" ADD CONSTRAINT "users_additional_info_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "sex";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "image";