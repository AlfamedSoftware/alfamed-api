-- Migration para a tabela de status de requisições

CREATE TABLE IF NOT EXISTS requests_status (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Migration para a tabela de log de status de requisição
CREATE TABLE IF NOT EXISTS request_status_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by TEXT REFERENCES users(id),
    changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    observation TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
