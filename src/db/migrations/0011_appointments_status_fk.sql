-- Migration para appointments_status
CREATE TABLE IF NOT EXISTS appointments_status (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT
);

-- Alteração da tabela appointments para usar status_id
ALTER TABLE appointments
    DROP COLUMN status,
    ADD COLUMN status_id TEXT NOT NULL REFERENCES appointments_status(id) ON DELETE RESTRICT;

-- Alteração da tabela appointment_status_logs para usar old_status_id e new_status_id
ALTER TABLE appointment_status_logs
    DROP COLUMN old_status,
    DROP COLUMN new_status,
    ADD COLUMN old_status_id TEXT REFERENCES appointments_status(id),
    ADD COLUMN new_status_id TEXT NOT NULL REFERENCES appointments_status(id);
