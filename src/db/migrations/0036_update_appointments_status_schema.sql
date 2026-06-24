DROP TABLE IF EXISTS "appointments_status" CASCADE;--> statement-breakpoint

ALTER TABLE "appointments" ALTER COLUMN "start_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "end_at" DROP NOT NULL;--> statement-breakpoint

CREATE TABLE "appointments_status" (
    "id" text PRIMARY KEY,
    "code" integer NOT NULL,
    "description" text NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

INSERT INTO "appointments_status" (id, code, description, "is_active", "created_at", "updated_at") VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 1, 'Agendando', true, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440002', 2, 'Atendimento iniciado', true, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440003', 3, 'Atendimento finalizado', true, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440004', 4, 'Faltou ao atendimento', true, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440005', 5, 'Cancelado', true, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440006', 6, 'Transferido', true, NOW(), NOW());
