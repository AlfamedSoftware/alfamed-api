-- Migration para appointments_status
CREATE TABLE IF NOT EXISTS appointments_status (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT
);
