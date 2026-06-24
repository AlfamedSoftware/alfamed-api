-- Add schedule_slot_id column to appointments table
ALTER TABLE appointments ADD COLUMN schedule_slot_id TEXT NOT NULL REFERENCES schedule_slots(id) ON DELETE RESTRICT;

-- Rename appointment_status_logs table to appointment_logs
ALTER TABLE appointment_status_logs RENAME TO appointment_logs;

-- Rename reason column to diagnostics in appointments table
ALTER TABLE appointments RENAME COLUMN reason TO diagnostics;

-- Add evolution column to appointments table
ALTER TABLE appointments ADD COLUMN evolution TEXT;
