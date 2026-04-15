CREATE TABLE IF NOT EXISTS "users_additional_info" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL,
    "social_name" text,
    "sex" "sex",
    "image" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "users_additional_info_user_id_unique" UNIQUE("user_id"),
    CONSTRAINT "users_additional_info_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);

DO $$
DECLARE
    has_social_name boolean;
    has_sex boolean;
    has_image boolean;
    social_name_expr text;
    sex_expr text;
    image_expr text;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'social_name'
    ) INTO has_social_name;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'sex'
    ) INTO has_sex;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'image'
    ) INTO has_image;

    social_name_expr := CASE WHEN has_social_name THEN '"social_name"' ELSE 'NULL::text' END;
    sex_expr := CASE WHEN has_sex THEN '"sex"' ELSE 'NULL::sex' END;
    image_expr := CASE WHEN has_image THEN '"image"' ELSE 'NULL::text' END;

    EXECUTE format(
        'INSERT INTO "users_additional_info" ("id", "user_id", "social_name", "sex", "image", "is_active", "created_at", "updated_at")
         SELECT "id", "id", %s, %s, %s, true, COALESCE("created_at", now()), COALESCE("updated_at", now())
         FROM "users"
         ON CONFLICT ("user_id") DO NOTHING',
        social_name_expr,
        sex_expr,
        image_expr
    );
END $$;

ALTER TABLE "users" DROP COLUMN IF EXISTS "social_name";
ALTER TABLE "users" DROP COLUMN IF EXISTS "sex";
ALTER TABLE "users" DROP COLUMN IF EXISTS "image";
