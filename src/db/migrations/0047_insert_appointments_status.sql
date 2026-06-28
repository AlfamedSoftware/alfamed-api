INSERT INTO "appointments_status" (id, code, description, "is_active", "created_at", "updated_at")
SELECT
    '550e8400-e29b-41d4-a716-446655440001', 1, 'Agendado', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "appointments_status" WHERE "code" = 1);--> statement-breakpoint

INSERT INTO "appointments_status" (id, code, description, "is_active", "created_at", "updated_at")
SELECT
    '550e8400-e29b-41d4-a716-446655440002', 2, 'Atendimento iniciado', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "appointments_status" WHERE "code" = 2);--> statement-breakpoint

INSERT INTO "appointments_status" (id, code, description, "is_active", "created_at", "updated_at")
SELECT
    '550e8400-e29b-41d4-a716-446655440003', 3, 'Atendimento finalizado', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "appointments_status" WHERE "code" = 3);--> statement-breakpoint

INSERT INTO "appointments_status" (id, code, description, "is_active", "created_at", "updated_at")
SELECT
    '550e8400-e29b-41d4-a716-446655440004', 4, 'Faltou ao atendimento', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "appointments_status" WHERE "code" = 4);--> statement-breakpoint

INSERT INTO "appointments_status" (id, code, description, "is_active", "created_at", "updated_at")
SELECT
    '550e8400-e29b-41d4-a716-446655440005', 5, 'Cancelado', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "appointments_status" WHERE "code" = 5);--> statement-breakpoint

INSERT INTO "appointments_status" (id, code, description, "is_active", "created_at", "updated_at")
SELECT
    '550e8400-e29b-41d4-a716-446655440006', 6, 'Transferido', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "appointments_status" WHERE "code" = 6);
