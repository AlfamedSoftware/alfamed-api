INSERT INTO "requests_status" (id, code, description, "is_active", "created_at", "updated_at")
SELECT
    '660e8400-e29b-41d4-a716-446655440001', 1, 'Prescrito', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "requests_status" WHERE "code" = 1);--> statement-breakpoint

INSERT INTO "requests_status" (id, code, description, "is_active", "created_at", "updated_at")
SELECT
    '660e8400-e29b-41d4-a716-446655440002', 2, 'Paciente em Exame', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "requests_status" WHERE "code" = 2);--> statement-breakpoint

INSERT INTO "requests_status" (id, code, description, "is_active", "created_at", "updated_at")
SELECT
    '660e8400-e29b-41d4-a716-446655440003', 3, 'Aguardando análise', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "requests_status" WHERE "code" = 3);--> statement-breakpoint

INSERT INTO "requests_status" (id, code, description, "is_active", "created_at", "updated_at")
SELECT
    '660e8400-e29b-41d4-a716-446655440004', 4, 'Laudo em análise', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "requests_status" WHERE "code" = 4);--> statement-breakpoint

INSERT INTO "requests_status" (id, code, description, "is_active", "created_at", "updated_at")
SELECT
    '660e8400-e29b-41d4-a716-446655440005', 5, 'Laudo liberado', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "requests_status" WHERE "code" = 5);--> statement-breakpoint

INSERT INTO "requests_status" (id, code, description, "is_active", "created_at", "updated_at")
SELECT
    '660e8400-e29b-41d4-a716-446655440006', 6, 'Exame não realizado', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "requests_status" WHERE "code" = 6);--> statement-breakpoint

INSERT INTO "requests_status" (id, code, description, "is_active", "created_at", "updated_at")
SELECT
    '660e8400-e29b-41d4-a716-446655440007', 7, 'Paciente não compareceu', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "requests_status" WHERE "code" = 7);
