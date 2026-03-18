CREATE TABLE "requests" (
    "id" text PRIMARY KEY NOT NULL,
    "appointment_id" text NOT NULL REFERENCES "appointments"("id") ON DELETE CASCADE,
    "type" text NOT NULL,
    "status" text NOT NULL,
    "is_active" boolean NOT NULL DEFAULT TRUE,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
