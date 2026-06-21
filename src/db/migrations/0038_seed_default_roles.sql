INSERT INTO "roles" ("id", "description", "key", "is_active", "internal", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Administrador', 'administrative', true, false, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE "key" = 'administrative');
--> statement-breakpoint
INSERT INTO "roles" ("id", "description", "key", "is_active", "internal", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Assistente Administrativo', 'administrative_assistant', true, false, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE "key" = 'administrative_assistant');
--> statement-breakpoint
INSERT INTO "roles" ("id", "description", "key", "is_active", "internal", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Médico', 'medic', true, false, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE "key" = 'medic');
--> statement-breakpoint
INSERT INTO "roles" ("id", "description", "key", "is_active", "internal", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Técnico Executante', 'technical_executor', true, false, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE "key" = 'technical_executor');
--> statement-breakpoint
INSERT INTO "roles" ("id", "description", "key", "is_active", "internal", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Alfamed', 'internal_alfamed', true, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE "key" = 'internal_alfamed');
