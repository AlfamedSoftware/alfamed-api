CREATE TABLE "roles" (
    "id" text PRIMARY KEY NOT NULL,
    "description" text NOT NULL,
    "key" text NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "internal" boolean DEFAULT false NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);