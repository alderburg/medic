
-- Fix updated_at column to use proper timezone and trigger
ALTER TABLE "medical_evolutions" 
ALTER COLUMN "updated_at" SET DEFAULT NOW();

-- Create or replace trigger function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for medical_evolutions table
DROP TRIGGER IF EXISTS update_medical_evolutions_updated_at ON medical_evolutions;
CREATE TRIGGER update_medical_evolutions_updated_at
    BEFORE UPDATE ON medical_evolutions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
