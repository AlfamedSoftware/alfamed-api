-- Migration para a tabela de logs de status de agendamento
CREATE TABLE IF NOT EXISTS appointment_status_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by TEXT REFERENCES users(id),
    changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    observation TEXT
);
