-- Drop existing schedules table
DROP TABLE IF EXISTS schedules CASCADE;

-- Recreate schedules table with new structure
CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    professional_unit_id TEXT NOT NULL REFERENCES professional_units(id) ON DELETE CASCADE,
    specialty_id TEXT NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,
    slots INTEGER NOT NULL,
    empty_slots INTEGER NOT NULL,
    allocated_slots INTEGER NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
