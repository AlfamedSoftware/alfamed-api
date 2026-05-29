-- Migration: add reason column to appointments
ALTER TABLE
    IF EXISTS appointments
ADD
    COLUMN IF NOT EXISTS reason TEXT;