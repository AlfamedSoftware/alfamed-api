-- Migration for schedules table
CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_specialty_id TEXT NOT NULL REFERENCES professional_specialties(id) ON DELETE CASCADE,
    professional_unit_id TEXT NOT NULL REFERENCES professional_units(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME NOT NULL,
    slots INTEGER NOT NULL,
    slots_used INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
